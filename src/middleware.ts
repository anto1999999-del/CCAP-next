import { NextResponse, type NextRequest } from "next/server";

/**
 * Repairs the Origin header before anything downstream reads it.
 *
 * The production server is OpenLiteSpeed, and when it proxies to this app it
 * forwards the client's Origin header twice. Node joins repeated headers with
 * a comma, so the app was handed:
 *
 *   https://centralcoastautoparts.com.au, https://centralcoastautoparts.com.au
 *
 * Next compares Origin against Host to protect Server Actions from CSRF, and
 * that comparison starts with `new URL(origin)`. On the doubled value it threw
 * `ERR_INVALID_URL`, which surfaced as a 500 on every form on the site --
 * login, contact, sell your car and the checkout quote -- while ordinary page
 * loads were completely fine, because they never read the header.
 *
 * Taking the first value restores exactly what the browser sent, so the check
 * still runs and still means something. Dropping the header instead would have
 * silenced the error by disabling the protection, which is not a fix.
 *
 * Harmless anywhere else: a request whose Origin has no comma is untouched.
 */
export function middleware(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin?.includes(",")) return NextResponse.next();

  const headers = new Headers(request.headers);
  headers.set("origin", origin.split(",")[0].trim());

  return NextResponse.next({ request: { headers } });
}

export const config = {
  /*
    Everything except the static assets, which are served without ever looking
    at an Origin and are the bulk of the requests.
  */
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
