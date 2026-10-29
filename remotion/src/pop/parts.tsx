import React, { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AbsoluteFill, continueRender, delayRender, useCurrentFrame, useVideoConfig } from 'remotion';
import { Sfx } from '../scenes';
import { C, F, PALETTE, backOut, clamp01, easeOut, hash, inOutCubic, outExpo, rng } from './util';

/** 큰 단어가 위아래로 흐르는 윤곽 글자 띠 ('MOVE — MOVE — ') */
export const Marquee: React.FC<{ text: string; y: number; size: number; color: string; dir?: 1 | -1; speed?: number; opacity?: number }> = ({ text, y, size, color, dir = 1, speed = 3, opacity = 0.22 }) => {
  const frame = useCurrentFrame();
  const unit = `${text} — `;
  const shift = ((frame * speed * dir) % (size * unit.length * 0.9));
  return (
    <div style={{ position: 'absolute', left: -size * 4, top: y, whiteSpace: 'nowrap', transform: `translateX(${shift}px)`, opacity }}>
      <span style={{ fontFamily: F.cond, fontSize: size, lineHeight: 1, color: 'transparent', WebkitTextStroke: `3px ${color}`, letterSpacing: 2 }}>{unit.repeat(10)}</span>
    </div>
  );
};

/** 해 방사선 (큰 숫자 뒤) */
export const Sunburst: React.FC<{ color: string; rays?: number; opacity?: number }> = ({ color, rays = 36, opacity = 0.25 }) => {
  const frame = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const R = Math.hypot(W, H);
  const cx = W / 2, cy = H * 0.42;
  return (
    <svg width={W} height={H} style={{ position: 'absolute', inset: 0 }}>
      <g transform={`rotate(${frame * 0.15} ${cx} ${cy})`} opacity={opacity}>
        {Array.from({ length: rays }, (_, k) => {
          const a = (k / rays) * Math.PI * 2;
          return <line key={k} x1={cx + Math.cos(a) * 160} y1={cy + Math.sin(a) * 160} x2={cx + Math.cos(a) * R} y2={cy + Math.sin(a) * R} stroke={color} strokeWidth={2} />;
        })}
      </g>
    </svg>
  );
};

/** 도형 둘레의 점 N개 (모핑용): circle / triangle / square / star */
function shapePts(kind: number, n: number, r: number): [number, number][] {
  const out: [number, number][] = [];
  const poly = (verts: [number, number][]) => {
    // 둘레를 같은 간격으로 나눈다
    const segs = verts.map((v, i) => [v, verts[(i + 1) % verts.length]] as const);
    const lens = segs.map(([a, b]) => Math.hypot(b[0] - a[0], b[1] - a[1]));
    const total = lens.reduce((x, y) => x + y, 0);
    for (let i = 0; i < n; i++) {
      let d = (i / n) * total, k = 0;
      while (d > lens[k]) { d -= lens[k]; k++; }
      const [a, b] = segs[k]; const t = d / lens[k];
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    }
  };
  const ngon = (m: number, rot: number, rr = r) => Array.from({ length: m }, (_, i) => { const a = rot + (i / m) * Math.PI * 2; return [Math.cos(a) * rr, Math.sin(a) * rr] as [number, number]; });
  if (kind === 0) { for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + (i / n) * Math.PI * 2; out.push([Math.cos(a) * r, Math.sin(a) * r]); } return out; }
  if (kind === 1) { poly(ngon(3, -Math.PI / 2, r * 1.15)); return out; }
  if (kind === 2) { poly(ngon(4, -Math.PI / 4, r * 1.1)); return out; }
  const star: [number, number][] = [];
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i / 10) * Math.PI * 2; const rr = i % 2 ? r * 0.48 : r * 1.12; star.push([Math.cos(a) * rr, Math.sin(a) * rr]); }
  poly(star); return out;
}

