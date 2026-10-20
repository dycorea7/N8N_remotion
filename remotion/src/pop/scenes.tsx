import React from 'react';
import { AbsoluteFill, Img, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { resolveSrc } from '../assets';
import { Caption } from '../types';
import { Center, P, Sfx, TEMPLATES, counterProgress, counterTiming, fmt, iconFor, revealFrames, useLandscape } from '../scenes';
import { Typewriter } from '../glyph/text';
import { GlitchSlices, Marquee, MorphShape, ParticleKnot, ShapeGrid, Sunburst, Truchet } from './parts';
import { BLOCKS, C, F, PALETTE, backOut, blockFor, clamp01, easeOut, elastic, hash, isLight, pad2 } from './util';

/** 장면 종류별 배경 블록 [배경, 글자, 강조] — Short.tsx의 테두리 색도 이걸 본다 */
export function blockOf(type: string, index: number): [string, string, string] {
  if (type === 'image') return [C.night, C.white, C.lime];
  if (type === 'icon' || type === 'scripture') return [C.paper, C.ink, C.orange];
  if (['chart', 'list', 'checklist', 'timeline', 'iconGrid', 'outro'].includes(type)) return [C.night, C.white, C.lime];
  if (type === 'chapter') return [C.blue, C.white, C.lime];
  if (type === 'compare') return [C.night, C.white, C.lime];
  if (type === 'quote') return [C.blue, C.white, C.lime];
  // 헤드라인·숫자: 밝은/어두운 원색 블록을 번갈아
  const light = [BLOCKS[0], BLOCKS[2], BLOCKS[3], BLOCKS[0], BLOCKS[2]];
  return type === 'stat' ? (index % 2 ? [C.lime, C.ink, C.blue] : [C.orange, C.ink, C.white]) : light[index % light.length];
}

const Mono: React.FC<{ children: React.ReactNode; size?: number; color: string; spacing?: number; style?: React.CSSProperties }> = ({ children, size = 24, color, spacing = 0.3, style }) => (
  <span style={{ fontFamily: F.mono, fontWeight: 700, fontSize: size, letterSpacing: size * spacing, color, textTransform: 'uppercase', ...style }}>{children}</span>
);

/** 초대형 단어 줄: 단어마다 한 줄, 화면 폭에 맞춘 크기, 아래에서 튀어 올라온다 */
const GiantWords: React.FC<{ text: string; highlight?: string[]; color: string; accent: string; start?: number; maxW: number; maxSize?: number }> = ({ text, highlight = [], color, accent, start = 0, maxW, maxSize = 250 }) => {
  const frame = useCurrentFrame();
  const words = text.split(/\s+/).filter(Boolean);
  // 짧은 단어는 이어 붙여 줄 수를 줄인다 (한 줄 최대 6자)
  const lines: string[] = [];
  for (const w of words) { const last = lines[lines.length - 1]; if (last && [...(last + w)].length <= 6) lines[lines.length - 1] = last + ' ' + w; else lines.push(w); }
  const hl = highlight.map(h => h.replace(/\s+/g, '')).filter(Boolean);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {lines.map((ln, i) => {
        const n = Math.max(1, [...ln.replace(/\s/g, '')].length + (ln.includes(' ') ? 0.4 : 0));
        const size = Math.min(maxSize, maxW / (n * 0.98));
        const e = backOut(clamp01((frame - start - i * 4) / 12));
        const isHl = ln.split(' ').some(w => { const c = w.replace(/[^\p{L}\p{N}%]/gu, ''); return hl.some(h => c.includes(h) || (h.includes(c) && c.length > 1)); });
        const bar = easeOut((frame - start - i * 4 - 8) / 10);
        return (
          <div key={i} style={{ position: 'relative', overflow: 'hidden', paddingBottom: size * 0.08 }}>
            <div style={{ fontFamily: F.cond, fontSize: size, lineHeight: 1.02, color: isHl ? accent : color, transform: `translateY(${(1 - e) * size}px)`, letterSpacing: -size * 0.02, whiteSpace: 'nowrap' }}>{ln}</div>
            {isHl && <div style={{ height: size * 0.06, background: isHl ? accent : color, transformOrigin: 'left', transform: `scaleX(${bar})` }} />}
          </div>
        );
      })}
    </div>
  );
};

const Bg: React.FC<{ color: string; children?: React.ReactNode }> = ({ color, children }) => <AbsoluteFill style={{ background: color }}>{children}</AbsoluteFill>;

