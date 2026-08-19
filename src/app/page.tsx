import Link from "next/link";
import JsonLd from "@/components/JsonLd";
import FaqSection from "@/components/FaqSection";
import ContactFormSection from "@/components/ContactFormSection";
import Container from "@/components/layout/Container";
import { HOMEPAGE_FAQS, faqSchema } from "@/lib/faqs";
import { homeBusinessSchema } from "@/lib/schema/business";

/**
 * Home page.
 *
 * Everything except the FAQ accordion is a server component, so the whole page
 * — headings, copy, category links, structured data — is in the initial HTML.
 * The current site renders all of this in the browser from an empty div, so
 * this is the single largest SEO improvement in the migration.
 *
 * The hero and section headings set their own font stack rather than inheriting
 * the site's Arial. That is what the live site does; it is reproduced here
 * rather than unified, per the brief to match exactly.
 */

/** The system stack the current site applies to these sections inline. */
const HERO_FONT =
  "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

type CategoryCard = {
  icon: string;
  title: string;
  /** Present when the card links to a category page. */
  slug: string | null;
  desc: string;
};

const CATEGORY_CARDS: readonly CategoryCard[] = [
  {
    icon: "🚗",
    title: "Used Engines",
    slug: "engines",
    desc: "Low-kilometre second-hand engines sourced from dismantled vehicles, inspected by our team and supplied with warranty across Australia.",
  },
  {
    icon: "⚙️",
    title: "Gearboxes & Driveline",
    slug: "gearboxes",
    desc: "Used manual and automatic gearboxes, differentials and driveline components available for a wide range of makes and models.",
  },
  {
    icon: "🧩",
    title: "Panels & Body Parts",
    slug: "body-panels",
    desc: "Second-hand bumpers, guards, bonnets, doors, tailgates and exterior body parts at affordable prices — a fraction of dealer costs.",
  },
  {
    icon: "🔌",
    title: "Electrical Components",
    slug: "electrical",
    desc: "Used ECUs, modules, switches, headlights, alternators, starter motors and other auto electrical parts checked before dispatch.",
  },
  {
    icon: "🧰",
    title: "Suspension & Steering",
    slug: "suspension",
    desc: "Suspension, steering, cooling systems, A/C and other mechanical parts removed from dismantled vehicles and ready to fit.",
  },
  {
    icon: "🚚",
    title: "Australia-Wide Delivery",
    slug: null,
    desc: "We ship used auto parts to Sydney, Newcastle, Brisbane, Melbourne and everywhere in between — fast freight, secure packaging.",
  },
  {
    icon: "🏷️",
    title: "Trade & Workshop Supply",
    slug: null,
    desc: "Supplying smash repairers, mechanics, insurers and fleet operators with reliable used car parts at competitive trade prices.",
  },
  {
    icon: "🔧",
    title: "Supply & Fit Available",
    slug: null,
    desc: "Selected major components can be supplied and fitted through our workshop — ask our team about availability for your vehicle.",
  },
] as const;

const USED_PART_BENEFITS = [
  {
    icon: "✓",
    title: "Save Up to 70% vs New",
    desc: "Quality used car parts cost a fraction of new dealer prices — without sacrificing reliability when sourced from a reputable wrecker.",
  },
  {
    icon: "💰",
    title: "Sell Your Unwanted Vehicle",
    desc: "We buy damaged, non-running and end-of-life vehicles across the Central Coast and Sydney. Get a fast cash quote today.",
  },
  {
    icon: "🔧",
    title: "Faster Turnaround",
    desc: "In-stock used parts mean quicker repairs — no waiting weeks for back-ordered new parts. Get your car back on the road sooner.",
  },
] as const;

