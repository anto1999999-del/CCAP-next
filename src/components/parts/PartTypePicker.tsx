"use client";

import { useId, useMemo, useRef, useState } from "react";
import {
  matchPartTypes,
  partTypeLabel,
  type PartTypeOption,
} from "@/lib/parts/part-type-names";

/**
 * The part type filter: a search box over the part types, not a select.
 *
 * There are 250 part types, and a native select can only jump to an entry by
 * its first letters, so a customer after a door mirror had to know to type
 * "left". Here any word of the name finds it, as do the words people actually
 * use ("headlight", "passenger door"); see lib/parts/part-type-names.
 *
 * It submits exactly what the select did -- the supplier's code in
 * `part_type` -- through a hidden input, so filtered URLs are unchanged. A
 * plain select stays inside <noscript>, because the rest of this form works
 * without JavaScript and this control should too.
 */
export default function PartTypePicker({
  value,
  codes,
  onPick,
}: {
  /** The code currently filtered on, or "". */
  value: string;
  /** The codes available for the current year, make and model. */
  codes: string[];
  /** Called after the hidden input holds the new code, to submit the form. */
  onPick: () => void;
}) {
  const id = useId();
  const listId = `${id}-list`;
  const hidden = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLUListElement>(null);

  const selectedLabel = value ? partTypeLabel(value) : "";
  const [text, setText] = useState(selectedLabel);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  // While open, what was typed filters; the selected name shown at rest is
  // not a search, so opening on it lists everything.
  const query = text === selectedLabel ? "" : text;
  const matches = useMemo(() => matchPartTypes(codes, query), [codes, query]);

  const disabled = codes.length === 0;

  function pick(option: PartTypeOption | null) {
    if (hidden.current) hidden.current.value = option?.code ?? "";
    setText(option?.label ?? "");
    setOpen(false);
    onPick();
  }

  function close() {
    setOpen(false);
    setText(selectedLabel);
  }

  function move(step: number) {
    if (!open) setOpen(true);
    const next = Math.max(0, Math.min(matches.length - 1, active + step));
    setActive(next);
    list.current
      ?.querySelectorAll('[role="option"]')
      [next]?.scrollIntoView({ block: "nearest" });
  }

  return (
    <div
      className="relative"
      // Closes on focus leaving the whole control, not on the input's own blur,
      // which would fire before a click on an option could land.
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) close();
      }}
    >
      <label
        htmlFor={id}
        className="mb-2 block text-xs font-semibold tracking-wider text-gray-400 uppercase"
      >
        Part Type
      </label>

      <input ref={hidden} type="hidden" name="part_type" defaultValue={value} />

      <div className="relative">
        <SearchIcon />
        <input
          id={id}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={
            open && matches[active]
              ? `${id}-${matches[active].code}`
              : undefined
          }
          autoComplete="off"
          spellCheck={false}
          disabled={disabled}
          placeholder={
            disabled
              ? "No part types for this selection"
              : "Search, e.g. door mirror"
          }
          value={text}
          onFocus={(event) => {
            event.currentTarget.select();
            setActive(0);
            setOpen(true);
          }}
          onClick={() => setOpen(true)}
          onChange={(event) => {
            setText(event.target.value);
            setActive(0);
            setOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              move(1);
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              move(-1);
            } else if (event.key === "Enter") {
              // Enter picks the highlighted type rather than submitting the
              // form with half a word in a box that is not a field.
              event.preventDefault();
              if (open && matches[active]) pick(matches[active]);
            } else if (event.key === "Escape") {
              close();
            }
          }}
          className="focus:border-brand focus:ring-brand border-line bg-tile w-full rounded-xl border py-3 pr-10 pl-10 text-sm text-white transition-colors placeholder:text-gray-500 focus:ring-1 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        />

        {value && !disabled && (
          <button
            type="button"
            aria-label="Clear part type"
            onClick={() => pick(null)}
            className="absolute top-1/2 right-3 -translate-y-1/2 rounded-full p-1 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
          >
            <svg
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-4 w-4"
              aria-hidden="true"
            >
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        )}
      </div>

      {open && !disabled && (
        <ul
          ref={list}
          id={listId}
          role="listbox"
          aria-label="Part types"
          className="border-line bg-card absolute z-30 mt-2 max-h-72 w-full overflow-y-auto rounded-xl border py-1 shadow-2xl shadow-black/50"
        >
          {matches.length === 0 ? (
            <li className="px-4 py-3 text-sm text-gray-400">
              No part types match &ldquo;{text.trim()}&rdquo;
            </li>
          ) : (
            matches.map((option, index) => (
              <li
                key={option.code}
                id={`${id}-${option.code}`}
                role="option"
                aria-selected={option.code === value}
                // Keeps focus in the input, so the blur handler does not close
                // the list before the click registers.
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActive(index)}
                onClick={() => pick(option)}
                className={`flex cursor-pointer items-center justify-between gap-3 px-4 py-2.5 text-sm ${
                  index === active
                    ? "bg-white/[0.07] text-white"
                    : "text-gray-300"
                }`}
              >
                <Highlight label={option.label} query={query} />
                {option.code === value && (
                  <svg
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="text-brand-text h-4 w-4 flex-shrink-0"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </li>
            ))
          )}
        </ul>
      )}

      <noscript>
        <select
          name="part_type"
          defaultValue={value}
          className="border-line bg-tile mt-2 w-full rounded-xl border px-4 py-3 text-sm text-white"
        >
          <option value="">Select Part Type</option>
          {matchPartTypes(codes, "").map((option) => (
            <option key={option.code} value={option.code}>
              {option.label}
            </option>
          ))}
        </select>
      </noscript>
    </div>
  );
}

/** Bolds the start of each word that a typed word matched. */
function Highlight({ label, query }: { label: string; query: string }) {
  const typed = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (typed.length === 0) return <span>{label}</span>;

  return (
    <span>
      {label.split(/(\s+)/).map((part, index) => {
        const hit = typed
          .filter((t) => part.toLowerCase().startsWith(t))
          .sort((a, b) => b.length - a.length)[0];
        if (!hit) return <span key={index}>{part}</span>;
        return (
          <span key={index}>
            <strong className="font-semibold text-white">
              {part.slice(0, hit.length)}
            </strong>
            {part.slice(hit.length)}
          </span>
        );
      })}
    </span>
  );
}

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
      className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-gray-500"
    >
      <path
        fillRule="evenodd"
        d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z"
        clipRule="evenodd"
      />
    </svg>
  );
}
