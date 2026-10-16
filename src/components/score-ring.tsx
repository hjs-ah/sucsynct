"use client";

import { useEffect, useState, type ReactNode } from "react";

/**
 * A score as a ring: a thin grey circle is the full 100, and the score is a
 * thicker blue stroke laid over it that grows clockwise from 12 o'clock.
 */
export function ScoreRing({
  value,
  size = 144,
  track = 3,
  stroke = 6,
  durationMs = 1100,
  children,
}: {
  value: number;
  size?: number;
  track?: number; // grey full-circle stroke, px
  stroke?: number; // score stroke, px (thicker than the track)
  durationMs?: number;
  children?: ReactNode;
}) {
  const [filled, setFilled] = useState(0);
  const [animate, setAnimate] = useState(true);

  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    setAnimate(!reduce);
    const id = requestAnimationFrame(() => setFilled(Math.max(0, Math.min(100, value))));
    return () => cancelAnimationFrame(id);
  }, [value]);

  const centre = size / 2;
  const radius = (size - Math.max(stroke, track)) / 2;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        aria-hidden
      >
        <circle
          cx={centre}
          cy={centre}
          r={radius}
          fill="none"
          stroke="var(--track)"
          strokeWidth={track}
        />
        <circle
          cx={centre}
          cy={centre}
          r={radius}
          fill="none"
          stroke="var(--brand-blue)"
          strokeWidth={stroke}
          strokeLinecap="round"
          pathLength={100}
          strokeDasharray="100"
          strokeDashoffset={100 - filled}
          style={{
            opacity: filled > 0 ? 1 : 0,
            transition: animate
              ? `stroke-dashoffset ${durationMs}ms cubic-bezier(0.22, 1, 0.36, 1)`
              : "none",
          }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
}
