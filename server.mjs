import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const PORT = 3001;
const ROOT_DIR = process.cwd();
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const OUT_DIR = path.join(ROOT_DIR, 'out');
const UPLOADED_CLIP_NAME = 'uploaded-clip.mp4';
const RENDER_PROPS_PATH = path.join(ROOT_DIR, '.render-props.json');
const makeOutputName = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  return `lyric-clip-${stamp}.mp4`;
};

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;
const VERTICAL_POSITIONS = ['top', 'middle', 'bottom'];

const sanitizeOverrides = (raw) => {
  const out = {};
  if (!raw || typeof raw !== 'object') return out;
  const scale = Number(raw.fontScale);
  if (Number.isFinite(scale) && scale > 0) {
    out.fontScale = Math.min(1.5, Math.max(0.7, scale));
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

const runRemotionRender = (outputName) =>
  new Promise((resolve, reject) => {
    const args = [
      'remotion',
      'render',
      'src/remotion/index.ts',
      'LyricClip',
      `out/${outputName}`,
      '--props=.render-props.json',
    ];

    const child = spawn('npx', args, {
      cwd: ROOT_DIR,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: process.platform === 'win32',
    });

    let stderr = '';
    child.stdout.on('data', (chunk) => {
      process.stdout.write(chunk);
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
      process.stderr.write(chunk);
    });

    child.on('error', (err) => {
      reject(err);
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Remotion render exited with code ${code}: ${stderr.slice(-1000)}`));
      }
    });
  });

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

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
    (pathname === `/public/${UPLOADED_CLIP_NAME}` || pathname === `/${UPLOADED_CLIP_NAME}`)
  ) {
    serveMp4WithRange(req, res, path.join(PUBLIC_DIR, UPLOADED_CLIP_NAME));
    return;
  }

  if (req.method === 'POST' && pathname === '/api/upload') {
    ensureDir(PUBLIC_DIR);
    const destPath = path.join(PUBLIC_DIR, UPLOADED_CLIP_NAME);
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
    try {
      const body = await readJsonBody(req);
      ensureDir(PUBLIC_DIR);
      ensureDir(OUT_DIR);

      const requestedSrc = typeof body.videoSrc === 'string' ? body.videoSrc : UPLOADED_CLIP_NAME;
      const cleanName = path.basename(requestedSrc) || UPLOADED_CLIP_NAME;
      const publicFilePath = path.join(PUBLIC_DIR, cleanName);

      if (!fs.existsSync(publicFilePath)) {
        sendJson(res, 400, {
          error: 'No uploaded video found on server. Please attach an MP4 file first.',
        });
        return;
      }

      const publicVideoUrl = `http://127.0.0.1:${PORT}/public/${cleanName}`;
      const renderProps = {
        videoSrc: publicVideoUrl,
        captions: Array.isArray(body.captions) ? body.captions : [],
        offsetMs: Number(body.offsetMs) || 0,
        durationInFrames: Math.max(1, Math.ceil(Number(body.durationInFrames) || 300)),
        templateId: typeof body.templateId === 'string' ? body.templateId : undefined,
        overrides: sanitizeOverrides(body.overrides),
      };

      fs.writeFileSync(RENDER_PROPS_PATH, JSON.stringify(renderProps, null, 2), 'utf8');

      const outputName = makeOutputName();
      const outputPath = path.join(OUT_DIR, outputName);
      await runRemotionRender(outputName);

      if (!fs.existsSync(outputPath)) {
        sendJson(res, 500, { error: 'Render finished but output MP4 was not found.' });
        return;
      }

      const stat = fs.statSync(outputPath);
      res.writeHead(200, {
        'Content-Type': 'video/mp4',
        'Content-Length': stat.size,
        'Content-Disposition': `attachment; filename="${outputName}"`,
        'Access-Control-Expose-Headers': 'Content-Disposition',
      });
      fs.createReadStream(outputPath).pipe(res);
    } catch (err) {
      sendJson(res, 500, {
        error: err instanceof Error ? err.message : 'Failed to render video.',
      });
    }
    return;
  }

  sendJson(res, 404, { error: 'Not found' });
});

server.listen(PORT, () => {
  console.log(`Local Remotion render server listening on http://localhost:${PORT}`);
});
