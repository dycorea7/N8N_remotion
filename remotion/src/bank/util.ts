// BANK 스타일 (모바일 은행 앱 + 영수증 모션 그래픽)
//  - 밝은 회색 앱 바탕 위 흰 카드, 파란 강조 하나, 지출은 빨강
//  - 잔액 카운터, 소비 분석 막대, 자동이체 토글, 이체 진행 단계, 영수증 출력, 이체 완료 화면
//  - 움직임은 iOS처럼 부드러운 스프링 (끊김 없음)
import { Theme } from '../theme';
export { clamp01 } from '../glyph/util';

// 원래 색(RAW). C는 CSS 변수로 감싸서, 사진 배경 장면에서는 Bg가 변수를 바꿔 흰 카드 → 투명, 검은 글자 → 흰 글자로 바뀐다
export const RAW = {
  bg: '#f1f3f6', card: '#ffffff', ink: '#141a23', ink2: '#4b5563', gray: '#8a94a3', line: '#e4e7ec',
  blue: '#2f6bff', blueSoft: '#e7efff', blueDeep: '#1f4fd1', red: '#f0444f', redSoft: '#ffecee',
  green: '#12b886', greenSoft: '#e3f8f1', orange: '#ff8a3d', orangeSoft: '#fff1e6', purple: '#7b61ff', purpleSoft: '#efebff',
  paper: '#fbfaf5', paperInk: '#26241f', dark: '#141a23',
};
const cv = (k: string, hex: string) => `var(--bk-${k}, ${hex})`;
export const C = {
  ...RAW,
  card: cv('card', RAW.card), ink: cv('ink', RAW.ink), ink2: cv('ink2', RAW.ink2), gray: cv('gray', RAW.gray), line: cv('line', RAW.line),
  blueSoft: cv('blueSoft', RAW.blueSoft), redSoft: cv('redSoft', RAW.redSoft), greenSoft: cv('greenSoft', RAW.greenSoft),
  orangeSoft: cv('orangeSoft', RAW.orangeSoft), purpleSoft: cv('purpleSoft', RAW.purpleSoft),
};
/** 사진 배경 장면용 색: 카드는 투명, 글자는 흰색(그림자), 옅은 색 띠는 반투명 */
export const PHOTO_VARS: Record<string, string> = {
  '--bk-card': 'rgba(0,0,0,0)', '--bk-ink': '#ffffff', '--bk-ink2': 'rgba(255,255,255,0.92)', '--bk-gray': 'rgba(255,255,255,0.82)',
  '--bk-line': 'rgba(255,255,255,0.35)', '--bk-blueSoft': 'rgba(47,107,255,0.45)', '--bk-redSoft': 'rgba(240,68,79,0.45)',
  '--bk-greenSoft': 'rgba(18,184,134,0.45)', '--bk-orangeSoft': 'rgba(255,138,61,0.45)', '--bk-purpleSoft': 'rgba(123,97,255,0.45)',
  '--bk-shadow': 'none',
};

export const F = {
  sans: "'Pretendard', 'Noto Sans CJK KR', sans-serif",
  mono: "'Nanum Gothic Coding', 'Pretendard', monospace",
};
export const FONT_LOADS = ["400 40px 'Nanum Gothic Coding'", "700 40px 'Nanum Gothic Coding'"];

export const BANK_THEME: Theme = {
  bg1: RAW.bg, bg2: RAW.card, blobA: 'rgba(47,107,255,0.10)', blobB: 'rgba(18,184,134,0.08)',
  fg: RAW.ink, muted: RAW.gray, accent: RAW.blue, accent2: RAW.green,
  card: RAW.card, cardBorder: RAW.line, headlineFont: F.sans,
};

export const SHADOW = 'var(--bk-shadow, 0 18px 48px rgba(20,26,35,0.10), 0 2px 6px rgba(20,26,35,0.05))';

/** iOS 느낌 감속 (넘침 없이) */
export const easeOut = (x: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);
/** 살짝 튕기며 자리 잡기 */
export const back = (x: number) => {
  if (x <= 0) return 0; if (x >= 1) return 1;
  const c1 = 1.2, c3 = c1 + 1, t = x - 1;
  return 1 + c3 * t * t * t + c1 * t * t;
};

/** 결정적 난수 */
export const rnd = (seed: number) => { const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
export const pad2 = (n: number) => String(n).padStart(2, '0');

/** 영수증 위·아래 톱니 가장자리 (px) */
export function zigzag(w: number, h: number, tooth = 22, depth = 12): string {
  const pts: string[] = [];
  const n = Math.max(2, Math.round(w / tooth));
  for (let i = 0; i <= n; i++) pts.push(`${(i / n) * w}px ${i % 2 ? depth : 0}px`);
  for (let i = n; i >= 0; i--) pts.push(`${(i / n) * w}px ${h - (i % 2 ? depth : 0)}px`);
  return `polygon(${pts.join(',')})`;
}

/** 바코드 막대 폭 (seed로 결정) */
export function barcode(seed: number, n = 46): number[] {
  return Array.from({ length: n }, (_, i) => 1 + Math.floor(rnd(seed * 17 + i) * 4));
}
