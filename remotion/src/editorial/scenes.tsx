import React from 'react';
import { AbsoluteFill, Img, useCurrentFrame, useVideoConfig } from 'remotion';
import { Media } from '../Media';
import { resolveSrc } from '../assets';
import { Caption } from '../types';
import { Center, P, Sfx, TEMPLATES, counterProgress, counterTiming, fmt, iconFor, revealFrames, useLandscape } from '../scenes';
import { Grain, GridPaper, HandArrow, Highlighter, MarkerCheck, MarkerCircle, MarkerCross, Paper, Print, RedDisc, Tag, Tape } from './parts';
import { C, F, clamp01, handLine, pad2, place, rnd, step, tearClip, tornLR, tornPct } from './util';

// ── 공통 ──
const isHl = (w: string, hl: string[]) => { const c = w.replace(/[^\p{L}\p{N}%]/gu, ''); return c.length > 0 && hl.some(h => { const x = h.replace(/[^\p{L}\p{N}%]/gu, ''); return x && (c.includes(x) || (x.includes(c) && c.length > 1)); }); };
const hlList = (v: any) => (v.highlight || []).flatMap((h: string) => String(h).split(/\s+/)).filter(Boolean);

/** 종이 배경. 사진 배경(bgSrc)이 있으면 바랜 신문 사진처럼 깔고 종이색으로 덮는다 */
const BgCtx = React.createContext<{ src?: string; video?: string; videoStart?: number; dur: number; index: number }>({ dur: 150, index: 0 });
const Bg: React.FC<{ grid?: boolean; tone?: string; children?: React.ReactNode }> = ({ grid, tone = C.paper, children }) => {
  const ctx = React.useContext(BgCtx);
  const f = useCurrentFrame();
  const z = 1.06 + 0.06 * clamp01(f / Math.max(1, ctx.dur));
  return (
    <AbsoluteFill style={{ background: tone }}>
      {ctx.src && (
        <AbsoluteFill style={{ overflow: 'hidden' }}>
          <AbsoluteFill style={{ transform: `scale(${z})` }}>{ctx.video
            ? <Media video={ctx.video} videoStart={ctx.videoStart} style={{ filter: 'grayscale(1) sepia(0.45) contrast(1.15)' }} />
            : <Img src={resolveSrc(ctx.src)!} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'grayscale(1) sepia(0.45) contrast(1.15)' }} />}</AbsoluteFill>
          <AbsoluteFill style={{ backgroundImage: 'radial-gradient(rgba(28,26,23,0.35) 1px, transparent 1.6px)', backgroundSize: '7px 7px', mixBlendMode: 'multiply' }} />
          <AbsoluteFill style={{ background: tone, opacity: 0.8 }} />
        </AbsoluteFill>
      )}
      {grid && <GridPaper />}
      {children}
    </AbsoluteFill>
  );
};

/** 오려 낸 글자 띠 (크기 자동): 찢은 좌우 변 + 그림자 + 손으로 놓기 */
const Strip: React.FC<{ at?: number; color?: string; rot?: number; seed?: number; pad?: string; from?: 'drop' | 'left' | 'right'; children: React.ReactNode; style?: React.CSSProperties }> = ({ at = 0, color = C.card, rot = -1.5, seed = 1, pad = '6px 30px 10px', from = 'drop', children, style }) => {
  const f = step(useCurrentFrame());
  const e = place(clamp01((f - at) / 9));
  const d = 1 - e;
  const tr = from === 'left' ? `translateX(${-d * 900}px) rotate(${rot - d * 6}deg)` : from === 'right' ? `translateX(${d * 900}px) rotate(${rot + d * 6}deg)` : `scale(${1 + d * 0.3}) rotate(${rot + d * 7}deg)`;
  return (
    <div style={{ position: 'relative', display: 'inline-block', transform: tr, opacity: f < at ? 0 : 1, filter: 'drop-shadow(6px 8px 0 rgba(40,28,14,0.2))', ...style }}>
      <div style={{ position: 'absolute', inset: 0, background: color, clipPath: tornLR(seed) }} />
      <div style={{ position: 'relative', padding: pad }}>{children}</div>
    </div>
  );
};

/** 강조 단어: 형광펜 + 빨간 마커 동그라미 */
const Marked: React.FC<{ at: number; seed: number; children: React.ReactNode; circle?: boolean; color?: string }> = ({ at, seed, children, circle = true, color = C.red }) => (
  <span style={{ position: 'relative', display: 'inline-block', zIndex: 0 }}>
    <Highlighter at={at} />
    {children}
    {circle && <MarkerCircle at={at + 6} seed={seed} color={color} />}
  </span>
);

const Kicker: React.FC<{ text: string; at?: number; rot?: number; seed?: number }> = ({ text, at = 0, rot = -3, seed = 7 }) => <Tag text={text} at={at} rot={rot} seed={seed} size={28} />;

