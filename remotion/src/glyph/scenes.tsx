import React, { useMemo } from 'react';
import { AbsoluteFill, Easing, Img, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { renderToStaticMarkup } from 'react-dom/server';
import { resolveSrc } from '../assets';
import { SceneBg, hasBg } from '../SceneBg';
import { Center, P, Sfx, TEMPLATES, counterProgress, counterTiming, fmt, iconFor, useLandscape } from '../scenes';
import { GlyphRaster, svgDataUrl } from './GlyphRaster';
import { ArcText, DecodeText, MixedType, Typewriter } from './text';
import { F, GlyphTheme, clamp01, easeOut, glyphFill, hash, neon } from './util';
import { Media } from '../Media';

type GP = P & { theme: GlyphTheme };

/** 이모지 → 글자로 그린 아이콘 */
const GlyphIcon: React.FC<{ emoji?: string; category?: string; size: number; theme: GlyphTheme; start?: number; seed?: number }> = ({ emoji, category, size, theme, start = 0, seed = 1 }) => {
  const frame = useCurrentFrame();
  const src = useMemo(() => {
    const Icon = iconFor(emoji, category);
    return svgDataUrl(renderToStaticMarkup(<Icon size={256} color="#ffffff" strokeWidth={2.6} xmlns="http://www.w3.org/2000/svg" />));
  }, [emoji, category]);
  const pulse = 0.85 + 0.15 * Math.sin(frame / 10);
  return (
    <div style={{ position: 'relative', width: size, height: size, transform: `translateY(${Math.sin(frame / 18) * 6}px)` }}>
      <div style={{ position: 'absolute', inset: -size * 0.25, borderRadius: '50%', background: `radial-gradient(circle, ${theme.blobA} 0%, transparent 62%)`, opacity: pulse }} />
      <svg width={size} height={size} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
        <circle cx={size / 2} cy={size / 2} r={size * 0.52} fill="none" stroke={theme.accent} strokeOpacity={0.35} strokeWidth={2} strokeDasharray="3 9" transform={`rotate(${frame * 0.8} ${size / 2} ${size / 2})`} />
        <circle cx={size / 2} cy={size / 2} r={size * 0.6} fill="none" stroke={theme.accent2} strokeOpacity={0.25} strokeWidth={1.5} strokeDasharray="40 30" transform={`rotate(${-frame * 0.5} ${size / 2} ${size / 2})`} />
      </svg>
      <div style={{ position: 'absolute', inset: 0 }}>
        <GlyphRaster src={src} width={size} height={size} cell={Math.max(8, Math.round(size / 34))} mode="mask" tint={theme.accent} tint2="#fff6e0" start={start} assemble={22} from="center" seed={seed} threshold={0.2} />
      </div>
    </div>
  );
};

const sizeFor = (len: number, lang: string, land: boolean) => {
  const k = land ? 1 : 1;
  return k * (lang === 'ko' ? (len > 22 ? 104 : len > 12 ? 126 : 150) : (len > 34 ? 92 : len > 18 ? 110 : 132));
};

const Headline: React.FC<GP> = ({ scene, theme, lang, category, index }) => {
  const v = scene.visual;
  const isIcon = v.type === 'icon';
  const text = v.text || '';
  if (isIcon) {
    // 아이콘 장면: 글자 아이콘 + 위로 휘어지는 문구
    return (
      <Center>
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <ArcText text={text} radius={330} size={lang === 'ko' ? 74 : 64} color={theme.fg} hl={v.highlight} hlColor={theme.accent} start={10} />
          <div style={{ marginTop: -90 }}><GlyphIcon emoji={v.emoji} category={category} size={430} theme={theme} seed={index + 3} /></div>
        </div>
      </Center>
    );
  }
  return (
    <Center>
      {v.emoji && <div style={{ marginBottom: 30 }}><GlyphIcon emoji={v.emoji} category={category} size={250} theme={theme} seed={index + 1} /></div>}
      <MixedType text={text} highlight={v.highlight} theme={theme} size={sizeFor(text.length, lang, false)} delay={v.emoji ? 8 : 2} variant={index} soft={category === 'bible'} />
    </Center>
  );
};

const Stat: React.FC<GP> = ({ scene, theme, lang, durationInFrames }) => {
  const v = scene.visual;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const target = v.value || 0;
  const { startF, countLen } = counterTiming(scene, target, fps, durationInFrames);
  const p = counterProgress(frame, { startF, countLen, endF: startF + countLen });
  const shown = fmt(p >= 1 ? target : target * p, v.decimals || 0, lang);
  // 숫자가 정해지기 전에는 끝자리가 무작위로 흔들린다 (해독되는 느낌)
  // 올라가는 동안에만 끝자리가 흔들리고, 멈출 무렵(85%)부터는 진짜 숫자만 보인다
  const scr = p > 0 && p < 0.85 ? shown.replace(/\d(?=[^\d]*$)/, String(Math.floor(hash(frame) * 10))) : shown;
  const digits = shown.length + (v.prefix || '').length + (v.suffix || '').length;
  const size = digits > 9 ? 170 : digits > 6 ? 220 : 270;
  const pop = spring({ frame: frame - startF - countLen, fps, config: { damping: 7, stiffness: 220 } });
  const tickAt = Array.from({ length: 6 }, (_, k) => startF + Math.round(countLen * (1 - Math.pow(1 - (k + 1) / 7, 2.2))));
  return (
    <Center>
      {v.label && <div style={{ marginBottom: -30 }}><ArcText text={v.label} radius={430} size={lang === 'ko' ? 60 : 54} color={theme.fg} start={0} speed={1} /></div>}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'baseline', fontFamily: F.cond, transform: `scale(${1 + 0.07 * Math.sin(Math.PI * clamp01(pop))})`, filter: `drop-shadow(0 0 30px ${theme.blobA})` }}>
        {v.prefix && <span style={{ fontSize: size * 0.45, color: theme.accent, marginRight: 12 }}>{v.prefix}</span>}
        <span style={{ fontSize: size, letterSpacing: 2, fontVariantNumeric: 'tabular-nums', ...glyphFill(theme.accent, theme.accent2, frame) }}>{scr}</span>
        {v.suffix && <span style={{ fontSize: size * 0.38, color: '#fff', marginLeft: 16, textShadow: neon(theme.neon, 0.8) }}>{v.suffix}</span>}
      </div>
      {/* 눈금 막대 */}
      <div style={{ display: 'flex', gap: 6, marginTop: 24 }}>
        {Array.from({ length: 24 }, (_, k) => <div key={k} style={{ width: 22, height: 40, borderRadius: 3, background: k / 24 < p ? theme.accent : 'rgba(255,255,255,0.1)', boxShadow: k / 24 < p ? `0 0 12px ${theme.accent}` : 'none' }} />)}
      </div>
      {v.sub && <div style={{ marginTop: 40 }}><Typewriter text={v.sub} start={startF + 6} speed={1.1} style={{ fontFamily: F.mono, fontWeight: 700, fontSize: 40, color: theme.muted }} cursor={false} /></div>}
      {tickAt.map((f, k) => <Sfx key={k} name="tick" at={f} volume={0.16} />)}
      <Sfx name="pop" at={startF + countLen} volume={0.28} />
    </Center>
  );
};

