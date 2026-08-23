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
  | { ok: true }
  | { ok: false; reason: "not-configured" | "failed" };

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
  text: string;
  /** Where a human reply should go, when it differs from the sender. */
  replyTo?: string;
}): Promise<SendResult> {
  const mailer = resend();

  if (!mailer) {
    console.warn(
      `[email] RESEND_API_KEY is not set, "${params.subject}" was not sent.`,
    );
    return { ok: false, reason: "not-configured" };
  }

  try {
    const { error } = await mailer.emails.send({
      from: FROM,
      to: params.to,
      subject: params.subject,
      text: params.text,
      ...(params.replyTo ? { replyTo: params.replyTo } : {}),
    });

    if (error) {
      // Logged in full for diagnosis, never surfaced to the visitor, provider
      // errors can carry address and account details.
      console.error("[email] Resend rejected the message:", error);
      return { ok: false, reason: "failed" };
    }

    return { ok: true };
  } catch (error) {
    console.error("[email] Send failed:", error);
    return { ok: false, reason: "failed" };
  }
}
