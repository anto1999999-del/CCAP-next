import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/accounts";
import { storeImage } from "@/lib/media/store";

/**
 * Take an uploaded image.
 *
 * A route handler rather than a server action because the editor uploads from
 * JavaScript, while somebody is part-way through writing, and wants the
 * resulting URL back to put in the body. A server action would work; this is
 * the plainer fit.
 *
 * Admins only, checked here. An open upload endpoint is free hosting for
 * whatever anybody wants to put on your domain.
 */
export async function POST(request: NextRequest) {
  if (!(await requireAdmin())) {
    return Response.json({ ok: false, message: "Not signed in as an admin." }, { status: 403 });
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");

  if (!(file instanceof File)) {
    return Response.json({ ok: false, message: "No file was sent." }, { status: 400 });
  }

  const result = await storeImage(file);

  return Response.json(result, { status: result.ok ? 200 : 400 });
}
