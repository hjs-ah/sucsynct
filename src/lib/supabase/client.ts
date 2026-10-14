"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database-types";

/**
 * Supabase client for use in Client Components. Safe to call repeatedly —
 * each call returns a fresh client bound to the browser's cookies, which is
 * the pattern @supabase/ssr expects (it does not mean a new network
 * connection).
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
