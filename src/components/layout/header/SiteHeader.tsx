"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  Bars3Icon,
  ChevronDownIcon,
  ChevronRightIcon,
  MapPinIcon,
  PhoneIcon,
  ShoppingCartIcon,
  TruckIcon,
  UserIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useCart } from "@/lib/cart/CartProvider";
import { yardStatus } from "@/lib/hours";
import { site } from "@/lib/site";
import { signOut } from "@/app/actions/auth";
import Container from "../Container";

/**
 * The header's moving parts: the Parts and About menus, account, cart and the
 * phone menu.
 *
 * Built around what people come to a wrecker's site to do, in order: find a
 * part, ring the yard, or check it is open before driving over. The old header
 * offered none of the three. The phone number was not in it at all, and
 * "Parts" went to one long list with no way in by part type or by make,
 * though both sets of pages existed. Search was tried in the bar and left
 * out on request; it stays on /products, beside the filters it works with.
 */

export type NavLink = { href: string; label: string };
export type PartsMenu = { categories: NavLink[]; makes: NavLink[] };

type Menu = "parts" | "about" | "account" | null;

const ABOUT_LINKS: NavLink[] = [
  { href: "/about", label: "About us" },
  { href: "/gallery", label: "Gallery" },
  { href: "/blog", label: "Blog" },
];

/** Where a section's pages live, so its menu item can show it is the one open. */
const PARTS_PATHS = ["/products", "/product/", "/parts", "/wreckers"];
const ABOUT_PATHS = ["/about", "/gallery", "/blog"];

const within = (pathname: string, paths: string[]) =>
  paths.some(
    (path) =>
      pathname === path ||
      pathname.startsWith(path.endsWith("/") ? path : `${path}/`),
  );

/*
  The open/closed line, refreshed each minute.

  An external store rather than state set in an effect: the server cannot know
  the visitor's moment, so its snapshot is null and the strip shows the plain
  hours until the browser takes over. That keeps hydration exact on pages that
  are built once and served for days.
*/
function subscribeToMinutes(onChange: () => void) {
  const timer = setInterval(onChange, 60_000);
  return () => clearInterval(timer);
}

const statusSnapshot = () => {
  const { open, label } = yardStatus();
  return `${open ? "open" : "closed"}|${label}`;
};

function useYardStatus() {
  const value = useSyncExternalStore(
    subscribeToMinutes,
    statusSnapshot,
    () => null,
  );
  if (!value) return null;
  const [state, label] = value.split("|");
  return { open: state === "open", label };
}