const Headline: React.FC<P> = ({ scene, index }) => {
  const v = scene.visual;
  const { height: H, width: W } = useVideoConfig();
  const land = W > H;
  const [bg, fg, ac] = blockOf(v.type, index);
  const word = ((v.highlight && v.highlight[0]) || (v.text || '').split(/\s+/)[0] || 'NEXT').slice(0, 8);
  return (
    <AbsoluteFill>
      <Bg color={bg}>
        <Marquee text={word} y={land ? 40 : 260} size={land ? 150 : 170} color={fg} dir={1} />
        <Marquee text={word} y={land ? H - 190 : H - 520} size={land ? 150 : 170} color={fg} dir={-1} />
      </Bg>
      <Center>
        <GiantWords text={v.text || ''} highlight={v.highlight} color={fg} accent={ac} maxW={land ? 1500 : 940} maxSize={land ? 300 : 250} />
      </Center>
    </AbsoluteFill>
  );
};

const SHAPE_NAMES = ['CIRCLE', 'TRIANGLE', 'SQUARE', 'STAR'];
const Icon: React.FC<P> = ({ scene, index, lang, durationInFrames, category }) => {
  const v = scene.visual;
  const frame = useCurrentFrame();
  const land = useLandscape();
  const [bg, fg, ac] = blockOf('icon', index);
  const seg = Math.max(18, durationInFrames / 4);
  const cur = Math.min(3, Math.floor(frame / seg));
  const IconC = iconFor(v.emoji, category);
  const te = easeOut((frame - 10) / 14);
  return (
    <AbsoluteFill>
      <Bg color={bg} />
      <Center>
        <div style={{ position: 'relative' }}>
          <MorphShape size={land ? 520 : 620} dur={durationInFrames} fill={fg} />
          <div style={{ position: 'absolute', right: -40, top: 40, display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
            <Mono size={20} color={fg} spacing={0.15}>vertices 120</Mono>
            <Mono size={20} color={fg} spacing={0.15}>ease expo.out</Mono>
            <div style={{ marginTop: 10, width: 64, height: 64, borderRadius: 32, background: ac, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><IconC size={36} color={C.white} strokeWidth={2.2} /></div>
          </div>
        </div>
        <div style={{ marginTop: 40, fontFamily: F.sans, fontWeight: 900, fontSize: lang === 'ko' ? 92 : 84, color: fg, letterSpacing: -2, textAlign: 'center', opacity: te, transform: `translateY(${(1 - te) * 30}px)`, wordBreak: 'keep-all' }}>{v.text}</div>
        <div style={{ display: 'flex', gap: 30, marginTop: 40 }}>
          {SHAPE_NAMES.map((n, i) => (
            <div key={n} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <Mono size={20} color={i === cur ? ac : fg} spacing={0.2} style={{ opacity: i === cur ? 1 : 0.4 }}>{n}</Mono>
              <div style={{ width: 60, height: 4, background: i === cur ? ac : 'transparent' }} />
            </div>
          ))}
        </div>
      </Center>
    </AbsoluteFill>
  );
};

const Stat: React.FC<P> = ({ scene, index, lang, durationInFrames }) => {
  const v = scene.visual;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const land = useLandscape();
  const [bg, fg] = blockOf('stat', index);
  const target = v.value || 0;
  const tm = counterTiming(scene, target, fps, durationInFrames);
  const p = counterProgress(frame, tm);
  const shown = fmt(p >= 1 ? target : target * p, v.decimals || 0, lang);
  const pop = elastic(clamp01((frame - tm.endF) / 24));
  const n = shown.length + (v.prefix || '').length;
  const size = n > 7 ? 210 : n > 4 ? 290 : 380;
  return (
    <AbsoluteFill>
      <Bg color={bg}><Sunburst color={fg} opacity={0.16} /></Bg>
      <Center>
        <div style={{ display: 'flex', alignItems: 'baseline', transform: `scale(${1 + 0.12 * (1 - pop) * (frame >= tm.endF ? 1 : 0)})` }}>
          {v.prefix && <span style={{ fontFamily: F.sans, fontWeight: 900, fontSize: size * 0.4, color: fg, marginRight: 10 }}>{v.prefix}</span>}
          <span style={{ fontFamily: F.sans, fontWeight: 900, fontSize: size, color: fg, letterSpacing: -size * 0.05, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{shown}</span>
          {v.suffix && <span style={{ fontFamily: F.sans, fontWeight: 900, fontSize: size * 0.32, color: fg, marginLeft: 14 }}>{v.suffix}</span>}
        </div>
        {v.label && <div style={{ marginTop: 34, textAlign: 'center', maxWidth: land ? 1400 : 900 }}><Mono size={land ? 30 : 32} color={fg} spacing={0.35}>{v.label}</Mono></div>}
        {v.sub && <div style={{ marginTop: 18, opacity: clamp01((frame - tm.endF) / 10) }}><Mono size={24} color={fg} spacing={0.15} style={{ opacity: 0.7 }}>{v.sub}</Mono></div>}
      </Center>
      {Array.from({ length: 6 }, (_, k) => <Sfx key={k} name="tick" at={tm.startF + Math.round(tm.countLen * (1 - Math.pow(1 - (k + 1) / 7, 2)))} volume={0.14} />)}
      <Sfx name="pop" at={tm.endF} volume={0.28} />
    </AbsoluteFill>
  );
};

const Chart: React.FC<P> = ({ scene, index, lang, durationInFrames }) => {
  const v = scene.visual;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const land = useLandscape();
  const [bg, fg, ac] = blockOf('chart', index);
  const items = (v.items || []) as { label: string; value: number }[];
  const max = Math.max(...items.map(i => i.value), 1);
  const at = revealFrames(scene, items.map(i => i.label), fps, durationInFrames);
  const H = land ? 480 : 620;
  return (
    <AbsoluteFill>
      <Bg color={bg} />
      <Center>
        {v.title && <div style={{ fontFamily: F.sans, fontWeight: 900, fontSize: 70, color: fg, marginBottom: 50, letterSpacing: -1 }}>{v.title}</div>}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 34, height: H, borderBottom: `3px solid ${fg}` }}>
          {items.map((it, i) => {
            const e = elastic(clamp01((frame - at[i]) / 26));
            const h = Math.max(0.04, it.value / max) * (H - 110) * e;
            return (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: land ? 220 : 190 }}>
                <div style={{ fontFamily: F.cond, fontSize: 64, color: PALETTE[i % 4], opacity: clamp01(e * 2), marginBottom: 10 }}>{fmt(it.value, Math.min(2, (String(it.value).split('.')[1] || '').length), lang)}{v.unit}</div>
                <div style={{ width: '100%', height: h, background: PALETTE[i % 4], borderRadius: '24px 24px 0 0' }} />
              </div>
            );
          })}
        </div>
        <div style={{ display: 'flex', gap: 34, marginTop: 18 }}>
          {items.map((it, i) => <div key={i} style={{ width: land ? 220 : 190, textAlign: 'center' }}><Mono size={28} color={fg} spacing={0.1}>{it.label}</Mono></div>)}
        </div>
      </Center>
      {at.map((f, i) => <Sfx key={i} name="pop" at={f} volume={0.2} />)}
      <div style={{ display: 'none' }}>{ac}</div>
    </AbsoluteFill>
  );
};

const Pills: React.FC<P & { check?: boolean }> = ({ scene, index, durationInFrames, check }) => {
  const v = scene.visual;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const land = useLandscape();
  const [bg, fg] = blockOf('list', index);
  const items = (v.items || []) as string[];
  const at = revealFrames(scene, items, fps, durationInFrames);
  const Check = iconFor('✅');
  return (
    <AbsoluteFill>
      <Bg color={bg}><ShapeGrid opacity={0.1} /></Bg>
      <Center>
        {v.title && <div style={{ fontFamily: F.sans, fontWeight: 900, fontSize: 72, color: fg, marginBottom: 46, letterSpacing: -1, textAlign: 'center' }}>{v.title}</div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 26, alignItems: 'center', width: land ? 1300 : 940 }}>
          {items.map((it, i) => {
            const e = elastic(clamp01((frame - at[i]) / 24));
            const col = PALETTE[(i + index) % 4];
            const ink = col === C.blue ? C.white : C.ink;
            const rot = (hash(i + index * 3) - 0.5) * 6;
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 22, padding: '26px 44px', borderRadius: 999, background: col, transform: `scale(${e}) rotate(${rot}deg)`, maxWidth: '100%' }}>
                {check ? <Check size={52} color={ink} strokeWidth={2.6} /> : <span style={{ fontFamily: F.cond, fontSize: 56, color: ink }}>{pad2(i + 1)}</span>}
                <span style={{ fontFamily: F.sans, fontWeight: 900, fontSize: 60, color: ink, letterSpacing: -1, wordBreak: 'keep-all' }}>{it}</span>
              </div>
            );
          })}
        </div>
      </Center>
      {at.map((f, i) => <Sfx key={i} name={check ? 'check' : 'pop'} at={f} volume={0.24} />)}
    </AbsoluteFill>
  );
};

