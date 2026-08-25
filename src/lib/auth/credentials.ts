import { z } from "zod";

/**
 * What counts as a usable email, name and password.
 *
 * Kept apart from the database so the rules can be checked on their own, and so
 * the same rules apply wherever an account is created or changed.
 *
 * The password rule is a minimum length and nothing else. Composition rules
 * ("one capital, one symbol") push people towards Password1! and away from
 * anything long, and length is what actually costs an attacker time.
 */

export const MIN_PASSWORD_LENGTH = 10;

export const emailField = z
  .string()
  .trim()
  .min(3, "Enter your email address.")
  .max(254, "That email address is too long.")
  .email("That does not look like an email address.");

export const passwordField = z
  .string()
  .min(MIN_PASSWORD_LENGTH, `Use at least ${MIN_PASSWORD_LENGTH} characters.`)
  // bcrypt only considers the first 72 bytes, so anything longer is a false
  // sense of security rather than a stronger password.
  .max(72, "Passwords can be at most 72 characters.");

export const nameField = z
  .string()
  .trim()
  .min(2, "Enter your name.")
  .max(80, "That name is too long.");

export const LoginSchema = z.object({
  email: emailField,
  // Not the full password rule: an existing account may predate it, and telling
  // someone their password is too short at sign-in tells them nothing useful.
  password: z.string().min(1, "Enter your password.").max(72),
});

export const RegisterSchema = z.object({
  name: nameField,
  email: emailField,
  password: passwordField,
});

export type LoginInput = z.infer<typeof LoginSchema>;
export type RegisterInput = z.infer<typeof RegisterSchema>;

/** The first message for each field, in the order the form shows them. */
export function firstErrors(
  error: z.ZodError,
): Record<string, string> {
  const messages: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? "form");
    messages[field] ??= issue.message;
  }
  return messages;
}
