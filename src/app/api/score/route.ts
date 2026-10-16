import Anthropic from "@anthropic-ai/sdk";
import { buildScoringPrompt, enrichScore, mockScore } from "@/lib/rubric";

// Short card summaries are cheap, so they use Haiku regardless of which
// model does the scoring. Override with ANTHROPIC_SUMMARY_MODEL.
async function summarize(anthropic: Anthropic, text: string): Promise<string | undefined> {
  try {
    const message = await anthropic.messages.create({
      model: process.env.ANTHROPIC_SUMMARY_MODEL || "claude-haiku-5-5",
      max_tokens: 60,
      messages: [
        {
          role: "user",
          content: `Summarize this in 60 characters or fewer, as a short phrase that says what the story is about. Plain text only: no quotes, no ending punctuation.\n\n"""\n${text.slice(0, 4000)}\n"""`,
        },
      ],
    });
    const block = message.content.find((c) => c.type === "text");
    const out = block && "text" in block ? block.text.trim().replace(/^["']|["']$/g, "") : "";
    return out ? out.slice(0, 70) : undefined;
  } catch (err) {
    console.error("Summary via Haiku failed:", err);
    return undefined;
  }
}
import { DIMENSION_ORDER, type AnalyzerStrictness, type Mode, type ScoreResult } from "@/lib/types";

const VALID_STRICTNESS: AnalyzerStrictness[] = ["supportive", "moderate", "strict"];

export async function POST(request: Request) {
  const body = (await request.json()) as {
    text?: string;
    audience?: string;
    goal?: string;
    strictness?: string;
    mode?: string;
    durationSeconds?: number;
  };

  const text = (body.text ?? "").trim();
  const audience = body.audience ?? "";
  const goal = body.goal ?? "";
  const strictness: AnalyzerStrictness = VALID_STRICTNESS.includes(
    body.strictness as AnalyzerStrictness
  )
    ? (body.strictness as AnalyzerStrictness)
    : "strict";

  const mode = (['speak', 'write', 'upload'] as Mode[]).includes(body.mode as Mode)
    ? (body.mode as Mode)
    : undefined;
  const durationSeconds =
    typeof body.durationSeconds === "number" && body.durationSeconds > 0
      ? Math.round(body.durationSeconds)
      : undefined;

  if (!text) {
    return Response.json({ error: "Text is required." }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    // No key configured — keep the prototype usable with the local scorer.
    return Response.json({ scores: mockScore(text, strictness, mode, durationSeconds), source: "mock" });
  }

  try {
    const anthropic = new Anthropic({ apiKey });
    const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5-20250929";

    const [message, summary] = await Promise.all([
      anthropic.messages.create({
        model,
        max_tokens: 900,
        messages: [{ role: "user", content: buildScoringPrompt(text, audience, goal, strictness, mode, durationSeconds) }],
      }),
      summarize(anthropic, text),
    ]);

    const block = message.content.find((c) => c.type === "text");
    const raw = block && "text" in block ? block.text : "";
    const parsed = JSON.parse(raw) as ScoreResult & {
      analysisStrong?: string;
      analysisImprove?: string;
    };

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
    const analysis =
      parsed.analysisStrong && parsed.analysisImprove
        ? { strong: parsed.analysisStrong, improve: parsed.analysisImprove }
        : undefined;
    const scores = enrichScore(
      {
        overall: parsed.overall,
        dimensions: parsed.dimensions,
        verdict: parsed.verdict,
        evidence: parsed.analysisStrong ?? parsed.evidence ?? "",
        analysis,
        summary,
      },
      text,
      mode
    );

    return Response.json({ scores, source: "claude" });
  } catch (err) {
    console.error("Scoring via Claude failed, falling back to mock scorer:", err);
    return Response.json({ scores: mockScore(text, strictness, mode, durationSeconds), source: "mock-fallback" });
  }
}