export default function SiteHeader({ parts }: { parts: PartsMenu }) {
  const { count } = useCart();
  const pathname = usePathname();
  const status = useYardStatus();

  /*
    Asked for after the page loads rather than read in the layout. Reading the
    session server-side in the root layout would make every page on the site
    dynamic, so the blog, gallery and part pages would stop being static for the
    sake of one menu.

    Re-read on every navigation, not once on mount. Signing in is a client-side
    navigation: the header does not remount, so a header that asked once keeps
    saying "Sign in" to somebody who is now signed in.
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
  }, [pathname]);

  const [menu, setMenu] = useState<Menu>(null);

  // A new page closes whatever was open on the old one.
  const [shownPath, setShownPath] = useState(pathname);
  if (shownPath !== pathname) {
    setShownPath(pathname);
    setMenu(null);
  }

  const headerRef = useRef<HTMLElement>(null);
  const drawerRef = useRef<HTMLDialogElement>(null);
  const triggers = useRef<
    Partial<Record<Exclude<Menu, null>, HTMLButtonElement | null>>
  >({});

  useEffect(() => {
    drawerRef.current?.close();
  }, [pathname]);

  // A click anywhere outside the header closes its menus.
  useEffect(() => {
    if (!menu) return;
    function onPointerDown(event: PointerEvent) {
      if (!headerRef.current?.contains(event.target as Node)) setMenu(null);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape" || !menu) return;
      setMenu(null);
      // Back to the button that opened it, or keyboard users lose their place.
      triggers.current[menu]?.focus();
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menu]);

  /*
    Menus open on hover for a mouse, after a beat, and close a little after the
    pointer leaves. Without the delays, crossing the bar on the way to the
    cart flashes every menu it passes, and moving diagonally from "Parts"
    down into its panel leaves the button and shuts the panel on the way.
    Touch and keyboard open them by click only.
  */
  const hoverTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const hoverOpen =
    (which: Exclude<Menu, null | "account">) => (event: React.PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      clearTimeout(hoverTimer.current);
      hoverTimer.current = setTimeout(() => setMenu(which), 90);
    };

  const hoverClose = (event: React.PointerEvent) => {
    if (event.pointerType !== "mouse") return;
    clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(
      () => setMenu((open) => (open === "account" ? open : null)),
      180,
    );
  };

  const toggle = (which: Exclude<Menu, null>) => () => {
    clearTimeout(hoverTimer.current);
    setMenu((open) => (open === which ? null : which));
  };

  const close = () => setMenu(null);

  const partsActive = within(pathname, PARTS_PATHS);
  const aboutActive = within(pathname, ABOUT_PATHS);

  return (
    <>
      <a
        href="#main"
        className="bg-brand sr-only z-[60] rounded-md px-4 py-2 text-sm font-semibold text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>

      {/* The yard's details. Scrolls away; the bar below it stays. */}
      <div className="border-line bg-card border-b text-[13px] text-gray-400">
        <Container className="flex h-9 items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-5">
            <YardState status={status} />
            <Link
              href="/contact"
              className="hidden items-center gap-1.5 transition-colors hover:text-white md:flex"
            >
              <MapPinIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
              {site.address.street.replace("Street", "St")},{" "}
              {site.address.suburb}
            </Link>
          </div>

          <div className="flex shrink-0 items-center gap-5">
            <span className="hidden items-center gap-1.5 lg:flex">
              <TruckIcon className="h-4 w-4" aria-hidden="true" />
              Nationwide delivery
            </span>
            <a
              href={`tel:${site.contact.phoneE164}`}
              className="flex items-center gap-1.5 font-semibold text-white transition-colors hover:text-brand-text"
            >
              <PhoneIcon className="h-4 w-4" aria-hidden="true" />
              {site.contact.phone}
            </a>
          </div>
        </Container>
      </div>

      <header
        ref={headerRef}
        className="border-line sticky top-0 z-50 border-b bg-canvas/95 text-white backdrop-blur supports-[backdrop-filter]:bg-canvas/85"
      >
        <Container className="flex h-[68px] items-center gap-3 sm:gap-6 xl:gap-8">
          <Link href="/" onClick={close} className="shrink-0">
            <Image
              src="/images/darklogo.png"
              alt="Central Coast Auto Parts, home"
              width={180}
              height={64}
              priority
              className="h-10 w-auto min-[360px]:h-11 sm:h-12"
            />
          </Link>

          <nav aria-label="Main" className="hidden h-full lg:block">
            <ul className="flex h-full items-stretch gap-1">
              <li
                className="flex"
                onPointerEnter={hoverOpen("parts")}
                onPointerLeave={hoverClose}
              >
                <MenuButton
                  ref={(node) => {
                    triggers.current.parts = node;
                  }}
                  open={menu === "parts"}
                  active={partsActive}
                  controls="parts-menu"
                  onClick={toggle("parts")}
                >
                  Parts
                </MenuButton>
              </li>
              <li className="flex">
                <BarLink
                  href="/sellyourcar"
                  active={pathname === "/sellyourcar"}
                  onClick={close}
                >
                  Sell your car
                </BarLink>
              </li>
              <li
                className="relative flex"
                onPointerEnter={hoverOpen("about")}
                onPointerLeave={hoverClose}
              >
                <MenuButton
                  ref={(node) => {
                    triggers.current.about = node;
                  }}
                  open={menu === "about"}
                  active={aboutActive}
                  controls="about-menu"
                  onClick={toggle("about")}
                >
                  About
                </MenuButton>
                {menu === "about" && (
                  <div
                    id="about-menu"
                    className="nav-drop border-line bg-card absolute top-full left-0 mt-px w-56 overflow-hidden rounded-b-xl border border-t-0 py-2 shadow-2xl shadow-black/60"
                  >
                    {ABOUT_LINKS.map((link) => (
                      <PanelLink
                        key={link.href}
                        {...link}
                        current={pathname === link.href}
                        onClick={close}
                      />
                    ))}
                  </div>
                )}
              </li>
              <li className="flex">
                <BarLink
                  href="/contact"
                  active={pathname === "/contact"}
                  onClick={close}
                >
                  Contact
                </BarLink>
              </li>
            </ul>
          </nav>

          <div className="ml-auto flex items-center sm:gap-2">
            <a
              href={`tel:${site.contact.phoneE164}`}
              className="bg-brand hover:bg-brand-hover mr-1 hidden h-11 items-center gap-2 rounded-xl px-4 text-sm font-semibold text-white transition-[background-color,transform] active:scale-[0.97] lg:flex"
            >
              <PhoneIcon className="h-4 w-4" aria-hidden="true" />
              Call the yard
            </a>

            <div className="relative hidden lg:block">
              <IconButton
                ref={(node) => {
                  triggers.current.account = node;
                }}
                label={
                  session?.signedIn ? `Account, ${session.name}` : "Account"
                }
                expanded={menu === "account"}
                controls="account-menu"
                onClick={toggle("account")}
              >
                <UserIcon className="h-6 w-6" aria-hidden="true" />
                {/*
                  A dot rather than a name in the bar: without any mark the
                  icon looked the same signed in as signed out.
                */}
                {session?.signedIn && (
                  <span
                    aria-hidden="true"
                    className="bg-brand ring-canvas absolute right-2 bottom-2 h-2.5 w-2.5 rounded-full ring-2"
                  />
                )}
              </IconButton>
              {menu === "account" && (
                <div
                  id="account-menu"
                  className="nav-drop border-line bg-card absolute top-full right-0 mt-3 w-60 overflow-hidden rounded-xl border py-2 shadow-2xl shadow-black/60"
                >
                  <AccountLinks session={session} onNavigate={close} />
                </div>
              )}
            </div>

            <Link
              href="/cart"
              onClick={close}
              aria-label={
                count > 0
                  ? `Cart, ${count} ${count === 1 ? "part" : "parts"}`
                  : "Cart"
              }
              aria-current={pathname === "/cart" ? "page" : undefined}
              className="hover:bg-tile relative flex h-11 w-11 items-center justify-center rounded-xl transition-colors"
            >
              <ShoppingCartIcon className="h-6 w-6" aria-hidden="true" />
              {count > 0 && (
                <span className="bg-brand ring-canvas absolute top-1 right-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[11px] leading-none font-bold text-white tabular-nums ring-2">
                  {count > 99 ? "99+" : count}
                </span>
              )}
            </Link>

            <IconButton
              label="Open menu"
              className="lg:hidden"
              onClick={() => drawerRef.current?.showModal()}
            >
              <Bars3Icon className="h-6 w-6" aria-hidden="true" />
            </IconButton>
          </div>
        </Container>

        {menu === "parts" && (
          <div
            id="parts-menu"
            onPointerEnter={hoverOpen("parts")}
            onPointerLeave={hoverClose}
            className="nav-drop border-line bg-card absolute inset-x-0 top-full hidden border-b shadow-2xl shadow-black/70 lg:block"
          >
            <Container className="grid grid-cols-12 gap-10 py-8">
              <div className="col-span-4">
                <PanelHeading>Shop by part type</PanelHeading>
                <ul className="-mx-3 max-w-sm">
                  {parts.categories.map((link) => (
                    <li key={link.href}>
                      <PanelLink
                        {...link}
                        current={pathname === link.href}
                        onClick={close}
                        chevron
                      />
                    </li>
                  ))}
                </ul>
                <PanelFoot href="/parts" onClick={close}>
                  All part categories
                </PanelFoot>
              </div>

              <div className="col-span-5">
                <PanelHeading>Shop by make</PanelHeading>
                <ul className="-mx-3 grid grid-cols-2 gap-x-6">
                  {parts.makes.map((link) => (
                    <li key={link.href}>
                      <PanelLink
                        {...link}
                        current={pathname === link.href}
                        onClick={close}
                        chevron
                      />
                    </li>
                  ))}
                </ul>
                <PanelFoot href="/wreckers" onClick={close}>
                  All makes we wreck
                </PanelFoot>
              </div>

              <div className="col-span-3 flex flex-col gap-3">
                <Link
                  href="/products"
                  onClick={close}
                  className="group border-line bg-tile hover:border-brand flex items-center justify-between rounded-2xl border px-5 py-4 transition-colors"
                >
                  <span>
                    <span className="block font-semibold text-white">
                      Browse every part
                    </span>
                    <span className="block text-sm text-gray-400">
                      Filter by year, make and model
                    </span>
                  </span>
                  <ChevronRightIcon
                    className="text-brand-text h-5 w-5 transition-transform group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </Link>

                <div className="border-line rounded-2xl border p-5">
                  <p className="font-semibold text-white">
                    Can&rsquo;t see your part?
                  </p>
                  <p className="mt-1.5 text-sm leading-relaxed text-gray-400">
                    Tell us the car and the part, and we will check the yard for
                    you.
                  </p>
                  <div className="mt-4 flex flex-col gap-2">
                    <a
                      href={`tel:${site.contact.phoneE164}`}
                      className="bg-brand hover:bg-brand-hover flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white transition-[background-color,transform] active:scale-[0.97]"
                    >
                      <PhoneIcon className="h-4 w-4" aria-hidden="true" />
                      Call {site.contact.phone}
                    </a>
                    <Link
                      href="/contact"
                      onClick={close}
                      className="border-line hover:border-gray-500 flex h-11 items-center justify-center rounded-xl border text-sm font-semibold text-white transition-colors"
                    >
                      Send a part request
                    </Link>
                  </div>
                </div>
              </div>
            </Container>
          </div>
        )}
      </header>

      <MobileMenu
        ref={drawerRef}
        parts={parts}
        pathname={pathname}
        session={session}
        status={status}
      />
    </>
  );
}

