"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  Bars3Icon,
  ChevronDownIcon,
  ShoppingCartIcon,
  UserIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useCart } from "@/lib/cart/CartProvider";
import { signOut } from "@/app/actions/auth";
import Container from "./Container";

/**
 * Site header.
 *
 * A client component in full: the cart badge, both dropdowns and the mobile
 * menu all share open/closed state, and the mobile toggle sits in a different
 * branch of the tree from the menu it controls. Splitting it into islands would
 * mean lifting that state into a provider for no real benefit, the component
 * is small and ships very little JavaScript.
 *
 * The header used to render Tailwind's red-500, which is what the live site
 * renders (measured as rgb(239, 68, 68)) and not the brand red on everything
 * below it. Two reds a shade apart look like a mistake rather than a choice, so
 * with the owner's agreement the header now uses the brand red like the rest of
 * the site.
 */

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/products", label: "Parts" },
  { href: "/contact", label: "Contact" },
  { href: "/sellyourcar", label: "Sell your car" },
] as const;

/**
 * Blog and Gallery currently point at the WordPress subdomain. They become
 * in-app routes once that content is migrated; the paths below are the ones
 * they will land on, so no link needs revisiting later.
 */
const RESOURCE_LINKS = [
  { href: "/about", label: "ABOUT US" },
  { href: "/blog", label: "BLOG" },
  { href: "/gallery", label: "GALLERY" },
] as const;

