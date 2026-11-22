import React from 'react';

type Props = {
  value: string;
  maxChars: number;
  onChange: (value: string) => void;
};

export const LyricsInput: React.FC<Props> = ({ value, maxChars, onChange }) => {
  const over = value.length > maxChars;
  return (
    <div className="flex flex-col gap-2.5 flex-1 min-h-[260px]">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor="lyrics-input" className="font-display text-sm font-semibold text-slate-100">
          02. Lirik Lengkap
        </label>
        <span
          className={`text-xs font-mono tabular-nums ${over ? 'text-rose-400' : 'text-slate-400'}`}
        >
          {value.length.toLocaleString()} / {maxChars.toLocaleString()}
        </span>
      </div>
      <textarea
        id="lyrics-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        aria-invalid={over}
        placeholder={'Tempel lirik lagu lengkap di sini, satu baris per kalimat.\nBagian yang tidak ada di audio akan diabaikan.'}
        className={`w-full flex-1 min-h-[220px] p-3.5 rounded-lg bg-[#0b0f17] border text-sm leading-relaxed text-slate-200 focus:outline-none focus:ring-2 resize-none ${
          over
            ? 'border-rose-500/70 focus:border-rose-500 focus:ring-rose-500/20'
            : 'border-white/[0.1] focus:border-sky-400/60 focus:ring-sky-400/20'
        }`}
      />
    </div>
  );
};
