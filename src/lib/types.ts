export type Mode = "speak" | "write" | "upload";

export type Dimension =
  | "messageClarity"
  | "structure"
  | "brevity"
  | "specificity"
  | "audienceFit"
  | "voice";

export const DIMENSION_LABELS: Record<Dimension, string> = {
  messageClarity: "Message clarity",
  structure: "Structure",
  brevity: "Brevity",
  specificity: "Specificity",
  audienceFit: "Audience fit",
  voice: "Voice",
};

// Plain-language explanations behind the (i) buttons in the breakdown.
export const DIMENSION_HELP: Record<Dimension, string> = {
  messageClarity:
    "Is there one takeaway, stated plainly? A high score means someone could repeat your main point after hearing it once.",
  structure:
    "Does it have a shape: a way in, a turn or complication, and a deliberate landing? Stories that just stop or trail off score lower.",
  brevity:
    "Does every sentence earn its place for this audience and goal? Filler, repetition and detours pull it down. Shorter isn't always higher, only tighter.",
  specificity:
    "Concrete detail (numbers, names, moments someone can picture) beats general claims like \u201clots of experience\u201d.",
  audienceFit:
    "Is it aimed at the people who'll actually hear or read it? It rewards naming what they care about and framing the stakes early.",
  voice:
    "Does it sound like a real person talking, with your phrases and rhythm, instead of a template or a form letter?",
};

export const DIMENSION_ORDER: Dimension[] = [
  "messageClarity",
  "structure",
  "brevity",
  "specificity",
  "audienceFit",
  "voice",
];

export interface FillerWordHit {
  word: string;
  count: number;
}

export interface ScoreResult {
  overall: number; // 0-100
  dimensions: Record<Dimension, number>; // each 0-100
  verdict: string; // one-line summary
  evidence: string; // a quoted excerpt + a short note
  strength: string; // one concrete thing that's working
  opportunity: string; // one concrete thing to fix next
  analysis?: { strong: string; improve: string }; // plain-language "Analysis 1 / Analysis 2"
  summary?: string; // short Haiku-written summary shown on story cards
  activeVoicePercent: number; // 0-100, share of sentences in active voice
  fillerWords: FillerWordHit[]; // detected filler words, with counts
  jargon: string[]; // flagged buzzwords/jargon terms
}

export interface Entry {
  id: string;
  createdAt: string; // ISO timestamp
  mode: Mode;
  audience: string;
  goal: string;
  text: string;
  scores: ScoreResult;
  selfScore?: number; // 0-100, captured before the AI score was revealed
  durationSeconds?: number; // how long it took to say, for spoken/uploaded entries
}

// How hard the analyzer leans on a piece. "strict" is the default — vague
// praise doesn't help anyone improve — but it's a preference, not a fixed
// setting, so anyone who wants a gentler first pass can dial it down.
export type AnalyzerStrictness = "supportive" | "moderate" | "strict";

export const STRICTNESS_LABELS: Record<AnalyzerStrictness, string> = {
  supportive: "Lite",
  moderate: "Moderate",
  strict: "Strict",
};

export const STRICTNESS_DESCRIPTIONS: Record<AnalyzerStrictness, string> = {
  supportive: "Leads with what's working. Easier to earn a high score.",
  moderate: "Balanced — calls out issues but doesn't nitpick.",
  strict: "Demanding and specific. Closest to a tough editor's read.",
};

export type GoalPeriod = "day" | "week" | "month";

export const GOAL_PERIOD_LABELS: Record<GoalPeriod, string> = {
  day: "Day",
  week: "Week",
  month: "Month",
};

export interface Preferences {
  onboarded: boolean;
  toursSeen: string[]; // guided tours already completed (synced per account)
  goalPeriod: GoalPeriod;
  goalTarget: number | null; // target average score for the period; null = no goal
  focus: string[]; // e.g. ["Sales calls", "Interviews"]
  email: string;
  autoDeleteAudio: boolean;
  analyzerStrictness: AnalyzerStrictness;
}

export const DEFAULT_PREFERENCES: Preferences = {
  onboarded: false,
  toursSeen: [],
  goalPeriod: "week",
  goalTarget: null,
  focus: [],
  email: "",
  autoDeleteAudio: true,
  analyzerStrictness: "strict",
};