/** 명언: 터미널 창에서 타자 치듯 */
const Quote: React.FC<GP> = ({ scene, theme, lang, durationInFrames }) => {
  const v = scene.visual;
  const frame = useCurrentFrame();
  const land = useLandscape();
  const text = v.text || '';
  const n = [...text].length;
  const speed = Math.max(0.8, Math.min(2.2, (durationInFrames * 0.5) / Math.max(1, n)));
  const doneAt = 10 + n * speed;
  const s = easeOut(frame / 10);
  const size = lang === 'ko' ? (n > 30 ? 62 : 74) : (n > 50 ? 56 : 66);
  return (
    <Center>
      <div style={{ width: land ? 1300 : 940, borderRadius: 18, border: `2px solid ${theme.cardBorder}`, background: theme.card, boxShadow: `0 0 60px ${theme.blobB}, inset 0 0 40px rgba(0,0,0,0.5)`, opacity: s, transform: `scale(${0.94 + 0.06 * s})`, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '18px 26px', borderBottom: `1px solid ${theme.cardBorder}` }}>
          {['#ff5f57', '#febc2e', '#28c840'].map(c => <div key={c} style={{ width: 18, height: 18, borderRadius: 9, background: c }} />)}
          <div style={{ marginLeft: 14, fontFamily: F.mono, fontSize: 28, color: theme.muted }}>quote.txt</div>
        </div>
        <div style={{ padding: '46px 54px 50px' }}>
          <div style={{ fontFamily: F.mono, fontSize: 34, color: theme.accent, marginBottom: 18 }}>{'>'} cat quote.txt</div>
          <Typewriter text={text} start={10} speed={speed} cursorColor={theme.accent} style={{ fontFamily: F.mono, fontWeight: 700, fontSize: size, color: theme.fg, lineHeight: 1.35, wordBreak: 'keep-all' }} />
          {v.author && <div style={{ marginTop: 34, textAlign: 'right', fontFamily: F.cond, fontSize: 52, color: theme.accent, opacity: clamp01((frame - doneAt) / 8), textShadow: neon(theme.accent, 0.5) }}>— {v.author}</div>}
        </div>
      </div>
    </Center>
  );
};

