import React from 'react';
import { AbsoluteFill, Img, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { resolveSrc } from '../assets';
import { SceneBg, hasBg } from '../SceneBg';
import { Center, P, Sfx, TEMPLATES, counterProgress, counterTiming, fmt, iconFor, revealFrames, useLandscape } from '../scenes';
import { Typewriter } from '../glyph/text';
import { Mono, SplitFlap, Statement, TagCard, TrackBox } from './parts';
import { codeFor } from './chrome';
import { F, H, clamp01, easeOut, hash, pad2 } from './util';

const sizeFor = (len: number, lang: string) => lang === 'ko' ? (len > 22 ? 92 : len > 12 ? 112 : 132) : (len > 34 ? 84 : len > 18 ? 100 : 118);

/** 장면 위쪽 작은 코드 줄: 'NOTE · 03 ──────' */
const Kick: React.FC<{ text: string; start?: number; color?: string }> = ({ text, start = 0, color = H.ink2 }) => {
  const frame = useCurrentFrame();
  const e = easeOut((frame - start) / 14);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 18, width: '100%', marginBottom: 34, opacity: e }}>
      <div style={{ width: 14, height: 14, background: H.accent }} />
      <Mono size={26} color={color}>{text}</Mono>
      <div style={{ flex: 1, height: 2, background: color, opacity: 0.4, transformOrigin: 'left', transform: `scaleX(${e})` }} />
    </div>
  );
};

