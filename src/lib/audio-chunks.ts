"use client";

// The transcribe endpoint accepts at most ~4 MB per request (Vercel's request
// body cap). Instead of rejecting longer audio, we decode it in the browser,
// downsample to 16 kHz mono (all speech recognition needs), and cut it into
// parts of ~100 s — each cut placed at the quietest moment near the target,
// so words aren't sliced in half. Nothing is uploaded or stored by this step.

const RATE = 16000;
const CHUNK_SECONDS = 100; // 100 s of 16 kHz mono 16-bit WAV ≈ 3.2 MB
const SEARCH_SECONDS = 6;

export class AudioTooLongError extends Error {
  seconds: number;
  constructor(seconds: number) {
    super("Audio too long");
    this.seconds = seconds;
  }
}

function encodeWav(samples: Float32Array): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const write = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  };
  write(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  write(8, "WAVE");
  write(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, RATE, true);
  view.setUint32(28, RATE * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  write(36, "data");
  view.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([buffer], { type: "audio/wav" });
}

// Finds the quietest ~200 ms stretch in the last few seconds before `end`.
function quietCutPoint(samples: Float32Array, end: number): number {
  const win = Math.floor(RATE * 0.2);
  const from = Math.max(0, end - SEARCH_SECONDS * RATE);
  let bestStart = end - win;
  let bestEnergy = Infinity;
  for (let i = from; i + win <= end; i += Math.floor(win / 2)) {
    let energy = 0;
    for (let j = i; j < i + win; j += 8) energy += Math.abs(samples[j]);
    if (energy < bestEnergy) {
      bestEnergy = energy;
      bestStart = i;
    }
  }
  return bestStart + Math.floor(win / 2);
}

export async function splitAudioForTranscription(
  blob: Blob,
  maxSeconds: number
): Promise<Blob[]> {
  const Ctx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new Ctx();
  let decoded: AudioBuffer;
  try {
    decoded = await ctx.decodeAudioData(await blob.arrayBuffer());
  } finally {
    ctx.close().catch(() => {});
  }
  if (decoded.duration > maxSeconds) throw new AudioTooLongError(decoded.duration);

  const offline = new OfflineAudioContext(1, Math.ceil(decoded.duration * RATE), RATE);
  const source = offline.createBufferSource();
  source.buffer = decoded;
  source.connect(offline.destination);
  source.start();
  const samples = (await offline.startRendering()).getChannelData(0);

  const parts: Blob[] = [];
  const target = CHUNK_SECONDS * RATE;
  let start = 0;
  while (start < samples.length) {
    let end = Math.min(start + target, samples.length);
    if (end < samples.length) end = quietCutPoint(samples, end);
    parts.push(encodeWav(samples.subarray(start, end)));
    start = end;
  }
  return parts;
}
