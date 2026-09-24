import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The retry rules for outbound email.
 *
 * These exist because an order's confirmation and the yard's copy were lost to
 * one network blip. What matters is which failures are tried again and which
 * are not, so that is what is checked, with Resend and the clock stubbed out.
 */

const send = vi.fn();

vi.mock("server-only", () => ({}));
vi.mock("resend", () => ({
  Resend: class {
    emails = { send };
  },
}));

const message = { to: "jane@example.com", subject: "Hello", text: "Hi" };

async function load() {
  vi.resetModules();
  process.env.RESEND_API_KEY = "re_test";
  return (await import("./email")).sendEmail;
}

beforeEach(() => {
  send.mockReset();
  vi.useFakeTimers();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

/** Runs a send to completion, skipping the waits between attempts. */
async function run(sendEmail: Awaited<ReturnType<typeof load>>, params = {}) {
  const result = sendEmail({ ...message, ...params });
  await vi.runAllTimersAsync();
  return result;
}

describe("sendEmail", () => {
  it("retries a request that never reached Resend, then succeeds", async () => {
    send
      .mockResolvedValueOnce({
        error: { name: "application_error", statusCode: null },
      })
      .mockResolvedValueOnce({ error: null });

    expect(await run(await load())).toEqual({ ok: true });
    expect(send).toHaveBeenCalledTimes(2);
  });

  it("retries a thrown network error", async () => {
    send
      .mockRejectedValueOnce(new Error("getaddrinfo ENOTFOUND"))
      .mockResolvedValueOnce({ error: null });

    expect(await run(await load())).toEqual({ ok: true });
  });

  it("retries a server error and a rate limit", async () => {
    send
      .mockResolvedValueOnce({ error: { statusCode: 503 } })
      .mockResolvedValueOnce({ error: { statusCode: 429 } })
      .mockResolvedValueOnce({ error: null });

    expect(await run(await load())).toEqual({ ok: true });
    expect(send).toHaveBeenCalledTimes(3);
  });

  it("does not retry a message Resend refused as invalid", async () => {
    send.mockResolvedValue({ error: { statusCode: 422 } });

    expect(await run(await load())).toEqual({ ok: false, reason: "failed" });
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("gives up after four attempts", async () => {
    send.mockResolvedValue({ error: { statusCode: null } });

    expect(await run(await load())).toEqual({ ok: false, reason: "failed" });
    expect(send).toHaveBeenCalledTimes(4);
  });

  it("sends the same idempotency key on every attempt", async () => {
    send
      .mockResolvedValueOnce({ error: { statusCode: null } })
      .mockResolvedValueOnce({ error: null });

    await run(await load(), { idempotencyKey: "order-abc-customer" });

    for (const call of send.mock.calls) {
      expect(call[1]).toEqual({ idempotencyKey: "order-abc-customer" });
    }
  });
});