const Block: React.FC<{ children: React.ReactNode; width?: number }> = ({ children, width }) => {
  const land = useLandscape();
  return <div style={{ width: width || (land ? 1500 : 940), display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>{children}</div>;
};

/** 기술 도면처럼 그린 아이콘: 눈금 원 + 선 아이콘 + 지시선 라벨 */
const Diagram: React.FC<{ emoji?: string; category?: string; size: number; labels?: string[]; start?: number }> = ({ emoji, category, size, labels = [], start = 0 }) => {
  const frame = useCurrentFrame();
  const Icon = iconFor(emoji, category);
  const e = easeOut((frame - start) / 16);
  const r = size / 2;
  const angles = [-50, 25, 155, 210];
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
        <circle cx={r} cy={r} r={r * 0.92} fill="none" stroke={H.ink} strokeOpacity={0.55} strokeWidth={1.5} strokeDasharray={`${2 * Math.PI * r * 0.92 * e} 9999`} transform={`rotate(-90 ${r} ${r})`} />
        <circle cx={r} cy={r} r={r * 0.62} fill="none" stroke={H.ink} strokeOpacity={0.25} strokeWidth={1} strokeDasharray="4 8" transform={`rotate(${frame * 0.4} ${r} ${r})`} />
        {Array.from({ length: 72 }, (_, k) => {
          const a = (k / 72) * Math.PI * 2, l = k % 6 === 0 ? 18 : 8;
          if (k / 72 > e) return null;
          return <line key={k} x1={r + Math.cos(a) * r * 0.92} y1={r + Math.sin(a) * r * 0.92} x2={r + Math.cos(a) * (r * 0.92 - l)} y2={r + Math.sin(a) * (r * 0.92 - l)} stroke={H.ink} strokeOpacity={0.6} strokeWidth={1.5} />;
        })}
        {labels.slice(0, 4).map((_, i) => {
          const a = (angles[i] * Math.PI) / 180;
          const le = easeOut((frame - start - 14 - i * 6) / 10);
          return <line key={i} x1={r + Math.cos(a) * r * 0.5} y1={r + Math.sin(a) * r * 0.5} x2={r + Math.cos(a) * r * (0.5 + 0.62 * le)} y2={r + Math.sin(a) * r * (0.5 + 0.62 * le)} stroke={H.accent} strokeWidth={2} />;
        })}
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${0.8 + 0.2 * e})`, opacity: e }}>
        <Icon size={size * 0.4} color={H.ink} strokeWidth={1.4} />
      </div>
      {labels.slice(0, 4).map((t, i) => {
        const a = (angles[i] * Math.PI) / 180;
        const le = easeOut((frame - start - 20 - i * 6) / 8);
        const x = r + Math.cos(a) * r * 1.14, y = r + Math.sin(a) * r * 1.14;
        const rightSide = Math.cos(a) >= 0;
        return (
          <div key={i} style={{ position: 'absolute', left: x, top: y, transform: `translate(${rightSide ? '0' : '-100%'}, -50%)`, padding: '6px 12px', background: H.card, border: `1.5px solid ${H.ink}`, opacity: le, whiteSpace: 'nowrap' }}>
            <span style={{ fontFamily: F.sans, fontWeight: 700, fontSize: 34, color: H.ink }}>{t}</span>
          </div>
        );
      })}
    </div>
  );
};

const Headline: React.FC<P> = ({ scene, lang, category, index }) => {
  const v = scene.visual;
  const frame = useCurrentFrame();
  const land = useLandscape();
  const text = v.text || '';
  if (v.type === 'icon') {
    const words = text.split(/\s+/).filter(Boolean);
    return (
      <Center>
        <Diagram emoji={v.emoji} category={category} size={land ? 520 : 600} labels={words.length > 1 ? words.slice(0, 3) : []} />
        <div style={{ marginTop: 70 }}><Statement text={text} highlight={v.highlight} size={lang === 'ko' ? 84 : 76} align="center" start={16} /></div>
      </Center>
    );
  }
  // 첫 장면: 강조 단어를 화면 폭을 넘치게 크게 (참고 영상의 'BACK!' 'PROOFS')
  const hero = index === 0 ? ((v.highlight && v.highlight[0]) || text.split(/\s+/)[0] || '') : '';
  const heroE = easeOut(frame / 14);
  return (
    <Center>
      {hero && (
        <div style={{ position: 'absolute', left: land ? 40 : -20, top: land ? 40 : 30, fontFamily: F.cond, fontSize: land ? 300 : 300, lineHeight: 0.9, color: H.ink, whiteSpace: 'nowrap', letterSpacing: interpolate(heroE, [0, 1], [40, -4]), opacity: heroE, transform: `translateX(${(1 - heroE) * -120}px)` }}>{hero}</div>
      )}
      <Block>
        {hero && <div style={{ height: land ? 260 : 320 }} />}
        <Kick text={codeFor(v.type, index)} />
        {hero && hero.replace(/\s+/g, '') === text.replace(/\s+/g, '')
          ? <div style={{ display: 'flex', alignItems: 'center', gap: 20, opacity: easeOut((frame - 12) / 10) }}><div style={{ width: 120, height: 10, background: H.accent }} /><Mono size={30} color={H.ink}>KEY PHRASE · {pad2(text.length)} CHR</Mono></div>
          : <Statement text={text} highlight={v.highlight} size={sizeFor(text.length, lang)} start={hero ? 10 : 4} maxWidth={land ? 1500 : 940} />}
        {v.emoji && !hero && <div style={{ marginTop: 60, alignSelf: 'flex-end' }}><Diagram emoji={v.emoji} category={category} size={260} start={10} /></div>}
      </Block>
    </Center>
  );
};

const Stat: React.FC<P> = ({ scene, lang, durationInFrames, index }) => {
  const v = scene.visual;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const land = useLandscape();
  const target = v.value || 0;
  const tm = counterTiming(scene, target, fps, durationInFrames);
  const p = counterProgress(frame, tm);
  const digits = fmt(target, v.decimals || 0, lang);
  const n = [...digits].length;
  const stagger = 3, spin = 10;
  // 마지막 타일이 나레이션이 숫자를 말할 때 멈추도록 시작 시점을 거꾸로 잡는다
  const flapStart = Math.max(2, tm.endF - spin - (n - 1) * stagger);
  const size = n > 7 ? 120 : n > 4 ? 160 : 210;
  const segs = 20;
  return (
    <Center>
      <Block>
        <Kick text={`${codeFor('stat', index)}${v.label ? ' — ' : ''}`} />
        {v.label && <div style={{ fontFamily: F.sans, fontWeight: 800, fontSize: 60, color: H.ink, marginBottom: 40, wordBreak: 'keep-all' }}>{v.label}</div>}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 24, flexWrap: 'wrap' }}>
          {v.prefix && <span style={{ fontFamily: F.sans, fontWeight: 800, fontSize: size * 0.5, color: H.ink }}>{v.prefix}</span>}
          <SplitFlap text={digits} start={flapStart} size={size} stagger={stagger} spin={spin} />
          {v.suffix && <span style={{ fontFamily: F.sans, fontWeight: 800, fontSize: size * 0.42, color: H.accent, marginBottom: size * 0.1 }}>{v.suffix}</span>}
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 44, width: land ? 1000 : 900 }}>
          {Array.from({ length: segs }, (_, k) => <div key={k} style={{ flex: 1, height: 30, background: (k + 1) / segs <= p ? H.accent : 'rgba(19,19,19,0.12)' }} />)}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', width: land ? 1000 : 900, marginTop: 10 }}>
          <Mono size={22}>0</Mono><Mono size={22}>{Math.round(p * 100)}%</Mono>
        </div>
        {v.sub && <div style={{ marginTop: 36 }}><Typewriter text={v.sub} start={tm.endF - 4} speed={1} cursor={false} style={{ fontFamily: F.mono, fontWeight: 700, fontSize: 36, color: H.ink2 }} /></div>}
      </Block>
      {Array.from({ length: n }, (_, k) => <Sfx key={k} name="tick" at={flapStart + k * stagger + spin} volume={0.14} />)}
      <Sfx name="pop" at={tm.endF} volume={0.24} />
    </Center>
  );
};

const Chart: React.FC<P> = ({ scene, lang, durationInFrames, index }) => {
  const v = scene.visual;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const land = useLandscape();
  const items = (v.items || []) as { label: string; value: number }[];
  const max = Math.max(...items.map(i => i.value), 1);
  const top = items.reduce((b, it, i) => (it.value > items[b].value ? i : b), 0);
  const at = revealFrames(scene, items.map(i => i.label), fps, durationInFrames);
  return (
    <Center>
      <TagCard code={codeFor('chart', index)} stamp={v.unit ? `UNIT · ${v.unit}` : undefined} title={v.title} width={land ? 1300 : 940} seed={index + 3}>
        {items.map((it, i) => {
          const e = easeOut((frame - at[i]) / 16);
          return (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '170px 1fr 170px', alignItems: 'center', gap: 20, padding: '14px 0', borderBottom: `1px dashed ${H.line}`, opacity: Math.min(1, e * 2) }}>
              <span style={{ fontFamily: F.sans, fontWeight: 700, fontSize: 40, color: H.ink }}>{it.label}</span>
              <div style={{ height: 26, background: 'rgba(19,19,19,0.08)' }}><div style={{ height: '100%', width: `${Math.max(0.03, it.value / max) * 100 * e}%`, background: i === top ? H.accent : H.ink }} /></div>
              <span style={{ fontFamily: F.mono, fontWeight: 700, fontSize: 36, color: i === top ? H.accent : H.ink, textAlign: 'right' }}>{fmt(it.value * e, Math.min(2, (String(it.value).split('.')[1] || '').length), lang)}{v.unit}</span>
            </div>
          );
        })}
      </TagCard>
      {at.map((f, i) => <Sfx key={i} name="pop" at={f} volume={0.18} />)}
    </Center>
  );
};

/** 리스트 / 체크리스트: 옷 태그 카드의 줄. 체크리스트는 칸에 주황 X가 그어진다 */
const ListCard: React.FC<P & { check?: boolean }> = ({ scene, durationInFrames, index, check }) => {
  const v = scene.visual;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const land = useLandscape();
  const items = (v.items || []) as string[];
  const at = revealFrames(scene, items, fps, durationInFrames);
  return (
    <Center>
      <TagCard code={codeFor(check ? 'checklist' : 'list', index)} stamp={`${items.length} ITEMS`} title={v.title} width={land ? 1200 : 940} seed={index + 7}>
        {items.map((it, i) => {
          const e = easeOut((frame - at[i] + (check ? 10 : 0)) / 12);
          const done = frame >= at[i];
          const cur = done && (i === items.length - 1 || frame < at[i + 1]);
          const x = clamp01((frame - at[i]) / 6);
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 26, padding: '18px 0', borderBottom: `1px dashed ${H.line}`, opacity: check ? Math.max(0.3, e) : e, transform: `translateX(${(1 - e) * 30}px)` }}>
              {check ? (
                <svg width={58} height={58}><rect x={2} y={2} width={54} height={54} fill="none" stroke={H.ink} strokeWidth={3} />
                  <line x1={10} y1={10} x2={10 + 38 * x} y2={10 + 38 * x} stroke={H.accent} strokeWidth={6} />
                  <line x1={48} y1={10} x2={48 - 38 * clamp01(x * 2 - 1)} y2={10 + 38 * clamp01(x * 2 - 1)} stroke={H.accent} strokeWidth={6} /></svg>
              ) : (
                <Mono size={34} color={cur ? H.accent : H.ink}>{pad2(i + 1)}</Mono>
              )}
              <span style={{ fontFamily: F.sans, fontWeight: 800, fontSize: 52, color: H.ink, wordBreak: 'keep-all', flex: 1 }}>{it}</span>
              {cur && !check && <div style={{ width: 18, height: 18, background: H.accent }} />}
            </div>
          );
        })}
      </TagCard>
      {at.map((f, i) => <Sfx key={i} name={check ? 'check' : 'pop'} at={f} volume={0.22} />)}
    </Center>
  );
};

const Compare: React.FC<P> = ({ scene, index }) => {
  const v = scene.visual;
  const frame = useCurrentFrame();
  const land = useLandscape();
  const strike = easeOut((frame - 22) / 10);
  const right = easeOut((frame - 30) / 12);
  const row = (side: { label: string; text: string }, good: boolean) => (
    <div style={{ padding: '22px 0', borderBottom: `1px dashed ${H.line}`, opacity: good ? right : 1 }}>
      <div><Mono size={26} color={good ? H.accent : H.ink2}>{good ? '▲ ' : '▼ '}{side.label}</Mono></div>
      <div style={{ position: 'relative', display: 'inline-block', marginTop: 10 }}>
        <span style={{ fontFamily: F.sans, fontWeight: 800, fontSize: 60, color: good ? H.ink : 'rgba(19,19,19,0.5)', wordBreak: 'keep-all' }}>{side.text}</span>
        {!good && <div style={{ position: 'absolute', left: -6, right: -6, top: '54%', height: 6, background: H.accent, transformOrigin: 'left', transform: `scaleX(${strike})` }} />}
      </div>
    </div>
  );
  return (
    <Center>
      <TagCard code={codeFor('compare', index)} stamp="REVISED" title={v.title} width={land ? 1200 : 940} seed={index + 11}>
        {row(v.left!, false)}
        {row(v.right!, true)}
      </TagCard>
      <Sfx name="check" at={30} volume={0.2} />
    </Center>
  );
};

/** 타임라인: 달력 칸처럼 칸이 늘어서고, 지나간 칸은 X, 지금 칸은 주황 */
const Timeline: React.FC<P> = ({ scene, durationInFrames, index }) => {
  const v = scene.visual;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const land = useLandscape();
  const items = (v.items || []) as { label: string; text: string }[];
  const at = revealFrames(scene, items.map(i => i.text || i.label), fps, durationInFrames);
  const curIdx = at.reduce((c, f, i) => (frame >= f ? i : c), -1);
  return (
    <Center>
      <Block width={land ? 1500 : 960}>
        <Kick text={codeFor('timeline', index)} />
        {v.title && <div style={{ fontFamily: F.sans, fontWeight: 800, fontSize: 64, color: H.ink, marginBottom: 40 }}>{v.title}</div>}
        <div style={{ display: 'flex', gap: 12, width: '100%' }}>
          {items.map((it, i) => {
            const e = easeOut((frame - at[i] + 6) / 10);
            const past = i < curIdx, cur = i === curIdx;
            return (
              <div key={i} style={{ flex: 1, opacity: Math.max(0.25, e) }}>
                <div style={{ position: 'relative', height: 90, border: `2px solid ${H.ink}`, background: cur ? H.accent : H.card, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontFamily: F.mono, fontWeight: 700, fontSize: 34, color: cur ? '#fff' : H.ink }}>{it.label}</span>
                  {past && <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0 }} preserveAspectRatio="none" viewBox="0 0 100 100"><line x1={8} y1={12} x2={92} y2={88} stroke={H.accent} strokeWidth={4} /><line x1={92} y1={12} x2={8} y2={88} stroke={H.accent} strokeWidth={4} /></svg>}
                </div>
                <div style={{ marginTop: 18, fontFamily: F.sans, fontWeight: 700, fontSize: items.length > 3 ? 34 : 40, color: cur ? H.ink : H.ink2, lineHeight: 1.25, wordBreak: 'keep-all', opacity: e }}>{it.text}</div>
              </div>
            );
          })}
        </div>
      </Block>
      {at.map((f, i) => <Sfx key={i} name="pop" at={f} volume={0.22} />)}
    </Center>
  );
};

const IconGrid: React.FC<P> = ({ scene, durationInFrames, index, category }) => {
  const v = scene.visual;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const items = (v.items || []) as { emoji?: string; label: string }[];
  const at = revealFrames(scene, items.map(i => i.label), fps, durationInFrames);
  const cols = items.length === 3 ? 3 : 2;
  const cell = cols === 3 ? 290 : 440;
  return (
    <Center>
      <Block width={cols * cell + (cols - 1) * 24}>
        <Kick text={codeFor('iconGrid', index)} />
        {v.title && <div style={{ fontFamily: F.sans, fontWeight: 800, fontSize: 60, color: H.ink, marginBottom: 36 }}>{v.title}</div>}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
          {items.map((it, i) => {
            const e = easeOut((frame - at[i]) / 12);
            const Icon = iconFor(it.emoji, category);
            return (
              <div key={i} style={{ width: cell, background: H.card, padding: '26px 22px', boxShadow: '0 16px 40px rgba(0,0,0,0.12)', opacity: e, transform: `translateY(${(1 - e) * 30}px)` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><Mono size={20}>{pad2(i + 1)}</Mono><div style={{ width: 12, height: 12, background: H.accent }} /></div>
                <div style={{ display: 'flex', justifyContent: 'center', padding: '22px 0' }}><Icon size={cols === 3 ? 96 : 120} color={H.ink} strokeWidth={1.4} /></div>
                <div style={{ fontFamily: F.sans, fontWeight: 800, fontSize: cols === 3 ? 38 : 46, color: H.ink, textAlign: 'center', wordBreak: 'keep-all' }}>{it.label}</div>
              </div>
            );
          })}
        </div>
      </Block>
      {at.map((f, i) => <Sfx key={i} name="pop" at={f} volume={0.22} />)}
    </Center>
  );
};

/** 명언: 종이 터미널 창에 타이핑 */
const Quote: React.FC<P> = ({ scene, lang, durationInFrames, index }) => {
  const v = scene.visual;
  const frame = useCurrentFrame();
  const land = useLandscape();
  const text = v.text || '';
  const n = [...text].length;
  const speed = Math.max(0.8, Math.min(2, (durationInFrames * 0.5) / Math.max(1, n)));
  const done = 8 + n * speed;
  const e = easeOut(frame / 10);
  return (
    <Center>
      <div style={{ width: land ? 1300 : 940, background: H.card, boxShadow: '0 30px 80px rgba(0,0,0,0.18)', opacity: e, transform: `translateY(${(1 - e) * 30}px)` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 26px', borderBottom: `2px solid ${H.ink}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}><div style={{ width: 16, height: 16, borderRadius: 8, background: H.accent }} /><Mono size={24} color={H.ink}>{codeFor('quote', index)} · quote.txt</Mono></div>
          <Mono size={22}>READ-ONLY</Mono>
        </div>
        <div style={{ padding: '40px 46px 44px' }}>
          <Mono size={28} color={H.accent}>{'>'} cat quote.txt</Mono>
          <div style={{ marginTop: 22 }}>
            <Typewriter text={text} start={8} speed={speed} cursorColor={H.accent} style={{ fontFamily: F.sans, fontWeight: 800, fontSize: lang === 'ko' ? (n > 30 ? 62 : 74) : 64, color: H.ink, lineHeight: 1.3, wordBreak: 'keep-all' }} />
          </div>
          {v.author && <div style={{ marginTop: 30, opacity: clamp01((frame - done) / 8) }}><Mono size={32} color={H.ink}>— {v.author}</Mono></div>}
        </div>
      </div>
    </Center>
  );
};

