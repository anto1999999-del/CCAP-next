import Link from "next/link";
import { site } from "@/lib/site";

/**
 * A part that is no longer in the catalogue.
 *
 * Usually it sold: stock moves daily and the catalogue is synced, not live. The
 * old site answered this with one line of red text and no way onward, which
 * read as a broken website rather than a sold part. Every route out of here is
 * a route to another part.
 */
export default function PartNotFound() {
  return (
    <div className="bg-admin flex min-h-screen items-center justify-center px-4 py-16 text-white">
      <div className="max-w-md text-center">
        <h1 className="mb-3 text-2xl font-bold sm:text-3xl">
          That part is no longer listed
        </h1>
        <p className="mb-8 text-sm text-gray-400">
          It has most likely sold since you last saw it. We hold thousands more,
          and new stock arrives daily, so there is a good chance we have another
          one on the shelf.
        </p>

        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href="/products"
            className="bg-brand hover:bg-brand-hover rounded px-6 py-3 font-semibold text-white transition-colors"
          >
            Browse all parts
          </Link>
          <a
            href={`tel:${site.contact.phoneE164}`}
            className="border-line rounded-xl border px-6 py-3 font-semibold transition-colors hover:bg-white/5"
          >
            Call {site.contact.phone}
          </a>
          <Link
            href="/contact"
            className="border-line rounded-xl border px-6 py-3 font-semibold transition-colors hover:bg-white/5"
          >
            Ask us to source it
          </Link>
        </div>
      </div>
    </div>
  );
}
