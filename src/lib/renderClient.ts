import type { LyricClipProps } from '../remotion/LyricClipVideo';

export type RenderPhase = 'preparing' | 'bundling' | 'rendering' | 'encoding' | 'done';

export type RenderProgress = {
  phase: RenderPhase;
  percent: number;
  renderedFrames: number;
  encodedFrames: number;
  totalFrames: number;
  etaMs: number | null;
  startedAt: number;
};

export type RenderResult = {
  title: string;
  outputName: string;
  outputPath: string;
  downloadUrl: string;
  bytes: number;
};

export type RenderEvent =
  | { type: 'start'; outputName: string; outputPath: string }
  | { type: 'phase'; phase: 'bundling' | 'rendering' }
  | {
      type: 'progress';
      progress: number;
      renderedFrames: number;
      encodedFrames: number;
      totalFrames: number;
      stitchStage?: 'encoding' | 'muxing' | null;
      etaMs: number | null;
    }
  | {
      type: 'done';
      title: string;
      outputName: string;
      outputPath: string;
      downloadUrl: string;
      bytes: number;
    }
  | { type: 'cancelled' }
  | { type: 'error'; message: string };

type StartRenderOptions = {
  onEvent: (event: RenderEvent) => void;
  signal?: AbortSignal;
};

/** Kirim props ke /api/render dan konsumsi event NDJSON sampai selesai. */
export const startRender = async (
  payload: LyricClipProps,
  { onEvent, signal }: StartRenderOptions
): Promise<void> => {
  const response = await fetch('/api/render', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal,
  });

  if (!response.ok) {
    let message = `Render request failed (${response.status}). Pastikan "npm run local" berjalan.`;
    try {
      const body = (await response.json()) as { error?: unknown };
      if (typeof body.error === 'string' && body.error) message = body.error;
    } catch {
      // response bukan JSON; pakai pesan default
    }
    throw new Error(message);
  }

  if (!response.body) {
    throw new Error('Render stream tidak tersedia di browser ini.');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let sawDone = false;
  let sawTerminal = false;

  const handleLine = (line: string) => {
    const trimmed = line.trim();
    if (!trimmed || sawTerminal) return;
    try {
      const event = JSON.parse(trimmed) as RenderEvent;
      onEvent(event);
      if (event.type === 'done') {
        sawDone = true;
        sawTerminal = true;
      } else if (event.type === 'cancelled' || event.type === 'error') {
        sawTerminal = true;
      }
    } catch {
      // baris bukan JSON; abaikan
    }
  };

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      lines.forEach(handleLine);
    }
    buffer += decoder.decode();
    if (buffer.trim()) handleLine(buffer);
  } finally {
    reader.releaseLock();
  }

  if (!sawDone && !sawTerminal && !signal?.aborted) {
    throw new Error('Koneksi render terputus sebelum selesai.');
  }
};
