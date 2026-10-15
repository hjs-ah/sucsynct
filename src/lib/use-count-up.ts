"use client";

import { useEffect, useState } from "react";

/**
 * Slot-machine style score reveal: the number first flickers through random
 * values, then the randomness shrinks as it eases out onto the real score.
 * Always lands exactly on `target`. Skips the effect for people who prefer
 * reduced motion.
 */
export function useCountUp(target: number, durationMs = 1100) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    ) {
      setValue(target);
      return;
    }

    let raf: number;
    let lastShown = 0;
    const start = performance.now();

    function tick(now: number) {
      const progress = Math.min(1, (now - start) / durationMs);
      if (progress >= 1) {
        setValue(target);
        return;
      }
      // Ease-out cubic: the spread of possible values collapses toward the
      // target, and the display only refreshes every ~60ms so it reads as a
      // flicker rather than a blur.
      const eased = 1 - Math.pow(1 - progress, 3);
      const spread = (1 - eased) * 100;
      if (now - lastShown > 60) {
        lastShown = now;
        const noisy = target + (Math.random() * 2 - 1) * spread;
        setValue(Math.max(0, Math.min(100, Math.round(noisy))));
      }
      raf = requestAnimationFrame(tick);
    }

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);

  return value;
}
