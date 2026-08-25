import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import AccountShell from "@/components/account/AccountShell";
import VehicleEditor from "@/components/admin/VehicleEditor";
import { adminOnly } from "@/lib/auth/guard";
import { vehicleById } from "@/lib/content/store";

export const metadata: Metadata = {
  title: "Edit Vehicle | Central Coast Auto Parts",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function EditVehiclePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const admin = await adminOnly("/manage-gallery");
  const { id } = await params;

  const vehicle = id === "new" ? null : await vehicleById(id);
  if (id !== "new" && !vehicle) notFound();

  return (
    <AccountShell
      account={admin}
      active="/manage-gallery"
      title={vehicle ? "Edit vehicle" : "New vehicle"}
      action={
        <Link
          href="/manage-gallery"
          className="border-line rounded-xl border px-4 py-2.5 text-sm font-semibold text-gray-300 transition-colors hover:border-white/30 hover:text-white"
        >
          Back to all vehicles
        </Link>
      }
    >
      <VehicleEditor vehicle={vehicle} />
    </AccountShell>
  );
}