const Compare: React.FC<P> = ({ scene, lang }) => {
  const v = scene.visual;
  const frame = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const land = W > H;
  const a = easeOut(frame / 10), b = easeOut((frame - 14) / 10), strike = easeOut((frame - 22) / 10);
  const panel = (side: { label: string; text: string }, good: boolean, e: number) => (
    <div style={{ flex: 1, background: good ? C.orange : C.night, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: land ? '0 80px' : '0 70px', transform: land ? `translateY(${(1 - e) * (good ? H : -H)}px)` : `translateX(${(1 - e) * (good ? W : -W)}px)` }}>
      <Mono size={30} color={good ? C.ink : C.lime} spacing={0.3}>{good ? '▲ ' : '▼ '}{side.label}</Mono>
      <div style={{ position: 'relative', marginTop: 20, display: 'inline-block', alignSelf: 'flex-start' }}>
        {/* 줄이 바뀌어도 줄마다 그어지도록 취소선으로 (나타날 때 두께가 굵어진다) */}
        <span style={{ fontFamily: F.sans, fontWeight: 900, fontSize: lang === 'ko' ? 92 : 84, color: good ? C.ink : 'rgba(246,244,239,0.6)', letterSpacing: -2, lineHeight: 1.1, wordBreak: 'keep-all', textDecorationLine: !good && strike > 0 ? 'line-through' : 'none', textDecorationColor: C.lime, textDecorationThickness: `${Math.round(10 * strike)}px` }}>{side.text}</span>
      </div>
    </div>
  );
  return (
    <AbsoluteFill style={{ display: 'flex', flexDirection: land ? 'row' : 'column', background: C.night }}>
      {/* 쇼츠: 위쪽 UI와 자막 자리를 피해 가운데 두 칸 */}
      {!land && <div style={{ height: 230, background: C.night }} />}
      {panel(v.left!, false, a)}
      {panel(v.right!, true, b)}
      {!land && <div style={{ height: 640, background: C.orange }} />}
      <Sfx name="check" at={22} volume={0.2} />
    </AbsoluteFill>
  );
};

