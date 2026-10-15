"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getEntries, makeId, saveEntry, savePreferences } from "@/lib/storage";
import { mockScore } from "@/lib/rubric";
import type { ScoreResult } from "@/lib/types";

const FOCUS_OPTIONS = [
  "Sales calls",
  "Preaching",
  "Interviews",
  "College essays",
  "Resume",
  "Public speaking",
  "Team updates / standups",
  "Networking pitch",
  "Wedding toasts & tributes",
  "Podcast / interview guesting",
];

// Interactive steps after the intro: 1 focus, 2 warm-up, 3 first feedback.
const STEP_COUNT = 3;

// The intro notes shown one at a time, centered, each for 5 seconds.
const NOTES = [
  {
    title: "Tell better stories",
    body: "Speak or write. We\u2019ll help the message land every time.",
  },
  {
    title: "Write or record",
    body: "A story, a pitch, or an answer. Whatever you\u2019re working on.",
  },
  {
    title: "Get scored on six things",
    body: "Clarity, structure, brevity, specificity, audience fit, and voice.",
  },
  {
    title: "One strength, one fix",
    body: "See what\u2019s working and one concrete thing to change, then try it again.",
  },
];

const NOTE_VISIBLE_MS = 5000;
const NOTE_FADE_MS = 550;

