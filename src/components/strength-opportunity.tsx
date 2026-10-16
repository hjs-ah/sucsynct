import type { ScoreResult } from "@/lib/types";

export function StrengthOpportunity({ scores }: { scores: ScoreResult }) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      <div className="rounded-lg border border-brand-blue/30 bg-brand-blue/10 text-brand-blue-dark dark:text-brand-blue-dark p-2.5 text-xs">
        <span className="font-bold">Strength</span> — {scores.strength}
      </div>
      <div className="rounded-lg border border-stone-300 bg-stone-100 text-stone-700 dark:border-stone-700 dark:bg-stone-800/60 dark:text-stone-300 p-2.5 text-xs">
        <span className="font-bold">Opportunity</span> — {scores.opportunity}
      </div>
    </div>
  );
}