const Scripture: React.FC<P> = ({ scene, lang, durationInFrames, index }) => {
  const v = scene.visual;
  const frame = useCurrentFrame();
  const land = useLandscape();
  const text = v.text || '';
  const words = text.split(/\s+/);
  const per = Math.max(2, Math.min(6, (durationInFrames * 0.5) / Math.max(1, words.length)));
  const W = land ? 1300 : 920;
  return (
    <Center>
      <Kick text={codeFor('scripture', index)} />
      <div style={{ position: 'relative', width: W, padding: '70px 60px' }}>
        <TrackBox x={0} y={0} w={W} h={land ? 420 : 560} color={H.ink} jitter={false} />
        <div style={{ position: 'relative', textAlign: 'center', fontFamily: F.serif, fontWeight: 700, fontSize: lang === 'ko' ? (text.length > 40 ? 64 : 76) : 64, lineHeight: 1.45, color: H.ink, wordBreak: 'keep-all' }}>
          {words.map((w, i) => { const e = easeOut((frame - 6 - i * per) / 12); return <span key={i} style={{ display: 'inline-block', margin: '0 0.14em', opacity: e, filter: `blur(${(1 - e) * 6}px)` }}>{w}</span>; })}
        </div>
        {v.author && <div style={{ position: 'relative', marginTop: 36, textAlign: 'center' }}><Typewriter text={v.author} start={6 + words.length * per} speed={1.2} cursor={false} style={{ fontFamily: F.mono, fontWeight: 700, fontSize: 40, color: H.accent, letterSpacing: 2 }} /></div>}
      </div>
      <Sfx name="chime" at={2} volume={0.22} />
    </Center>
  );
};

