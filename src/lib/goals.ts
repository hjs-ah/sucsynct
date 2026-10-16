import type { Entry, GoalPeriod } from "./types";

/** Start of the current day / week (Monday) / month, in local time. */
export function periodStart(period: GoalPeriod, now = new Date()): Date {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (period === "week") d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  if (period === "month") d.setDate(1);
  return d;
}

export const PERIOD_WORDS: Record<GoalPeriod, { adj: string; now: string }> = {
  day: { adj: "Daily", now: "today" },
  week: { adj: "Weekly", now: "this week" },
  month: { adj: "Monthly", now: "this month" },
};

/** Average score and entry count for everything submitted in the current period. */
export function goalProgress(entries: Entry[], period: GoalPeriod) {
  const from = periodStart(period).getTime();
  const inPeriod = entries.filter((e) => new Date(e.createdAt).getTime() >= from);
  if (inPeriod.length === 0) return { average: null as number | null, count: 0 };
  const total = inPeriod.reduce((sum, e) => sum + e.scores.overall, 0);
  return { average: Math.round(total / inPeriod.length), count: inPeriod.length };
}
