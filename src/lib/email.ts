import "server-only";
import { Resend } from "resend";
import { site } from "@/lib/site";

/**
 * Outbound email, via Resend.
 *
 * The sender address is fixed here rather than passed in. The implementation
 * this replaces accepted a `from` argument at every call site, then ignored it
 * and hardcoded the address anyway, so callers believed they were controlling
 * something they were not.
 */

const FROM = `${site.name} <noreply@centralcoastautoparts.com.au>`;

export type SendResult =
  { ok: true } | { ok: false; reason: "not-configured" | "failed" };

/**
 * How long to wait before each attempt.
 *
 * On 24 Sep 2026 an order's confirmation and the yard's copy were both lost to a
 * few seconds of network trouble on the server: one attempt each, no retry, and
 * nobody knew. A request that never reached Resend, or that Resend answered with
 * a 5xx or a rate limit, is worth trying again; a 4xx is a bad message and will
 * be refused the same way every time.
 */
const ATTEMPT_DELAYS_MS = [0, 1_000, 3_000, 8_000];

function isTransient(statusCode: number | null | undefined): boolean {
  // null: the request never got an HTTP answer (DNS, connection, timeout).
  return statusCode == null || statusCode === 429 || statusCode >= 500;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

let client: Resend | null = null;

/**
 * Created on first use so the app boots without a key. Everything that does not
 * send email, the catalogue, cart, checkout, then works normally in local
 * development without one.
 */
function resend(): Resend | null {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) return null;
  client ??= new Resend(key);
  return client;
}

export async function sendEmail(params: {
  to: string;
  subject: string;
  /**
   * The plain-text part. Required, never optional.
   *
   * A message with no text part scores worse with every spam filter, and some
   * clients are set to show text in preference to HTML. For an order
   * confirmation that means the difference between a customer knowing their
   * money arrived and not.
   */
  text: string;
  /** The formatted part, when there is one. Clients that can render it will. */
  html?: string;
  /** Where a human reply should go, when it differs from the sender. */
  replyTo?: string;
  /**
   * Makes a retry safe. If an attempt reached Resend but its answer was lost,
   * the next attempt with the same key is recognised rather than sent twice.
   * Resend holds keys for 24 hours.
   */
  idempotencyKey?: string;
}): Promise<SendResult> {
  const mailer = resend();

  if (!mailer) {
    console.warn(
      `[email] RESEND_API_KEY is not set, "${params.subject}" was not sent.`,
    );
    return { ok: false, reason: "not-configured" };
  }

  for (const [attempt, delay] of ATTEMPT_DELAYS_MS.entries()) {
    if (delay) await sleep(delay);
    const last = attempt === ATTEMPT_DELAYS_MS.length - 1;

    try {
      const { error } = await mailer.emails.send(
        {
          from: FROM,
          to: params.to,
          subject: params.subject,
          text: params.text,
          ...(params.html ? { html: params.html } : {}),
          ...(params.replyTo ? { replyTo: params.replyTo } : {}),
        },
        params.idempotencyKey
          ? { idempotencyKey: params.idempotencyKey }
          : undefined,
      );

      if (!error) return { ok: true };

      // Logged in full for diagnosis, never surfaced to the visitor, provider
      // errors can carry address and account details.
      console.error(
        `[email] Resend rejected "${params.subject}" (attempt ${attempt + 1}):`,
        error,
      );
      if (!isTransient(error.statusCode) || last) {
        return { ok: false, reason: "failed" };
      }
    } catch (error) {
      console.error(
        `[email] Send of "${params.subject}" failed (attempt ${attempt + 1}):`,
        error,
      );
      if (last) return { ok: false, reason: "failed" };
    }
  }

  return { ok: false, reason: "failed" };
}