/** AI 이미지: 필름 톤 + 망점 + 추적 상자 + 측정값 라벨 + 왼쪽 위 문구 */
const ImageScene: React.FC<P> = ({ scene, lang, index, durationInFrames }) => {
  const v = scene.visual;
  const frame = useCurrentFrame();
  const { width: W, height: Hh } = useVideoConfig();
  const land = W > Hh;
  const p = frame / Math.max(1, durationInFrames);
  const z = 1.04 + 0.06 * p;
  const conf = (0.9 + hash(index + Math.floor(frame / 8)) * 0.09).toFixed(2);
  const box = land ? { x: W * 0.52, y: Hh * 0.2, w: W * 0.24, h: Hh * 0.46 } : { x: W * 0.24, y: Hh * 0.3, w: W * 0.52, h: Hh * 0.26 };
  const len = (v.text || '').length;
  return (
    <AbsoluteFill style={{ background: '#0b0b0c' }}>
      <AbsoluteFill style={{ transform: `scale(${z})` }}>
        <Img src={resolveSrc(v.src)!} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'contrast(1.1) saturate(0.82) brightness(0.92)' }} />
      </AbsoluteFill>
      {/* 필름 색: 그림자 청록, 밝은 곳 살짝 따뜻하게 */}
      <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(20,40,50,0.25), rgba(40,25,10,0.12))', mixBlendMode: 'soft-light' }} />
      <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 32%, rgba(0,0,0,0) 58%, rgba(0,0,0,0.6) 100%)' }} />
      <TrackBox {...box} label={`SUBJECT · ${conf}`} start={8} />
      <div style={{ position: 'absolute', left: box.x + box.w + 24, top: box.y + box.h * 0.55, opacity: clamp01((frame - 18) / 8) }}>
        <div style={{ width: 70, height: 2, background: H.white, marginBottom: 8 }} />
        <Mono size={22} color={H.white}>LOOK {pad2(index + 1)}</Mono><br />
        <Mono size={22} color={H.accent}>REC ●</Mono>
      </div>
      {v.text && (
        <div style={{ position: 'absolute', left: land ? 90 : 70, top: land ? 140 : 300, right: land ? W * 0.5 : 70 }}>
          <Mono size={24} color="rgba(245,245,242,0.8)">{codeFor('image', index)}</Mono>
          <div style={{ height: 16 }} />
          <Statement text={v.text} highlight={v.highlight} size={land ? (len > 14 ? 76 : 92) : lang === 'ko' ? (len > 14 ? 88 : 108) : 92} color={H.white} start={6} />
        </div>
      )}
    </AbsoluteFill>
  );
};

