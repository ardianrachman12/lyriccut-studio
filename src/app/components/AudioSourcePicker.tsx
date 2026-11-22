import React from 'react';
import { FileAudio, Upload } from 'lucide-react';
import { formatBytes } from '../../lib/format';

type Props = {
  file: File | null;
  formats: string[];
  onChange: (file: File | null) => void;
};

export const AudioSourcePicker: React.FC<Props> = ({ file, formats, onChange }) => (
  <div className="flex flex-col gap-3">
    <label htmlFor="audio-input" className="font-display text-sm font-semibold text-slate-100">
      01. File Audio
    </label>
    <label
      htmlFor="audio-input"
      className="group flex items-center justify-between gap-4 px-4 py-3.5 rounded-lg border border-dashed border-white/[0.16] hover:border-sky-400/70 bg-[#0b0f17] transition-colors cursor-pointer"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-lg bg-[#161e2e] border border-white/[0.08] flex items-center justify-center text-sky-400 shrink-0">
          {file ? <FileAudio className="w-4 h-4" /> : <Upload className="w-4 h-4" />}
        </div>
        <div className="min-w-0">
          <div className="text-sm font-medium text-slate-200 truncate">
            {file ? file.name : 'Pilih file audio'}
          </div>
          <div className="text-xs text-slate-400 truncate">
            {file ? formatBytes(file.size) : `Format: ${formats.join(', ')} (maks. 100 MB)`}
          </div>
        </div>
      </div>
      <span className="px-3 py-1.5 text-xs font-medium text-slate-200 bg-[#182132] group-hover:bg-[#1e293b] border border-white/[0.08] rounded-md whitespace-nowrap shrink-0">
        {file ? 'Ganti' : 'Browse'}
      </span>
      <input
        id="audio-input"
        type="file"
        accept={formats.map((f) => `.${f}`).join(',') + ',audio/*'}
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
        className="sr-only"
      />
    </label>
  </div>
);
