import React from 'react';
import { AlertCircle, CheckCircle2, Download, Loader2 } from 'lucide-react';

type Props = {
  isRendering: boolean;
  disabled: boolean;
  hasVideo: boolean;
  error: string;
  successMessage: string;
  onExport: () => void;
};

export const ExportPanel: React.FC<Props> = ({
  isRendering,
  disabled,
  hasVideo,
  error,
  successMessage,
  onExport,
}) => (
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
          Rendering MP4 via Remotion CLI...
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

    {error ? (
      <div className="flex items-start gap-2 text-xs text-rose-400">
        <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
        <span>{error}</span>
      </div>
    ) : null}

    {successMessage ? (
      <div className="flex items-start gap-2 text-xs text-emerald-400">
        <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" />
        <span>{successMessage}</span>
      </div>
    ) : null}
  </div>
);
