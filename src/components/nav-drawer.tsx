"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  HistoryIcon,
  HomeIcon,
  LogInIcon,
  LogOutIcon,
  MenuIcon,
  NotesIcon,
  SettingsIcon,
  XIcon,
} from "@/components/icons";

const LINKS = [
  { href: "/", label: "Home", icon: HomeIcon },
  { href: "/notes", label: "Quick notes", icon: NotesIcon },
  { href: "/history", label: "History", icon: HistoryIcon },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
];

/**
 * Replaces the old icon-row top nav: a hamburger trigger that slides a full
 * drawer in from the left, with every destination as a full-width button.
 * Kept mounted at all times (rather than conditionally rendered) so it can
 * animate in and out via `translate-x` instead of popping — closed just
 * means off-screen and non-interactive.
 */
export function NavDrawer() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  // Close automatically on navigation, so picking a link doesn't leave the
  // drawer sitting open over the new page.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <>
      <button
        id="tour-nav-menu-btn"
        type="button"
        onClick={() => setOpen(true)}
        title="Menu"
        aria-label="Open menu"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-none text-stone-600 transition-colors hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"
      >
        <MenuIcon className="h-5 w-5" />
      </button>

      {/* Always mounted so open/close can transition instead of pop. */}
      <div className={`fixed inset-0 z-50 ${open ? "" : "pointer-events-none"}`} aria-hidden={!open}>
        <div
          onClick={() => setOpen(false)}
          className={`absolute inset-0 bg-stone-950/50 transition-opacity duration-200 ${
            open ? "opacity-100" : "opacity-0"
          }`}
        />
        <div
          role="dialog"
          aria-label="Navigation"
          className={`absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col gap-5 border-r border-stone-200 bg-white p-5 transition-transform duration-200 ease-out dark:border-stone-800 dark:bg-stone-900 ${
            open ? "translate-x-0 shadow-2xl" : "-translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-base font-bold tracking-tight text-ink dark:text-stone-50">
              Sucsynct
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
              className="flex h-8 w-8 items-center justify-center rounded-none text-stone-400 hover:bg-stone-100 hover:text-stone-600 dark:hover:bg-stone-800 dark:hover:text-stone-200"
            >
              <XIcon className="h-5 w-5" />
            </button>
          </div>

          <div>
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-stone-400 dark:text-stone-500">
              Theme
            </p>
            <ThemeToggle />
          </div>

          <nav className="flex flex-1 flex-col gap-1">
            {LINKS.map((link) => {
              const Icon = link.icon;
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-3 rounded-none px-3 py-2.5 text-sm font-semibold transition-colors ${
                    active
                      ? "bg-brand-blue/10 text-brand-blue"
                      : "text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"
                  }`}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-stone-200 pt-4 dark:border-stone-800">
            {email === undefined ? (
              <div className="h-10" />
            ) : email ? (
              <button
                onClick={handleSignOut}
                title={`Signed in as ${email}`}
                className="flex w-full items-center gap-3 rounded-none px-3 py-2.5 text-left text-sm font-semibold text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"
              >
                <LogOutIcon className="h-5 w-5 shrink-0" />
                <span className="truncate">Sign out ({email})</span>
              </button>
            ) : (
              <Link
                href="/login"
                className="flex items-center gap-3 rounded-none px-3 py-2.5 text-sm font-semibold text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"
              >
                <LogInIcon className="h-5 w-5 shrink-0" />
                Sign in
              </Link>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
