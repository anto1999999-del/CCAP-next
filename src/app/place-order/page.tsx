import type { Metadata } from "next";
import Checkout from "@/components/checkout/Checkout";
import { currentAccount } from "@/lib/auth/accounts";
import { isConfigured } from "@/lib/db/mongo";

export const metadata: Metadata = {
  title: "Checkout | Central Coast Auto Parts",
  // One person's order in progress. Nothing here belongs in search results.
  robots: { index: false, follow: false },
};

/** Reads the session, so it cannot be built once and served to everybody. */
export const dynamic = "force-dynamic";

export default async function PlaceOrderPage() {
  /*
    Filled in from the account, on the server, before the page is sent.

    Doing it here rather than fetching in the browser means the fields are
    already filled when the page paints, with no flash of an empty form and no
    second round trip. A signed-out visitor gets blank fields and the same page
    otherwise.

    The account is only ever read here. What ships is the address in the form,
    which the customer can change for this one order without touching their
    saved details.
  */
  const account = isConfigured() ? await currentAccount() : null;

  return (
    <Checkout
      initialDetails={
        account && {
          name: account.name,
          email: account.email,
          phone: account.phone,
          address: account.address,
          suburb: account.city,
          postcode: account.zipcode,
        }
      }
    />
  );
}
