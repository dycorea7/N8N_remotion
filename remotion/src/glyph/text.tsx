import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { F, GlyphTheme, clamp01, easeOut, hash, neon } from './util';

/** 타자기: 한 글자씩 + 블록 커서 */
export const Typewriter: React.FC<{ text: string; start?: number; speed?: number; cursor?: boolean; style?: React.CSSProperties; cursorColor?: string }> = ({ text, start = 0, speed = 1.6, cursor = true, style, cursorColor }) => {
  const frame = useCurrentFrame();
  const chars = [...text];
  const n = Math.max(0, Math.min(chars.length, Math.floor((frame - start) / speed)));
  const typing = n < chars.length;
  const showCursor = cursor && frame >= start && (typing || Math.floor(frame / 9) % 2 === 0);
  return (
    <span style={style}>
      {chars.slice(0, n).join('')}
      <span style={{ display: 'inline-block', width: '0.55em', height: '0.95em', marginLeft: '0.08em', verticalAlign: '-0.1em', background: cursorColor || 'currentColor', opacity: showCursor ? 0.9 : 0 }} />
    </span>
  );
};

/** 해독: 무작위 기호가 왼쪽부터 진짜 글자로 바뀐다 */
const NOISE = '#%&@$*+=<>/01ABCDEFXZ';
export const DecodeText: React.FC<{ text: string; start?: number; len?: number; style?: React.CSSProperties }> = ({ text, start = 0, len = 22, style }) => {
  const frame = useCurrentFrame();
  const chars = [...text];
  const p = clamp01((frame - start) / len);
  return (
    <span style={style}>
      {chars.map((c, i) => {
        const at = i / Math.max(1, chars.length);
        if (frame < start) return <span key={i} style={{ opacity: 0 }}>{c}</span>;
        if (/\s/.test(c) || p >= at + 0.12) return <span key={i}>{c}</span>;
        const r = NOISE[Math.floor(hash(i * 31 + Math.floor(frame / 2)) * NOISE.length)];
        return <span key={i} style={{ opacity: 0.55 }}>{r}</span>;
      })}
    </span>
  );
};

/** 둥근 호를 따라 쓰는 글자 (아이콘·숫자 위에) */
export const ArcText: React.FC<{ text: string; radius: number; size: number; color: string; start?: number; speed?: number; font?: string; hl?: string[]; hlColor?: string }> = ({ text, radius, size, color, start = 0, speed = 1.2, font = F.cond, hl = [], hlColor }) => {
  const frame = useCurrentFrame();
  const chars = [...text];
  const n = Math.max(0, Math.min(chars.length, Math.floor((frame - start) / speed)));
  const W = radius * 2 + size * 2, H = radius + size * 1.6;
  const id = 'arc' + Math.round(radius) + '_' + text.length;
  const words = text.split(/(\s+)/);
  let shown = 0;
  return (
    <svg width={W} height={H} style={{ overflow: 'visible', display: 'block' }}>
      <defs><path id={id} d={`M ${size} ${H} A ${radius} ${radius} 0 0 1 ${W - size} ${H}`} /></defs>
      <text fontFamily={font} fontSize={size} fill={color} letterSpacing={2} style={{ filter: `drop-shadow(0 0 10px rgba(0,0,0,0.8))` }}>
        <textPath href={`#${id}`} startOffset="50%" textAnchor="middle">
          {words.map((w, i) => {
            const take = Math.max(0, Math.min([...w].length, n - shown)); shown += [...w].length;
            const isHl = hl.some(h => h && w.includes(h));
            return <tspan key={i} fill={isHl ? hlColor || color : color} fontSize={isHl ? size * 1.25 : size}>{[...w].slice(0, take).join('')}</tspan>;
          })}
        </textPath>
      </text>
    </svg>
  );
};

/** 단어마다 다른 글꼴·연출 (참고 영상의 '섞어 쓰는' 타이포)
 *  강조 단어: 굵은 압축체 + 글자 텍스처 + 네온 / 그 밖: 모노(타자) · 세리프 · 압축체가 번갈아 */
