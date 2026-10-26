// EDITORIAL 스타일 (잡지·다큐 설명 영상 느낌의 종이 콜라주 모션 그래픽)
//  - 크림색 종이 위에 오려 붙인 종이 조각, 큰 빨간 원, 마스킹 테이프, 손으로 그은 빨간 마커
//  - 스톱모션처럼 2프레임씩 끊어 움직이고, 손그림 선은 4프레임마다 살짝 떨린다(boil)
import { Theme } from '../theme';
export { hash, clamp01, easeOut } from '../glyph/util';

export const C = {
  paper: '#efe7d6', paper2: '#e5dac2', card: '#fbf7ee', ink: '#1c1a17', ink2: '#4a453d',
  red: '#d7342a', ochre: '#e3a93a', blue: '#2e4c78', kraft: '#c8a77b', tape: 'rgba(236,224,190,0.82)',
};

export const F = {
  serif: "'Noto Serif KR', 'Noto Serif CJK KR', serif",
  sans: "'Pretendard', 'Noto Sans CJK KR', sans-serif",
  mono: "'Nanum Gothic Coding', 'Pretendard', monospace",
  hand: "'Nanum Pen Script', 'Pretendard', cursive",
  cond: "'Black Han Sans', 'Pretendard', sans-serif",
};
export const FONT_LOADS = ["700 40px 'Noto Serif KR'", "400 40px 'Nanum Pen Script'", "400 40px 'Nanum Gothic Coding'", "700 40px 'Nanum Gothic Coding'", "400 40px 'Black Han Sans'"];

export const ED_THEME: Theme = {
  bg1: C.paper, bg2: C.paper2, blobA: 'rgba(215,52,42,0.12)', blobB: 'rgba(46,76,120,0.1)',
  fg: C.ink, muted: C.ink2, accent: C.red, accent2: C.ochre,
  card: C.card, cardBorder: 'rgba(28,26,23,0.2)', headlineFont: F.serif,
};

/** 스톱모션: 2프레임마다 한 번씩만 움직인다 */
export const step = (f: number, n = 2) => Math.floor(f / n) * n;

/** 종이를 손으로 놓는 느낌: 살짝 넘쳤다가 자리 잡기 */
export const place = (x: number) => {
  if (x <= 0) return 0; if (x >= 1) return 1;
  const c1 = 1.4, c3 = c1 + 1, t = x - 1;
  return 1 + c3 * t * t * t + c1 * t * t;
};

