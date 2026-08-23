import Link from "next/link";
import AddToCartButton from "./AddToCartButton";
import PartThumbnail from "./PartThumbnail";
import { hasPrice } from "@/lib/parts/arrange";
import { partPath } from "@/lib/parts/identity";
import { thumbnailUrl } from "@/lib/parts/images";
import { formatPrice } from "@/lib/parts/price";
import type { CatalogPart } from "@/lib/parts/types";

/**
 * One part in the grid.
 *
 * A part with no price is not hidden. The yard holds plenty of stock the
 * supplier has not priced, and a customer who can see it exists will ring up
 * about it, which is exactly what "contact for price" is for.
 */
export default function PartCard({ part }: { part: CatalogPart }) {
  const href = partPath(part);
  const sellable = hasPrice(part);
  const name = part.itemName ?? "Used part";

  return (
    <article className="group bg-tile hover:border-brand/40 flex flex-col overflow-hidden rounded-2xl border border-white/10 shadow-lg transition-colors">
      <Link href={href} className="block" tabIndex={-1} aria-hidden="true">
        <PartThumbnail
          src={thumbnailUrl(part)}
          alt={name}
          className="aspect-[4/3] w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="mb-2 line-clamp-2 min-h-[2.5rem] text-base font-bold text-white">
          <Link href={href} className="hover:text-brand-text transition-colors">
            {name}
          </Link>
        </h3>

        <dl className="mb-3 space-y-1 text-sm text-gray-400">
          <Detail label="Manufacturer" value={part.manufacturer} />
          <Detail label="Item Type" value={part.itemTypeCode} />
          <Detail label="Model" value={part.model} />
          <Detail label="Year" value={part.year == null ? null : String(part.year)} />
        </dl>

        {sellable ? (
          <p className="text-brand-text mt-auto text-lg font-bold">
            {formatPrice(part.price)}
          </p>
        ) : (
          <p className="mt-auto text-base font-semibold text-gray-200">
            Contact for price
          </p>
        )}
      </div>

      <div className="p-4 pt-0">
        {sellable ? (
          <AddToCartButton
            className="bg-brand hover:bg-brand-hover w-full rounded-xl py-3 font-semibold text-white transition-colors"
            line={{
              urgId: String(part.urgId),
              invNumber: String(part.invNumber),
              itemName: name,
              manufacturer: part.manufacturer ?? undefined,
              model: part.model ?? undefined,
              year: part.year == null ? undefined : String(part.year),
              price: Number(part.price),
              thumbnail: thumbnailUrl(part),
            }}
          />
        ) : (
          <Link
            href={href}
            className="border-brand hover:bg-brand block rounded-xl border py-3 text-center font-semibold text-white transition-colors"
          >
            Enquire
          </Link>
        )}
      </div>
    </article>
  );
}

function Detail({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="truncate">
      <dt className="inline text-gray-500">{label}:</dt>{" "}
      <dd className="inline">{value || "N/A"}</dd>
    </div>
  );
}
