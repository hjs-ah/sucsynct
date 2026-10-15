import type { ScoreResult } from "@/lib/types";

export function StrengthOpportunity({ scores }: { scores: ScoreResult }) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      <div className="rounded-lg border border-green-200 bg-green-50 p-2.5 text-xs text-green-800 dark:border-green-900 dark:bg-green-950/40 dark:text-green-400">
        <span className="font-bold">Strength</span> — {scores.strength}
      </div>
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-400">
        <span className="font-bold">How to improve</span> — {scores.opportunity}
      </div>
    </div>
  );
}