const REASONS_TO_CHOOSE = [
  {
    icon: "🚚",
    title: "Fast Dispatch & Freight Nationwide",
    desc: "Quick part checks, same-day dispatch where possible, and freight options to anywhere in Australia.",
  },
  {
    icon: "📦",
    title: "Large Stock of Used Auto Parts",
    desc: "Engines, gearboxes, body panels, electrical and mechanical parts across hundreds of makes and models — all in stock.",
  },
  {
    icon: "♻️",
    title: "Reputable Car Wreckers NSW",
    desc: "A real dismantling yard with hands-on knowledge, genuine quality checks and honest advice on every part’s condition.",
  },
  {
    icon: "🛡️",
    title: "Warranty on Major Components",
    desc: "All major used parts — including engines and gearboxes — are sold with warranty for added peace of mind.",
  },
] as const;

/** Shared card shell for the "What We Supply" grid. */
const CARD_CLASSES =
  "flex min-h-[240px] flex-col rounded-3xl border border-white/10 bg-card p-7 shadow-[0_16px_45px_rgba(0,0,0,0.55)] md:min-h-[280px] md:p-8";

function CategoryCardBody({ card }: { card: CategoryCard }) {
  return (
    <>
      <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-xl md:h-14 md:w-14 md:text-2xl">
        <span aria-hidden="true">{card.icon}</span>
      </div>
      <h3 className="mb-2 text-base leading-snug font-bold md:text-lg">
        {card.title}
      </h3>
      <p className="text-sm leading-relaxed text-white/70 md:text-[0.95rem]">
        {card.desc}
      </p>
      {card.slug && (
        <span className="text-brand mt-3 inline-block text-xs font-semibold tracking-wider uppercase">
          View {card.title} →
        </span>
      )}
    </>
  );
}

