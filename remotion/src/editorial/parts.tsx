import React from 'react';
import { AbsoluteFill, Img, useCurrentFrame } from 'remotion';
import { resolveSrc } from '../assets';
import { C, F, arrowHead, clamp01, grain, handEllipse, handLine, pathLen, place, rnd, step, torn, tornLR } from './util';
import { Media } from '../Media';

/** 종이 결 + 가장자리 비네트 (화면 맨 위에 곱하기로) */
export const Grain: React.FC<{ opacity?: number }> = ({ opacity = 0.32 }) => {
  // 결은 고정 (프레임마다 바뀌면 영상 용량이 몇 배로 커진다)
  const url = grain();
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      {url && <AbsoluteFill style={{ backgroundImage: `url(${url})`, backgroundSize: '220px 220px', mixBlendMode: 'multiply', opacity }} />}
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 55%, rgba(60,40,20,0.22) 100%)' }} />
    </AbsoluteFill>
  );
};

/** 모눈종이 (도표 장면 배경) */
export const GridPaper: React.FC<{ cell?: number; opacity?: number }> = ({ cell = 54, opacity = 1 }) => (
  <AbsoluteFill style={{ opacity, backgroundImage: `linear-gradient(rgba(46,76,120,0.13) 1.5px, transparent 1.5px), linear-gradient(90deg, rgba(46,76,120,0.13) 1.5px, transparent 1.5px)`, backgroundSize: `${cell}px ${cell}px` }} />
);

/** 오려 붙인 종이 조각: 찢은 가장자리 + 딱딱한 그림자 + 손으로 놓은 듯 들어옴 */
export const Paper: React.FC<{
  w: number; h: number; color?: string; seed?: number; edges?: string; rot?: number; at?: number; from?: 'up' | 'down' | 'left' | 'right' | 'drop';
  style?: React.CSSProperties; children?: React.ReactNode; shadow?: boolean; amp?: number;
}> = ({ w, h, color = C.card, seed = 1, edges = 'tb', rot = 0, at = 0, from = 'drop', style, children, shadow = true, amp = 7 }) => {
  const f = step(useCurrentFrame());
  const e = place(clamp01((f - at) / 10));
  const d = 1 - e;
  const tr = from === 'drop' ? `scale(${1 + d * 0.25}) rotate(${rot + d * 8}deg)`
    : from === 'up' ? `translateY(${-d * 900}px) rotate(${rot - d * 6}deg)`
    : from === 'down' ? `translateY(${d * 900}px) rotate(${rot + d * 6}deg)`
    : from === 'left' ? `translateX(${-d * 1100}px) rotate(${rot - d * 8}deg)`
    : `translateX(${d * 1100}px) rotate(${rot + d * 8}deg)`;
  return (
    <div style={{ position: 'relative', width: w, height: h, transform: tr, opacity: f < at ? 0 : 1, filter: shadow ? 'drop-shadow(7px 9px 0 rgba(40,28,14,0.22)) drop-shadow(0 18px 22px rgba(40,28,14,0.18))' : undefined, flex: 'none', ...style }}>
      <div style={{ position: 'absolute', inset: 0, background: color, clipPath: torn(w, h, seed, edges, amp) }} />
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>{children}</div>
    </div>
  );
};

/** 마스킹 테이프 한 조각 */
export const Tape: React.FC<{ x: number; y: number; w?: number; rot?: number; seed?: number }> = ({ x, y, w = 150, rot = -8, seed = 3 }) => (
  <div style={{ position: 'absolute', left: x - w / 2, top: y - 22, width: w, height: 44, transform: `rotate(${rot}deg)`, background: C.tape, clipPath: torn(w, 44, seed, 'lr', 5, 9), boxShadow: 'inset 0 0 0 1px rgba(150,130,90,0.15)', zIndex: 5 }} />
);

