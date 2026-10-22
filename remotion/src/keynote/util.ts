// KEYNOTE 스타일 (애플 키노트 런칭 필름 느낌): 따뜻한 오프화이트 캔버스 + 검은 UI + 사진 위 리퀴드 글래스.
// 규칙: 크로스페이드·블러인·밝기 페이드·3D 뒤집기·입자·글로우 금지. 모든 변화는 '모양이 바뀌는' 방식
// (마스크 선에서 글자가 올라옴 / 스프링으로 0에서 튀어나옴 / 막대가 그어짐 / 페이지가 밀림 / 검은 도형이 화면을 덮었다가 다음 장면으로 줄어듦).
// 모든 값은 시간의 순수 함수 (스프링은 닫힌 형태의 계단 응답).
import { Scene } from '../types';

export const K = {
  canvas: '#ECEAE4', // 따뜻한 오프화이트
  ink: '#0B0B0C',
  ink2: '#2A2A2C',
  gray: '#8C8982',
  soft: '#D9D6CE',
  line: 'rgba(11,11,12,0.09)',
  card: '#FFFFFF',
  white: '#FFFFFF',
};
export const F = {
  word: "'Archivo Variable', 'Pretendard', sans-serif", // 워드마크 (wdth 125, 800)
  ui: "'Geist Variable', 'Pretendard', sans-serif",       // UI (한글은 Pretendard로 이어짐)
  ko: "'Pretendard', 'Geist Variable', sans-serif",
};
export const BRAND = 'NextYou';
export const FONT_LOADS = ["800 40px 'Archivo Variable'", "600 40px 'Geist Variable'", "500 40px 'Geist Variable'"];

export const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const easeInCubic = (x: number) => { const t = clamp(x); return t * t * t; };
export const easeOutCubic = (x: number) => { const t = clamp(x); return 1 - Math.pow(1 - t, 3); };
export const easeInOut = (x: number) => { const t = clamp(x); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };

/** 닫힌 형태 스프링 계단 응답 (0 → 1). t = 초. freq = Hz, damp = 감쇠비 (<1이면 살짝 튐) */
export function spring(t: number, freq = 2.2, damp = 0.7) {
  if (t <= 0) return 0;
  const w = 2 * Math.PI * freq;
  if (damp >= 1) return 1 - Math.exp(-w * t) * (1 + w * t);
  const wd = w * Math.sqrt(1 - damp * damp);
  return 1 - Math.exp(-damp * w * t) * (Math.cos(wd * t) + (damp / Math.sqrt(1 - damp * damp)) * Math.sin(wd * t));
}
export const SP = {
  rise: (t: number) => spring(t, 2.4, 0.86),  // 마스크에서 올라오는 글자
  pop: (t: number) => spring(t, 2.6, 0.48),   // 0에서 튀어나오는 아이콘
  move: (t: number) => spring(t, 2.0, 0.78),  // 위치 이동
  snap: (t: number) => spring(t, 3.4, 0.7),   // 스위치·노브
};
/** 목표가 여러 번 바뀌는 값 = 바뀔 때마다 스프링 하나씩 더한 합 (시간의 순수 함수) */
export function springSum(t: number, v0: number, changes: { t: number; v: number }[], fn = SP.move) {
  let v = v0, prev = v0;
  for (const c of changes) { v += (c.v - prev) * fn(t - c.t); prev = c.v; }
  return v;
}

// ── 글자 폭 측정 (폰트를 미리 받아 두므로 매 프레임 같은 값) ──
let mctx: CanvasRenderingContext2D | null = null;
export function measure(text: string, font: string, spacingPx = 0): number {
  if (typeof document === 'undefined') return text.length * 40;
  if (!mctx) mctx = document.createElement('canvas').getContext('2d');
  const c = mctx!;
  c.font = font;
  (c as any).letterSpacing = `${spacingPx}px`;
  return c.measureText(text).width;
}