/** 제목 줄: 세리프 + 빨간 손그림 밑줄 */
const Title: React.FC<{ text?: string; at?: number; size?: number; seed?: number }> = ({ text, at = 0, size = 68, seed = 3 }) => {
  const f = useCurrentFrame();
  if (!text) return null;
  const e = clamp01((step(f) - at) / 8);
  const w = Math.min(860, [...text].length * size * 0.95);
  const d = handLine(0, 8, w, 4, seed, Math.floor(f / 4), 0.02);
  const p = clamp01((step(f) - at - 6) / 8);
  return (
    <div style={{ position: 'relative', marginBottom: 46, opacity: e, transform: `translateY(${(1 - e) * 20}px)` }}>
      <div style={{ fontFamily: F.serif, fontWeight: 700, fontSize: size, color: C.ink, letterSpacing: -1, textAlign: 'center', wordBreak: 'keep-all', lineHeight: 1.2 }}>{text}</div>
      <svg style={{ position: 'absolute', left: '50%', marginLeft: -w / 2, bottom: -18, width: w, height: 16, overflow: 'visible' }}>
        <path d={d} pathLength={1} fill="none" stroke={C.red} strokeWidth={6} strokeLinecap="round" strokeDasharray="1 1" strokeDashoffset={1 - p} />
      </svg>
    </div>
  );
};

/** 줄 나누기: 한 줄 최대 maxChars자 (단어 단위) */
function lines(text: string, maxChars: number): string[] {
  const out: string[] = [];
  for (const w of text.split(/\s+/).filter(Boolean)) { const last = out[out.length - 1]; if (last && [...(last + ' ' + w)].length <= maxChars) out[out.length - 1] = last + ' ' + w; else out.push(w); }
  return out;
}

// ── 장면 ──
const Headline: React.FC<P> = ({ scene, index, lang }) => {
  const v = scene.visual;
  const land = useLandscape();
  const text = v.text || '';
  const n = [...text.replace(/\s/g, '')].length;
  const size = lang === 'ko' ? (n <= 6 ? 170 : n <= 10 ? 140 : n <= 14 ? 118 : 100) : (n <= 12 ? 130 : n <= 22 ? 104 : 88);
  const ls = lines(text, lang === 'ko' ? (n <= 10 ? 5 : 7) : 14);
  const hl = hlList(v);
  const discR = land ? 640 : 700;
  // 마커 동그라미는 첫 강조 단어 하나만 (여러 개면 지저분하다), 나머지는 형광펜만
  let firstHl = -1, wi = 0;
  ls.forEach(ln => ln.split(' ').forEach(w => { if (firstHl < 0 && isHl(w, hl)) firstHl = wi; wi++; }));
  let wc = 0;
  return (
    <AbsoluteFill>
      <Bg />
      <Center>
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <RedDisc size={discR} at={0} style={{ left: '50%', top: '50%', marginLeft: -discR / 2 + (index % 2 ? 90 : -90), marginTop: -discR / 2 - 30 }} />
          <div style={{ position: 'relative', marginBottom: 30 }}><Kicker text={`NO.${pad2(index + 1)}${v.emoji ? '' : ''}`} at={2} /></div>
          {ls.map((ln, i) => (
            <Strip key={i} at={5 + i * 4} seed={index * 7 + i} rot={(i % 2 ? 1.6 : -1.8) + (rnd(index + i) - 0.5)} from={i % 2 ? 'right' : 'left'} style={{ margin: '6px 0' }} pad={`${size * 0.04}px ${size * 0.22}px ${size * 0.1}px`}>
              <span style={{ fontFamily: F.serif, fontWeight: 700, fontSize: size, lineHeight: 1.15, color: C.ink, letterSpacing: -size * 0.03, whiteSpace: 'nowrap' }}>
                {ln.split(' ').map((w, k) => (
                  <React.Fragment key={k}>{k > 0 && ' '}{isHl(w, hl) ? <Marked at={14 + i * 4} seed={index + k} circle={wc++ === firstHl} color={C.ink}>{w}</Marked> : (wc++, w)}</React.Fragment>
                ))}
              </span>
            </Strip>
          ))}
        </div>
      </Center>
      {ls.map((_, i) => <Sfx key={i} name="tick" at={5 + i * 4} volume={0.16} />)}
    </AbsoluteFill>
  );
};

