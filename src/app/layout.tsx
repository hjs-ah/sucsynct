import type { Metadata } from "next";
// Self-hosted via @fontsource (the font files ship inside the npm package)
// rather than next/font/google, which fetches from Google at build time —
// that fetch can fail in network-restricted build environments. Loaded at
// 400-700 so Tailwind's font-medium/semibold/bold classes resolve to real
// Inter weights instead of being faked by the browser.
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import { AuthSync } from "@/components/auth-sync";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sucsynct — tell better stories",
  description:
    "Record or write your story and get message-first coaching, for speaking, writing, resumes, and essays.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning className="h-full antialiased">
      <body className="min-h-full font-sans">
        <ThemeProvider>
          <AuthSync />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
