import React from 'react';
import { BRAND, F, K, PILL_FONT, SP, clamp, easeInCubic, easeInOut, lerp, measure } from './util';

/** 마스크 선에서 올라오는 글자 (p: 0 → 1). 크로스페이드 없이 모양으로만 등장 */
export const Rise: React.FC<{ p: number; children: React.ReactNode; style?: React.CSSProperties; inner?: React.CSSProperties }> = ({ p, children, style, inner }) => (
  <div style={{ overflow: 'hidden', ...style }}>
    <div style={{ transform: `translateY(${(1 - p) * 112}%)`, ...inner }}>{children}</div>
  </div>
);

/** 검은 알약 + 안에서 올라오는 글자 */
export const Pill: React.FC<{ x: number; y: number; w: number; h: number; label?: string; labelP?: number; scale?: number; bg?: string; fg?: string }> = ({ x, y, w, h, label = '', labelP = 1, scale = 1, bg = K.ink, fg = K.white }) => (
  <div style={{ position: 'absolute', left: x, top: y, width: w, height: h, borderRadius: h / 2, background: bg, transform: `scale(${scale})`, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
    <div style={{ overflow: 'hidden', height: h * 0.62, display: 'flex', alignItems: 'center' }}>
      <div style={{ font: PILL_FONT(h), color: fg, whiteSpace: 'nowrap', transform: `translateY(${(1 - labelP) * h * 0.7}px)`, lineHeight: 1 }}>{label}</div>
    </div>
  </div>
);

/** 조리개: 육각형 구멍 주위에 날 6개. 각 날 = 꼭짓점 둘 + 두 변의 연장선 + 그 사이의 짧은 호.
 *  open: 0 = 닫힘, 1 = 화면 밖까지 열림 */
export const Iris: React.FC<{ open: number; cx: number; cy: number; W: number; H: number }> = ({ open, cx, cy, W, H }) => {
  if (open >= 1) return null;
  const R = Math.hypot(Math.max(cx, W - cx), Math.max(cy, H - cy)) * 1.25;
  const a = Math.max(0.0001, open) * R * 0.95;
  const th = (1 - open) * (Math.PI * 0.42) - Math.PI / 2;
  const V = Array.from({ length: 6 }, (_, k) => [cx + a * Math.cos(th + (k * Math.PI) / 3), cy + a * Math.sin(th + (k * Math.PI) / 3)]);
  const ray = (p: number[], d: number[]) => {
    // |p + d s - c| = R 의 양수 해
    const ox = p[0] - cx, oy = p[1] - cy;
    const b = ox * d[0] + oy * d[1], c = ox * ox + oy * oy - R * R;
    const s = -b + Math.sqrt(Math.max(0, b * b - c));
    return [p[0] + d[0] * s, p[1] + d[1] * s];
  };
  const dir = (p: number[], q: number[]) => { const l = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1; return [(q[0] - p[0]) / l, (q[1] - p[1]) / l]; };
  const paths = V.map((v, k) => {
    const nxt = V[(k + 1) % 6], prv = V[(k + 5) % 6];
    const A = ray(v, dir(v, nxt));      // 이 변을 따라 연장
    const B = ray(v, dir(prv, v));      // 앞 변의 연장
    // 짧은 호: A → B (원점 기준 각도 차가 작은 쪽)
    const aA = Math.atan2(A[1] - cy, A[0] - cx), aB = Math.atan2(B[1] - cy, B[0] - cx);
    let dlt = aB - aA; while (dlt > Math.PI) dlt -= 2 * Math.PI; while (dlt < -Math.PI) dlt += 2 * Math.PI;
    const sweep = dlt > 0 ? 1 : 0;
    return `M${v[0]},${v[1]} L${A[0]},${A[1]} A${R},${R} 0 0 ${sweep} ${B[0]},${B[1]} Z`;
  });
  return (
    <svg width={W} height={H} style={{ position: 'absolute', left: 0, top: 0 }}>
      {paths.map((d, k) => <path key={k} d={d} fill={k % 2 ? '#0d0d0f' : '#111113'} stroke="rgba(255,255,255,0.16)" strokeWidth={2} strokeLinejoin="round" />)}
    </svg>
  );
};

/** 마우스 커서 (macOS 화살표). pressed면 살짝 눌림 + 클릭 고리 */
export const Cursor: React.FC<{ x: number; y: number; pressed: number; ring: number; scale?: number }> = ({ x, y, pressed, ring, scale = 1 }) => (
  <div style={{ position: 'absolute', left: x, top: y, width: 0, height: 0 }}>
    {ring > 0 && ring < 1 && <div style={{ position: 'absolute', left: -46 * ring * scale, top: -46 * ring * scale, width: 92 * ring * scale, height: 92 * ring * scale, borderRadius: '50%', border: `${3 * (1 - ring) + 0.5}px solid ${K.ink}` }} />}
    <svg width={60 * scale} height={70 * scale} viewBox="0 0 24 28" style={{ position: 'absolute', left: -3 * scale, top: -2 * scale, transform: `scale(${1 - 0.14 * pressed})`, transformOrigin: '3px 2px', filter: 'drop-shadow(0 3px 5px rgba(0,0,0,0.3))' }}>
      <path d="M3 2 L3 22 L8 17.5 L11.6 25.4 L15 23.9 L11.5 16.2 L18.2 16.2 Z" fill={K.ink} stroke="#fff" strokeWidth={1.6} strokeLinejoin="round" />
    </svg>
  </div>
);

// ── 워드마크: 글자들이 자기 마침표 속으로 아코디언처럼 접히고, 점이 검은 알약이 된다 ──
const WM_FONT = (s: number) => `800 ${s}px ${F.word}`;
function wmMetrics(S: number) {
  if (typeof document === 'undefined') return { lettersW: S * 5, base: S * 0.78 };
  const c = document.createElement('canvas').getContext('2d')!;
  c.font = WM_FONT(S); (c as any).fontStretch = 'expanded';
  const m = c.measureText(BRAND);
  const a = (m as any).fontBoundingBoxAscent ?? S * 0.9, d = (m as any).fontBoundingBoxDescent ?? S * 0.22;
  return { lettersW: m.width, base: (S - (a + d)) / 2 + a };
}
const WM_CACHE = new Map<number, { lettersW: number; base: number }>();
const wm = (S: number) => { if (!WM_CACHE.has(S)) WM_CACHE.set(S, wmMetrics(S)); return WM_CACHE.get(S)!; };

/** k: 1 = 글자 다 펼침, 0 = 점 속으로 다 접힘. cy = 점의 중심 y. 반환 안 함 — 점은 dot=false면 그리지 않음 */
export const Wordmark: React.FC<{ k: number; S: number; cx: number; cy: number; dot?: boolean }> = ({ k, S, cx, cy, dot = true }) => {
  const { lettersW, base } = wm(S);
  const dotD = S * 0.24, gap = S * 0.06;
  const total = lettersW + gap + dotD;
  const dotX1 = cx - total / 2 + lettersW + gap + dotD / 2;
  const dotX = cx + (dotX1 - cx) * clamp(k, 0, 1.2);
  const stretch = 62 + 63 * clamp((k - 0.45) / 0.55);
  // 글자 폭: 폭 축을 먼저 좁히고(62%까지), 나머지는 비율로 줄인다 → 글자끼리 계속 붙어 있음
  const wAt62 = 62 / 125; // 대략적인 비율
  const sx = k >= 0.45 ? 1 : Math.max(0, k / 0.45);
  const lettersRight = dotX - dotD / 2 - gap * Math.min(1, k);
  const top = cy + dotD / 2 - base; // 점 아래가 기준선
  void wAt62;
  return (
    <>
      {sx > 0.002 && (
        <div style={{ position: 'absolute', right: `calc(100% - ${lettersRight}px)`, top, height: S, lineHeight: `${S}px`, whiteSpace: 'nowrap', font: WM_FONT(S), fontStretch: `${stretch}%`, color: K.ink, letterSpacing: -S * 0.01, transform: `scaleX(${sx})`, transformOrigin: 'right center' }}>{BRAND}</div>
      )}
      {dot && <div style={{ position: 'absolute', left: dotX - dotD / 2, top: cy - dotD / 2, width: dotD, height: dotD, borderRadius: '50%', background: K.ink }} />}
    </>
  );
};
export const wordmarkDot = (S: number) => S * 0.24;

/** 점 ↔ 알약 모양 (가운데 기준) */
export const DotPill: React.FC<{ cx: number; cy: number; w: number; h: number; label?: string; labelP?: number }> = ({ cx, cy, w, h, label, labelP = 0 }) => (
  <Pill x={cx - w / 2} y={cy - h / 2} w={w} h={h} label={label} labelP={labelP} />
);

/** 인트로/아웃트로 워드마크 시퀀스. u = 초 (인트로 0 → 1.25). reverse면 아웃트로(알약 → 점 → 글자) */
export function wordmarkState(u: number, S: number, pill: { w: number; h: number }) {
  const dotD = wordmarkDot(S);
  // 0~0.3 그대로 / 0.3~0.7 접힘 / 0.7~ 점이 알약으로 / 0.86~ 글자가 알약 안에서 올라옴
  const k = 1 - easeInOut((u - 0.3) / 0.4);
  const g = SP.pop(u - 0.7);
  const w = u < 0.7 ? dotD : lerp(dotD, pill.w, g);
  const h = u < 0.7 ? dotD : lerp(dotD, pill.h, clamp(g));
  const labelP = SP.rise(u - 0.86);
  return { k, w, h, labelP, showPill: u >= 0.7 };
}
export function wordmarkOut(u: number, S: number, pill: { w: number; h: number }) {
  // 0~0.24 알약이 점으로 / 0.24~ 글자가 스프링으로 튀어나옴
  const dotD = wordmarkDot(S);
  const e = easeInCubic(u / 0.24);
  const w = lerp(pill.w, dotD, e), h = lerp(pill.h, dotD, e);
  const k = u < 0.24 ? 0 : SP.pop(u - 0.24) * 1.0;
  const labelP = 1 - clamp(u / 0.1);
  return { k, w, h, labelP, showPill: u < 0.24 };
}

export const textW = (t: string, font: string, sp = 0) => measure(t, font, sp);