/** 타임라인: 이징 곡선 그래프 위로 점이 차례로, 주황 블록이 곡선을 따라 움직인다 */
const Timeline: React.FC<P> = ({ scene, index, durationInFrames }) => {
  const v = scene.visual;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const land = useLandscape();
  const [bg, fg, ac] = blockOf('timeline', index);
  const items = (v.items || []) as { label: string; text: string }[];
  const at = revealFrames(scene, items.map(i => i.text || i.label), fps, durationInFrames);
  const W = land ? 1300 : 900, Hh = land ? 520 : 640;
  const curve = (t: number) => 3 * t * t - 2 * t * t * t; // smoothstep (cubic-bezier 비슷)
  const draw = clamp01(frame / (durationInFrames * 0.6));
  const steps = 80;
  const d = 'M' + Array.from({ length: Math.floor(steps * draw) + 1 }, (_, k) => { const t = k / steps; return `${(t * W).toFixed(1)},${(Hh - curve(t) * Hh).toFixed(1)}`; }).join('L');
  const bt = curve(draw);
  return (
    <AbsoluteFill>
      <Bg color={bg} />
      <Center>
        {v.title && <div style={{ fontFamily: F.sans, fontWeight: 900, fontSize: 70, color: fg, marginBottom: 40, alignSelf: 'flex-start', marginLeft: land ? 160 : 20 }}>{v.title}</div>}
        <div style={{ position: 'relative', width: W, height: Hh }}>
          <svg width={W} height={Hh} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
            <line x1={0} y1={Hh} x2={W} y2={Hh} stroke={fg} strokeOpacity={0.3} strokeWidth={2} />
            <line x1={0} y1={0} x2={0} y2={Hh} stroke={fg} strokeOpacity={0.3} strokeWidth={2} />
            {Array.from({ length: 9 }, (_, k) => <line key={k} x1={(k / 8) * W} y1={0} x2={(k / 8) * W} y2={Hh} stroke={fg} strokeOpacity={0.06} />)}
            <path d={d} fill="none" stroke={ac} strokeWidth={6} strokeLinecap="round" />
          </svg>
          {items.map((it, i) => {
            const t = (i + 1) / (items.length + 1);
            const x = t * W, y = Hh - curve(t) * Hh;
            const e = elastic(clamp01((frame - at[i]) / 22));
            const right = i % 2 === 0;
            return (
              <div key={i} style={{ position: 'absolute', left: x, top: y }}>
                <div style={{ position: 'absolute', left: -16, top: -16, width: 32, height: 32, borderRadius: 16, background: PALETTE[i % 4], transform: `scale(${e})` }} />
                <div style={{ position: 'absolute', left: right ? 30 : undefined, right: right ? undefined : 30, top: right ? 14 : -110, width: land ? 360 : 300, textAlign: right ? 'left' : 'right', opacity: clamp01(e * 1.5) }}>
                  <Mono size={26} color={PALETTE[i % 4]} spacing={0.15}>{it.label}</Mono>
                  <div style={{ fontFamily: F.sans, fontWeight: 800, fontSize: 40, color: fg, lineHeight: 1.2, wordBreak: 'keep-all' }}>{it.text}</div>
                </div>
              </div>
            );
          })}
          <div style={{ position: 'absolute', left: draw * W - 30, top: Hh - bt * Hh - 30, width: 60, height: 60, borderRadius: 12, background: C.orange, boxShadow: `${-20 * (1 - draw)}px 0 0 rgba(255,90,54,0.35)` }} />
        </div>
        <div style={{ marginTop: 24, alignSelf: 'flex-start', marginLeft: land ? 160 : 20 }}><Mono size={22} color={ac} spacing={0.1}>cubic-bezier(.65, 0, .35, 1)</Mono></div>
      </Center>
      {at.map((f, i) => <Sfx key={i} name="pop" at={f} volume={0.22} />)}
    </AbsoluteFill>
  );
};

