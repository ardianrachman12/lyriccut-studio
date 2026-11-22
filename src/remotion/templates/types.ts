export type VerticalPosition = 'top' | 'middle' | 'bottom';

export type LyricTemplate = {
  id: string;
  name: string;
  description: string;
  /** Loads the Google Font (idempotent) and returns the CSS font-family. */
  loadFont: () => string;
  font: {
    weight: number;
    letterSpacing: string;
    lineHeight: number;
  };
  /** px when the short side of the composition is 1080 (scaled by the stage for other sizes) */
  fontSize: number;
  colors: {
    active: string;
    sung: string;
    upcoming: string;
  };
  stroke?: { width: number; color: string };
  shadow: { active: (activeColor: string) => string; idle: string };
  /** Dark gradient at the bottom for contrast. */
  scrim: string | null;
  /** Rounded dark box behind the whole lyric page. */
  box?: { background: string; radius: number; paddingX: number; paddingY: number };
  /** offsetRatio: fraction of frame height; maxWidthRatio: fraction of frame width. */
  position: { vertical: VerticalPosition; offsetRatio: number; maxWidthRatio: number };
  uppercase: boolean;
  animation: { enter: 'rise' | 'fade' | 'pop'; activeScale: number };
  /** Preview chip colors for the template picker. */
  swatch: { bg: string; text: string; accent: string };
};

export type TemplateOverrides = {
  /** Multiplier on the template font size. */
  fontScale?: number;
  /** Replaces the template's active-word color (hex). */
  primaryColor?: string;
  vertical?: VerticalPosition;
};

export type ResolvedLyricStyle = {
  template: LyricTemplate;
  fontFamily: string;
  fontSize: number;
  activeColor: string;
  vertical: VerticalPosition;
};