/** 원 → 삼각형 → 사각형 → 별로 바뀌는 도형. 바뀌는 동안만 지난 모양이 색 잔상으로 남고(멈추면 겹쳐 사라짐),
 *  도착할 때 살짝 튄다. 점 셋은 앞뒤가 있는 3D 궤도를 돈다 */
export const MorphShape: React.FC<{ size: number; dur: number; fill: string; ghostA?: string; ghostB?: string }> = ({ size, dur, fill, ghostA = C.blue, ghostB = C.orange }) => {
  const frame = useCurrentFrame();
  const N = 120, r = size * 0.36;
  const shapes = useMemo(() => [0, 1, 2, 3].map(k => shapePts(k, N, r)), [r]);
  const seg = Math.max(18, dur / 4);
  const pathAt = (f: number) => {
    const raw = Math.max(0, f) / seg;
    const k = Math.min(3, Math.floor(raw));
    const t = k >= 3 ? 0 : inOutCubic((raw - k) / 0.5);
    const A = shapes[k], B = shapes[Math.min(3, k + 1)];
    // 도착 직후 살짝 커졌다 돌아온다
    const land = k >= 1 ? Math.exp(-((raw - k) * seg) / 5) * 0.08 : 0;
    const sc = (k === 0 ? backOut(clamp01(f / 12)) : 1) * (1 + land);
    const rot = (k + t) * 120 + Math.max(0, f) * 0.4;
    const pts = A.map((p, i) => [(p[0] + (B[i][0] - p[0]) * t) * sc, (p[1] + (B[i][1] - p[1]) * t) * sc]);
    return { d: 'M' + pts.map(p => `${(p[0] + size / 2).toFixed(1)},${(p[1] + size / 2).toFixed(1)}`).join('L') + 'Z', rot };
  };
  const echoes = [C.lime, ghostA, C.pink, ghostB];
  const orbs = [C.orange, C.blue, fill].map((c, i) => {
    const a = frame * 0.08 + (i * Math.PI * 2) / 3, x = Math.cos(a) * size * 0.5, y = Math.sin(a) * size * 0.13, tl = -0.35;
    return { x: size / 2 + x * Math.cos(tl) - y * Math.sin(tl), y: size / 2 + x * Math.sin(tl) + y * Math.cos(tl), z: Math.sin(a), c };
  });
  const orb = (o: typeof orbs[0], i: number) => <circle key={i} cx={o.x} cy={o.y} r={(9 + o.z * 4) * backOut(clamp01((frame - 4) / 12))} fill={o.c} />;
  const main = pathAt(frame);
  return (
    <svg width={size} height={size} style={{ overflow: 'visible' }}>
      <circle cx={size / 2} cy={size / 2} r={size * 0.47} fill="none" stroke={fill} strokeOpacity={0.15} strokeWidth={2} strokeDasharray="2 10" transform={`rotate(${frame * 0.5} ${size / 2} ${size / 2})`} />
      {orbs.filter(o => o.z < 0).map(orb)}
      {echoes.map((c, k) => { const e = pathAt(frame - (echoes.length - k) * 1.5); return <path key={k} d={e.d} fill={c} transform={`rotate(${e.rot} ${size / 2} ${size / 2})`} />; })}
      <path d={main.d} fill={fill} transform={`rotate(${main.rot} ${size / 2} ${size / 2})`} />
      {orbs.filter(o => o.z >= 0).map(orb)}
    </svg>
  );
};

