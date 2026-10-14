import type { ScoreResult } from "@/lib/types";
import { AnimatedBar } from "./animated-bar";

export function LanguageMechanics({ scores }: { scores: ScoreResult }) {
  const hasFillers = scores.fillerWords.length > 0;
  const hasJargon = scores.jargon.length > 0;

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-xs font-bold uppercase tracking-wide text-stone-500 dark:text-stone-400">
        Language mechanics
      </h2>

      <AnimatedBar
        label="Active voice"
        value={scores.activeVoicePercent}
        suffix="%"
        colorFor={() => "bg-brand-orange"}
      />

      <div className="flex flex-wrap items-center gap-2">
        <span className="w-32 shrink-0 text-xs text-stone-500 dark:text-stone-400">Filler words</span>
        {hasFillers ? (
          scores.fillerWords.map((f) => (
            <span
              key={f.word}
              className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs text-stone-600 dark:bg-stone-800 dark:text-stone-300"
            >
              &ldquo;{f.word}&rdquo; &times;{f.count}
            </span>
          ))
        ) : (
          <span className="text-xs text-stone-400 dark:text-stone-500">none detected</span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="w-32 shrink-0 text-xs text-stone-500 dark:text-stone-400">Jargon flagged</span>
        {hasJargon ? (
          scores.jargon.map((term) => (
            <span
              key={term}
              className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs text-amber-700 dark:bg-amber-950 dark:text-amber-400"
            >
              &ldquo;{term}&rdquo;
            </span>
          ))
        ) : (
          <span className="text-xs text-stone-400 dark:text-stone-500">none detected</span>
        )}
      </div>
    </div>
  );
}
