import React from 'react';
import {
  FONT_SCALE_MAX,
  FONT_SCALE_MIN,
  type LyricTemplate,
  type TemplateOverrides,
  type VerticalPosition,
} from '../../remotion/templates';

type Props = {
  template: LyricTemplate;
  overrides: TemplateOverrides;
  onChange: (next: TemplateOverrides) => void;
};

const POSITIONS: { value: VerticalPosition; label: string }[] = [
  { value: 'top', label: 'Atas' },
  { value: 'middle', label: 'Tengah' },
  { value: 'bottom', label: 'Bawah' },
];

export const OverridePanel: React.FC<Props> = ({ template, overrides, onChange }) => {
  const fontScale = overrides.fontScale ?? 1;
  const primaryColor = overrides.primaryColor ?? template.colors.active;
  const vertical = overrides.vertical ?? template.position.vertical;
  const hasOverrides = Object.keys(overrides).length > 0;

  return (
    <div className="flex flex-col gap-4 p-3.5 rounded-lg bg-[#0b0f17] border border-white/[0.08]">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label htmlFor="font-scale-slider" className="text-xs font-medium text-slate-300">
            Ukuran font
          </label>
          <span className="font-mono text-xs tabular-nums text-sky-400">
            {Math.round(fontScale * 100)}%
          </span>
        </div>
        <input
          id="font-scale-slider"
          type="range"
          min={FONT_SCALE_MIN}
          max={FONT_SCALE_MAX}
          step={0.05}
          value={fontScale}
          onChange={(e) => onChange({ ...overrides, fontScale: Number(e.target.value) })}
          className="studio-slider w-full"
        />
      </div>

      <div className="flex items-center justify-between gap-3">
        <label htmlFor="primary-color-input" className="text-xs font-medium text-slate-300">
          Warna utama (kata aktif)
        </label>
        <div className="flex items-center gap-2">
          <input
            id="primary-color-input"
            type="color"
            value={primaryColor}
            onChange={(e) => onChange({ ...overrides, primaryColor: e.target.value })}
            className="w-9 h-7 rounded border border-white/[0.15] bg-transparent cursor-pointer"
          />
          {overrides.primaryColor ? (
            <button
              type="button"
              onClick={() => {
                const { primaryColor: _removed, ...rest } = overrides;
                onChange(rest);
              }}
              className="text-xs text-slate-400 hover:text-sky-400 cursor-pointer"
            >
              Reset
            </button>
          ) : null}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-medium text-slate-300">Posisi</span>
        <div role="radiogroup" aria-label="Posisi vertikal" className="inline-flex rounded-md overflow-hidden border border-white/[0.12]">
          {POSITIONS.map((p) => (
            <button
              key={p.value}
              type="button"
              role="radio"
              aria-checked={vertical === p.value}
              onClick={() => onChange({ ...overrides, vertical: p.value })}
              className={`px-3 py-1 text-xs font-medium cursor-pointer transition-colors ${
                vertical === p.value
                  ? 'bg-sky-400 text-slate-950'
                  : 'bg-transparent text-slate-300 hover:bg-white/[0.06]'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={() => onChange({})}
        disabled={!hasOverrides}
        className="self-start text-xs font-medium text-slate-300 hover:text-sky-400 disabled:opacity-40 disabled:hover:text-slate-300 cursor-pointer disabled:cursor-not-allowed"
      >
        Reset semua override
      </button>
    </div>
  );
};
