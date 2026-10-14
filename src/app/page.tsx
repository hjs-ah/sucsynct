"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FlameIcon } from "@/components/icons";
import { NavBar } from "@/components/nav-bar";
import { TourOverlay, type TourStep } from "@/components/tour";
import { getBenchmarkEntry, getEntries, getPreferences } from "@/lib/storage";
import type { Entry } from "@/lib/types";

const HOME_TOUR: TourStep[] = [
  {
    targetId: "tour-new-entry-btn",
    title: "Start here",
    body: "Tap this any time you want feedback on something you're working on — speak it or write it.",
  },
  {
    targetId: "tour-nav-menu-btn",
    title: "Everything else",
    body: "History, Settings, Quick notes, and the theme switcher all live behind this menu.",
  },
];

type SortBy = "date" | "story";

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${Math.max(mins, 1)}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function dayKeyFromDate(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function dayKey(iso: string) {
  return dayKeyFromDate(new Date(iso));
}

/**
 * Consecutive calendar days (local time) with at least one entry, counting
 * back from today. A gap of exactly one day (nothing submitted yet today,
 * but yesterday had one) doesn't break the streak — it just hasn't been
 * extended yet — so the streak only resets once a full day is skipped.
 * Walks local calendar days directly (never round-trips through
 * toISOString, which is UTC and would misfire near midnight).
 */
function currentStreak(entries: Entry[]): number {
  if (entries.length === 0) return 0;
  const days = new Set(entries.map((e) => dayKey(e.createdAt)));
  const cursor = new Date();
  // If nothing happened today, start counting from yesterday instead —
  // otherwise a quiet morning would show "0-day streak" before they've
  // even had a chance to practice today.
  if (!days.has(dayKeyFromDate(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }
  let streak = 0;
  while (days.has(dayKeyFromDate(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function monthlyAverage(entries: Entry[]) {
  const now = new Date();
  const thisMonth = entries.filter((e) => {
    const d = new Date(e.createdAt);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  if (thisMonth.length === 0) return null;
  const avg = thisMonth.reduce((sum, e) => sum + e.scores.overall, 0) / thisMonth.length;
  return { average: Math.round(avg), entries: thisMonth };
}

export default function HomePage() {
  const router = useRouter();
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [sortBy, setSortBy] = useState<SortBy>("date");
  const [benchmark, setBenchmark] = useState<Entry | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const prefs = await getPreferences();
      if (cancelled) return;
      if (!prefs.onboarded) {
        router.replace("/onboarding");
        return;
      }
      const [entriesData, benchmarkData] = await Promise.all([getEntries(), getBenchmarkEntry()]);
      if (cancelled) return;
      setEntries(entriesData);
      setBenchmark(benchmarkData);
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const sorted = useMemo(() => {
    if (!entries) return [];
    if (sortBy === "date") return entries; // already newest-first from storage
    return [...entries].sort((a, b) => a.text.localeCompare(b.text));
  }, [entries, sortBy]);

  const monthly = entries ? monthlyAverage(entries) : null;
  const streak = entries ? currentStreak(entries) : 0;

  if (entries === null) {
    return null;
  }

  return (
    <div className="min-h-screen">
      <NavBar />
      <main className="mx-auto max-w-3xl px-6 py-10">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-stone-900 dark:text-stone-50">
              Your stories
            </h1>
            <p className="text-sm text-stone-500 dark:text-stone-400">
              {entries.length === 0
                ? "Nothing here yet."
                : `${entries.length} ${entries.length === 1 ? "entry" : "entries"} so far.`}
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Link
              href="/notes"
              className="rounded-none border border-stone-300 px-4 py-2.5 text-sm font-semibold text-stone-600 transition-colors hover:border-stone-400 dark:border-stone-700 dark:text-stone-300"
            >
              Quick notes
            </Link>
            <Link
              id="tour-new-entry-btn"
              href="/new"
              className="rounded-none bg-brand-yellow px-4 py-2.5 text-sm font-semibold text-stone-900 transition-colors hover:bg-brand-yellow-dark"
            >
              + New entry
            </Link>
          </div>
        </div>

        {streak > 0 && (
          <div className="mb-6 flex items-center gap-2 rounded-xl border border-brand-orange/30 bg-brand-orange/5 px-4 py-2.5">
            <FlameIcon className="h-5 w-5 shrink-0 text-brand-orange" />
            <p className="text-sm font-semibold text-stone-800 dark:text-stone-200">
              {streak}-day streak
              <span className="ml-1.5 font-normal text-stone-500 dark:text-stone-400">
                — {streak === 1 ? "keep it going tomorrow" : "don't break the chain"}
              </span>
            </p>
          </div>
        )}

        {entries.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-stone-300 p-10 text-center dark:border-stone-700">
            <p className="text-sm text-stone-500 dark:text-stone-400">
              Record or write your first story to get your first scorecard.
            </p>
            <Link
              href="/new"
              className="mt-4 inline-block rounded-none bg-brand-yellow px-4 py-2 text-sm font-semibold text-stone-900 hover:bg-brand-yellow-dark"
            >
              Start now
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wide text-stone-500 dark:text-stone-400">
                Recent stories
              </h2>
              <div className="flex overflow-hidden rounded-none border border-stone-300 dark:border-stone-700">
                <button
                  onClick={() => setSortBy("date")}
                  className={`px-3 py-1 text-xs font-semibold ${
                    sortBy === "date"
                      ? "bg-brand-yellow text-stone-900"
                      : "bg-white text-stone-600 dark:bg-stone-900 dark:text-stone-300"
                  }`}
                >
                  Date
                </button>
                <button
                  onClick={() => setSortBy("story")}
                  className={`border-l border-stone-300 px-3 py-1 text-xs font-semibold dark:border-stone-700 ${
                    sortBy === "story"
                      ? "bg-brand-yellow text-stone-900"
                      : "bg-white text-stone-600 dark:bg-stone-900 dark:text-stone-300"
                  }`}
                >
                  Story
                </button>
              </div>
            </div>

            <ul className="mb-8 flex flex-col gap-3">
              {sorted.map((entry) => (
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
                        {entry.mode} &middot; {entry.goal || "no goal set"} &middot;{" "}
                        {timeAgo(entry.createdAt)}
                      </p>
                    </div>
                    <div className="text-lg font-bold text-brand-orange">
                      {entry.scores.overall}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>

            {monthly && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-bold uppercase tracking-wide text-stone-500 dark:text-stone-400">
                    This month&rsquo;s Tells
                  </h2>
                  {benchmark && (
                    <span className="text-xs text-stone-400 dark:text-stone-500">
                      vs. benchmark: {benchmark.scores.overall}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <div
                    className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full"
                    style={{
                      background: `conic-gradient(var(--brand-orange) ${monthly.average * 3.6}deg, #e7e5e4 0deg)`,
                    }}
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-sm font-extrabold text-stone-900 dark:bg-stone-950 dark:text-stone-50">
                      {monthly.average}
                    </div>
                  </div>
                  <div className="flex h-14 flex-1 items-end gap-1.5">
                    {monthly.entries
                      .slice(0, 10)
                      .reverse()
                      .map((e) => (
                        <div
                          key={e.id}
                          className="w-3 rounded-sm bg-brand-orange/40 dark:bg-brand-orange/70"
                          style={{ height: `${Math.max(10, e.scores.overall)}%` }}
                        />
                      ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>
      <TourOverlay tourId="home" steps={HOME_TOUR} />
    </div>
  );
}