/** 결정적 난수 (같은 seed → 같은 값) */
export const rnd = (seed: number) => { const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

/** 찢은 종이 가장자리: clip-path polygon (px). edges = 찢을 변 't' 'r' 'b' 'l' */
export function torn(w: number, h: number, seed: number, edges = 'tb', amp = 7, stepPx = 18): string {
  const pts: string[] = [];
  const j = (k: number) => (rnd(seed * 31 + k) - 0.5) * 2 * amp;
  const n = (len: number) => Math.max(2, Math.round(len / stepPx));
  // 위 (왼→오)
  for (let i = 0, N = n(w); i <= N; i++) pts.push(`${(i / N) * w}px ${edges.includes('t') ? Math.abs(j(i)) : 0}px`);
  for (let i = 1, N = n(h); i <= N; i++) pts.push(`${edges.includes('r') ? w - Math.abs(j(100 + i)) : w}px ${(i / N) * h}px`);
  for (let i = 1, N = n(w); i <= N; i++) pts.push(`${(1 - i / N) * w}px ${edges.includes('b') ? h - Math.abs(j(200 + i)) : h}px`);
  for (let i = 1, N = n(h); i < N; i++) pts.push(`${edges.includes('l') ? Math.abs(j(300 + i)) : 0}px ${(1 - i / N) * h}px`);
  return `polygon(${pts.join(',')})`;
}

/** 크기를 모르는 조각용: 왼쪽·오른쪽 변만 % 단위로 찢는다 */
export function tornLR(seed: number, n = 6, amp = 2.2): string {
  const pts: string[] = ['0% 0%', '100% 0%'];
  for (let i = 1; i < n; i++) pts.push(`${100 - rnd(seed * 5 + i) * amp}% ${(i / n) * 100}%`);
  pts.push('100% 100%', '0% 100%');
  for (let i = n - 1; i > 0; i--) pts.push(`${rnd(seed * 9 + i) * amp}% ${(i / n) * 100}%`);
  return `polygon(${pts.join(',')})`;
}

/** 크기를 모르는 조각용: 네 변을 모두 % 단위로 살짝 찢는다 */
export function tornPct(seed: number, n = 10, amp = 1.1): string {
  const pts: string[] = [];
  const j = (k: number) => rnd(seed * 13 + k) * amp;
  for (let i = 0; i <= n; i++) pts.push(`${(i / n) * 100}% ${j(i)}%`);
  for (let i = 1; i <= n; i++) pts.push(`${100 - j(50 + i) * 0.6}% ${(i / n) * 100}%`);
  for (let i = 1; i <= n; i++) pts.push(`${100 - (i / n) * 100}% ${100 - j(100 + i)}%`);
  for (let i = 1; i < n; i++) pts.push(`${j(150 + i) * 0.6}% ${100 - (i / n) * 100}%`);
  return `polygon(${pts.join(',')})`;
}

/** 찢으며 넘기는 전환: 진행도 p(0~1)만큼 왼쪽부터 보이고, 경계가 들쭉날쭉 */
export function tearClip(p: number, seed: number): string {
  const x = p * 116 - 8, n = 14, pts: string[] = ['0% 0%'];
  for (let i = 0; i <= n; i++) pts.push(`${x + (rnd(seed * 3 + i) - 0.5) * 7}% ${(i / n) * 100}%`);
  pts.push('0% 100%');
  return `polygon(${pts.join(',')})`;
}

/** 손으로 그린 타원 (마커 동그라미): 한 바퀴 조금 넘게, 시작과 끝이 어긋난다 */
export function handEllipse(cx: number, cy: number, rx: number, ry: number, seed: number, boil: number): string {
  const N = 48, pts: string[] = [];
  const start = -0.35 + rnd(seed) * 0.3;
  for (let i = 0; i <= N; i++) {
    const t = start + (i / N) * Math.PI * 2.18;
    const wob = 1 + (rnd(seed * 7 + Math.floor(i / 6) + boil * 13) - 0.5) * 0.06 + (i / N) * 0.07;
    pts.push(`${(cx + Math.cos(t) * rx * wob).toFixed(1)},${(cy + Math.sin(t) * ry * wob).toFixed(1)}`);
  }
  return 'M' + pts.join('L');
}

/** 손으로 그은 선 (살짝 휘고 떨림) */
export function handLine(x1: number, y1: number, x2: number, y2: number, seed: number, boil: number, bend = 0.06): string {
  const N = 16, pts: string[] = [];
  const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len;
  for (let i = 0; i <= N; i++) {
    const t = i / N, b = Math.sin(t * Math.PI) * len * bend + (rnd(seed * 3 + i + boil * 17) - 0.5) * 3;
    pts.push(`${(x1 + dx * t + nx * b).toFixed(1)},${(y1 + dy * t + ny * b).toFixed(1)}`);
  }
  return 'M' + pts.join('L');
}

/** 화살표 머리 (선 끝점 x2,y2에서 두 갈래) */
export function arrowHead(x1: number, y1: number, x2: number, y2: number, size = 26): string {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const p = (d: number) => `${(x2 - Math.cos(a + d) * size).toFixed(1)},${(y2 - Math.sin(a + d) * size).toFixed(1)}`;
  return `M${p(0.5)}L${x2},${y2}L${p(-0.5)}`;
}

/** 패스 길이 대충 (polyline) — strokeDasharray 애니메이션용 */
export function pathLen(d: string): number {
  const nums = d.replace(/[ML]/g, ' ').trim().split(/\s+/).map(p => p.split(',').map(Number));
  let L = 0;
  for (let i = 1; i < nums.length; i++) L += Math.hypot(nums[i][0] - nums[i - 1][0], nums[i][1] - nums[i - 1][1]);
  return L;
}

/** 종이 결 노이즈 타일 (한 번만 만든다) */
let grainUrl: string | null = null;
export function grain(): string {
  if (grainUrl) return grainUrl;
  if (typeof document === 'undefined') return '';
  const s = 220, cv = document.createElement('canvas');
  cv.width = s; cv.height = s;
  const g = cv.getContext('2d')!;
  const im = g.createImageData(s, s);
  for (let i = 0; i < s * s; i++) {
    const v = 128 + (rnd(i * 0.37) - 0.5) * 120 + (rnd(Math.floor(i / 3) * 1.7) - 0.5) * 40;
    im.data[i * 4] = v; im.data[i * 4 + 1] = v * 0.97; im.data[i * 4 + 2] = v * 0.9; im.data[i * 4 + 3] = 255;
  }
  g.putImageData(im, 0, 0);
  // 종이 섬유
  g.globalAlpha = 0.12; g.strokeStyle = '#5a4a30';
  for (let k = 0; k < 40; k++) { g.beginPath(); const x = rnd(k * 9.1) * s, y = rnd(k * 4.3) * s; g.moveTo(x, y); g.quadraticCurveTo(x + 10, y + rnd(k) * 12 - 6, x + 6 + rnd(k * 2) * 26, y + rnd(k * 3) * 10 - 5); g.stroke(); }
  grainUrl = cv.toDataURL('image/png');
  return grainUrl;
}

export const pad2 = (n: number) => String(n).padStart(2, '0');
