import { createHash, timingSafeEqual } from "node:crypto";

/**
 * Whether a request carries the title agent's token.
 *
 * The token is a server-only environment variable. If it is missing or
 * obviously too short the answer is always no: an unset variable must close
 * the route, not open it to anyone who sends an empty bearer.
 *
 * Both sides are hashed before comparing so the comparison takes the same time
 * whatever was sent, including a guess of the wrong length.
 */
export function isAuthorised(
  header: string | null | undefined,
  token: string | undefined,
): boolean {
  if (!token || token.length < 32) return false;

  const match = /^Bearer (\S+)$/.exec(header ?? "");
  if (!match) return false;

  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(match[1]), digest(token));
}
