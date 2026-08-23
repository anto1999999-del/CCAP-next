"use client";

import Link from "next/link";
import { useRef } from "react";
import type { FilterOptions, PartFilters } from "@/lib/parts/types";

/** Widest choice first. Everything after a changed control is cleared. */
const CASCADE = ["year", "make", "model", "part_type"] as const;

/**
 * The year, make, model and part type controls.
 *
 * This is a plain GET form pointed at /products, which means the filters work
 * with JavaScript switched off, every filtered view has a URL that can be
 * shared and indexed, and the back button behaves. The old page did all of this
 * with four chained requests from the browser, so a filtered catalogue was
 * invisible to search engines and to anyone whose scripts had not loaded yet.
 *
 * Changing a select submits the form. That is what makes the lists cascade: the
 * server knows which makes exist in the chosen year, and it answers with them.
 * The button stays because it is what the page has always shown, and because
 * without JavaScript it is the only way to submit.
 */
export default function PartsFilters({
  filters,
  options,
  query,
}: {
  filters: PartFilters;
  options: FilterOptions;
  query: string;
}) {
  const form = useRef<HTMLFormElement>(null);

  /**
   * Narrower choices are cleared when a wider one changes: a model chosen for
   * a Toyota means nothing once the make is Mazda, and submitting it would ask
   * for a combination that cannot exist.
   *
   * `page` is not in this form at all, so changing a filter always lands on
   * page one, which is where the results now start.
   */
  const submit = (changed: (typeof CASCADE)[number]) => {
    const element = form.current;
    if (!element) return;

    for (const name of CASCADE.slice(CASCADE.indexOf(changed) + 1)) {
      const select = element.elements.namedItem(name);
      if (select instanceof HTMLSelectElement) select.value = "";
    }

    element.requestSubmit();
  };

  return (
    <form ref={form} action="/products" method="GET" className="w-full text-white">
      {query && <input type="hidden" name="q" value={query} />}

      <h2 className="mb-6 flex items-center gap-2 text-xl font-bold text-white">
        <span className="bg-brand h-6 w-1 rounded-full" />
        Filters
      </h2>

      <div className="space-y-5">
        <Select
          name="year"
          label="Year"
          placeholder="Select Year"
          value={filters.year}
          options={options.years}
          onChange={() => submit("year")}
        />
        <Select
          name="make"
          label="Make"
          placeholder="Select Make"
          value={filters.make}
          options={options.makes}
          onChange={() => submit("make")}
        />
        <Select
          name="model"
          label="Model"
          placeholder="Select Model"
          value={filters.model}
          options={options.models}
          onChange={() => submit("model")}
        />
        <Select
          name="part_type"
          label="Part Type"
          placeholder="Select Part Type"
          value={filters.partType}
          options={options.partTypes}
          onChange={() => submit("part_type")}
        />
      </div>

      <div className="mt-8 space-y-3">
        <button
          type="submit"
          className="bg-brand hover:bg-brand-hover focus:ring-brand focus:ring-offset-admin w-full rounded-xl py-3 font-semibold text-white transition-colors focus:ring-2 focus:ring-offset-2 focus:outline-none"
        >
          Apply Filters
        </button>
        <Link
          href="/products"
          className="focus:ring-offset-admin block w-full rounded-xl border border-gray-700 bg-[#1a1a1a] py-3 text-center font-semibold text-gray-300 transition-colors hover:border-gray-600 hover:text-white focus:ring-2 focus:ring-gray-600 focus:ring-offset-2 focus:outline-none"
        >
          Reset Filters
        </Link>
      </div>
    </form>
  );
}

function Select({
  name,
  label,
  placeholder,
  value,
  options,
  onChange,
}: {
  name: string;
  label: string;
  placeholder: string;
  value: string;
  options: string[];
  onChange: () => void;
}) {
  // A select with nothing behind it yet is disabled rather than hidden, so the
  // shape of the panel does not jump as choices are made.
  const empty = options.length === 0;

  return (
    <div>
      <label
        htmlFor={`filter-${name}`}
        className="mb-2 block text-xs font-semibold tracking-wider text-gray-400 uppercase"
      >
        {label}
      </label>
      <select
        id={`filter-${name}`}
        name={name}
        defaultValue={value}
        disabled={empty}
        onChange={onChange}
        className="focus:border-brand focus:ring-brand w-full cursor-pointer appearance-none rounded-xl border border-gray-700 bg-[#1a1a1a] px-4 py-3 text-sm text-white transition-colors focus:ring-1 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}
