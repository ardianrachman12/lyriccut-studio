import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';

export const EmptyClipBackdrop: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const shiftY = interpolate(frame, [0, durationInFrames], [0, -60], {
    extrapolateRight: 'clamp',
  });
  const glowOpacity = interpolate(
    Math.sin((frame / fps) * Math.PI * 0.8),
    [-1, 1],
    [0.22, 0.45]
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#070b12',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(circle at 50% ${42 + shiftY * 0.15}%, rgba(56, 189, 248, ${glowOpacity}) 0%, rgba(15, 23, 42, 0.45) 46%, rgba(7, 11, 18, 1) 82%)`,
        }}
      />
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 18,
          opacity: 0.72,
          paddingLeft: 64,
          paddingRight: 64,
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: 88,
            height: 88,
            borderRadius: 24,
            border: '2px solid rgba(56, 189, 248, 0.35)',
            backgroundColor: 'rgba(15, 23, 42, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#38bdf8',
            fontSize: 34,
            fontWeight: 700,
            fontFamily: 'Plus Jakarta Sans, sans-serif',
          }}
        >
          9:16
        </div>
        <div
          style={{
            color: '#e2e8f0',
            fontSize: 34,
            fontWeight: 600,
            fontFamily: 'Plus Jakarta Sans, sans-serif',
            letterSpacing: '-0.02em',
          }}
        >
          Attach an MP4 clip to preview background video
        </div>
        <div
          style={{
            color: '#94a3b8',
            fontSize: 24,
            fontFamily: 'DM Sans, sans-serif',
          }}
        >
          Karaoke captions are already running in real time below
        </div>
      </div>
    </AbsoluteFill>
  );
};