export default function OnboardingPage() {
  const router = useRouter();
  // 0 = intro (logo, then the timed notes); 1-3 = the interactive steps.
  const [step, setStep] = useState(0);
  const [phase, setPhase] = useState<"logo" | "notes" | "steps">("logo");
  const [logoIn, setLogoIn] = useState(false);
  const [noteIndex, setNoteIndex] = useState(0);
  const [noteVisible, setNoteVisible] = useState(false);
  const [notesStarted, setNotesStarted] = useState(false);
  // Set when someone taps an arrow: the note to fade in next.
  const [pendingIndex, setPendingIndex] = useState<number | null>(null);
  const [focus, setFocus] = useState<string[]>([]);
  const [customFocusInput, setCustomFocusInput] = useState("");
  const [warmup, setWarmup] = useState("");
  const [scoring, setScoring] = useState(false);
  const [firstScore, setFirstScore] = useState<ScoreResult | null>(null);

  // Logo fades in at the centre, holds a beat, then the notes begin and the
  // logo slides up to the top.
  useEffect(() => {
    const raf = requestAnimationFrame(() => setLogoIn(true));
    const t = setTimeout(() => setPhase("notes"), 2200);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t);
    };
  }, []);

  // Each note fades in, stays for 5 seconds, fades out, then the next one
  // takes its place. After the last note the interactive steps begin. The
  // arrows reuse the same fade by setting `pendingIndex`; any change restarts
  // the 5-second timer.
  useEffect(() => {
    if (phase !== "notes") return;
    if (noteVisible) {
      const t = setTimeout(() => setNoteVisible(false), NOTE_VISIBLE_MS);
      return () => clearTimeout(t);
    }
    const t = setTimeout(
      () => {
        if (!notesStarted) {
          setNotesStarted(true);
          setNoteVisible(true);
          return;
        }
        const target = pendingIndex ?? noteIndex + 1;
        if (target >= NOTES.length) {
          setPhase("steps");
          setStep(1);
          return;
        }
        setNoteIndex(target);
        setPendingIndex(null);
        setNoteVisible(true);
      },
      notesStarted ? NOTE_FADE_MS : 900
    );
    return () => clearTimeout(t);
  }, [phase, noteVisible, noteIndex, notesStarted, pendingIndex]);

  const displayIndex = pendingIndex ?? noteIndex;

  function goToNote(target: number) {
    if (phase !== "notes" || !notesStarted || target < 0 || target >= NOTES.length) return;
    setPendingIndex(target);
    setNoteVisible(false);
  }

  async function skipOnboarding() {
    await savePreferences({ onboarded: true });
    router.replace("/");
  }

  function toggleFocus(option: string) {
    setFocus((prev) =>
      prev.includes(option) ? prev.filter((f) => f !== option) : [...prev, option]
    );
  }

  // Lets someone whose focus isn't one of the presets add their own instead
  // of settling for the closest match — it's stored exactly like a preset
  // once added (same `focus` array), just sourced from free text.
  function addCustomFocus() {
    const value = customFocusInput.trim();
    if (!value) return;
    setFocus((prev) => (prev.includes(value) ? prev : [...prev, value]));
    setCustomFocusInput("");
  }

  // Any focus the person has selected that isn't one of the built-in
  // presets — rendered as its own removable chip so it stays visible (and
  // deselectable) alongside the presets rather than disappearing into the
  // input.
  const customFocusChips = focus.filter((f) => !FOCUS_OPTIONS.includes(f));

  async function handleCapture() {
    setScoring(true);
    let scores: ScoreResult;
    try {
      const res = await fetch("/api/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: warmup, audience: "", goal: focus[0] ?? "" }),
      });
      const data = await res.json();
      scores = data.scores ?? mockScore(warmup);
    } catch {
      scores = mockScore(warmup);
    }
    setFirstScore(scores);
    setScoring(false);
    setStep(3);
  }

  async function finish() {
    await savePreferences({ onboarded: true, focus });
    const existing = await getEntries();
    if (warmup.trim() && firstScore && existing.length === 0) {
      await saveEntry({
        id: makeId(),
        createdAt: new Date().toISOString(),
        mode: "write",
        audience: "",
        goal: focus[0] ?? "",
        text: warmup,
        scores: firstScore,
      });
    }
    router.replace("/");
  }

  const atTop = phase !== "logo";

  return (
    <div className="relative min-h-screen overflow-hidden bg-stone-50 dark:bg-stone-950">
      <div className="absolute inset-x-0 bottom-8 z-20 flex justify-center">
        <button
          type="button"
          onClick={skipOnboarding}
          className="rounded-md border border-stone-300 px-3.5 py-1.5 text-xs font-semibold text-stone-600 dark:border-stone-700 dark:text-stone-300"
        >
          Skip onboarding
        </button>
      </div>

      {/* The logo starts centred, fades in, then slides up above the notes. */}
      <div
        className="absolute left-1/2 z-10"
        style={{
          top: atTop ? "4.25rem" : "50%",
          transform: `translate(-50%, ${atTop ? "0" : "-50%"}) scale(${atTop ? 1 : 1.3})`,
          opacity: logoIn ? 1 : 0,
          transition:
            "opacity 1000ms ease, top 900ms cubic-bezier(0.4, 0, 0.2, 1), transform 900ms cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        <Image
          src="/logo-v3.png"
          alt="Sucsynct"
          width={760}
          height={159}
          priority
          className="h-12 w-auto max-w-none dark:brightness-150"
        />
      </div>

      {phase !== "steps" && (
        <div className="absolute inset-x-0 top-1/2 flex -translate-y-1/2 flex-col items-center px-8 text-center">
          <div
            className="max-w-sm"
            style={{
              opacity: phase === "notes" && noteVisible ? 1 : 0,
              transform: phase === "notes" && noteVisible ? "translateY(0)" : "translateY(6px)",
              transition: `opacity ${NOTE_FADE_MS}ms ease, transform ${NOTE_FADE_MS}ms ease`,
            }}
          >
            <h1 className="text-xl font-bold text-ink dark:text-stone-50">
              {NOTES[displayIndex].title}
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-stone-500 dark:text-stone-400">
              {NOTES[displayIndex].body}
            </p>
          </div>
          <div
            className="mt-8 flex items-center gap-4 transition-opacity duration-700"
            style={{
              opacity: phase === "notes" ? 1 : 0,
              pointerEvents: phase === "notes" ? "auto" : "none",
            }}
          >
            <button
              type="button"
              onClick={() => goToNote(displayIndex - 1)}
              disabled={displayIndex === 0 || !notesStarted}
              aria-label="Previous message"
              className="flex h-9 w-9 items-center justify-center rounded-md text-stone-500 transition-colors hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent dark:text-stone-400 dark:hover:bg-stone-800"
            >
              <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 fill-current" aria-hidden>
                <polygon points="12,2 12,14 3,8" />
              </svg>
            </button>
            <div className="flex gap-1.5" aria-hidden>
              {NOTES.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 w-1.5 rounded-full transition-colors duration-500 ${
                    phase === "notes" && i === displayIndex
                      ? "bg-stone-500 dark:bg-stone-300"
                      : "bg-stone-300 dark:bg-stone-700"
                  }`}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={() => goToNote(displayIndex + 1)}
              disabled={displayIndex >= NOTES.length - 1 || !notesStarted}
              aria-label="Next message"
              className="flex h-9 w-9 items-center justify-center rounded-md text-stone-500 transition-colors hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent dark:text-stone-400 dark:hover:bg-stone-800"
            >
              <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 fill-current" aria-hidden>
                <polygon points="4,2 4,14 13,8" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {phase === "steps" && (
        <div className="animate-fade-in flex min-h-screen items-center justify-center px-6 pb-24 pt-36">
          <div className="w-full max-w-md">
            <div className="mb-6 flex gap-1.5">
              {Array.from({ length: STEP_COUNT }).map((_, i) => (
                <div
                  key={i}
                  className={`h-1 flex-1 rounded-full ${
                    i < step ? "bg-brand-yellow" : "bg-stone-200 dark:bg-stone-800"
                  }`}
                />
              ))}
            </div>

            <div className="rounded-2xl border border-stone-200 bg-white p-8 dark:border-stone-800 dark:bg-stone-900">
          {step === 1 && (
            <div className="flex flex-col gap-5">
              <h2 className="text-lg font-bold text-ink dark:text-stone-50">
                What are you working on?
              </h2>
              <div className="flex flex-wrap gap-2">
                {FOCUS_OPTIONS.map((option) => {
                  const active = focus.includes(option);
                  return (
                    <button
                      key={option}
                      onClick={() => toggleFocus(option)}
                      className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                        active
                          ? "border-brand-blue bg-brand-blue/10 text-brand-blue"
                          : "border-stone-300 text-stone-600 hover:border-stone-400 dark:border-stone-700 dark:text-stone-300"
                      }`}
                    >
                      {option}
                    </button>
                  );
                })}
                {customFocusChips.map((option) => (
                  <button
                    key={option}
                    onClick={() => toggleFocus(option)}
                    className="rounded-full border border-brand-blue bg-brand-blue/10 px-3.5 py-1.5 text-xs font-semibold text-brand-blue"
                  >
                    {option} &times;
                  </button>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  value={customFocusInput}
                  onChange={(e) => setCustomFocusInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addCustomFocus();
                    }
                  }}
                  placeholder="Not listed? Add your own…"
                  className="flex-1 rounded-full border border-dashed border-stone-300 bg-transparent px-3.5 py-1.5 text-xs text-ink placeholder:text-stone-400 focus:border-brand-blue focus:outline-none dark:border-stone-700 dark:text-stone-100"
                />
                <button
                  type="button"
                  onClick={addCustomFocus}
                  disabled={!customFocusInput.trim()}
                  className="shrink-0 rounded-full border border-stone-300 px-3.5 py-1.5 text-xs font-semibold text-stone-600 hover:border-stone-400 disabled:cursor-not-allowed disabled:opacity-40 dark:border-stone-700 dark:text-stone-300"
                >
                  Add
                </button>
              </div>

              <button
                onClick={() => setStep(2)}
                disabled={focus.length === 0}
                className="self-end rounded-md bg-brand-yellow px-5 py-2 text-xs font-semibold text-on-accent hover:bg-brand-yellow-dark disabled:cursor-not-allowed disabled:opacity-40"
              >
                Continue
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-4">
              <h2 className="text-lg font-bold text-ink dark:text-stone-50">
                60-second warm-up
              </h2>
              <p className="text-sm text-stone-500 dark:text-stone-400">
                Tell us about a time you had to explain something important, fast.
              </p>
              <textarea
                value={warmup}
                onChange={(e) => setWarmup(e.target.value)}
                rows={6}
                placeholder="Type your story here — recording comes to the full app..."
                className="w-full resize-none rounded-xl border border-stone-300 bg-transparent p-3 text-sm text-ink placeholder:text-stone-400 focus:border-brand-blue focus:outline-none dark:border-stone-700 dark:text-stone-100"
              />
              <p className="text-xs text-stone-400 dark:text-stone-500">
                Type it here for now. In the full app you can also record your voice or upload
                audio, and it&rsquo;s transcribed so you can edit the text before it&rsquo;s scored.
              </p>
              <button
                onClick={handleCapture}
                disabled={!warmup.trim() || scoring}
                className="self-end rounded-md bg-brand-yellow px-5 py-2 text-xs font-semibold text-on-accent hover:bg-brand-yellow-dark disabled:cursor-not-allowed disabled:opacity-40"
              >
                {scoring ? "Scoring…" : "See my feedback"}
              </button>
            </div>
          )}

          {step === 3 && firstScore && (
            <div className="flex flex-col gap-4">
              <h2 className="text-lg font-bold text-ink dark:text-stone-50">
                Nice start.
              </h2>
              <div className="flex items-center gap-3 rounded-xl bg-stone-100 p-4 dark:bg-stone-800">
                <div className="text-2xl font-extrabold text-brand-blue">
                  {firstScore.overall}
                </div>
                <p className="text-xs text-stone-600 dark:text-stone-300">
                  {firstScore.verdict}
                </p>
              </div>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Every piece you submit lands in <span className="font-semibold">History</span>,
                scored the same way, so you can track whether you&rsquo;re actually improving.
              </p>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                That score came from our <span className="font-semibold">Strict</span> default —
                a demanding, specific read. Prefer something gentler while you warm up? Change it
                any time in <span className="font-semibold">Settings → Analyzer</span>.
              </p>
              <button
                onClick={finish}
                className="self-end rounded-md bg-brand-yellow px-5 py-2 text-xs font-semibold text-on-accent hover:bg-brand-yellow-dark"
              >
                Go to dashboard
              </button>
            </div>
          )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
