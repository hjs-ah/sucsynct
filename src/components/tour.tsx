"use client";

import { useEffect, useState } from "react";
import { XIcon } from "@/components/icons";
import { hasSeenTour, markTourSeen } from "@/lib/tours";

export interface TourStep {
  /** DOM id of the element this step points at — must already be rendered. */
  targetId: string;
  title: string;
  body: string;
}

const BUBBLE_WIDTH = 288;

/**
 * A first-visit coach-mark tour: dims the screen, spotlights one element at
 * a time via getBoundingClientRect, and walks through `steps` with a small
 * callout. Renders nothing once `tourId` has been marked seen (tracked in
 * localStorage, see lib/tours.ts) — so mount it unconditionally on a page
 * and it self-skips on every visit after the first.
 *
 * A step whose target isn't in the DOM this time (e.g. a conditionally
 * rendered element) is skipped rather than left floating with no anchor.
 */
export function TourOverlay({ tourId, steps }: { tourId: string; steps: TourStep[] }) {
  const [ready, setReady] = useState(false);
  const [done, setDone] = useState(true);
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    setDone(hasSeenTour(tourId));
    setReady(true);
  }, [tourId]);

  useEffect(() => {
    if (!ready || done) return;

    function measure() {
      const step = steps[index];
      if (!step) {
        finish();
        return;
      }
      const el = document.getElementById(step.targetId);
      if (!el) {
        // This step's target didn't render this time — move on rather than
        // stalling the tour on a step with nothing to point at.
        if (index + 1 < steps.length) setIndex(index + 1);
        else finish();
        return;
      }
      setRect(el.getBoundingClientRect());
    }

    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, done, index]);

  useEffect(() => {
    if (done) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") finish();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  function finish() {
    markTourSeen(tourId);
    setDone(true);
  }

  function next() {
    if (index + 1 >= steps.length) finish();
    else setIndex((i) => i + 1);
  }

  if (!ready || done || steps.length === 0 || !rect) return null;

  const step = steps[index];
  const viewportWidth = typeof window !== "undefined" ? window.innerWidth : 0;
  const viewportHeight = typeof window !== "undefined" ? window.innerHeight : 0;

  const placeBelow = rect.bottom + 180 < viewportHeight;
  const bubbleTop = placeBelow ? rect.bottom + 12 : Math.max(12, rect.top - 12);
  const bubbleLeft = Math.min(
    Math.max(12, rect.left),
    viewportWidth - BUBBLE_WIDTH - 12
  );

  return (
    <>
      {/* Full-screen catcher: blocks interaction with the rest of the page
          and advances the tour on an outside click, so it never traps
          someone who taps away from the callout. */}
      <div
        onClick={next}
        className="fixed inset-0 z-40"
        style={{ background: "transparent" }}
        aria-hidden
      />
      {/* The spotlight: a box-shadow sized to the viewport, minus the
          target's own (transparent) rect — the classic CSS cutout trick. */}
      <div
        className="pointer-events-none fixed z-40 rounded-lg transition-all duration-150"
        style={{
          top: rect.top - 4,
          left: rect.left - 4,
          width: rect.width + 8,
          height: rect.height + 8,
          boxShadow: "0 0 0 9999px rgba(12, 10, 9, 0.6)",
        }}
      />
      <div
        role="dialog"
        className="fixed z-50 flex flex-col gap-2 rounded-xl border border-stone-200 bg-white p-4 shadow-xl dark:border-stone-700 dark:bg-stone-900"
        style={{
          top: placeBelow ? bubbleTop : undefined,
          bottom: placeBelow ? undefined : viewportHeight - bubbleTop,
          left: bubbleLeft,
          width: BUBBLE_WIDTH,
        }}
      >
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-bold text-ink dark:text-stone-50">{step.title}</p>
          <button
            type="button"
            onClick={finish}
            aria-label="Skip tour"
            title="Skip tour"
            className="shrink-0 rounded-md p-0.5 text-stone-400 hover:bg-stone-100 hover:text-stone-600 dark:hover:bg-stone-800 dark:hover:text-stone-300"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>
        <p className="text-xs text-stone-500 dark:text-stone-400">{step.body}</p>
        <div className="mt-1 flex items-center justify-between">
          <div className="flex gap-1">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 w-1.5 rounded-full ${
                  i === index ? "bg-brand-blue" : "bg-stone-200 dark:bg-stone-700"
                }`}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={next}
            className="rounded-md bg-brand-yellow px-2.5 py-1.5 text-xs font-semibold text-on-accent hover:bg-brand-yellow-dark"
          >
            {index + 1 >= steps.length ? "Done" : "Next"}
          </button>
        </div>
      </div>
    </>
  );
}
