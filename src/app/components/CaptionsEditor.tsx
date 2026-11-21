import React from 'react';
import { AlertCircle } from 'lucide-react';
import type { ValidationResult } from '../../lib/captions';

type Props = {
  value: string;
  validation: ValidationResult;
  onChange: (value: string) => void;
  onFormat: () => void;
  onLoadSample: () => void;
};

export const CaptionsEditor: React.FC<Props> = ({
  value,
  validation,
  onChange,
  onFormat,
  onLoadSample,
}) => (
  <div className="flex flex-col gap-2.5 flex-1 min-h-[260px]">
    <div className="flex items-center justify-between gap-3">
      <label htmlFor="captions-json-input" className="font-display text-sm font-semibold text-slate-100">
        02. Captions JSON
      </label>
      <div className="flex items-center gap-3">
        <span className="text-xs font-mono tabular-nums text-slate-400">
          {validation.valid ? `${validation.captions.length} words` : 'Invalid'}
        </span>
        <button
          type="button"
          onClick={onFormat}
          disabled={!validation.valid}
          className="text-xs font-medium text-slate-300 hover:text-sky-400 disabled:opacity-40 transition-colors cursor-pointer whitespace-nowrap"
        >
          Format
        </button>
        <button
          type="button"
          onClick={onLoadSample}
          className="text-xs font-medium text-slate-300 hover:text-sky-400 transition-colors cursor-pointer whitespace-nowrap"
        >
          Load sample
        </button>
      </div>
    </div>

    <textarea
      id="captions-json-input"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      spellCheck={false}
      aria-invalid={!validation.valid}
      className={`w-full flex-1 min-h-[220px] p-3.5 rounded-lg bg-[#0b0f17] border font-mono text-xs leading-relaxed text-slate-200 focus:outline-none focus:ring-2 resize-none ${
        validation.valid
          ? 'border-white/[0.1] focus:border-sky-400/60 focus:ring-sky-400/20'
          : 'border-rose-500/70 focus:border-rose-500 focus:ring-rose-500/20'
      }`}
      placeholder='[{"text": "Hello", "startMs": 0, "endMs": 450, "timestampMs": 225, "confidence": 0.99}]'
    />

    {!validation.valid ? (
      <div className="flex items-start gap-2 text-xs text-rose-400">
        <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
        <span>{validation.error}</span>
      </div>
    ) : (
      <div className="text-xs text-slate-400">
        Word-level array compatible with <code className="text-slate-300">@remotion/captions</code>{' '}
        (startMs, endMs, text).
      </div>
    )}
  </div>
);
