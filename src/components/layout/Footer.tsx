import Image from "next/image";
import Link from "next/link";
import { site } from "@/lib/site";
import Container from "./Container";

/**
 * Site footer.
 *
 * Server-rendered in full. The only part of the original that needed the
 * current path was the marketing contact form at the top, which is hidden on
 * pages that carry their own; that block is composed in by the pages that want
 * it rather than being decided here from `usePathname`, so the footer itself
 * ships no JavaScript at all.
 *
 * The profile links below are the ones the live footer uses. Note they disagree
 * with the `sameAs` entries in the Organization schema — see DESIGN-NOTES.md.
 * Both are reproduced as-is until the correct profiles are confirmed, because
 * pointing structured data at the wrong profile is worse than the current
 * inconsistency.
 */

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/products", label: "Parts" },
  { href: "/sellyourcar", label: "Sell Your Car" },
  { href: "/contact", label: "Contact" },
  { href: "/blog", label: "Blog" },
  { href: "/gallery", label: "Gallery" },
  { href: "/about", label: "About" },
  { href: "/terms-conditions", label: "Terms & Conditions" },
] as const;

const PAYMENT_METHODS = [
  { src: "/images/maestro.webp", alt: "Maestro", width: 48, className: "w-12" },
  { src: "/images/mastercard.webp", alt: "Mastercard", width: 48, className: "w-12" },
  { src: "/images/paypal.webp", alt: "PayPal", width: 48, className: "w-12" },
  { src: "/images/visa.webp", alt: "Visa", width: 48, className: "w-12" },
  { src: "/images/express.webp", alt: "American Express", width: 48, className: "w-12" },
] as const;

const PROFILES = [
  {
    href: "https://www.facebook.com/marketplace/profile/61555589287454/",
    src: "/images/facebook.webp",
    alt: "Central Coast Auto Parts on Facebook",
    width: 48,
    height: 48,
    className: "w-12",
  },
  {
    href: "https://www.instagram.com/centralcoastautoparts/",
    src: "/images/insta.webp",
    alt: "Central Coast Auto Parts on Instagram",
    width: 48,
    height: 48,
    className: "w-12",
  },
  {
    href: "https://www.gumtree.com.au/web/s-user/1499623032693",
    src: "/images/kiss.webp",
    alt: "Central Coast Auto Parts on Gumtree",
    width: 96,
    height: 48,
    className: "w-24",
  },
  {
    href: "https://www.ebay.com.au/str/centralcoastautopartsaus",
    src: "/images/ebay.webp",
    alt: "Central Coast Auto Parts on eBay",
    width: 80,
    height: 50,
    className: "w-20",
  },
  {
    href: "https://www.partscheck.com.au/global/index.php",
    src: "/images/partscheck_logo.png",
    alt: "partscheck.com.au",
    width: 80,
    height: 40,
    className: "w-20",
  },
  {
    href: "https://app.repairconnection.com/",
    src: "/images/repairconnection.svg",
    alt: "Repair Connection",
    width: 40,
    height: 40,
    className: "w-10",
  },
] as const;

/** Address, hours, phone and email, with their icons. */
function ContactDetails() {
  const { contact, address, hours } = site;
  return (
    <div className="text-center lg:text-left">
      <Image
        src="/images/darklogo.png"
        alt={site.name}
        width={200}
        height={64}
        className="mx-auto mb-4 h-14 w-auto object-contain sm:h-16 lg:mx-0"
      />

      <p className="mb-2 flex items-center justify-center lg:justify-start">
        <Image src="/icons/map.svg" alt="" width={20} height={20} className="mr-2 h-5 w-5" />
        {address.displayLine}
      </p>

      <p className="mb-2 flex items-center justify-center lg:justify-start">
        <Image src="/icons/clock.svg" alt="" width={20} height={20} className="mr-2 h-5 w-5" />
        {hours.displayLine}
      </p>

      <p className="mb-2 flex items-center justify-center lg:justify-start">
        <Image src="/icons/call.svg" alt="" width={20} height={20} className="mr-2 h-5 w-5" />
        <a href={`tel:${contact.phone}`} className="hover:text-red-600">
          {contact.phone}
        </a>
      </p>

      <p className="flex items-center justify-center lg:justify-start">
        <Image src="/icons/email.svg" alt="" width={20} height={20} className="mr-2 h-5 w-5" />
        <a href={`mailto:${contact.email}`} className="hover:text-red-600">
          {contact.email}
        </a>
      </p>

      <br />
      <p className="flex items-center justify-center lg:justify-start">
        License No. {contact.licence}
      </p>
    </div>
  );
}

export default function Footer() {
  return (
    <div className="bg-surface text-white">
      {/* Customer help band. The background image carries the red. */}
      <div
        className="bg-cover bg-center py-6 text-white"
        style={{ backgroundImage: "url(/images/section.webp)" }}
      >
        <Container>
          <h3 className="mb-2 text-lg font-bold lg:text-xl">Customer Help</h3>
          <p className="mb-4">
            Can&rsquo;t find the part you need? Our friendly team is ready to help.
          </p>
          <a
            href={`tel:${site.contact.phone}`}
            className="inline-block rounded bg-white px-6 py-2 font-semibold text-red-600 shadow"
          >
            Call Us Now
          </a>
        </Container>
      </div>

      <Container className="py-8 text-sm">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <ContactDetails />

          <div className="flex flex-col items-center space-y-4">
            <div className="text-center lg:text-left">
              <h4 className="mb-6 text-lg font-semibold lg:text-left">Navigation</h4>
              <ul className="space-y-2">
                {NAV_LINKS.map(({ href, label }) => (
                  <li key={href}>
                    <Link href={href} className="block hover:text-red-600">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="flex flex-col items-center space-y-10">
            <div>
              <h4 className="mb-6 text-center text-lg font-semibold">We Accept</h4>
              <div className="flex justify-center space-x-6">
                {PAYMENT_METHODS.map(({ src, alt, width, className }) => (
                  <Image
                    key={alt}
                    src={src}
                    alt={alt}
                    width={width}
                    height={30}
                    className={className}
                  />
                ))}
              </div>
            </div>

            <div>
              <h4 className="mb-6 text-center text-lg font-semibold">Join Us</h4>
              <div className="flex items-center justify-center space-x-6">
                {PROFILES.map(({ href, src, alt, width, height, className }) => (
                  <a key={href} href={href} target="_blank" rel="noreferrer">
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
        </div>
      </Container>

      {/*
        Google requires this notice whenever the reCAPTCHA badge is hidden by
        CSS, which it is in globals.css. Removing one without the other breaches
        their terms — keep the two together.
      */}
      <div className="border-t border-gray-800 bg-[#141414] px-4 py-3 text-center text-[10px] text-gray-500">
        This site is protected by reCAPTCHA and the Google{" "}
        <a
          href="https://policies.google.com/privacy"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-gray-300"
        >
          Privacy Policy
        </a>{" "}
        and{" "}
        <a
          href="https://policies.google.com/terms"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-gray-300"
        >
          Terms of Service
        </a>{" "}
        apply.
      </div>
    </div>
  );
}
