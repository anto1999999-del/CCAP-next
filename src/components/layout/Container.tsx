import type { ReactNode } from "react";

/**
 * The page's horizontal rhythm, in one place.
 *
 * Every full-width band, header, page sections, footer, puts its content inside
 * this, so their left and right edges line up down the whole page.
 *
 * This exists because they did not. The site it replaces set widths and padding
 * ad hoc per component: the header used `container mx-auto` with `px-4 lg:px-10`,
 * the footer `px-4 lg:px-16`, and the page sections `max-w-7xl` with `px-6`.
 * At a 1280px viewport that put the header's content at 40px from the left, the
 * footer's at 64px and the sections' at 24px: three different gutters stacked
 * down one page, which reads as sloppy even when nothing else is wrong.
 *
 * Change the values here and the whole site stays in step. Do not reintroduce
 * per-component widths.
 */

/**
 * `site` is 1280px, chosen by the owner and used by every page including the
 * dashboard. It is the `xl` breakpoint exactly, so a grid that goes to its
 * widest layout at `xl` gets the full width to lay it out in. `prose` is for long-form reading, where a line of text past about
 * eighty characters is genuinely harder to follow, so an article must not
 * inherit the full width.
 *
 * It is deliberately narrower than the screen. Content that runs the whole
 * width of a 2560px monitor is unreadable, and a grid that keeps adding columns
 * to fill the space ends up with cards too small to show anything. Everything
 * below this width is unaffected; above it, the background continues and the
 * content stops.
 *
 * These are a choice the caller makes, not a class they pass. Passing
 * `max-w-3xl` through `className` looks like it works and does not reliably: it
 * collides with the width already on the element, and which one wins depends on
 * the order Tailwind happens to emit them in.
 */
const WIDTHS = {
  site: "max-w-[1280px]",
  prose: "max-w-3xl",
} as const;

export default function Container({
  children,
  className = "",
  width = "site",
  as: Element = "div",
}: {
  children: ReactNode;
  className?: string;
  width?: keyof typeof WIDTHS;
  /** Lets a caller keep semantic markup without wrapping in an extra div. */
  as?: "div" | "section" | "nav" | "footer" | "header";
}) {
  return (
    <Element
      className={`mx-auto w-full ${WIDTHS[width]} px-6 lg:px-10 ${className}`}
    >
      {children}
    </Element>
  );
}
