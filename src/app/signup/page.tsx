"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { migrateLocalDataToSupabase } from "@/lib/storage";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const supabase = createClient();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });

    if (signUpError) {
      setError(signUpError.message);
      setSubmitting(false);
      return;
    }

    if (data.session) {
      // Email confirmation is off for this project, or Supabase
      // auto-confirmed — we already have a session, so bring the guest's
      // local stories along and go straight in.
      await migrateLocalDataToSupabase();
      router.replace("/");
      return;
    }

    // Confirmation required — the migration happens when they land back on
    // /auth/callback after clicking the email link.
    setCheckEmail(true);
    setSubmitting(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-50 px-6 dark:bg-stone-950">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <Image src="/logo-mark-v2.png" alt="Sucsynct" width={71} height={65} className="h-10 w-auto" priority />
          <h1 className="text-lg font-bold text-ink dark:text-stone-50">
            Create your account
          </h1>
          <p className="text-sm text-stone-500 dark:text-stone-400">
            Your stories sync across devices from here on.
          </p>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-8 dark:border-stone-800 dark:bg-stone-900">
          {checkEmail ? (
            <div className="flex flex-col items-center gap-2 py-4 text-center">
              <p className="text-sm font-semibold text-ink dark:text-stone-50">
                Check your email
              </p>
              <p className="text-sm text-stone-500 dark:text-stone-400">
                We sent a confirmation link to <span className="font-medium">{email}</span>.
                Click it to finish creating your account.
              </p>
            </div>
          ) : (
            <>
              <div className="mb-5 flex flex-col gap-2">
                <button
                  type="button"
                  disabled
                  title="Google sign-up is coming soon — needs a one-time setup in the Supabase dashboard"
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
                  title="Apple sign-up is coming soon — needs a one-time setup in the Supabase dashboard"
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
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password (6+ characters)"
                  className="w-full rounded-lg border border-stone-300 bg-transparent px-3 py-2.5 text-sm text-ink placeholder:text-stone-400 focus:border-brand-orange focus:outline-none dark:border-stone-700 dark:text-stone-100"
                />
                {error && <p className="text-xs text-red-500">{error}</p>}
                <button
                  type="submit"
                  disabled={submitting}
                  className="mt-1 flex h-9 w-full items-center justify-center rounded-none btn-underline bg-brand-yellow text-xs font-semibold text-on-accent hover:bg-brand-yellow-dark disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? "Creating account…" : "Create account"}
                </button>
              </form>
            </>
          )}
        </div>

        {!checkEmail && (
          <p className="mt-5 text-center text-sm text-stone-500 dark:text-stone-400">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-brand-orange">
              Sign in
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
