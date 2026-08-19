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

/**
 * Site header.
 *
 * A client component in full: the cart badge, both dropdowns and the mobile
 * menu all share open/closed state, and the mobile toggle sits in a different
 * branch of the tree from the menu it controls. Splitting it into islands would
 * mean lifting that state into a provider for no real benefit — the component
 * is small and ships very little JavaScript.
 *
 * The red used here is Tailwind's red-500/red-600, not the brand red. That is
 * deliberate: it is what the live site renders (measured as rgb(239, 68, 68)),
 * and the brief is to match exactly. The inconsistency is recorded in
 * docs/DESIGN-NOTES.md rather than quietly corrected.
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
      <header className="fixed top-0 right-0 left-0 z-50 border-b border-gray-900 bg-black px-4 text-white shadow-md lg:px-10">
        <div className="container mx-auto flex min-h-16 items-center justify-between py-2">
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
                className="font-bold uppercase hover:text-red-500"
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
                className="flex items-center font-bold uppercase hover:text-red-500"
              >
                Resources
                <ChevronDownIcon className="ml-1 h-4 w-4" aria-hidden="true" />
              </button>
              {resourcesOpen && (
                <div className="bg-surface absolute z-10 mt-2 min-w-[150px] rounded-lg whitespace-nowrap shadow-lg">
                  {RESOURCE_LINKS.map(({ href, label }) => (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setResourcesOpen(false)}
                      className="hover:bg-brand block px-4 py-2 first:rounded-t-lg last:rounded-b-lg"
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
              className="relative flex h-8 w-8 items-center justify-center"
            >
              <ShoppingCartIcon
                className="h-5 w-5 text-white hover:text-red-500"
                aria-hidden="true"
              />
              {count > 0 && (
                <span className="absolute -top-3 -right-2 z-10 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] leading-none font-bold text-white">
                  {count > 99 ? "99+" : count}
                </span>
              )}
            </Link>

            <div className="relative" ref={accountRef}>
              <button
                type="button"
                aria-expanded={accountOpen}
                aria-haspopup="true"
                aria-label="Account menu"
                onClick={() => setAccountOpen((open) => !open)}
              >
                <UserIcon
                  className="h-5 w-5 cursor-pointer text-white hover:text-red-500"
                  aria-hidden="true"
                />
              </button>
              {accountOpen && (
                <div className="bg-surface absolute right-0 z-10 mt-2 max-w-[300px] overflow-hidden rounded-lg shadow-lg">
                  <Link
                    href="/login"
                    onClick={() => setAccountOpen(false)}
                    className="hover:bg-brand block px-4 py-2.5 text-sm whitespace-nowrap text-white"
                  >
                    Login
                  </Link>
                </div>
              )}
            </div>

            <Link
              href="/contact"
              className="hidden rounded-lg bg-red-500 px-4 py-2 text-sm font-bold text-white hover:bg-red-600 md:block"
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
        </div>

        {mobileOpen && (
          <div className="bg-surface flex flex-col space-y-2 p-4 text-center md:hidden">
            {NAV_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                onClick={closeMobile}
                className="font-bold text-white uppercase hover:text-red-500"
              >
                {label}
              </Link>
            ))}
            <Link
              href="/terms-conditions"
              onClick={closeMobile}
              className="font-bold text-white uppercase hover:text-red-500"
            >
              Terms and conditions
            </Link>

            <div className="relative">
              <button
                type="button"
                aria-expanded={resourcesOpen}
                onClick={() => setResourcesOpen((open) => !open)}
                className="flex items-center justify-center font-bold uppercase hover:text-red-500"
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
              className="w-full rounded-lg bg-red-500 px-4 py-2 text-center text-sm font-bold text-white hover:bg-red-600"
            >
              Contact Us
            </Link>
          </div>
        )}
      </header>

      {/* Spacer for the fixed header, matching its measured height of 73px. */}
      <div className="h-[4.5625rem]" aria-hidden="true" />
    </>
  );
}
