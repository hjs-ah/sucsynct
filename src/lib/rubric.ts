import {
  DIMENSION_LABELS,
  DIMENSION_ORDER,
  type AnalyzerStrictness,
  type Dimension,
  type FillerWordHit,
  type ScoreResult,
} from "./types";

// Tunes how hard both scorers lean on a piece. `penalty` scales every
// deduction in the mock scorer (filler words, hedges, run-on sentences);
// `promptInstruction` is folded into the Claude prompt so the real scorer
// grades to the same standard. Keep these two in sync — a strictness level
// should feel the same whether or not an API key is configured.
const STRICTNESS_SETTINGS: Record<
  AnalyzerStrictness,
  { penalty: number; promptInstruction: string }
> = {
  supportive: {
    penalty: 0.6,
    promptInstruction:
      "Grade supportively: lead with what's working, give credit for reasonable attempts, and reserve low scores for pieces with real, significant problems. Someone should be able to earn a high score with a solid, if imperfect, piece.",
  },
  moderate: {
    penalty: 1,
    promptInstruction:
      "Grade evenhandedly: note what works, but don't let politeness soften a fair call on what's weak. A good-but-not-great piece should land in the middle of the scale, not the top.",
  },
  strict: {
    penalty: 1.5,
    promptInstruction:
      "Grade like a demanding, experienced editor on deadline: vague praise doesn't help anyone improve. Hold every dimension to a high bar, penalize filler, hedging, and generic claims noticeably, and reserve scores above 85 for pieces that are genuinely excellent with almost nothing left to fix.",
  },
};

const FILLER_WORDS = [
  "um",
  "uh",
  "like",
  "you know",
  "sort of",
  "kind of",
  "basically",
  "actually",
  "literally",
  "honestly",
];

const HEDGES = ["maybe", "i think", "i guess", "probably", "just wanted to"];

const JARGON_TERMS = [
  "synergize",
  "synergy",
  "leverage",
  "circle back",
  "touch base",
  "low-hanging fruit",
  "paradigm",
  "bandwidth",
  "deep dive",
  "move the needle",
  "value-add",
  "best-in-class",
  "boil the ocean",
];

function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(n)));
}

/**
 * Passive voice is detected with a rough heuristic — a form of "to be"
 * immediately followed by a past participle ("was delivered", "is being
 * reviewed"). It will miss and over-flag edge cases; it's tuned to be a
 * useful coaching signal, not a grammar checker.
 */
function analyzeLanguage(text: string): Pick<ScoreResult, "activeVoicePercent" | "fillerWords" | "jargon"> {
  const trimmed = text.trim();
  const lower = trimmed.toLowerCase();

  const sentences = trimmed
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const passivePattern = /\b(am|is|are|was|were|be|been|being)\s+\w+ed\b/gi;
  const passiveSentences = sentences.filter((s) => passivePattern.test(s)).length;
  const activeVoicePercent = sentences.length
    ? clamp(100 - (passiveSentences / sentences.length) * 100)
    : 100;

  const fillerWords: FillerWordHit[] = FILLER_WORDS.map((word) => {
    const count = lower.match(new RegExp(`\\b${word}\\b`, "g"))?.length ?? 0;
    return { word, count };
  }).filter((f) => f.count > 0);

  const jargon = JARGON_TERMS.filter((term) => lower.includes(term));

  return { activeVoicePercent, fillerWords, jargon };
}

const STRENGTH_PHRASES: Record<Dimension, string> = {
  messageClarity: "the point comes through clearly",
  structure: "it has a real shape — a beginning, a turn, a landing",
  brevity: "nothing here overstays its welcome",
  specificity: "concrete detail carries the piece",
  audienceFit: "it's clearly aimed at who's listening",
  voice: "it sounds like an actual person",
};

const OPPORTUNITY_PHRASES: Record<Dimension, string> = {
  messageClarity: "state the one takeaway earlier, in plain terms",
  structure: "give it a clearer beginning, turn, and landing",
  brevity: "trim anything that doesn't serve the one point",
  specificity: "swap a vague claim for one concrete detail",
  audienceFit: "frame the audience and stakes earlier",
  voice: "let more of how you'd actually say this come through",
};

