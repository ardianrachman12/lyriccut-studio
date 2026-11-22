export const BASE_SHORT_SIDE = 1080;
export const MIN_SIDE = 240;
export const MAX_SIDE = 4096;
/** Custom ratios are limited to 1:3 .. 3:1. */
export const MIN_RATIO = 1 / 3;
export const MAX_RATIO = 3;
/** How close a detected ratio must be to a preset to snap to it (relative). */
const SNAP_TOLERANCE = 0.03;

export type AspectPreset = { id: string; w: number; h: number; hint: string };

export const ASPECT_PRESETS: AspectPreset[] = [
  { id: '9:16', w: 9, h: 16, hint: 'TikTok · Reels · Shorts' },
  { id: '4:5', w: 4, h: 5, hint: 'Feed Instagram' },
  { id: '1:1', w: 1, h: 1, hint: 'Kotak' },
  { id: '3:4', w: 3, h: 4, hint: 'Feed portrait' },
  { id: '16:9', w: 16, h: 9, hint: 'YouTube · landscape' },
  { id: '4:3', w: 4, h: 3, hint: 'Landscape klasik' },
];

export type AspectMode = 'auto' | 'preset' | 'custom';

export type AspectSetting = {
  mode: AspectMode;
  presetId: string;
  custom: { w: number; h: number };
};

export type VideoDims = { width: number; height: number };

export type OutputSize = {
  width: number;
  height: number;
  /** Short ratio label, e.g. "9:16" or "2.39:1". */
  ratioLabel: string;
};

export const DEFAULT_ASPECT: AspectSetting = {
  mode: 'preset',
  presetId: '9:16',
  custom: { w: 21, h: 9 },
};

const DEFAULT_PRESET = ASPECT_PRESETS[0];

const toEven = (n: number): number => Math.max(2, 2 * Math.round(n / 2));

/** Short side = 1080, long side from the ratio; both rounded to even numbers (H.264). */
export const sizeFromRatio = (w: number, h: number): { width: number; height: number } => {
  const ratio = w / h;
  return ratio >= 1
    ? { width: toEven(BASE_SHORT_SIDE * ratio), height: BASE_SHORT_SIDE }
    : { width: BASE_SHORT_SIDE, height: toEven(BASE_SHORT_SIDE / ratio) };
};

export const findPreset = (id: string): AspectPreset =>
  ASPECT_PRESETS.find((p) => p.id === id) ?? DEFAULT_PRESET;

/** Nearest preset within tolerance, or null. */
export const matchPreset = (ratio: number): AspectPreset | null => {
  let best: AspectPreset | null = null;
  let bestDiff = Infinity;
  for (const p of ASPECT_PRESETS) {
    const diff = Math.abs(ratio / (p.w / p.h) - 1);
    if (diff <= SNAP_TOLERANCE && diff < bestDiff) {
      best = p;
      bestDiff = diff;
    }
  }
  return best;
};

export const validateCustomRatio = (w: number, h: number): string | null => {
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) {
    return 'Isi lebar dan tinggi dengan angka lebih dari 0.';
  }
  const ratio = w / h;
  if (ratio < MIN_RATIO || ratio > MAX_RATIO) {
    return 'Rasio harus di antara 1:3 dan 3:1.';
  }
  return null;
};

const fromPreset = (p: AspectPreset): OutputSize => ({ ...sizeFromRatio(p.w, p.h), ratioLabel: p.id });

/** Output size for an aspect setting. Falls back to 9:16 when something is missing or invalid. */
export const resolveOutputSize = (setting: AspectSetting, video: VideoDims | null): OutputSize => {
  if (setting.mode === 'preset') {
    return fromPreset(findPreset(setting.presetId));
  }

  if (setting.mode === 'custom') {
    const { w, h } = setting.custom;
    if (validateCustomRatio(w, h) !== null) return fromPreset(DEFAULT_PRESET);
    return { ...sizeFromRatio(w, h), ratioLabel: `${w}:${h}` };
  }

  // auto
  if (!video || video.width <= 0 || video.height <= 0) return fromPreset(DEFAULT_PRESET);
  const ratio = video.width / video.height;
  const preset = matchPreset(ratio);
  if (preset) return fromPreset(preset);
  const clamped = Math.min(MAX_RATIO, Math.max(MIN_RATIO, ratio));
  const label = clamped >= 1 ? `${clamped.toFixed(2)}:1` : `1:${(1 / clamped).toFixed(2)}`;
  return { ...sizeFromRatio(clamped, 1), ratioLabel: label };
};

export const orientationLabel = (width: number, height: number): string =>
  width === height ? 'Square' : height > width ? 'Vertical' : 'Horizontal';

const STORAGE_KEY = 'lyriccut:aspect';

export const loadStoredAspect = (): AspectSetting => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      const mode: AspectMode = p.mode === 'auto' || p.mode === 'custom' ? p.mode : 'preset';
      const w = Number(p.custom?.w);
      const h = Number(p.custom?.h);
      return {
        mode,
        presetId: typeof p.presetId === 'string' ? findPreset(p.presetId).id : DEFAULT_ASPECT.presetId,
        custom: Number.isFinite(w) && Number.isFinite(h) ? { w, h } : DEFAULT_ASPECT.custom,
      };
    }
  } catch {
    // ignore corrupt storage
  }
  return DEFAULT_ASPECT;
};

export const saveAspect = (setting: AspectSetting): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(setting));
  } catch {
    // storage unavailable
  }
};
