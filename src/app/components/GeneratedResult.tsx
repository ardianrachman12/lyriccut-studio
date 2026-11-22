import React, { useState } from 'react';
import { AlertCircle, Check, Copy, Download, Send } from 'lucide-react';
import type { GenerateResult } from '../../lib/lyricsApi';

type Props = {
  result: GenerateResult | null;
  onSendToStudio: (json: string) => void;
};

const btn =
  'inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-200 border border-white/[0.12] hover:border-white/[0.3] rounded-md transition-colors cursor-pointer whitespace-nowrap';

export const GeneratedResult: React.FC<Props> = ({ result, onSendToStudio }) => {
  const [copied, setCopied] = useState(false);

  if (!result) {
    return (
      <div className="flex-1 min-h-[360px] flex items-center justify-center text-sm text-slate-400 text-center px-6">
        Hasil JSON akan muncul di sini setelah generate.
      </div>
    );
  }

  const json = JSON.stringify(result.captions, null, 2);
  const last = result.captions[result.captions.length - 1];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(json);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard blocked; user can still select the text manually
    }
  };

  const handleDownload = () => {
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'captions.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-3 flex-1 min-h-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs font-mono tabular-nums text-slate-400">
          {result.captions.length} kata · sampai {last ? (last.endMs / 1000).toFixed(2) : '0'}s ·{' '}
          {result.model}
        </span>
        <div className="flex items-center gap-2">
          <button type="button" onClick={handleCopy} className={btn}>
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Tersalin' : 'Copy'}
          </button>
          <button type="button" onClick={handleDownload} className={btn}>
            <Download className="w-3.5 h-3.5" />
            Download
          </button>
          <button
            type="button"
            onClick={() => onSendToStudio(json)}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-950 bg-sky-400 hover:bg-sky-300 rounded-md transition-colors cursor-pointer whitespace-nowrap"
          >
            <Send className="w-3.5 h-3.5" />
            Kirim ke Studio
          </button>
        </div>
      </div>

      {result.warnings.map((w) => (
        <div key={w} className="flex items-start gap-2 text-xs text-amber-400">
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>{w}</span>
        </div>
      ))}

      <textarea
        readOnly
        value={json}
        spellCheck={false}
        aria-label="Hasil caption JSON"
        className="w-full flex-1 min-h-[300px] p-3.5 rounded-lg bg-[#0b0f17] border border-white/[0.1] font-mono text-xs leading-relaxed text-slate-200 resize-none focus:outline-none"
      />
    </div>
  );
};
