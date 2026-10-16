"use client";

import { createClient } from "./supabase/client";
import type { Database, Json } from "./supabase/database-types";
import {
  DEFAULT_PREFERENCES,
  type AnalyzerStrictness,
  type Entry,
  type GoalPeriod,
  type Mode,
  type Preferences,
  type ScoreResult,
} from "./types";

// Hybrid storage: when the visitor is signed in (a real Supabase session
// exists), entries and preferences live in Postgres behind RLS. When
// they're not signed in, everything lives in localStorage on this device so
// the app still works fully for a guest. `migrateLocalDataToSupabase()`
// below moves a guest's local data into their account the first time they
// sign in.

const ENTRIES_KEY = "sucsynct:entries";
const PREFS_KEY = "sucsynct:prefs";
const MIGRATED_KEY = "sucsynct:migrated";
const TOURS_SEEN_KEY = "sucsynct:tours-seen";

function localGetSeenTours(): string[] {
  if (!isBrowser()) return [];
  try {
    return JSON.parse(window.localStorage.getItem(TOURS_SEEN_KEY) ?? "[]") as string[];
  } catch {
    return [];
  }
}

// Old key prefix from when the app was called TellSync. Renamed the
// product, not the storage format, so we carry over anyone's existing
// on-device guest data the first time they load the app post-rename
// instead of silently losing it.
const LEGACY_ENTRIES_KEY = "tellsync:entries";
const LEGACY_PREFS_KEY = "tellsync:prefs";
let legacyKeysMigrated = false;

function migrateLegacyLocalKeys() {
  if (!isBrowser() || legacyKeysMigrated) return;
  legacyKeysMigrated = true;
  try {
    if (
      window.localStorage.getItem(LEGACY_ENTRIES_KEY) &&
      !window.localStorage.getItem(ENTRIES_KEY)
    ) {
      window.localStorage.setItem(ENTRIES_KEY, window.localStorage.getItem(LEGACY_ENTRIES_KEY)!);
    }
    if (
      window.localStorage.getItem(LEGACY_PREFS_KEY) &&
      !window.localStorage.getItem(PREFS_KEY)
    ) {
      window.localStorage.setItem(PREFS_KEY, window.localStorage.getItem(LEGACY_PREFS_KEY)!);
    }
    window.localStorage.removeItem(LEGACY_ENTRIES_KEY);
    window.localStorage.removeItem(LEGACY_PREFS_KEY);
  } catch {
    // ignore — worst case, legacy data just stays under the old key
  }
}

type EntryRow = Database["public"]["Tables"]["entries"]["Row"];
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

function isBrowser() {
  return typeof window !== "undefined";
}

