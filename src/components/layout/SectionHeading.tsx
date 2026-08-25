/**
 * The heading at the top of a section.
 *
 * One component because there were three treatments in use and no rule about
 * which went where: centred with a red bar under it, left-aligned with a
 * small-caps label, and one heading in red on a site where every other heading
 * is white. Reading down a page, that is what made each section look like it
 * came from a different site.
 *
 * The eyebrow does the job the red bar was doing, and does it with words. A
 * three-pixel rule under a heading says "this is a heading", which the heading
 * already said.
 */
export default function SectionHeading({
  eyebrow,
  title,
  intro,
  align = "center",
  className = "",
}: {
  /** Small caps above the heading. Say something; do not label it "Section". */
  eyebrow?: string;
  title: React.ReactNode;
  intro?: React.ReactNode;
  /**
   * Centred for marketing sections, left for anything a person works through:
   * a form, a list, a table. Reading a long block is easier from a fixed left
   * edge, and centred text under a centred heading has no fixed edge at all.
   */
  align?: "center" | "left";
  className?: string;
}) {
  const centred = align === "center";

  return (
    <div
      className={`${centred ? "mx-auto max-w-3xl text-center" : "max-w-3xl"} ${className}`}
    >
      {eyebrow && (
        <p className="text-brand-text mb-3 text-[11px] font-semibold tracking-[0.28em] uppercase">
          {eyebrow}
        </p>
      )}

      <h2 className="text-2xl leading-tight font-extrabold tracking-tight text-balance text-white md:text-3xl">
        {title}
      </h2>

      {intro && (
        <p
          className={`mt-3 text-sm leading-relaxed text-gray-400 md:text-base ${centred ? "mx-auto" : ""}`}
        >
          {intro}
        </p>
      )}
    </div>
  );
}