/** 성경 구절: 금빛 프레임 + 빛줄기 + 세리프 */
const Scripture: React.FC<GP> = ({ scene, theme, lang, durationInFrames }) => {
  const v = scene.visual;
  const frame = useCurrentFrame();
  const land = useLandscape();
  const text = v.text || '';
  const words = text.split(/\s+/);
  const per = Math.max(2, Math.min(6, (durationInFrames * 0.5) / Math.max(1, words.length)));
  const size = lang === 'ko' ? (text.length > 40 ? 68 : 80) : 66;
  const W = land ? 1300 : 920;
  const box = easeOut(frame / 16);
  const corner = (rot: number, pos: React.CSSProperties) => <div style={{ position: 'absolute', width: 70, height: 70, borderTop: `4px solid ${theme.accent}`, borderLeft: `4px solid ${theme.accent}`, transform: `rotate(${rot}deg)`, boxShadow: `-4px -4px 20px -6px ${theme.accent}`, ...pos }} />;
  return (
    <Center>
      <div style={{ position: 'absolute', top: '-30%', left: '50%', width: 1500, height: 1500, marginLeft: -750, background: `conic-gradient(from ${180 + Math.sin(frame / 40) * 6}deg at 50% 0%, transparent 0deg, ${theme.blobA} 8deg, transparent 18deg, transparent 34deg, ${theme.blobA} 42deg, transparent 54deg, transparent 306deg, ${theme.blobA} 318deg, transparent 326deg)`, opacity: 0.7 * box, filter: 'blur(6px)' }} />
      <div style={{ position: 'relative', width: W, padding: '80px 70px', opacity: box }}>
        {corner(0, { left: 0, top: 0 })}{corner(90, { right: 0, top: 0 })}{corner(180, { right: 0, bottom: 0 })}{corner(270, { left: 0, bottom: 0 })}
        <div style={{ textAlign: 'center', fontFamily: F.serif, fontWeight: 700, fontSize: size, lineHeight: 1.45, color: theme.fg, wordBreak: 'keep-all' }}>
          {words.map((w, i) => {
            const e = easeOut((frame - 8 - i * per) / 12);
            return <span key={i} style={{ display: 'inline-block', margin: '0 0.14em', opacity: e, filter: `blur(${(1 - e) * 8}px)`, textShadow: `0 0 ${20 * e}px ${theme.blobA}` }}>{w}</span>;
          })}
        </div>
        {v.author && <div style={{ marginTop: 40, textAlign: 'center' }}><Typewriter text={v.author} start={8 + words.length * per} speed={1.2} cursor={false} style={{ fontFamily: F.mono, fontWeight: 700, fontSize: 42, color: theme.accent, letterSpacing: 2 }} /></div>}
      </div>
      <Sfx name="chime" at={2} volume={0.22} />
    </Center>
  );
};