const IconGrid: React.FC<P> = ({ scene, index, durationInFrames, category }) => {
  const v = scene.visual;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const [bg, fg] = blockOf('iconGrid', index);
  const items = (v.items || []) as { emoji?: string; label: string }[];
  const at = revealFrames(scene, items.map(i => i.label), fps, durationInFrames);
  const cols = items.length === 3 ? 3 : 2, cell = cols === 3 ? 290 : 430;
  return (
    <AbsoluteFill>
      <Bg color={bg}><ShapeGrid opacity={0.28} /></Bg>
      <Center>
        {v.title && <div style={{ fontFamily: F.sans, fontWeight: 900, fontSize: 70, color: fg, marginBottom: 40 }}>{v.title}</div>}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 26, justifyContent: 'center', width: cols * cell + (cols - 1) * 26 }}>
          {items.map((it, i) => {
            const e = elastic(clamp01((frame - at[i]) / 24));
            const I = iconFor(it.emoji, category);
            const col = PALETTE[(i + 1) % 4];
            return (
              <div key={i} style={{ width: cell, padding: '40px 20px', borderRadius: 40, background: col, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22, transform: `scale(${e})` }}>
                <I size={cols === 3 ? 100 : 130} color={col === C.blue ? C.white : C.ink} strokeWidth={2} />
                <div style={{ fontFamily: F.sans, fontWeight: 900, fontSize: cols === 3 ? 44 : 54, color: col === C.blue ? C.white : C.ink, textAlign: 'center', wordBreak: 'keep-all' }}>{it.label}</div>
              </div>
            );
          })}
        </div>
      </Center>
      {at.map((f, i) => <Sfx key={i} name="pop" at={f} volume={0.22} />)}
    </AbsoluteFill>
  );
};

const Quote: React.FC<P> = ({ scene, index, lang }) => {
  const v = scene.visual;
  const frame = useCurrentFrame();
  const { height: H } = useVideoConfig();
  const land = useLandscape();
  const [bg, fg, ac] = blockOf('quote', index);
  const words = (v.text || '').split(/\s+/);
  const size = lang === 'ko' ? ((v.text || '').length > 24 ? 92 : 112) : 96;
  return (
    <AbsoluteFill>
      <Bg color={bg}><Marquee text={(v.author || 'QUOTE').slice(0, 10)} y={land ? H - 200 : H - 540} size={150} color={fg} opacity={0.16} /></Bg>
      <Center>
        <div style={{ fontFamily: F.cond, fontSize: 260, lineHeight: 0.6, color: ac, alignSelf: land ? 'center' : 'flex-start', marginLeft: land ? 0 : 20 }}>“</div>
        <div style={{ fontFamily: F.sans, fontWeight: 900, fontSize: size, color: fg, letterSpacing: -2, lineHeight: 1.15, textAlign: 'center', maxWidth: land ? 1500 : 940, wordBreak: 'keep-all' }}>
          {words.map((w, i) => { const e = backOut(clamp01((frame - 6 - i * 3) / 10)); return <span key={i} style={{ display: 'inline-block', marginRight: size * 0.25, transform: `scale(${e})`, opacity: clamp01(e * 2) }}>{w}</span>; })}
        </div>
        {v.author && <div style={{ marginTop: 40 }}><Typewriter text={'— ' + v.author} start={10 + words.length * 3} speed={1.2} cursor={false} style={{ fontFamily: F.mono, fontWeight: 700, fontSize: 36, color: ac, letterSpacing: 6 }} /></div>}
      </Center>
    </AbsoluteFill>
  );
};

