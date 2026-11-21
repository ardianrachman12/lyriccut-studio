import React from 'react';
import { Composition, type CalculateMetadataFunction } from 'remotion';
import { LyricClipVideo, type LyricClipProps } from './LyricClipVideo';
import { DEFAULT_TEMPLATE_ID } from './templates';
import { DEFAULT_CAPTIONS, DEFAULT_DURATION_FRAMES } from '../data/defaultCaptions';

const calculateMetadata: CalculateMetadataFunction<LyricClipProps> = async ({
  props,
}) => {
  const duration = Number(props.durationInFrames);
  return {
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
        templateId: DEFAULT_TEMPLATE_ID,
        overrides: {},
      }}
      calculateMetadata={calculateMetadata}
    />
  );
};
