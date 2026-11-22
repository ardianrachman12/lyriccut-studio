import React from 'react';
import { Type } from 'lucide-react';

type Props = {
  title: string;
  onChange: (value: string) => void;
};

// Preview only. Server melakukan sanitasi final sebelum membuat nama file.
const previewSlug = (raw: string): string => {
  const slug = raw
    .trim()
    .replace(/[^\p{L}\p{N}._-]+/gu, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, '');
  return slug || 'lyric-clip';
};

export const TitleInput: React.FC<Props> = ({ title, onChange }) => (
  <div className="flex flex-col gap-2">
    <label
      htmlFor="export-title"
      className="font-display text-sm font-semibold text-slate-100 inline-flex items-center gap-2"
    >
      <Type className="w-3.5 h-3.5 text-slate-400" />
      06. Title
    </label>
    <input
      id="export-title"
      type="text"
      value={title}
      onChange={(e) => onChange(e.target.value)}
      maxLength={60}
      placeholder="Judul lagu / project"
      className="w-full h-10 px-3 rounded-lg bg-[#0d131e] border border-white/[0.10] text-sm text-slate-100 placeholder:text-slate-600 outline-none focus:border-sky-400/60 transition-colors"
    />
    <p className="text-[11px] text-slate-400 font-mono break-all">
      {previewSlug(title)}-YYYYMMDD-HHMMSS.mp4
      <span className="text-slate-500"> · timestamp ditambahkan saat export</span>
    </p>
  </div>
);
