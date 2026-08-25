import { currentAccount } from "@/lib/auth/accounts";
import { isConfigured } from "@/lib/db/mongo";

/**
 * Who, if anyone, is signed in.
 *
 * The header needs this, and the header is on every page. Reading the session
 * in the root layout instead would make every page on the site dynamic, so the
 * blog, the gallery and the part pages would stop being static for the sake of
 * one menu. The header asks for it after it loads.
 *
 * Nothing secret is returned: a name, and whether this person is an admin. The
 * session cookie itself stays where the browser cannot read it.
 */
export async function GET() {
  if (!isConfigured()) {
    return Response.json({ signedIn: false }, { headers: NO_STORE });
  }

  const account = await currentAccount();

  return Response.json(
    account
      ? { signedIn: true, name: account.name, isAdmin: account.isAdmin }
      : { signedIn: false },
    { headers: NO_STORE },
  );
}

/** One person's session must never be cached and handed to the next. */
const NO_STORE = { "cache-control": "no-store, private" };
