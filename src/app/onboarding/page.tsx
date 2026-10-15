"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
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

const STEP_COUNT = 4;

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [focus, setFocus] = useState<string[]>([]);
  const [customFocusInput, setCustomFocusInput] = useState("");
  const [warmup, setWarmup] = useState("");
  const [scoring, setScoring] = useState(false);
  const [firstScore, setFirstScore] = useState<ScoreResult | null>(null);

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

  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-50 px-6 dark:bg-stone-950">
      <div className="w-full max-w-md">
        <div className="mb-6 flex gap-1.5">
          {Array.from({ length: STEP_COUNT }).map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full ${
                i <= step ? "bg-brand-yellow" : "bg-stone-200 dark:bg-stone-800"
              }`}
            />
          ))}
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-8 dark:border-stone-800 dark:bg-stone-900">
          {step === 0 && (
            <div className="flex flex-col items-center gap-4 text-center">
              <Image src="/logo-mark.png" alt="Sucsynct" width={71} height={65} className="h-11 w-auto" priority />
              <h1 className="text-xl font-bold text-ink dark:text-stone-50">
                Tell better stories
              </h1>
              <p className="text-sm text-stone-500 dark:text-stone-400">
                Speak or write. We&rsquo;ll help the message land every time.
              </p>
              <ol className="w-full space-y-2 rounded-xl bg-stone-50 p-4 text-left text-xs text-stone-600 dark:bg-stone-950/50 dark:text-stone-300">
                <li className="flex gap-2">
                  <span className="font-bold text-brand-orange">1.</span>
                  Write or record a story, pitch, or answer — whatever you&rsquo;re working on.
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-brand-orange">2.</span>
                  Get scored on six things: clarity, structure, brevity, specificity, audience
                  fit, and voice.
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-brand-orange">3.</span>
                  See one strength and one concrete thing to fix — then try it again.
                </li>
              </ol>
              <button
                onClick={() => setStep(1)}
                className="mt-2 rounded-none btn-underline bg-brand-yellow px-5 py-2 text-xs font-semibold text-on-accent hover:bg-brand-yellow-dark"
              >
                Get started
              </button>
            </div>
          )}

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
                          ? "border-brand-orange bg-brand-orange/10 text-brand-orange"
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
                    className="rounded-full border border-brand-orange bg-brand-orange/10 px-3.5 py-1.5 text-xs font-semibold text-brand-orange"
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
                  className="flex-1 rounded-full border border-dashed border-stone-300 bg-transparent px-3.5 py-1.5 text-xs text-ink placeholder:text-stone-400 focus:border-brand-orange focus:outline-none dark:border-stone-700 dark:text-stone-100"
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
                className="self-end rounded-none btn-underline bg-brand-yellow px-5 py-2 text-xs font-semibold text-on-accent hover:bg-brand-yellow-dark disabled:cursor-not-allowed disabled:opacity-40"
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
                className="w-full resize-none rounded-xl border border-stone-300 bg-transparent p-3 text-sm text-ink placeholder:text-stone-400 focus:border-brand-orange focus:outline-none dark:border-stone-700 dark:text-stone-100"
              />
              <p className="text-xs text-stone-400 dark:text-stone-500">
                Type it here for now. In the full app you can also record your voice or upload
                audio, and it&rsquo;s transcribed so you can edit the text before it&rsquo;s scored.
              </p>
              <button
                onClick={handleCapture}
                disabled={!warmup.trim() || scoring}
                className="self-end rounded-none btn-underline bg-brand-yellow px-5 py-2 text-xs font-semibold text-on-accent hover:bg-brand-yellow-dark disabled:cursor-not-allowed disabled:opacity-40"
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
                <div className="text-2xl font-extrabold text-brand-orange">
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
                className="self-end rounded-none btn-underline bg-brand-yellow px-5 py-2 text-xs font-semibold text-on-accent hover:bg-brand-yellow-dark"
              >
                Go to dashboard
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