const Scripture: React.FC<P> = ({ scene, index, lang, durationInFrames }) => {
  const v = scene.visual;
  const frame = useCurrentFrame();
  const land = useLandscape();
  const [bg, fg, ac] = blockOf('scripture', index);
  const words = (v.text || '').split(/\s+/);
  const per = Math.max(2, Math.min(6, (durationInFrames * 0.5) / Math.max(1, words.length)));
  return (
    <AbsoluteFill>
      <Bg color={bg} />
      <Center>
        <div style={{ width: 120, height: 120, borderRadius: 60, border: `3px solid ${ac}`, marginBottom: 40, transform: `scale(${elastic(clamp01(frame / 24))})` }} />
        <div style={{ fontFamily: F.serif, fontWeight: 700, fontSize: lang === 'ko' ? 74 : 64, lineHeight: 1.45, color: fg, textAlign: 'center', maxWidth: land ? 1400 : 920, wordBreak: 'keep-all' }}>
          {words.map((w, i) => { const e = easeOut((frame - 6 - i * per) / 12); return <span key={i} style={{ display: 'inline-block', margin: '0 0.14em', opacity: e }}>{w}</span>; })}
        </div>
        {v.author && <div style={{ marginTop: 36 }}><Mono size={34} color={ac} spacing={0.2}>{v.author}</Mono></div>}
      </Center>
      <Sfx name="chime" at={2} volume={0.22} />
    </AbsoluteFill>
  );
};

/** 이미지: 꽉 찬 그림 + 색 스티커 라벨 + 단어마다 색 상자 */
const ImageScene: React.FC<P> = ({ scene, index, lang, durationInFrames }) => {
  const v = scene.visual;
  const frame = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const land = W > H;
  const z = 1.04 + 0.08 * (frame / Math.max(1, durationInFrames));
  const words = (v.text || '').split(/\s+/).filter(Boolean);
  const col = [C.lime, C.orange, C.pink][index % 3];
  const size = land ? 88 : lang === 'ko' ? 104 : 92;
  return (
    <AbsoluteFill style={{ background: C.night }}>
      <AbsoluteFill style={{ transform: `scale(${z})` }}><Img src={resolveSrc(v.src)!} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'saturate(1.15) contrast(1.05)' }} /></AbsoluteFill>
      <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.45), rgba(0,0,0,0) 35%, rgba(0,0,0,0) 60%, rgba(0,0,0,0.55))' }} />
      {words.length > 0 && (
        <div style={{ position: 'absolute', left: land ? 90 : 60, top: land ? 120 : 290, display: 'flex', flexWrap: 'wrap', gap: 14, maxWidth: land ? W * 0.55 : W - 120 }}>
          {words.map((w, i) => {
            const e = backOut(clamp01((frame - 6 - i * 4) / 10));
            return <span key={i} style={{ fontFamily: F.cond, fontSize: size, lineHeight: 1.1, padding: '4px 22px', background: i % 2 ? C.ink : col, color: i % 2 ? col : C.ink, transform: `translateY(${(1 - e) * 60}px) rotate(${(hash(i + index) - 0.5) * 4}deg)`, opacity: clamp01(e * 2) }}>{w}</span>;
          })}
        </div>
      )}
    </AbsoluteFill>
  );
};

