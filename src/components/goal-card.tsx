"use client";

import { useState } from "react";
import { goalProgress, PERIOD_WORDS } from "@/lib/goals";
import { GOAL_PERIOD_LABELS, type Entry, type GoalPeriod } from "@/lib/types";

const PERIODS: GoalPeriod[] = ["day", "week", "month"];
const MIN_TARGET = 40;
const MAX_TARGET = 100;

const joined =
  "flex divide-x divide-stone-300 overflow-hidden rounded-md border border-stone-300 dark:divide-stone-700 dark:border-stone-700";

/**
 * A score goal: pick a day, week or month and the average score to aim for.
 * Progress is the average of everything submitted so far in that period.
 */
export function GoalCard({
  entries,
  period,
  target,
  signedIn,
  onSave,
}: {
  entries: Entry[];
  period: GoalPeriod;
  target: number | null;
  signedIn: boolean;
  onSave: (period: GoalPeriod, target: number | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draftPeriod, setDraftPeriod] = useState<GoalPeriod>(period);
  const [draftTarget, setDraftTarget] = useState(target ?? 80);

  function startEditing() {
    setDraftPeriod(period);
    setDraftTarget(target ?? 80);
    setEditing(true);
  }

  const { average, count } = goalProgress(entries, period);
  const met = target !== null && average !== null && average >= target;

  return (
    <div className="rounded-xl border border-stone-200 p-3.5 dark:border-stone-800">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[10px] font-bold uppercase leading-tight tracking-wide text-stone-500 dark:text-stone-400">
          {target !== null && !editing ? `${PERIOD_WORDS[period].adj} goal` : "Score goal"}
        </h2>
        {!editing && (
          <button
            type="button"
            onClick={startEditing}
            className="rounded-md border border-stone-300 px-2.5 py-1 text-[11px] font-semibold text-stone-600 transition-colors hover:bg-stone-100 hover:text-stone-900 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800 dark:hover:text-stone-50"
          >
            {target === null ? "Set a goal" : "Edit"}
          </button>
        )}
      </div>

      {editing ? (
        <div className="mt-3 flex flex-col gap-3">
          <p className="text-xs text-stone-500 dark:text-stone-400">
            Aim for an average score of&hellip;
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <div className={joined}>
              <button
                type="button"
                aria-label="Lower the target"
                onClick={() => setDraftTarget((t) => Math.max(MIN_TARGET, t - 5))}
                className="h-8 w-9 text-base font-semibold text-stone-600 hover:bg-stone-200 hover:text-stone-900 dark:text-stone-300 dark:hover:bg-stone-700 dark:hover:text-stone-50"
              >
                &minus;
              </button>
              <span className="flex h-8 w-12 items-center justify-center text-sm font-bold tabular-nums text-ink dark:text-stone-100">
                {draftTarget}
              </span>
              <button
                type="button"
                aria-label="Raise the target"
                onClick={() => setDraftTarget((t) => Math.min(MAX_TARGET, t + 5))}
                className="h-8 w-9 text-base font-semibold text-stone-600 hover:bg-stone-200 hover:text-stone-900 dark:text-stone-300 dark:hover:bg-stone-700 dark:hover:text-stone-50"
              >
                +
              </button>
            </div>
            <span className="text-xs text-stone-500 dark:text-stone-400">per</span>
            <div className={joined}>
              {PERIODS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setDraftPeriod(p)}
                  className={`h-8 px-3 text-xs font-semibold transition-colors ${
                    draftPeriod === p
                      ? "bg-brand-yellow text-on-accent"
                      : "text-stone-600 hover:bg-stone-200 hover:text-stone-900 dark:text-stone-300 dark:hover:bg-stone-700 dark:hover:text-stone-50"
                  }`}
                >
                  {GOAL_PERIOD_LABELS[p]}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onSave(draftPeriod, draftTarget);
                setEditing(false);
              }}
              className="rounded-md bg-brand-yellow px-3.5 py-1.5 text-xs font-semibold text-on-accent transition-colors hover:bg-brand-yellow-dark"
            >
              Save goal
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-md border border-stone-300 px-3.5 py-1.5 text-xs font-semibold text-stone-600 transition-colors hover:bg-stone-100 hover:text-stone-900 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800 dark:hover:text-stone-50"
            >
              Cancel
            </button>
            {target !== null && (
              <button
                type="button"
                onClick={() => {
                  onSave(period, null);
                  setEditing(false);
                }}
                className="ml-auto text-xs font-semibold text-stone-500 hover:text-red-600 dark:text-stone-400"
              >
                Remove goal
              </button>
            )}
          </div>
          {!signedIn && (
            <p className="text-[11px] text-stone-400 dark:text-stone-500">
              Saved on this device. Create an account to keep your goal everywhere.
            </p>
          )}
        </div>
      ) : target === null ? (
        <p className="mt-2 text-xs text-stone-500 dark:text-stone-400">
          Pick a day, week or month and the average score you want to hit. We&rsquo;ll track it
          here.
        </p>
      ) : (
        <div className="mt-2.5 flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-sm font-bold text-ink dark:text-stone-100">
              {average === null ? "No entries yet" : `Average ${average}`}
              <span className="font-normal text-stone-500 dark:text-stone-400">
                {" "}
                of {target} goal
              </span>
            </p>
            <span
              className={`shrink-0 text-xs font-semibold ${
                met ? "text-brand-blue" : "text-stone-500 dark:text-stone-400"
              }`}
            >
              {average === null ? "Not started" : met ? "On goal ✓" : `${target - average} to go`}
            </span>
          </div>
          <div className="relative h-2 rounded-full bg-stone-200 dark:bg-stone-800">
            <div
              className={`h-full rounded-full transition-[width] duration-700 ease-out ${
                met ? "bg-brand-blue" : "bg-brand-grey"
              }`}
              style={{ width: `${average ?? 0}%` }}
            />
            <div
              className="absolute -top-1 h-4 w-0.5 rounded bg-brand-blue"
              style={{ left: `${target}%` }}
              aria-hidden
            />
          </div>
          <p className="text-[11px] text-stone-400 dark:text-stone-500">
            {count === 0
              ? `Submit something ${PERIOD_WORDS[period].now} to get on the board.`
              : `${count} ${count === 1 ? "entry" : "entries"} ${PERIOD_WORDS[period].now}.`}
          </p>
        </div>
      )}
    </div>
  );
}
