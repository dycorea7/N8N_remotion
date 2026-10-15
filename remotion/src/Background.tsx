import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { Theme } from './theme';

// 정적 노이즈 텍스처(한 번만 만들어 재사용) — 그라디언트 밴딩을 감춘다
const GRAIN = `url("data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.09 0'/></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>`
)}")`;

export const Background: React.FC<{ theme: Theme; sceneIndex: number }> = ({ theme, sceneIndex }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const t = frame / 30;
  const ax = width * (0.25 + 0.18 * Math.sin(t * 0.35 + sceneIndex));
  const ay = height * (0.28 + 0.10 * Math.cos(t * 0.28));
  const bx = width * (0.78 + 0.14 * Math.cos(t * 0.31 + sceneIndex * 0.7));
  const by = height * (0.70 + 0.08 * Math.sin(t * 0.4));
  const rot = interpolate(frame, [0, 3000], [0, 40]);
  return (
    <AbsoluteFill style={{ background: `linear-gradient(160deg, ${theme.bg1} 0%, ${theme.bg2} 100%)`, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', left: ax - 520, top: ay - 520, width: 1040, height: 1040, borderRadius: '50%', background: `radial-gradient(circle, ${theme.blobA} 0%, transparent 65%)` }} />
      <div style={{ position: 'absolute', left: bx - 480, top: by - 480, width: 960, height: 960, borderRadius: '50%', background: `radial-gradient(circle, ${theme.blobB} 0%, transparent 65%)` }} />
      {/* 천천히 도는 얇은 링 — 화면이 멈춰 보이지 않게 */}
      <div style={{ position: 'absolute', left: width / 2 - 700, top: height * 0.42 - 700, width: 1400, height: 1400, borderRadius: '50%', border: `2px solid ${theme.cardBorder}`, opacity: 0.35, transform: `rotate(${rot}deg) scale(${1 + 0.03 * Math.sin(t * 0.5)})`, borderStyle: 'dashed' }} />
      <AbsoluteFill style={{ backgroundImage: GRAIN, opacity: 0.7 }} />
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,0.55) 100%)' }} />
    </AbsoluteFill>
  );
};