/** AI 이미지: 글자로 재구성 + 느린 줌 (원본은 아주 흐리게 깔아 색감만) */
const ImageScene: React.FC<GP> = ({ scene, theme, lang, index, durationInFrames }) => {
  const v = scene.visual;
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const land = width > height;
  const src = resolveSrc(v.src)!;
  const p = frame / Math.max(1, durationInFrames);
  const z = 1.02 + 0.08 * p;
  // 장면 후반에는 글자 사이로 원본 그림이 비친다
  const reveal = interpolate(frame, [durationInFrames * 0.45, durationInFrames * 0.9], [0.16, 0.38], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const len = (v.text || '').length;
  const size = land ? (len > 14 ? 92 : 112) : lang === 'ko' ? (len > 14 ? 100 : 122) : (len > 24 ? 88 : 104);
  return (
    <AbsoluteFill style={{ background: '#05040a' }}>
      <AbsoluteFill style={{ transform: `scale(${z})`, opacity: reveal }}>
        <Media src={v.src} video={v.video} videoStart={v.videoStart} style={{ filter: 'saturate(1.2) blur(1px)' }} />
      </AbsoluteFill>
      <AbsoluteFill>
        <GlyphRaster src={src} width={width} height={height} cell={land ? 13 : 13} mode="color" start={0} assemble={26} zoom={[1.02, 1.1]} durationInFrames={durationInFrames} seed={index + 11} from={index % 2 ? 'below' : 'center'} threshold={0.06} />
      </AbsoluteFill>
      <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.65) 78%, rgba(0,0,0,0.8) 100%)' }} />
      {v.text && (
        <AbsoluteFill style={land ? { top: 60, height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' } : { top: 250, height: 420, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 60px' }}>
          <MixedType text={v.text} highlight={v.highlight} theme={theme} size={size} delay={10} variant={index + 1} maxWidth={land ? 1600 : 960} />
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};

/** 마무리: 글자 텍스처 큰 문구 + 터미널 입력줄 CTA */
const Outro: React.FC<GP> = ({ scene, theme, lang, category, index }) => {
  const v = scene.visual;
  const frame = useCurrentFrame();
  const land = useLandscape();
  const bar = easeOut((frame - 18) / 12);
  return (
    <Center>
      <div style={{ marginBottom: 20 }}><GlyphIcon emoji={v.emoji} category={category} size={260} theme={theme} seed={index + 5} /></div>
      <MixedType text={v.text || ''} highlight={(v.highlight && v.highlight.length) ? v.highlight : (v.text || '').split(/\s+/).slice(-1)} theme={theme} size={lang === 'ko' ? 116 : 104} variant={index} />
      <Sfx name="swell" at={0} volume={0.22} />
      {v.cta && (
        <>
          <div style={{ marginTop: 70, width: land ? 1100 : 900, display: 'flex', alignItems: 'center', gap: 22, padding: '26px 36px', borderRadius: 16, border: `2px solid ${theme.accent}`, background: 'rgba(10,8,18,0.8)', boxShadow: `0 0 40px ${theme.blobA}`, opacity: bar, transform: `translateY(${(1 - bar) * 30}px)` }}>
            <span style={{ fontFamily: F.mono, fontWeight: 700, fontSize: 52, color: theme.accent }}>›</span>
            <Typewriter text={v.cta} start={24} speed={1.6} cursorColor={theme.accent} style={{ fontFamily: F.mono, fontWeight: 700, fontSize: 50, color: theme.fg }} />
          </div>
          <Sfx name="pop" at={22} volume={0.28} />
        </>
      )}
    </Center>
  );
};

/** 롱폼 챕터: 출발 안내판처럼 글자가 해독되며 */
const Chapter: React.FC<GP> = ({ scene, theme, lang }) => {
  const v = scene.visual;
  const frame = useCurrentFrame();
  const line = easeOut((frame - 4) / 18);
  const title = v.title || v.text || '';
  return (
    <Center>
      <Typewriter text={`PART ${String(v.number || 1).padStart(2, '0')}`} start={0} speed={1.5} cursorColor={theme.accent} style={{ fontFamily: F.mono, fontWeight: 700, fontSize: 58, letterSpacing: 10, color: theme.accent }} />
      <div style={{ width: 760 * line, height: 3, margin: '30px 0 40px', background: `linear-gradient(90deg, transparent, ${theme.accent}, transparent)`, boxShadow: `0 0 20px ${theme.accent}` }} />
      <DecodeText text={title} start={8} len={24} style={{ fontFamily: F.cond, fontSize: lang === 'ko' ? (title.length > 16 ? 120 : 150) : 120, color: '#fff', textShadow: neon(theme.neon, 0.9), textAlign: 'center', wordBreak: 'keep-all' }} />
      <Sfx name="chime" at={0} volume={0.3} />
    </Center>
  );
};

const GLYPH_TEMPLATES: Partial<Record<string, React.FC<GP>>> = {
  headline: Headline, icon: Headline, stat: Stat, quote: Quote, scripture: Scripture, image: ImageScene, outro: Outro, chapter: Chapter,
};

/** 장면 전환: 글리치(RGB 분리 + 흔들림) / 날아 들어오기 / 디코드 블러. 나갈 때는 카메라가 뚫고 지나가듯 커지며 사라진다 */
export const GlyphSceneView: React.FC<GP> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ov = Math.max(0, p.overlap ?? 0);
  const outLen = ov > 0 ? ov : 8;
  const out = interpolate(frame, [p.durationInFrames - outLen, p.durationInFrames - (ov > 0 ? 1 : 0)], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.quad) });
  const type = p.scene.visual.type;
  const isImage = type === 'image';
  const kinds = ['glitch', 'fly', 'glitch', 'focus'];
  const kind = p.index === 0 ? 'fly' : type === 'chapter' ? 'glitch' : kinds[p.index % kinds.length];
  const inS = spring({ frame, fps, config: { damping: 18, stiffness: 150 } });
  let transform = '', filter = 'none', opacity = 1;
  if (kind === 'glitch') {
    const g = clamp01(1 - frame / 7);
    const jx = (hash(frame + p.index * 7) - 0.5) * 60 * g;
    transform = `translateX(${jx}px)`;
    filter = g > 0 ? `drop-shadow(${10 * g}px 0 0 rgba(255,40,80,0.8)) drop-shadow(${-10 * g}px 0 0 rgba(40,200,255,0.8))` : 'none';
    opacity = frame < 4 ? (frame % 2 ? 0.5 : 1) : 1;
  } else if (kind === 'fly') {
    transform = `scale(${interpolate(inS, [0, 1], [0.55, 1])})`; filter = `blur(${(1 - inS) * 14}px)`; opacity = Math.min(1, inS * 1.5);
  } else {
    transform = `translateY(${(1 - inS) * 60}px)`; filter = `blur(${(1 - inS) * 22}px)`; opacity = Math.min(1, inS * 1.4);
  }
  // 퇴장: 앞으로 지나가듯
  transform += ` scale(${1 + (1 - out) * 0.18})`;
  const T = (GLYPH_TEMPLATES[type] || (TEMPLATES as any)[type] || Headline) as React.FC<GP>;
  const whoosh = p.index > 0 && type !== 'chapter' && type !== 'scripture';
  return (
    <AbsoluteFill style={{ opacity: opacity * out, transform: isImage ? undefined : transform, filter: isImage && kind !== 'glitch' ? undefined : filter }}>
      {hasBg(p.scene.visual) && <SceneBg src={p.scene.visual.bgSrc!} durationInFrames={p.durationInFrames} mode="dark" index={p.index} />}
      <T {...p} />
      {whoosh && <Sfx name="whoosh" at={0} volume={isImage ? 0.2 : 0.13} />}
    </AbsoluteFill>
  );
};

/** 필름 질감: 움직이는 노이즈 + 주사선 + 비네팅 */
const NOISE_SVG = `url("data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.11 0'/></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>`)}")`;
export const FilmFx: React.FC = () => {
  const frame = useCurrentFrame();
  const ox = Math.floor(hash(frame) * 300), oy = Math.floor(hash(frame + 99) * 300);
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <AbsoluteFill style={{ backgroundImage: NOISE_SVG, backgroundPosition: `${ox}px ${oy}px`, opacity: 0.9, mixBlendMode: 'screen' }} />
      <AbsoluteFill style={{ backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.13) 0px, rgba(0,0,0,0.13) 1px, transparent 1px, transparent 4px)' }} />
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.6) 100%)' }} />
    </AbsoluteFill>
  );
};
