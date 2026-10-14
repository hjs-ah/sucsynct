import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./database-types";

/**
 * Supabase client for use in Server Components, Server Actions, and Route
 * Handlers. `cookies()` is async in this Next.js version, so this function
 * is async too — callers must `await createClient()`.
 *
 * Server Components can't write cookies, so the `setAll` call below is
 * wrapped in a try/catch: it throws harmlessly there and is a no-op, while
 * the session is still refreshed for real by `proxy.ts` on every request.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component — ignore; proxy.ts refreshes
            // the session cookie on every request instead.
          }
        },
      },
    },
  );
}
