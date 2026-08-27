import { site } from "@/lib/site";

/**
 * The frame every customer email is rendered into.
 *
 * Email is not the web. Twenty-year-old rendering engines are still in use:
 * Outlook on Windows draws HTML with Word, Gmail strips anything in a <style>
 * block on some clients, and flexbox, grid and custom properties are all
 * unavailable. So this is tables and inline styles on purpose, not carelessly.
 *
 * Three consequences worth knowing before editing:
 *
 * - Colours are literal hex here rather than the tokens in `globals.css`. A
 *   `var()` resolves to nothing in an email client and the text renders black
 *   on black. This is the one place in the codebase where hex is correct.
 * - The logo is a remote image, and most clients block those until the reader
 *   allows them. So its alt text is styled to be the wordmark: blocked, the
 *   header still reads CENTRAL COAST AUTO PARTS in white on the dark band, in
 *   roughly the right size. Never leave that alt text empty.
 * - Every rendered value is escaped. Customer names and part descriptions
 *   arrive from a form and a supplier feed, and an unescaped apostrophe or
 *   angle bracket would break the layout at best.
 */

const BRAND = "#e9162f";
const INK = "#16181d";
const MUTED = "#5b616e";
const LINE = "#e4e6eb";
const PAGE = "#f5f6f8";
/** The site header's own background, so the email opens the way the site does. */
const BAND = "#0f0f10";

export const COLOURS = { BRAND, INK, MUTED, LINE, PAGE } as const;

/**
 * Absolute URL for an image in an email.
 *
 * Relative paths mean nothing in an inbox, and the origin has to be the public
 * one: an email is read somewhere else entirely, long after the request that
 * built it. Set NEXT_PUBLIC_SITE_ORIGIN in production or this falls back to the
 * canonical domain, which is right everywhere except a local test, where the
 * image simply will not load and the alt text stands in for it.
 */
function asset(path: string): string {
  const origin = process.env.NEXT_PUBLIC_SITE_ORIGIN?.trim() || site.url;
  return new URL(path, origin).toString();
}

/** HTML-escapes a value for interpolation into any of the templates below. */
export function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * A dates as an Australian reader writes it, in Australian time.
 *
 * The server runs in UTC. Without the timezone, an order placed at 9am Sydney
 * time on a Tuesday is confirmed as having been placed on the Monday.
 */
export function auDate(iso: string | null): string {
  if (!iso) return "";
  return new Intl.DateTimeFormat("en-AU", {
    dateStyle: "long",
    timeZone: "Australia/Sydney",
  }).format(new Date(iso));
}

export function emailShell({
  preheader,
  body,
}: {
  /**
   * The grey line an inbox shows after the subject. Left out, clients pull the
   * first words of the markup instead, which is usually "View this email".
   */
  preheader: string;
  body: string;
}): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${esc(site.name)}</title>
</head>
<body style="margin:0;padding:0;background:${PAGE};">
<div style="display:none;font-size:1px;color:${PAGE};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${esc(preheader)}</div>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${PAGE};">
<tr><td align="center" style="padding:24px 12px;">

<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:600px;max-width:100%;">
  <tr>
    <td style="background:${BAND};border-radius:12px 12px 0 0;border-bottom:3px solid ${BRAND};padding:20px 28px 18px 28px;">
      <img src="${asset("/images/email-logo.png")}" width="210" height="78" alt="Central Coast Auto Parts" style="display:block;border:0;outline:none;text-decoration:none;width:210px;height:auto;max-width:100%;font-family:Helvetica,Arial,sans-serif;font-size:17px;font-weight:bold;color:#ffffff;letter-spacing:.4px;">
      <div style="font-family:Helvetica,Arial,sans-serif;font-size:12px;line-height:18px;color:#9aa0ac;padding-top:8px;">Quality used parts &middot; Berkeley Vale NSW &middot; Licence ${esc(site.contact.licence)}</div>
    </td>
  </tr>
  <tr>
    <td style="background:#ffffff;padding:30px 28px 8px 28px;font-family:Helvetica,Arial,sans-serif;color:${INK};">
${body}
    </td>
  </tr>
  <tr>
    <td style="background:#ffffff;border-radius:0 0 12px 12px;border-top:1px solid ${LINE};padding:22px 28px 26px 28px;font-family:Helvetica,Arial,sans-serif;font-size:13px;line-height:20px;color:${MUTED};">
      <div style="color:${INK};font-weight:bold;padding-bottom:4px;">${esc(site.name)}</div>
      ${esc(site.address.displayLine)}<br>
      <a href="tel:${esc(site.contact.phoneE164)}" style="color:${BRAND};text-decoration:none;">${esc(site.contact.phone)}</a>
      &nbsp;&middot;&nbsp;
      <a href="mailto:${esc(site.contact.email)}" style="color:${BRAND};text-decoration:none;">${esc(site.contact.email)}</a><br>
      <span style="font-size:12px;">${esc(site.hours.displayLine)}</span>
    </td>
  </tr>
  <tr>
    <td style="padding:16px 28px 0 28px;font-family:Helvetica,Arial,sans-serif;font-size:11px;line-height:17px;color:#8b909c;text-align:center;">
      You are receiving this because you placed an order with ${esc(site.name)}.<br>
      This address is not monitored &mdash; reply to <a href="mailto:${esc(site.contact.email)}" style="color:#8b909c;">${esc(site.contact.email)}</a> or call ${esc(site.contact.phone)}.
    </td>
  </tr>
</table>

</td></tr>
</table>
</body>
</html>`;
}

/** A heading and an opening paragraph, the way every one of these starts. */
export function opening(heading: string, lead: string): string {
  return `      <h1 style="margin:0 0 10px 0;font-size:22px;line-height:29px;font-weight:bold;color:${INK};">${heading}</h1>
      <p style="margin:0 0 20px 0;font-size:15px;line-height:23px;color:${MUTED};">${lead}</p>`;
}
