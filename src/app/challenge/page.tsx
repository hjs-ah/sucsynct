"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AnimatedNumber } from "@/components/animated-number";
import { MicIcon } from "@/components/icons";
import { NavBar } from "@/components/nav-bar";
import { estimateSpokenSeconds, formatDuration, storySeconds, storySnippet, wordCount } from "@/lib/format";
import { getEntries, getPreferences, makeId, peekEntries, saveEntry } from "@/lib/storage";
import { mockScore } from "@/lib/rubric";
import type { AnalyzerStrictness, Entry, ScoreResult } from "@/lib/types";

// Half-time challenge: retell a story you've already told in half the time.
// Each round halves the clock again. Audio is recorded in this tab, sent once
// to be transcribed, and discarded — only the text and scores are saved.

const STATS_KEY = "sucsynct:challenge";
const MAX_ROUND = 3;
const MIN_TARGET = 15;
const RECORD_BITRATE = 32000;

type Phase = "pick" | "countdown" | "recording" | "processing" | "result";

interface RoundResult {
  entryId: string;
  seconds: number;
  target: number;
  cutOff: boolean;
  thin: boolean;
  score: number;
  originalScore: number;
  words: number;
  stars: number;
}

function readStats(): { plays: number; stars: number } {
  try {
    const raw = JSON.parse(window.localStorage.getItem(STATS_KEY) ?? "{}") as {
      plays?: number;
      stars?: number;
    };
    return { plays: raw.plays ?? 0, stars: raw.stars ?? 0 };
  } catch {
    return { plays: 0, stars: 0 };
  }
}

function addStats(stars: number) {
  const s = readStats();
  try {
    window.localStorage.setItem(
      STATS_KEY,
      JSON.stringify({ plays: s.plays + 1, stars: s.stars + stars }),
    );
  } catch {
    // best effort
  }
  return { plays: s.plays + 1, stars: s.stars + stars };
}

function Stars({ count }: { count: number }) {
  return (
    <div className="flex justify-center gap-1 text-3xl" aria-label={`${count} of 3 stars`}>
      {[1, 2, 3].map((n) => (
        <span
          key={n}
          className={n <= count ? "text-brand-blue" : "text-stone-300 dark:text-stone-700"}
        >
          &#9733;
        </span>
      ))}
    </div>
  );
}