/** 단어를 폭에 맞춰 줄로 나눈다. 가장 큰 글자 크기부터 줄 수가 maxLines 이하가 될 때까지 줄인다 */
export function fitLines(text: string, maxW: number, sizes: number[], weight = 800, maxLines = 3, family = F.ko, spacingEm = -0.035) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  for (const size of sizes) {
    const font = `${weight} ${size}px ${family}`;
    const lines: string[] = [];
    let ok = true;
    for (const w of words) {
      const last = lines[lines.length - 1];
      if (last != null && measure(last + ' ' + w, font, size * spacingEm) <= maxW) lines[lines.length - 1] = last + ' ' + w;
      else { if (measure(w, font, size * spacingEm) > maxW) ok = false; lines.push(w); }
    }
    if (ok && lines.length <= maxLines) return { lines, size };
  }
  const size = sizes[sizes.length - 1];
  return { lines: words.length ? [words.join(' ')] : [''], size };
}

// ── 배치 ──
export type Ctx = { W: number; H: number; fps: number; dur: number; land: boolean; lang: string };
export function frameLayout(W: number, H: number) {
  const land = W > H;
  return {
    land,
    cx: W / 2,
    pillY: land ? 120 : 300,          // 장면 머리 알약 (위쪽 y)
    pillH: land ? 76 : 88,
    top: land ? 250 : 470,            // 본문 시작
    bottom: land ? H - 230 : 1330,    // 본문 끝 (자막 위)
    colW: land ? 1380 : 940,          // 본문 폭
    capY: land ? H - 175 : 1430,      // 자막 알약 위쪽
  };
}

/** 장면 머리 알약의 글자 */
export function pillLabel(scene: Scene, index: number): string {
  const v: any = scene.visual;
  const t = v.type;
  let s = '';
  if (t === 'stat') s = v.label;
  else if (['chart', 'list', 'checklist', 'timeline', 'iconGrid', 'compare'].includes(t)) s = v.title;
  else if (t === 'chapter') s = `Chapter ${String(v.number || index + 1).padStart(2, '0')}`;
  else if (t === 'quote') s = v.author;
  else if (t === 'scripture') s = v.author;
  else if (t === 'outro') s = BRAND;
  else if (t === 'icon') s = (v.highlight && v.highlight[0]) || '';
  else s = (v.highlight && v.highlight[0]) || '';
  s = String(s || '').trim();
  if (!s) s = `No. ${String(index + 1).padStart(2, '0')}`;
  return [...s].length > 16 ? [...s].slice(0, 15).join('') + '…' : s;
}
export const PILL_FONT = (h: number) => `700 ${Math.round(h * 0.42)}px ${F.ui}`;
export function pillRect(scene: Scene, index: number, W: number, H: number) {
  const L = frameLayout(W, H);
  const label = pillLabel(scene, index);
  const w = Math.round(measure(label, PILL_FONT(L.pillH)) + L.pillH * 1.1);
  return { x: L.cx - w / 2, y: L.pillY, w, h: L.pillH, label };
}

/** 이 장면에 머리 알약이 있나 (이미지 장면은 사진이 꽉 차므로 없음) */
export const hasPill = (scene: Scene) => scene.visual.type !== 'image';

// ── 장면 전환 종류 (장면 i로 들어올 때) ──
//  iris  = 조리개 날 6개가 닫혔다가 사진 위로 열림 (사진 장면)
//  flood = 커서가 누른 곳에서 검은 원이 화면을 덮고, 다음 장면의 알약으로 줄어듦
//  push  = 커서로 끌어 페이지가 옆으로 밀림
export type Kind = 'iris' | 'flood' | 'push' | 'none';
export function kindsFor(scenes: Scene[]): Kind[] {
  return scenes.map((s, i) => {
    if (i === 0) return 'none';
    if (s.visual.type === 'image') return 'iris';
    if (scenes[i - 1].visual.type === 'image') return 'flood';
    if (s.visual.type === 'chapter' || s.visual.type === 'outro') return 'flood';
    return i % 2 ? 'flood' : 'push';
  });
}
export const T_OUT = 0.3; // 덮는 시간 (초)
export const T_IN = 0.34; // 줄어드는/열리는 시간
export const PUSH = 0.42; // 페이지 밀림

/** 첫 장면 앞의 워드마크 인트로 길이 (초) */
export const INTRO = 1.25;
