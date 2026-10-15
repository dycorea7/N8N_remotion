import React from 'react';
import { AbsoluteFill, Easing, Img, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { resolveSrc } from './assets';
import { Scene, Visual } from './types';
import { Theme, SANS_FONT } from './theme';

type P = { scene: Scene; theme: Theme; index: number; durationInFrames: number; lang: string };

// ── 공통 도우미 ──
const useSpring = (delay = 0, cfg: any = { damping: 15, stiffness: 160, mass: 0.7 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - delay, fps, config: cfg });
};

/** 장면 나레이션에서 phrase의 첫 낱말이 발음되는 시각(장면 기준 프레임). 못 찾으면 null */
function spokenFrame(scene: Scene, phrase: string, fps: number): number | null {
  const key = String(phrase || '').replace(/[^\p{L}\p{N}]/gu, ' ').trim().split(/\s+/)[0];
  if (!key || key.length < 1) return null;
  const k = key.length > 2 ? key.slice(0, Math.max(2, key.length - 1)) : key; // 조사 붙은 경우 대비
  const w = scene.words.find(x => x.text.replace(/[^\p{L}\p{N}]/gu, '').includes(k));
  return w ? Math.max(0, Math.round((w.start - scene.start) * fps)) : null;
}

/** 항목 등장 프레임: 말할 때 등장, 못 찾으면 장면 앞 60%에 고르게 */
function revealFrames(scene: Scene, labels: string[], fps: number, dur: number): number[] {
  const even = labels.map((_, i) => Math.round(8 + i * (dur * 0.6) / Math.max(1, labels.length)));
  const spoken = labels.map(l => spokenFrame(scene, l, fps));
  let last = -1;
  return labels.map((_, i) => {
    let f = spoken[i] != null ? Math.max(4, (spoken[i] as number) - 4) : even[i];
    if (f <= last) f = last + 6; // 순서 보장
    last = f;
    return Math.min(f, Math.max(0, dur - 20));
  });
}

const Emoji: React.FC<{ e?: string; size?: number; delay?: number }> = ({ e, size = 150, delay = 0 }) => {
  const s = useSpring(delay, { damping: 9, stiffness: 140 });
  const frame = useCurrentFrame();
  if (!e) return null;
  return <div style={{ fontSize: size, lineHeight: 1, marginBottom: 36, transform: `scale(${s}) translateY(${Math.sin(frame / 14) * 8}px) rotate(${Math.sin(frame / 22) * 4}deg)`, filter: 'drop-shadow(0 16px 30px rgba(0,0,0,0.4))' }}>{e}</div>;
};

const Kicker: React.FC<{ text?: string; theme: Theme; delay?: number }> = ({ text, theme, delay = 0 }) => {
  const s = useSpring(delay);
  if (!text) return null;
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 16, marginBottom: 40, opacity: s, transform: `translateY(${(1 - s) * 20}px)` }}>
      <div style={{ width: 48 * s, height: 6, borderRadius: 3, background: theme.accent }} />
      <div style={{ fontFamily: SANS_FONT, fontWeight: 700, fontSize: 46, color: theme.muted, letterSpacing: 1 }}>{text}</div>
    </div>
  );
};

