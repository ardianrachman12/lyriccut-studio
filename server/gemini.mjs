import fs from 'node:fs';
import { GoogleGenAI } from '@google/genai';
import { buildLyricTimingPrompt } from './prompts/lyricTiming.mjs';
import { normalizeCaptions } from './normalizeCaptions.mjs';

export const DEFAULT_MODEL = 'gemini-3.5-flash-lite';
const INLINE_LIMIT_BYTES = 15 * 1024 * 1024;
const FILE_POLL_MS = 1500;
const FILE_POLL_MAX = 80;

export class GeminiError extends Error {
  constructor(message, status = 500) {
    super(message);
    this.status = status;
  }
}

export const getGeminiConfig = () => {
  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  const configured = Boolean(apiKey) && apiKey !== 'MY_GEMINI_API_KEY';
  const model = (process.env.GEMINI_MODEL || '').trim() || DEFAULT_MODEL;
  return { apiKey, configured, model };
};

const RESPONSE_SCHEMA = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      text: { type: 'string' },
      startMs: { type: 'integer' },
      endMs: { type: 'integer' },
      timestampMs: { type: 'integer' },
      confidence: { type: 'number' },
    },
    required: ['text', 'startMs', 'endMs', 'timestampMs', 'confidence'],
  },
};

const sleep = (ms, signal) =>
  new Promise((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(t);
      reject(new GeminiError('Dibatalkan.', 499));
    });
  });

const describeApiError = (err) => {
  const status = Number(err?.status) || 500;
  const msg = String(err?.message || '');
  if (status === 429) return new GeminiError('Kuota Gemini habis atau terlalu banyak permintaan. Coba lagi nanti.', 429);
  if (status === 401 || status === 403) {
    return new GeminiError('API key Gemini ditolak. Periksa GEMINI_API_KEY di file .env.', 502);
  }
  if (status === 503) {
    return new GeminiError(
      'Model Gemini sedang sibuk (503). Coba lagi sebentar lagi, atau ganti GEMINI_MODEL di file .env.',
      503
    );
  }
  if (status === 404) return new GeminiError('Model Gemini tidak ditemukan. Periksa GEMINI_MODEL.', 502);
  if (status === 400) return new GeminiError(`Permintaan ditolak Gemini: ${msg.slice(0, 200)}`, 502);
  return new GeminiError(`Gagal memanggil Gemini: ${msg.slice(0, 200) || 'kesalahan tidak diketahui'}`, 502);
};

const prepareAudioPart = async (ai, { filePath, mimeType }, signal) => {
  const size = fs.statSync(filePath).size;
  if (size <= INLINE_LIMIT_BYTES) {
    return {
      part: { inlineData: { mimeType, data: fs.readFileSync(filePath).toString('base64') } },
      cleanup: async () => {},
    };
  }

  let file = await ai.files.upload({ file: filePath, config: { mimeType, abortSignal: signal } });
  for (let i = 0; i < FILE_POLL_MAX && file.state === 'PROCESSING'; i++) {
    await sleep(FILE_POLL_MS, signal);
    file = await ai.files.get({ name: file.name });
  }
  if (file.state !== 'ACTIVE') {
    throw new GeminiError('Gemini gagal memproses file audio.', 502);
  }
  return {
    part: { fileData: { fileUri: file.uri, mimeType: file.mimeType || mimeType } },
    cleanup: async () => {
      try {
        await ai.files.delete({ name: file.name });
      } catch {
        // best effort
      }
    },
  };
};

const requestCaptions = async (ai, model, audioPart, prompt, signal) => {
  const response = await ai.models.generateContent({
    model,
    contents: [{ role: 'user', parts: [audioPart, { text: prompt }] }],
    config: {
      responseMimeType: 'application/json',
      responseJsonSchema: RESPONSE_SCHEMA,
      abortSignal: signal,
    },
  });
  const text = response.text;
  if (!text) throw new GeminiError('Gemini tidak mengembalikan hasil.', 502);
  return JSON.parse(text);
};

/**
 * Sends audio + lyrics to Gemini and returns normalized captions.
 * Retries once if the response is not parseable JSON.
 */
export const generateLyricCaptions = async ({ audio, lyrics, durationMs, signal }) => {
  const { apiKey, configured, model } = getGeminiConfig();
  if (!configured) {
    throw new GeminiError('GEMINI_API_KEY belum diisi di file .env.', 503);
  }

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      timeout: 180000,
      // SDK default is 5 attempts with long backoff, which looks like a hang. Keep it short.
      retryOptions: { attempts: 3, initialDelay: 2, maxDelay: 6, httpStatusCodes: [500, 503, 504] },
    },
  });
  const prompt = buildLyricTimingPrompt(lyrics);
  let prepared;
  try {
    prepared = await prepareAudioPart(ai, audio, signal);
    let raw;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        raw = await requestCaptions(ai, model, prepared.part, prompt, signal);
        break;
      } catch (err) {
        if (err instanceof GeminiError) throw err;
        if (err instanceof SyntaxError && attempt === 0) continue;
        throw err instanceof SyntaxError
          ? new GeminiError('Gemini mengembalikan JSON yang tidak valid. Coba lagi.', 502)
          : describeApiError(err);
      }
    }

    const { captions, warnings } = normalizeCaptions(raw, { durationMs, lyrics });
    if (captions.length === 0) {
      throw new GeminiError(
        'Tidak ada lirik yang terdeteksi di audio ini. Pastikan audio berisi vokal dan lirik sesuai.',
        422
      );
    }
    return { captions, warnings, model };
  } catch (err) {
    throw err instanceof GeminiError ? err : describeApiError(err);
  } finally {
    await prepared?.cleanup();
  }
};
