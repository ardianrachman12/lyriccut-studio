import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';

export const AUDIO_DIR = path.join(process.cwd(), '.tmp-audio');
export const MAX_AUDIO_BYTES = 100 * 1024 * 1024;
const STALE_MS = 60 * 60 * 1000;

const MIME_BY_EXT = {
  mp3: 'audio/mp3',
  wav: 'audio/wav',
  m4a: 'audio/aac',
  aac: 'audio/aac',
  ogg: 'audio/ogg',
  flac: 'audio/flac',
};

const EXT_BY_MIME = {
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/wave': 'wav',
  'audio/mp4': 'm4a',
  'audio/x-m4a': 'm4a',
  'audio/aac': 'aac',
  'audio/ogg': 'ogg',
  'audio/flac': 'flac',
  'audio/x-flac': 'flac',
};

export const SUPPORTED_EXTENSIONS = Object.keys(MIME_BY_EXT);

export const resolveAudioExt = (contentType, fileName) => {
  const mime = String(contentType || '').split(';')[0].trim().toLowerCase();
  const fromName = path.extname(String(fileName || '')).slice(1).toLowerCase();
  if (MIME_BY_EXT[fromName]) return fromName;
  return EXT_BY_MIME[mime] || null;
};

export const mimeForExt = (ext) => MIME_BY_EXT[ext];

const ID_PATTERN = /^[a-f0-9]{16}$/;

export const isValidAudioId = (id) => typeof id === 'string' && ID_PATTERN.test(id);

export const newAudioId = () => crypto.randomBytes(8).toString('hex');

export const findAudioFile = (id) => {
  if (!isValidAudioId(id) || !fs.existsSync(AUDIO_DIR)) return null;
  const name = fs.readdirSync(AUDIO_DIR).find((f) => f.startsWith(`${id}.`));
  if (!name) return null;
  const ext = path.extname(name).slice(1);
  return { filePath: path.join(AUDIO_DIR, name), ext, mimeType: mimeForExt(ext) };
};

export const removeAudioFile = (id) => {
  const found = findAudioFile(id);
  if (found) fs.rmSync(found.filePath, { force: true });
};

export const cleanupStaleAudio = () => {
  if (!fs.existsSync(AUDIO_DIR)) return;
  const now = Date.now();
  for (const name of fs.readdirSync(AUDIO_DIR)) {
    const filePath = path.join(AUDIO_DIR, name);
    try {
      if (now - fs.statSync(filePath).mtimeMs > STALE_MS) fs.rmSync(filePath, { force: true });
    } catch {
      // ignore races
    }
  }
};

/** Audio duration in ms via Remotion's bundled ffprobe. Returns null if unavailable. */
export const getAudioDurationMs = (filePath) =>
  new Promise((resolve) => {
    const child = spawn(
      'npx',
      [
        'remotion',
        'ffprobe',
        '-v',
        'error',
        '-show_entries',
        'format=duration',
        '-of',
        'default=noprint_wrappers=1:nokey=1',
        process.platform === 'win32' ? `"${filePath}"` : filePath,
      ],
      { cwd: process.cwd(), shell: process.platform === 'win32', stdio: ['ignore', 'pipe', 'ignore'] }
    );
    let out = '';
    child.stdout.on('data', (c) => (out += c.toString()));
    child.on('error', () => resolve(null));
    child.on('close', () => {
      const m = out.match(/(\d+(?:\.\d+)?)/);
      const seconds = m ? Number(m[1]) : NaN;
      resolve(Number.isFinite(seconds) && seconds > 0 ? Math.round(seconds * 1000) : null);
    });
  });