const Stat: React.FC<P> = ({ scene, index, lang, durationInFrames }) => {
  const v = scene.visual;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const land = useLandscape();
  const target = v.value || 0;
  const tm = counterTiming(scene, target, fps, durationInFrames);
  const p = counterProgress(step(frame), tm);
  const shown = fmt(p >= 1 ? target : target * p, v.decimals || 0, lang);
  const nChars = shown.length + (v.prefix || '').length;
  const size = nChars > 7 ? 170 : nChars > 4 ? 230 : 300;
  const D = land ? 640 : 720;
  return (
    <AbsoluteFill>
      <Bg grid />
      <Center>
        <div style={{ position: 'relative', width: D, height: D, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <RedDisc size={D} at={0} style={{ left: 0, top: 0 }} />
          <div style={{ position: 'relative', display: 'flex', alignItems: 'baseline', color: C.card, fontFamily: F.serif, fontWeight: 700 }}>
            {v.prefix && <span style={{ fontSize: size * 0.42, marginRight: 8 }}>{v.prefix}</span>}
            <span style={{ fontSize: size, letterSpacing: -size * 0.04, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{shown}</span>
            {v.suffix && <span style={{ fontSize: size * 0.34, marginLeft: 10 }}>{v.suffix}</span>}
          </div>
          {v.label && <div style={{ position: 'relative', marginTop: 26 }}><Tag text={v.label} at={10} size={land ? 30 : 34} rot={2} /></div>}
        </div>
        {v.sub && (
          <div style={{ position: 'relative', alignSelf: land ? 'center' : 'flex-start', marginLeft: land ? 700 : 40, marginTop: 30, opacity: clamp01((step(frame) - tm.endF) / 6) }}>
            <HandArrow x1={120} y1={0} x2={260} y2={-110} at={tm.endF} seed={index} width={6} />
            <span style={{ fontFamily: F.hand, fontSize: land ? 62 : 68, color: C.ink, transform: 'rotate(-3deg)', display: 'inline-block' }}>{v.sub}</span>
          </div>
        )}
      </Center>
      {Array.from({ length: 6 }, (_, k) => <Sfx key={k} name="tick" at={tm.startF + Math.round(tm.countLen * (1 - Math.pow(1 - (k + 1) / 7, 2)))} volume={0.14} />)}
      <Sfx name="pop" at={tm.endF} volume={0.26} />
    </AbsoluteFill>
  );
};

const BAR = [C.red, C.blue, C.ochre, C.kraft];
const Chart: React.FC<P> = ({ scene, index, lang, durationInFrames }) => {
  const v = scene.visual;
  const frame = step(useCurrentFrame());
  const { fps } = useVideoConfig();
  const land = useLandscape();
  const items = (v.items || []) as { label: string; value: number }[];
  const max = Math.max(...items.map(i => i.value), 1);
  const at = revealFrames(scene, items.map(i => i.label), fps, durationInFrames);
  const H = land ? 470 : 600, bw = land ? 200 : Math.min(190, 760 / Math.max(1, items.length) - 30);
  const top = items.reduce((b, it, i) => (it.value > items[b].value ? i : b), 0);
  const last = Math.max(0, ...at) + 16;
  return (
    <AbsoluteFill>
      <Bg />
      <Center>
        <Title text={v.title} />
        <Paper w={land ? 1300 : 920} h={H + 170} color={C.card} seed={index + 3} edges="tb" rot={-0.8} at={0}>
          <AbsoluteFill style={{ overflow: 'hidden', clipPath: 'inset(8px 0)' }}><GridPaper cell={46} /></AbsoluteFill>
          <div style={{ position: 'absolute', left: 50, right: 50, top: 40, height: H, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', borderBottom: `4px solid ${C.ink}` }}>
            {items.map((it, i) => {
              const e = place(clamp01((frame - at[i]) / 12));
              const h = Math.max(14, (it.value / max) * (H - 150) * e);
              return (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: bw }}>
                  <div style={{ position: 'relative', fontFamily: F.hand, fontSize: 72, color: C.ink, opacity: e > 0.3 ? 1 : 0, marginBottom: 4 }}>
                    {fmt(it.value, Math.min(2, (String(it.value).split('.')[1] || '').length), lang)}{v.unit}
                    {i === top && items.length > 1 && <MarkerCircle at={last} seed={index} padX={0.25} padY={0.1} />}
                  </div>
                  <div style={{ width: '100%', height: h, background: BAR[i % 4], clipPath: tornPct(index * 5 + i, 6, 2.5), filter: 'drop-shadow(5px 0 0 rgba(40,28,14,0.18))' }} />
                </div>
              );
            })}
          </div>
          <div style={{ position: 'absolute', left: 50, right: 50, top: H + 60, display: 'flex', justifyContent: 'space-around' }}>
            {items.map((it, i) => <div key={i} style={{ width: bw + 30, textAlign: 'center', fontFamily: F.mono, fontWeight: 700, fontSize: 30, color: C.ink, wordBreak: 'keep-all' }}>{it.label}</div>)}
          </div>
        </Paper>
      </Center>
      {at.map((f, i) => <Sfx key={i} name="pop" at={f} volume={0.18} />)}
    </AbsoluteFill>
  );
};

/** 목록·할 일: 인덱스 카드 (번호 빨간 원 / 손그림 체크) */
const Cards: React.FC<P & { check?: boolean }> = ({ scene, index, durationInFrames, check }) => {
  const v = scene.visual;
  const frame = step(useCurrentFrame());
  const { fps } = useVideoConfig();
  const land = useLandscape();
  const items = (v.items || []) as string[];
  const at = revealFrames(scene, items, fps, durationInFrames);
  const W = land ? 1200 : 900, h = items.length > 3 ? 132 : 150;
  return (
    <AbsoluteFill>
      <Bg grid={!check} />
      <Center>
        <Title text={v.title} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22, alignItems: 'center' }}>
          {items.map((it, i) => (
            <Paper key={i} w={W} h={h} color={i % 2 ? C.card : '#f6efdd'} seed={index * 11 + i} edges="lr" rot={(i % 2 ? 1.2 : -1.4)} at={at[i]} from={i % 2 ? 'right' : 'left'} amp={6}>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', gap: 34, padding: '0 46px' }}>
                {check ? (
                  <div style={{ position: 'relative', width: 70, height: 70, border: `5px solid ${C.ink}`, borderRadius: 6, flex: 'none' }}><MarkerCheck size={90} at={at[i] + 8} seed={i} /></div>
                ) : (
                  <div style={{ width: 84, height: 84, borderRadius: '50%', background: C.red, color: C.card, fontFamily: F.serif, fontWeight: 700, fontSize: 46, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>{i + 1}</div>
                )}
                <span style={{ fontFamily: F.sans, fontWeight: 800, fontSize: [...it].length > 10 ? 50 : 58, color: C.ink, letterSpacing: -1, wordBreak: 'keep-all', textDecorationLine: check && frame > at[i] + 14 ? 'none' : 'none' }}>{it}</span>
              </div>
              {i === 0 && <Tape x={W - 90} y={4} rot={9} seed={index} />}
            </Paper>
          ))}
        </div>
      </Center>
      {at.map((f, i) => <Sfx key={i} name={check ? 'check' : 'tick'} at={check ? f + 8 : f} volume={0.2} />)}
    </AbsoluteFill>
  );
};

const Compare: React.FC<P> = ({ scene, index, lang }) => {
  const v = scene.visual;
  const land = useLandscape();
  const W = land ? 720 : 880, H = land ? 560 : 330;
  const card = (side: { label: string; text: string }, good: boolean, at: number) => (
    <Paper w={W} h={H} color={good ? C.card : '#e9dfca'} seed={index * 3 + (good ? 2 : 1)} edges={land ? 'tb' : 'lr'} rot={good ? 1.4 : -1.6} at={at} from={land ? (good ? 'right' : 'left') : good ? 'right' : 'left'}>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 50px' }}>
        <div style={{ position: 'absolute', top: land ? 40 : 26, left: 40 }}><Tag text={side.label} at={at + 4} size={26} rot={good ? 2 : -2} color={good ? C.ochre : C.paper2} /></div>
        <div style={{ position: 'relative', display: 'inline-block', marginTop: land ? 30 : 46 }}>
          <span style={{ fontFamily: F.serif, fontWeight: 700, fontSize: lang === 'ko' ? (land ? 84 : 76) : 70, color: good ? C.ink : C.ink2, lineHeight: 1.2, textAlign: 'center', display: 'block', wordBreak: 'keep-all', maxWidth: W - 140 }}>{side.text}</span>
          {good ? <MarkerCircle at={at + 12} seed={index + 4} padX={0.06} padY={0.22} /> : <MarkerCross at={at + 10} seed={index} />}
        </div>
      </div>
    </Paper>
  );
  return (
    <AbsoluteFill>
      <Bg />
      <Center>
        <div style={{ position: 'relative', display: 'flex', flexDirection: land ? 'row' : 'column', alignItems: 'center', gap: land ? 60 : 60 }}>
          {card(v.left!, false, 0)}
          <div style={{ position: 'absolute', left: '50%', top: '50%', width: 150, height: 150, marginLeft: -75, marginTop: -75, zIndex: 6 }}>
            <RedDisc size={150} at={8} style={{ left: 0, top: 0 }} />
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F.serif, fontWeight: 700, fontSize: 60, color: C.card, opacity: step(useCurrentFrame()) > 12 ? 1 : 0 }}>vs</div>
          </div>
          {card(v.right!, true, 10)}
        </div>
      </Center>
      <Sfx name="tick" at={0} volume={0.18} /><Sfx name="tick" at={10} volume={0.18} /><Sfx name="check" at={22} volume={0.2} />
    </AbsoluteFill>
  );
};

/** 타임라인: 세로로 그은 손그림 선 + 빨간 핀 + 꼬리표 */
const Timeline: React.FC<P> = ({ scene, index, durationInFrames }) => {
  const v = scene.visual;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const land = useLandscape();
  const items = (v.items || []) as { label: string; text: string }[];
  const at = revealFrames(scene, items.map(i => i.text || i.label), fps, durationInFrames);
  const rowH = land ? 150 : 190, Ht = rowH * items.length, W = land ? 1200 : 900;
  const d = handLine(70, 0, 74, Ht, index, Math.floor(frame / 4), 0.01);
  const draw = clamp01(step(frame) / Math.max(8, (at[at.length - 1] || 20) + 6));
  return (
    <AbsoluteFill>
      <Bg grid />
      <Center>
        <Title text={v.title} />
        <div style={{ position: 'relative', width: W, height: Ht }}>
          <svg style={{ position: 'absolute', left: 0, top: 0, width: W, height: Ht, overflow: 'visible' }}>
            <path d={d} pathLength={1} fill="none" stroke={C.ink} strokeWidth={6} strokeLinecap="round" strokeDasharray="1 1" strokeDashoffset={1 - draw} />
          </svg>
          {items.map((it, i) => {
            const e = place(clamp01((step(frame) - at[i]) / 9));
            return (
              <div key={i} style={{ position: 'absolute', left: 0, top: i * rowH + rowH * 0.5 - 50, display: 'flex', alignItems: 'center', gap: 34, opacity: e > 0 ? 1 : 0 }}>
                <div style={{ width: 44, height: 44, marginLeft: 50, borderRadius: '50%', background: C.red, transform: `scale(${e})`, boxShadow: '4px 5px 0 rgba(40,28,14,0.2)', flex: 'none' }} />
                <Tag text={it.label} at={at[i]} size={land ? 28 : 32} rot={i % 2 ? 2 : -2} color={i % 2 ? C.card : C.ochre} seed={i + 2} />
                <span style={{ fontFamily: F.serif, fontWeight: 700, fontSize: land ? 50 : 52, color: C.ink, lineHeight: 1.2, wordBreak: 'keep-all', maxWidth: W - 420, transform: `translateX(${(1 - e) * 60}px)` }}>{it.text}</span>
              </div>
            );
          })}
        </div>
      </Center>
      {at.map((f, i) => <Sfx key={i} name="tick" at={f} volume={0.2} />)}
    </AbsoluteFill>
  );
};

const IconGrid: React.FC<P> = ({ scene, index, durationInFrames, category }) => {
  const v = scene.visual;
  const { fps } = useVideoConfig();
  const land = useLandscape();
  const items = (v.items || []) as { emoji?: string; label: string }[];
  const at = revealFrames(scene, items.map(i => i.label), fps, durationInFrames);
  const cols = land ? Math.min(4, items.length) : items.length === 3 ? 3 : 2;
  const cell = land ? 340 : cols === 3 ? 280 : 400;
  return (
    <AbsoluteFill>
      <Bg />
      <Center>
        <Title text={v.title} />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 30, justifyContent: 'center', width: cols * cell + (cols - 1) * 30 }}>
          {items.map((it, i) => {
            const I = iconFor(it.emoji, category);
            const tone = [C.card, '#ead9b8', '#f3e6cf', C.card][i % 4];
            return (
              <Paper key={i} w={cell} h={cell * (cols === 3 ? 1.15 : 0.95)} color={tone} seed={index * 9 + i} edges="tblr" amp={5} rot={(rnd(index + i * 3) - 0.5) * 5} at={at[i]}>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, padding: 20 }}>
                  <div style={{ width: cell * 0.46, height: cell * 0.46, borderRadius: '50%', background: i % 2 ? C.blue : C.red, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <I size={cell * 0.26} color={C.card} strokeWidth={2.2} />
                  </div>
                  <div style={{ fontFamily: F.sans, fontWeight: 800, fontSize: cols === 3 ? 42 : 50, color: C.ink, textAlign: 'center', wordBreak: 'keep-all', lineHeight: 1.15 }}>{it.label}</div>
                </div>
              </Paper>
            );
          })}
        </div>
      </Center>
      {at.map((f, i) => <Sfx key={i} name="tick" at={f} volume={0.2} />)}
    </AbsoluteFill>
  );
};

