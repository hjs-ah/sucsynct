import { DIMENSION_ORDER, type Dimension, type ScoreResult } from "./types";

export interface PracticeExercise {
  title: string;
  steps: string;
}

const BY_DIMENSION: Record<Dimension, PracticeExercise> = {
  messageClarity: {
    title: "One-breath takeaway",
    steps:
      "Say your main point out loud in one sentence, in a single breath. Repeat it three times, tightening it each time, then record your story opening with that sentence.",
  },
  structure: {
    title: "Three-sentence story",
    steps:
      "Tell the story in exactly three sentences: where it starts, what changed, where it landed. Then add detail back one sentence at a time.",
  },
  brevity: {
    title: "Half-time retell",
    steps:
      "Time yourself telling the story. Tell it again in half the time, then in half that. Keep whatever survived all three rounds.",
  },
  specificity: {
    title: "Swap the vague",
    steps:
      "Read your text aloud and stop at every general claim. Replace each with a number, a name, or a moment someone could picture, then say it again.",
  },
  audienceFit: {
    title: "Say it to one person",
    steps:
      "Picture one specific person in your audience. Open with what they care about, and say the story to them out loud as if they were in the room.",
  },
  voice: {
    title: "Tell it to a friend",
    steps:
      "Record yourself telling the story to a friend, not reading it. Compare it with your written version and keep the phrases that sound like you.",
  },
};

const FILLER_DRILL: PracticeExercise = {
  title: "Pause instead of filler",
  steps:
    "Pick any topic and talk for one minute. Whenever you feel an \"um\" or \"like\" coming, stay silent for a beat instead. Record it and count the filler words.",
};

/** Up to three drills: the two weakest areas, plus a filler drill if needed. */
export function suggestExercises(scores: ScoreResult): PracticeExercise[] {
  const weakest = [...DIMENSION_ORDER]
    .sort((a, b) => scores.dimensions[a] - scores.dimensions[b])
    .slice(0, 2)
    .map((d) => BY_DIMENSION[d]);
  const fillerTotal = scores.fillerWords.reduce((sum, f) => sum + f.count, 0);
  return fillerTotal >= 2 ? [...weakest, FILLER_DRILL] : weakest;
}
