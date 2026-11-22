import 'dotenv/config';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { handleLyricsRoute } from './server/lyricsRoutes.mjs';
import { renderClip } from './server/render.mjs';

const PORT = 3001;
const ROOT_DIR = process.cwd();
const UPLOADS_DIR = path.join(ROOT_DIR, 'uploads');
const OUT_DIR = path.join(ROOT_DIR, 'out');
const UPLOADED_CLIP_NAME = 'uploaded-clip.mp4';
const RENDER_PROPS_PATH = path.join(ROOT_DIR, '.render-props.json');
const LOCAL_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
const OUTPUT_NAME_PATTERN = /^lyric-clip-\d+x\d+-\d{8}-\d{6}\.mp4$/;

// Satu render aktif per server. Dipakai sebagai guard Request 409.
let activeRenderAbort = null;

const DEFAULT_SIZE = { width: 1080, height: 1920 };

// H.264 needs even dimensions; keep within sane bounds. Falls back to 1080x1920.
const sanitizeSize = (rawWidth, rawHeight) => {
  const w = Number(rawWidth);
  const h = Number(rawHeight);
  const ok = (n) => Number.isInteger(n) && n % 2 === 0 && n >= 240 && n <= 4096;
  return ok(w) && ok(h) ? { width: w, height: h } : DEFAULT_SIZE;
};

const makeOutputName = (size) => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  return `lyric-clip-${size.width}x${size.height}-${stamp}.mp4`;
};

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;
const VERTICAL_POSITIONS = ['top', 'middle', 'bottom'];

const sanitizeOverrides = (raw) => {
  const out = {};
  if (!raw || typeof raw !== 'object') return out;
  const scale = Number(raw.fontScale);
  if (Number.isFinite(scale) && scale > 0) {
    out.fontScale = Math.min(1.5, Math.max(0.1, scale));
  }
  if (typeof raw.primaryColor === 'string' && HEX_COLOR.test(raw.primaryColor)) {
    out.primaryColor = raw.primaryColor;
  }
  if (VERTICAL_POSITIONS.includes(raw.vertical)) {
    out.vertical = raw.vertical;
  }
  return out;
};

const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

const sendJson = (res, statusCode, payload) => {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
};

// NDJSON: satu objek JSON per baris, supaya UI bisa membaca progress secara streaming.
const sendEvent = (res, payload) => {
  res.write(`${JSON.stringify(payload)}\n`);
};

const readJsonBody = (req) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8');
        resolve(raw ? JSON.parse(raw) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });

const serveMp4WithRange = (req, res, filePath) => {
  if (!fs.existsSync(filePath)) {
    sendJson(res, 404, { error: 'Video file not found.' });
    return;
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

    if (Number.isNaN(start) || start >= fileSize || end >= fileSize || start > end) {
      res.writeHead(416, {
        'Content-Range': `bytes */${fileSize}`,
      });
      res.end();
      return;
    }

    const chunkSize = end - start + 1;
    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': 'video/mp4',
    });
    fs.createReadStream(filePath, { start, end }).pipe(res);
  } else {
    res.writeHead(200, {
      'Content-Length': fileSize,
      'Accept-Ranges': 'bytes',
      'Content-Type': 'video/mp4',
    });
    fs.createReadStream(filePath).pipe(res);
  }
};

const safeOutputPath = (name) => {
  if (typeof name !== 'string' || !OUTPUT_NAME_PATTERN.test(name)) {
    return null;
  }
  const filePath = path.join(OUT_DIR, name);
  const relative = path.relative(OUT_DIR, filePath);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    return null;
  }
  return filePath;
};

const revealInExplorer = (targetPath, selectFile) => {
  const args = selectFile ? [`/select,${targetPath}`] : [targetPath];
  const child = spawn('explorer.exe', args, {
    cwd: ROOT_DIR,
    stdio: 'ignore',
    detached: true,
  });
  child.on('error', () => {});
  child.unref();
};