/** 입자 구 → 매듭(토러스 노트)으로 풀렸다 감기는 3D 입자 (캔버스) */
export const ParticleKnot: React.FC<{ size: number; morph?: number; seed?: number }> = ({ size, morph, seed = 3 }) => {
  const frame = useCurrentFrame();
  const ref = useRef<HTMLCanvasElement>(null);
  const pts = useMemo(() => {
    const r = rng(seed); const n = 1400; const out: { s: number[]; k: number[]; j: number }[] = [];
    for (let i = 0; i < n; i++) {
      const y = 1 - (i / (n - 1)) * 2, rad = Math.sqrt(1 - y * y), th = i * 2.39996;
      const t = (i / n) * Math.PI * 2, p = 2, q = 3;
      const rr = Math.cos(q * t) + 2;
      const jit = () => (r() - 0.5) * 0.25;
      out.push({ s: [Math.cos(th) * rad, y, Math.sin(th) * rad], k: [(rr * Math.cos(p * t)) / 3 + jit(), (-Math.sin(q * t)) / 1.6 + jit(), (rr * Math.sin(p * t)) / 3 + jit()], j: r() });
    }
    return out;
  }, [seed]);
  useLayoutEffect(() => {
    const cv = ref.current; if (!cv) return; const ctx = cv.getContext('2d')!;
    ctx.clearRect(0, 0, size, size);
    const m = morph ?? clamp01((Math.sin(frame / 40 - 1.2) + 1) / 2 * 1.3 - 0.15);
    const ay = frame * 0.02, ax = 0.35;
    ctx.globalCompositeOperation = 'lighter';
    for (const p of pts) {
      let x = p.s[0] + (p.k[0] - p.s[0]) * m, y = p.s[1] + (p.k[1] - p.s[1]) * m, z = p.s[2] + (p.k[2] - p.s[2]) * m;
      const cx = x * Math.cos(ay) - z * Math.sin(ay); const cz = x * Math.sin(ay) + z * Math.cos(ay);
      const cy = y * Math.cos(ax) - cz * Math.sin(ax); const zz = y * Math.sin(ax) + cz * Math.cos(ax);
      const persp = 1.8 / (2.6 - zz);
      const sx = size / 2 + cx * size * 0.34 * persp, sy = size / 2 + cy * size * 0.34 * persp;
      const depth = clamp01((zz + 1) / 2);
      const col = p.j < 0.5 ? `rgba(255,79,163,${0.35 + 0.5 * depth})` : `rgba(110,120,255,${0.35 + 0.5 * depth})`;
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(sx, sy, 1.4 + 2.2 * depth, 0, 6.29); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  }, [frame, pts, size, morph]);
  return <canvas ref={ref} width={size} height={size} style={{ width: size, height: size }} />;
};

/** 색 도형 격자: 가운데에서 물결처럼 커졌다 작아진다 */
export const ShapeGrid: React.FC<{ cols?: number; opacity?: number }> = ({ cols = 9, opacity = 1 }) => {
  const frame = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const cell = W / cols;
  const rows = Math.ceil(H / cell) + 1;
  const items: React.ReactNode[] = [];
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const cx = (i + 0.5) * cell, cy = (j + 0.5) * cell;
    const d = Math.hypot(cx - W / 2, cy - H / 2) / cell;
    const s = 0.18 + 0.5 * Math.max(0, Math.sin(frame / 7 - d * 0.8));
    const kind = Math.floor(hash(i * 31 + j * 17) * 3), col = PALETTE[Math.floor(hash(i * 7 + j * 13 + 1) * 4)];
    const z = cell * s;
    items.push(kind === 0 ? <circle key={`${i}-${j}`} cx={cx} cy={cy} r={z / 2} fill={col} />
      : kind === 1 ? <rect key={`${i}-${j}`} x={cx - z / 2} y={cy - z / 2} width={z} height={z} fill={col} />
      : <rect key={`${i}-${j}`} x={cx - z / 2} y={cy - z / 2} width={z} height={z} fill={col} transform={`rotate(45 ${cx} ${cy})`} />);
  }
  return <svg width={W} height={H} style={{ position: 'absolute', inset: 0, opacity }}>{items}</svg>;
};