const Icon: React.FC<P> = ({ scene, index, lang, category }) => {
  const v = scene.visual;
  const land = useLandscape();
  const I = iconFor(v.emoji, category);
  const D = land ? 440 : 520;
  const hl = hlList(v);
  const words = (v.text || '').split(/\s+/).filter(Boolean);
  return (
    <AbsoluteFill>
      <Bg />
      <Center>
        <div style={{ position: 'relative', width: D, height: D, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 50 }}>
          <RedDisc size={D} style={{ left: 0, top: 0 }} />
          <div style={{ position: 'relative', transform: `scale(${place(clamp01((step(useCurrentFrame()) - 6) / 10))})` }}><I size={D * 0.5} color={C.card} strokeWidth={1.9} /></div>
          <Tape x={D * 0.82} y={D * 0.12} rot={28} seed={index} />
        </div>
        <Strip at={10} seed={index + 2} rot={-1.2} pad="8px 34px 14px">
          <span style={{ fontFamily: F.serif, fontWeight: 700, fontSize: lang === 'ko' ? 90 : 80, color: C.ink, letterSpacing: -2, wordBreak: 'keep-all' }}>
            {words.map((w, k) => <React.Fragment key={k}>{k > 0 && ' '}{isHl(w, hl) ? <Marked at={18} seed={k} circle={false}>{w}</Marked> : w}</React.Fragment>)}
          </span>
        </Strip>
      </Center>
      <Sfx name="pop" at={6} volume={0.2} /><Sfx name="tick" at={10} volume={0.18} />
    </AbsoluteFill>
  );
};

