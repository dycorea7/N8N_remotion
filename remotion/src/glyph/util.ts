// 글리프 스타일 공용 도우미: 시드 난수, 폰트, 글자 텍스처
import type React from 'react';
import { Theme } from '../theme';

/** 결정적 난수 (같은 시드 → 같은 값). 렌더 프레임마다 결과가 같아야 깜빡이지 않는다 */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const hash = (n: number) => { const r = rng(n * 2654435761); return r(); };

export const F = {
  mono: "'Nanum Gothic Coding', 'Pretendard', monospace",
  cond: "'Black Han Sans', 'Pretendard', sans-serif",
  serif: "'Noto Serif KR', 'Noto Serif CJK KR', serif",
  script: "'Nanum Pen Script', 'Pretendard', cursive",
  sans: "'Pretendard', 'Noto Sans CJK KR', sans-serif",
};
export const FONT_LOADS = ["400 40px 'Black Han Sans'", "400 40px 'Nanum Pen Script'", "400 40px 'Nanum Gothic Coding'", "700 40px 'Nanum Gothic Coding'", "700 40px 'Noto Serif KR'"];

export const GLYPHS = '01#*+=-:.<>/\\$%&@ABCDEFGHIJKLMNOPQRSTUVWXYZ';
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const easeOut = (x: number) => 1 - Math.pow(1 - clamp01(x), 3);

/** 큰 글자 안을 작은 글자들로 채우는 텍스처 (background-clip: text) */
export function glyphFill(c1: string, c2: string, frame = 0): React.CSSProperties {
  const chars = '01#+*0%1@';
  let t = '';
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
    const ch = chars[(r * 4 + c + r) % chars.length];
    t += `<text x='${c * 9 + 1}' y='${r * 9 + 8}' fill='${(r + c) % 3 === 0 ? '#000000' : '#ffffff'}' fill-opacity='${(r + c) % 3 === 0 ? 0.22 : 0.3}' font-family='monospace' font-weight='700' font-size='10'>${ch}</text>`;
  }
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='36' height='36'><rect width='36' height='36' fill='${c1}'/>${t}</svg>`;
  return {
    backgroundImage: `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`,
    backgroundSize: '18px 18px',
    backgroundPosition: `${(frame * 0.6) % 18}px ${(frame * 1.3) % 18}px`,
    WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
  } as React.CSSProperties;
}

/** 네온 글로우 */
export const neon = (c: string, k = 1) => `0 0 ${6 * k}px ${c}, 0 0 ${18 * k}px ${c}, 0 0 ${42 * k}px ${c}`;

/** 글리프 스타일 팔레트: 어두운 밤 + 따뜻한 금색 + 카테고리별 포인트 색 */
export const GLYPH_THEMES: Record<string, Theme & { neon: string; floor: string[] }> = {
  bible: { bg1: '#07060f', bg2: '#1c1233', blobA: 'rgba(255,190,90,0.30)', blobB: 'rgba(150,120,255,0.20)', fg: '#fbf3e2', muted: 'rgba(251,243,226,0.62)', accent: '#ffc65a', accent2: '#ff8a3d', card: 'rgba(14,10,28,0.72)', cardBorder: 'rgba(255,198,90,0.42)', headlineFont: F.serif, neon: '#ffb347', floor: ['#ffc65a', '#ffe7b0', '#ff9a4d', '#9d8cff'] },
  wealth: { bg1: '#05070a', bg2: '#0f1f1a', blobA: 'rgba(255,200,80,0.30)', blobB: 'rgba(40,220,160,0.18)', fg: '#f6f3e8', muted: 'rgba(246,243,232,0.62)', accent: '#ffcc4d', accent2: '#ff4d5e', card: 'rgba(8,14,14,0.74)', cardBorder: 'rgba(255,204,77,0.42)', headlineFont: F.cond, neon: '#ff4d5e', floor: ['#ffcc4d', '#fff0c2', '#ff8a3d', '#4fd1a5'] },
  health: { bg1: '#04080c', bg2: '#0b2027', blobA: 'rgba(80,230,200,0.26)', blobB: 'rgba(255,130,100,0.20)', fg: '#eefbf8', muted: 'rgba(238,251,248,0.62)', accent: '#5ff0cc', accent2: '#ff7a5c', card: 'rgba(6,16,20,0.74)', cardBorder: 'rgba(95,240,204,0.40)', headlineFont: F.cond, neon: '#ff7a5c', floor: ['#5ff0cc', '#d8fff4', '#ffb86b', '#6aa8ff'] },
  quote: { bg1: '#06050e', bg2: '#1e1238', blobA: 'rgba(255,180,90,0.26)', blobB: 'rgba(130,110,255,0.24)', fg: '#f7f2ff', muted: 'rgba(247,242,255,0.62)', accent: '#ffc65a', accent2: '#ff4d6d', card: 'rgba(12,8,26,0.74)', cardBorder: 'rgba(255,198,90,0.40)', headlineFont: F.cond, neon: '#ff4d6d', floor: ['#ffc65a', '#fff1d6', '#ff8a3d', '#7aa2ff'] },
};
GLYPH_THEMES.other = GLYPH_THEMES.quote;
export type GlyphTheme = (typeof GLYPH_THEMES)['quote'];
export const glyphThemeFor = (c: string): GlyphTheme => GLYPH_THEMES[c] || GLYPH_THEMES.other;
