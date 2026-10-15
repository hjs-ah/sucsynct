"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { NavBar } from "@/components/nav-bar";
import { AnimatedNumber } from "@/components/animated-number";
import { ScoreBars } from "@/components/score-bars";
import { LanguageMechanics } from "@/components/language-mechanics";
import { ModeLabel } from "@/components/mode-label";
import { StrengthOpportunity } from "@/components/strength-opportunity";
import { suggestExercises } from "@/lib/practice";
import { buildAnalysis } from "@/lib/rubric";
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
          <Link href="/" className="mt-3 inline-block text-sm font-semibold text-brand-blue">
            Back home
          </Link>
        </main>
      </div>
    );
  }

  const { scores } = entry;
  const isBenchmark = benchmark?.id === entry.id;
  const delta = benchmark && !isBenchmark ? scores.overall - benchmark.scores.overall : null;
  const analysis = scores.analysis ?? buildAnalysis(scores.dimensions);
  const exercises = suggestExercises(scores);

  // Each section is separated from the one above by a thin rule and some
  // breathing room, instead of every block sitting in its own box.
  const section = "mt-8 border-t border-stone-200 pt-6 dark:border-stone-800";
  const heading =
    "mb-3 text-xs font-bold uppercase tracking-wide text-stone-500 dark:text-stone-400";

  return (
    <div className="min-h-screen">
      <NavBar />
      <main className="mx-auto max-w-2xl px-6 py-8">
        <div className="mb-6 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h1 className="text-xl font-bold text-ink dark:text-stone-50">Feedback</h1>
          <span className="flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400">
            <ModeLabel mode={entry.mode} />
            <span aria-hidden>&middot;</span>
            {entry.goal || "no goal set"}
          </span>
        </div>

        <section className="flex flex-col items-center gap-2 text-center">
          <div className="flex h-36 w-36 items-center justify-center rounded-full border-[3px] border-brand-blue">
            <AnimatedNumber
              value={scores.overall}
              className="text-5xl font-extrabold text-brand-blue"
            />
          </div>
          {isBenchmark ? (
            <p className="text-xs font-semibold text-brand-blue">Your benchmark story</p>
          ) : benchmark && delta !== null ? (
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Benchmark {benchmark.scores.overall}
              <span
                className={`ml-2 font-semibold ${
                  delta > 0 ? "text-brand-blue" : delta < 0 ? "text-red-500" : "text-stone-400"
                }`}
              >
                {delta > 0 ? "+" : ""}
                {delta}
              </span>
            </p>
          ) : null}
          <p className="mt-1 max-w-md text-sm text-stone-600 dark:text-stone-300">
            {scores.verdict}
          </p>
        </section>

        {entry.selfScore !== undefined && (
          <section className={section}>
            <h2 className={heading}>Guess vs. score</h2>
            <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
              <div className="flex items-baseline gap-2">
                <span className="text-xs text-stone-500 dark:text-stone-400">Your guess</span>
                <span className="text-lg font-bold text-stone-700 dark:text-stone-300">
                  {entry.selfScore}
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-xs text-stone-500 dark:text-stone-400">We scored</span>
                <AnimatedNumber
                  value={scores.overall}
                  className="text-lg font-bold text-brand-blue"
                />
              </div>
            </div>
            <p className="mt-2 text-xs text-stone-500 dark:text-stone-400">
              {Math.abs(entry.selfScore - scores.overall) <= 5
                ? "Well calibrated."
                : entry.selfScore < scores.overall
                  ? "You were harder on yourself than we were."
                  : "We were harder on this one than you were."}
            </p>
          </section>
        )}

        <section className={section}>
          <h2 className={heading}>Highlights</h2>
          <StrengthOpportunity scores={scores} />
        </section>

        <section className={section}>
          <h2 className={heading}>Breakdown</h2>
          <ScoreBars scores={scores} />
        </section>

        <section className={section}>
          <LanguageMechanics scores={scores} />
        </section>

        <section className={section}>
          <h2 className={heading}>Analysis</h2>
          <div className="flex flex-col gap-6">
            <div>
              <p className="mb-1 text-xs font-semibold text-stone-500 dark:text-stone-400">
                Analysis 1 &middot; What was strong
              </p>
              <p className="text-sm leading-relaxed text-stone-700 dark:text-stone-300">
                {analysis.strong}
              </p>
            </div>
            <div>
              <p className="mb-1 text-xs font-semibold text-stone-500 dark:text-stone-400">
                Analysis 2 &middot; What could improve
              </p>
              <p className="text-sm leading-relaxed text-stone-700 dark:text-stone-300">
                {analysis.improve}
              </p>
            </div>
          </div>
        </section>

        <section className={section}>
          <h2 className={heading}>Practice speaking</h2>
          <p className="mb-4 text-xs text-stone-500 dark:text-stone-400">
            Short drills aimed at what scored lowest. Do them out loud, then try again.
          </p>
          <ol className="flex flex-col gap-4">
            {exercises.map((ex, i) => (
              <li key={ex.title} className="flex gap-3">
                <span className="mt-0.5 w-4 shrink-0 text-xs font-bold text-brand-blue">
                  {i + 1}
                </span>
                <div>
                  <p className="text-sm font-semibold text-ink dark:text-stone-100">{ex.title}</p>
                  <p className="mt-0.5 text-sm leading-relaxed text-stone-600 dark:text-stone-300">
                    {ex.steps}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className={section}>
          <h2 className={heading}>Your text</h2>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-stone-700 dark:text-stone-300">
            {entry.text}
          </p>
        </section>

        <section className={`${section} flex flex-wrap items-center gap-3`}>
          <button
            onClick={() => router.push("/new")}
            className="rounded-md bg-brand-yellow px-4 py-2 text-xs font-semibold text-on-accent hover:bg-brand-yellow-dark"
          >
            Revise &amp; resubmit
          </button>
          <Link
            href="/history"
            className="rounded-md border border-stone-300 dark:border-stone-700 px-4 py-2 text-xs font-semibold text-stone-700 dark:text-stone-300"
          >
            View history
          </Link>
          <button
            disabled
            title="Coming soon — connect with a live coach"
            className="cursor-not-allowed rounded-md border border-dashed border-stone-400 px-4 py-2 text-xs font-semibold text-stone-500 opacity-60 dark:border-stone-600 dark:text-stone-400"
          >
            Share with a coach
          </button>
        </section>
      </main>
    </div>
  );
}