type Session = { signedIn: boolean; name?: string; isAdmin?: boolean } | null;
type Status = { open: boolean; label: string } | null;

function YardState({ status }: { status: Status }) {
  if (!status) {
    // Before the browser knows the time: the hours, which are never wrong.
    return (
      <span className="truncate">
        Mon to Fri 8 am to 5 pm, Sat 9 am to 2 pm
      </span>
    );
  }
  return (
    <span className="flex min-w-0 items-center gap-2">
      <span
        aria-hidden="true"
        className={`h-2 w-2 shrink-0 rounded-full ${status.open ? "bg-green-400 shadow-[0_0_0_3px] shadow-green-400/20" : "bg-gray-500"}`}
      />
      <span className={`truncate ${status.open ? "text-white" : ""}`}>
        {status.label}
      </span>
    </span>
  );
}

/** A top-level item in the bar. The red rule under it marks where you are. */
const barItem = (active: boolean, open = false) =>
  `relative flex h-full items-center gap-1 px-3 text-[15px] font-semibold transition-colors hover:text-white after:absolute after:inset-x-3 after:-bottom-px after:h-0.5 after:origin-left after:bg-brand after:transition-transform after:duration-200 hover:after:scale-x-100 focus-visible:outline-none focus-visible:after:scale-x-100 ${
    active || open
      ? "text-white after:scale-x-100"
      : "text-gray-300 after:scale-x-0"
  }`;

