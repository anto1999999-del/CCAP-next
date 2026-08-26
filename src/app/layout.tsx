import type { Metadata } from "next";
import { site, absoluteUrl } from "@/lib/site";
import { CartProvider } from "@/lib/cart/CartProvider";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ThirdPartyGate from "@/components/layout/ThirdPartyGate";
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
  title: "Used Car Parts Berkeley Vale NSW | Central Coast Auto Parts",
  description: site.description,
  /*
    No `keywords`. Google has ignored the meta keywords tag since 2009 and no
    major engine reads it, so a list here changes nothing about how the site
    ranks. It was also declared once in this layout, which meant every page
    inherited the identical list: Sell Your Car was telling crawlers its
    keywords were "buy used engines NSW".

    The live site does not emit one either, so removing it loses nothing and
    stops publishing the keyword targets to anyone who views source.
  */
  alternates: {
    // Emits the bare origin, where the current site emits it with a trailing
    // slash. The two are the same resource, an empty path normalises to "/",
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
    /*
      Australian English, stated rather than left to be guessed. Every price is
      AUD, every phone number and postcode is Australian, and the yard ships
      from one address in NSW. `lang` on the document says the same thing.
    */
    locale: "en_AU",
    title: "Used Car Parts Berkeley Vale NSW | Central Coast Auto Parts",
    description: site.description,
    url: "/",
    images: [{ url: site.logo }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Used Car Parts Berkeley Vale NSW | Central Coast Auto Parts",
    description:
      "Quality used engines, gearboxes, body panels and more, all with warranty. Trusted car wreckers in Berkeley Vale NSW. Fast dispatch Australia-wide.",
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
          opens: site.hours.opens,
          closes: site.hours.closes,
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
    <html lang="en-AU">
      <body>
        <CartProvider>
          <Header />
          {children}
          <Footer />
        </CartProvider>
        <ThirdPartyGate />
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
