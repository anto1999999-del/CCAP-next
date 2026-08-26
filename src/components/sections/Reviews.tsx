import Container from "@/components/layout/Container";
import SectionHeading from "@/components/layout/SectionHeading";
import { GOOGLE_REVIEWS } from "@/lib/content/reviews";

/**
 * What customers say, and the rating that says it.
 *
 * This exists because the home page already told Google the business has a
 * rating and showed the visitor nothing. Rating markup is meant to describe
 * something on the page; this is that something.
 *
 * It renders quotes when there are quotes and the rating on its own when there
 * are not, which is the state it ships in. An empty testimonial section with
 * placeholder text would be worse than no section, and invented quotes would be
 * worse than both.
 */

function Stars({ rating }: { rating: number }) {
  return (
    <span
      className="text-brand-text text-xl tracking-[0.15em]"
      aria-label={`${rating} out of 5`}
    >
      {"★".repeat(Math.round(rating))}
      <span className="text-gray-700">{"★".repeat(5 - Math.round(rating))}</span>
    </span>
  );
}

export default function Reviews() {
  const { ratingValue, reviewCount, profileUrl, quotes } = GOOGLE_REVIEWS;

  return (
    <section className="bg-admin py-14 text-white md:py-20">
      <Container>
        <SectionHeading
          className="mb-10 md:mb-12"
          eyebrow="Reviews"
          title="What our customers say"
          intro="Every review is on our Google Business Profile, written by the people who bought the parts."
        />

        <div className="border-line bg-card mx-auto flex max-w-2xl flex-col items-center gap-3 rounded-2xl border p-8 text-center">
          <Stars rating={ratingValue} />

          <p className="text-3xl font-extrabold tabular-nums">
            {ratingValue.toFixed(1)}
            <span className="ml-2 text-base font-semibold text-gray-500">
              out of 5
            </span>
          </p>

          <p className="text-sm text-gray-400">
            from {reviewCount.toLocaleString()} Google reviews
          </p>

          <a
            href={profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="border-line hover:border-brand/60 mt-3 rounded-xl border px-5 py-2.5 text-sm font-semibold text-gray-200 transition-colors"
          >
            Read the reviews on Google
          </a>
        </div>

        {quotes.length > 0 && (
          <ul className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-3">
            {quotes.map((entry) => (
              <li
                key={entry.quote}
                className="border-line bg-card rounded-2xl border p-6"
              >
                <blockquote className="text-sm leading-relaxed text-gray-300">
                  {entry.quote}
                </blockquote>
                <p className="mt-4 text-xs font-semibold text-gray-500">
                  {entry.name}
                  {entry.location && `, ${entry.location}`}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Container>
    </section>
  );
}
