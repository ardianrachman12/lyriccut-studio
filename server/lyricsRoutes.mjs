import fs from 'node:fs';
import path from 'node:path';
import {
  AUDIO_DIR,
  MAX_AUDIO_BYTES,
  SUPPORTED_EXTENSIONS,
  cleanupStaleAudio,
  findAudioFile,
  getAudioDurationMs,
  isValidAudioId,
  newAudioId,
  removeAudioFile,
  resolveAudioExt,
} from './audio.mjs';
import { GeminiError, generateLyricCaptions, getGeminiConfig } from './gemini.mjs';
import { MAX_LYRICS_CHARS } from './prompts/lyricTiming.mjs';

const readBody = (req, limit) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > limit) {
        reject(new GeminiError('Body terlalu besar.', 413));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });

const decodeFileName = (value) => {
  try {
    return decodeURIComponent(String(value || ''));
  } catch {
    return '';
  }
};

const handleAudioUpload = async (req, res, sendJson) => {
  const ext = resolveAudioExt(req.headers['content-type'], decodeFileName(req.headers['x-file-name']));
  if (!ext) {
    sendJson(res, 415, {
      error: `Format audio tidak didukung. Gunakan: ${SUPPORTED_EXTENSIONS.join(', ')}.`,
    });
    return;
  }

  const declared = Number(req.headers['content-length']);
  if (Number.isFinite(declared) && declared > MAX_AUDIO_BYTES) {
    sendJson(res, 413, { error: 'File audio terlalu besar (maksimal 100 MB).' });
    return;
  }

  fs.mkdirSync(AUDIO_DIR, { recursive: true });
  cleanupStaleAudio();

  const buffer = await readBody(req, MAX_AUDIO_BYTES);
  if (buffer.length === 0) {
    sendJson(res, 400, { error: 'File audio kosong.' });
    return;
  }

  const audioId = newAudioId();
  const filePath = path.join(AUDIO_DIR, `${audioId}.${ext}`);
  fs.writeFileSync(filePath, buffer);
  const durationMs = await getAudioDurationMs(filePath);

  sendJson(res, 200, { ok: true, audioId, bytes: buffer.length, durationMs });
};

const handleGenerate = async (req, res, sendJson) => {
  let body;
  try {
    body = JSON.parse((await readBody(req, 1024 * 1024)).toString('utf8') || '{}');
  } catch (err) {
    if (err instanceof GeminiError) throw err;
    sendJson(res, 400, { error: 'Body JSON tidak valid.' });
    return;
  }

  const lyrics = typeof body.lyrics === 'string' ? body.lyrics.trim() : '';
  if (!lyrics) {
    sendJson(res, 400, { error: 'Lirik tidak boleh kosong.' });
    return;
  }
  if (lyrics.length > MAX_LYRICS_CHARS) {
    sendJson(res, 400, { error: `Lirik terlalu panjang (maksimal ${MAX_LYRICS_CHARS} karakter).` });
    return;
  }
  if (!isValidAudioId(body.audioId)) {
    sendJson(res, 400, { error: 'audioId tidak valid. Upload audio dulu.' });
    return;
  }
  const audio = findAudioFile(body.audioId);
  if (!audio) {
    sendJson(res, 404, { error: 'File audio tidak ditemukan atau sudah kedaluwarsa. Upload ulang.' });
    return;
  }

  const abort = new AbortController();
  res.on('close', () => {
    if (!res.writableEnded) abort.abort();
  });

  try {
    const durationMs = await getAudioDurationMs(audio.filePath);
    const result = await generateLyricCaptions({
      audio,
      lyrics,
      durationMs,
      signal: abort.signal,
    });
    sendJson(res, 200, { ok: true, ...result, durationMs });
  } finally {
    removeAudioFile(body.audioId);
  }
};

/** Returns true if the request was handled. */
export const handleLyricsRoute = async (req, res, pathname, sendJson) => {
  if (!pathname.startsWith('/api/lyrics/')) return false;

  try {
    if (req.method === 'GET' && pathname === '/api/lyrics/status') {
      const { configured, model } = getGeminiConfig();
      sendJson(res, 200, { configured, model, formats: SUPPORTED_EXTENSIONS });
      return true;
    }
    if (req.method === 'POST' && pathname === '/api/lyrics/audio') {
      await handleAudioUpload(req, res, sendJson);
      return true;
    }
    if (req.method === 'POST' && pathname === '/api/lyrics/generate') {
      await handleGenerate(req, res, sendJson);
      return true;
    }
  } catch (err) {
    if (res.headersSent || res.writableEnded) return true;
    const status = err instanceof GeminiError ? err.status : 500;
    sendJson(res, status === 499 ? 499 : status, {
      error: err instanceof Error ? err.message : 'Terjadi kesalahan pada server.',
    });
    return true;
  }

  sendJson(res, 404, { error: 'Not found' });
  return true;
};
