import Image from "next/image";
import Link from "next/link";
import { NavDrawer } from "@/components/nav-drawer";
import { HomeIcon, PlusIcon } from "@/components/icons";

export function NavBar() {
  return (
    <header className="sticky top-0 z-30 border-b border-stone-200 bg-background/90 backdrop-blur dark:border-stone-800">
      <div className="mx-auto grid max-w-3xl grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex items-center gap-1">
          <Link
            href="/"
            title="Home"
            aria-label="Home"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-stone-600 transition-colors hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"
          >
            <HomeIcon className="h-5 w-5" />
          </Link>
          <NavDrawer />
        </div>

        <Link
          href="/"
          className="justify-self-center"
        >
          <Image
            src="/logo-v3.png"
            alt="Sucsynct"
            width={760}
            height={159}
            priority
            className="h-8 w-auto dark:brightness-150"
          />
        </Link>

        <Link
          id="tour-new-entry-btn"
          href="/new"
          title="New entry"
          aria-label="New entry"
          className="flex h-[31px] shrink-0 items-center gap-1.5 justify-self-end rounded-md bg-brand-yellow px-3 text-xs font-semibold text-on-accent transition-colors hover:bg-brand-yellow-dark"
        >
          <PlusIcon className="h-4 w-4 shrink-0 text-on-accent" />
          <span className="hidden sm:inline">New entry</span>
        </Link>
      </div>
    </header>
  );
}