export function makeId() {
  if (isBrowser() && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID — still shaped
  // like a UUID so it's valid for Supabase's `uuid` columns if this ever
  // gets synced.
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ---------------------------------------------------------------- local ----

function localGetEntries(): Entry[] {
  if (!isBrowser()) return [];
  migrateLegacyLocalKeys();
  try {
    const raw = window.localStorage.getItem(ENTRIES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Entry[];
    return parsed.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  } catch {
    return [];
  }
}

function localSaveEntry(entry: Entry) {
  if (!isBrowser()) return;
  const entries = localGetEntries();
  entries.unshift(entry);
  window.localStorage.setItem(ENTRIES_KEY, JSON.stringify(entries));
}

function localGetPreferences(): Preferences {
  if (!isBrowser()) return DEFAULT_PREFERENCES;
  migrateLegacyLocalKeys();
  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_PREFERENCES;
    return { ...DEFAULT_PREFERENCES, ...(JSON.parse(raw) as Partial<Preferences>) };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

function localSavePreferences(update: Partial<Preferences>): Preferences {
  if (!isBrowser()) return DEFAULT_PREFERENCES;
  const next = { ...localGetPreferences(), ...update };
  window.localStorage.setItem(PREFS_KEY, JSON.stringify(next));
  return next;
}

function localClearAllData() {
  if (!isBrowser()) return;
  window.localStorage.removeItem(ENTRIES_KEY);
  window.localStorage.removeItem(PREFS_KEY);
}

// -------------------------------------------------------------- mapping ----

function rowToEntry(row: EntryRow): Entry {
  return {
    id: row.id,
    createdAt: row.created_at,
    mode: row.mode as Mode,
    audience: row.audience,
    goal: row.goal,
    text: row.story_text,
    scores: row.scores as unknown as ScoreResult,
    selfScore: row.self_score ?? undefined,
    durationSeconds: row.duration_seconds ?? undefined,
  };
}

function entryToRow(entry: Entry, userId: string) {
  return {
    id: entry.id,
    user_id: userId,
    created_at: entry.createdAt,
    mode: entry.mode,
    audience: entry.audience,
    goal: entry.goal,
    story_text: entry.text,
    scores: entry.scores as unknown as Json,
    self_score: entry.selfScore ?? null,
    duration_seconds: entry.durationSeconds ?? null,
  };
}

function profileRowToPreferences(row: ProfileRow, email: string): Preferences {
  return {
    onboarded: row.onboarded,
    toursSeen: row.tours_seen ?? [],
    goalPeriod: (row.goal_period as GoalPeriod) ?? "week",
    goalTarget: row.goal_target ?? null,
    focus: row.focus,
    email,
    autoDeleteAudio: row.auto_delete_audio,
    analyzerStrictness: row.analyzer_strictness as AnalyzerStrictness,
  };
}

// --------------------------------------------------------------- public ----

// Auth + data reads used to make several network round trips per page
// (getUser() calls Supabase every time). We now read the session from the
// local cookie/storage (instant; row-level security still enforces access on
// the server) and keep the last results in memory, so moving between pages
// can paint immediately and refresh in the background.

async function currentUser() {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  return { supabase, user: data.session?.user ?? null };
}

let entriesCache: Entry[] | null = null;
let entriesInflight: Promise<Entry[]> | null = null;
let prefsCache: Preferences | null = null;

/** Last-known entries, or null if none have been loaded yet this visit. */
export function peekEntries(): Entry[] | null {
  return entriesCache;
}

/** Last-known preferences, or null if none have been loaded yet this visit. */
export function peekPreferences(): Preferences | null {
  return prefsCache;
}

/** Forget everything in memory (call on sign-out / account switch). */
export function resetStorageCache() {
  entriesCache = null;
  entriesInflight = null;
  prefsCache = null;
}

export async function getEntries(): Promise<Entry[]> {
  if (entriesInflight) return entriesInflight;
  entriesInflight = (async () => {
    try {
      const { supabase, user } = await currentUser();
      if (!user) {
        entriesCache = localGetEntries();
        return entriesCache;
      }
      const { data, error } = await supabase
        .from("entries")
        .select("*")
        .order("created_at", { ascending: false });
      if (error || !data) return entriesCache ?? [];
      entriesCache = data.map(rowToEntry);
      return entriesCache;
    } finally {
      entriesInflight = null;
    }
  })();
  return entriesInflight;
}

export async function getEntry(id: string): Promise<Entry | undefined> {
  const cached = entriesCache?.find((e) => e.id === id);
  if (cached) return cached;
  const { supabase, user } = await currentUser();
  if (!user) return localGetEntries().find((e) => e.id === id);

  const { data, error } = await supabase.from("entries").select("*").eq("id", id).maybeSingle();
  if (error || !data) return undefined;
  return rowToEntry(data);
}

/**
 * The very first entry ever saved — the benchmark story from onboarding
 * that every later score is compared against. Entries are newest-first, so
 * it's the last item.
 */
export async function getBenchmarkEntry(): Promise<Entry | undefined> {
  const entries = await getEntries();
  return entries[entries.length - 1];
}

export async function saveEntry(entry: Entry): Promise<void> {
  const { supabase, user } = await currentUser();
  if (!user) {
    localSaveEntry(entry);
  } else {
    await supabase.from("entries").insert(entryToRow(entry, user.id));
  }
  entriesCache = [entry, ...(entriesCache ?? [])].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export async function getPreferences(): Promise<Preferences> {
  const { supabase, user } = await currentUser();
  if (!user) {
    prefsCache = localGetPreferences();
    return prefsCache;
  }

  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  prefsCache = data
    ? profileRowToPreferences(data, user.email ?? "")
    : { ...DEFAULT_PREFERENCES, email: user.email ?? "" };
  return prefsCache;
}

export async function savePreferences(update: Partial<Preferences>): Promise<Preferences> {
  const { supabase, user } = await currentUser();
  if (!user) {
    prefsCache = localSavePreferences(update);
    return prefsCache;
  }

  const current = prefsCache ?? (await getPreferences());
  const next = { ...current, ...update };
  prefsCache = next;
  await supabase
    .from("profiles")
    .update({
      onboarded: next.onboarded,
      tours_seen: next.toursSeen,
      goal_period: next.goalPeriod,
      goal_target: next.goalTarget,
      focus: next.focus,
      auto_delete_audio: next.autoDeleteAudio,
      analyzer_strictness: next.analyzerStrictness,
    })
    .eq("id", user.id);
  return next;
}

export async function clearAllData(): Promise<void> {
  const { supabase, user } = await currentUser();
  if (!user) {
    localClearAllData();
  } else {
    await supabase.from("entries").delete().eq("user_id", user.id);
    await supabase.from("profiles").update({ onboarded: false, focus: [] }).eq("id", user.id);
  }
  resetStorageCache();
}

/**
 * Called once after a successful sign-in. If this device has guest entries
 * sitting in localStorage that haven't been migrated for this user yet,
 * copies them into Supabase (and merges local prefs into the profile row
 * Supabase already created via the on-signup trigger), then clears local
 * storage so the device switches over to reading from Supabase going
 * forward. Safe to call on every sign-in — it's a no-op after the first.
 */
export async function migrateLocalDataToSupabase(): Promise<void> {
  if (!isBrowser()) return;
  const { supabase, user } = await currentUser();
  if (!user) return;

  const flag = `${MIGRATED_KEY}:${user.id}`;
  if (window.localStorage.getItem(flag)) return;

  const localEntries = localGetEntries();
  const localPrefs = localGetPreferences();

  if (localEntries.length > 0) {
    const rows = localEntries.map((e) => entryToRow(e, user.id));
    await supabase.from("entries").insert(rows);
  }

  if (localPrefs.onboarded || localPrefs.focus.length > 0) {
    await supabase
      .from("profiles")
      .update({
        onboarded: localPrefs.onboarded,
        tours_seen: localGetSeenTours(),
        goal_period: localPrefs.goalPeriod,
        goal_target: localPrefs.goalTarget,
        focus: localPrefs.focus,
        auto_delete_audio: localPrefs.autoDeleteAudio,
        analyzer_strictness: localPrefs.analyzerStrictness,
      })
      .eq("id", user.id);
  }

  window.localStorage.setItem(flag, "1");
  localClearAllData();
  resetStorageCache();
}