export default function HomePage() {
  return (
    <div>
      <JsonLd data={homeBusinessSchema()} />
      <JsonLd data={faqSchema(HOMEPAGE_FAQS)} />

      <section
        className="relative flex items-center overflow-hidden py-20 md:min-h-[min(78vh,820px)] md:py-28"
        style={{
          fontFamily: HERO_FONT,
          backgroundColor: "#050505",
          backgroundImage: `
            radial-gradient(ellipse 120% 80% at 0% 50%, rgba(233, 22, 47, 0.45), transparent 55%),
            radial-gradient(ellipse 70% 50% at 100% 0%, rgba(233, 22, 47, 0.12), transparent 45%),
            linear-gradient(100deg, #2a0c10 0%, #12080a 28%, #080808 55%, #050505 100%)
          `,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="relative z-[1] mx-auto w-full max-w-4xl px-6 text-center">
          <p className="text-brand mb-5 text-[11px] font-semibold tracking-[0.28em] uppercase sm:text-xs sm:tracking-[0.35em] md:text-sm">
            CENTRAL COAST AUTO PARTS — BERKELEY VALE NSW
          </p>
          <h1 className="mb-6 text-3xl leading-[1.15] font-extrabold tracking-tight text-white sm:text-4xl md:text-5xl lg:text-[3.25rem]">
            Used Car Parts Central Coast NSW — Engines, Gearboxes, Panels & More
          </h1>
          <p className="mx-auto mb-10 max-w-3xl text-sm leading-relaxed text-white/90 md:text-base lg:text-lg">
            Central Coast Auto Parts is a trusted used auto parts supplier and
            car wrecker based in Berkeley Vale, NSW. We stock quality second-hand
            engines, gearboxes, body panels, electrical components and mechanical
            parts for everyday cars, 4x4s, vans and light commercials — all
            tested, warranted and ready to ship Australia-wide.
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-5">
            <Link
              href="/products"
              className="bg-brand hover:bg-brand-alt inline-flex min-w-[220px] items-center justify-center rounded-full px-8 py-3.5 text-xs font-bold tracking-[0.12em] text-white uppercase shadow-[0_0_28px_rgba(233,22,47,0.45)] transition-colors hover:shadow-[0_0_36px_rgba(233,22,47,0.55)] sm:text-sm"
            >
              Browse used parts
            </Link>
            <Link
              href="/contact"
              className="inline-flex min-w-[220px] items-center justify-center rounded-full border border-white/90 bg-transparent px-8 py-3.5 text-xs font-bold tracking-[0.12em] text-white uppercase transition-colors hover:bg-white/10 sm:text-sm"
            >
              Contact us
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-admin py-16 text-white md:py-24">
        <Container>
          <div className="mb-10 text-center md:mb-12">
            <p className="text-brand mb-3 text-[11px] font-semibold tracking-[0.28em] uppercase sm:text-xs sm:tracking-[0.35em]">
              USED AUTO PARTS NSW
            </p>
            <h2 className="text-3xl font-extrabold tracking-tight md:text-5xl">
              What We Supply
            </h2>
            <div className="bg-brand mx-auto mt-4 h-[3px] w-14 rounded-full" />
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:gap-8 lg:grid-cols-4">
            {CATEGORY_CARDS.map((card) =>
              card.slug ? (
                <Link
                  key={card.title}
                  href={`/parts/${card.slug}`}
                  className={`${CARD_CLASSES} hover:border-brand/40 transition-colors`}
                >
                  <CategoryCardBody card={card} />
                </Link>
              ) : (
                <div key={card.title} className={CARD_CLASSES}>
                  <CategoryCardBody card={card} />
                </div>
              ),
            )}
          </div>
        </Container>
      </section>

      <section className="bg-admin pb-16 text-white md:pb-24">
        <Container>
          <div className="mb-10 text-center md:mb-12">
            <h2 className="text-3xl font-extrabold tracking-tight md:text-5xl">
              Why Choose a Used Auto Part?
            </h2>
            <p className="mx-auto mt-3 max-w-3xl text-sm text-white/70 md:text-base">
              Quality second-hand parts save money, reduce waste and get your
              vehicle back on the road faster.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8">
            {USED_PART_BENEFITS.map((card) => (
              <div
                key={card.title}
                className="bg-card min-h-[190px] rounded-3xl border border-white/10 p-7 shadow-[0_16px_45px_rgba(0,0,0,0.55)] md:min-h-[210px] md:p-8"
              >
                <div className="mb-4 text-2xl leading-none text-white/90">
                  {card.icon}
                </div>
                <h3 className="mb-2 text-base leading-snug font-bold md:text-lg">
                  {card.title}
                </h3>
                <p className="text-sm leading-relaxed text-white/70 md:text-[0.95rem]">
                  {card.desc}
                </p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <section className="bg-admin pb-16 text-white md:pb-28">
        <Container>
          <div className="mb-10 text-center md:mb-12">
            <h2 className="text-3xl font-extrabold tracking-tight md:text-5xl">
              Why Customers Choose Central Coast
              <br className="hidden sm:block" /> Auto Parts
            </h2>
          </div>

          <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-2 md:gap-8">
            {REASONS_TO_CHOOSE.map((card) => (
              <div
                key={card.title}
                className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#121214] p-6 shadow-[0_18px_50px_rgba(0,0,0,0.6)] md:p-7"
              >
                <div className="bg-brand/80 absolute top-0 bottom-0 left-0 w-[3px]" />
                <div className="flex items-start gap-4">
                  <div className="mt-0.5 text-2xl leading-none">{card.icon}</div>
                  <div>
                    <h3 className="mb-1 text-base font-bold md:text-lg">
                      {card.title}
                    </h3>
                    <p className="text-sm leading-relaxed text-white/70 md:text-[0.95rem]">
                      {card.desc}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <p className="mx-auto mt-10 max-w-4xl text-center text-sm leading-relaxed text-white/75 md:mt-12 md:text-base">
            Serving customers across the{" "}
            <span className="text-brand font-semibold">
              Central Coast, Sydney, Newcastle
            </span>{" "}
            and all of Australia. Whether you need a used engine, a replacement
            panel or have a question —{" "}
            <span className="text-brand font-semibold">
              Central Coast Auto Parts has you covered.
            </span>
          </p>
        </Container>
      </section>

      <FaqSection faqs={HOMEPAGE_FAQS} />

      <ContactFormSection />
    </div>
  );
}
