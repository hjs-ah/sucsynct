// Speech-to-text via ElevenLabs. Audio is streamed straight through to
// ElevenLabs and then dropped — nothing is written to disk, a database, or
// storage by this app. Only the returned text is handed back to the browser.

export const maxDuration = 60;

// Vercel serverless functions cap request bodies at 4.5 MB, so stay under it.
const MAX_BYTES = 4 * 1024 * 1024;

export async function POST(request: Request) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "Transcription isn't set up yet. Type or paste what you said instead." },
      { status: 503 }
    );
  }

  let incoming: FormData;
  try {
    incoming = await request.formData();
  } catch {
    return Response.json({ error: "Couldn't read that upload." }, { status: 400 });
  }

  const file = incoming.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return Response.json({ error: "No audio received." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return Response.json(
      { error: "That recording is too large (4 MB max). Try a shorter clip." },
      { status: 413 }
    );
  }

  const upstream = new FormData();
  upstream.append("file", file, file.name || "recording.webm");
  upstream.append("model_id", process.env.ELEVENLABS_STT_MODEL || "scribe_v2");
  upstream.append("tag_audio_events", "false");

  try {
    const res = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
      method: "POST",
      headers: { "xi-api-key": apiKey },
      body: upstream,
    });

    if (!res.ok) {
      console.error("ElevenLabs transcription failed:", res.status, await res.text());
      return Response.json(
        { error: "Transcription failed. You can type or paste the text instead." },
        { status: 502 }
      );
    }

    const data = (await res.json()) as { text?: string };
    const text = (data.text ?? "").trim();
    if (!text) {
      return Response.json({ error: "We couldn't hear any speech in that audio." }, { status: 422 });
    }
    return Response.json({ text });
  } catch (err) {
    console.error("ElevenLabs transcription error:", err);
    return Response.json(
      { error: "Transcription failed. You can type or paste the text instead." },
      { status: 502 }
    );
  }
}
