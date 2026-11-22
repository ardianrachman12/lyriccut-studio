import React, { useMemo } from 'react';
import { AbsoluteFill, OffthreadVideo, staticFile } from 'remotion';
import type { Caption } from '@remotion/captions';
import { EmptyClipBackdrop } from './components/EmptyClipBackdrop';
import { LyricStage } from './components/LyricStage';
import { resolveLyricStyle, type TemplateOverrides } from './templates';

export type LyricClipProps = {
  videoSrc: string;
  captions: Caption[];
  offsetMs?: number;
  durationInFrames: number;
  /** Output size; defaults to 1080x1920. Applied through calculateMetadata. */
  width?: number;
  height?: number;
  templateId?: string;
  overrides?: TemplateOverrides;
};

const resolveVideoSource = (src: string): string => {
  if (!src) {
    return '';
  }
  if (
    src.startsWith('blob:') ||
    src.startsWith('http://') ||
    src.startsWith('https://') ||
    src.startsWith('data:') ||
    src.startsWith('/')
  ) {
    return src;
  }
  return staticFile(src);
};

export const LyricClipVideo: React.FC<LyricClipProps> = ({
  videoSrc,
  captions,
  offsetMs = 0,
  templateId,
  overrides,
}) => {
  const resolvedSrc = resolveVideoSource(videoSrc);

  const style = useMemo(
    () => resolveLyricStyle(templateId, overrides),
    [templateId, overrides?.fontScale, overrides?.primaryColor, overrides?.vertical]
  );

  return (
    <AbsoluteFill style={{ backgroundColor: '#05080f', overflow: 'hidden' }}>
      {resolvedSrc ? (
        <OffthreadVideo
          src={resolvedSrc}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : (
        <EmptyClipBackdrop />
      )}

      <LyricStage captions={captions} offsetMs={offsetMs} style={style} />
    </AbsoluteFill>
  );
};
