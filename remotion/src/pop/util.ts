// POP 스타일 (모션 디자이너 쇼레일 느낌): 원색 컬러 블록 + 초대형 타이포 + 도형 모핑 + 입자 + 생성 패턴
import { Theme } from '../theme';
export { rng, hash, clamp01, easeOut } from '../glyph/util';

export const C = {
  orange: '#ff5a36', lime: '#d6ff3d', blue: '#2b3bff', pink: '#ff4fa3', paper: '#efece6', night: '#0c0c14', ink: '#0d0d12', white: '#f6f4ef',
};
export const PALETTE = [C.orange, C.lime, C.blue, C.pink, C.white];

/** 장면 배경 블록: [배경, 글자, 강조] — 장면 번호로 돌아가며 쓴다 */
export const BLOCKS: [string, string, string][] = [
  [C.orange, C.ink, C.white],
  [C.night, C.white, C.lime],
  [C.lime, C.ink, C.blue],
  [C.blue, C.white, C.lime],
  [C.paper, C.ink, C.orange],
  [C.night, C.white, C.orange],
];
export const blockFor = (i: number) => BLOCKS[i % BLOCKS.length];
export const isLight = (bg: string) => [C.lime, C.paper, C.white, C.orange].includes(bg);

export const F = {
  sans: "'Pretendard', 'Noto Sans CJK KR', sans-serif",
  mono: "'Nanum Gothic Coding', 'Pretendard', monospace",
  cond: "'Black Han Sans', 'Pretendard', sans-serif",
  serif: "'Noto Serif KR', 'Noto Serif CJK KR', serif",
};
export const FONT_LOADS = ["400 40px 'Black Han Sans'", "400 40px 'Nanum Gothic Coding'", "700 40px 'Nanum Gothic Coding'", "700 40px 'Noto Serif KR'"];

export const POP_THEME: Theme = {
  bg1: C.night, bg2: '#16162a', blobA: 'rgba(255,90,54,0.25)', blobB: 'rgba(43,59,255,0.25)',
  fg: C.white, muted: 'rgba(246,244,239,0.6)', accent: C.lime, accent2: C.orange,
  card: 'rgba(255,255,255,0.07)', cardBorder: 'rgba(214,255,61,0.4)', headlineFont: F.sans,
};

/** 탄성 이징 (쇼레일의 elastic.out) */
export const elastic = (x: number) => {
  if (x <= 0) return 0; if (x >= 1) return 1;
  return Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1;
};
export const backOut = (x: number) => { const c1 = 1.70158, c3 = c1 + 1; const t = Math.max(0, Math.min(1, x)) - 1; return 1 + c3 * t * t * t + c1 * t * t; };
export const pad2 = (n: number) => String(n).padStart(2, '0');

// 쇼릴 이징 (expo 계열) — 들어올 때 빠르게 붙고, 빠질 때 빨려 나간다
const c01 = (x: number) => Math.max(0, Math.min(1, x));
export const outExpo = (x: number) => { x = c01(x); return x >= 1 ? 1 : 1 - Math.pow(2, -10 * x); };
export const inExpo = (x: number) => { x = c01(x); return x <= 0 ? 0 : Math.pow(2, 10 * x - 10); };
export const inOutCubic = (x: number) => { x = c01(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };

/** CSS cubic-bezier(x1, y1, x2, y2)와 같은 이징: 시간 x → 값 y */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number) {
  const bx = (s: number) => 3 * (1 - s) * (1 - s) * s * x1 + 3 * (1 - s) * s * s * x2 + s * s * s;
  const by = (s: number) => 3 * (1 - s) * (1 - s) * s * y1 + 3 * (1 - s) * s * s * y2 + s * s * s;
  return (x: number) => {
    x = c01(x); let lo = 0, hi = 1;
    for (let i = 0; i < 24; i++) { const m = (lo + hi) / 2; if (bx(m) < x) lo = m; else hi = m; }
    return by((lo + hi) / 2);
  };
}
