import React from 'react';
import { SlidersHorizontal } from 'lucide-react';

type Props = {
  offsetMs: number;
  onChange: (value: number) => void;
};

const MIN = -1000;
const MAX = 1000;

export const OffsetControl: React.FC<Props> = ({ offsetMs, onChange }) => (
  <div className="flex flex-col gap-3">
    <div className="flex items-center justify-between gap-4">
      <label
        htmlFor="offset-timing-slider"
        className="font-display text-sm font-semibold text-slate-100 inline-flex items-center gap-2"
      >
        <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
        04. Offset Timing (ms)
      </label>
      <span className="font-mono text-sm font-semibold tabular-nums text-sky-400">
        {offsetMs > 0 ? `+${offsetMs} ms` : `${offsetMs} ms`}
      </span>
    </div>

    <input
      id="offset-timing-slider"
      type="range"
      min={MIN}
      max={MAX}
      step={10}
      value={offsetMs}
      onChange={(e) => onChange(Number(e.target.value))}
      className="studio-slider w-full"
    />

    <div className="flex items-center justify-between text-xs text-slate-400 font-mono tabular-nums">
      <span>-1000 ms (Earlier)</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(Math.max(MIN, offsetMs - 50))}
          className="px-2 py-0.5 rounded border border-white/[0.08] hover:border-white/[0.2] text-slate-300 cursor-pointer"
        >
          -50
        </button>
        <button
          type="button"
          onClick={() => onChange(0)}
          className="px-2 py-0.5 rounded border border-white/[0.08] hover:border-white/[0.2] text-slate-300 cursor-pointer"
        >
          0 ms
        </button>
        <button
          type="button"
          onClick={() => onChange(Math.min(MAX, offsetMs + 50))}
          className="px-2 py-0.5 rounded border border-white/[0.08] hover:border-white/[0.2] text-slate-300 cursor-pointer"
        >
          +50
        </button>
      </div>
      <span>+1000 ms (Later)</span>
    </div>
  </div>
);
