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

export interface Preferences {
  onboarded: boolean;
  focus: string[]; // e.g. ["Sales calls", "Interviews"]
  email: string;
  autoDeleteAudio: boolean;
  analyzerStrictness: AnalyzerStrictness;
}

export const DEFAULT_PREFERENCES: Preferences = {
  onboarded: false,
  focus: [],
  email: "",
  autoDeleteAudio: true,
  analyzerStrictness: "strict",
};