/** 단어별로 튀어 오르는 큰 문장. highlight 단어는 강조색 + 밑줄 스윕 */
const KineticText: React.FC<{ text: string; highlight?: string[]; theme: Theme; size: number; font?: string; delay?: number; stagger?: number; lang: string }> = ({ text, highlight = [], theme, size, font, delay = 0, stagger = 3, lang }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const words = text.split(/\s+/).filter(Boolean);
  const hl = highlight.map(h => h.replace(/\s+/g, ''));
  return (
    <div style={{ fontFamily: font || SANS_FONT, fontWeight: 900, fontSize: size, lineHeight: 1.22, color: theme.fg, letterSpacing: lang === 'ko' ? -2 : -1, textAlign: 'center', wordBreak: 'keep-all' }}>
      {words.map((w, i) => {
        const s = spring({ frame: frame - delay - i * stagger, fps, config: { damping: 13, stiffness: 180, mass: 0.6 } });
        const isHl = hl.some(h => h && (w.includes(h) || h.includes(w.replace(/[^\p{L}\p{N}]/gu, '')) && w.length > 1));
        const sweep = interpolate(frame - delay - i * stagger - 8, [0, 12], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) });
        return (
          <span key={i} style={{ display: 'inline-block', margin: `0 ${size * 0.13}px`, position: 'relative', opacity: s, transform: `translateY(${(1 - s) * size * 0.6}px) scale(${0.7 + 0.3 * s})`, color: isHl ? theme.accent : theme.fg, textShadow: '0 10px 40px rgba(0,0,0,0.35)' }}>
            {isHl && <span style={{ position: 'absolute', left: -6, right: -6, bottom: size * 0.04, height: size * 0.2, background: theme.accent, opacity: 0.25, borderRadius: 8, transformOrigin: 'left', transform: `scaleX(${sweep})` }} />}
            <span style={{ position: 'relative' }}>{w}</span>
          </span>
        );
      })}
    </div>
  );
};

const fmt = (v: number, d: number, lang: string) => v.toLocaleString(lang === 'ko' ? 'ko-KR' : 'en-US', { minimumFractionDigits: d, maximumFractionDigits: d });

// ── 장면 템플릿 ──
const Headline: React.FC<P> = ({ scene, theme, lang }) => {
  const v = scene.visual;
  const len = (v.text || '').length;
  const size = lang === 'ko' ? (len > 22 ? 96 : len > 12 ? 118 : 140) : (len > 34 ? 88 : len > 18 ? 104 : 124);
  return (
    <Center>
      <Emoji e={v.emoji} />
      <KineticText text={v.text || ''} highlight={v.highlight} theme={theme} size={size} lang={lang} delay={v.emoji ? 6 : 0} />
    </Center>
  );
};

const Stat: React.FC<P> = ({ scene, theme, lang, durationInFrames }) => {
  const v = scene.visual;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const target = v.value || 0;
  const startF = Math.max(6, (spokenFrame(scene, fmt(target, 0, 'en').replace(/,/g, ''), fps) ?? 10) - 10);
  const p = interpolate(frame, [startF, startF + Math.min(42, durationInFrames * 0.5)], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.exp) });
  const shown = fmt(target * p, v.decimals || 0, lang);
  const isPct = /%|퍼센트/.test(v.suffix || '') && target <= 100;
  const pop = spring({ frame: frame - startF - 40, fps, config: { damping: 8, stiffness: 200 } });
  const R = 300, C = 2 * Math.PI * R;
  const digits = shown.length + (v.prefix || '').length + (v.suffix || '').length;
  const size = digits > 9 ? 150 : digits > 6 ? 190 : 230;
  return (
    <Center>
      <Kicker text={v.label} theme={theme} />
      <div style={{ position: 'relative', width: 720, height: isPct ? 720 : 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {isPct && (
          <svg width={720} height={720} style={{ position: 'absolute', transform: 'rotate(-90deg)' }}>
            <circle cx={360} cy={360} r={R} fill="none" stroke={theme.card} strokeWidth={34} />
            <circle cx={360} cy={360} r={R} fill="none" stroke={theme.accent} strokeWidth={34} strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - (target / 100) * p)} />
          </svg>
        )}
        <div style={{ fontFamily: SANS_FONT, fontWeight: 900, color: theme.fg, display: 'flex', alignItems: 'baseline', transform: `scale(${1 + 0.06 * Math.sin(Math.PI * Math.min(1, Math.max(0, pop)))})`, textShadow: `0 0 60px ${theme.blobA}` }}>
          {v.prefix && <span style={{ fontSize: size * 0.45, color: theme.accent, marginRight: 10 }}>{v.prefix}</span>}
          <span style={{ fontSize: size, letterSpacing: -4, fontVariantNumeric: 'tabular-nums' }}>{shown}</span>
          {v.suffix && <span style={{ fontSize: size * 0.4, color: theme.accent, marginLeft: 12, fontWeight: 800 }}>{v.suffix}</span>}
        </div>
      </div>
      {!isPct && <div style={{ width: 520 * p, height: 10, borderRadius: 5, marginTop: 30, background: `linear-gradient(90deg, ${theme.accent}, ${theme.accent2})` }} />}
      {v.sub && <div style={{ marginTop: 40, fontFamily: SANS_FONT, fontWeight: 600, fontSize: 42, color: theme.muted, opacity: p, textAlign: 'center', maxWidth: 860 }}>{v.sub}</div>}
    </Center>
  );
};

