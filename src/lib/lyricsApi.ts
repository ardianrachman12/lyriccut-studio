import type { Caption } from '@remotion/captions';

export const IMPORT_CAPTIONS_EVENT = 'lyriccut:import-captions';

export type LyricsStatus = {
  configured: boolean;
  model: string;
  formats: string[];
};

export type GenerateResult = {
  captions: Caption[];
  warnings: string[];
  model: string;
  durationMs: number | null;
};

export type GenerateStage = 'uploading' | 'analyzing';

const readError = async (response: Response, fallback: string): Promise<string> => {
  const body = await response.json().catch(() => null);
  return body && typeof body.error === 'string' ? body.error : fallback;
};

export const fetchLyricsStatus = async (): Promise<LyricsStatus> => {
  const response = await fetch('/api/lyrics/status');
  if (!response.ok) throw new Error(`Status ${response.status}`);
  return response.json();
};

export const generateLyricCaptions = async (
  audioFile: File,
  lyrics: string,
  onStage: (stage: GenerateStage) => void,
  signal: AbortSignal
): Promise<GenerateResult> => {
  onStage('uploading');
  const upload = await fetch('/api/lyrics/audio', {
    method: 'POST',
    headers: {
      'Content-Type': audioFile.type || 'application/octet-stream',
      'X-File-Name': encodeURIComponent(audioFile.name),
    },
    body: audioFile,
    signal,
  });
  if (!upload.ok) {
    throw new Error(await readError(upload, `Upload audio gagal (${upload.status}).`));
  }
  const { audioId } = await upload.json();

  onStage('analyzing');
  const generate = await fetch('/api/lyrics/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ audioId, lyrics }),
    signal,
  });
  if (!generate.ok) {
    throw new Error(await readError(generate, `Generate gagal (${generate.status}).`));
  }
  return generate.json();
};