function BarLink({
  href,
  active,
  onClick,
  children,
}: {
  href: string;
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={barItem(active)}
    >
      {children}
    </Link>
  );
}

function MenuButton({
  ref,
  open,
  active,
  controls,
  onClick,
  children,
}: {
  ref: (node: HTMLButtonElement | null) => void;
  open: boolean;
  active: boolean;
  controls: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      ref={ref}
      type="button"
      aria-expanded={open}
      aria-controls={controls}
      onClick={onClick}
      className={barItem(active, open)}
    >
      {children}
      <ChevronDownIcon
        className={`h-4 w-4 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        aria-hidden="true"
      />
    </button>
  );
}

function IconButton({
  ref,
  label,
  expanded,
  controls,
  className = "",
  onClick,
  children,
}: {
  ref?: (node: HTMLButtonElement | null) => void;
  label: string;
  expanded?: boolean;
  controls?: string;
  className?: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      aria-expanded={expanded}
      aria-controls={controls}
      onClick={onClick}
      className={`hover:bg-tile relative flex h-11 w-11 items-center justify-center rounded-xl text-white transition-colors ${className}`}
    >
      {children}
    </button>
  );
}

function PanelHeading({ children }: { children: ReactNode }) {
  return (
    <h2 className="mb-3 text-sm font-semibold text-gray-400">{children}</h2>
  );
}

function PanelLink({
  href,
  label,
  current,
  chevron = false,
  onClick,
}: NavLink & { current: boolean; chevron?: boolean; onClick: () => void }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={current ? "page" : undefined}
      className={`group hover:bg-tile flex items-center justify-between rounded-lg px-3 py-2.5 text-[15px] transition-colors ${
        current ? "text-brand-text font-semibold" : "text-white"
      }`}
    >
      {label}
      {chevron && (
        <ChevronRightIcon
          className="h-4 w-4 text-gray-600 transition-[color,transform] group-hover:translate-x-0.5 group-hover:text-brand-text"
          aria-hidden="true"
        />
      )}
    </Link>
  );
}

function PanelFoot({
  href,
  onClick,
  children,
}: {
  href: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="text-brand-text mt-3 inline-flex items-center gap-1 text-sm font-semibold hover:underline"
    >
      {children}
      <ChevronRightIcon className="h-4 w-4" aria-hidden="true" />
    </Link>
  );
}

function AccountLinks({
  session,
  onNavigate,
  large = false,
}: {
  session: Session;
  onNavigate: () => void;
  large?: boolean;
}) {
  const row = large
    ? "flex items-center justify-between px-1 py-3.5 text-base text-white"
    : "hover:bg-tile block px-4 py-2.5 text-sm text-white transition-colors";

  if (!session?.signedIn) {
    return (
      <>
        <Link href="/login" onClick={onNavigate} className={row}>
          Sign in
        </Link>
        <Link href="/login?mode=register" onClick={onNavigate} className={row}>
          Create an account
        </Link>
      </>
    );
  }

  return (
    <>
      <p
        className={`truncate text-xs text-gray-400 ${large ? "px-1 pb-1" : "border-line mb-1 border-b px-4 pt-1 pb-3"}`}
      >
        Signed in as{" "}
        <span className="font-semibold text-white">{session.name}</span>
      </p>
      {session.isAdmin && (
        <Link href="/dashboard" onClick={onNavigate} className={row}>
          Dashboard
        </Link>
      )}
      <Link href="/my-account" onClick={onNavigate} className={row}>
        My profile
      </Link>
      <Link href="/orders" onClick={onNavigate} className={row}>
        My orders
      </Link>
      <form action={signOut}>
        <button type="submit" className={`${row} w-full text-left`}>
          Sign out
        </button>
      </form>
    </>
  );
}

/**
 * The phone menu.
 *
 * A native modal dialog, because it gets right for free what the old toggled
 * list got wrong: focus stays inside while it is open, Escape closes it, and
 * the page behind cannot be scrolled or tapped. The old menu was a centred
 * list of capitals with no parts in it, so on a phone, where most of this
 * site's visitors are, there was no way to reach a make or a part type at all.
 */
function MobileMenu({
  ref,
  parts,
  pathname,
  session,
  status,
}: {
  ref: React.Ref<HTMLDialogElement>;
  parts: PartsMenu;
  pathname: string;
  session: Session;
  status: Status;
}) {
  const closeDialog = (event: React.MouseEvent) => {
    event.currentTarget.closest("dialog")?.close();
  };

  const row =
    "border-line flex items-center justify-between border-b px-1 py-4 text-lg font-semibold text-white";

  return (
    <dialog
      ref={ref}
      aria-label="Menu"
      className="nav-sheet bg-admin m-0 h-dvh max-h-none w-full max-w-none p-0 text-white backdrop:bg-black/70 lg:hidden"
    >
      <div className="flex h-full flex-col">
        <div className="border-line flex h-[68px] shrink-0 items-center justify-between border-b px-4">
          <Image
            src="/images/darklogo.png"
            alt="Central Coast Auto Parts"
            width={180}
            height={64}
            className="h-11 w-auto"
          />
          <button
            type="button"
            aria-label="Close menu"
            onClick={closeDialog}
            className="hover:bg-tile flex h-11 w-11 items-center justify-center rounded-xl"
          >
            <XMarkIcon className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-4 pt-4 pb-8">
          <nav aria-label="Main">
            <Link
              href="/products"
              onClick={closeDialog}
              className={row}
              aria-current={pathname === "/products" ? "page" : undefined}
            >
              Browse every part
              <ChevronRightIcon
                className="text-brand-text h-5 w-5"
                aria-hidden="true"
              />
            </Link>

            <Disclosure title="Shop by part type">
              <ul className="grid grid-cols-1 gap-1 pb-3">
                {parts.categories.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      onClick={closeDialog}
                      aria-current={pathname === link.href ? "page" : undefined}
                      className="hover:bg-tile block rounded-lg px-3 py-3 text-base text-gray-200"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link
                    href="/parts"
                    onClick={closeDialog}
                    className="text-brand-text block px-3 py-3 text-base font-semibold"
                  >
                    All part categories
                  </Link>
                </li>
              </ul>
            </Disclosure>

            <Disclosure title="Shop by make">
              <ul className="grid grid-cols-2 gap-2 pb-4">
                {parts.makes.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      onClick={closeDialog}
                      aria-current={pathname === link.href ? "page" : undefined}
                      className="border-line bg-card active:bg-tile flex h-12 items-center justify-center rounded-xl border text-base text-white"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
                <li className="col-span-2">
                  <Link
                    href="/wreckers"
                    onClick={closeDialog}
                    className="text-brand-text block px-1 py-2 text-base font-semibold"
                  >
                    All makes we wreck
                  </Link>
                </li>
              </ul>
            </Disclosure>

            {[
              { href: "/sellyourcar", label: "Sell your car" },
              ...ABOUT_LINKS,
              { href: "/contact", label: "Contact" },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={closeDialog}
                aria-current={pathname === link.href ? "page" : undefined}
                className={row}
              >
                {link.label}
                <ChevronRightIcon
                  className="h-5 w-5 text-gray-600"
                  aria-hidden="true"
                />
              </Link>
            ))}
          </nav>

          <section aria-label="Account" className="mt-6">
            <h2 className="mb-1 px-1 text-sm font-semibold text-gray-400">
              Your account
            </h2>
            <AccountLinks session={session} onNavigate={() => {}} large />
          </section>
        </div>

        <div className="border-line bg-card shrink-0 border-t px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <a
            href={`tel:${site.contact.phoneE164}`}
            className="bg-brand active:bg-brand-hover flex h-12 items-center justify-center gap-2 rounded-xl text-base font-semibold text-white"
          >
            <PhoneIcon className="h-5 w-5" aria-hidden="true" />
            Call {site.contact.phone}
          </a>
          <div className="mt-3 flex items-center justify-between gap-3 text-[13px] text-gray-400">
            <YardState status={status} />
            <span className="shrink-0">{site.address.suburb}</span>
          </div>
        </div>
      </div>
    </dialog>
  );
}

function Disclosure({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <details className="group border-line border-b">
      <summary className="flex cursor-pointer list-none items-center justify-between px-1 py-4 text-lg font-semibold text-white [&::-webkit-details-marker]:hidden">
        {title}
        <ChevronDownIcon
          className="h-5 w-5 text-gray-400 transition-transform duration-200 group-open:rotate-180"
          aria-hidden="true"
        />
      </summary>
      {children}
    </details>
  );
}
