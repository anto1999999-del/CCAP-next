import Image from "next/image";
import Link from "next/link";
import { MAKE_PAGES } from "@/lib/content/make-pages";
import { PART_CATEGORIES } from "@/lib/content/part-categories";
import { site } from "@/lib/site";
import Container from "./Container";
import HelpBand from "./HelpBand";

/**
 * Site footer.
 *
 * Server-rendered in full, so it ships no JavaScript. It is also the site's
 * main internal-linking hub: the category pages and the make pages both rank
 * for searches the flat catalogue cannot, and every page here links to all of
 * them, which is how a crawler reaches them and how link weight is spread
 * across the set. That is why the columns are what they are.
 *
 * The naming here is deliberate. /products is the whole searchable catalogue,
 * labelled "Browse All Parts"; /parts is the category hub, labelled "Parts by
 * Category". The two used to both read "Parts", which is the kind of thing that
 * makes a visitor click the wrong one.
 *
 * The profile links below and the `sameAs` entries in the Organization schema
 * were reconciled with the owner 2026-08-19; see the note in lib/site.ts.
 */

const SHOP_LINKS = [
  { href: "/products", label: "Browse All Parts" },
  { href: "/parts", label: "Parts by Category" },
  { href: "/wreckers", label: "Wreckers by Make" },
  { href: "/sellyourcar", label: "Sell Your Car" },
] as const;

const COMPANY_LINKS = [
  { href: "/about", label: "About Us" },
  { href: "/blog", label: "Blog" },
  { href: "/gallery", label: "Gallery" },
  { href: "/contact", label: "Contact" },
  { href: "/privacy", label: "Privacy & Cookies" },
  { href: "/terms-conditions", label: "Terms & Conditions" },
] as const;

/** Short footer labels; the full names live in the page headings. */
const CATEGORY_LABEL: Record<string, string> = {
  engines: "Engines",
  gearboxes: "Gearboxes",
  "body-panels": "Body Panels",
  electrical: "Electrical",
  suspension: "Suspension",
  cooling: "Cooling",
  interior: "Interior",
};

const PAYMENT_METHODS = [
  { src: "/images/maestro.webp", alt: "Maestro" },
  { src: "/images/mastercard.webp", alt: "Mastercard" },
  { src: "/images/paypal.webp", alt: "PayPal" },
  { src: "/images/visa.webp", alt: "Visa" },
  { src: "/images/express.webp", alt: "American Express" },
] as const;

const PROFILES = [
  {
    href: "https://www.facebook.com/marketplace/profile/61555589287454/",
    src: "/images/facebook.webp",
    alt: "Central Coast Auto Parts on Facebook",
    width: 40,
    height: 40,
    className: "w-9",
  },
  {
    href: "https://www.instagram.com/centralcoastautoparts/",
    src: "/images/insta.webp",
    alt: "Central Coast Auto Parts on Instagram",
    width: 40,
    height: 40,
    className: "w-9",
  },
  {
    href: "https://www.gumtree.com.au/web/s-user/1499623032693",
    src: "/images/kiss.webp",
    alt: "Central Coast Auto Parts on Gumtree",
    width: 80,
    height: 40,
    className: "w-20",
  },
  {
    href: "https://www.ebay.com.au/str/centralcoastautopartsaus",
    src: "/images/ebay.webp",
    alt: "Central Coast Auto Parts on eBay",
    width: 68,
    height: 42,
    className: "w-16",
  },
  {
    href: "https://www.partscheck.com.au/global/index.php",
    src: "/images/partscheck_logo.png",
    alt: "partscheck.com.au",
    width: 68,
    height: 34,
    className: "w-16",
  },
  {
    href: "https://app.repairconnection.com/",
    src: "/images/repairconnection.svg",
    alt: "Repair Connection",
    width: 34,
    height: 34,
    className: "w-9",
  },
] as const;

/** A column heading with the brand accent under it, used across the footer. */
function ColumnHeading({ children }: { children: string }) {
  return (
    <div className="mb-5">
      <h4 className="text-xs font-bold tracking-[0.14em] text-white uppercase">
        {children}
      </h4>
      <span className="bg-brand mt-2 block h-[3px] w-8 rounded-full" />
    </div>
  );
}

/** A footer link with a chevron that slides in on hover. */
function FooterLink({ href, label }: { href: string; label: string }) {
  return (
    <li>
      <Link
        href={href}
        className="group inline-flex items-center gap-1 text-gray-400 transition-colors hover:text-white"
      >
        <span
          aria-hidden="true"
          className="text-brand w-0 overflow-hidden opacity-0 transition-all duration-200 group-hover:w-2.5 group-hover:opacity-100"
        >
          ›
        </span>
        {label}
      </Link>
    </li>
  );
}