type Kind = 'hero' | 'mono' | 'serif' | 'cond' | 'script';
export const MixedType: React.FC<{ text: string; highlight?: string[]; theme: GlyphTheme; size: number; delay?: number; stagger?: number; variant?: number; align?: 'center' | 'left'; maxWidth?: number; soft?: boolean }> = ({ text, highlight = [], theme, size, delay = 0, stagger = 6, variant = 0, align = 'center', maxWidth = 940, soft }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const words = text.split(/\s+/).filter(Boolean);
  const hl = highlight.map(h => h.replace(/\s+/g, '')).filter(Boolean);
  const cycle: Kind[][] = soft ? [['serif', 'script'], ['script', 'serif']] : [['mono', 'cond', 'serif'], ['serif', 'mono', 'cond'], ['cond', 'serif', 'mono']];
  const order = cycle[variant % cycle.length];
  let plain = 0;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: align === 'center' ? 'center' : 'flex-start', alignItems: 'baseline', columnGap: size * 0.26, rowGap: size * 0.05, maxWidth, lineHeight: 1.08, wordBreak: 'keep-all' }}>
      {words.map((w, i) => {
        const clean = w.replace(/[^\p{L}\p{N}%]/gu, '');
        const isHl = hl.some(h => clean.includes(h) || (h.includes(clean) && clean.length > 1));
        const kind: Kind = isHl ? 'hero' : order[plain++ % order.length];
        const at = delay + i * stagger;
        const s = spring({ frame: frame - at, fps, config: { damping: 12, stiffness: 200, mass: 0.6 } });
        const vis = frame >= at;
        if (kind === 'mono') {
          return <Typewriter key={i} text={w} start={at} speed={1.3} cursor={i === words.length - 1} cursorColor={theme.accent}
            style={{ fontFamily: F.mono, fontWeight: 700, fontSize: size * 0.72, color: theme.fg, letterSpacing: size * 0.02, textShadow: '0 0 18px rgba(255,255,255,0.25)' }} />;
        }
        if (kind === 'serif' || kind === 'script') {
          const e = easeOut((frame - at) / 12);
          return <span key={i} style={{ fontFamily: kind === 'serif' ? F.serif : F.script, fontWeight: 700, fontSize: size * (kind === 'serif' ? 0.8 : 1.0), color: theme.fg, opacity: vis ? e : 0, filter: `blur(${(1 - e) * 10}px)`, transform: `translateY(${(1 - e) * 24}px)`, display: 'inline-block', textShadow: '0 4px 30px rgba(0,0,0,0.6)' }}>{w}</span>;
        }
        if (kind === 'cond') {
          return <span key={i} style={{ fontFamily: F.cond, fontSize: size * 0.95, color: theme.fg, opacity: vis ? Math.min(1, s * 2) : 0, transform: `scale(${interpolate(s, [0, 1], [1.5, 1])})`, display: 'inline-block', textShadow: '0 6px 30px rgba(0,0,0,0.6)' }}>{w}</span>;
        }
        // hero: 글자 텍스처 + 네온, 큰 펀치
        const flash = clamp01(1 - (frame - at) / 10);
        const useNeon = (variant + i) % 2 === 1;
        return (
          <span key={i} style={{ position: 'relative', display: 'inline-block', fontFamily: F.cond, fontSize: size * 1.28, opacity: vis ? 1 : 0, transform: `scale(${interpolate(s, [0, 1], [1.9, 1])})`, filter: `drop-shadow(0 0 ${10 + flash * 30}px ${useNeon ? theme.neon : theme.accent})` }}>
            {useNeon
              ? <span style={{ color: '#fff', textShadow: neon(theme.neon, 1.2) }}>{w}</span>
              : <span style={{ color: theme.accent, textShadow: `0 0 18px ${theme.accent}88, 0 4px 24px rgba(0,0,0,0.7)` }}>{w}</span>}
          </span>
        );
      })}
    </div>
  );
};
