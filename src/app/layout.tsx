import type { Metadata } from "next";
import { site, absoluteUrl } from "@/lib/site";
import "./globals.css";

/**
 * Root metadata.
 *
 * These values are carried across verbatim from the current site's index.html.
 * The migration must not cost any search visibility, so titles, descriptions,
 * canonicals and social tags stay byte-identical unless there is a deliberate
 * decision to change one.
 *
 * `metadataBase` lets every relative image and canonical below resolve to an
 * absolute URL; without it Next emits relative OG tags, which most crawlers and
 * social scrapers ignore.
 */
export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title:
    "Used Car Parts Berkeley Vale NSW | Warranty-Backed | Central Coast Auto Parts",
  description: site.description,
  keywords: [
    "Central Coast Auto Parts",
    "used car parts central coast",
    "car parts NSW",
    "second hand car parts NSW",
    "auto wreckers central coast NSW",
    "car wreckers central coast",
    "wreckers central coast",
    "toyota wreckers central coast",
    "4WD wreckers central coast",
    "buy used engines NSW",
    "gearbox replacement central coast",
    "sell your car NSW",
  ],
  alternates: {
    // Emits the bare origin, where the current site emits it with a trailing
    // slash. The two are the same resource — an empty path normalises to "/" —
    // so crawlers treat them identically and no value is lost.
    //
    // Do NOT reach for `trailingSlash: true` in next.config to close the gap:
    // that setting redirects every route on the site (/about -> /about/), which
    // would change all ~32k product URLs and is precisely the risk this
    // migration exists to avoid.
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
    "max-image-preview": "large",
  },
  openGraph: {
    type: "website",
    siteName: site.name,
    title:
      "Used Car Parts Berkeley Vale NSW | Warranty-Backed | Central Coast Auto Parts",
    description: site.description,
    url: "/",
    images: [{ url: site.logo }],
  },
  twitter: {
    card: "summary_large_image",
    title:
      "Used Car Parts Berkeley Vale NSW | Warranty-Backed | Central Coast Auto Parts",
    description:
      "Quality used engines, gearboxes, body panels and more — all with warranty. Trusted car wreckers in Berkeley Vale NSW. Fast dispatch Australia-wide.",
    images: [site.logo],
  },
  icons: {
    icon: site.logo,
  },
};

/**
 * Sitewide Organization schema.
 *
 * Rendered server-side into every page, matching the current site. Kept as a
 * plain script tag rather than a component so it lands in the initial HTML with
 * no client JavaScript involved.
 */
function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${site.url}/#organization`,
    name: site.name,
    url: `${site.url}/`,
    logo: {
      "@type": "ImageObject",
      url: absoluteUrl(site.logo),
    },
    contactPoint: [
      {
        "@type": "ContactPoint",
        telephone: site.contact.phoneE164,
        contactType: "customer service",
        areaServed: "AU",
        availableLanguage: "English",
        hoursAvailable: {
          "@type": "OpeningHoursSpecification",
          dayOfWeek: [
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
          ],
          opens: "08:00",
          closes: "17:00",
        },
      },
      {
        "@type": "ContactPoint",
        telephone: site.contact.salesMobileE164,
        contactType: "sales",
        contactOption: "WhatsApp",
        areaServed: "AU",
      },
      {
        "@type": "ContactPoint",
        email: site.contact.email,
        contactType: "sales",
      },
    ],
    address: {
      "@type": "PostalAddress",
      streetAddress: site.address.street,
      addressLocality: site.address.suburb,
      addressRegion: site.address.state,
      postalCode: site.address.postcode,
      addressCountry: site.address.country,
    },
    sameAs: site.social,
  };
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        {children}
        <script
          type="application/ld+json"
          // Serialised server-side from a literal defined above; no user input
          // reaches this, so there is nothing here to escape.
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationSchema()),
          }}
        />
      </body>
    </html>
  );
}
