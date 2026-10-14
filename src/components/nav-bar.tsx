import Link from "next/link";
import { NavDrawer } from "@/components/nav-drawer";
import { PlusIcon } from "@/components/icons";

export function NavBar() {
  return (
    <header className="border-b border-stone-200 dark:border-stone-800">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-2 px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex items-center gap-2">
          <NavDrawer />
          <Link
            href="/"
            className="shrink-0 text-base font-bold tracking-tight text-stone-900 dark:text-stone-50"
          >
            Sucsynct
          </Link>
        </div>

        <Link
          id="tour-new-entry-btn"
          href="/new"
          title="New entry"
          aria-label="New entry"
          className="flex h-9 shrink-0 items-center gap-1.5 rounded-none bg-brand-yellow px-3.5 text-sm font-semibold text-stone-900 transition-colors hover:bg-brand-yellow-dark"
        >
          <PlusIcon className="h-4 w-4 shrink-0" />
          <span className="hidden sm:inline">New entry</span>
        </Link>
      </div>
    </header>
  );
}