const Outro: React.FC<P> = ({ scene, lang, index, category }) => {
  const v = scene.visual;
  const land = useLandscape();
  const cta = v.cta || '';
  return (
    <Center>
      <Block>
        <Kick text={`END OF SHOW · ${pad2(index + 1)}`} />
        <Statement text={v.text || ''} highlight={v.highlight} size={lang === 'ko' ? 112 : 100} start={4} />
        {cta && <div style={{ marginTop: 70 }}><SplitFlap text={cta.replace(/\s+/g, ' ').slice(0, land ? 18 : 10)} start={18} size={land ? 86 : 78} stagger={2} spin={8} light /></div>}
        <div style={{ marginTop: 50, alignSelf: 'flex-end' }}><Diagram emoji={v.emoji} category={category} size={220} start={10} /></div>
      </Block>
      <Sfx name="swell" at={0} volume={0.22} />
      {cta && <Sfx name="pop" at={24} volume={0.26} />}
    </Center>
  );
};

const Chapter: React.FC<P> = ({ scene, lang }) => {
  const v = scene.visual;
  return (
    <Center>
      <SplitFlap text={`PART ${pad2(v.number || 1)}`} start={0} size={110} stagger={2} spin={8} accentIdx={[5, 6]} />
      <div style={{ marginTop: 60 }}><Statement text={v.title || v.text || ''} highlight={v.highlight} size={lang === 'ko' ? 112 : 100} align="center" start={18} /></div>
      <Sfx name="chime" at={0} volume={0.28} />
    </Center>
  );
};

