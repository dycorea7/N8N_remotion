import React from 'react';
import { useCurrentFrame } from 'remotion';
import { F, H, clamp01, easeOut, hash } from './util';

/** 스플릿 플랩(공항 안내판) 글자: 타일마다 무작위 글자로 넘어가다가 차례로 멈춘다 */
const FLAP = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%';
export const SplitFlap: React.FC<{ text: string; start?: number; size?: number; stagger?: number; spin?: number; accentIdx?: number[]; light?: boolean }> = ({ text, start = 0, size = 120, stagger = 2, spin = 8, accentIdx = [], light }) => {
  const frame = useCurrentFrame();
  const chars = [...text];
  const w = size * 0.74, h = size * 1.12;
  return (
    <div style={{ display: 'flex', gap: size * 0.07, flexWrap: 'wrap', justifyContent: 'center' }}>
      {chars.map((c, i) => {
        if (c === ' ') return <div key={i} style={{ width: w * 0.45 }} />;
        const settle = start + i * stagger + spin;
        const local = frame - start - i * stagger;
        if (local < 0) return <div key={i} style={{ width: w, height: h, background: light ? '#d6d5cf' : H.tile, borderRadius: size * 0.06, opacity: 0.35 }} />;
        const done = frame >= settle;
        const shown = done ? c : FLAP[Math.floor(hash(i * 13 + frame) * FLAP.length)];
        // 넘어가는 순간: 위쪽 반이 접히는 느낌 (세로로 살짝 찌그러짐)
        const flip = done ? clamp01((frame - settle) / 4) : (frame % 2 ? 0.55 : 1);
        const isAcc = accentIdx.includes(i);
        return (
          <div key={i} style={{ position: 'relative', width: w, height: h, background: light ? H.card : H.tile, borderRadius: size * 0.06, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: light ? `inset 0 0 0 2px ${H.line}` : '0 6px 18px rgba(0,0,0,0.35)', overflow: 'hidden' }}>
            <span style={{ fontFamily: /[가-힣]/.test(shown) ? F.sans : F.mono, fontWeight: 700, fontSize: size * (/[가-힣]/.test(shown) ? 0.62 : 0.8), color: isAcc ? H.accent : light ? H.ink : H.white, transform: `scaleY(${0.6 + 0.4 * flip})`, lineHeight: 1 }}>{shown}</span>
            <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', height: Math.max(2, size * 0.025), background: light ? H.line : 'rgba(0,0,0,0.75)' }} />
          </div>
        );
      })}
    </div>
  );
};

/** 바코드 (장식) */
export const Barcode: React.FC<{ w?: number; h?: number; seed?: number; color?: string }> = ({ w = 220, h = 46, seed = 1, color = H.ink }) => {
  const bars: React.ReactNode[] = [];
  let x = 0, k = 0;
  while (x < w) { const bw = 1 + Math.floor(hash(seed * 31 + k) * 4); if (k % 2 === 0) bars.push(<rect key={k} x={x} y={0} width={bw} height={h} fill={color} />); x += bw + 1; k++; }
  return <svg width={w} height={h}>{bars}</svg>;
};

/** 모노 라벨: '■ DATA · 03' 같은 작은 코드 */
export const Mono: React.FC<{ children: React.ReactNode; size?: number; color?: string; style?: React.CSSProperties }> = ({ children, size = 26, color = H.ink2, style }) => (
  <span style={{ fontFamily: F.mono, fontWeight: 700, fontSize: size, letterSpacing: size * 0.08, color, textTransform: 'uppercase', ...style }}>{children}</span>
);

/** 추적 상자: 모서리 괄호가 벌어지며 생기고, 라벨이 붙는다 */
export const TrackBox: React.FC<{ x: number; y: number; w: number; h: number; label?: string; start?: number; color?: string; jitter?: boolean }> = ({ x, y, w, h, label, start = 0, color = H.white, jitter = true }) => {
  const frame = useCurrentFrame();
  const e = easeOut((frame - start) / 10);
  if (frame < start) return null;
  const jx = jitter ? Math.sin(frame / 9) * 6 + (hash(Math.floor(frame / 6)) - 0.5) * 4 : 0;
  const jy = jitter ? Math.cos(frame / 11) * 5 : 0;
  const sc = 1.35 - 0.35 * e;
  const L = Math.min(w, h) * 0.18;
  const c = (s: React.CSSProperties) => <div style={{ position: 'absolute', width: L, height: L, borderColor: color, borderStyle: 'solid', borderWidth: 0, ...s }} />;
  return (
    <div style={{ position: 'absolute', left: x + jx, top: y + jy, width: w, height: h, transform: `scale(${sc})`, opacity: e }}>
      {c({ left: 0, top: 0, borderLeftWidth: 4, borderTopWidth: 4 })}{c({ right: 0, top: 0, borderRightWidth: 4, borderTopWidth: 4 })}
      {c({ left: 0, bottom: 0, borderLeftWidth: 4, borderBottomWidth: 4 })}{c({ right: 0, bottom: 0, borderRightWidth: 4, borderBottomWidth: 4 })}
      <div style={{ position: 'absolute', left: '50%', top: '50%', width: 22, height: 22, marginLeft: -11, marginTop: -11, border: `2px solid ${color}`, borderRadius: 11, opacity: 0.8 }} />
      {label && <div style={{ position: 'absolute', left: 0, top: -46, padding: '4px 10px', background: color === H.white ? 'rgba(0,0,0,0.55)' : H.card }}><Mono size={24} color={color === H.white ? H.white : H.ink}>{label}</Mono></div>}
    </div>
  );
};