/** 인용: 신문에서 오려 낸 조각 + 큰 빨간 따옴표 */
const Quote: React.FC<P> = ({ scene, index, lang, durationInFrames }) => {
  const v = scene.visual;
  const frame = step(useCurrentFrame());
  const land = useLandscape();
  const words = (v.text || '').split(/\s+/).filter(Boolean);
  const size = lang === 'ko' ? ((v.text || '').length > 24 ? 70 : 84) : 74;
  const per = Math.max(2, Math.min(5, (durationInFrames * 0.45) / Math.max(1, words.length)));
  return (
    <AbsoluteFill>
      <Bg />
      <Center>
        <div style={{ position: 'relative', filter: 'drop-shadow(8px 10px 0 rgba(40,28,14,0.2))', transform: `rotate(-1.4deg) scale(${place(clamp01(frame / 10)) * 0.1 + 0.9})` }}>
          <div style={{ position: 'absolute', inset: 0, background: C.card, clipPath: tornPct(index + 1, 12, 1.4) }} />
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(0deg, rgba(28,26,23,0.04) 0 2px, transparent 2px 9px)', clipPath: tornPct(index + 1, 12, 1.4) }} />
          <div style={{ position: 'relative', padding: land ? '80px 110px 70px' : '90px 70px 70px', maxWidth: land ? 1400 : 920 }}>
            <div style={{ position: 'absolute', left: land ? 30 : 16, top: -70, fontFamily: F.serif, fontWeight: 700, fontSize: 260, lineHeight: 1, color: C.red }}>“</div>
            <div style={{ fontFamily: F.serif, fontWeight: 700, fontSize: size, lineHeight: 1.4, color: C.ink, wordBreak: 'keep-all' }}>
              {words.map((w, i) => <span key={i} style={{ opacity: frame >= 6 + i * per ? 1 : 0 }}>{w} </span>)}
            </div>
            {v.author && <div style={{ marginTop: 34, textAlign: 'right' }}><Tag text={'— ' + v.author} at={10 + words.length * per} size={32} rot={-1} color={C.ochre} /></div>}
          </div>
        </div>
      </Center>
      <Sfx name="tick" at={0} volume={0.18} />
    </AbsoluteFill>
  );
};