/** 트루쳇 타일 (사분원 곡선 패턴) */
export const Truchet: React.FC<{ cell?: number; opacity?: number }> = ({ cell = 120, opacity = 1 }) => {
  const frame = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const cols = Math.ceil(W / cell) + 1, rows = Math.ceil(H / cell) + 1;
  const cols2 = [C.orange, C.lime, C.pink, C.white];
  const items: React.ReactNode[] = [];
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const flipAt = Math.floor(hash(i * 13 + j * 29) * 60) + 10;
    const flip = (hash(i * 3 + j * 5) > 0.5) !== (frame > flipAt && Math.floor((frame - flipAt) / 45) % 2 === 0);
    const x = i * cell, y = j * cell, h = cell / 2, c = cols2[Math.floor(hash(i + j * 7) * 4)];
    const d = flip ? `M${x + h},${y} A${h},${h} 0 0 1 ${x},${y + h} M${x + cell},${y + h} A${h},${h} 0 0 0 ${x + h},${y + cell}`
                   : `M${x + h},${y} A${h},${h} 0 0 0 ${x + cell},${y + h} M${x},${y + h} A${h},${h} 0 0 1 ${x + h},${y + cell}`;
    items.push(<path key={`${i}-${j}`} d={d} fill="none" stroke={c} strokeWidth={cell * 0.14} strokeLinecap="round" />);
  }
  return <svg width={W} height={H} style={{ position: 'absolute', inset: 0, opacity }}>{items}</svg>;
};

/** 글리치 조각: 처음 몇 프레임 동안 가로 띠로 잘려 어긋난다 */
export const GlitchSlices: React.FC<{ children: React.ReactNode; frames?: number; seed?: number }> = ({ children, frames = 8, seed = 1 }) => {
  const frame = useCurrentFrame();
  if (frame >= frames) return <>{children}</>;
  const n = 7;
  return (
    <AbsoluteFill>
      {Array.from({ length: n }, (_, k) => {
        const off = (hash(seed * 11 + k * 7 + frame) - 0.5) * 220 * (1 - frame / frames);
        return (
          <AbsoluteFill key={k} style={{ clipPath: `inset(${(k / n) * 100}% 0 ${100 - ((k + 1) / n) * 100}% 0)`, transform: `translateX(${off}px)` }}>{children}</AbsoluteFill>
        );
      })}
    </AbsoluteFill>
  );
};

// ───────────── 쇼릴에서 가져온 것들 ─────────────

/** 튀는 공: 떨어질 때 늘어나고, 닿을 때 찌그러졌다 출렁이며 돌아오고, 지나간 자리에 잔상(어니언 스킨)과 바닥 충격파를 남긴다.
 *  컨테이너 안 (x, floor) 지점에 공 바닥이 닿는다. impacts: 닿는 프레임들 (처음 것은 낙하, 나머지는 점점 낮아지는 튐) */
