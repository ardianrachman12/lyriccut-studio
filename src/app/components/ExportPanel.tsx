import React, { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  Download,
  FolderOpen,
  Loader2,
  RotateCcw,
  X,
} from 'lucide-react';
import type { RenderPhase, RenderProgress, RenderResult } from '../../lib/renderClient';

type Props = {
  isRendering: boolean;
  disabled: boolean;
  hasVideo: boolean;
  error: string;
  cancelled: boolean;
  progress: RenderProgress | null;
  result: RenderResult | null;
  onExport: () => void;
  onCancel: () => void;
  onDownloadAgain: () => void;
  onReveal: (target: 'output' | 'downloads') => void;
};

const phaseLabels: Record<RenderPhase, string> = {
  preparing: 'Menyiapkan render...',
  bundling: 'Menyiapkan project Remotion...',
  rendering: 'Merender frame...',
  encoding: 'Menggabungkan video & audio...',
  done: 'Selesai',
};

const formatMs = (ms: number | null): string => {
  if (ms === null || !Number.isFinite(ms)) return '--:--';
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const formatBytes = (bytes: number): string => {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${bytes} B`;
};

export const ExportPanel: React.FC<Props> = ({
  isRendering,
  disabled,
  hasVideo,
  error,
  cancelled,
  progress,
  result,
  onExport,
  onCancel,
  onDownloadAgain,
  onReveal,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.outputPath);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="pt-2 flex flex-col gap-2.5">
      <button
        type="button"
        onClick={onExport}
        disabled={disabled}
        className="w-full h-11 px-5 rounded-lg bg-sky-400 hover:bg-sky-300 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-display font-semibold text-sm inline-flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:cursor-not-allowed"
      >
        {isRendering ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Rendering video...
          </>
        ) : (
          <>
            <Download className="w-4 h-4" />
            Export Video (MP4)
          </>
        )}
      </button>

      {!hasVideo ? (
        <p className="text-xs text-slate-400 text-center">
          Attach an MP4 file above to enable server-side video export.
        </p>
      ) : null}

      {isRendering && progress ? (
        <div
          role="progressbar"
          aria-valuenow={progress.percent}
          aria-valuemin={0}
          aria-valuemax={100}
          className="rounded-lg border border-sky-400/20 bg-sky-400/[0.04] p-3 flex flex-col gap-2"
        >
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="font-medium text-sky-200">{phaseLabels[progress.phase]}</span>
            <span className="font-mono tabular-nums text-sky-300">{progress.percent}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-sky-400 transition-[width] duration-200"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[11px] font-mono tabular-nums text-slate-400">
            <span>
              {progress.renderedFrames}/{progress.totalFrames} frame · {progress.encodedFrames} encoded
            </span>
            <span>
              ETA {formatMs(progress.etaMs)} ·{' '}
              {formatMs(progress.startedAt ? Date.now() - progress.startedAt : null)} berjalan
            </span>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center justify-center gap-1.5 self-start px-2.5 py-1 rounded-md border border-white/[0.12] text-[11px] text-slate-300 hover:text-white hover:border-white/25 transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            Batalkan render
          </button>
        </div>
      ) : null}

      {result ? (
        <div className="rounded-lg border border-emerald-400/25 bg-emerald-400/[0.05] p-3 flex flex-col gap-2 text-xs">
          <div className="flex items-center gap-2 font-semibold text-emerald-400">
            <CheckCircle2 className="w-4 h-4" />
            Selesai — {formatBytes(result.bytes)}
          </div>
          <div className="font-mono text-slate-200 break-all">{result.outputName}</div>
          <div className="flex items-start gap-2">
            <span className="shrink-0 text-slate-400">Server</span>
            <span className="flex-1 font-mono text-[11px] text-slate-300 break-all">
              {result.outputPath}
            </span>
            <button
              type="button"
              onClick={handleCopy}
              title="Salin path file"
              className="shrink-0 inline-flex items-center gap-1 px-1.5 py-1 rounded border border-white/[0.12] text-[11px] text-slate-300 hover:text-white hover:border-white/25 cursor-pointer"
            >
              {copied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Tersalin' : 'Copy'}
            </button>
          </div>
          <p className="text-[11px] text-slate-400">
            Salinan juga otomatis diunduh ke folder Downloads browser.
          </p>
          <div className="flex flex-wrap gap-2 pt-0.5">
            <button
              type="button"
              onClick={onDownloadAgain}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-white/[0.12] text-[11px] text-slate-300 hover:text-white hover:border-white/25 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Download lagi
            </button>
            <button
              type="button"
              onClick={() => onReveal('output')}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-white/[0.12] text-[11px] text-slate-300 hover:text-white hover:border-white/25 transition-colors cursor-pointer"
            >
              <FolderOpen className="w-3.5 h-3.5" />
              Buka folder hasil
            </button>
            <button
              type="button"
              onClick={() => onReveal('downloads')}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-white/[0.12] text-[11px] text-slate-300 hover:text-white hover:border-white/25 transition-colors cursor-pointer"
            >
              <FolderOpen className="w-3.5 h-3.5" />
              Buka Downloads
            </button>
          </div>
        </div>
      ) : null}

      {cancelled ? (
        <div className="flex items-start gap-2 text-xs text-amber-400">
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>Render dibatalkan.</span>
        </div>
      ) : null}

      {error ? (
        <div className="flex items-start gap-2 text-xs text-rose-400">
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}
    </div>
  );
};
