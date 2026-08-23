import "server-only";

/**
 * Small fixed-window rate limiter, held in memory.
 *
 * The site it replaces had no server-side rate limiting anywhere. The contact
 * form was throttled only by disabling its button for 60 seconds in the
 * browser, which stops nobody who is posting to the endpoint directly.
 *
 * Scope, stated plainly: this counts requests inside one Node process. That is
 * the right fit today, because the app runs as a single PM2 process on one
 * droplet. If it is ever run as more than one instance, or moved somewhere
 * serverless, this needs to move to Redis or the database, a limiter that
 * resets whenever a process restarts is close to no limiter at all.
 */

type Window = { count: number; resetAt: number };

const windows = new Map<string, Window>();

/** Stops the map growing without bound on a long-running process. */
const SWEEP_EVERY_MS = 5 * 60 * 1000;
let lastSweep = Date.now();

function sweep(now: number): void {
  if (now - lastSweep < SWEEP_EVERY_MS) return;
  lastSweep = now;
  for (const [key, window] of windows) {
    if (window.resetAt <= now) windows.delete(key);
  }
}

export type RateLimitResult = {
  allowed: boolean;
  /** Seconds until the caller may try again. Zero when allowed. */
  retryAfter: number;
};

export function rateLimit(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number },
): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const existing = windows.get(key);

  if (!existing || existing.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfter: 0 };
  }

  existing.count += 1;

  if (existing.count > limit) {
    return {
      allowed: false,
      retryAfter: Math.ceil((existing.resetAt - now) / 1000),
    };
  }

  return { allowed: true, retryAfter: 0 };
}
