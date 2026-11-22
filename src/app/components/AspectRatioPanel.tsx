import React from 'react';
import {
  ASPECT_PRESETS,
  validateCustomRatio,
  type AspectSetting,
  type OutputSize,
  type VideoDims,
} from '../../lib/aspect';

type Props = {
  setting: AspectSetting;
  output: OutputSize;
  video: VideoDims | null;
  onChange: (next: AspectSetting) => void;
};

const chip = (selected: boolean) =>
  `flex flex-col items-start gap-0.5 px-3 py-2 rounded-lg border text-left transition-colors cursor-pointer ${
    selected
      ? 'border-sky-400 bg-sky-400/10'
      : 'border-white/[0.1] hover:border-white/[0.25] bg-[#0b0f17]'
  }`;

export const AspectRatioPanel: React.FC<Props> = ({ setting, output, video, onChange }) => {
  const customError =
    setting.mode === 'custom' ? validateCustomRatio(setting.custom.w, setting.custom.h) : null;

  const autoHint = video
    ? `Terdeteksi ${video.width}×${video.height}`
    : 'Ikuti rasio video (belum ada video, sementara 9:16)';

  return (
    <div className="flex flex-col gap-3">
      <h2 className="font-display text-sm font-semibold text-slate-100">04. Aspect Ratio</h2>

      <div role="radiogroup" aria-label="Aspect ratio" className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        <button
          type="button"
          role="radio"
          aria-checked={setting.mode === 'auto'}
          onClick={() => onChange({ ...setting, mode: 'auto' })}
          className={chip(setting.mode === 'auto')}
        >
          <span className="text-sm font-medium text-slate-200">Otomatis</span>
          <span className="text-[11px] text-slate-400 leading-snug">{autoHint}</span>
        </button>

        {ASPECT_PRESETS.map((p) => {
          const selected = setting.mode === 'preset' && setting.presetId === p.id;
          return (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange({ ...setting, mode: 'preset', presetId: p.id })}
              className={chip(selected)}
            >
              <span className="text-sm font-medium text-slate-200">{p.id}</span>
              <span className="text-[11px] text-slate-400 leading-snug">{p.hint}</span>
            </button>
          );
        })}

        <button
          type="button"
          role="radio"
          aria-checked={setting.mode === 'custom'}
          onClick={() => onChange({ ...setting, mode: 'custom' })}
          className={chip(setting.mode === 'custom')}
        >
          <span className="text-sm font-medium text-slate-200">Kustom</span>
          <span className="text-[11px] text-slate-400 leading-snug">Atur W:H sendiri</span>
        </button>
      </div>

      {setting.mode === 'custom' ? (
        <div className="flex flex-col gap-2 p-3.5 rounded-lg bg-[#0b0f17] border border-white/[0.08]">
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              step="any"
              aria-label="Lebar rasio"
              value={setting.custom.w}
              onChange={(e) =>
                onChange({ ...setting, custom: { ...setting.custom, w: Number(e.target.value) } })
              }
              className="w-20 px-2 py-1 rounded border border-white/[0.15] bg-transparent text-sm text-slate-200 focus:outline-none focus:border-sky-400/60"
            />
            <span className="text-slate-400">:</span>
            <input
              type="number"
              min={1}
              step="any"
              aria-label="Tinggi rasio"
              value={setting.custom.h}
              onChange={(e) =>
                onChange({ ...setting, custom: { ...setting.custom, h: Number(e.target.value) } })
              }
              className="w-20 px-2 py-1 rounded border border-white/[0.15] bg-transparent text-sm text-slate-200 focus:outline-none focus:border-sky-400/60"
            />
            <span className="text-xs text-slate-400">(batas 1:3 sampai 3:1)</span>
          </div>
          {customError ? <span className="text-xs text-rose-400">{customError}</span> : null}
        </div>
      ) : null}

      <p className="text-xs text-slate-400 font-mono tabular-nums">
        Export: {output.width}×{output.height} ({output.ratioLabel})
        {setting.mode === 'custom' && customError ? ' · memakai 9:16 sampai input valid' : ''}
      </p>
    </div>
  );
};
