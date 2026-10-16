"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { migrateLocalDataToSupabase, resetStorageCache } from "@/lib/storage";

/**
 * Mounted once in the root layout. On first load — and whenever auth state
 * flips to signed-in (e.g. landing back from the email-confirmation link in
 * /auth/callback) — it migrates any guest data sitting in localStorage into
 * the new Supabase account. migrateLocalDataToSupabase() is idempotent
 * (it checks a per-user "already migrated" flag), so this is safe to fire
 * more often than strictly necessary.
 */
export function AuthSync() {
  useEffect(() => {
    const supabase = createClient();

    migrateLocalDataToSupabase();

    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      // A different person may now be signed in: drop anything cached in memory.
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") resetStorageCache();
      if (event === "SIGNED_IN") {
        migrateLocalDataToSupabase();
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  return null;
}
