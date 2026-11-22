import React from 'react';
import { History, Trash2 } from 'lucide-react';
import type { HistoryEntry } from '../../lib/lyricsHistory';

type Props = {
  entries: HistoryEntry[];
  activeId: string | null;
  onOpen: (entry: HistoryEntry) => void;
  onDelete: (id: string) => void;
  onClear: () => void;
  onAddManual?: () => void;
};

const formatDate = (ms: number): string =>
  new Date(ms).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const firstLine = (lyrics: string): string =>
  lyrics.split(/\r?\n/).find((l) => l.trim())?.trim() ?? '';

export const HistoryPanel: React.FC<Props> = ({ entries, activeId, onOpen, onDelete, onClear, onAddManual }) => (
  <div className="flex flex-col gap-3 pt-4 border-t border-white/[0.07]">
    <div className="flex items-center justify-between gap-3">
      <h2 className="font-display text-sm font-semibold text-slate-100 inline-flex items-center gap-2">
        <History className="w-3.5 h-3.5 text-slate-400" />
        Riwayat ({entries.length})
      </h2>
      <div className="flex items-center gap-3">
        {onAddManual ? (
          <button
            type="button"
            onClick={onAddManual}
            className="text-xs font-medium text-sky-400 hover:text-sky-300 transition-colors cursor-pointer"
          >
            + Tambah Manual
          </button>
        ) : null}
        {entries.length > 0 ? (
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Hapus semua riwayat generate?')) onClear();
            }}
            className="text-xs font-medium text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
          >
            Hapus semua
          </button>
        ) : null}
      </div>
    </div>

    {entries.length === 0 ? (
      <p className="text-xs text-slate-400">
        Belum ada riwayat. Hasil generate akan tersimpan di browser ini.
      </p>
    ) : (
      <ul className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1">
        {entries.map((entry) => {
          const active = entry.id === activeId;
          return (
            <li key={entry.id} className="flex items-stretch gap-2">
              <button
                type="button"
                onClick={() => onOpen(entry)}
                aria-current={active}
                className={`flex-1 min-w-0 text-left px-3 py-2 rounded-lg border transition-colors cursor-pointer ${
                  active
                    ? 'border-sky-400 bg-sky-400/10'
                    : 'border-white/[0.1] hover:border-white/[0.25] bg-[#0b0f17]'
                }`}
              >
                <div className="text-sm font-medium text-slate-200 truncate">{entry.audioName}</div>
                <div className="text-xs text-slate-400 truncate">{firstLine(entry.lyrics)}</div>
                <div className="text-[11px] font-mono tabular-nums text-slate-500 mt-0.5">
                  {formatDate(entry.createdAt)} · {entry.result.captions.length} kata
                </div>
              </button>
              <button
                type="button"
                onClick={() => onDelete(entry.id)}
                aria-label={`Hapus riwayat ${entry.audioName}`}
                className="px-2.5 rounded-lg border border-white/[0.1] hover:border-rose-500/60 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </li>
          );
        })}
      </ul>
    )}
  </div>
);
