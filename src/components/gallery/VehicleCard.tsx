import Image from "next/image";
import Link from "next/link";
import type { GalleryVehicle } from "@/lib/blog/gallery";

/**
 * One vehicle in a grid.
 *
 * Shared by the gallery index and the "more from the gallery" strip on a vehicle
 * page, so the two cannot drift apart the way the heroes did.
 */
export default function VehicleCard({ vehicle }: { vehicle: GalleryVehicle }) {
  return (
    <Link
      href={`/gallery/${vehicle.slug}`}
      className="group bg-card hover:border-brand/40 flex flex-col overflow-hidden rounded-2xl border-line border transition-colors"
    >
      {vehicle.image ? (
        <div className="relative aspect-[4/3] overflow-hidden">
          <Image
            src={vehicle.image.url}
            alt={vehicle.image.alt || vehicle.title}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </div>
      ) : (
        <div className="bg-tile-well flex aspect-[4/3] items-center justify-center text-sm text-gray-500">
          No photo
        </div>
      )}

      <div className="p-5">
        {(vehicle.year || vehicle.make) && (
          <p className="text-brand-text mb-1 text-[11px] font-semibold tracking-[0.2em] uppercase">
            {[vehicle.year, vehicle.make].filter(Boolean).join(" ")}
          </p>
        )}
        <p className="group-hover:text-brand-text text-sm font-bold text-white transition-colors md:text-base">
          {vehicle.model || vehicle.title}
        </p>
      </div>
    </Link>
  );
}