/** 태그 카드 (옷 라벨 / 영수증): 머리띠 + 줄들 + 바코드 */
export const TagCard: React.FC<{ code: string; title?: string; width: number; start?: number; children: React.ReactNode; seed?: number; stamp?: string }> = ({ code, title, width, start = 0, children, seed = 1, stamp }) => {
  const frame = useCurrentFrame();
  const e = easeOut((frame - start) / 12);
  return (
    <div style={{ width, background: H.card, borderRadius: 6, boxShadow: '0 30px 80px rgba(0,0,0,0.18), 0 2px 0 rgba(0,0,0,0.05)', padding: '30px 36px 28px', opacity: e, transform: `translateY(${(1 - e) * 40}px) rotate(${(1 - e) * -2}deg)`, position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `2px solid ${H.ink}`, paddingBottom: 14, marginBottom: 20 }}>
        <Mono size={24} color={H.ink}>{code}</Mono>
        {stamp && <span style={{ fontFamily: F.mono, fontWeight: 700, fontSize: 22, color: '#fff', background: H.accent, padding: '4px 12px', letterSpacing: 2 }}>{stamp}</span>}
      </div>
      {title && <div style={{ fontFamily: F.sans, fontWeight: 800, fontSize: 52, color: H.ink, lineHeight: 1.2, marginBottom: 22, wordBreak: 'keep-all' }}>{title}</div>}
      {children}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 26 }}>
        <Barcode seed={seed} />
        <Mono size={20}>NXY-{String(1000 + Math.floor(hash(seed) * 8999))}</Mono>
      </div>
    </div>
  );
};

/** 문장: 단어마다 짧게 타이핑되며, 강조 단어는 주황 */
export const Statement: React.FC<{ text: string; highlight?: string[]; size: number; color?: string; start?: number; align?: 'left' | 'center'; maxWidth?: number }> = ({ text, highlight = [], size, color = H.ink, start = 0, align = 'left', maxWidth = 940 }) => {
  const frame = useCurrentFrame();
  const words = text.split(/\s+/).filter(Boolean);
  const hl = highlight.map(h => h.replace(/\s+/g, '')).filter(Boolean);
  let acc = 0;
  return (
    <div style={{ fontFamily: F.sans, fontWeight: 800, fontSize: size, lineHeight: 1.16, letterSpacing: -size * 0.02, color, textAlign: align, maxWidth, wordBreak: 'keep-all' }}>
      {words.map((w, i) => {
        const at = start + acc; acc += Math.max(3, [...w].length * 1.4);
        const n = Math.max(0, Math.min([...w].length, Math.floor((frame - at) / 1.3)));
        const clean = w.replace(/[^\p{L}\p{N}%]/gu, '');
        const isHl = hl.some(h => clean.includes(h) || (h.includes(clean) && clean.length > 1));
        return <span key={i} style={{ color: isHl ? H.accent : color, marginRight: size * 0.24, display: 'inline-block' }}>{[...w].slice(0, n).join('')}<span style={{ opacity: 0 }}>{[...w].slice(n).join('')}</span></span>;
      })}
    </div>
  );
};

/** 십자 표시 (+) */
export const Cross: React.FC<{ x: number; y: number; color: string; size?: number }> = ({ x, y, color, size = 26 }) => (
  <div style={{ position: 'absolute', left: x - size / 2, top: y - size / 2, width: size, height: size }}>
    <div style={{ position: 'absolute', left: size / 2 - 1, top: 0, width: 2, height: size, background: color }} />
    <div style={{ position: 'absolute', top: size / 2 - 1, left: 0, height: 2, width: size, background: color }} />
  </div>
);
