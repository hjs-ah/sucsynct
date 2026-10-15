"use client";

import { useEffect, useState } from "react";
import { useCountUp } from "@/lib/use-count-up";

function defaultColor(score: number) {
  if (score >= 70) return "bg-brand-blue";
  if (score >= 45) return "bg-brand-grey";
  return "bg-red-500";
}

export function AnimatedBar({
  label,
  value,
  suffix = "",
  colorFor = defaultColor,
}: {
  label: string;
  value: number;
  suffix?: string;
  colorFor?: (value: number) => string;
}) {
  // Starts at 0 and animates to `value` on mount so the bar visibly fills
  // rather than rendering pre-filled.
  const [width, setWidth] = useState(0);
  const count = useCountUp(value);

  useEffect(() => {
    const id = requestAnimationFrame(() => setWidth(value));
    return () => cancelAnimationFrame(id);
  }, [value]);

  return (
    <div className="flex items-center gap-3">
      <div className="w-32 shrink-0 text-xs text-stone-500 dark:text-stone-400">{label}</div>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-stone-200 dark:bg-stone-800">
        <div
          className={`h-full rounded-full transition-[width] duration-700 ease-out ${colorFor(value)}`}
          style={{ width: `${width}%` }}
        />
      </div>
      <div className="w-10 shrink-0 text-right text-xs font-medium text-ink dark:text-stone-100">
        {count}
        {suffix}
      </div>
    </div>
  );
}
