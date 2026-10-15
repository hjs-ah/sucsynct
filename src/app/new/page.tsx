"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AnalyzerSelector } from "@/components/analyzer-selector";
import { NavBar } from "@/components/nav-bar";
import {
  ArrowDownIcon,
  CheckIcon,
  MicIcon,
  PauseIcon,
  RotateCcwIcon,
  StopIcon,
} from "@/components/icons";
import { TourOverlay, type TourStep } from "@/components/tour";
import { getPreferences, makeId, saveEntry, savePreferences } from "@/lib/storage";
import { mockScore } from "@/lib/rubric";
import type { AnalyzerStrictness, Mode, ScoreResult } from "@/lib/types";

const NEW_ENTRY_TOUR: TourStep[] = [
  {
    targetId: "tour-mode-toggle",
    title: "Speak or write",
    body: "Speak records your voice and turns it into text you can edit before it's scored. Upload does the same for an audio file. Write skips straight to typing.",
  },
  {
    targetId: "tour-analyzer-row",
    title: "How hard we grade",
    body: "Lite, Moderate, or Strict — tap to change it any time. It updates your preference everywhere, not just this entry.",
  },
  {
    targetId: "tour-submit-btn",
    title: "Get your score",
    body: "When you're ready, submit here for scored, specific feedback.",
  },
];

const MODES: { value: Mode; label: string; available: boolean }[] = [
  { value: "write", label: "Write", available: true },
  { value: "speak", label: "Speak", available: true },
  { value: "upload", label: "Upload", available: true },
];

const WAVE_BARS = 6;
// Vercel caps request bodies at 4.5 MB; the transcribe route enforces 4 MB.
const MAX_AUDIO_BYTES = 4 * 1024 * 1024;

function extensionFor(mime: string) {
  if (mime.includes("mp4") || mime.includes("m4a") || mime.includes("aac")) return "m4a";
  if (mime.includes("mpeg") || mime.includes("mp3")) return "mp3";
  if (mime.includes("wav")) return "wav";
  if (mime.includes("ogg")) return "ogg";
  return "webm";
}

type RecordingState = "idle" | "recording" | "paused" | "stopped";
type Step = "compose" | "selfscore";

