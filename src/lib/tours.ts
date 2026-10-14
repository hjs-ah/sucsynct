"use client";

// Tracks which guided tours a visitor has already seen, per device. This is
// deliberately local-only (not synced through Supabase) — missing a seen
// flag on a new device just means the tour plays once more there, which is
// a fine fallback for a cosmetic feature and avoids another schema change.

function isBrowser() {
  return typeof window !== "undefined";
}

const SEEN_KEY = "sucsynct:tours-seen";

function readSeen(): string[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(SEEN_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function hasSeenTour(id: string): boolean {
  return readSeen().includes(id);
}

export function markTourSeen(id: string): void {
  if (!isBrowser()) return;
  const seen = readSeen();
  if (seen.includes(id)) return;
  try {
    window.localStorage.setItem(SEEN_KEY, JSON.stringify([...seen, id]));
  } catch {
    // ignore — worst case the tour just plays again next time
  }
}

/** Lets someone replay every guided tour — surfaced as a link in Settings. */
export function resetTours(): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(SEEN_KEY);
  } catch {
    // ignore
  }
}