/** 마무리: 입자가 돌다가 모이고, 큰 제목 + 주황 점 + 띄어 쓴 CTA */
const Outro: React.FC<P> = ({ scene, index, lang }) => {
  const v = scene.visual;
  const frame = useCurrentFrame();
  const land = useLandscape();
  const [bg, fg, ac] = blockOf('outro', index);
  const e = backOut(clamp01((frame - 10) / 14));
  const cta = (v.cta || '').split('');
  const size = lang === 'ko' ? ((v.text || '').length > 10 ? 104 : 130) : 112;
  return (
    <AbsoluteFill>
      <Bg color={bg}>
        <AbsoluteFill style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: interpolate(frame, [0, 20, 40], [1, 0.9, 0.35], { extrapolateRight: 'clamp' }) }}>
          <ParticleKnot size={land ? 900 : 1000} morph={clamp01(1 - frame / 40)} />
        </AbsoluteFill>
      </Bg>
      <Center>
        <div style={{ display: 'flex', alignItems: 'flex-end', transform: `scale(${0.8 + 0.2 * e})`, opacity: clamp01(e * 1.5) }}>
          <span style={{ fontFamily: F.sans, fontWeight: 900, fontSize: size, color: fg, letterSpacing: -size * 0.04, lineHeight: 1.05, textAlign: 'center', wordBreak: 'keep-all', maxWidth: land ? 1400 : 900 }}>{v.text}</span>
          {!/[?!.。…]$/.test((v.text || '').trim()) && <span style={{ width: size * 0.2, height: size * 0.2, borderRadius: '50%', background: C.orange, marginLeft: 10, marginBottom: size * 0.16, flex: 'none' }} />}
        </div>
        <div style={{ width: 600 * easeOut((frame - 18) / 12), height: 4, background: C.orange, margin: '30px 0' }} />
        <div>{cta.map((c, i) => <span key={i} style={{ fontFamily: F.sans, fontWeight: 800, fontSize: 40, letterSpacing: 14, color: ac, opacity: frame > 22 + i * 1.5 ? 1 : 0 }}>{c}</span>)}</div>
      </Center>
      <Sfx name="swell" at={0} volume={0.22} />
      <Sfx name="pop" at={14} volume={0.26} />
    </AbsoluteFill>
  );
};

const Chapter: React.FC<P> = ({ scene, index, lang }) => {
  const v = scene.visual;
  const frame = useCurrentFrame();
  const [bg, fg, ac] = blockOf('chapter', index);
  const e = backOut(clamp01(frame / 14));
  return (
    <AbsoluteFill>
      <Bg color={bg}><Truchet cell={140} opacity={0.35} /></Bg>
      <Center>
        <div style={{ fontFamily: F.cond, fontSize: 420, lineHeight: 0.9, color: ac, transform: `translateY(${(1 - e) * 200}px)` }}>{pad2(v.number || 1)}</div>
        <div style={{ marginTop: 20, fontFamily: F.sans, fontWeight: 900, fontSize: lang === 'ko' ? 100 : 90, color: fg, letterSpacing: -2, textAlign: 'center', opacity: clamp01((frame - 8) / 10) }}>{v.title || v.text}</div>
      </Center>
      <Sfx name="chime" at={0} volume={0.26} />
    </AbsoluteFill>
  );
};

const POP_TEMPLATES: Partial<Record<string, React.FC<P>>> = {
  headline: Headline, icon: Icon, stat: Stat, chart: Chart, list: (p) => <Pills {...p} />, checklist: (p) => <Pills {...p} check />,
  compare: Compare, timeline: Timeline, iconGrid: IconGrid, quote: Quote, scripture: Scripture, image: ImageScene, outro: Outro, chapter: Chapter,
};

/** 전환: 새 컬러 블록이 아래/옆에서 밀고 들어오거나(와이프) 글리치 조각으로 끊겨 들어온다 */
export const PopSceneView: React.FC<P> = (p) => {
  const frame = useCurrentFrame();
  const type = p.scene.visual.type;
  const T = (POP_TEMPLATES[type] || (TEMPLATES as any)[type]) as React.FC<P>;
  const kind = p.index === 0 ? 'none' : p.index % 3 === 1 ? 'glitch' : p.index % 3 === 2 ? 'wipeUp' : 'wipeLeft';
  const w = easeOut(clamp01(frame / 5));
  let clip: string | undefined;
  if (kind === 'wipeUp' && w < 1) clip = `inset(${(1 - w) * 100}% 0 0 0)`;
  if (kind === 'wipeLeft' && w < 1) clip = `inset(0 0 0 ${(1 - w) * 100}%)`;
  const body = <T {...p} />;
  return (
    <AbsoluteFill style={{ clipPath: clip }}>
      {kind === 'glitch' ? <GlitchSlices frames={7} seed={p.index}>{body}</GlitchSlices> : body}
      {p.index > 0 && type !== 'chapter' && type !== 'scripture' && <Sfx name="whoosh" at={0} volume={0.14} />}
    </AbsoluteFill>
  );
};

