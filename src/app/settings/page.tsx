"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AnalyzerSelector } from "@/components/analyzer-selector";
import { NavBar } from "@/components/nav-bar";
import { ThemeToggle } from "@/components/theme-toggle";
import { TourOverlay, type TourStep } from "@/components/tour";
import { clearAllData, getPreferences, savePreferences } from "@/lib/storage";
import { resetTours } from "@/lib/tours";
import {
  STRICTNESS_DESCRIPTIONS,
  type AnalyzerStrictness,
  type Preferences,
} from "@/lib/types";

const SETTINGS_TOUR: TourStep[] = [
  {
    targetId: "tour-account-settings",
    title: "Sync across devices",
    body: "Sign in here to carry your stories to another device — otherwise everything stays local to this browser.",
  },
  {
    targetId: "tour-analyzer-settings",
    title: "Tune the feedback",
    body: "Lite, Moderate, or Strict — this controls how hard the analyzer leans on every piece you submit.",
  },
];

export default function SettingsPage() {
  const router = useRouter();
  const [prefs, setPrefs] = useState<Preferences | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [toursReset, setToursReset] = useState(false);
  const [newFocusInput, setNewFocusInput] = useState("");

  useEffect(() => {
    let cancelled = false;
    getPreferences().then((data) => {
      if (!cancelled) setPrefs(data);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function updateAutoDelete(value: boolean) {
    const next = await savePreferences({ autoDeleteAudio: value });
    if (next) setPrefs(next);
  }

  async function updateStrictness(value: AnalyzerStrictness) {
    const next = await savePreferences({ analyzerStrictness: value });
    if (next) setPrefs(next);
  }

  async function addFocus() {
    const value = newFocusInput.trim();
    if (!value || !prefs) return;
    if (prefs.focus.includes(value)) {
      setNewFocusInput("");
      return;
    }
    const next = await savePreferences({ focus: [...prefs.focus, value] });
    if (next) setPrefs(next);
    setNewFocusInput("");
  }

  async function removeFocus(value: string) {
    if (!prefs) return;
    const next = await savePreferences({ focus: prefs.focus.filter((f) => f !== value) });
    if (next) setPrefs(next);
  }

  async function handleClear() {
    if (!confirmClear) {
      setConfirmClear(true);
      return;
    }
    await clearAllData();
    router.replace("/onboarding");
  }

  if (!prefs) return null;

  return (
    <div className="min-h-screen">
      <NavBar />
      <main className="mx-auto max-w-2xl px-6 py-10">
        <h1 className="mb-8 text-xl font-bold text-ink dark:text-stone-50">Settings</h1>

        <section className="mt-6 border-t border-stone-200 pt-6 dark:border-stone-800">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-stone-500 dark:text-stone-400">
            Appearance
          </h2>
          <div className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-ink dark:text-stone-100">Theme</p>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Defaults to your system setting.
                </p>
              </div>
              <ThemeToggle />
            </div>
          </div>
        </section>

        <section className="mt-6 border-t border-stone-200 pt-6 dark:border-stone-800">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-stone-500 dark:text-stone-400">
            Guided tour
          </h2>
          <div className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-ink dark:text-stone-100">
                  Replay the first-visit walkthroughs
                </p>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  They&rsquo;ll pop up again the next time you visit Home, New entry, History, or
                  here.
                </p>
              </div>
              <button
                onClick={() => {
                  resetTours();
                  setToursReset(true);
                }}
                className="shrink-0 rounded-none btn-underline px-2.5 py-1.5 text-xs font-semibold text-stone-600 dark:text-stone-300"
              >
                {toursReset ? "Reset" : "Replay tours"}
              </button>
            </div>
          </div>
        </section>

        <section id="tour-account-settings" className="mt-6 border-t border-stone-200 pt-6 dark:border-stone-800">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-stone-500 dark:text-stone-400">
            Account
          </h2>
          <div className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
            <p className="mb-3 text-sm text-ink dark:text-stone-100">
              {prefs.email || "Signed out — stories are saved on this device only."}
            </p>
            <div className="mb-3 flex flex-wrap gap-1.5">
              {prefs.focus.length > 0 ? (
                prefs.focus.map((f) => (
                  <button
                    key={f}
                    onClick={() => removeFocus(f)}
                    title="Remove"
                    className="rounded-full border border-stone-300 px-3 py-1 text-xs font-semibold text-stone-600 hover:border-red-300 hover:text-red-500 dark:border-stone-700 dark:text-stone-300"
                  >
                    {f} &times;
                  </button>
                ))
              ) : (
                <p className="text-xs text-stone-500 dark:text-stone-400">No focus areas set.</p>
              )}
            </div>
            <div className="mb-3 flex gap-2">
              <input
                value={newFocusInput}
                onChange={(e) => setNewFocusInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addFocus();
                  }
                }}
                placeholder="Add a focus area…"
                className="flex-1 rounded-full border border-dashed border-stone-300 bg-transparent px-3 py-1 text-xs text-ink placeholder:text-stone-400 focus:border-brand-blue focus:outline-none dark:border-stone-700 dark:text-stone-100"
              />
              <button
                type="button"
                onClick={addFocus}
                disabled={!newFocusInput.trim()}
                className="shrink-0 rounded-full border border-stone-300 px-3 py-1 text-xs font-semibold text-stone-600 hover:border-stone-400 disabled:cursor-not-allowed disabled:opacity-40 dark:border-stone-700 dark:text-stone-300"
              >
                Add
              </button>
            </div>
            {!prefs.email && (
              <Link href="/signup" className="text-xs font-semibold text-brand-blue">
                Create an account to sync across devices
              </Link>
            )}
          </div>
        </section>

        <section id="tour-analyzer-settings" className="mt-6 border-t border-stone-200 pt-6 dark:border-stone-800">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-stone-500 dark:text-stone-400">
            Analyzer
          </h2>
          <div className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
            <p className="mb-1 text-sm font-medium text-ink dark:text-stone-100">
              Feedback strictness
            </p>
            <p className="mb-3 text-xs text-stone-500 dark:text-stone-400">
              How hard the analyzer leans on your scores and feedback.
            </p>
            <AnalyzerSelector value={prefs.analyzerStrictness} onChange={updateStrictness} />
            <p className="mt-3 text-xs text-stone-500 dark:text-stone-400">
              {STRICTNESS_DESCRIPTIONS[prefs.analyzerStrictness]}
            </p>
          </div>
        </section>

        <section className="mt-6 border-t border-stone-200 pt-6 dark:border-stone-800">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-stone-500 dark:text-stone-400">
            Privacy
          </h2>
          <div className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
            <label className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-ink dark:text-stone-100">
                  Auto-delete audio after transcription
                </p>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Keeps only the text and your scores. Recordings are never saved to your account.
                </p>
              </div>
              <input
                type="checkbox"
                checked={prefs.autoDeleteAudio}
                onChange={(e) => updateAutoDelete(e.target.checked)}
                className="h-5 w-5 accent-brand-blue"
              />
            </label>
            <button
              disabled
              title="Coming soon"
              className="mt-4 text-xs font-semibold text-brand-blue opacity-50"
            >
              Export my data
            </button>
          </div>
        </section>

        <section className="mt-6 border-t border-stone-200 pt-6 dark:border-stone-800">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-red-500">
            Danger zone
          </h2>
          <div className="rounded-2xl border border-red-200 bg-red-50/50 p-5 dark:border-red-900 dark:bg-red-950/20">
            <p className="mb-3 text-sm text-stone-700 dark:text-stone-300">
              Deletes every entry and preference stored on this device.
            </p>
            <button
              onClick={handleClear}
              className="rounded-none btn-underline border border-red-300 px-3.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 dark:border-red-800 dark:hover:bg-red-950/40"
            >
              {confirmClear ? "Click again to confirm" : "Delete account & data"}
            </button>
          </div>
        </section>
      </main>
      <TourOverlay tourId="settings" steps={SETTINGS_TOUR} />
    </div>
  );
}
