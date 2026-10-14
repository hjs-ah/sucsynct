"use client";

import { STRICTNESS_LABELS, type AnalyzerStrictness } from "@/lib/types";

const OPTIONS: AnalyzerStrictness[] = ["supportive", "moderate", "strict"];

/**
 * A full-width, animated segmented control for picking analyzer strictness
 * — a single sliding highlight (translateX, no re-render of the track)
 * behind three always-visible, all-caps options. Used both as the
 * prominent control at the top of /new and inside Settings, so changing it
 * anywhere updates the same preference.
 */
export function AnalyzerSelector({
  value,
  onChange,
  className = "",
}: {
  value: AnalyzerStrictness;
  onChange: (value: AnalyzerStrictness) => void;
  className?: string;
}) {
  const index = OPTIONS.indexOf(value);

  return (
    <div
      className={`relative grid grid-cols-3 overflow-hidden rounded-none border border-stone-300 dark:border-stone-700 ${className}`}
    >
      <div
        className="absolute inset-y-0 left-0 w-1/3 bg-brand-yellow transition-transform duration-300 ease-out"
        style={{ transform: `translateX(${index * 100}%)` }}
        aria-hidden
      />
      {OPTIONS.map((opt) => {
        const active = opt === value;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={`relative z-10 px-2 py-3 text-xs font-bold uppercase tracking-wide transition-colors ${
              active
                ? "text-stone-900"
                : "text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200"
            }`}
          >
            {STRICTNESS_LABELS[opt]}
          </button>
        );
      })}
    </div>
  );
}