/** 성경: 바랜 크라프트지 + 빨간 도장 */
const Scripture: React.FC<P> = ({ scene, index, lang, durationInFrames }) => {
  const v = scene.visual;
  const frame = step(useCurrentFrame());
  const land = useLandscape();
  const words = (v.text || '').split(/\s+/).filter(Boolean);
  const per = Math.max(2, Math.min(6, (durationInFrames * 0.5) / Math.max(1, words.length)));
  const stampAt = 8 + words.length * per;
  const se = place(clamp01((frame - stampAt) / 6));
  return (
    <AbsoluteFill>
      <Bg tone="#e8dcc2" />
      <Center>
        <div style={{ position: 'relative', filter: 'drop-shadow(8px 10px 0 rgba(40,28,14,0.18))', transform: 'rotate(0.8deg)' }}>
          <div style={{ position: 'absolute', inset: 0, background: '#dcc59b', clipPath: tornPct(index + 4, 12, 1.6) }} />
          <div style={{ position: 'relative', padding: land ? '90px 120px' : '100px 70px', maxWidth: land ? 1400 : 920 }}>
            <div style={{ fontFamily: F.serif, fontWeight: 700, fontSize: lang === 'ko' ? 70 : 62, lineHeight: 1.5, color: C.ink, textAlign: 'center', wordBreak: 'keep-all' }}>
              {words.map((w, i) => <span key={i} style={{ opacity: frame >= 6 + i * per ? 1 : 0 }}>{w} </span>)}
            </div>
            {v.author && (
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: 40 }}>
                <div style={{ border: `5px solid ${C.red}`, borderRadius: 8, padding: '8px 26px', fontFamily: F.mono, fontWeight: 700, fontSize: 46, color: C.red, letterSpacing: 4, transform: `rotate(-6deg) scale(${1.6 - 0.6 * se})`, opacity: se > 0 ? 0.9 : 0, mixBlendMode: 'multiply' }}>{v.author}</div>
              </div>
            )}
          </div>
        </div>
      </Center>
      <Sfx name="chime" at={2} volume={0.2} /><Sfx name="pop" at={stampAt} volume={0.22} />
    </AbsoluteFill>
  );
};

