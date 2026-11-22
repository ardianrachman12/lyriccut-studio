import type { GenerateResult } from './lyricsApi';

export type HistoryEntry = {
  id: string;
  createdAt: number;
  audioName: string;
  lyrics: string;
  result: GenerateResult;
};

const STORAGE_KEY = 'lyriccut:lyrics-history';
export const MAX_HISTORY_ENTRIES = 30;

const isEntry = (value: unknown): value is HistoryEntry => {
  const v = value as Partial<HistoryEntry> | null;
  return (
    !!v &&
    typeof v.id === 'string' &&
    typeof v.createdAt === 'number' &&
    typeof v.audioName === 'string' &&
    typeof v.lyrics === 'string' &&
    !!v.result &&
    Array.isArray(v.result.captions)
  );
};

export const loadHistory = (): HistoryEntry[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(isEntry) : [];
  } catch {
    return [];
  }
};

/** Saves newest-first; on quota errors drops the oldest entries until it fits. */
export const saveHistory = (entries: HistoryEntry[]): HistoryEntry[] => {
  let next = entries.slice(0, MAX_HISTORY_ENTRIES);
  while (true) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    } catch {
      if (next.length <= 1) return next;
      next = next.slice(0, next.length - 1);
    }
  }
};

export const createHistoryEntry = (
  audioName: string,
  lyrics: string,
  result: GenerateResult
): HistoryEntry => ({
  id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
  createdAt: Date.now(),
  audioName,
  lyrics,
  result,
});

export const createManualHistoryEntry = (
  title: string,
  lyrics: string,
  captions: GenerateResult['captions']
): HistoryEntry => ({
  id: `manual-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
  createdAt: Date.now(),
  audioName: `${title} (Manual)`,
  lyrics,
  result: {
    captions,
    warnings: [],
    model: 'manual-entry',
    durationMs: null,
  },
});

