import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, Loader2, Sparkles, X } from 'lucide-react';
import { AudioSourcePicker } from './components/AudioSourcePicker';
import { LyricsInput } from './components/LyricsInput';
import { GeneratedResult } from './components/GeneratedResult';
import { HistoryPanel } from './components/HistoryPanel';
import { ManualLyricModal } from './components/ManualLyricModal';
import {
  IMPORT_CAPTIONS_EVENT,
  fetchLyricsStatus,
  generateLyricCaptions,
  type GenerateResult,
  type GenerateStage,
  type LyricsStatus,
} from '../lib/lyricsApi';
import {
  createHistoryEntry,
  createManualHistoryEntry,
  loadHistory,
  saveHistory,
  type HistoryEntry,
} from '../lib/lyricsHistory';
import type { Caption } from '@remotion/captions';

const MAX_LYRICS_CHARS = 20000;
const DEFAULT_FORMATS = ['mp3', 'wav', 'm4a', 'aac', 'ogg', 'flac'];

const STAGE_LABEL: Record<GenerateStage, string> = {
  uploading: 'Mengunggah audio...',
  analyzing: 'Gemini sedang menganalisis audio dan lirik...',
};

export default function LyricGeneratorPage() {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [lyrics, setLyrics] = useState('');
  const [status, setStatus] = useState<LyricsStatus | null>(null);
  const [statusError, setStatusError] = useState(false);
  const [stage, setStage] = useState<GenerateStage | null>(null);
  const [error, setError] = useState('');
  const [result, setResult] = useState<GenerateResult | null>(null);
    const [history, setHistory] = useState<HistoryEntry[]>(loadHistory);
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    fetchLyricsStatus()
      .then(setStatus)
      .catch(() => setStatusError(true));
    return () => abortRef.current?.abort();
  }, []);

  const isBusy = stage !== null;
  const lyricsTrimmed = lyrics.trim();
  const canGenerate =
    !isBusy &&
    Boolean(audioFile) &&
    lyricsTrimmed.length > 0 &&
    lyricsTrimmed.length <= MAX_LYRICS_CHARS &&
    status?.configured !== false;

  const handleGenerate = async () => {
    if (!audioFile || !canGenerate) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setError('');
    setResult(null);
    setActiveHistoryId(null);

    try {
      const next = await generateLyricCaptions(audioFile, lyricsTrimmed, setStage, controller.signal);
      setResult(next);
      const entry = createHistoryEntry(audioFile.name, lyricsTrimmed, next);
      setHistory((prev) => saveHistory([entry, ...prev]));
      setActiveHistoryId(entry.id);
    } catch (err) {
      if (controller.signal.aborted) {
        setError('Generate dibatalkan.');
      } else {
        setError(
          err instanceof Error && err.message !== 'Failed to fetch'
            ? err.message
            : 'Tidak bisa menghubungi server lokal. Pastikan "npm run local" sedang berjalan.'
        );
      }
    } finally {
      setStage(null);
      abortRef.current = null;
    }
  };

  const handleOpenHistory = (entry: HistoryEntry) => {
    setLyrics(entry.lyrics);
    setResult(entry.result);
    setActiveHistoryId(entry.id);
    setError('');
  };

  const handleDeleteHistory = (id: string) => {
    setHistory((prev) => saveHistory(prev.filter((e) => e.id !== id)));
    if (id === activeHistoryId) setActiveHistoryId(null);
  };

    const handleClearHistory = () => {
    setHistory(saveHistory([]));
    setActiveHistoryId(null);
  };

  const handleSaveManual = (title: string, lyricsText: string, captions: Caption[]) => {
    const entry = createManualHistoryEntry(title, lyricsText, captions);
    setHistory((prev) => saveHistory([entry, ...prev]));
    setLyrics(entry.lyrics);
    setResult(entry.result);
    setActiveHistoryId(entry.id);
    setError('');
  };

  const handleSendToStudio = (json: string) => {
    window.dispatchEvent(new CustomEvent<string>(IMPORT_CAPTIONS_EVENT, { detail: json }));
    window.location.hash = '#/';
  };

  return (
    <div className="min-h-screen bg-[#0b0f17] text-slate-100 flex flex-col">
      <header className="h-14 border-b border-white/[0.08] bg-[#0e131d] px-6 flex items-center justify-between gap-8 shrink-0">
        <span className="font-display text-base font-bold tracking-tight text-slate-50 whitespace-nowrap">
          LyricCut Studio · Generate Lirik
        </span>
        <a
          href="#/"
          className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white border border-white/[0.1] hover:border-white/[0.2] rounded-md transition-colors whitespace-nowrap"
        >
          Kembali ke Studio
        </a>
      </header>

      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <section className="lg:col-span-5 bg-[#121824] border border-white/[0.08] rounded-xl p-6 flex flex-col gap-6">
          {status && !status.configured ? (
            <div className="flex items-start gap-2 text-xs text-amber-400">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>GEMINI_API_KEY belum diisi di file .env. Isi lalu restart server.</span>
            </div>
          ) : null}
          {statusError ? (
            <div className="flex items-start gap-2 text-xs text-amber-400">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>Server lokal tidak terjangkau. Jalankan "npm run local".</span>
            </div>
          ) : null}

          <AudioSourcePicker
            file={audioFile}
            formats={status?.formats ?? DEFAULT_FORMATS}
            onChange={setAudioFile}
          />

          <div className="h-px bg-white/[0.07]" />

          <LyricsInput value={lyrics} maxChars={MAX_LYRICS_CHARS} onChange={setLyrics} />

          <div className="flex flex-col gap-2.5">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleGenerate}
                disabled={!canGenerate}
                className="flex-1 h-11 px-5 rounded-lg bg-sky-400 hover:bg-sky-300 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-display font-semibold text-sm inline-flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:cursor-not-allowed"
              >
                {stage ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {STAGE_LABEL[stage]}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Generate Caption
                  </>
                )}
              </button>
              {isBusy ? (
                <button
                  type="button"
                  onClick={() => abortRef.current?.abort()}
                  className="h-11 px-4 rounded-lg border border-white/[0.15] hover:border-white/[0.3] text-sm text-slate-200 inline-flex items-center gap-2 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                  Batal
                </button>
              ) : null}
            </div>

            {error ? (
              <div className="flex items-start gap-2 text-xs text-rose-400">
                <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            ) : null}
          </div>
        </section>

        <section className="lg:col-span-7 bg-[#121824] border border-white/[0.08] rounded-xl p-6 flex flex-col gap-4">
          <h2 className="font-display text-sm font-semibold text-slate-100">Hasil</h2>
          <GeneratedResult result={result} onSendToStudio={handleSendToStudio} />
          <p className="text-xs text-slate-400">
            Timestamp dihasilkan AI dan bisa meleset. Periksa di preview studio, lalu atur Offset atau
            edit JSON jika perlu.
          </p>
                    <HistoryPanel
            entries={history}
            activeId={activeHistoryId}
            onOpen={handleOpenHistory}
            onDelete={handleDeleteHistory}
            onClear={handleClearHistory}
            onAddManual={() => setIsManualModalOpen(true)}
          />
        </section>
      </main>

      <ManualLyricModal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        onSave={handleSaveManual}
      />
    </div>
  );
}