const HUD_TEMPLATES: Partial<Record<string, React.FC<P>>> = {
  headline: Headline, icon: Headline, stat: Stat, chart: Chart, list: (p) => <ListCard {...p} />, checklist: (p) => <ListCard {...p} check />,
  compare: Compare, timeline: Timeline, iconGrid: IconGrid, quote: Quote, scripture: Scripture, image: ImageScene, outro: Outro, chapter: Chapter,
};

/** 전환: 하드 컷 + 1~2프레임 섬광 + 살짝 당겨지는 줌. 나갈 때는 빠르게 사라진다 */
export const HudSceneView: React.FC<P> = (p) => {
  const frame = useCurrentFrame();
  const ov = Math.max(0, p.overlap ?? 0);
  const outLen = ov > 0 ? ov : 6;
  const out = interpolate(frame, [p.durationInFrames - outLen, p.durationInFrames - (ov > 0 ? 1 : 0)], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const type = p.scene.visual.type;
  const snap = easeOut(frame / 8);
  const flash = p.index > 0 ? clamp01(1 - frame / 3) : 0;
  const T = (HUD_TEMPLATES[type] || (TEMPLATES as any)[type]) as React.FC<P>;
  const whoosh = p.index > 0 && type !== 'chapter' && type !== 'scripture';
  return (
    <AbsoluteFill style={{ opacity: out }}>
      <AbsoluteFill style={{ transform: `scale(${1.05 - 0.05 * snap})` }}>
        {hasBg(p.scene.visual) && <SceneBg src={p.scene.visual.bgSrc!} durationInFrames={p.durationInFrames} mode="paper" index={p.index} />}
        <T {...p} />
      </AbsoluteFill>
      {flash > 0 && <AbsoluteFill style={{ background: '#ffffff', opacity: flash * 0.55 }} />}
      {whoosh && <Sfx name="whoosh" at={0} volume={type === 'image' ? 0.2 : 0.12} />}
    </AbsoluteFill>
  );
};
