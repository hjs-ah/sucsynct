"use client";

import { useCountUp } from "@/lib/use-count-up";

/** A score that flickers through random values and eases onto `value`. */
export function AnimatedNumber({
  value,
  suffix = "",
  className = "",
}: {
  value: number;
  suffix?: string;
  className?: string;
}) {
  const shown = useCountUp(value);
  return (
    <span className={`tabular-nums ${className}`}>
      {shown}
      {suffix}
    </span>
  );
}