function BrandBlock() {
  const { contact, address, hours } = site;
  return (
    <div className="text-center sm:text-left">
      <Image
        src="/images/darklogo.png"
        alt={site.name}
        width={210}
        height={66}
        className="mx-auto mb-5 h-14 w-auto object-contain sm:mx-0"
      />

      <p className="mb-6 max-w-xs text-sm leading-relaxed text-gray-400">
        Quality second-hand car parts, inspected and warranted, shipped
        Australia-wide from our yard in Berkeley Vale NSW.
      </p>

      <ul className="space-y-3 text-sm text-gray-300">
        <li className="flex items-start justify-center gap-2.5 sm:justify-start">
          <Image
            src="/icons/map.svg"
            alt=""
            width={18}
            height={18}
            className="mt-0.5 h-[18px] w-[18px] flex-shrink-0"
          />
          <span>{address.displayLine}</span>
        </li>
        <li className="flex items-start justify-center gap-2.5 sm:justify-start">
          <Image
            src="/icons/clock.svg"
            alt=""
            width={18}
            height={18}
            className="mt-0.5 h-[18px] w-[18px] flex-shrink-0"
          />
          <span>{hours.displayLine}</span>
        </li>
        <li className="flex items-center justify-center gap-2.5 sm:justify-start">
          <Image
            src="/icons/call.svg"
            alt=""
            width={18}
            height={18}
            className="h-[18px] w-[18px] flex-shrink-0"
          />
          <a
            href={`tel:${contact.phoneE164}`}
            className="font-semibold text-white hover:text-brand-text"
          >
            {contact.phone}
          </a>
        </li>
        <li className="flex items-center justify-center gap-2.5 sm:justify-start">
          <Image
            src="/icons/email.svg"
            alt=""
            width={18}
            height={18}
            className="h-[18px] w-[18px] flex-shrink-0"
          />
          <a
            href={`mailto:${contact.email}`}
            className="break-all hover:text-brand-text"
          >
            {contact.email}
          </a>
        </li>
      </ul>

      <p className="mt-5 text-xs text-gray-500">
        Licensed NSW auto dismantler &middot; MD {contact.licence}
      </p>
    </div>
  );
}

export default function Footer() {
  return (
    <div className="bg-card text-white">
      <HelpBand />

      <Container className="py-14 text-sm">
        <div className="grid grid-cols-2 gap-x-8 gap-y-10 lg:grid-cols-12 lg:gap-12">
          <div className="col-span-2 lg:col-span-4">
            <BrandBlock />
          </div>

          <nav className="lg:col-span-2" aria-label="Shop">
            <ColumnHeading>Shop</ColumnHeading>
            <ul className="space-y-2.5">
              {SHOP_LINKS.map((link) => (
                <FooterLink key={link.href} {...link} />
              ))}
            </ul>
          </nav>

          <nav className="lg:col-span-2" aria-label="Parts by category">
            <ColumnHeading>By Category</ColumnHeading>
            <ul className="space-y-2.5">
              {PART_CATEGORIES.map((category) => (
                <FooterLink
                  key={category.slug}
                  href={`/parts/${category.slug}`}
                  label={CATEGORY_LABEL[category.slug] ?? category.label}
                />
              ))}
            </ul>
          </nav>

          <nav className="lg:col-span-2" aria-label="Wreckers by make">
            <ColumnHeading>By Make</ColumnHeading>
            <ul className="space-y-2.5">
              {MAKE_PAGES.map((page) => (
                <FooterLink
                  key={page.slug}
                  href={`/wreckers/${page.slug}`}
                  label={page.label}
                />
              ))}
            </ul>
          </nav>

          <nav className="lg:col-span-2" aria-label="Company">
            <ColumnHeading>Company</ColumnHeading>
            <ul className="space-y-2.5">
              {COMPANY_LINKS.map((link) => (
                <FooterLink key={link.href} {...link} />
              ))}
            </ul>
          </nav>
        </div>

        {/* Payments and social profiles, on their own bordered strip. */}
        <div className="border-line mt-12 flex flex-col items-center gap-6 border-t pt-8 md:flex-row md:justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
              We accept
            </span>
            <div className="flex items-center gap-3">
              {PAYMENT_METHODS.map(({ src, alt }) => (
                <Image
                  key={alt}
                  src={src}
                  alt={alt}
                  width={40}
                  height={26}
                  className="h-6 w-auto"
                />
              ))}
            </div>
          </div>

          <div className="flex items-center gap-5">
            <span className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
              Find us
            </span>
            <div className="flex items-center gap-4">
              {PROFILES.map(({ href, src, alt, width, height, className }) => (
                <a
                  key={href}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  className="opacity-80 transition-opacity hover:opacity-100"
                >
                  <Image
                    src={src}
                    alt={alt}
                    width={width}
                    height={height}
                    className={className}
                  />
                </a>
              ))}
            </div>
          </div>
        </div>
      </Container>

      {/*
        Google requires this notice whenever the reCAPTCHA badge is hidden by
        CSS, which it is in globals.css. Removing one without the other breaches
        their terms, keep the two together.
      */}
      <div className="border-line bg-card border-t px-4 py-3 text-center text-[10px] text-gray-400">
        &copy; {new Date().getFullYear()} {site.name}. This site is protected by
        reCAPTCHA and the Google{" "}
        <a
          href="https://policies.google.com/privacy"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-white"
        >
          Privacy Policy
        </a>{" "}
        and{" "}
        <a
          href="https://policies.google.com/terms"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-white"
        >
          Terms of Service
        </a>{" "}
        apply.
      </div>
    </div>
  );
}