/** 이미지: 테이프로 붙인 인화 사진 + 뒤에서 빼꼼 나온 빨간 원 + 글자 띠 */
const ImageScene: React.FC<P> = ({ scene, index, lang, durationInFrames }) => {
  const v = scene.visual;
  const land = useLandscape();
  const W = land ? 1450 : 920, H = land ? 800 : 1000;
  const hl = hlList(v);
  const words = (v.text || '').split(/\s+/).filter(Boolean);
  const right = index % 2 === 0;
  return (
    <AbsoluteFill>
      <Bg />
      <Center>
        <div style={{ position: 'relative', width: W, height: H }}>
          <RedDisc size={land ? 460 : 420} at={0} style={{ [right ? 'right' : 'left']: -110, top: -90 }} />
          <Print src={v.src!} video={v.video} videoStart={v.videoStart} w={W} h={H} dur={durationInFrames} rot={right ? -1.6 : 1.4} at={2} seed={index + 1} from={right ? 'right' : 'left'} />
          {words.length > 0 && (
            <div style={{ position: 'absolute', left: right ? -20 : undefined, right: right ? undefined : -20, bottom: land ? 40 : 70, zIndex: 7 }}>
              <Strip at={12} seed={index + 9} rot={right ? -3 : 3} pad="6px 30px 12px">
                <span style={{ fontFamily: F.serif, fontWeight: 700, fontSize: land ? 80 : lang === 'ko' ? 84 : 74, color: C.ink, letterSpacing: -2, whiteSpace: 'nowrap' }}>
                  {words.map((w, k) => <React.Fragment key={k}>{k > 0 && ' '}{isHl(w, hl) ? <Marked at={20} seed={index + k} circle={false}>{w}</Marked> : w}</React.Fragment>)}
                </span>
              </Strip>
            </div>
          )}
        </div>
      </Center>
      <Sfx name="tick" at={2} volume={0.18} />
    </AbsoluteFill>
  );
};

