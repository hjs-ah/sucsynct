"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { NavBar } from "@/components/nav-bar";
import { ScoreBars } from "@/components/score-bars";
import { LanguageMechanics } from "@/components/language-mechanics";
import { StrengthOpportunity } from "@/components/strength-opportunity";
import { getBenchmarkEntry, getEntry } from "@/lib/storage";
import type { Entry } from "@/lib/types";

export default function EntryPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [entry, setEntry] = useState<Entry | null | undefined>(undefined);
  const [benchmark, setBenchmark] = useState<Entry | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    const id = Array.isArray(params.id) ? params.id[0] : params.id;
    (async () => {
      const [found, benchmarkData] = await Promise.all([
        id ? getEntry(id) : Promise.resolve(undefined),
        getBenchmarkEntry(),
      ]);
      if (cancelled) return;
      setEntry(found ?? null);
      setBenchmark(benchmarkData);
    })();
    return () => {
      cancelled = true;
    };
  }, [params.id]);

  if (entry === undefined) return null;

  if (entry === null) {
    return (
      <div className="min-h-screen">
        <NavBar />
        <main className="mx-auto max-w-2xl px-6 py-10 text-center">
          <p className="text-sm text-stone-500 dark:text-stone-400">
            We couldn&rsquo;t find that entry.
          </p>
          <Link href="/" className="mt-3 inline-block text-sm font-semibold text-brand-orange">
            Back home
          </Link>
        </main>
      </div>
    );
  }

  const { scores } = entry;
  const isBenchmark = benchmark?.id === entry.id;
  const delta = benchmark && !isBenchmark ? scores.overall - benchmark.scores.overall : null;

  return (
    <div className="min-h-screen">
      <NavBar />
      <main className="mx-auto max-w-2xl px-6 py-10">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-xl font-bold text-stone-900 dark:text-stone-50">Feedback</h1>
          <span className="text-xs text-stone-500 dark:text-stone-400">
            {entry.mode} &middot; {entry.goal || "no goal set"}
          </span>
        </div>

        <div className="mb-6 flex items-center gap-5 rounded-2xl border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900">
          <div className="text-4xl font-extrabold text-brand-orange">{scores.overall}</div>
          <div className="flex flex-col gap-1">
            <p className="text-sm text-stone-600 dark:text-stone-300">{scores.verdict}</p>
            {isBenchmark ? (
              <p className="text-xs font-semibold text-brand-orange">Your benchmark story</p>
            ) : delta !== null ? (
              <p
                className={`text-xs font-semibold ${
                  delta > 0 ? "text-green-600" : delta < 0 ? "text-red-500" : "text-stone-400"
                }`}
              >
                {delta > 0 ? "+" : ""}
                {delta} vs. your benchmark ({benchmark!.scores.overall})
              </p>
            ) : null}
          </div>
        </div>

        {entry.selfScore !== undefined && (
          <div className="mb-6 flex items-center gap-6 rounded-2xl border border-stone-200 bg-stone-50 p-4 dark:border-stone-800 dark:bg-stone-900/50">
            <div className="flex items-center gap-2">
              <span className="text-xs text-stone-500 dark:text-stone-400">You guessed</span>
              <span className="text-lg font-bold text-stone-700 dark:text-stone-300">
                {entry.selfScore}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-stone-500 dark:text-stone-400">We scored</span>
              <span className="text-lg font-bold text-brand-orange">{scores.overall}</span>
            </div>
            <span className="text-xs text-stone-500 dark:text-stone-400">
              {Math.abs(entry.selfScore - scores.overall) <= 5
                ? "— well calibrated"
                : entry.selfScore < scores.overall
                  ? "— you were harder on yourself than we were"
                  : "— we were harder on this one than you were"}
            </span>
          </div>
        )}

        <div className="mb-6 rounded-2xl border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900">
          <StrengthOpportunity scores={scores} />
        </div>

        <div className="mb-6 rounded-2xl border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900">
          <h2 className="mb-4 text-xs font-bold uppercase tracking-wide text-stone-500 dark:text-stone-400">
            Breakdown
          </h2>
          <ScoreBars scores={scores} />
        </div>

        <div className="mb-6 rounded-2xl border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900">
          <LanguageMechanics scores={scores} />
        </div>

        {scores.evidence && (
          <div className="mb-6 rounded-2xl border border-stone-200 bg-stone-50 p-5 dark:border-stone-800 dark:bg-stone-900/50">
            <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-stone-500 dark:text-stone-400">
              What we noticed
            </h2>
            <p className="text-sm italic text-stone-700 dark:text-stone-300">
              &ldquo;{scores.evidence}&rdquo;
            </p>
          </div>
        )}

        <div className="mb-8 rounded-2xl border border-stone-200 p-5 dark:border-stone-800">
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-stone-500 dark:text-stone-400">
            Your text
          </h2>
          <p className="whitespace-pre-wrap text-sm text-stone-700 dark:text-stone-300">
            {entry.text}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => router.push("/new")}
            className="rounded-none bg-brand-yellow px-5 py-2.5 text-sm font-semibold text-stone-900 hover:bg-brand-yellow-dark"
          >
            Revise &amp; resubmit
          </button>
          <Link
            href="/history"
            className="rounded-none border border-stone-300 px-5 py-2.5 text-sm font-semibold text-stone-700 hover:border-stone-400 dark:border-stone-700 dark:text-stone-300"
          >
            View history
          </Link>
          <button
            disabled
            title="Coming soon — connect with a live coach"
            className="cursor-not-allowed rounded-none border border-dashed border-amber-400 px-5 py-2.5 text-sm font-semibold text-amber-600 opacity-60 dark:border-amber-700 dark:text-amber-500"
          >
            Share with a coach
          </button>
        </div>
      </main>
    </div>
  );
}
