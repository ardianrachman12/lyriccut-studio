import React from 'react';
import { AlertCircle, CheckCircle2, FileVideo, Loader2, Upload } from 'lucide-react';
import { formatBytes, formatDurationSec } from '../../lib/format';

export type UploadStatus = 'idle' | 'uploading' | 'uploaded' | 'error';

type Props = {
  fileName: string;
  fileSize: number;
  durationInFrames: number;
  uploadStatus: UploadStatus;
  uploadMessage: string;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
};

export const VideoUploadPanel: React.FC<Props> = ({
  fileName,
  fileSize,
  durationInFrames,
  uploadStatus,
  uploadMessage,
  inputRef,
  onChange,
}) => (
  <div className="flex flex-col gap-3">
    <div className="flex items-center justify-between gap-4">
      <label htmlFor="video-clip-input" className="font-display text-sm font-semibold text-slate-100">
        01. Source Video Clip (MP4)
      </label>
      {fileName ? (
        <span className="text-xs font-mono tabular-nums text-slate-400">
          {formatBytes(fileSize)} · {durationInFrames}f
        </span>
      ) : null}
    </div>

    <label
      htmlFor="video-clip-input"
      className="group relative flex items-center justify-between gap-4 px-4 py-3.5 rounded-lg border border-dashed border-white/[0.16] hover:border-sky-400/70 bg-[#0b0f17] transition-colors cursor-pointer"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-lg bg-[#161e2e] border border-white/[0.08] flex items-center justify-center text-sky-400 shrink-0">
          {fileName ? <FileVideo className="w-4 h-4" /> : <Upload className="w-4 h-4" />}
        </div>
        <div className="min-w-0">
          <div className="text-sm font-medium text-slate-200 truncate">
            {fileName || 'Select MP4 video clip'}
          </div>
          <div className="text-xs text-slate-400 truncate">
            {fileName
              ? `${formatDurationSec(durationInFrames)} seconds detected at 30 fps`
              : 'Reads duration automatically and streams to server'}
          </div>
        </div>
      </div>
      <span className="px-3 py-1.5 text-xs font-medium text-slate-200 bg-[#182132] group-hover:bg-[#1e293b] border border-white/[0.08] rounded-md whitespace-nowrap shrink-0">
        {fileName ? 'Replace' : 'Browse'}
      </span>
      <input
        ref={inputRef}
        id="video-clip-input"
        type="file"
        accept="video/mp4"
        onChange={onChange}
        className="sr-only"
      />
    </label>

    {uploadStatus !== 'idle' ? (
      <div
        className={`flex items-start gap-2 text-xs ${
          uploadStatus === 'uploaded'
            ? 'text-emerald-400'
            : uploadStatus === 'uploading'
            ? 'text-sky-400'
            : 'text-amber-400'
        }`}
      >
        {uploadStatus === 'uploading' ? (
          <Loader2 className="w-3.5 h-3.5 mt-0.5 animate-spin shrink-0" />
        ) : uploadStatus === 'uploaded' ? (
          <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" />
        ) : (
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
        )}
        <span>{uploadMessage}</span>
      </div>
    ) : null}
  </div>
);