/** 큰 빨간 원 (오린 종이) */
export const RedDisc: React.FC<{ size: number; at?: number; color?: string; style?: React.CSSProperties }> = ({ size, at = 0, color = C.red, style }) => {
  const f = step(useCurrentFrame());
  const e = place(clamp01((f - at) / 12));
  return <div style={{ position: 'absolute', width: size, height: size, borderRadius: '50%', background: color, transform: `scale(${e})`, boxShadow: '6px 8px 0 rgba(40,28,14,0.16)', ...style }} />;
};

/** 손으로 그린 빨간 마커 동그라미 (그려지며 나타남) */
//  부모 요소(position: relative) 크기에 맞춰 늘어난다. pad = 바깥으로 얼마나 크게 (비율)
export const MarkerCircle: React.FC<{ at?: number; seed?: number; color?: string; width?: number; dur?: number; padX?: number; padY?: number }> = ({ at = 0, seed = 1, color = C.red, width = 7, dur = 12, padX = 0.12, padY = 0.22 }) => {
  const f = useCurrentFrame();
  const boil = Math.floor(f / 4);
  const d = handEllipse(50, 50, 50, 50, seed, boil);
  const p = clamp01((step(f) - at) / dur);
  if (p <= 0) return null;
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: 'absolute', left: `${-padX * 100}%`, top: `${-padY * 100}%`, width: `${100 + padX * 200}%`, height: `${100 + padY * 200}%`, overflow: 'visible', pointerEvents: 'none' }}>
      <path d={d} pathLength={1} fill="none" stroke={color} strokeWidth={width} vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="1 1" strokeDashoffset={1 - p} opacity={0.92} />
    </svg>
  );
};

/** 손으로 그은 빨간 X (틀린 쪽 지우기) */
export const MarkerCross: React.FC<{ at?: number; seed?: number; color?: string; width?: number }> = ({ at = 0, seed = 1, color = C.red, width = 9 }) => {
  const f = useCurrentFrame();
  const boil = Math.floor(f / 4);
  const a = handLine(4, 8, 96, 92, seed, boil, 0.04), b = handLine(94, 6, 6, 94, seed + 5, boil, 0.04);
  const p1 = clamp01((step(f) - at) / 6), p2 = clamp01((step(f) - at - 6) / 6);
  if (p1 <= 0) return null;
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible', pointerEvents: 'none' }}>
      <path d={a} pathLength={1} fill="none" stroke={color} strokeWidth={width} vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeDasharray="1 1" strokeDashoffset={1 - p1} />
      {p2 > 0 && <path d={b} pathLength={1} fill="none" stroke={color} strokeWidth={width} vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeDasharray="1 1" strokeDashoffset={1 - p2} />}
    </svg>
  );
};

/** 손으로 그린 체크 표시 */
export const MarkerCheck: React.FC<{ size: number; at?: number; seed?: number; color?: string }> = ({ size, at = 0, seed = 1, color = C.red }) => {
  const f = useCurrentFrame();
  const boil = Math.floor(f / 4);
  const d = handLine(8, 52, 38, 84, seed, boil, 0.02) + handLine(38, 84, 94, 10, seed + 3, boil, 0.05).replace('M', 'L');
  const p = clamp01((step(f) - at) / 8);
  if (p <= 0) return null;
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} style={{ position: 'absolute', left: 0, top: -size * 0.2, overflow: 'visible' }}>
      <path d={d} pathLength={1} fill="none" stroke={color} strokeWidth={12} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="1 1" strokeDashoffset={1 - p} />
    </svg>
  );
};

/** 형광펜 밑줄/칠하기 (글자 뒤) */
export const Highlighter: React.FC<{ at?: number; color?: string; height?: string; dur?: number }> = ({ at = 0, color = C.ochre, height = '42%', dur = 8 }) => {
  const f = step(useCurrentFrame());
  const p = clamp01((f - at) / dur);
  return <span style={{ position: 'absolute', left: '-4%', bottom: '6%', height, width: `${108 * p}%`, background: color, opacity: 0.75, zIndex: -1, borderRadius: 6, transform: 'rotate(-1.2deg)' }} />;
};