export default function ChallengePage() {
  const [entries, setEntries] = useState<Entry[] | null>(() => peekEntries());
  const [sourceId, setSourceId] = useState<string | null>(null);
  const [round, setRound] = useState(1);
  const [phase, setPhase] = useState<Phase>("pick");
  const [count, setCount] = useState(3);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RoundResult | null>(null);
  const [stats, setStats] = useState({ plays: 0, stars: 0 });
  const [strictness, setStrictness] = useState<AnalyzerStrictness>("strict");

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef(0);
  const finishedRef = useRef(false);
  const targetRef = useRef(0);

  useEffect(() => {
    setStats(readStats());
    let cancelled = false;
    (async () => {
      const [all, prefs] = await Promise.all([getEntries(), getPreferences()]);
      if (cancelled) return;
      setEntries(all);
      setStrictness(prefs.analyzerStrictness);
      const wanted = new URLSearchParams(window.location.search).get("from");
      setSourceId((prev) => prev ?? all.find((e) => e.id === wanted)?.id ?? all[0]?.id ?? null);
    })();
    return () => {
      cancelled = true;
      cleanup();
    };
  }, []);

  function cleanup() {
    if (timerRef.current) clearInterval(timerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  const source = entries?.find((e) => e.id === sourceId) ?? null;
  const base = source ? storySeconds(source) : null;
  const target = base
    ? Math.max(MIN_TARGET, Math.round(base.seconds / 2 ** round / 5) * 5)
    : 0;

  async function start() {
    if (!source) return;
    setError(null);
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError("Mic access was blocked. Allow it in your browser's site settings and try again.");
      return;
    }
    streamRef.current = stream;
    targetRef.current = target;
    finishedRef.current = false;
    setPhase("countdown");
    setCount(3);
    let n = 3;
    countdownRef.current = setInterval(() => {
      n -= 1;
      if (n <= 0) {
        if (countdownRef.current) clearInterval(countdownRef.current);
        beginRecording(stream);
      } else {
        setCount(n);
      }
    }, 900);
  }

  function beginRecording(stream: MediaStream) {
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(stream, { audioBitsPerSecond: RECORD_BITRATE });
    } catch {
      recorder = new MediaRecorder(stream);
    }
    chunksRef.current = [];
    recorder.addEventListener("dataavailable", (ev) => {
      if (ev.data.size > 0) chunksRef.current.push(ev.data);
    });
    recorderRef.current = recorder;
    recorder.start();
    startedAtRef.current = Date.now();
    setElapsed(0);
    setPhase("recording");
    timerRef.current = setInterval(() => {
      const e = (Date.now() - startedAtRef.current) / 1000;
      setElapsed(e);
      if (e >= targetRef.current) finish(true);
    }, 200);
  }

  function finish(cutOff: boolean) {
    if (finishedRef.current) return;
    finishedRef.current = true;
    if (timerRef.current) clearInterval(timerRef.current);
    const used = Math.min(targetRef.current, Math.max(1, (Date.now() - startedAtRef.current) / 1000));
    const recorder = recorderRef.current;
    if (!recorder) return;
    recorder.addEventListener(
      "stop",
      () => {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        void process(blob, Math.round(used), cutOff);
      },
      { once: true },
    );
    recorder.stop();
    setPhase("processing");
  }

  async function process(blob: Blob, seconds: number, cutOff: boolean) {
    if (!source) return;
    try {
      const form = new FormData();
      form.append("file", blob, "retell.webm");
      const tr = await fetch("/api/transcribe", { method: "POST", body: form });
      const td = (await tr.json().catch(() => ({}))) as { text?: string; error?: string };
      if (!tr.ok || !td.text) {
        setError(td.error ?? "We couldn't transcribe that. Try again.");
        setPhase("pick");
        return;
      }
      const text = td.text;
      const words = wordCount(text);
      if (words < 8) {
        setError("We barely heard anything. Try again a little closer to the mic.");
        setPhase("pick");
        return;
      }

      let scores: ScoreResult;
      try {
        const res = await fetch("/api/score", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text,
            audience: source.audience,
            goal: source.goal,
            strictness,
            mode: "speak",
            durationSeconds: seconds,
          }),
        });
        scores = ((await res.json()) as { scores?: ScoreResult }).scores ?? mockScore(text, strictness, "speak");
      } catch {
        scores = mockScore(text, strictness, "speak");
      }

      const id = makeId();
      await saveEntry({
        id,
        createdAt: new Date().toISOString(),
        mode: "speak",
        audience: source.audience,
        goal: source.goal,
        text,
        scores,
        durationSeconds: seconds,
      });

      // 1 star for finishing, 2 for beating the buzzer, 3 for also matching
      // or beating the original story's score.
      // A retelling that skips most of the story doesn't count as beating the clock.
      const thin = words < wordCount(source.text) * 0.25;
      const stars = thin
        ? 1
        : 1 + (cutOff ? 0 : 1) + (!cutOff && scores.overall >= source.scores.overall ? 1 : 0);
      setStats(addStats(stars));
      setResult({
        entryId: id,
        seconds,
        target: targetRef.current,
        cutOff,
        thin,
        score: scores.overall,
        originalScore: source.scores.overall,
        words,
        stars,
      });
      setPhase("result");
    } catch {
      setError("Something went wrong. Try again.");
      setPhase("pick");
    }
  }

  function again(nextRound: number) {
    setRound(nextRound);
    setResult(null);
    setError(null);
    setPhase("pick");
  }

  const shell = (children: React.ReactNode) => (
    <div className="min-h-screen">
      <NavBar />
      <main className="mx-auto max-w-md px-6 py-8">{children}</main>
    </div>
  );

  if (entries === null) return shell(null);

  if (entries.length === 0 || !source || !base) {
    return shell(
      <div className="rounded-2xl border border-dashed border-stone-300 p-10 text-center dark:border-stone-700">
        <h1 className="mb-2 text-lg font-bold text-ink dark:text-stone-50">Half-time challenge</h1>
        <p className="text-sm text-stone-500 dark:text-stone-400">
          Tell or write a story first. Then you can retell it in half the time.
        </p>
        <Link
          href="/new"
          className="mt-4 inline-block rounded-md bg-brand-yellow px-3.5 py-1.5 text-xs font-semibold text-on-accent hover:bg-brand-yellow-dark"
        >
          New entry
        </Link>
      </div>,
    );
  }

  const remaining = Math.max(0, target - elapsed);
  const lowTime = phase === "recording" && remaining <= 10;
  const roundLabel = ["", "Half time", "Quarter time", "Eighth time"][round] ?? "Half time";

  // Draining ring for the countdown.
  const ring = (
    <div className="relative mx-auto h-52 w-52">
      <svg viewBox="0 0 208 208" className="-rotate-90" aria-hidden>
        <circle cx="104" cy="104" r="98" fill="none" stroke="var(--track)" strokeWidth="3" />
        <circle
          cx="104"
          cy="104"
          r="98"
          fill="none"
          stroke={lowTime ? "#d97706" : "var(--brand-blue)"}
          strokeWidth="6"
          strokeLinecap="round"
          pathLength={100}
          strokeDasharray="100"
          strokeDashoffset={phase === "recording" ? 100 - (remaining / target) * 100 : 0}
          style={{ transition: "stroke-dashoffset 220ms linear" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {phase === "countdown" ? (
          <span className="text-6xl font-extrabold text-brand-blue">{count}</span>
        ) : (
          <>
            <span
              className={`text-5xl font-extrabold tabular-nums ${
                lowTime ? "text-amber-600 dark:text-amber-400" : "text-ink dark:text-stone-50"
              }`}
            >
              {formatDuration(Math.ceil(remaining))}
            </span>
            <span className="mt-1 text-xs text-stone-500 dark:text-stone-400">left</span>
          </>
        )}
      </div>
    </div>
  );

  if (phase === "countdown" || phase === "recording") {
    return shell(
      <div className="flex flex-col items-center gap-6 text-center">
        <p className="text-sm font-semibold text-ink dark:text-stone-100">
          {phase === "countdown" ? "Get ready…" : `Retell it in ${formatDuration(target)}`}
        </p>
        {ring}
        <p className="max-w-xs text-xs text-stone-500 dark:text-stone-400">
          &ldquo;{storySnippet(source)}&rdquo;
        </p>
        {phase === "recording" && (
          <button
            type="button"
            onClick={() => finish(false)}
            className="w-full rounded-md bg-stone-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-stone-800 dark:bg-stone-50 dark:text-ink dark:hover:bg-stone-200"
          >
            Done. I finished in time
          </button>
        )}
      </div>,
    );
  }

  if (phase === "processing") {
    return shell(
      <div className="flex flex-col items-center gap-3 py-20 text-center">
        <p className="text-sm font-semibold text-ink dark:text-stone-100">Scoring your retelling…</p>
        <p className="text-xs text-stone-500 dark:text-stone-400">
          Transcribing, then scoring. Your audio isn&rsquo;t stored.
        </p>
      </div>,
    );
  }

  if (phase === "result" && result) {
    const delta = result.score - result.originalScore;
    return shell(
      <div className="flex flex-col items-center gap-5 text-center">
        <Stars count={result.stars} />
        <h1 className="text-lg font-bold text-ink dark:text-stone-50">
          {result.thin
            ? "That was quick, but it left most of the story out."
            : result.stars === 3
            ? "Shorter and just as strong."
            : result.cutOff
              ? "Time! The clock beat you this round."
              : "You beat the clock."}
        </h1>
        <div className="grid w-full grid-cols-3 gap-2 rounded-xl border border-stone-200 p-4 dark:border-stone-800">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-stone-500 dark:text-stone-400">
              Time
            </p>
            <p className="text-lg font-bold tabular-nums text-ink dark:text-stone-100">
              {formatDuration(result.seconds)}
            </p>
            <p className="text-[11px] text-stone-400 dark:text-stone-500">
              of {formatDuration(result.target)}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-stone-500 dark:text-stone-400">
              Score
            </p>
            <AnimatedNumber
              value={result.score}
              className="text-lg font-bold text-brand-blue"
            />
            <p className="text-[11px] text-stone-400 dark:text-stone-500">
              {delta >= 0 ? "+" : ""}
              {delta} vs original
            </p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-stone-500 dark:text-stone-400">
              Words
            </p>
            <p className="text-lg font-bold tabular-nums text-ink dark:text-stone-100">
              {result.words}
            </p>
            <p className="text-[11px] text-stone-400 dark:text-stone-500">
              {Math.round(result.words / (result.seconds / 60))}/min
            </p>
          </div>
        </div>
        <p className="max-w-xs text-xs text-stone-500 dark:text-stone-400">
          {result.thin
            ? "Half-time still needs the key moments: the setup, the turn, the landing. Try again with all three, just tighter."
            : result.cutOff
            ? "You ran out of time before you were done. Cut the setup and open with the point."
            : delta >= 0
              ? "Less time, same or better score. That's the skill: what survived the cut mattered most."
              : "You made the time. Now get the score back up: keep the one detail that carries the story."}
          {" "}Saved to your history.
        </p>
        <div className="flex w-full flex-col gap-2">
          {round < MAX_ROUND && (
            <button
              type="button"
              onClick={() => again(round + 1)}
              className="rounded-md bg-brand-yellow px-4 py-2.5 text-xs font-semibold text-on-accent transition-colors hover:bg-brand-yellow-dark"
            >
              Next round: {["", "", "quarter", "eighth"][round + 1]} time (
              {formatDuration(Math.max(MIN_TARGET, Math.round(base.seconds / 2 ** (round + 1) / 5) * 5))})
            </button>
          )}
          <div className="flex divide-x divide-stone-300 overflow-hidden rounded-md border border-stone-300 dark:divide-stone-700 dark:border-stone-700">
            <button
              type="button"
              onClick={() => again(round)}
              className="h-9 flex-1 text-xs font-semibold text-stone-600 transition-colors hover:bg-stone-200 hover:text-stone-900 dark:text-stone-300 dark:hover:bg-stone-700 dark:hover:text-stone-50"
            >
              Try this round again
            </button>
            <Link
              href={`/entry/${result.entryId}`}
              className="flex h-9 flex-1 items-center justify-center text-xs font-semibold text-stone-600 transition-colors hover:bg-stone-200 hover:text-stone-900 dark:text-stone-300 dark:hover:bg-stone-700 dark:hover:text-stone-50"
            >
              See feedback
            </Link>
          </div>
        </div>
        <p className="text-[11px] text-stone-400 dark:text-stone-500">
          {stats.stars} {stats.stars === 1 ? "star" : "stars"} earned on this device &middot; {stats.plays}{" "}
          {stats.plays === 1 ? "round" : "rounds"} played
        </p>
      </div>,
    );
  }

  // Pick / ready screen.
  return shell(
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-ink dark:text-stone-50">Half-time challenge</h1>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          Retell a story you&rsquo;ve already told, in half the time. Every round the clock halves
          again. Stars for finishing, beating the buzzer, and keeping your score.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-xs font-bold uppercase tracking-wide text-stone-500 dark:text-stone-400">
          Story to retell
        </label>
        <select
          value={source.id}
          onChange={(e) => {
            setSourceId(e.target.value);
            setRound(1);
          }}
          className="rounded-lg border border-stone-300 bg-transparent px-3 py-2 text-sm text-ink focus:border-brand-blue focus:outline-none dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
        >
          {entries.slice(0, 10).map((e) => (
            <option key={e.id} value={e.id}>
              {storySnippet(e)}
            </option>
          ))}
        </select>
        <p className="text-xs text-stone-500 dark:text-stone-400">
          {base.estimated ? "About " : ""}
          {formatDuration(base.seconds || estimateSpokenSeconds(source.text))} to tell
          {base.estimated ? " (estimated from the text)" : ""} &middot; score {source.scores.overall}
        </p>
      </div>

      <div className="rounded-2xl border border-stone-200 p-6 text-center dark:border-stone-800">
        <p className="text-xs font-bold uppercase tracking-wide text-stone-500 dark:text-stone-400">
          Round {round} &middot; {roundLabel}
        </p>
        <p className="mt-2 text-5xl font-extrabold tabular-nums text-brand-blue">
          {formatDuration(target)}
        </p>
        <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
          The timer stops you when it hits zero.
        </p>
        {error && <p className="mt-3 text-xs text-red-500">{error}</p>}
        <button
          type="button"
          onClick={start}
          className="mt-5 flex h-10 w-full items-center justify-center gap-2 rounded-md bg-red-600 text-xs font-semibold text-white hover:bg-red-700"
        >
          <MicIcon className="h-4 w-4 !text-white" />
          Tap to start
        </button>
      </div>

      <p className="text-center text-[11px] text-stone-400 dark:text-stone-500">
        {stats.stars} {stats.stars === 1 ? "star" : "stars"} earned on this device &middot; {stats.plays}{" "}
        {stats.plays === 1 ? "round" : "rounds"} played
      </p>
    </div>,
  );
}
