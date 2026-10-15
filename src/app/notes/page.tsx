"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { NavBar } from "@/components/nav-bar";
import { mockScore } from "@/lib/rubric";

const DRAFT_KEY = "sucsynct:draft-text";

/**
 * The deliberately low-ceremony sibling of /new: no audience/goal fields, no
 * self-score guess, no save-to-History, no strictness setting — just "get
 * your gut-check read on a half-formed story." Nothing here persists unless
 * the person explicitly promotes it to a full entry, so it stays safe to
 * use for throwaway drafts and fragments without cluttering History.
 */
export default function NotesPage() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [read, setRead] = useState<{ strength: string; opportunity: string } | null>(null);

  function handleAssess() {
    if (!text.trim()) return;
    // A client-side mock read only — this is meant to feel instant and
    // low-stakes, not like a real submission. Full scoring (and the option
    // to use the real Claude-backed analyzer) happens after "Make it a full
    // entry" below.
    const scored = mockScore(text, "moderate");
    setRead({ strength: scored.strength, opportunity: scored.opportunity });
  }

  function handlePromote() {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(DRAFT_KEY, text);
    }
    router.push("/new");
  }

  return (
    <div className="min-h-screen">
      <NavBar />
      <main className="mx-auto max-w-2xl px-6 py-10">
        <h1 className="mb-1 text-xl font-bold text-ink dark:text-stone-50">
          Quick notes
        </h1>
        <p className="mb-6 text-sm text-stone-500 dark:text-stone-400">
          Jot down a story while it&rsquo;s still half-formed. Get a quick read on what&rsquo;s
          missing — no score, nothing saved to History, no pressure.
        </p>

        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setRead(null);
          }}
          rows={10}
          placeholder="Dump a rough version here — a few sentences is plenty..."
          className="w-full resize-none rounded-xl border border-stone-300 bg-transparent p-4 text-sm text-ink placeholder:text-stone-400 focus:border-brand-blue focus:outline-none dark:border-stone-700 dark:text-stone-100"
        />

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={handleAssess}
            disabled={!text.trim()}
            className="flex h-[34px] items-center justify-center rounded-none btn-underline bg-brand-yellow px-3.5 text-xs font-semibold text-on-accent hover:bg-brand-yellow-dark disabled:cursor-not-allowed disabled:opacity-40"
          >
            Get a quick read
          </button>
          <button
            onClick={handlePromote}
            disabled={!text.trim()}
            className="flex h-[34px] items-center justify-center rounded-none btn-underline px-3.5 text-xs font-semibold text-stone-700 disabled:cursor-not-allowed disabled:opacity-40 dark:text-stone-300"
          >
            Full analysis
          </button>
        </div>

        {read && (
          <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div className="rounded-lg border border-brand-blue/30 bg-brand-blue/10 text-brand-blue-dark dark:text-brand-blue-dark p-3 text-xs">
              <span className="font-bold">Working</span> — {read.strength}
            </div>
            <div className="rounded-lg border border-stone-300 bg-stone-100 text-stone-700 dark:border-stone-700 dark:bg-stone-800/60 dark:text-stone-300 p-3 text-xs">
              <span className="font-bold">Missing</span> — {read.opportunity}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
