import type { ReactNode } from "react";

/**
 * The page's horizontal rhythm, in one place.
 *
 * Every full-width band, header, page sections, footer, puts its content
 * inside this, so their left and right edges line up down the whole page.
 *
 * This exists because they did not. The site it replaces set widths and padding
 * ad hoc per component: the header used `container mx-auto` with `px-4 lg:px-10`,
 * the footer `px-4 lg:px-16`, and the page sections `max-w-7xl` with `px-6`.
 * At a 1280px viewport that put the header's content at 40px from the left, the
 * footer's at 64px and the sections' at 24px, three different gutters stacked
 * down one page, which reads as sloppy even when nothing else is wrong.
 *
 * Change the values here and the whole site stays in step. Do not reintroduce
 * per-component widths.
 */
export default function Container({
  children,
  className = "",
  as: Element = "div",
}: {
  children: ReactNode;
  className?: string;
  /** Lets a caller keep semantic markup without wrapping in an extra div. */
  as?: "div" | "section" | "nav" | "footer" | "header";
}) {
  return (
    <Element className={`mx-auto w-full max-w-7xl px-6 lg:px-8 ${className}`}>
      {children}
    </Element>
  );
}
