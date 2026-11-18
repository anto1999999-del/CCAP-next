import { revalidatePath } from "next/cache";
import { isAuthorised } from "@/lib/seo/override-auth";
import {
  deleteOverride,
  findOverride,
  saveOverride,
} from "@/lib/seo/override-store";
import {
  PART_TEMPLATE_PATH,
  isOverridePath,
  parseOverrideInput,
} from "@/lib/seo/overrides";

/**
 * The title agent's way in.
 *
 * It proposes a title from search data, applies it here, measures it, and
 * puts the old one back here if it did worse. Nothing else calls this route
 * and nothing in the browser can: the token is a server-only variable that is
 * never sent to a page.
 */

const NO_STORE = { "cache-control": "no-store" };

function answer(body: Record<string, unknown>, status = 200): Response {
  return Response.json(body, { status, headers: NO_STORE });
}

function refuse(request: Request): Response | null {
  return isAuthorised(
    request.headers.get("authorization"),
    process.env.SEO_AGENT_TOKEN,
  )
    ? null
    : answer({ ok: false, error: "unauthorised" }, 401);
}

/** The `path` query parameter, or null if it is not one this route accepts. */
function pathFrom(request: Request): string | null {
  const path = new URL(request.url).searchParams.get("path");
  return path && isOverridePath(path) ? path : null;
}

/**
 * Rebuild what an override changed.
 *
 * A page's own path for a page. For the template, the part-page route as a
 * whole: there is no list of 15,000 addresses to walk, and the route pattern
 * covers any of them that Next is holding.
 */
function refresh(path: string) {
  if (path === PART_TEMPLATE_PATH) {
    revalidatePath("/product/[urgId]/[invNumber]", "page");
  } else {
    revalidatePath(path);
  }
}

const BAD_PATH = 'path must start with "/" (no trailing slash) or be "template:part"';

export async function GET(request: Request) {
  const refused = refuse(request);
  if (refused) return refused;

  const path = pathFrom(request);
  if (!path) return answer({ ok: false, error: BAD_PATH }, 400);

  try {
    return answer({ ok: true, override: await findOverride(path) });
  } catch {
    return answer({ ok: false, error: "the database did not answer" }, 500);
  }
}

export async function PUT(request: Request) {
  const refused = refuse(request);
  if (refused) return refused;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return answer({ ok: false, error: "the body is not JSON" }, 400);
  }

  const parsed = parseOverrideInput(body);
  if (!parsed.ok) return answer({ ok: false, error: parsed.error }, 400);

  try {
    await saveOverride(parsed.value);
  } catch {
    return answer({ ok: false, error: "the database did not answer" }, 500);
  }

  refresh(parsed.value.path);
  return answer({ ok: true, path: parsed.value.path });
}

export async function DELETE(request: Request) {
  const refused = refuse(request);
  if (refused) return refused;

  const path = pathFrom(request);
  if (!path) return answer({ ok: false, error: BAD_PATH }, 400);

  try {
    await deleteOverride(path);
  } catch {
    return answer({ ok: false, error: "the database did not answer" }, 500);
  }

  refresh(path);
  return answer({ ok: true });
}
