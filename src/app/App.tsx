import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Player } from '@remotion/player';
import type { Caption } from '@remotion/captions';
import { RotateCcw } from 'lucide-react';
import { LyricClipVideo, type LyricClipProps } from '../remotion/LyricClipVideo';
import {
  DEFAULT_TEMPLATE_ID,
  getTemplate,
  type TemplateOverrides,
} from '../remotion/templates';
import { DEFAULT_CAPTIONS, DEFAULT_DURATION_FRAMES } from '../data/defaultCaptions';
import { validateCaptionsJson } from '../lib/captions';
import {
  COMPOSITION_HEIGHT,
  COMPOSITION_WIDTH,
  FPS,
  formatDurationSec,
} from '../lib/format';
import { VideoUploadPanel, type UploadStatus } from './components/VideoUploadPanel';
import { CaptionsEditor } from './components/CaptionsEditor';
import { TemplatePicker } from './components/TemplatePicker';
import { OverridePanel } from './components/OverridePanel';
import { OffsetControl } from './components/OffsetControl';
import { ExportPanel } from './components/ExportPanel';

const STYLE_STORAGE_KEY = 'lyriccut:style';

const loadStoredStyle = (): { templateId: string; overrides: TemplateOverrides } => {
  try {
    const raw = localStorage.getItem(STYLE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        templateId: typeof parsed.templateId === 'string' ? parsed.templateId : DEFAULT_TEMPLATE_ID,
        overrides: parsed.overrides && typeof parsed.overrides === 'object' ? parsed.overrides : {},
      };
    }
  } catch {
    // ignore corrupt storage
  }
  return { templateId: DEFAULT_TEMPLATE_ID, overrides: {} };
};

