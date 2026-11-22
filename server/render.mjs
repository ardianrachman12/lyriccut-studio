import fs from 'node:fs';
import path from 'node:path';
import { bundle } from '@remotion/bundler';
import { makeCancelSignal, renderMedia, selectComposition } from '@remotion/renderer';

const ROOT_DIR = process.cwd();
const ENTRY_POINT = path.join(ROOT_DIR, 'src/remotion/index.ts');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const COMPOSITION_ID = 'LyricClip';

/**
 * Render satu klip LyricClip memakai Remotion Node API.
 * onPhase dipanggil untuk tahap besar, onProgress untuk progres frame/encoding.
 */
export const renderClip = async ({
  inputProps,
  outputPath,
  onPhase = () => {},
  onProgress = () => {},
  signal,
}) => {
  // Remotion 4 memakai cancelSignal berupa callback dari makeCancelSignal(),
  // bukan AbortSignal. Jembatani AbortSignal dari server ke callback tersebut.
  const { cancelSignal, cancel } = makeCancelSignal();
  const onAbort = () => cancel();
  if (signal) {
    if (signal.aborted) {
      cancel();
    } else {
      signal.addEventListener('abort', onAbort, { once: true });
    }
  }

  try {
    onPhase('bundling');

    const serveUrl = await bundle({
      entryPoint: ENTRY_POINT,
      publicDir: PUBLIC_DIR,
    });

    const composition = await selectComposition({
      serveUrl,
      id: COMPOSITION_ID,
      inputProps,
    });

    onPhase('rendering');

    await renderMedia({
      composition,
      serveUrl,
      codec: 'h264',
      outputLocation: outputPath,
      inputProps,
      onProgress: (progress) => onProgress(progress, composition),
      cancelSignal,
      overwrite: true,
    });

    return {
      bytes: fs.statSync(outputPath).size,
      width: composition.width,
      height: composition.height,
      durationInFrames: composition.durationInFrames,
      fps: composition.fps,
    };
  } finally {
    if (signal) signal.removeEventListener('abort', onAbort);
  }
};
