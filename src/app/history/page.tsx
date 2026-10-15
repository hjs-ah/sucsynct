"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatedNumber } from "@/components/animated-number";
import { ModeLabel } from "@/components/mode-label";
import { NavBar } from "@/components/nav-bar";
import { TourOverlay, type TourStep } from "@/components/tour";
import { storySnippet, timeAgo } from "@/lib/format";
import { getEntries } from "@/lib/storage";
import type { Entry } from "@/lib/types";

const HISTORY_TOUR: TourStep[] = [
  {
    targetId: "tour-history-content",
    title: "Your track record",
    body: "Every entry you submit shows up here, grouped by day, with how much each one improved on the one before it.",
  },
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function groupByDate(entries: Entry[]) {
  const groups = new Map<string, Entry[]>();
  for (const entry of entries) {
    const key = formatDate(entry.createdAt);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(entry);
  }
  return Array.from(groups.entries());
}

export default function HistoryPage() {
  const [entries, setEntries] = useState<Entry[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    getEntries().then((data) => {
      if (!cancelled) setEntries(data);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (entries === null) return null;

  const groups = groupByDate(entries);

  // Score deltas compare each entry to the one immediately before it
  // chronologically (entries are stored newest-first).
  function deltaFor(index: number, flatIndex: number) {
    const prev = entries![flatIndex + 1];
    if (!prev) return null;
    return entries![flatIndex].scores.overall - prev.scores.overall;
  }

  let flatCounter = -1;

  return (
    <div className="min-h-screen">
      <NavBar />
      <main className="mx-auto max-w-2xl px-6 py-10">
        <h1 className="mb-6 text-xl font-bold text-ink dark:text-stone-50">History</h1>

        <div id="tour-history-content">
        {entries.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-stone-300 p-10 text-center dark:border-stone-700">
            <p className="text-sm text-stone-500 dark:text-stone-400">
              Your past entries will show up here once you submit a few.
            </p>
            <Link
              href="/new"
              className="mt-4 inline-block rounded-md bg-brand-yellow px-3.5 py-1.5 text-xs font-semibold text-on-accent hover:bg-brand-yellow-dark"
            >
              New entry
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-8 divide-y divide-stone-200 dark:divide-stone-800 [&>div:not(:first-child)]:pt-8">
            {groups.map(([date, dayEntries]) => (
              <div key={date}>
                <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-stone-500 dark:text-stone-400">
                  {date}
                </h2>
                <ul className="flex flex-col gap-4">
                  {dayEntries.map((entry) => {
                    flatCounter += 1;
                    const delta = deltaFor(0, flatCounter);
                    return (
                      <li key={entry.id}>
                        <Link
                          href={`/entry/${entry.id}`}
                          className="flex items-center gap-4 rounded-xl border border-stone-200 p-4 transition-colors hover:border-stone-300 dark:border-stone-800 dark:hover:border-stone-700"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-ink dark:text-stone-100">
                              {storySnippet(entry)}
                            </p>
                            <p className="mt-1 truncate text-xs text-stone-500 dark:text-stone-400">
                              {entry.goal || "no goal set"}
                            </p>
                          </div>
                          {delta !== null && (
                            <span
                              className={`text-xs font-semibold ${
                                delta > 0
                                  ? "text-brand-blue"
                                  : delta < 0
                                    ? "text-red-500"
                                    : "text-stone-400"
                              }`}
                            >
                              {delta > 0 ? "+" : ""}
                              {delta}
                            </span>
                          )}
                          <AnimatedNumber
                            value={entry.scores.overall}
                            className="text-lg font-bold text-brand-blue"
                          />
                        </Link>
                        <p className="mt-1.5 flex flex-wrap items-center gap-x-2 px-1 text-xs text-stone-400 dark:text-stone-500">
                          <ModeLabel mode={entry.mode} />
                          <span aria-hidden>&middot;</span>
                          <span>{timeAgo(entry.createdAt)}</span>
                        </p>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
        </div>
      </main>
      <TourOverlay tourId="history" steps={HISTORY_TOUR} />
    </div>
  );
}
