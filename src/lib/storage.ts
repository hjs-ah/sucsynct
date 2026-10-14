"use client";

import { createClient } from "./supabase/client";
import type { Database, Json } from "./supabase/database-types";
import {
  DEFAULT_PREFERENCES,
  type AnalyzerStrictness,
  type Entry,
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
  };
}

function profileRowToPreferences(row: ProfileRow, email: string): Preferences {
  return {
    onboarded: row.onboarded,
    focus: row.focus,
    email,
    autoDeleteAudio: row.auto_delete_audio,
    analyzerStrictness: row.analyzer_strictness as AnalyzerStrictness,
  };
}

// --------------------------------------------------------------- public ----

export async function getEntries(): Promise<Entry[]> {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return localGetEntries();

  const { data, error } = await supabase
    .from("entries")
    .select("*")
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data.map(rowToEntry);
}

export async function getEntry(id: string): Promise<Entry | undefined> {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return localGetEntries().find((e) => e.id === id);

  const { data, error } = await supabase.from("entries").select("*").eq("id", id).maybeSingle();
  if (error || !data) return undefined;
  return rowToEntry(data);
}

/**
 * The very first entry ever saved — the benchmark story from onboarding
 * that every later score is compared against. getEntries() sorts
 * newest-first, so it's the last item.
 */
export async function getBenchmarkEntry(): Promise<Entry | undefined> {
  const entries = await getEntries();
  return entries[entries.length - 1];
}

export async function saveEntry(entry: Entry): Promise<void> {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    localSaveEntry(entry);
    return;
  }
  await supabase.from("entries").insert(entryToRow(entry, auth.user.id));
}

export async function getPreferences(): Promise<Preferences> {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return localGetPreferences();

  const { data } = await supabase.from("profiles").select("*").eq("id", auth.user.id).maybeSingle();
  if (!data) return { ...DEFAULT_PREFERENCES, email: auth.user.email ?? "" };
  return profileRowToPreferences(data, auth.user.email ?? "");
}

export async function savePreferences(update: Partial<Preferences>): Promise<Preferences> {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return localSavePreferences(update);

  const current = await getPreferences();
  const next = { ...current, ...update };
  await supabase
    .from("profiles")
    .update({
      onboarded: next.onboarded,
      focus: next.focus,
      auto_delete_audio: next.autoDeleteAudio,
      analyzer_strictness: next.analyzerStrictness,
    })
    .eq("id", auth.user.id);
  return next;
}

export async function clearAllData(): Promise<void> {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    localClearAllData();
    return;
  }
  await supabase.from("entries").delete().eq("user_id", auth.user.id);
  await supabase
    .from("profiles")
    .update({ onboarded: false, focus: [] })
    .eq("id", auth.user.id);
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
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return;

  const flag = `${MIGRATED_KEY}:${auth.user.id}`;
  if (window.localStorage.getItem(flag)) return;

  const localEntries = localGetEntries();
  const localPrefs = localGetPreferences();

  if (localEntries.length > 0) {
    const rows = localEntries.map((e) => entryToRow(e, auth.user!.id));
    await supabase.from("entries").insert(rows);
  }

  if (localPrefs.onboarded || localPrefs.focus.length > 0) {
    await supabase
      .from("profiles")
      .update({
        onboarded: localPrefs.onboarded,
        focus: localPrefs.focus,
        auto_delete_audio: localPrefs.autoDeleteAudio,
        analyzer_strictness: localPrefs.analyzerStrictness,
      })
      .eq("id", auth.user.id);
  }

  window.localStorage.setItem(flag, "1");
  localClearAllData();
}