const Chart: React.FC<P> = ({ scene, theme, lang, durationInFrames }) => {
  const v = scene.visual;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const items = (v.items || []) as { label: string; value: number }[];
  const max = Math.max(...items.map(i => i.value), 1);
  const top = items.reduce((b, it, i) => (it.value > items[b].value ? i : b), 0);
  const at = revealFrames(scene, items.map(i => i.label), fps, durationInFrames);
  const barH = items.length > 3 ? 92 : 116;
  return (
    <Center>
      <Kicker text={v.title} theme={theme} />
      <div style={{ width: 900, display: 'flex', flexDirection: 'column', gap: items.length > 3 ? 34 : 46 }}>
        {items.map((it, i) => {
          const s = spring({ frame: frame - at[i], fps, config: { damping: 18, stiffness: 90 } });
          const w = Math.max(0.04, it.value / max) * s;
          const best = i === top;
          return (
            <div key={i} style={{ opacity: Math.min(1, s * 1.6) }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: SANS_FONT, fontWeight: 700, fontSize: 44, color: best ? theme.fg : theme.muted, marginBottom: 12 }}>
                <span>{it.label}</span>
                <span style={{ color: best ? theme.accent : theme.muted, fontVariantNumeric: 'tabular-nums' }}>{fmt(it.value * s, Math.min(2, (String(it.value).split('.')[1] || '').length), lang)}{v.unit}</span>
              </div>
              <div style={{ height: barH, borderRadius: barH / 2, background: theme.card, border: `2px solid ${theme.cardBorder}`, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${w * 100}%`, borderRadius: barH / 2, background: best ? `linear-gradient(90deg, ${theme.accent2}, ${theme.accent})` : 'rgba(255,255,255,0.22)', boxShadow: best ? `0 0 40px ${theme.blobA}` : 'none' }} />
              </div>
            </div>
          );
        })}
      </div>
    </Center>
  );
};

const List: React.FC<P> = ({ scene, theme, durationInFrames }) => {
  const v = scene.visual;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const items = (v.items || []) as string[];
  const at = revealFrames(scene, items, fps, durationInFrames);
  return (
    <Center>
      <Kicker text={v.title} theme={theme} />
      <div style={{ width: 920, display: 'flex', flexDirection: 'column', gap: 30 }}>
        {items.map((it, i) => {
          const s = spring({ frame: frame - at[i], fps, config: { damping: 14, stiffness: 150 } });
          const current = frame >= at[i] && (i === items.length - 1 || frame < at[i + 1]);
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 32, padding: '30px 38px', borderRadius: 36, background: current ? theme.card : 'rgba(255,255,255,0.03)', border: `2px solid ${current ? theme.accent : theme.cardBorder}`, opacity: s, transform: `translateX(${(1 - s) * -140}px)` }}>
              <div style={{ width: 92, height: 92, flex: 'none', borderRadius: 28, background: current ? theme.accent : 'rgba(255,255,255,0.1)', color: current ? theme.bg1 : theme.fg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: SANS_FONT, fontWeight: 900, fontSize: 54 }}>{i + 1}</div>
              <div style={{ fontFamily: SANS_FONT, fontWeight: 800, fontSize: 54, color: theme.fg, lineHeight: 1.2, wordBreak: 'keep-all' }}>{it}</div>
            </div>
          );
        })}
      </div>
    </Center>
  );
};

const QuoteCard: React.FC<P & { scripture?: boolean }> = ({ scene, theme, lang, scripture }) => {
  const v = scene.visual;
  const frame = useCurrentFrame();
  const s = useSpring(0);
  const len = (v.text || '').length;
  const size = lang === 'ko' ? (len > 50 ? 66 : len > 30 ? 78 : 92) : (len > 70 ? 62 : len > 40 ? 74 : 86);
  const authorS = useSpring(18 + (v.text || '').split(/\s+/).length * 2);
  return (
    <Center>
      {scripture && (
        <div style={{ position: 'absolute', top: -260, left: '50%', width: 1400, height: 1400, marginLeft: -700, background: `conic-gradient(from ${180 + Math.sin(frame / 40) * 6}deg at 50% 0%, transparent 0deg, ${theme.blobA} 10deg, transparent 22deg, transparent 40deg, ${theme.blobA} 48deg, transparent 60deg, transparent 300deg, ${theme.blobA} 312deg, transparent 322deg)`, opacity: 0.55 * s, filter: 'blur(8px)' }} />
      )}
      <div style={{ position: 'relative', width: 940, padding: '90px 70px 70px', borderRadius: 48, background: theme.card, border: `2px solid ${theme.cardBorder}`, boxShadow: '0 40px 120px rgba(0,0,0,0.35)', transform: `scale(${0.92 + 0.08 * s})`, opacity: s }}>
        <div style={{ position: 'absolute', top: -70, left: 60, fontSize: 240, lineHeight: 1, color: theme.accent, fontFamily: theme.headlineFont, opacity: 0.9 }}>“</div>
        <KineticText text={v.text || ''} theme={theme} size={size} font={scripture ? theme.headlineFont : undefined} lang={lang} stagger={2} delay={6} />
        {v.author && <div style={{ marginTop: 50, textAlign: 'right', fontFamily: SANS_FONT, fontWeight: 700, fontSize: 44, color: theme.accent, opacity: authorS, transform: `translateX(${(1 - authorS) * 40}px)` }}>— {v.author}</div>}
      </div>
    </Center>
  );
};

const Compare: React.FC<P> = ({ scene, theme }) => {
  const v = scene.visual;
  const a = useSpring(4), b = useSpring(16), vs = useSpring(12, { damping: 8, stiffness: 200 });
  const card = (side: { label: string; text: string }, s: number, good: boolean, dir: number) => (
    <div style={{ width: 900, padding: '44px 50px', borderRadius: 40, background: good ? theme.card : 'rgba(255,255,255,0.03)', border: `3px solid ${good ? theme.accent : 'rgba(255,255,255,0.14)'}`, opacity: s, transform: `translateX(${(1 - s) * 200 * dir}px)` }}>
      <div style={{ fontFamily: SANS_FONT, fontWeight: 800, fontSize: 44, color: good ? theme.accent : theme.muted, marginBottom: 14 }}>{side.label}</div>
      <div style={{ fontFamily: SANS_FONT, fontWeight: 800, fontSize: 60, color: good ? theme.fg : theme.muted, lineHeight: 1.22, wordBreak: 'keep-all' }}>{side.text}</div>
    </div>
  );
  return (
    <Center>
      <Kicker text={v.title} theme={theme} />
      {card(v.left!, a, false, -1)}
      <div style={{ margin: '-14px 0', zIndex: 2, width: 120, height: 120, borderRadius: 60, background: theme.accent, color: theme.bg1, fontFamily: SANS_FONT, fontWeight: 900, fontSize: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${vs})`, boxShadow: `0 0 50px ${theme.blobA}` }}>VS</div>
      {card(v.right!, b, true, 1)}
    </Center>
  );
};

const Outro: React.FC<P> = ({ scene, theme, lang }) => {
  const v = scene.visual;
  const frame = useCurrentFrame();
  const cta = useSpring(20, { damping: 10, stiffness: 160 });
  const press = 1 - 0.06 * Math.max(0, Math.sin((frame - 40) / 9)) * (frame > 40 ? 1 : 0);
  return (
    <Center>
      <Emoji e={v.emoji} />
      <KineticText text={v.text || ''} highlight={v.highlight} theme={theme} size={lang === 'ko' ? 104 : 96} lang={lang} />
      {v.cta && (
        <div style={{ marginTop: 70, padding: '28px 64px', borderRadius: 999, background: theme.accent, color: theme.bg1, fontFamily: SANS_FONT, fontWeight: 900, fontSize: 52, transform: `scale(${cta * press})`, boxShadow: `0 20px 60px ${theme.blobA}` }}>{v.cta}</div>
      )}
    </Center>
  );
};


/** AI 이미지 장면: 화면 가득 + 켄번즈(줌/패닝) + 상단 키워드 */
const ImageScene: React.FC<P> = ({ scene, theme, lang, index, durationInFrames }) => {
  const v = scene.visual;
  const frame = useCurrentFrame();
  const p = interpolate(frame, [0, durationInFrames], [0, 1], { extrapolateRight: 'clamp' });
  const zoomIn = index % 2 === 0;
  const scale = zoomIn ? 1.04 + 0.12 * p : 1.16 - 0.12 * p;
  const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  const [dx, dy] = dirs[index % dirs.length];
  const tx = dx * 40 * (p - 0.5), ty = dy * 50 * (p - 0.5);
  const len = (v.text || '').length;
  const size = lang === 'ko' ? (len > 14 ? 78 : 92) : (len > 24 ? 70 : 84);
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ transform: `scale(${scale}) translate(${tx}px, ${ty}px)` }}>
        <Img src={resolveSrc(v.src)!} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </AbsoluteFill>
      {/* 위: 키워드 가독성, 아래: 자막 가독성 */}
      <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.62) 0%, rgba(0,0,0,0.08) 30%, rgba(0,0,0,0.05) 52%, rgba(0,0,0,0.55) 72%, rgba(0,0,0,0.72) 100%)' }} />
      {v.text && (
        <AbsoluteFill style={{ top: 250, height: 420, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 70px' }}>
          <KineticText text={v.text} highlight={v.highlight} theme={theme} size={size} lang={lang} delay={6} />
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};

const Center: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  // 그래픽은 위 220px(상단 UI)와 자막 영역(1260~) 사이에 배치
  <AbsoluteFill style={{ top: 230, height: 1010, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 70px' }}>{children}</AbsoluteFill>
);

const TEMPLATES: Record<Visual['type'], React.FC<P>> = {
  headline: Headline, icon: Headline, stat: Stat, chart: Chart, list: List,
  quote: QuoteCard, scripture: (p) => <QuoteCard {...p} scripture />, compare: Compare, outro: Outro, image: ImageScene,
};

/** 장면 진입/퇴장 전환을 장면마다 바꾼다 */
export const SceneView: React.FC<P> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const inS = spring({ frame, fps, config: { damping: 18, stiffness: 140 } });
  const out = interpolate(frame, [p.durationInFrames - 8, p.durationInFrames], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const isImage = p.scene.visual.type === 'image';
  const kind = isImage ? 'fade' : p.index === 0 ? 'zoom' : ['up', 'left', 'zoom', 'blur'][p.index % 4];
  const drift = isImage ? 1 : 1 + 0.03 * (frame / Math.max(1, p.durationInFrames)); // 느린 카메라 줌
  let transform = `scale(${drift})`, filter = 'none';
  if (kind === 'up') transform += ` translateY(${(1 - inS) * 160}px)`;
  if (kind === 'left') transform += ` translateX(${(1 - inS) * 220}px)`;
  if (kind === 'zoom') transform += ` scale(${0.82 + 0.18 * inS})`;
  if (kind === 'blur') filter = `blur(${(1 - inS) * 24}px)`;
  if (!isImage) transform += ` scale(${0.96 + 0.04 * out})`;
  const T = TEMPLATES[p.scene.visual.type] || Headline;
  return (
    <AbsoluteFill style={{ opacity: Math.min(inS * 1.4, 1) * out, transform, filter }}>
      <T {...p} />
    </AbsoluteFill>
  );
};
