import React from 'react';
import { LYRIC_TEMPLATES } from '../../remotion/templates';

type Props = {
  selectedId: string;
  onSelect: (id: string) => void;
};

export const TemplatePicker: React.FC<Props> = ({ selectedId, onSelect }) => (
  <div role="radiogroup" aria-label="Lyric template" className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
    {LYRIC_TEMPLATES.map((template) => {
      const selected = template.id === selectedId;
      return (
        <button
          key={template.id}
          type="button"
          role="radio"
          aria-checked={selected}
          onClick={() => onSelect(template.id)}
          title={template.description}
          className={`flex flex-col gap-2 p-2 rounded-lg border text-left transition-colors cursor-pointer ${
            selected
              ? 'border-sky-400 bg-sky-400/10'
              : 'border-white/[0.1] hover:border-white/[0.25] bg-[#0b0f17]'
          }`}
        >
          <div
            className="h-14 rounded-md flex items-center justify-center text-xl font-bold"
            style={{ background: template.swatch.bg, color: template.swatch.text }}
          >
            <span>Aa&nbsp;</span>
            <span style={{ color: template.swatch.accent }}>Lirik</span>
          </div>
          <span className="text-xs font-medium text-slate-200 truncate">{template.name}</span>
        </button>
      );
    })}
  </div>
);
