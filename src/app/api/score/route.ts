import Anthropic from "@anthropic-ai/sdk";
import { buildScoringPrompt, enrichScore, mockScore } from "@/lib/rubric";
import { DIMENSION_ORDER, type AnalyzerStrictness, type ScoreResult } from "@/lib/types";

const VALID_STRICTNESS: AnalyzerStrictness[] = ["supportive", "moderate", "strict"];

export async function POST(request: Request) {
  const body = (await request.json()) as {
    text?: string;
    audience?: string;
    goal?: string;
    strictness?: string;
  };

  const text = (body.text ?? "").trim();
  const audience = body.audience ?? "";
  const goal = body.goal ?? "";
  const strictness: AnalyzerStrictness = VALID_STRICTNESS.includes(
    body.strictness as AnalyzerStrictness
  )
    ? (body.strictness as AnalyzerStrictness)
    : "strict";

  if (!text) {
    return Response.json({ error: "Text is required." }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    // No key configured — keep the prototype usable with the local scorer.
    return Response.json({ scores: mockScore(text, strictness), source: "mock" });
  }

  try {
    const anthropic = new Anthropic({ apiKey });
    const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5-20250929";

    const message = await anthropic.messages.create({
      model,
      max_tokens: 700,
      messages: [{ role: "user", content: buildScoringPrompt(text, audience, goal, strictness) }],
    });

    const block = message.content.find((c) => c.type === "text");
    const raw = block && "text" in block ? block.text : "";
    const parsed = JSON.parse(raw) as ScoreResult;

    // Guard against a malformed response before trusting it.
    const hasAllDimensions = DIMENSION_ORDER.every(
      (d) => typeof parsed.dimensions?.[d] === "number"
    );
    if (typeof parsed.overall !== "number" || !hasAllDimensions) {
      throw new Error("Malformed scoring response");
    }

    // Language mechanics and the strength/opportunity callout are
    // deterministic text analysis, computed locally either way — no need
    // to ask the model for them, and it keeps mock vs. Claude scores
    // directly comparable.
    const scores = enrichScore(parsed, text);

    return Response.json({ scores, source: "claude" });
  } catch (err) {
    console.error("Scoring via Claude failed, falling back to mock scorer:", err);
    return Response.json({ scores: mockScore(text, strictness), source: "mock-fallback" });
  }
}
