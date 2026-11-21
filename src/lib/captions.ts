import type { Caption } from '@remotion/captions';

export type ValidationResult =
  | { valid: true; captions: Caption[] }
  | { valid: false; error: string };

export const validateCaptionsJson = (raw: string): ValidationResult => {
  if (!raw.trim()) {
    return { valid: false, error: 'Captions JSON cannot be empty.' };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    return {
      valid: false,
      error: err instanceof Error ? `Invalid JSON syntax: ${err.message}` : 'Invalid JSON syntax.',
    };
  }

  if (!Array.isArray(parsed)) {
    return { valid: false, error: 'Root value must be a JSON array of Caption objects.' };
  }

  const normalized: Caption[] = [];
  for (let i = 0; i < parsed.length; i++) {
    const item = parsed[i] as Record<string, unknown> | null;
    if (!item || typeof item !== 'object') {
      return { valid: false, error: `Item at index ${i} must be an object.` };
    }
    if (typeof item.text !== 'string') {
      return { valid: false, error: `Item at index ${i} is missing a string "text" field.` };
    }
    const startMs = Number(item.startMs);
    const endMs = Number(item.endMs);
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) {
      return {
        valid: false,
        error: `Item at index ${i} must have numeric "startMs" and "endMs" values.`,
      };
    }
    if (endMs < startMs) {
      return {
        valid: false,
        error: `Item at index ${i} has "endMs" (${endMs}) earlier than "startMs" (${startMs}).`,
      };
    }

    normalized.push({
      text: item.text,
      startMs,
      endMs,
      timestampMs:
        item.timestampMs !== null && item.timestampMs !== undefined && Number.isFinite(Number(item.timestampMs))
          ? Number(item.timestampMs)
          : Math.round((startMs + endMs) / 2),
      confidence:
        item.confidence !== null && item.confidence !== undefined && Number.isFinite(Number(item.confidence))
          ? Number(item.confidence)
          : 1,
      ...(typeof item.pageBreakAfter === 'boolean' ? { pageBreakAfter: item.pageBreakAfter } : {}),
    });
  }

  return { valid: true, captions: normalized };
};
