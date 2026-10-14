"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { NavBar } from "@/components/nav-bar";
import { TourOverlay, type TourStep } from "@/components/tour";
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
        <h1 className="mb-6 text-xl font-bold text-stone-900 dark:text-stone-50">History</h1>

        <div id="tour-history-content">
        {entries.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-stone-300 p-10 text-center dark:border-stone-700">
            <p className="text-sm text-stone-500 dark:text-stone-400">
              Your past entries will show up here once you submit a few.
            </p>
            <Link
              href="/new"
              className="mt-4 inline-block rounded-none bg-brand-yellow px-4 py-2 text-sm font-semibold text-stone-900 hover:bg-brand-yellow-dark"
            >
              New entry
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            {groups.map(([date, dayEntries]) => (
              <div key={date}>
                <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-stone-500 dark:text-stone-400">
                  {date}
                </h2>
                <ul className="flex flex-col gap-2.5">
                  {dayEntries.map((entry) => {
                    flatCounter += 1;
                    const delta = deltaFor(0, flatCounter);
                    return (
                      <li key={entry.id}>
                        <Link
                          href={`/entry/${entry.id}`}
                          className="flex items-center gap-4 rounded-xl border border-stone-200 p-4 transition-colors hover:border-stone-300 dark:border-stone-800 dark:hover:border-stone-700"
                        >
                          <div className="flex-1">
                            <p className="line-clamp-1 text-sm font-medium text-stone-900 dark:text-stone-100">
                              {entry.text.slice(0, 80) || "(empty)"}
                            </p>
                            <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                              {entry.mode} &middot; {entry.goal || "no goal set"}
                            </p>
                          </div>
                          {delta !== null && (
                            <span
                              className={`text-xs font-semibold ${
                                delta > 0
                                  ? "text-brand-orange"
                                  : delta < 0
                                    ? "text-red-500"
                                    : "text-stone-400"
                              }`}
                            >
                              {delta > 0 ? "+" : ""}
                              {delta}
                            </span>
                          )}
                          <div className="text-lg font-bold text-brand-orange">
                            {entry.scores.overall}
                          </div>
                        </Link>
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