const Outro: React.FC<P> = ({ scene, index, lang }) => {
  const v = scene.visual;
  const land = useLandscape();
  const D = land ? 620 : 760;
  const size = lang === 'ko' ? ((v.text || '').length > 10 ? 76 : 96) : 80;
  return (
    <AbsoluteFill>
      <Bg />
      <Center>
        <div style={{ position: 'relative', width: D, height: D, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <RedDisc size={D} style={{ left: 0, top: 0 }} />
          <div style={{ position: 'relative', fontFamily: F.serif, fontWeight: 700, fontSize: size, lineHeight: 1.25, color: C.card, textAlign: 'center', padding: '0 80px', wordBreak: 'keep-all', opacity: step(useCurrentFrame()) > 6 ? 1 : 0 }}>{v.text}</div>
          <div style={{ position: 'relative', marginTop: 30 }}><Tag text="NEXT YOU GLOBAL" at={12} size={26} color={C.card} rot={-2} /></div>
        </div>
        {v.cta && (
          <div style={{ position: 'relative', marginTop: 50 }}>
            <HandArrow x1={-130} y1={-40} x2={-30} y2={20} at={24} seed={index} />
            <Strip at={18} seed={index + 3} color={C.ochre} rot={2} pad="10px 34px 14px">
              <span style={{ fontFamily: F.sans, fontWeight: 900, fontSize: 48, color: C.ink }}>{v.cta}</span>
            </Strip>
          </div>
        )}
      </Center>
      <Sfx name="swell" at={0} volume={0.2} /><Sfx name="pop" at={18} volume={0.24} />
    </AbsoluteFill>
  );
};

const Chapter: React.FC<P> = ({ scene, index, lang }) => {
  const v = scene.visual;
  return (
    <AbsoluteFill>
      <Bg />
      <Center>
        <div style={{ marginBottom: 20 }}><Tag text="CHAPTER" at={0} size={30} rot={-2} color={C.ochre} /></div>
        <div style={{ position: 'relative', fontFamily: F.serif, fontWeight: 700, fontSize: 340, lineHeight: 1, color: C.ink }}>
          {pad2(v.number || 1)}
          <MarkerCircle at={6} seed={index} padX={0.14} padY={0.08} width={9} />
        </div>
        <div style={{ marginTop: 40 }}>
          <Strip at={10} seed={index + 1} rot={-1.4} pad="8px 34px 14px">
            <span style={{ fontFamily: F.serif, fontWeight: 700, fontSize: lang === 'ko' ? 90 : 80, color: C.ink, letterSpacing: -2, wordBreak: 'keep-all' }}>{v.title || v.text}</span>
          </Strip>
        </div>
      </Center>
      <Sfx name="chime" at={0} volume={0.24} />
    </AbsoluteFill>
  );
};

const ED_TEMPLATES: Partial<Record<string, React.FC<P>>> = {
  headline: Headline, stat: Stat, chart: Chart, list: (p) => <Cards {...p} />, checklist: (p) => <Cards {...p} check />,
  compare: Compare, timeline: Timeline, iconGrid: IconGrid, icon: Icon, quote: Quote, scripture: Scripture, image: ImageScene, outro: Outro, chapter: Chapter,
};

/** 전환: 새 종이가 아래에서 밀려 올라오거나, 찢으며 넘어간다 (스톱모션 6프레임) */
export const EditorialSceneView: React.FC<P> = (p) => {
  const frame = step(useCurrentFrame());
  const type = p.scene.visual.type;
  const T = (ED_TEMPLATES[type] || (TEMPLATES as any)[type]) as React.FC<P>;
  const kind = p.index === 0 ? 'none' : p.index % 2 ? 'tear' : 'slide';
  const w = clamp01(frame / 6);
  const v: any = p.scene.visual;
  let style: React.CSSProperties = {};
  if (kind === 'tear' && w < 1) style = { clipPath: tearClip(w, p.index) };
  if (kind === 'slide' && w < 1) style = { transform: `translateY(${(1 - place(w)) * 100}%) rotate(${(1 - w) * 2}deg)`, boxShadow: '0 -20px 40px rgba(40,28,14,0.3)' };
  return (
    <AbsoluteFill style={style}>
      <BgCtx.Provider value={{ src: v.bgSrc && type !== 'image' && type !== 'chapter' ? v.bgSrc : undefined, video: v.bgSrc && type !== 'image' && type !== 'chapter' ? v.bgVideo : undefined, videoStart: v.bgVideoStart, dur: p.durationInFrames, index: p.index }}><T {...p} /></BgCtx.Provider>
      {p.index > 0 && <Sfx name="whoosh" at={0} volume={0.12} />}
    </AbsoluteFill>
  );
};

/** 테두리: 종이 결 + 잡지 머리글(쪽 번호) + 아래 자 모양 진행선 */
export const EditorialChrome: React.FC<{ index: number; count: number }> = ({ index, count }) => {
  const frame = useCurrentFrame();
  const { width: W, height: H, durationInFrames } = useVideoConfig();
  const land = W > H;
  const top = land ? 34 : 150, m = land ? 50 : 60, bot = land ? H - 40 : H - 70;
  const mono = (s: string, size: number) => <span style={{ fontFamily: F.mono, fontWeight: 700, fontSize: size, letterSpacing: size * 0.18, color: C.ink, opacity: 0.72 }}>{s}</span>;
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <Grain />
      <div style={{ position: 'absolute', left: m, right: m, top, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `2px solid rgba(28,26,23,0.45)`, paddingBottom: 10 }}>
        {mono('NEXT YOU · JOURNAL', land ? 18 : 22)}
        {mono(`NO. ${pad2(index + 1)} / ${pad2(count)}`, land ? 18 : 22)}
      </div>
      <div style={{ position: 'absolute', left: m, right: m, top: bot, height: 14, borderTop: `2px solid rgba(28,26,23,0.4)` }}>
        {Array.from({ length: 21 }, (_, k) => <div key={k} style={{ position: 'absolute', left: `${k * 5}%`, top: 0, width: 2, height: k % 5 ? 7 : 14, background: 'rgba(28,26,23,0.4)' }} />)}
        <div style={{ position: 'absolute', left: `calc(${(frame / durationInFrames) * 100}% - 9px)`, top: -10, width: 18, height: 18, borderRadius: '50%', background: C.red }} />
      </div>
    </AbsoluteFill>
  );
};

/** 자막: 오려 붙인 크림색 띠, 지금 단어에 형광펜 */
export const EditorialCaptions: React.FC<{ captions: Caption[]; lang: string }> = ({ captions, lang }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const land = width > height;
  const t = frame / fps;
  const idx = captions.findIndex(c => t >= c.start - 0.05 && t < c.end);
  if (idx < 0) return null;
  const cur = captions[idx];
  const size = land ? (lang === 'ko' ? 54 : 50) : (lang === 'ko' ? 66 : 60);
  const e = place(clamp01((step(frame) - Math.round(cur.start * fps)) / 6));
  return (
    <AbsoluteFill style={{ justifyContent: 'flex-start', alignItems: 'center', top: land ? 905 : 1310 }}>
      <div style={{ position: 'relative', display: 'inline-block', maxWidth: land ? 1500 : 960, transform: `rotate(${idx % 2 ? 0.8 : -0.8}deg) scale(${0.92 + 0.08 * e})`, filter: 'drop-shadow(5px 7px 0 rgba(40,28,14,0.22))' }}>
        <div style={{ position: 'absolute', inset: 0, background: C.card, clipPath: tornLR(idx + 1) }} />
        <div style={{ position: 'relative', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', padding: '10px 34px 14px' }}>
          {cur.words.map((w, i) => {
            const active = t >= w.start - 0.03 && t < w.end + 0.08;
            return (
              <span key={i} style={{ position: 'relative', zIndex: 0, fontFamily: F.sans, fontWeight: 900, fontSize: size, lineHeight: 1.3, margin: '0 8px', color: active ? C.red : C.ink }}>
                {active && <span style={{ position: 'absolute', left: -6, right: -6, bottom: '8%', height: '38%', background: C.ochre, opacity: 0.55, zIndex: -1, transform: 'rotate(-1deg)' }} />}
                {w.text}
              </span>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
