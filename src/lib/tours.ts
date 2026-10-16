"use client";

// Tracks which guided tours a visitor has already seen. Kept in localStorage
// for instant checks, and mirrored to the signed-in account's profile so a
// returning user on a new browser or device isn't walked through them again.

import { getPreferences, savePreferences } from "./storage";

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

/**
 * Like hasSeenTour, but for a signed-in account also checks the list saved
 * on their profile — so logging in on a new browser or device doesn't replay
 * tours they've already been through. Anything found there is remembered
 * locally too.
 */
export async function hasSeenTourForAccount(id: string): Promise<boolean> {
  if (readSeen().includes(id)) return true;
  try {
    const prefs = await getPreferences();
    if (prefs.toursSeen.includes(id)) {
      markSeenLocally(id);
      return true;
    }
  } catch {
    // fall through: show the tour rather than hide it on an error
  }
  return false;
}

function markSeenLocally(id: string) {
  if (!isBrowser()) return;
  const seen = readSeen();
  if (seen.includes(id)) return;
  try {
    window.localStorage.setItem(SEEN_KEY, JSON.stringify([...seen, id]));
  } catch {
    // ignore — worst case the tour just plays again next time
  }
}

export function markTourSeen(id: string): void {
  markSeenLocally(id);
  // Also remember it on the account (no-op for guests beyond localStorage).
  void (async () => {
    try {
      const prefs = await getPreferences();
      if (!prefs.toursSeen.includes(id)) {
        await savePreferences({ toursSeen: [...prefs.toursSeen, id] });
      }
    } catch {
      // best effort
    }
  })();
}

/** Lets someone replay every guided tour — surfaced as a link in Settings. */
export function resetTours(): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(SEEN_KEY);
  } catch {
    // ignore
  }
  void savePreferences({ toursSeen: [] });
}