function formatTimer(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export default function NewEntryPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("write");
  const [audience, setAudience] = useState("");
  const [goal, setGoal] = useState("");
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [strictness, setStrictness] = useState<AnalyzerStrictness>("strict");

  // Recording
  const [recordingState, setRecordingState] = useState<RecordingState>("idle");
  const [seconds, setSeconds] = useState(0);
  const [waveHeights, setWaveHeights] = useState<number[]>(Array(WAVE_BARS).fill(20));
  const [micError, setMicError] = useState<string | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Playback + transcription. The audio only ever lives in this tab's memory
  // (an object URL). It is never uploaded for storage; it's sent once to the
  // transcribe route, which returns text and keeps nothing.
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioName, setAudioName] = useState("recording.webm");
  const [transcribing, setTranscribing] = useState(false);
  const [transcribeNote, setTranscribeNote] = useState<string | null>(null);

  // Self-score step
  const [step, setStep] = useState<Step>("compose");
  const [selfScore, setSelfScore] = useState(50);
  const [pendingScores, setPendingScores] = useState<ScoreResult | null>(null);

  useEffect(() => {
    getPreferences().then((prefs) => setStrictness(prefs.analyzerStrictness));
    // Pick up a draft handed off from /notes ("Full analysis"), if
    // there is one, then clear it so it doesn't resurface on a later visit.
    if (typeof window !== "undefined") {
      const draft = window.sessionStorage.getItem("sucsynct:draft-text");
      if (draft) {
        setText(draft);
        window.sessionStorage.removeItem("sucsynct:draft-text");
      }
    }
    return () => {
      stopEverything();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    };
  }, []);

  // Free the in-memory audio whenever it's replaced or the page goes away.
  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  function clearAudio() {
    setAudioUrl(null);
    setTranscribeNote(null);
    chunksRef.current = [];
  }

  async function transcribeBlob(blob: Blob, name: string) {
    setTranscribing(true);
    setTranscribeNote(null);
    try {
      const form = new FormData();
      form.append("file", blob, name);
      const res = await fetch("/api/transcribe", { method: "POST", body: form });
      const data = (await res.json().catch(() => ({}))) as { text?: string; error?: string };
      if (!res.ok || !data.text) {
        setTranscribeNote(data.error ?? "Transcription failed. You can type or paste the text instead.");
        return;
      }
      // Append if there's already text so a second take doesn't wipe edits.
      setText((prev) => (prev.trim() ? `${prev.trim()}\n\n${data.text}` : (data.text as string)));
      setTranscribeNote("Transcribed. Fix anything it misheard before you submit.");
      setTimeout(goToAnalysis, 150);
    } catch {
      setTranscribeNote("Transcription failed. You can type or paste the text instead.");
    } finally {
      setTranscribing(false);
    }
  }

  function handleFileChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setMicError(null);
    if (!file.type.startsWith("audio/") && !file.type.startsWith("video/")) {
      setMicError("Choose an audio file (m4a, mp3, wav, webm…).");
      return;
    }
    if (file.size > MAX_AUDIO_BYTES) {
      setMicError("That file is over 4 MB. Try a shorter clip or a more compressed format.");
      return;
    }
    setAudioName(file.name);
    setAudioUrl(URL.createObjectURL(file));
    void transcribeBlob(file, file.name);
  }

  // The missing link the recording flow was criticized for: stopping never
  // pointed you anywhere. This both scrolls the text box into view and
  // focuses it, so the very next thing that happens after you stop is
  // landing in the place you actually analyze from.
  function goToAnalysis() {
    textareaRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    textareaRef.current?.focus();
  }

  function stopEverything() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    audioCtxRef.current?.close().catch(() => {});
    streamRef.current = null;
    audioCtxRef.current = null;
    analyserRef.current = null;
    recorderRef.current = null;
  }

  function runWaveformLoop() {
    const analyser = analyserRef.current;
    if (!analyser) return;
    const data = new Uint8Array(analyser.frequencyBinCount);

    function tick() {
      if (!analyserRef.current) return;
      analyserRef.current.getByteFrequencyData(data);
      const bucketSize = Math.floor(data.length / WAVE_BARS) || 1;
      const next = Array.from({ length: WAVE_BARS }, (_, i) => {
        const start = i * bucketSize;
        const slice = data.slice(start, start + bucketSize);
        const avg = slice.reduce((s, v) => s + v, 0) / (slice.length || 1);
        return Math.max(12, Math.min(100, (avg / 255) * 100));
      });
      setWaveHeights(next);
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
  }

  async function handleRecord() {
    if (recordingState !== "idle") return;
    setMicError(null);
    try {
      // This is the moment the browser shows its mic-permission prompt —
      // there's no separate "allow mic" screen in the app itself.
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      audioCtxRef.current = audioCtx;
      analyserRef.current = analyser;

      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.addEventListener("dataavailable", (ev) => {
        if (ev.data.size > 0) chunksRef.current.push(ev.data);
      });
      recorderRef.current = recorder;
      recorder.start();

      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
      runWaveformLoop();
      setRecordingState("recording");
    } catch {
      setMicError("Mic access was blocked. Allow it in your browser's site settings, or switch to Write.");
    }
  }

  function handlePause() {
    if (recordingState !== "recording") return;
    recorderRef.current?.pause();
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    setRecordingState("paused");
  }

  function handleResume() {
    if (recordingState !== "paused") return;
    recorderRef.current?.resume();
    timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    runWaveformLoop();
    setRecordingState("recording");
  }

  function handleRestart() {
    stopEverything();
    clearAudio();
    setSeconds(0);
    setWaveHeights(Array(WAVE_BARS).fill(20));
    setRecordingState("idle");
  }

  function finishRecording(): Promise<Blob | null> {
    return new Promise((resolve) => {
      const recorder = recorderRef.current;
      if (!recorder || recorder.state === "inactive") {
        resolve(null);
        return;
      }
      recorder.addEventListener(
        "stop",
        () => {
          const mime = recorder.mimeType || "audio/webm";
          resolve(chunksRef.current.length ? new Blob(chunksRef.current, { type: mime }) : null);
        },
        { once: true }
      );
      recorder.stop();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      audioCtxRef.current?.close().catch(() => {});
    });
  }

  // Explicit end-of-recording action — this is the piece that was missing:
  // Record/Pause/Resume all implied there'd be a fourth state to land in,
  // but nothing ever moved you there short of hitting Submit.
  async function handleStop() {
    if (recordingState !== "recording" && recordingState !== "paused") return;
    const blob = await finishRecording();
    setRecordingState("stopped");
    if (!blob) {
      setTimeout(goToAnalysis, 150);
      return;
    }
    const name = `recording.${extensionFor(blob.type)}`;
    setAudioName(name);
    setAudioUrl(URL.createObjectURL(blob));
    if (blob.size > MAX_AUDIO_BYTES) {
      setTranscribeNote("That recording is over 4 MB, which is too big to transcribe. Re-record a shorter take, or type it below.");
      setTimeout(goToAnalysis, 150);
      return;
    }
    // Transcribe straight away; it fills the text box and moves you there.
    void transcribeBlob(blob, name);
  }

  async function handleSubmit() {
    if (mode === "speak" && (recordingState === "recording" || recordingState === "paused")) {
      await finishRecording();
      setRecordingState("stopped");
    }
    if (!text.trim()) return;

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, audience, goal, strictness }),
      });
      const data = await res.json();
      const scores: ScoreResult = data.scores ?? mockScore(text, strictness);
      setPendingScores(scores);
      setStep("selfscore"); // ask for their guess before they see our number
    } catch {
      setError("Something went wrong scoring that. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStrictnessChange(next: AnalyzerStrictness) {
    setStrictness(next);
    // This doubles as the quick-access control for the preference — it
    // updates everywhere (Settings included), not just this one entry.
    await savePreferences({ analyzerStrictness: next });
  }

  async function handleReveal() {
    if (!pendingScores) return;
    const id = makeId();
    await saveEntry({
      id,
      createdAt: new Date().toISOString(),
      mode,
      audience,
      goal,
      text,
      scores: pendingScores,
      selfScore,
    });
    router.push(`/entry/${id}`);
  }

  if (step === "selfscore") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-50 px-6 dark:bg-stone-950">
        <div className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-8 dark:border-stone-800 dark:bg-stone-900">
          <h1 className="mb-2 text-lg font-bold text-ink dark:text-stone-50">
            Before you see our score —
          </h1>
          <p className="mb-6 text-sm text-stone-500 dark:text-stone-400">
            How do you think you did? This is just for you — we compare it to our score after.
          </p>

          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs text-stone-500 dark:text-stone-400">Your guess</span>
            <span className="text-2xl font-extrabold text-ink dark:text-stone-50">
              {selfScore}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={selfScore}
            onChange={(e) => setSelfScore(Number(e.target.value))}
            className="w-full accent-brand-blue"
          />

          <button
            onClick={handleReveal}
            className="mt-6 w-full rounded-md bg-brand-yellow px-3.5 py-2.5 text-xs font-semibold text-on-accent hover:bg-brand-yellow-dark"
          >
            See my score
          </button>
        </div>
      </div>
    );
  }

  const canUseRecordRow = mode === "speak";

  const audioPanel = (
    <div className="flex flex-col gap-2">
      {audioUrl && (
        <>
          <audio controls src={audioUrl} className="w-full" />
          <div className="flex items-center justify-between gap-2 text-xs text-stone-400 dark:text-stone-500">
            <span>
              Playback is temporary and lives only in this tab. We never store your audio; only
              the text and scores are saved.
            </span>
            <a
              href={audioUrl}
              download={audioName}
              className="shrink-0 font-semibold text-brand-blue hover:underline"
            >
              Download a copy
            </a>
          </div>
        </>
      )}
      {transcribing && (
        <p className="text-xs text-stone-500 dark:text-stone-400">Transcribing…</p>
      )}
      {!transcribing && transcribeNote && (
        <p className="text-xs text-stone-500 dark:text-stone-400">{transcribeNote}</p>
      )}
    </div>
  );

  return (
    <div className="min-h-screen">
      <NavBar />
      <main className="mx-auto max-w-2xl px-6 py-10">
        <h1 className="mb-4 text-xl font-bold text-ink dark:text-stone-50">
          New entry
        </h1>

        <div id="tour-analyzer-row" className="mb-5">
          <AnalyzerSelector value={strictness} onChange={handleStrictnessChange} className="w-full" />
        </div>

        <div id="tour-mode-toggle" className="mb-5 flex justify-center">
          <div className="inline-flex divide-x divide-stone-300 overflow-hidden rounded-md border border-stone-300 dark:divide-stone-700 dark:border-stone-700">
          {MODES.map((m) => (
            <button
              key={m.value}
              type="button"
              disabled={!m.available}
              onClick={() => m.available && setMode(m.value)}
              title={m.available ? undefined : "Coming soon — text-first prototype"}
              className={`px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                mode === m.value
                  ? "bg-brand-yellow text-on-accent"
                  : m.available
                    ? "bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-300"
                    : "cursor-not-allowed bg-stone-100 text-stone-400 dark:bg-stone-900 dark:text-stone-600"
              }`}
            >
              {m.label}
            </button>
          ))}
          </div>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-3">
          <input
            value={audience}
            onChange={(e) => setAudience(e.target.value)}
            placeholder="Audience (e.g. hiring manager)"
            className="rounded-lg border border-stone-300 bg-transparent px-3 py-2 text-sm text-ink placeholder:text-stone-400 focus:border-brand-blue focus:outline-none dark:border-stone-700 dark:text-stone-100"
          />
          <input
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="Goal (e.g. land the interview)"
            className="rounded-lg border border-stone-300 bg-transparent px-3 py-2 text-sm text-ink placeholder:text-stone-400 focus:border-brand-blue focus:outline-none dark:border-stone-700 dark:text-stone-100"
          />
        </div>

        {mode === "speak" && (
          <div className="mb-5 flex flex-col gap-3">
            <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-stone-300 p-6 dark:border-stone-700">
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-full text-white ${
                  recordingState === "recording"
                    ? "animate-pulse bg-red-600"
                    : recordingState === "stopped"
                      ? "bg-emerald-600"
                      : "bg-red-600/70"
                }`}
              >
                {recordingState === "stopped" ? (
                  <CheckIcon className="h-6 w-6" />
                ) : (
                  <MicIcon className="h-6 w-6" />
                )}
              </div>
              <div className="flex h-7 items-end gap-1">
                {waveHeights.map((h, i) => (
                  <div
                    key={i}
                    className="w-1 rounded-sm bg-stone-300 transition-all duration-100 dark:bg-stone-600"
                    style={{ height: `${recordingState === "recording" ? h : 12}%` }}
                  />
                ))}
              </div>
              <div className="text-xs text-stone-500 dark:text-stone-400">
                {recordingState === "idle" && "Tap Record to start — your browser will ask for mic access"}
                {recordingState === "recording" && `${formatTimer(seconds)} · recording`}
                {recordingState === "paused" && `${formatTimer(seconds)} · paused`}
                {recordingState === "stopped" && `${formatTimer(seconds)} recorded`}
              </div>
            </div>

            {micError && <p className="text-xs text-red-500">{micError}</p>}

            {canUseRecordRow && recordingState === "idle" && (
              <button
                type="button"
                onClick={handleRecord}
                className="flex h-10 items-center justify-center gap-2 rounded-md bg-red-600 text-xs font-semibold text-white hover:bg-red-700"
              >
                <MicIcon className="h-4 w-4" />
                Record
              </button>
            )}

            {canUseRecordRow && (recordingState === "recording" || recordingState === "paused") && (
              <div className="flex overflow-hidden rounded-md border border-stone-300 dark:border-stone-700">
                <button
                  type="button"
                  onClick={recordingState === "recording" ? handlePause : handleResume}
                  className="flex h-9 flex-1 items-center justify-center gap-2 text-xs font-semibold text-stone-700 hover:bg-stone-100 dark:text-stone-200 dark:hover:bg-stone-800"
                >
                  {recordingState === "recording" ? (
                    <>
                      <PauseIcon className="h-4 w-4" />
                      Pause
                    </>
                  ) : (
                    <>
                      <MicIcon className="h-4 w-4" />
                      Resume
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleStop}
                  className="flex h-9 flex-1 items-center justify-center gap-2 bg-stone-900 text-xs font-semibold text-white hover:bg-stone-800 dark:bg-stone-50 dark:text-ink dark:hover:bg-stone-200"
                >
                  <StopIcon className="h-4 w-4" />
                  Stop
                </button>
              </div>
            )}

            {canUseRecordRow && recordingState === "stopped" && (
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={handleRestart}
                  className="flex h-[34px] items-center justify-center gap-2 rounded-md border border-stone-300 dark:border-stone-700 px-2.5 text-xs font-semibold text-stone-500 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800"
                >
                  <RotateCcwIcon className="h-3.5 w-3.5" />
                  Re-record
                </button>
                <button
                  type="button"
                  onClick={goToAnalysis}
                  className="flex h-[34px] items-center justify-center gap-1.5 rounded-md bg-brand-yellow px-3.5 text-xs font-semibold text-on-accent hover:bg-brand-yellow-dark"
                >
                  Continue to analysis
                  <ArrowDownIcon className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {recordingState === "stopped" && audioPanel}
          </div>
        )}

        {mode === "upload" && (
          <div className="mb-5 flex flex-col gap-3">
            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-stone-300 p-6 text-center text-sm text-stone-600 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-900">
              <MicIcon className="h-6 w-6 text-stone-400" />
              <span className="font-semibold">Choose an audio file</span>
              <span className="text-xs text-stone-400 dark:text-stone-500">
                m4a, mp3, wav or webm, up to 4 MB. It&rsquo;s transcribed, then discarded.
              </span>
              <input
                type="file"
                accept="audio/*,video/mp4,video/webm"
                onChange={handleFileChosen}
                className="sr-only"
              />
            </label>
            {micError && <p className="text-xs text-red-500">{micError}</p>}
            {audioPanel}
          </div>
        )}

        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={mode === "write" ? 10 : 6}
          placeholder={
            mode === "speak" || mode === "upload"
              ? "Your transcript appears here. You can also type or paste..."
              : "Paste or write your story, résumé bullet, or essay draft here..."
          }
          className="w-full resize-none rounded-xl border border-stone-300 bg-transparent p-4 text-sm text-ink placeholder:text-stone-400 focus:border-brand-blue focus:outline-none dark:border-stone-700 dark:text-stone-100"
        />

        {error && <p className="mt-2 text-xs text-red-500">{error}</p>}

        <button
          id="tour-submit-btn"
          onClick={handleSubmit}
          disabled={!text.trim() || submitting}
          className="mt-3 flex h-9 w-full items-center justify-center rounded-md bg-brand-yellow text-xs font-semibold text-on-accent hover:bg-brand-yellow-dark disabled:cursor-not-allowed disabled:opacity-40"
        >
          {submitting ? "Scoring…" : "Submit for feedback"}
        </button>
      </main>
      <TourOverlay tourId="new-entry" steps={NEW_ENTRY_TOUR} />
    </div>
  );
}
