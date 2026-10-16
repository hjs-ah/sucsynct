"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A text field with a dropdown of values used before. Type anything new, or
 * open the list (chevron) and pick one; typing narrows the list.
 */
export function SuggestInput({
  value,
  onChange,
  options,
  placeholder,
  ariaLabel,
}: {
  value: string;
  onChange: (next: string) => void;
  options: string[];
  placeholder: string;
  ariaLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent | TouchEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const query = value.trim().toLowerCase();
  const visible = showAll
    ? options
    : options.filter((o) => o.toLowerCase().includes(query) && o.toLowerCase() !== query);

  return (
    <div ref={ref} className="relative">
      <input
        value={value}
        aria-label={ariaLabel}
        onChange={(e) => {
          onChange(e.target.value);
          setShowAll(false);
          setOpen(true);
        }}
        onFocus={() => {
          setShowAll(false);
          setOpen(options.length > 0);
        }}
        placeholder={placeholder}
        className="w-full rounded-lg border border-stone-300 bg-transparent py-2 pl-3 pr-8 text-sm text-ink placeholder:text-stone-400 focus:border-brand-blue focus:outline-none dark:border-stone-700 dark:text-stone-100"
      />
      {options.length > 0 && (
        <button
          type="button"
          aria-label={`Show saved ${ariaLabel.toLowerCase()} options`}
          onClick={() => {
            setShowAll(true);
            setOpen((o) => !o);
          }}
          className="absolute inset-y-0 right-0 flex w-8 items-center justify-center text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
        >
          <svg viewBox="0 0 16 16" className="h-3 w-3 fill-current" aria-hidden>
            <polygon points="2,5 14,5 8,12" />
          </svg>
        </button>
      )}
      {open && visible.length > 0 && (
        <ul
          role="listbox"
          className="absolute inset-x-0 top-full z-20 mt-1 max-h-56 overflow-auto rounded-lg border border-stone-200 bg-white py-1 shadow-lg dark:border-stone-700 dark:bg-stone-900"
        >
          {visible.map((opt) => (
            <li key={opt}>
              <button
                type="button"
                role="option"
                aria-selected={opt === value}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange(opt);
                  setOpen(false);
                }}
                className="block w-full truncate px-3 py-2 text-left text-sm text-stone-700 hover:bg-stone-100 dark:text-stone-200 dark:hover:bg-stone-800"
              >
                {opt}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