const STRONG_DETAIL: Record<Dimension, string> = {
  messageClarity: "A reader can tell what you want them to take away without hunting for it.",
  structure: "It has a recognizable shape: a way in, a turn, and somewhere to land.",
  brevity: "Sentences earn their place. Nothing here feels padded.",
  specificity: "Concrete details do the persuading instead of general claims.",
  audienceFit: "It reads as though it was written for a particular listener.",
  voice: "It sounds like a person talking, not a template.",
};

const IMPROVE_DETAIL: Record<Dimension, string> = {
  messageClarity: "State the one takeaway up front, in a single plain sentence, then support it.",
  structure: "Give it a clearer beginning, a moment where something changes, and a deliberate ending.",
  brevity: "Cut anything that doesn't serve the one thing you want remembered, then cut a little more.",
  specificity: "Replace one general claim with a number, a name, or a moment someone could picture.",
  audienceFit: "Say who this is for and what they care about earlier, so the stakes are clear sooner.",
  voice: "Keep the phrases you'd actually say out loud and drop the ones that sound like a form letter.",
};

function strongestAndWeakest(dimensions: Record<Dimension, number>) {
  const strongest = DIMENSION_ORDER.reduce((best, d) =>
    dimensions[d] > dimensions[best] ? d : best
  , DIMENSION_ORDER[0]);
  const weakest = DIMENSION_ORDER.reduce((worst, d) =>
    dimensions[d] < dimensions[worst] ? d : worst
  , DIMENSION_ORDER[0]);
  return { strongest, weakest };
}

/** Plain-language "Analysis 1 / Analysis 2" built from the dimension scores. */
export function buildAnalysis(
  dimensions: Record<Dimension, number>
): { strong: string; improve: string } {
  const { strongest, weakest } = strongestAndWeakest(dimensions);
  return {
    strong: `${DIMENSION_LABELS[strongest]} is your strongest area. ${STRONG_DETAIL[strongest]}`,
    improve: `${DIMENSION_LABELS[weakest]} has the most room to grow. ${IMPROVE_DETAIL[weakest]}`,
  };
}

function deriveStrengthOpportunity(dimensions: Record<Dimension, number>) {
  const strongest = DIMENSION_ORDER.reduce((best, d) =>
    dimensions[d] > dimensions[best] ? d : best
  , DIMENSION_ORDER[0]);
  const weakest = DIMENSION_ORDER.reduce((worst, d) =>
    dimensions[d] < dimensions[worst] ? d : worst
  , DIMENSION_ORDER[0]);

  return {
    strength: `${DIMENSION_LABELS[strongest]} — ${STRENGTH_PHRASES[strongest]}`,
    opportunity: `${DIMENSION_LABELS[weakest]} — ${OPPORTUNITY_PHRASES[weakest]}`,
  };
}

/**
 * Adds the language-mechanics breakdown and the strength/opportunity
 * callout on top of a base score, regardless of whether that base score
 * came from the mock scorer or the real Claude call — this analysis is
 * deterministic text processing, not something worth spending a model
 * call on.
 */
export function enrichScore(
  base: Pick<ScoreResult, "overall" | "dimensions" | "verdict" | "evidence"> &
    Partial<Pick<ScoreResult, "analysis" | "summary">>,
  text: string
): ScoreResult {
  return {
    ...base,
    analysis: base.analysis ?? buildAnalysis(base.dimensions),
    ...deriveStrengthOpportunity(base.dimensions),
    ...analyzeLanguage(text),
  };
}

/**
 * A deterministic, no-API-key scorer so the prototype runs without secrets.
 * It is intentionally rough — it exists to make the UI feel alive during
 * local development, not to replace the real rubric call in production.
 */