export default function Header() {
  const { count } = useCart();

  /*
    Asked for after the page loads rather than read in the layout. Reading the
    session server-side in the root layout would make every page on the site
    dynamic, so the blog, gallery and part pages would stop being static for the
    sake of one menu.
  */
  const [session, setSession] = useState<{
    signedIn: boolean;
    name?: string;
    isAdmin?: boolean;
  } | null>(null);

  useEffect(() => {
    let current = true;
    fetch("/api/session")
      .then((response) => response.json())
      .then((data) => {
        if (current) setSession(data);
      })
      .catch(() => {
        // A header that cannot tell is a header that offers signing in.
        if (current) setSession({ signedIn: false });
      });

    return () => {
      current = false;
    };
  }, []);

  const closeAccount = () => setAccountOpen(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [resourcesOpen, setResourcesOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const accountRef = useRef<HTMLDivElement>(null);
  const resourcesRef = useRef<HTMLDivElement>(null);

  // Close the dropdowns on an outside click. Bound at every width, unlike the
  // original which skipped the listener below 768px and so left the account
  // menu stuck open on tablets in portrait.
  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (accountRef.current && !accountRef.current.contains(target)) {
        setAccountOpen(false);
      }
      if (resourcesRef.current && !resourcesRef.current.contains(target)) {
        setResourcesOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  // Escape closes whatever is open. The original had no keyboard path at all.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setAccountOpen(false);
      setResourcesOpen(false);
      setMobileOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const closeMobile = () => {
    setMobileOpen(false);
    setResourcesOpen(false);
  };

  return (
    <>
      <header className="fixed top-0 right-0 left-0 z-50 border-b border-gray-900 bg-black text-white shadow-md">
        <Container className="flex min-h-16 items-center justify-between py-2">
          <div className="flex flex-shrink-0 items-center">
            <Link
              href="/"
              onClick={closeMobile}
              className="flex items-center leading-none"
            >
              <Image
                src="/images/darklogo.png"
                alt="Central Coast Auto Parts"
                width={180}
                height={64}
                priority
                className="h-12 w-auto max-w-[200px] object-contain object-left sm:h-14 sm:max-w-[220px]"
              />
            </Link>
          </div>

          <nav className="hidden space-x-6 md:flex">
            {NAV_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="font-bold uppercase hover:text-brand-text"
              >
                {label}
              </Link>
            ))}

            <div className="relative" ref={resourcesRef}>
              <button
                type="button"
                aria-expanded={resourcesOpen}
                aria-haspopup="true"
                onClick={() => setResourcesOpen((open) => !open)}
                className="flex items-center font-bold uppercase hover:text-brand-text"
              >
                Resources
                <ChevronDownIcon className="ml-1 h-4 w-4" aria-hidden="true" />
              </button>
              {resourcesOpen && (
                <div className="bg-card border-line absolute z-10 mt-3 min-w-[170px] overflow-hidden rounded-xl border whitespace-nowrap shadow-2xl">
                  {RESOURCE_LINKS.map(({ href, label }) => (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setResourcesOpen(false)}
                      className="hover:bg-brand block px-4 py-2.5 text-sm transition-colors"
                    >
                      {label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </nav>

          <div className="flex items-center space-x-4 md:space-x-6">
            <Link
              href="/cart"
              aria-label={count > 0 ? `Cart, ${count} items` : "Cart"}
              className="hover:text-brand-text relative flex h-8 w-8 items-center justify-center rounded-md text-white transition-colors"
            >
              <ShoppingCartIcon
                className="h-5 w-5 text-white hover:text-brand-text"
                aria-hidden="true"
              />
              {count > 0 && (
                /*
                  Ringed in the header's own black so the badge reads as a
                  separate object sitting on the icon. At 10px on a 16px circle
                  it was neither legible nor clearly attached to anything.
                */
                <span className="bg-brand ring-canvas absolute -top-1.5 -right-1.5 z-10 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[11px] leading-none font-bold text-white tabular-nums ring-2">
                  {count > 99 ? "99+" : count}
                </span>
              )}
            </Link>

            <div className="relative" ref={accountRef}>
              <button
                type="button"
                aria-expanded={accountOpen}
                aria-haspopup="true"
                aria-label={session?.signedIn ? `Account, ${session.name}` : "Account menu"}
                onClick={() => setAccountOpen((open) => !open)}
                className="hover:text-brand-text relative flex h-8 w-8 items-center justify-center rounded-md text-white transition-colors"
              >
                <UserIcon className="h-5 w-5" aria-hidden="true" />
                {/*
                  A dot rather than a name in the bar: the header has no room
                  for one, and without any mark at all the icon looked the same
                  signed in as signed out, which is what made the menu read as
                  "Login" forever.
                */}
                {session?.signedIn && (
                  <span
                    aria-hidden="true"
                    className="bg-brand ring-canvas absolute right-0 bottom-0 h-2.5 w-2.5 rounded-full ring-2"
                  />
                )}
              </button>

              {accountOpen && (
                <div className="bg-card border-line absolute right-0 z-10 mt-3 w-56 overflow-hidden rounded-xl border shadow-2xl">
                  {session?.signedIn ? (
                    <>
                      <p className="border-line truncate border-b px-4 py-3 text-xs text-gray-400">
                        Signed in as{" "}
                        <span className="font-semibold text-white">
                          {session.name}
                        </span>
                      </p>

                      {session.isAdmin && (
                        <AccountLink href="/dashboard" onNavigate={closeAccount}>
                          Dashboard
                        </AccountLink>
                      )}
                      <AccountLink href="/my-account" onNavigate={closeAccount}>
                        My profile
                      </AccountLink>
                      <AccountLink href="/orders" onNavigate={closeAccount}>
                        My orders
                      </AccountLink>

                      <form action={signOut} className="border-line border-t">
                        <button
                          type="submit"
                          className="hover:bg-brand block w-full px-4 py-2.5 text-left text-sm text-white transition-colors"
                        >
                          Sign out
                        </button>
                      </form>
                    </>
                  ) : (
                    <>
                      <AccountLink href="/login" onNavigate={closeAccount}>
                        Sign in
                      </AccountLink>
                      <AccountLink href="/login" onNavigate={closeAccount}>
                        Create an account
                      </AccountLink>
                    </>
                  )}
                </div>
              )}
            </div>

            <Link
              href="/contact"
              className="bg-brand hover:bg-brand-hover focus-visible:ring-brand focus-visible:ring-offset-canvas hidden rounded-lg px-4 py-2 text-sm font-bold text-white transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none md:block"
            >
              CONTACT US
            </Link>

            <button
              type="button"
              aria-expanded={mobileOpen}
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              className="text-white focus:outline-none md:hidden"
              onClick={() => setMobileOpen((open) => !open)}
            >
              {mobileOpen ? (
                <XMarkIcon className="h-5 w-5" aria-hidden="true" />
              ) : (
                <Bars3Icon className="h-5 w-5" aria-hidden="true" />
              )}
            </button>
          </div>
        </Container>

        {mobileOpen && (
          <Container className="bg-surface flex flex-col space-y-2 py-4 text-center md:hidden">
            {NAV_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                onClick={closeMobile}
                className="font-bold text-white uppercase hover:text-brand-text"
              >
                {label}
              </Link>
            ))}
            <Link
              href="/terms-conditions"
              onClick={closeMobile}
              className="font-bold text-white uppercase hover:text-brand-text"
            >
              Terms and conditions
            </Link>

            <div className="relative">
              <button
                type="button"
                aria-expanded={resourcesOpen}
                onClick={() => setResourcesOpen((open) => !open)}
                className="flex items-center justify-center font-bold uppercase hover:text-brand-text"
              >
                RESOURCES
                <ChevronDownIcon className="ml-1 h-4 w-4" aria-hidden="true" />
              </button>
              {resourcesOpen && (
                <div className="bg-surface mt-2 rounded-lg shadow-lg">
                  {RESOURCE_LINKS.map(({ href, label }) => (
                    <Link
                      key={href}
                      href={href}
                      onClick={closeMobile}
                      className="hover:bg-brand block px-4 py-2 font-bold"
                    >
                      {label}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <Link
              href="/contact"
              onClick={closeMobile}
              className="bg-brand hover:bg-brand-hover w-full rounded-lg px-4 py-2.5 text-center text-sm font-bold text-white transition-colors"
            >
              Contact Us
            </Link>
          </Container>
        )}
      </header>

      {/* Spacer for the fixed header, matching its measured height of 73px. */}
      <div className="h-[4.5625rem]" aria-hidden="true" />
    </>
  );
}

/** One row in the account menu. */
function AccountLink({
  href,
  onNavigate,
  children,
}: {
  href: string;
  onNavigate: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className="hover:bg-brand block px-4 py-2.5 text-sm whitespace-nowrap text-white transition-colors"
    >
      {children}
    </Link>
  );
}