export const BounceBall: React.FC<{ x: number; floor: number; r: number; impacts: number[]; height?: number; color?: string; ghost?: string; fromX?: number; sound?: boolean }> = ({ x, floor, r, impacts, height = 700, color = C.orange, ghost = C.white, fromX, sound = true }) => {
  const frame = useCurrentFrame();
  const start = impacts[0] - Math.max(6, Math.round(Math.sqrt(height) * 0.45));
  // 공 바닥의 높이 (바닥 위 px)
  const hAt = (f: number) => {
    if (f < impacts[0]) { const u = clamp01((f - start) / (impacts[0] - start)); return height * (1 - u * u); }
    for (let k = 1; k < impacts.length; k++) if (f < impacts[k]) { const u = (f - impacts[k - 1]) / (impacts[k] - impacts[k - 1]); return height * Math.pow(0.32, k) * 4 * u * (1 - u); }
    return 0;
  };
  const stateAt = (f: number) => {
    const h = hAt(f), v = (hAt(f + 0.25) - hAt(f - 0.25)) * 2;
    let k = 0;
    impacts.forEach((im, i) => { const d = f - im; if (d >= -0.6 && d < 0) k += 1 + d / 0.6; else if (d >= 0 && d < 14) k += Math.exp(-d / 2.4) * Math.cos(d * 1.3) * (i === 0 ? 1 : 0.7); });
    const st = clamp01(Math.abs(v) / 90) * 0.3 * (1 - clamp01(k));
    const sy = (1 + st) * (1 - 0.42 * k), sx = (1 - st * 0.55) * (1 + 0.4 * k);
    const px = fromX == null ? x : fromX + (x - fromX) * easeOut(clamp01((f - start) / (impacts[impacts.length - 1] - start)));
    return { cx: px, cy: floor - h - r * sy, rx: r * sx, ry: r * sy };
  };
  if (frame < start) return null;
  const s = stateAt(frame);
  const settled = frame - impacts[impacts.length - 1];
  return (
    <svg style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible', pointerEvents: 'none' }} width={1} height={1}>
      {impacts.map((im, i) => {
        const d = frame - im; if (d < 0 || d > 18) return null; const p = d / 18, rx = r * 1.2 + outExpo(p) * r * 7 * (i === 0 ? 1 : 0.6);
        return <ellipse key={i} cx={stateAt(im).cx} cy={floor} rx={rx} ry={rx * 0.12} fill="none" stroke={color} strokeWidth={4 * (1 - p) + 0.5} opacity={1 - p} />;
      })}
      {settled < 10 && [6, 5, 4, 3, 2, 1].map(k => { const g = stateAt(frame - k * 1.2); return <ellipse key={k} cx={g.cx} cy={g.cy} rx={g.rx} ry={g.ry} fill="none" stroke={ghost} strokeWidth={2} opacity={0.5 * (1 - k / 7) * (1 - clamp01(settled / 10))} />; })}
      <ellipse cx={s.cx} cy={s.cy} rx={s.rx} ry={s.ry} fill={color} />
      {sound && impacts.map((im, i) => <Sfx key={i} name="pop" at={im} volume={i === 0 ? 0.22 : 0.12} />)}
    </svg>
  );
};

/** 타격감: 지정한 프레임마다 화면이 흔들리고 빨강·파랑이 갈라진다(색수차). 몇 프레임이면 사그라든다.
 *  흔들리는 동안 살짝 확대해 화면 가장자리가 비어 보이지 않게 한다 */
export const Hit: React.FC<{ hits: number[]; amp?: number; children: React.ReactNode }> = ({ hits, amp = 1, children }) => {
  const frame = useCurrentFrame();
  const id = 'chroma' + useId().replace(/[^a-zA-Z0-9]/g, '');
  let k = 0;
  for (const h of hits) { const d = frame - h; if (d >= 0 && d < 12) k += Math.exp(-d / 2.6); }
  k *= amp;
  if (k < 0.04) return <AbsoluteFill>{children}</AbsoluteFill>;
  const dx = Math.round(k * 10), sh = k * 14;
  return (
    <AbsoluteFill style={{ transform: `translate(${(Math.sin(frame * 7.3) * sh).toFixed(1)}px, ${(Math.cos(frame * 5.1) * sh).toFixed(1)}px) rotate(${(Math.sin(frame * 3.7) * k * 0.4).toFixed(2)}deg) scale(${(1 + Math.min(k, 2) * 0.04).toFixed(3)})` }}>
      {dx >= 2 && (
        <svg width={0} height={0} style={{ position: 'absolute' }}>
          <filter id={id} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
            <feColorMatrix in="SourceGraphic" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="r" />
            <feOffset in="r" dx={dx} result="r2" />
            <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="g" />
            <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="b" />
            <feOffset in="b" dx={-dx} result="b2" />
            <feBlend in="r2" in2="g" mode="screen" result="rg" />
            <feBlend in="rg" in2="b2" mode="screen" />
          </filter>
        </svg>
      )}
      <AbsoluteFill style={{ filter: dx >= 2 ? `url(#${id})` : undefined }}>{children}</AbsoluteFill>
    </AbsoluteFill>
  );
};

/** 옅은 비네팅 (전체 화면 위). 필름 그레인은 넣지 않는다 — 전체 화면 overlay 합성이라 렌더가 20% 넘게 느려지고 유튜브 압축에도 불리하다 */
export const PopFilm: React.FC = () => (
  <AbsoluteFill style={{ pointerEvents: 'none', background: 'radial-gradient(ellipse at center, transparent 58%, rgba(0,0,0,0.26) 100%)' }} />
);

