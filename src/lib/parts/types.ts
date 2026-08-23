/**
 * The shape of a catalogue part.
 *
 * These field names come from the Pinnacle (Hollander) OPS API and are kept
 * exactly as the supplier sends them. Renaming them here would mean translating
 * in both directions every time the catalogue is synced or a part looked up,
 * and the supplier's names are the ones that appear in their support tickets.
 */
export type PartImage = {
  /** "Part" for a photograph of the part itself, other values for stock shots. */
  type: string | null;
  img: string | null;
  thumb: string | null;
};

export type CatalogPart = {
  /** Yard identifier. Together with invNumber this identifies one part. */
  urgId: string | number | null;
  invNumber: string | number | null;
  stockNo: string | null;
  itemName: string | null;
  /** The make, as the supplier spells it. */
  manufacturer: string | null;
  model: string | null;
  year: string | number | null;
  /**
   * Interchange years: the other model years this part also fits. A part off a
   * 2015 car that fits 2013 to 2018 lists all of them here, which is why a year
   * filter has to check this as well as `year`.
   */
  longIcYear: (string | number)[] | null;
  /** Canonical part type, e.g. ENGINE, GEARBOX. */
  itemTypeCode: string | null;
  icDesc: string | null;
  /** Dollars, as sent by the supplier. Never trusted for charging. */
  price: string | number | null;
  images: PartImage[] | null;
};

export type PartFilters = {
  year: string;
  make: string;
  model: string;
  partType: string;
};

export const EMPTY_FILTERS: PartFilters = {
  year: "",
  make: "",
  model: "",
  partType: "",
};

/** The choices available in the filter controls, given what is already chosen. */
export type FilterOptions = {
  years: string[];
  makes: string[];
  models: string[];
  partTypes: string[];
};

export type PartsPage = {
  parts: CatalogPart[];
  /** 1-based, clamped to the number of pages that actually exist. */
  page: number;
  pageCount: number;
  totalResults: number;
};
