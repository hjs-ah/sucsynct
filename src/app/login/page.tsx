"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { migrateLocalDataToSupabase } from "@/lib/storage";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      setError(signInError.message);
      setSubmitting(false);
      return;
    }

    await migrateLocalDataToSupabase();
    router.replace("/");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-50 px-6 dark:bg-stone-950">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <Image src="/logo-mark-v3.png" alt="Sucsynct" width={236} height={200} className="h-10 w-auto dark:brightness-150" priority />
          <h1 className="text-lg font-bold text-ink dark:text-stone-50">Welcome back</h1>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-8 dark:border-stone-800 dark:bg-stone-900">
          <div className="mb-5 flex flex-col gap-2">
            <button
              type="button"
              disabled
              title="Google sign-in is coming soon — needs a one-time setup in the Supabase dashboard"
              className="flex h-[34px] cursor-not-allowed items-center justify-center gap-2 rounded-none btn-underline text-xs font-semibold text-stone-400 dark:text-stone-600"
            >
              Continue with Google
              <span className="text-[10px] font-bold uppercase tracking-wide text-stone-400 dark:text-stone-600">
                soon
              </span>
            </button>
            <button
              type="button"
              disabled
              title="Apple sign-in is coming soon — needs a one-time setup in the Supabase dashboard"
              className="flex h-[34px] cursor-not-allowed items-center justify-center gap-2 rounded-none btn-underline text-xs font-semibold text-stone-400 dark:text-stone-600"
            >
              Continue with Apple
              <span className="text-[10px] font-bold uppercase tracking-wide text-stone-400 dark:text-stone-600">
                soon
              </span>
            </button>
          </div>

          <div className="mb-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-stone-200 dark:bg-stone-800" />
            <span className="text-xs text-stone-400 dark:text-stone-500">or</span>
            <div className="h-px flex-1 bg-stone-200 dark:bg-stone-800" />
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="w-full rounded-lg border border-stone-300 bg-transparent px-3 py-2.5 text-sm text-ink placeholder:text-stone-400 focus:border-brand-orange focus:outline-none dark:border-stone-700 dark:text-stone-100"
            />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full rounded-lg border border-stone-300 bg-transparent px-3 py-2.5 text-sm text-ink placeholder:text-stone-400 focus:border-brand-orange focus:outline-none dark:border-stone-700 dark:text-stone-100"
            />
            {error && <p className="text-xs text-red-500">{error}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="mt-1 flex h-9 w-full items-center justify-center rounded-none btn-underline bg-brand-yellow text-xs font-semibold text-on-accent hover:bg-brand-yellow-dark disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>

        <p className="mt-5 text-center text-sm text-stone-500 dark:text-stone-400">
          New here?{" "}
          <Link href="/signup" className="font-semibold text-brand-orange">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
