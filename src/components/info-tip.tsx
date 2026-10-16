"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The little (i) in a circle. Hover shows the explanation on desktop, a tap
 * pins it open on touch screens (tap again, tap elsewhere, or Esc to close).
 * The explanation is positioned against the nearest `relative` ancestor and
 * spans its width, so it never runs off a narrow screen.
 */
export function InfoTip({ label, text }: { label: string; text: string }) {
  const [hover, setHover] = useState(false);
  const [pinned, setPinned] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const open = hover || pinned;

  useEffect(() => {
    if (!pinned) return;
    function onDown(e: MouseEvent | TouchEvent) {
      if (!ref.current?.contains(e.target as Node)) setPinned(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setPinned(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [pinned]);

  return (
    <span
      ref={ref}
      className="inline-flex"
      onPointerEnter={(e) => e.pointerType === "mouse" && setHover(true)}
      onPointerLeave={(e) => e.pointerType === "mouse" && setHover(false)}
    >
      <button
        type="button"
        aria-label={`About ${label}`}
        aria-expanded={open}
        onClick={() => setPinned((p) => !p)}
        className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-stone-400 text-[10px] font-bold leading-none text-stone-500 transition-colors hover:border-brand-blue hover:text-brand-blue dark:border-stone-500 dark:text-stone-400"
      >
        i
      </button>
      {open && (
        <span
          role="tooltip"
          className="animate-fade-in absolute inset-x-0 top-full z-20 mt-1.5 rounded-lg border border-stone-200 bg-white p-3 text-xs font-normal leading-relaxed text-stone-600 shadow-lg dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300"
        >
          <span className="mb-0.5 block font-semibold text-ink dark:text-stone-100">{label}</span>
          {text}
        </span>
      )}
    </span>
  );
}
