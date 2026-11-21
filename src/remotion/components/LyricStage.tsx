import React, { useMemo } from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { createTikTokStyleCaptions, type Caption } from '@remotion/captions';
import type { ResolvedLyricStyle } from '../templates';

type LyricStageProps = {
  captions: Caption[];
  offsetMs: number;
  style: ResolvedLyricStyle;
};

const TOP_PADDING_PX = 240;
const FALLBACK_BOTTOM_PADDING_PX = 210;

const flipScrim = (scrim: string, vertical: string): string =>
  vertical === 'top' ? scrim.replace('to top', 'to bottom') : scrim;

export const LyricStage: React.FC<LyricStageProps> = ({ captions, offsetMs, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { template, fontFamily, fontSize, activeColor, vertical } = style;

  const currentTimeMs = (frame / fps) * 1000 - offsetMs;

  const { pages } = useMemo(() => {
    const safeCaptions = Array.isArray(captions) ? captions : [];
    const normalized = safeCaptions.map((item, idx) => {
      const needsLeadingSpace =
        idx > 0 && item.text.length > 0 && !item.text.startsWith(' ');
      return {
        text: needsLeadingSpace ? ` ${item.text}` : item.text,
        startMs: Number(item.startMs) || 0,
        endMs: Number(item.endMs) || 0,
        timestampMs:
          item.timestampMs !== null && item.timestampMs !== undefined
            ? Number(item.timestampMs)
            : null,
        confidence:
          item.confidence !== null && item.confidence !== undefined
            ? Number(item.confidence)
            : null,
        ...(item.pageBreakAfter ? { pageBreakAfter: true } : {}),
      };
    });

    return createTikTokStyleCaptions({
      captions: normalized,
      combineTokensWithinMilliseconds: 1500,
      breakOnSilenceAfterMilliseconds: 900,
    });
  }, [captions]);

  const activePage = useMemo(() => {
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      const lastToken = page.tokens[page.tokens.length - 1];
      const naturalEnd = lastToken ? lastToken.toMs + 420 : page.startMs + page.durationMs;
      const pageEnd = Math.min(page.startMs + page.durationMs, naturalEnd);
      if (currentTimeMs >= page.startMs && currentTimeMs < pageEnd) {
        return page;
      }
    }
    return null;
  }, [pages, currentTimeMs]);

  const enterFrame = activePage
    ? Math.max(0, ((currentTimeMs - activePage.startMs) / 1000) * fps)
    : 0;

  const pageSpring = spring({
    frame: enterFrame,
    fps,
    config: { damping: 16, stiffness: 220, mass: 0.7 },
  });

  const { enter } = template.animation;
  const pageOpacity = interpolate(pageSpring, [0, 1], [0, 1]);
  const pageTransform =
    enter === 'rise'
      ? `translateY(${interpolate(pageSpring, [0, 1], [24, 0])}px)`
      : enter === 'pop'
      ? `scale(${interpolate(pageSpring, [0, 1], [0.86, 1])})`
      : 'none';

  const bottomPadding =
    template.position.vertical === 'bottom'
      ? template.position.offsetPx
      : FALLBACK_BOTTOM_PADDING_PX;

  const justifyContent =
    vertical === 'top' ? 'flex-start' : vertical === 'middle' ? 'center' : 'flex-end';

  return (
    <>
      {template.scrim ? (
        <AbsoluteFill
          style={{
            pointerEvents: 'none',
            background: flipScrim(template.scrim, vertical),
          }}
        />
      ) : null}

      <AbsoluteFill
        style={{
          justifyContent,
          alignItems: 'center',
          paddingLeft: 64,
          paddingRight: 64,
          paddingTop: vertical === 'top' ? TOP_PADDING_PX : 0,
          paddingBottom: vertical === 'bottom' ? bottomPadding : 0,
          pointerEvents: 'none',
        }}
      >
        {activePage ? (
          <div
            style={{
              transform: pageTransform,
              opacity: pageOpacity,
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              alignItems: 'baseline',
              columnGap: Math.round(fontSize * 0.26),
              rowGap: Math.round(fontSize * 0.15),
              maxWidth: template.position.maxWidth,
              textAlign: 'center',
              ...(template.box
                ? {
                    background: template.box.background,
                    borderRadius: template.box.radius,
                    padding: `${template.box.paddingY}px ${template.box.paddingX}px`,
                  }
                : {}),
            }}
          >
            {activePage.tokens.map((token, index) => {
              const trimmed = token.text.trim();
              if (!trimmed) {
                return null;
              }

              const isActive =
                currentTimeMs >= token.fromMs && currentTimeMs < token.toMs;
              const isSung = currentTimeMs >= token.toMs;

              const tokenLocalFrame = isActive
                ? Math.max(0, ((currentTimeMs - token.fromMs) / 1000) * fps)
                : 0;

              const popSpring = isActive
                ? spring({
                    frame: tokenLocalFrame,
                    fps,
                    config: { damping: 13, stiffness: 280, mass: 0.55 },
                  })
                : 0;

              const scale = isActive
                ? interpolate(popSpring, [0, 1], [1.0, template.animation.activeScale])
                : 1.0;

              const color = isActive
                ? activeColor
                : isSung
                ? template.colors.sung
                : template.colors.upcoming;

              return (
                <span
                  key={`${activePage.startMs}-${index}-${trimmed}`}
                  style={{
                    display: 'inline-block',
                    fontFamily: `${fontFamily}, sans-serif`,
                    fontSize,
                    fontWeight: template.font.weight,
                    lineHeight: template.font.lineHeight,
                    letterSpacing: template.font.letterSpacing,
                    textTransform: template.uppercase ? 'uppercase' : 'none',
                    color,
                    transform: `scale(${scale})`,
                    transformOrigin: 'center bottom',
                    textShadow: isActive
                      ? template.shadow.active(activeColor)
                      : template.shadow.idle,
                    ...(template.stroke
                      ? {
                          WebkitTextStroke: `${template.stroke.width}px ${template.stroke.color}`,
                          paintOrder: 'stroke fill',
                        }
                      : {}),
                  }}
                >
                  {trimmed}
                </span>
              );
            })}
          </div>
        ) : null}
      </AbsoluteFill>
    </>
  );
};