/** 별 모양 구멍이 커지며 새 장면이 열린다 (쇼릴의 별 줌 스루). 가장자리에 색 별 윤곽이 따라온다 */
const starPts = (cx: number, cy: number, R: number, rot: number) => Array.from({ length: 10 }, (_, i) => { const a = rot - Math.PI / 2 + (i / 10) * Math.PI * 2, rr = i % 2 ? R * 0.45 : R; return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]; });
export const STAR_FRAMES = 11;
export const starRadius = (f: number, W: number, H: number) => Math.max(0, Math.pow(clamp01(f / STAR_FRAMES), 2.2)) * Math.hypot(W, H) * 1.6;
export const starClip = (f: number, W: number, H: number) => {
  if (f >= STAR_FRAMES) return undefined;
  const R = starRadius(f, W, H), rot = clamp01(f / STAR_FRAMES) * 1.2;
  return `polygon(${starPts(W / 2, H * 0.45, R, rot).map(([x, y]) => `${x.toFixed(0)}px ${y.toFixed(0)}px`).join(',')})`;
};
export const StarEdges: React.FC = () => {
  const frame = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  if (frame >= STAR_FRAMES + 3) return null;
  return (
    <svg width={W} height={H} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {[C.lime, C.pink, C.orange].map((c, k) => {
        const f = frame - k * 1.2, R = starRadius(f, W, H); if (R <= 0) return null;
        return <polygon key={k} points={starPts(W / 2, H * 0.45, R, clamp01(f / STAR_FRAMES) * 1.2).map(p => p.join(',')).join(' ')} fill="none" stroke={c} strokeWidth={14 - k * 3} strokeLinejoin="round" />;
      })}
    </svg>
  );
};

/** 입자 제목: 가운데서 터진 입자가 소용돌이치다 글자 모양으로 모이고, 모이는 순간 선명한 글자로 바뀌며 일부는 불꽃처럼 튀어 나간다.
 *  글자는 캔버스에 직접 줄바꿈해 그린다. tail은 마지막 줄 끝 기준선에 붙는다 (마침표로 떨어질 공) */
