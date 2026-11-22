import React from 'react';
import { Composition, type CalculateMetadataFunction } from 'remotion';
import { LyricClipVideo, type LyricClipProps } from './LyricClipVideo';
import { DEFAULT_TEMPLATE_ID } from './templates';
import { DEFAULT_CAPTIONS, DEFAULT_DURATION_FRAMES } from '../data/defaultCaptions';

const calculateMetadata: CalculateMetadataFunction<LyricClipProps> = async ({
  props,
}) => {
  const duration = Number(props.durationInFrames);
  const w = Math.round(Number(props.width));
  const h = Math.round(Number(props.height));
  const validSize = Number.isFinite(w) && Number.isFinite(h) && w >= 2 && h >= 2;
  return {
    ...(validSize ? { width: w, height: h } : {}),
    durationInFrames:
      Number.isFinite(duration) && duration > 0
        ? Math.ceil(duration)
        : DEFAULT_DURATION_FRAMES,
  };
};

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="LyricClip"
      component={LyricClipVideo}
      durationInFrames={DEFAULT_DURATION_FRAMES}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{
        videoSrc: '',
        captions: DEFAULT_CAPTIONS,
        offsetMs: 0,
        durationInFrames: DEFAULT_DURATION_FRAMES,
        width: 1080,
        height: 1920,
        templateId: DEFAULT_TEMPLATE_ID,
        overrides: {},
      }}
      calculateMetadata={calculateMetadata}
    />
  );
};