export default function App() {
  const [blobUrl, setBlobUrl] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [fileSize, setFileSize] = useState<number>(0);
  const [durationInFrames, setDurationInFrames] = useState<number>(DEFAULT_DURATION_FRAMES);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle');
  const [uploadMessage, setUploadMessage] = useState<string>('');

  const [captionsText, setCaptionsText] = useState<string>(() =>
    JSON.stringify(DEFAULT_CAPTIONS, null, 2)
  );
  const [offsetMs, setOffsetMs] = useState<number>(0);
  const [templateId, setTemplateId] = useState<string>(() => loadStoredStyle().templateId);
  const [overrides, setOverrides] = useState<TemplateOverrides>(() => loadStoredStyle().overrides);

  const [isRendering, setIsRendering] = useState<boolean>(false);
  const [renderError, setRenderError] = useState<string>('');
  const [renderSuccessMessage, setRenderSuccessMessage] = useState<string>('');

  const hiddenVideoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const activeBlobUrlRef = useRef<string>('');

  useEffect(() => {
    return () => {
      if (activeBlobUrlRef.current) {
        URL.revokeObjectURL(activeBlobUrlRef.current);
      }
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STYLE_STORAGE_KEY, JSON.stringify({ templateId, overrides }));
    } catch {
      // storage unavailable; ignore
    }
  }, [templateId, overrides]);

  const validation = useMemo(() => validateCaptionsJson(captionsText), [captionsText]);
  const [lastValidCaptions, setLastValidCaptions] = useState<Caption[]>(DEFAULT_CAPTIONS);

  useEffect(() => {
    if (validation.valid) {
      setLastValidCaptions(validation.captions);
    }
  }, [validation]);

  const handleVideoFileSelect = useCallback(async (file: File | null) => {
    if (!file) return;

    setRenderError('');
    setRenderSuccessMessage('');

    if (activeBlobUrlRef.current) {
      URL.revokeObjectURL(activeBlobUrlRef.current);
    }

    const nextBlobUrl = URL.createObjectURL(file);
    activeBlobUrlRef.current = nextBlobUrl;
    setBlobUrl(nextBlobUrl);
    setFileName(file.name);
    setFileSize(file.size);

    setUploadStatus('uploading');
    setUploadMessage('Uploading clip to local render server...');

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Content-Type': file.type || 'video/mp4',
        },
        body: file,
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(
          typeof errBody.error === 'string'
            ? errBody.error
            : `Upload failed (${response.status})`
        );
      }

      setUploadStatus('uploaded');
      setUploadMessage('Synced to server as uploads/uploaded-clip.mp4');
    } catch {
      setUploadStatus('error');
      setUploadMessage(
        'Local preview active. Start local render server (npm run local) for MP4 export.'
      );
    }
  }, []);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    void handleVideoFileSelect(file);
  };

  const handleHiddenMetadataLoaded = () => {
    const videoEl = hiddenVideoRef.current;
    if (!videoEl) return;
    const rawDuration = videoEl.duration;
    if (Number.isFinite(rawDuration) && rawDuration > 0) {
      setDurationInFrames(Math.max(1, Math.ceil(rawDuration * FPS)));
    }
  };

  const handleFormatJson = () => {
    if (!validation.valid) return;
    setCaptionsText(JSON.stringify(validation.captions, null, 2));
  };

  const handleLoadSample = () => {
    setCaptionsText(JSON.stringify(DEFAULT_CAPTIONS, null, 2));
  };

  const handleResetWorkspace = () => {
    if (activeBlobUrlRef.current) {
      URL.revokeObjectURL(activeBlobUrlRef.current);
      activeBlobUrlRef.current = '';
    }
    setBlobUrl('');
    setFileName('');
    setFileSize(0);
    setDurationInFrames(DEFAULT_DURATION_FRAMES);
    setUploadStatus('idle');
    setUploadMessage('');
    setCaptionsText(JSON.stringify(DEFAULT_CAPTIONS, null, 2));
    setOffsetMs(0);
    setRenderError('');
    setRenderSuccessMessage('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleExportVideo = async () => {
    if (!validation.valid) {
      setRenderError('Fix captions JSON validation errors before exporting.');
      return;
    }

    setIsRendering(true);
    setRenderError('');
    setRenderSuccessMessage('');

    try {
      const payload: LyricClipProps = {
        videoSrc: 'uploaded-clip.mp4',
        captions: validation.captions,
        offsetMs,
        durationInFrames,
        templateId,
        overrides,
      };

      const response = await fetch('/api/render', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const errJson = await response.json();
          throw new Error(errJson.error || `Render failed (${response.status})`);
        }
        throw new Error(`Render request failed (${response.status}). Ensure "npm run local" is running.`);
      }

      const disposition = response.headers.get('content-disposition') || '';
      const exportName = /filename="([^"]+)"/.exec(disposition)?.[1] || 'lyric-clip.mp4';
      const mp4Blob = await response.blob();
      const downloadUrl = URL.createObjectURL(mp4Blob);
      const anchor = document.createElement('a');
      anchor.href = downloadUrl;
      anchor.download = exportName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(downloadUrl);

      setRenderSuccessMessage(`Exported and downloaded ${exportName}.`);
    } catch (err) {
      setRenderError(
        err instanceof Error
          ? err.message
          : 'Failed to export video. Check that the local render server is running.'
      );
    } finally {
      setIsRendering(false);
    }
  };

  const playerInputProps = useMemo<LyricClipProps>(
    () => ({
      videoSrc: blobUrl,
      captions: lastValidCaptions,
      offsetMs,
      durationInFrames,
      templateId,
      overrides,
    }),
    [blobUrl, lastValidCaptions, offsetMs, durationInFrames, templateId, overrides]
  );

  const selectedTemplate = getTemplate(templateId);

  return (
    <div className="min-h-screen bg-[#0b0f17] text-slate-100 flex flex-col">
      {/* Hidden video element to read native MP4 duration via onLoadedMetadata */}
      {blobUrl ? (
        <video
          ref={hiddenVideoRef}
          src={blobUrl}
          preload="metadata"
          onLoadedMetadata={handleHiddenMetadataLoaded}
          className="hidden"
        />
      ) : null}

      <header className="h-14 border-b border-white/[0.08] bg-[#0e131d] px-6 flex items-center justify-between gap-8 shrink-0">
        <a
          href="/"
          className="font-display text-base font-bold tracking-tight text-slate-50 whitespace-nowrap shrink-0"
        >
          LyricCut Studio
        </a>

        <div className="hidden md:flex items-center gap-3 text-xs text-slate-400 font-mono tabular-nums whitespace-nowrap">
          <span>1080 × 1920</span>
          <span aria-hidden="true">·</span>
          <span>9:16 Vertical</span>
          <span aria-hidden="true">·</span>
          <span>{FPS} FPS</span>
          <span aria-hidden="true">·</span>
          <span>{durationInFrames} frames ({formatDurationSec(durationInFrames)}s)</span>
        </div>

        <button
          type="button"
          onClick={handleResetWorkspace}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white border border-white/[0.1] hover:border-white/[0.2] rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset
        </button>
      </header>

      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <section className="lg:col-span-6 xl:col-span-5 bg-[#121824] border border-white/[0.08] rounded-xl p-6 flex flex-col gap-6">
          <VideoUploadPanel
            fileName={fileName}
            fileSize={fileSize}
            durationInFrames={durationInFrames}
            uploadStatus={uploadStatus}
            uploadMessage={uploadMessage}
            inputRef={fileInputRef}
            onChange={handleFileInputChange}
          />

          <div className="h-px bg-white/[0.07]" />

          <CaptionsEditor
            value={captionsText}
            validation={validation}
            onChange={setCaptionsText}
            onFormat={handleFormatJson}
            onLoadSample={handleLoadSample}
          />

          <div className="h-px bg-white/[0.07]" />

          <div className="flex flex-col gap-3">
            <h2 className="font-display text-sm font-semibold text-slate-100">
              03. Lyric Style
            </h2>
            <TemplatePicker selectedId={selectedTemplate.id} onSelect={setTemplateId} />
            <OverridePanel
              template={selectedTemplate}
              overrides={overrides}
              onChange={setOverrides}
            />
          </div>

          <div className="h-px bg-white/[0.07]" />

          <OffsetControl offsetMs={offsetMs} onChange={setOffsetMs} />

          <ExportPanel
            isRendering={isRendering}
            disabled={isRendering || !validation.valid || !blobUrl}
            hasVideo={Boolean(blobUrl)}
            error={renderError}
            successMessage={renderSuccessMessage}
            onExport={handleExportVideo}
          />
        </section>

        <section className="lg:col-span-6 xl:col-span-7 bg-[#121824] border border-white/[0.08] rounded-xl p-6 flex flex-col items-center justify-center gap-4">
          <div className="w-full flex items-center justify-between text-xs text-slate-400">
            <span className="font-display font-semibold text-slate-200 text-sm">
              Live 9:16 Preview
            </span>
            <span className="font-mono tabular-nums">
              {COMPOSITION_WIDTH}×{COMPOSITION_HEIGHT} · {formatDurationSec(durationInFrames)}s
            </span>
          </div>

          <div className="w-full flex-1 flex items-center justify-center min-h-[480px]">
            <div className="w-full max-w-[360px] sm:max-w-[380px] aspect-[9/16] rounded-xl overflow-hidden border border-white/[0.12] bg-[#05080f] shadow-2xl">
              <Player
                component={LyricClipVideo}
                inputProps={playerInputProps}
                durationInFrames={durationInFrames}
                fps={FPS}
                compositionWidth={COMPOSITION_WIDTH}
                compositionHeight={COMPOSITION_HEIGHT}
                style={{ width: '100%', height: '100%' }}
                controls
                loop
              />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
