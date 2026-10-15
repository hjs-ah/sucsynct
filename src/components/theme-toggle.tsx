"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

const OPTIONS = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
] as const;

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  // Avoid a hydration mismatch: the real theme isn't known until mount.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div className="flex min-w-[13.5rem] max-w-[16rem] flex-1 overflow-hidden rounded-md border border-stone-300 dark:border-stone-700">
      {OPTIONS.map((opt) => {
        const active = mounted && theme === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => {
              // Briefly turn on global colour transitions so the switch
              // between light and dark fades instead of snapping.
              const root = document.documentElement;
              root.classList.add("theme-fade");
              setTheme(opt.value);
              window.setTimeout(() => root.classList.remove("theme-fade"), 500);
            }}
            className={`flex-1 px-3 py-1.5 text-sm font-medium transition-colors ${
              active
                ? "bg-brand-yellow text-on-accent"
                : "text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
