const WORD_CLEAN = /[^\p{L}\p{N}]+/gu;
const LOOKAHEAD = 12;

const clean = (s) => String(s).toLowerCase().replace(WORD_CLEAN, '');

/** Lyric words with a flag marking the first word of each line. */
const tokenizeLyrics = (lyrics) => {
  const out = [];
  for (const line of String(lyrics).split(/\r?\n/)) {
    const words = line.split(/\s+/).map(clean).filter(Boolean);
    words.forEach((w, i) => out.push({ word: w, lineStart: i === 0 }));
  }
  return out;
};

const toNumber = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : Number(v));

/**
 * Cleans the model output so it always satisfies the Caption contract:
 * sorted, non-overlapping, inside the audio duration, correct word spacing.
 * Returns { captions, warnings }.
 */
export const normalizeCaptions = (raw, { durationMs = null, lyrics = '' } = {}) => {
  const warnings = [];
  const items = (Array.isArray(raw) ? raw : [])
    .filter((it) => it && typeof it === 'object' && typeof it.text === 'string' && it.text.trim())
    .map((it) => ({
      text: it.text.trim(),
      hadSpace: /^\s/.test(it.text),
      startMs: Math.round(toNumber(it.startMs)),
      endMs: Math.round(toNumber(it.endMs)),
      timestampMs: it.timestampMs,
      confidence: it.confidence,
    }))
    .filter((it) => Number.isFinite(it.startMs) && Number.isFinite(it.endMs))
    .sort((a, b) => a.startMs - b.startMs);

  const duration = Number.isFinite(durationMs) && durationMs > 0 ? Math.round(durationMs) : null;
  const kept = [];
  let dropped = 0;

  for (const it of items) {
    it.startMs = Math.max(0, it.startMs);
    if (duration !== null && it.startMs >= duration) {
      dropped++;
      continue;
    }
    if (duration !== null) it.endMs = Math.min(it.endMs, duration);
    if (it.endMs <= it.startMs) it.endMs = it.startMs + 50;

    const prev = kept[kept.length - 1];
    if (prev && it.startMs < prev.endMs) {
      prev.endMs = Math.max(prev.startMs + 1, it.startMs);
    }
    kept.push(it);
  }
  if (dropped > 0) warnings.push(`${dropped} kata dibuang karena berada setelah durasi audio.`);

  // Word spacing: first word of every lyric line has no leading space, the rest have one.
  const lyricWords = tokenizeLyrics(lyrics);
  let pointer = 0;
  let matched = 0;
  kept.forEach((it) => {
    const key = clean(it.text);
    let lineStart = null;
    if (key) {
      for (let j = pointer; j < Math.min(lyricWords.length, pointer + LOOKAHEAD); j++) {
        if (lyricWords[j].word === key) {
          lineStart = lyricWords[j].lineStart;
          pointer = j + 1;
          matched++;
          break;
        }
      }
    }
    if (lineStart === null) {
      // No lyric match: keep what the model chose for the leading space.
      lineStart = !it.hadSpace;
    }
    it.lineStart = lineStart;
  });

  const captions = kept.map((it, idx) => {
    const isFirst = idx === 0;
    const noSpace = isFirst || it.lineStart === true;
    const mid = Math.round((it.startMs + it.endMs) / 2);
    const ts = toNumber(it.timestampMs);
    const conf = toNumber(it.confidence);
    return {
      text: noSpace ? it.text : ` ${it.text}`,
      startMs: it.startMs,
      endMs: it.endMs,
      timestampMs: Number.isFinite(ts) && ts >= it.startMs && ts <= it.endMs ? Math.round(ts) : mid,
      confidence: Number.isFinite(conf) ? Math.min(1, Math.max(0, conf)) : 1,
    };
  });

  const lyricCount = lyricWords.length;
  if (captions.length > 0 && lyricCount > 0) {
    warnings.push(
      `${matched} dari ${captions.length} kata hasil cocok urut dengan lirik (lirik total ${lyricCount} kata).`
    );
  }
  return { captions, warnings };
};