const server = http.createServer(async (req, res) => {
  // Only local browser origins may call this server (it spends the Gemini quota).
  const origin = req.headers.origin;
  if (origin) {
    if (!LOCAL_ORIGIN.test(origin)) {
      sendJson(res, 403, { error: 'Origin not allowed.' });
      return;
    }
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-File-Name');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const reqUrl = new URL(req.url || '/', `http://127.0.0.1:${PORT}`);
  const pathname = reqUrl.pathname;

  if (req.method === 'GET' && pathname === '/api/health') {
    sendJson(res, 200, { ok: true, port: PORT });
    return;
  }

  if (
    req.method === 'GET' &&
    (pathname === `/uploads/${UPLOADED_CLIP_NAME}` || pathname === `/${UPLOADED_CLIP_NAME}`)
  ) {
    serveMp4WithRange(req, res, path.join(UPLOADS_DIR, UPLOADED_CLIP_NAME));
    return;
  }

  if (await handleLyricsRoute(req, res, pathname, sendJson)) {
    return;
  }

  if (req.method === 'POST' && pathname === '/api/upload') {
    ensureDir(UPLOADS_DIR);
    const destPath = path.join(UPLOADS_DIR, UPLOADED_CLIP_NAME);
    const writeStream = fs.createWriteStream(destPath);

    let finished = false;
    req.pipe(writeStream);

    writeStream.on('finish', () => {
      if (finished) return;
      finished = true;
      const stat = fs.statSync(destPath);
      sendJson(res, 200, {
        ok: true,
        videoSrc: UPLOADED_CLIP_NAME,
        bytes: stat.size,
      });
    });

    writeStream.on('error', (err) => {
      if (finished) return;
      finished = true;
      sendJson(res, 500, { error: `Failed to save uploaded video: ${err.message}` });
    });

    req.on('error', (err) => {
      if (finished) return;
      finished = true;
      writeStream.destroy();
      sendJson(res, 500, { error: `Upload stream error: ${err.message}` });
    });
    return;
  }

  if (req.method === 'POST' && pathname === '/api/render') {
    if (activeRenderAbort) {
      sendJson(res, 409, {
        error: 'Render sedang berjalan. Tunggu selesai atau batalkan render sebelumnya.',
      });
      return;
    }

    let controller = null;

    try {
      const body = await readJsonBody(req);
      ensureDir(UPLOADS_DIR);
      ensureDir(OUT_DIR);

      const requestedSrc = typeof body.videoSrc === 'string' ? body.videoSrc : UPLOADED_CLIP_NAME;
      const cleanName = path.basename(requestedSrc) || UPLOADED_CLIP_NAME;
      const uploadFilePath = path.join(UPLOADS_DIR, cleanName);

      if (!fs.existsSync(uploadFilePath)) {
        sendJson(res, 400, {
          error: 'No uploaded video found on server. Please attach an MP4 file first.',
        });
        return;
      }

      const publicVideoUrl = `http://127.0.0.1:${PORT}/uploads/${cleanName}`;
      const size = sanitizeSize(body.width, body.height);
      const renderProps = {
        videoSrc: publicVideoUrl,
        captions: Array.isArray(body.captions) ? body.captions : [],
        offsetMs: Number(body.offsetMs) || 0,
        width: size.width,
        height: size.height,
        durationInFrames: Math.max(1, Math.ceil(Number(body.durationInFrames) || 300)),
        templateId: typeof body.templateId === 'string' ? body.templateId : undefined,
        overrides: sanitizeOverrides(body.overrides),
      };

      fs.writeFileSync(RENDER_PROPS_PATH, JSON.stringify(renderProps, null, 2), 'utf8');

      const outputName = makeOutputName(size);
      const outputPath = path.join(OUT_DIR, outputName);

      controller = new AbortController();
      activeRenderAbort = controller;

      let finished = false;
      let completed = false;
      let lastEventAt = 0;
      let lastProgressSent = -1;

      const emit = (payload) => {
        if (!res.destroyed && !res.writableEnded) sendEvent(res, payload);
      };

      const onClientClose = () => {
        if (!finished && !res.writableEnded) controller.abort();
      };
      res.on('close', onClientClose);

      res.writeHead(200, {
        'Content-Type': 'application/x-ndjson; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Accel-Buffering': 'no',
      });

      emit({ type: 'start', outputName, outputPath });

      try {
        const result = await renderClip({
          inputProps: renderProps,
          outputPath,
          signal: controller.signal,
          onPhase: (phase) => emit({ type: 'phase', phase }),
          onProgress: (progress, composition) => {
            const now = Date.now();
            const delta = progress.progress - lastProgressSent;
            if (now - lastEventAt < 100 && delta < 0.005) return;
            lastEventAt = now;
            lastProgressSent = progress.progress;
            emit({
              type: 'progress',
              progress: progress.progress,
              renderedFrames: progress.renderedFrames,
              encodedFrames: progress.encodedFrames,
              totalFrames: composition.durationInFrames,
              stitchStage: progress.stitchStage,
              etaMs: progress.renderEstimatedTime || null,
            });
          },
        });

        completed = true;
        emit({
          type: 'done',
          outputName,
          outputPath,
          downloadUrl: `/api/render/output/${outputName}`,
          bytes: result.bytes,
        });
      } finally {
        finished = true;
        res.off('close', onClientClose);
        if (!completed && fs.existsSync(outputPath)) {
          fs.rmSync(outputPath, { force: true });
        }
        if (activeRenderAbort === controller) activeRenderAbort = null;
      }
    } catch (err) {
      if (res.destroyed) return;
      const message = err instanceof Error ? err.message : 'Render gagal.';
      if (res.headersSent) {
        if (!res.writableEnded) {
          if (controller?.signal.aborted) {
            sendEvent(res, { type: 'cancelled' });
          } else {
            sendEvent(res, { type: 'error', message });
          }
        }
      } else {
        sendJson(res, 500, { error: message });
      }
    } finally {
      if (!res.destroyed && !res.writableEnded) res.end();
    }
    return;
  }

  if (req.method === 'GET' && pathname.startsWith('/api/render/output/')) {
    let name = pathname.slice('/api/render/output/'.length);
    try {
      name = decodeURIComponent(name);
    } catch {
      // biarkan nama apa adanya; validasi regex tetap berlaku
    }
    const filePath = safeOutputPath(name);
    if (!filePath) {
      sendJson(res, 400, { error: 'Nama file hasil tidak valid.' });
      return;
    }
    serveMp4WithRange(req, res, filePath);
    return;
  }

  if (req.method === 'POST' && pathname === '/api/render/reveal') {
    if (process.platform !== 'win32') {
      sendJson(res, 501, { error: 'Fitur ini hanya tersedia di Windows.' });
      return;
    }

    try {
      const body = await readJsonBody(req);
      if (body.target === 'downloads') {
        revealInExplorer(path.join(os.homedir(), 'Downloads'), false);
      } else {
        const filePath = safeOutputPath(body.name);
        if (!filePath || !fs.existsSync(filePath)) {
          sendJson(res, 404, { error: 'File hasil tidak ditemukan.' });
          return;
        }
        revealInExplorer(filePath, true);
      }
      sendJson(res, 200, { ok: true });
    } catch (err) {
      sendJson(res, 500, {
        error: err instanceof Error ? err.message : 'Gagal membuka folder.',
      });
    }
    return;
  }

  sendJson(res, 404, { error: 'Not found' });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Local Remotion render server listening on http://127.0.0.1:${PORT}`);
});