/** 손그림 화살표 (그려지며 나타남) */
export const HandArrow: React.FC<{ x1: number; y1: number; x2: number; y2: number; at?: number; seed?: number; color?: string; width?: number; bend?: number }> = ({ x1, y1, x2, y2, at = 0, seed = 2, color = C.red, width = 6, bend = 0.12 }) => {
  const f = useCurrentFrame();
  const boil = Math.floor(f / 4);
  const d = handLine(x1, y1, x2, y2, seed, boil, bend);
  const L = pathLen(d);
  const p = clamp01((step(f) - at) / 10);
  if (p <= 0) return null;
  return (
    <svg style={{ position: 'absolute', left: 0, top: 0, width: 1, height: 1, overflow: 'visible', pointerEvents: 'none' }}>
      <path d={d} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeDasharray={L} strokeDashoffset={L * (1 - p)} />
      {p >= 1 && <path d={arrowHead(x1, y1, x2, y2)} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" />}
    </svg>
  );
};

/** 타자기 꼬리표 (오린 종이 위 고정폭 글자) */
export const Tag: React.FC<{ text: string; at?: number; color?: string; ink?: string; size?: number; rot?: number; seed?: number }> = ({ text, at = 0, color = C.card, ink = C.ink, size = 30, rot = -2, seed = 5 }) => {
  const f = step(useCurrentFrame());
  const e = place(clamp01((f - at) / 8));
  const n = Math.max(0, Math.floor((f - at) * 1.6));
  return (
    <div style={{ position: 'relative', display: 'inline-block', transform: `rotate(${rot}deg) scale(${0.6 + 0.4 * e})`, opacity: f < at ? 0 : 1, filter: 'drop-shadow(4px 5px 0 rgba(40,28,14,0.2))' }}>
      <div style={{ position: 'absolute', inset: 0, background: color, clipPath: tornLR(seed) }} />
      <span style={{ position: 'relative', display: 'block', padding: `${size * 0.32}px ${size * 0.7}px`, fontFamily: F.mono, fontWeight: 700, fontSize: size, letterSpacing: size * 0.06, color: ink, whiteSpace: 'nowrap' }}>{[...text].slice(0, n).join('')}<span style={{ opacity: 0 }}>{[...text].slice(n).join('')}</span></span>
    </div>
  );
};

/** 사진 인화지: 크림색 테두리 + 갈색 톤 + 천천히 확대 + 테이프 */
export const Print: React.FC<{ src: string; video?: string; videoStart?: number; w: number; h: number; dur: number; rot?: number; at?: number; seed?: number; from?: 'up' | 'down' | 'left' | 'right' | 'drop'; tape?: boolean; border?: number }> = ({ src, video, videoStart, w, h, dur, rot = -2, at = 0, seed = 4, from = 'drop', tape = true, border = 18 }) => {
  const f = useCurrentFrame();
  const z = 1.04 + 0.08 * clamp01(f / Math.max(1, dur));
  return (
    <Paper w={w} h={h} color={C.card} seed={seed} edges="b" rot={rot} at={at} from={from} amp={6}>
      <div style={{ position: 'absolute', left: border, top: border, right: border, bottom: border * 1.6, overflow: 'hidden', background: C.ink }}>
        <div style={{ position: 'absolute', inset: 0, transform: `scale(${z})` }}>
          <Media src={src} video={video} videoStart={videoStart} style={{ filter: 'sepia(0.32) saturate(0.78) contrast(1.08) brightness(1.02)' }} />
        </div>
        {/* 인쇄 망점 */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(rgba(28,26,23,0.16) 1px, transparent 1.4px)', backgroundSize: '6px 6px', mixBlendMode: 'multiply' }} />
      </div>
      {tape && <><Tape x={w * 0.18} y={6} rot={-14} seed={seed + 1} /><Tape x={w * 0.84} y={10} rot={11} seed={seed + 2} /></>}
    </Paper>
  );
};
