"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LogInIcon, LogOutIcon } from "@/components/icons";
import { createClient } from "@/lib/supabase/client";

/** Sign out (or Sign in, for guests) — shown at the bottom of the home page. */
export function SignOutButton() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);

  async function handleSignOut() {
    await createClient().auth.signOut();
    router.push("/login");
  }

  if (email === undefined) return <div className="h-8" />;

  return email ? (
    <div className="flex flex-col items-center gap-1 text-center">
      <button
        type="button"
        onClick={handleSignOut}
        className="flex items-center gap-2 rounded-md border border-stone-300 dark:border-stone-700 px-3.5 py-1.5 text-xs font-semibold text-stone-600 dark:text-stone-300"
      >
        <LogOutIcon className="h-4 w-4 shrink-0" />
        Sign out
      </button>
      <span className="max-w-full truncate text-xs text-stone-400 dark:text-stone-500">{email}</span>
    </div>
  ) : (
    <div className="flex justify-center">
      <Link
        href="/login"
        className="flex items-center gap-2 rounded-md border border-stone-300 dark:border-stone-700 px-3.5 py-1.5 text-xs font-semibold text-stone-600 dark:text-stone-300"
      >
        <LogInIcon className="h-4 w-4 shrink-0" />
        Sign in
      </Link>
    </div>
  );
}
