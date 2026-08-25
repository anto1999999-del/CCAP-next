import Link from "next/link";
import Container from "@/components/layout/Container";
import SectionHeading from "@/components/layout/SectionHeading";
import {
  REASONS_TO_CHOOSE,
  SUPPLY_CARDS,
  USED_PART_BENEFITS,
  type SupplyCard,
} from "@/lib/content/sections";

/**
 * The three marketing sections that Home and About both show.
 *
 * Server components with no state, so they add nothing to the JavaScript
 * bundle. In the site this replaces each of these existed twice, copied
 * verbatim between the two pages.
 */

/**
 * Shared shell so the two card grids stay visually identical.
 *
 * Flat and bordered, like every other card on the site. The drop shadow this
 * used to carry did nothing on a near-black background except soften the edge
 * the border was drawing.
 */
const CARD = "rounded-2xl border border-line bg-card";

function SupplyCardBody({ card, linked }: { card: SupplyCard; linked: boolean }) {
  return (
    <>
      <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border-line border bg-white/5 text-xl md:h-14 md:w-14 md:text-2xl">
        <span aria-hidden="true">{card.icon}</span>
      </div>
      <h3 className="mb-2 text-base leading-snug font-bold md:text-lg">
        {card.title}
      </h3>
      <p className="text-sm leading-relaxed text-gray-400 md:text-[0.95rem]">
        {card.desc}
      </p>
      {linked && card.slug && (
        <span className="text-brand-text mt-3 inline-block text-xs font-semibold tracking-wider uppercase">
          View {card.title} →
        </span>
      )}
    </>
  );
}

/**
 * @param linked Home links each category card to its parts page; About shows
 *   the same cards as plain text, which is how both pages read today.
 */
export function WhatWeSupply({
  cards = SUPPLY_CARDS,
  linked = true,
  className = "",
}: {
  cards?: readonly SupplyCard[];
  linked?: boolean;
  className?: string;
}) {
  return (
    <section className={`bg-admin py-16 text-white md:py-24 ${className}`}>
      <Container>
        <SectionHeading
          className="mb-10 md:mb-12"
          eyebrow="USED AUTO PARTS NSW"
          title="What We Supply"
        />
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:gap-8 lg:grid-cols-4">
          {cards.map((card) =>
            linked && card.slug ? (
              <Link
                key={card.title}
                href={`/parts/${card.slug}`}
                className={`${CARD} hover:border-brand/40 flex min-h-[240px] flex-col p-7 transition-colors md:min-h-[280px] md:p-8`}
              >
                <SupplyCardBody card={card} linked />
              </Link>
            ) : (
              <div
                key={card.title}
                className={`${CARD} flex min-h-[240px] flex-col p-7 md:min-h-[280px] md:p-8`}
              >
                <SupplyCardBody card={card} linked={false} />
              </div>
            ),
          )}
        </div>
      </Container>
    </section>
  );
}

export function WhyUsedParts({ className = "" }: { className?: string }) {
  return (
    <section className={`bg-admin pb-16 text-white md:pb-24 ${className}`}>
      <Container>
        <SectionHeading
          className="mb-10 md:mb-12"
          title="Why Choose a Used Auto Part?"
          intro="Quality second-hand parts save money, reduce waste and get your vehicle back on the road faster."
        />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8">
          {USED_PART_BENEFITS.map((card) => (
            <div
              key={card.title}
              className={`${CARD} min-h-[190px] p-7 md:min-h-[210px] md:p-8`}
            >
              <div className="mb-4 text-2xl leading-none">
                {card.icon}
              </div>
              <h3 className="mb-2 text-base leading-snug font-bold md:text-lg">
                {card.title}
              </h3>
              <p className="text-sm leading-relaxed text-gray-400 md:text-[0.95rem]">
                {card.desc}
              </p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}

/**
 * @param closing The final line differs between the two pages, Home ends "or
 *   have a question", About "or want to sell your car fast".
 */
export function WhyChooseUs({
  closing,
  className = "",
}: {
  closing: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`bg-admin pb-16 text-white md:pb-28 ${className}`}>
      <Container>
        <SectionHeading
          className="mb-10 md:mb-12"
          title={
            <>
              Why Customers Choose Central Coast
              <br className="hidden sm:block" /> Auto Parts
            </>
          }
        />

        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-2 md:gap-8">
          {REASONS_TO_CHOOSE.map((card) => (
            <div
              key={card.title}
              className="relative overflow-hidden border-line bg-card rounded-2xl border p-6 md:p-7"
            >
              <div className="bg-brand/80 absolute top-0 bottom-0 left-0 w-[3px]" />
              <div className="flex items-start gap-4">
                <div className="mt-0.5 text-2xl leading-none">{card.icon}</div>
                <div>
                  <h3 className="mb-1 text-base font-bold md:text-lg">
                    {card.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-gray-400 md:text-[0.95rem]">
                    {card.desc}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <p className="mx-auto mt-10 max-w-4xl text-center text-sm leading-relaxed text-gray-400 md:mt-12 md:text-base">
          Serving customers across the{" "}
          <span className="text-brand-text font-semibold">
            Central Coast, Sydney, Newcastle
          </span>{" "}
          and all of Australia. {closing}
        </p>
      </Container>
    </section>
  );
}