export function mockScore(text: string, strictness: AnalyzerStrictness = "strict"): ScoreResult {
  const { penalty } = STRICTNESS_SETTINGS[strictness];
  const trimmed = text.trim();
  const words = trimmed.length ? trimmed.split(/\s+/) : [];
  const wordCount = words.length;
  const sentences = trimmed
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const avgSentenceLen = sentences.length ? wordCount / sentences.length : wordCount;

  const lower = trimmed.toLowerCase();
  const fillerCount = FILLER_WORDS.reduce(
    (sum, w) => sum + (lower.match(new RegExp(`\\b${w}\\b`, "g"))?.length ?? 0),
    0
  );
  const hedgeCount = HEDGES.reduce(
    (sum, w) => sum + (lower.match(new RegExp(w, "g"))?.length ?? 0),
    0
  );

  // Base deductions scale with strictness; the credits below (specificity,
  // audienceFit, voice) don't — a stricter grader should be harder to
  // impress on the downside, not less generous about genuine strengths.
  const brevity = clamp(100 - Math.max(0, wordCount - 120) * 0.4 * penalty - fillerCount * 4 * penalty);
  const structure = clamp(
    70 - Math.abs(avgSentenceLen - 16) * 2 * penalty + (sentences.length >= 3 ? 10 : -10 * penalty)
  );
  const specificity = clamp(50 + (words.filter((w) => /\d/.test(w)).length) * 6 + Math.min(wordCount, 40));
  const messageClarity = clamp(80 - hedgeCount * 8 * penalty - fillerCount * 3 * penalty);
  const audienceFit = clamp(65 + (wordCount > 20 ? 10 : -10 * penalty));
  const voice = clamp(60 + Math.min(20, sentences.length * 3));

  const dimensions: Record<Dimension, number> = {
    messageClarity,
    structure,
    brevity,
    specificity,
    audienceFit,
    voice,
  };

  const overall = clamp(
    DIMENSION_ORDER.reduce((sum, d) => sum + dimensions[d], 0) / DIMENSION_ORDER.length
  );

  const lowest = DIMENSION_ORDER.reduce((worst, d) =>
    dimensions[d] < dimensions[worst] ? d : worst
  , DIMENSION_ORDER[0]);

  const verdictByDimension: Record<Dimension, string> = {
    messageClarity: "The point is there, but it takes work to find. Say it in one sentence first.",
    structure: "The shape is uneven — give it a clear beginning, turn, and landing.",
    brevity: "This runs long. Cut anything that doesn't serve the one thing you want remembered.",
    specificity: "Too general to stick. Swap a vague claim for one concrete detail.",
    audienceFit: "Not clearly aimed at who's listening. Name what they care about.",
    voice: "Reads a little flat. Let more of how you'd actually say this come through.",
  };

  const firstSentence = sentences[0] ?? trimmed.slice(0, 80);

  return enrichScore(
    {
      overall,
      dimensions,
      verdict: wordCount === 0 ? "Add a story to get feedback." : verdictByDimension[lowest],
      evidence: firstSentence
        ? `"${firstSentence.slice(0, 140)}${firstSentence.length > 140 ? "…" : ""}" — this is where the reader either leans in or checks out.`
        : "",
    },
    text
  );
}

/** The prompt sent to Claude when ANTHROPIC_API_KEY is configured. */
export function buildScoringPrompt(
  text: string,
  audience: string,
  goal: string,
  strictness: AnalyzerStrictness = "strict"
) {
  return `You are a story and message coach. Score the piece below on a 0-100 scale for each dimension, and give one overall 0-100 score (the average, rounded). ${STRICTNESS_SETTINGS[strictness].promptInstruction}

Dimensions:
- messageClarity: is there one clear takeaway, stated plainly?
- structure: does it have a real beginning, a turn or complication, and a landing?
- brevity: is every sentence earning its place, for this audience and goal?
- specificity: concrete detail over generic claims?
- audienceFit: is it aimed at who will actually hear/read it?
- voice: does it sound like a person, not a template?

Audience: ${audience || "not specified"}
Goal: ${goal || "not specified"}

Piece:
"""
${text}
"""

Respond with ONLY valid JSON, no markdown fences, matching exactly this shape:
{
  "overall": number,
  "dimensions": {
    "messageClarity": number,
    "structure": number,
    "brevity": number,
    "specificity": number,
    "audienceFit": number,
    "voice": number
  },
  "verdict": "one sentence naming the single most useful thing to fix next",
  "analysisStrong": "two plain sentences on what is strong about the piece, quoting a short excerpt if it helps",
  "analysisImprove": "two plain sentences on what could improve and how, quoting a short excerpt if it helps"
}`;
}
