import type { Entry } from "./types";

/** "5 minutes ago", "3 hours ago", "2 days ago", then a plain date after a week. */
export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} ${mins === 1 ? "minute" : "minutes"} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} ${days === 1 ? "day" : "days"} ago`;
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const SNIPPET_MAX = 64;

/**
 * The one-line preview shown on story cards: the Haiku-written summary when
 * there is one, otherwise the start of the text. Always ends in an ellipsis.
 */
export function storySnippet(entry: Pick<Entry, "text" | "scores">): string {
  const raw = (entry.scores.summary ?? entry.text).replace(/\s+/g, " ").trim();
  if (!raw) return "(empty)";
  const cut = raw.length > SNIPPET_MAX ? raw.slice(0, SNIPPET_MAX) : raw;
  return `${cut.replace(/[\s.…,;:-]+$/, "")}…`;
}
