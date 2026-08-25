"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Container from "./Container";
import { site } from "@/lib/site";

/**
 * The band above the footer.
 *
 * Not shown on the account and admin pages. Somebody working through the
 * morning's orders does not need to be asked whether they can find the part
 * they need, and a sales pitch under a dashboard makes it look like a shop
 * rather than a tool.
 *
 * A client component only because it needs the current path. It renders no
 * state of its own and adds nothing to the pages that do show it.
 */
const HIDDEN_ON = [
  "/dashboard",
  "/manage-orders",
  "/manage-users",
  "/my-account",
  "/orders",
  "/login",
  "/forgot-password",
  "/reset-password",
];

export default function HelpBand() {
  const pathname = usePathname();
  if (HIDDEN_ON.some((path) => pathname.startsWith(path))) return null;

  return (
    <div
      className="relative bg-cover bg-center py-10 text-white md:py-12"
      style={{ backgroundImage: "url(/images/section.webp)" }}
    >
      <div className="absolute inset-0 bg-black/45" aria-hidden="true" />

      <Container className="relative flex flex-col items-center gap-6 text-center md:flex-row md:justify-between md:text-left">
        <div>
          <h3 className="text-2xl font-extrabold tracking-tight md:text-3xl">
            Can&rsquo;t find the part you need?
          </h3>
          <p className="mt-2 max-w-xl text-sm text-gray-300 md:text-base">
            We hold thousands more than are listed, and we can source what we do
            not have. Tell us the car and the part.
          </p>
        </div>

        <div className="flex flex-shrink-0 flex-col gap-3 sm:flex-row">
          <a
            href={`tel:${site.contact.phoneE164}`}
            className="rounded-full bg-white px-7 py-3 text-sm font-bold tracking-wide text-black uppercase transition-colors hover:bg-gray-100"
          >
            Call {site.contact.phone}
          </a>
          <Link
            href="/contact"
            className="rounded-full border border-white/70 px-7 py-3 text-sm font-bold tracking-wide text-white uppercase transition-colors hover:bg-white/10"
          >
            Send an enquiry
          </Link>
        </div>
      </Container>
    </div>
  );
}
