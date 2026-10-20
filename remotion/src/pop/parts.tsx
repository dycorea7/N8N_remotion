import React, { useLayoutEffect, useMemo, useRef } from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { C, F, PALETTE, clamp01, easeOut, hash, rng } from './util';

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

/** 원 → 삼각형 → 사각형 → 별로 바뀌는 도형 (색 어긋남 그림자 + 궤도 점) */
export const MorphShape: React.FC<{ size: number; dur: number; fill: string; ghostA?: string; ghostB?: string }> = ({ size, dur, fill, ghostA = C.blue, ghostB = C.orange }) => {
  const frame = useCurrentFrame();
  const N = 120, r = size * 0.36;
  const shapes = useMemo(() => [0, 1, 2, 3].map(k => shapePts(k, N, r)), [r]);
  const seg = Math.max(18, dur / 4);
  const raw = frame / seg;
  const k = Math.min(3, Math.floor(raw));
  const t = k >= 3 ? 0 : easeOut((raw - k) / 0.55);
  const A = shapes[k], B = shapes[Math.min(3, k + 1)];
  const pts = A.map((p, i) => [p[0] + (B[i][0] - p[0]) * t, p[1] + (B[i][1] - p[1]) * t]);
  const d = 'M' + pts.map(p => `${(p[0] + size / 2).toFixed(1)},${(p[1] + size / 2).toFixed(1)}`).join('L') + 'Z';
  const rot = frame * 0.6 + k * 20;
  const orb = (rr: number, sp: number, c: string, s: number) => { const a = frame * sp; return <circle cx={size / 2 + Math.cos(a) * rr} cy={size / 2 + Math.sin(a) * rr} r={s} fill={c} />; };
  return (
    <svg width={size} height={size} style={{ overflow: 'visible' }}>
      <circle cx={size / 2} cy={size / 2} r={size * 0.47} fill="none" stroke={fill} strokeOpacity={0.15} strokeWidth={2} strokeDasharray="2 10" />
      <g transform={`rotate(${rot} ${size / 2} ${size / 2})`}>
        <path d={d} fill={ghostA} opacity={0.85} transform="translate(-7,4)" />
        <path d={d} fill={ghostB} opacity={0.85} transform="translate(7,-4)" />
        <path d={d} fill={fill} />
      </g>
      {orb(size * 0.47, 0.05, C.orange, 9)}{orb(size * 0.47, -0.035, C.blue, 7)}{orb(size * 0.52, 0.025, fill, 5)}
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
