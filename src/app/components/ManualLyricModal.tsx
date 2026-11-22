import React, { useState } from 'react';
import { PlusCircle, X, Check, AlertCircle } from 'lucide-react';
import { validateCaptionsJson } from '../../lib/captions';
import type { Caption } from '@remotion/captions';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (title: string, lyrics: string, captions: Caption[]) => void;
};

const SAMPLE_CAPTIONS: Caption[] = [
  { text: 'Sample', startMs: 0, endMs: 500, timestampMs: 0, confidence: 1 },
  { text: 'Manual', startMs: 500, endMs: 1000, timestampMs: 500, confidence: 1 },
  { text: 'Caption', startMs: 1000, endMs: 1500, timestampMs: 1000, confidence: 1 },
];

export const ManualLyricModal: React.FC<Props> = ({ isOpen, onClose, onSave }) => {
  const [title, setTitle] = useState('');
  const [lyricsText, setLyricsText] = useState('');
  const [jsonText, setJsonText] = useState(JSON.stringify(SAMPLE_CAPTIONS, null, 2));
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedTitle = title.trim() || 'Lirik Manual';
    const validation = validateCaptionsJson(jsonText);

    if (!validation.valid) {
      setError(validation.error || 'Format JSON tidak valid.');
      return;
    }

    if (validation.captions.length === 0) {
      setError('Array caption tidak boleh kosong.');
      return;
    }

    // Auto-derive lyrics text if empty
    const finalLyrics = lyricsText.trim() || validation.captions.map((c) => c.text).join(' ');

    onSave(trimmedTitle, finalLyrics, validation.captions);
    onClose();
    // Reset form
    setTitle('');
    setLyricsText('');
    setJsonText(JSON.stringify(SAMPLE_CAPTIONS, null, 2));
    setError('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-[#121824] border border-white/[0.12] rounded-xl w-full max-w-lg p-6 shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
          <h3 className="font-display font-semibold text-base text-slate-100 flex items-center gap-2">
            <PlusCircle className="w-4 h-4 text-sky-400" />
            Tambah Riwayat Lirik Manual
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-md transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-slate-300">Judul / Nama Lagu</label>
            <input
              type="text"
              placeholder="Misal: My Song (Manual)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full h-9 px-3 bg-[#0b0f17] border border-white/[0.1] rounded-lg text-sm text-slate-100 placeholder:text-slate-500 focus:outline-hidden focus:border-sky-400/60"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-slate-300">
              Teks Lirik (Opsional - otomatis diambil dari JSON jika kosong)
            </label>
            <textarea
              rows={2}
              placeholder="Masukkan teks lirik mentah..."
              value={lyricsText}
              onChange={(e) => setLyricsText(e.target.value)}
              className="w-full px-3 py-2 bg-[#0b0f17] border border-white/[0.1] rounded-lg text-sm text-slate-100 placeholder:text-slate-500 focus:outline-hidden focus:border-sky-400/60 resize-none"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-slate-300">
                Data JSON Captions (`Caption[]`)
              </label>
              <button
                type="button"
                onClick={() => setJsonText(JSON.stringify(SAMPLE_CAPTIONS, null, 2))}
                className="text-[11px] text-sky-400 hover:underline cursor-pointer"
              >
                Reset Contoh JSON
              </button>
            </div>
            <textarea
              rows={8}
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              className="w-full px-3 py-2 bg-[#0b0f17] border border-white/[0.1] rounded-lg text-xs font-mono text-slate-200 placeholder:text-slate-500 focus:outline-hidden focus:border-sky-400/60 resize-y"
            />
          </div>

          {error ? (
            <div className="flex items-start gap-2 text-xs text-rose-400 bg-rose-500/10 p-2.5 rounded-lg border border-rose-500/20">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          ) : null}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.08]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 h-9 rounded-lg border border-white/[0.1] text-xs font-medium text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 h-9 rounded-lg bg-sky-400 hover:bg-sky-300 text-slate-950 font-display font-semibold text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              Simpan ke Riwayat
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
