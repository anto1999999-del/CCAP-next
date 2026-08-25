import "server-only";
import { redirect } from "next/navigation";
import { requireAdmin, type Account } from "./accounts";
import { isConfigured } from "../db/mongo";

/**
 * The gate on every admin page.
 *
 * Somebody who is not an admin is sent to the sign-in page rather than told
 * that a dashboard exists here. The check runs on the server on every request,
 * so it cannot be got around by asking for the page directly.
 */
export async function adminOnly(returnTo: string): Promise<Account> {
  if (!isConfigured()) redirect("/login");

  const account = await requireAdmin();
  if (!account) redirect(`/login?next=${encodeURIComponent(returnTo)}`);

  return account;
}
