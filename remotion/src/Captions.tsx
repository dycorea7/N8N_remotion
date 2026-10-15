import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { Caption } from './types';
import { Theme, SANS_FONT } from './theme';

// 나레이션 자막: 말하는 단어가 강조색으로 바뀐다. 화면 아래 UI(제목·버튼)를 피해 중하단에 둔다.
export const Captions: React.FC<{ captions: Caption[]; theme: Theme; lang: string }> = ({ captions, theme, lang }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const cur = captions.find(c => t >= c.start - 0.05 && t < c.end);
  if (!cur) return null;
  const local = Math.max(0, Math.round((t - cur.start) * fps));
  const pop = spring({ frame: local, fps, config: { damping: 14, stiffness: 220, mass: 0.6 } });
  return (
    <AbsoluteFill style={{ justifyContent: 'flex-start', alignItems: 'center', top: 1290 }}>
      <div style={{
        maxWidth: 940, textAlign: 'center', fontFamily: SANS_FONT, fontWeight: 800,
        fontSize: lang === 'ko' ? 76 : 70, lineHeight: 1.18, letterSpacing: lang === 'ko' ? -1 : 0,
        transform: `scale(${interpolate(pop, [0, 1], [0.86, 1])}) translateY(${interpolate(pop, [0, 1], [18, 0])}px)`,
        opacity: interpolate(pop, [0, 1], [0, 1]),
      }}>
        {cur.words.map((w, i) => {
          const active = t >= w.start - 0.03 && t < w.end + 0.08;
          const said = t >= w.start - 0.03;
          return (
            <span key={i} style={{
              color: active ? theme.accent : said ? theme.fg : 'rgba(255,255,255,0.78)',
              WebkitTextStroke: '10px rgba(0,0,0,0.85)', paintOrder: 'stroke fill',
              textShadow: '0 6px 24px rgba(0,0,0,0.55)',
              display: 'inline-block', margin: '0 10px',
              transform: active ? 'scale(1.08)' : 'scale(1)',
            }}>{w.text}</span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
