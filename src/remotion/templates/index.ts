import {
  boldYellow,
  classicSub,
  cleanWhite,
  neonPulse,
  retroWave,
  skyKaraoke,
} from './definitions';
import type { LyricTemplate, ResolvedLyricStyle, TemplateOverrides } from './types';

export type { LyricTemplate, TemplateOverrides, ResolvedLyricStyle, VerticalPosition } from './types';

export const DEFAULT_TEMPLATE_ID = skyKaraoke.id;

export const LYRIC_TEMPLATES: LyricTemplate[] = [
  skyKaraoke,
  neonPulse,
  cleanWhite,
  boldYellow,
  retroWave,
  classicSub,
];

export const FONT_SCALE_MIN = 0.1;
export const FONT_SCALE_MAX = 1.5;

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

export const getTemplate = (id?: string): LyricTemplate =>
  LYRIC_TEMPLATES.find((t) => t.id === id) ?? skyKaraoke;

/**
 * Pure resolver shared by the live preview and the Remotion render,
 * so both always produce the same look. Unknown ids fall back to the default template.
 */
export const resolveLyricStyle = (
  templateId?: string,
  overrides?: TemplateOverrides
): ResolvedLyricStyle => {
  const template = getTemplate(templateId);
  const rawScale = Number(overrides?.fontScale);
  const fontScale = Number.isFinite(rawScale) && rawScale > 0
    ? Math.min(FONT_SCALE_MAX, Math.max(FONT_SCALE_MIN, rawScale))
    : 1;
  const primary = overrides?.primaryColor;

  return {
    template,
    fontFamily: template.loadFont(),
    fontSize: Math.round(template.fontSize * fontScale),
    activeColor: primary && HEX_COLOR.test(primary) ? primary : template.colors.active,
    vertical: overrides?.vertical ?? template.position.vertical,
  };
};
