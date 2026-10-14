import { DIMENSION_LABELS, DIMENSION_ORDER, type ScoreResult } from "@/lib/types";
import { AnimatedBar } from "./animated-bar";

export function ScoreBars({ scores }: { scores: ScoreResult }) {
  return (
    <div className="flex flex-col gap-2.5">
      {DIMENSION_ORDER.map((dim) => (
        <AnimatedBar key={dim} label={DIMENSION_LABELS[dim]} value={scores.dimensions[dim]} />
      ))}
    </div>
  );
}