export const PARTICLE_LAND = 26;
export const ParticleTitle: React.FC<{ text: string; size: number; maxW: number; color: string; tail?: React.ReactNode }> = ({ text, size, maxW, color, tail }) => {
  const frame = useCurrentFrame();
  const ref = useRef<HTMLCanvasElement>(null);
  const [handle] = useState(() => delayRender('particle title font'));
  const [ready, setReady] = useState(false);
  const fontStr = `900 ${size}px Pretendard, 'Noto Sans CJK KR', sans-serif`;
  useEffect(() => {
    (document as any).fonts.load(`900 ${size}px Pretendard`, text).catch(() => null).then(() => { setReady(true); continueRender(handle); });
  }, []);
  const PAD = 260, lineH = size * 1.12;
  const layout = useMemo(() => {
    if (!ready) return null;
    const m = document.createElement('canvas').getContext('2d')!; m.font = fontStr;
    const words = text.split(/\s+/).filter(Boolean); const lines: string[] = [];
    for (const w of words) { const last = lines[lines.length - 1]; if (last && m.measureText(last + ' ' + w).width <= maxW) lines[lines.length - 1] = last + ' ' + w; else lines.push(w); }
    const widths = lines.map(l => m.measureText(l).width);
    const w = Math.ceil(Math.min(maxW, Math.max(...widths))), h = Math.ceil(lines.length * lineH);
    const cw = w + PAD * 2, ch = h + PAD * 2;
    const off = document.createElement('canvas'); off.width = cw; off.height = ch; const g = off.getContext('2d')!;
    g.font = fontStr; g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.fillStyle = '#fff';
    const base = (i: number) => PAD + i * lineH + size * 0.92;
    lines.forEach((l, i) => g.fillText(l, cw / 2, base(i)));
    const data = g.getImageData(0, 0, cw, ch).data, r = rng(7), pts: { x: number; y: number; a: number; rr: number; sw: number; del: number; curl: number; spark: boolean; sd: number; c: string }[] = [];
    const step = Math.max(3, Math.round(size / 26));
    for (let y = 0; y < ch; y += step) for (let x = 0; x < cw; x += step) if (data[(y * cw + x) * 4 + 3] > 140)
      pts.push({ x, y, a: r() * Math.PI * 2, rr: 120 + r() * 520, sw: (r() - 0.5) * 0.25, del: r() * 5, curl: (r() - 0.5) * 220, spark: r() < 0.25, sd: 80 + r() * 380, c: PALETTE[Math.floor(r() * 4)] });
    const lastW = widths[widths.length - 1];
    return { lines, cw, ch, w, h, pts, base, endX: cw / 2 + lastW / 2, lastBase: base(lines.length - 1) };
  }, [ready, text, size, maxW]);
  useLayoutEffect(() => {
    const cv = ref.current; if (!cv || !layout) return; const g = cv.getContext('2d')!;
    g.clearRect(0, 0, layout.cw, layout.ch);
    const cx = layout.cw / 2, cy = layout.ch / 2, hit = frame >= PARTICLE_LAND;
    g.globalCompositeOperation = 'lighter';
    for (const p of layout.pts) {
      let x: number, y: number, al = 1;
      if (!hit) {
        const rr = p.rr * outExpo(frame / 12), a = p.a + frame * p.sw, sx = cx + Math.cos(a) * rr * 1.3, sy = cy + Math.sin(a) * rr * 0.75;
        const k = inOutCubic((frame - 6 - p.del) / (PARTICLE_LAND - 6 - p.del)), cv2 = Math.sin(k * Math.PI) * p.curl;
        const dx = p.x - sx, dy = p.y - sy, dl = Math.hypot(dx, dy) || 1;
        x = sx + dx * k - (dy / dl) * cv2; y = sy + dy * k + (dx / dl) * cv2;
      } else {
        const d = frame - PARTICLE_LAND;
        if (!p.spark) { al = 1 - clamp01(d / 3); x = p.x; y = p.y; }
        else { const k = outExpo(d / 22), dx = p.x - cx, dy = p.y - cy, dl = Math.hypot(dx, dy) || 1; x = p.x + (dx / dl) * k * p.sd; y = p.y + (dy / dl) * k * p.sd * 0.7; al = 1 - clamp01(d / 20); }
      }
      if (al <= 0) continue;
      g.globalAlpha = al; g.fillStyle = p.c; g.fillRect(x - 1.6, y - 1.6, 3.2, 3.2);
    }
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
    if (hit) {
      const d = frame - PARTICLE_LAND;
      g.globalAlpha = clamp01(d / 3); g.font = fontStr; g.textAlign = 'center'; g.fillStyle = color;
      layout.lines.forEach((l, i) => g.fillText(l, cx, layout.base(i)));
      const sp = clamp01(d / 18); g.globalAlpha = 1 - sp; g.strokeStyle = color; g.lineWidth = 26 * (1 - sp) + 1;
      g.beginPath(); g.arc(cx, cy, outExpo(sp) * layout.cw * 0.7, 0, Math.PI * 2); g.stroke(); g.globalAlpha = 1;
    }
  }, [frame, layout, color]);
  if (!layout) return <div style={{ height: size * 1.2 }} />;
  return (
    <div style={{ position: 'relative', width: layout.w, height: layout.h }}>
      <canvas ref={ref} width={layout.cw} height={layout.ch} style={{ position: 'absolute', left: -PAD, top: -PAD, width: layout.cw, height: layout.ch, pointerEvents: 'none' }} />
      {/* 마지막 줄 끝 글자 기준선: tail(마침표가 될 공)을 여기 둔다 */}
      {tail && <div style={{ position: 'absolute', left: layout.endX - PAD, top: layout.lastBase - PAD, width: 0, height: 0 }}>{tail}</div>}
    </div>
  );
};
