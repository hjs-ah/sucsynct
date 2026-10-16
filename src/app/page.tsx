"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatedNumber } from "@/components/animated-number";
import { GoalCard } from "@/components/goal-card";
import { ScoreRing } from "@/components/score-ring";
import { FlameIcon } from "@/components/icons";
import { ModeLabel } from "@/components/mode-label";
import { NavBar } from "@/components/nav-bar";
import { SignOutButton } from "@/components/sign-out-button";
import { TourOverlay, type TourStep } from "@/components/tour";
import { storySnippet, timeAgo } from "@/lib/format";
import {
  getEntries,
  getPreferences,
  peekEntries,
  peekPreferences,
  savePreferences,
} from "@/lib/storage";
import type { Entry, GoalPeriod, Preferences } from "@/lib/types";

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
  // Start from whatever was loaded last (if anything) so coming back to Home
  // from another page paints instantly, then refresh in the background.
  const [entries, setEntries] = useState<Entry[] | null>(() => peekEntries());
  const [prefs, setPrefs] = useState<Preferences | null>(() => peekPreferences());
  const [sortBy, setSortBy] = useState<SortBy>("date");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [prefsData, entriesData] = await Promise.all([getPreferences(), getEntries()]);
      if (cancelled) return;
      if (!prefsData.onboarded) {
        if (entriesData.length === 0) {
          router.replace("/onboarding");
          return;
        }
        // Someone who already has stories has been through this: remember it
        // instead of sending them back through onboarding.
        void savePreferences({ onboarded: true });
      }
      setPrefs(prefsData);
      setEntries(entriesData);
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function handleSaveGoal(period: GoalPeriod, target: number | null) {
    const next = await savePreferences({ goalPeriod: period, goalTarget: target });
    setPrefs(next);
  }

  const benchmark = entries && entries.length > 0 ? entries[entries.length - 1] : undefined;
  // Strictly greater, so a tie goes to the most recent (entries are newest-first).
  const strongest = entries?.reduce<Entry | undefined>(
    (best, e) => (!best || e.scores.overall > best.scores.overall ? e : best),
    undefined,
  );

  const sorted = useMemo(() => {
    if (!entries) return [];
    if (sortBy === "date") return entries; // already newest-first from storage
    return [...entries].sort((a, b) => a.text.localeCompare(b.text));
  }, [entries, sortBy]);

  const monthly = entries ? monthlyAverage(entries) : null;
  const streak = entries ? currentStreak(entries) : 0;

  if (entries === null || prefs === null || (!prefs.onboarded && entries.length === 0)) {
    return (
      <div className="min-h-screen">
        <NavBar />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <NavBar />
      <main className="mx-auto max-w-3xl px-6 py-10">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-x-3 gap-y-3">
          <div className="whitespace-nowrap">
            <h1 className="text-xl font-bold text-ink dark:text-stone-50">Your stories</h1>
            <p className="text-sm text-stone-500 dark:text-stone-400">
              {entries.length === 0
                ? "Nothing here yet."
                : `${entries.length} ${entries.length === 1 ? "entry" : "entries"} so far.`}
            </p>
          </div>
          <div className="flex shrink-0 gap-1.5">
            <Link
              href="/notes"
              className="rounded-md border border-stone-300 dark:border-stone-700 px-3 py-1.5 text-xs font-semibold text-stone-600 dark:text-stone-300"
            >
              Quick notes
            </Link>
            <Link
              href="/new"
              className="rounded-md bg-brand-yellow px-3 py-1.5 text-xs font-semibold text-on-accent transition-colors hover:bg-brand-yellow-dark"
            >
              + New entry
            </Link>
          </div>
        </div>

        {entries.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            <div className="flex min-w-0 flex-col justify-center gap-1 rounded-xl border border-brand-blue/30 bg-brand-blue/5 p-3.5">
              <div className="flex items-center gap-2">
                <FlameIcon className="h-5 w-5 shrink-0 text-brand-blue" />
                <p className="text-sm font-bold text-ink dark:text-stone-100">
                  {streak}-day streak
                </p>
              </div>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                {streak === 0
                  ? "Write or record today to start one."
                  : streak === 1
                    ? "Keep it going tomorrow."
                    : "Don\u2019t break the chain."}
              </p>
            </div>

            <div className="flex min-w-0 flex-col gap-2 rounded-xl border border-stone-200 p-3.5 dark:border-stone-800">
              <h2 className="text-[10px] font-bold uppercase leading-tight tracking-wide text-stone-500 dark:text-stone-400">
                This month&rsquo;s Tells
              </h2>
              {monthly ? (
                <>
                  <div className="flex items-center gap-2.5">
                    <ScoreRing value={monthly.average} size={52} track={2} stroke={5}>
                      <AnimatedNumber
                        value={monthly.average}
                        className="text-xs font-extrabold text-ink dark:text-stone-50"
                      />
                    </ScoreRing>
                    <div className="flex h-12 min-w-0 flex-1 items-end gap-1">
                      {monthly.entries
                        .slice(0, 8)
                        .reverse()
                        .map((e) => (
                          <div
                            key={e.id}
                            className="max-w-2.5 flex-1 rounded-sm bg-brand-blue/40 dark:bg-brand-blue/70"
                            style={{ height: `${Math.max(10, e.scores.overall)}%` }}
                          />
                        ))}
                    </div>
                  </div>
                  {benchmark && (
                    <p className="text-[11px] text-stone-400 dark:text-stone-500">
                      vs. benchmark: {benchmark.scores.overall}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Nothing yet this month.
                </p>
              )}
            </div>
          </div>
        )}

        {entries.length > 0 && strongest && (
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Link
              href={`/entry/${strongest.id}`}
              className="flex min-w-0 flex-col gap-1 rounded-xl border border-stone-200 p-3.5 transition-colors hover:border-brand-blue/50 dark:border-stone-800"
            >
              <span className="text-[10px] font-bold uppercase leading-tight tracking-wide text-stone-500 dark:text-stone-400">
                Strongest sync
              </span>
              <span className="flex items-baseline gap-1.5">
                <AnimatedNumber
                  value={strongest.scores.overall}
                  className="text-2xl font-extrabold text-brand-blue"
                />
                <span className="text-xs font-semibold text-brand-blue">see feedback &rarr;</span>
              </span>
              <span className="truncate text-xs text-stone-500 dark:text-stone-400">
                {storySnippet(strongest)}
              </span>
            </Link>
            <Link
              href="/challenge"
              className="flex min-w-0 flex-col gap-1 rounded-xl border border-stone-200 p-3.5 transition-colors hover:border-brand-blue/50 dark:border-stone-800"
            >
              <span className="text-[10px] font-bold uppercase leading-tight tracking-wide text-stone-500 dark:text-stone-400">
                Half-time challenge
              </span>
              <span className="text-sm font-bold text-ink dark:text-stone-100">
                Say it in half the time
              </span>
              <span className="text-xs font-semibold text-brand-blue">Play &rarr;</span>
            </Link>
          </div>
        )}

        {entries.length > 0 && (
          <div className="mt-3">
            <GoalCard
              entries={entries}
              period={prefs.goalPeriod}
              target={prefs.goalTarget}
              signedIn={Boolean(prefs.email)}
              onSave={handleSaveGoal}
            />
          </div>
        )}

        {entries.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-stone-300 p-10 text-center dark:border-stone-700">
            <p className="text-sm text-stone-500 dark:text-stone-400">
              Record or write your first story to get your first scorecard.
            </p>
            <Link
              href="/new"
              className="mt-4 inline-block rounded-md bg-brand-yellow px-3.5 py-1.5 text-xs font-semibold text-on-accent hover:bg-brand-yellow-dark"
            >
              Start now
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-4 mt-6 flex items-center justify-between border-t border-stone-200 pt-6 dark:border-stone-800">
              <h2 className="text-xs font-bold uppercase tracking-wide text-stone-500 dark:text-stone-400">
                Recent stories
              </h2>
              <div className="flex overflow-hidden rounded-md border border-stone-300 dark:border-stone-700">
                <button
                  onClick={() => setSortBy("date")}
                  className={`px-3 py-1 text-xs font-semibold ${
                    sortBy === "date"
                      ? "bg-brand-yellow text-on-accent"
                      : "bg-white text-stone-600 dark:bg-stone-900 dark:text-stone-300"
                  }`}
                >
                  Date
                </button>
                <button
                  onClick={() => setSortBy("story")}
                  className={`border-l border-stone-300 px-3 py-1 text-xs font-semibold dark:border-stone-700 ${
                    sortBy === "story"
                      ? "bg-brand-yellow text-on-accent"
                      : "bg-white text-stone-600 dark:bg-stone-900 dark:text-stone-300"
                  }`}
                >
                  Story
                </button>
              </div>
            </div>

            <ul className="flex flex-col gap-4">
              {sorted.map((entry) => (
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
              ))}
            </ul>

          </>
        )}

        <div className="mt-10 border-t border-stone-200 pt-6 dark:border-stone-800">
          <SignOutButton />
        </div>
      </main>
      <TourOverlay tourId="home" steps={HOME_TOUR} />
    </div>
  );
}
