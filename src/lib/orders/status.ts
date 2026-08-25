import type { OrderStatus } from "./types";

/**
 * One colour per status, used by the charts, the chips and the tables.
 *
 * Kept in one place because the same status appearing amber in a table and
 * green in a chart is how a dashboard stops being readable at a glance. The
 * meanings are the ones the current admin uses: amber for waiting on us, red
 * while it is moving, green when it is done.
 */
export const STATUS_COLOURS: Record<string, string> = {
  Pending: "#f5a524",
  Processing: "#3b82f6",
  "On Their Way": "#e9162f",
  Delivered: "#22c55e",
  "Awaiting payment": "#7c7c86",
  Hidden: "#7c7c86",
};

/** Tailwind classes for the same meanings, where a style attribute will not do. */
export const STATUS_TEXT: Record<OrderStatus | string, string> = {
  Pending: "text-amber-400",
  Processing: "text-blue-400",
  "On Their Way": "text-brand-text",
  Delivered: "text-emerald-400",
  "Awaiting payment": "text-gray-500",
};
