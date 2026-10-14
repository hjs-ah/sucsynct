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
    <div className="inline-flex w-full rounded-none bg-stone-100 p-1 dark:bg-stone-800">
      {OPTIONS.map((opt) => {
        const active = mounted && theme === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => setTheme(opt.value)}
            className={`flex-1 rounded-none px-3 py-1.5 text-sm font-medium transition-colors ${
              active
                ? "bg-brand-yellow text-stone-900"
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
