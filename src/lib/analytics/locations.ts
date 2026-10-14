/**
 * Where on the site a phone number was tapped, for the phone_click event.
 *
 * A link can say where it is with `data-phone-location` on itself or a parent,
 * which is how the footer, the help band and the checkout name themselves. Any
 * other link is named after the page it is on, so a tel: link added anywhere
 * later is still reported somewhere meaningful.
 */

const PAGES: [prefix: string, location: string][] = [
  ["/product/", "product_page"],
  ["/contact", "contact_page"],
  ["/about", "about_page"],
  ["/checkout", "checkout"],
  ["/place-order", "checkout"],
  ["/cart", "cart"],
  ["/gallery", "gallery"],
  ["/wreckers", "make_page"],
  ["/parts", "category_page"],
  ["/products", "parts_search"],
  ["/blog", "blog"],
  ["/sellyourcar", "sell_your_car"],
  ["/my-account", "account"],
  ["/login", "login"],
];

export function phoneLinkLocation(
  pathname: string,
  marked?: string | null,
): string {
  const named = marked?.trim();
  if (named) return named;
  if (pathname === "/") return "home_page";
  return (
    PAGES.find(([prefix]) => pathname.startsWith(prefix))?.[1] ?? "other_page"
  );
}