/** 테두리: 모서리 괄호, 장면 코드, 해상도·FPS·BPM, 타임코드, 진행선 */
const CODE: Record<string, string> = { headline: 'KINETIC TYPE', icon: 'SHAPE MORPH', stat: 'BY THE NUMBERS', chart: 'DATA', list: 'LIST', checklist: 'TO DO', compare: 'VERSUS', quote: 'QUOTE', scripture: 'VERSE', image: 'SCENE', outro: 'END CARD', chapter: 'CHAPTER', timeline: 'EASING', iconGrid: 'GENERATIVE SYSTEM' };
export const PopChrome: React.FC<{ type: string; index: number; light: boolean }> = ({ type, index, light }) => {
  const frame = useCurrentFrame();
  const { fps, width: W, height: H, durationInFrames } = useVideoConfig();
  const land = W > H;
  const col = light ? 'rgba(13,13,18,0.7)' : 'rgba(246,244,239,0.7)';
  const top = land ? 30 : 140, bot = land ? H - 30 : H - 60, m = land ? 30 : 40;
  const br = (s: React.CSSProperties) => <div style={{ position: 'absolute', width: 26, height: 26, borderColor: col, borderStyle: 'solid', borderWidth: 0, ...s }} />;
  const sec = frame / fps;
  const tc = `${pad2(Math.floor(sec / 60))}:${pad2(Math.floor(sec % 60))}:${pad2(Math.floor((sec * 30) % 30))}`;
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      {br({ left: m, top, borderLeftWidth: 2, borderTopWidth: 2 })}{br({ right: m, top, borderRightWidth: 2, borderTopWidth: 2 })}
      {br({ left: m, top: bot - 26, borderLeftWidth: 2, borderBottomWidth: 2 })}{br({ right: m, top: bot - 26, borderRightWidth: 2, borderBottomWidth: 2 })}
      <div style={{ position: 'absolute', left: m + 40, top: top + 4 }}><Mono size={land ? 16 : 20} color={col} spacing={0.2}>{pad2(index + 1)} — {CODE[type] || 'SCENE'}</Mono></div>
      <div style={{ position: 'absolute', right: m + 40, top: top + 4 }}><Mono size={land ? 16 : 20} color={col} spacing={0.2}>NEXT YOU · REEL ’26</Mono></div>
      <div style={{ position: 'absolute', left: m + 40, top: bot - 26 }}><Mono size={land ? 15 : 18} color={col} spacing={0.15}>{W}×{H} · {fps} FPS · 120 BPM</Mono></div>
      <div style={{ position: 'absolute', right: m + 40, top: bot - 26 }}><Mono size={land ? 15 : 18} color={col} spacing={0.15}>TC {tc}</Mono></div>
      <div style={{ position: 'absolute', left: m + 40, right: m + 40, top: bot - 40, height: 2, background: col, opacity: 0.25 }}>
        <div style={{ width: `${(frame / durationInFrames) * 100}%`, height: '100%', background: C.orange }} />
      </div>
    </AbsoluteFill>
  );
};

/** 자막: 검은 알약 위 흰 글자, 지금 단어는 라임 */
export const PopCaptions: React.FC<{ captions: Caption[]; lang: string }> = ({ captions, lang }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const land = width > height;
  const t = frame / fps;
  const cur = captions.find(c => t >= c.start - 0.05 && t < c.end);
  if (!cur) return null;
  const e = backOut(clamp01(((t - cur.start) * fps) / 6));
  const size = land ? (lang === 'ko' ? 56 : 52) : (lang === 'ko' ? 70 : 64);
  return (
    <AbsoluteFill style={{ justifyContent: 'flex-start', alignItems: 'center', top: land ? 900 : 1300 }}>
      <div style={{ display: 'inline-flex', flexWrap: 'wrap', justifyContent: 'center', maxWidth: land ? 1500 : 960, padding: '12px 26px', borderRadius: 999, background: C.ink, transform: `scale(${0.85 + 0.15 * e})` }}>
        {cur.words.map((w, i) => {
          const active = t >= w.start - 0.03 && t < w.end + 0.08;
          return <span key={i} style={{ fontFamily: F.sans, fontWeight: 900, fontSize: size, lineHeight: 1.25, margin: '0 8px', color: active ? C.lime : C.white }}>{w.text}</span>;
        })}
      </div>
    </AbsoluteFill>
  );
};

export { isLight, blockFor };
