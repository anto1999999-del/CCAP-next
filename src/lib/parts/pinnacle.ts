import "server-only";
import type { CatalogPart } from "./types";

/**
 * The supplier's parts API (Pinnacle / Hollander OPS).
 *
 * Two things about this client are deliberate.
 *
 * The credentials come from the environment. In the old backend they were
 * written into the source file and committed, which means they are in the git
 * history of that repository and have to be treated as compromised until they
 * are rotated.
 *
 * Every call has a timeout. The old client had none, so when the supplier was
 * slow the product page hung until the browser gave up, with a spinner on
 * screen the whole time. A request that has not answered in fifteen seconds is
 * not going to; failing then leaves the page free to show cached data instead.
 */

const BASE_URL = process.env.PARTS_API_URL ?? "http://api.carparts-au.com";
const TIMEOUT_MS = 15_000;

export type PartsResponse = {
  page: number;
  pageCount: number;
  totalNumResults: number;
  results: CatalogPart[];
};

function credentials(): string {
  const user = process.env.PARTS_API_USER;
  const password = process.env.PARTS_API_PASSWORD;

  if (!user || !password) {
    throw new Error(
      "PARTS_API_USER and PARTS_API_PASSWORD must be set to reach the parts API.",
    );
  }

  return Buffer.from(`${user}:${password}`).toString("base64");
}

/**
 * Ask the supplier for one page.
 *
 * Filter parameters are accepted by the endpoint but are not passed here: it
 * does not honour them, returning a handful of rows for a year rather than the
 * matches. Filtering happens against the synced catalogue instead.
 */
export async function fetchPartsPage({
  page = 1,
  rows = 100,
  imageType = "PV",
  signal,
}: {
  page?: number;
  rows?: number;
  imageType?: string;
  signal?: AbortSignal;
} = {}): Promise<PartsResponse> {
  const url = new URL("/ops/v1/parts", BASE_URL);
  url.searchParams.set("page", String(page));
  url.searchParams.set("rows", String(rows));
  url.searchParams.set("imageType", imageType);

  const timeout = AbortSignal.timeout(TIMEOUT_MS);
  const response = await fetch(url, {
    headers: {
      accept: "application/json",
      authorization: `Basic ${credentials()}`,
    },
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    // The catalogue is synced deliberately, never cached incidentally.
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Parts API returned ${response.status} for page ${page}`);
  }

  const data = (await response.json()) as Partial<PartsResponse>;
  const results = Array.isArray(data.results) ? data.results : [];

  return {
    page: Number(data.page ?? page),
    pageCount: Number(data.pageCount ?? 1),
    totalNumResults: Number(data.totalNumResults ?? results.length),
    results,
  };
}
