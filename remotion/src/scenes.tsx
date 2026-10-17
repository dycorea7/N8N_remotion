import React from 'react';
import { AbsoluteFill, Audio, Easing, Img, interpolate, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import * as Lucide from 'lucide-react';
import { resolveSrc } from './assets';
import { Scene, Visual } from './types';
import { Theme, SANS_FONT } from './theme';

export type P = { scene: Scene; theme: Theme; index: number; durationInFrames: number; lang: string; category?: string; overlap?: number };

// ── 공통 도우미 ──
/** 가로 화면(롱폼)이면 true */
export const useLandscape = () => { const { width, height } = useVideoConfig(); return width > height; };

export const useSpring = (delay = 0, cfg: any = { damping: 15, stiffness: 160, mass: 0.7 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - delay, fps, config: cfg });
};

/** 장면 나레이션에서 phrase의 첫 낱말이 발음되는 시각(장면 기준 프레임). 못 찾으면 null */
export function spokenFrame(scene: Scene, phrase: string, fps: number): number | null {
  const key = String(phrase || '').replace(/[^\p{L}\p{N}]/gu, ' ').trim().split(/\s+/)[0];
  if (!key || key.length < 1) return null;
  const k = key.length > 2 ? key.slice(0, Math.max(2, key.length - 1)) : key; // 조사 붙은 경우 대비
  const w = scene.words.find(x => x.text.replace(/[^\p{L}\p{N}]/gu, '').includes(k));
  return w ? Math.max(0, Math.round((w.start - scene.start) * fps)) : null;
}

/** 항목 등장 프레임: 말할 때 등장, 못 찾으면 장면 앞 60%에 고르게 */
export function revealFrames(scene: Scene, labels: string[], fps: number, dur: number): number[] {
  const even = labels.map((_, i) => Math.round(8 + i * (dur * 0.6) / Math.max(1, labels.length)));
  const spoken = labels.map(l => spokenFrame(scene, l, fps));
  let last = -1;
  return labels.map((_, i) => {
    // 말하는 순간에 맞추되, 고른 간격 시점보다 늦지는 않게 (화면이 오래 비지 않도록)
    let f = spoken[i] != null ? Math.min(Math.max(4, (spoken[i] as number) - 4), even[i]) : even[i];
    if (f <= last) f = last + 6; // 순서 보장
    last = f;
    return Math.min(f, Math.max(0, dur - 20));
  });
}

// ── 효과음 (public/sfx, tools/make_sfx.py로 합성) ──
const SFX_GAIN = 1;
export const Sfx: React.FC<{ name: 'whoosh' | 'pop' | 'tick' | 'chime' | 'check' | 'swell'; at?: number; volume?: number }> = ({ name, at = 0, volume = 0.3 }) => {
  const { fps } = useVideoConfig();
  return (
    <Sequence from={Math.max(0, Math.round(at))} durationInFrames={Math.round(fps * 2)} layout="none" name={`sfx:${name}`}>
      <Audio src={staticFile(`sfx/${name}.mp3`)} volume={volume * SFX_GAIN} />
    </Sequence>
  );
};

// ── 이모지 → 선 아이콘 (Lucide). 모르는 이모지는 카테고리 기본 아이콘 ──
const EMOJI_ICON: [RegExp, keyof typeof Lucide][] = [
  [/🔥/u, 'Flame'], [/💰|🪙|💴|💵|💶|💷/u, 'Coins'], [/💸|💳/u, 'CreditCard'], [/🏦/u, 'Landmark'], [/🐷|🐖/u, 'PiggyBank'], [/👛|👝/u, 'Wallet'],
  [/📈|📊|💹/u, 'TrendingUp'], [/📉/u, 'TrendingDown'], [/⏰|🕐|🕑|🕒|🕓|🕔|🕕|🕖|🕗|🕘|🕙|🕚|🕛|⌚/u, 'Clock'], [/⏳|⌛/u, 'Hourglass'], [/⏱️?|⏲️?/u, 'Timer'],
  [/📅|📆|🗓️?/u, 'CalendarDays'], [/❤️|❤|💖|💗|💕|🧡|💛|💚|💙|💜|🤍/u, 'Heart'], [/💔/u, 'HeartCrack'], [/🫀|💓|🩺/u, 'HeartPulse'],
  [/🧠/u, 'Brain'], [/💡/u, 'Lightbulb'], [/⚠️?|🚨|⛔|🚫/u, 'TriangleAlert'], [/✅|✔️?|☑️?/u, 'CircleCheck'], [/❌|✖️?/u, 'CircleX'],
  [/🙏/u, 'HandHeart'], [/✝️?|⛪|🛐/u, 'Church'], [/📖|📚|📕|📗|📘|📙/u, 'BookOpen'], [/🕊️?/u, 'Bird'], [/✨|🌟|⭐/u, 'Sparkles'],
  [/🌙|😴|💤|🛌/u, 'Moon'], [/☀️?|🌞/u, 'Sun'], [/🌅|🌄/u, 'Sunrise'], [/🌱|🌿|🍀/u, 'Sprout'], [/🍃|🍂|🍁/u, 'Leaf'], [/⛰️?|🏔️?|🗻/u, 'Mountain'],
  [/💧|💦/u, 'Droplets'], [/🌊/u, 'Waves'], [/🌧️?|☔|⛈️?/u, 'CloudRain'], [/🎯/u, 'Target'], [/🔑|🗝️?/u, 'Key'], [/🛡️?/u, 'Shield'], [/🔒|🔐/u, 'Lock'],
  [/🏠|🏡/u, 'House'], [/📱|📲/u, 'Smartphone'], [/📝|✍️?|🖊️?|✏️?/u, 'NotebookPen'], [/💪|🏋️?/u, 'Dumbbell'], [/🍎|🍏|🥗|🥦/u, 'Apple'], [/💊|💉/u, 'Pill'],
  [/🏃|🚶|👣/u, 'Footprints'], [/🍽️?|🍚|🍜/u, 'Utensils'], [/☕|🍵/u, 'Coffee'], [/👥|👨‍👩‍👧|👪|🫂/u, 'Users'], [/🤝/u, 'Handshake'], [/💬|🗨️?|🗣️?/u, 'MessageCircle'],
  [/👀|👁️?/u, 'Eye'], [/🎁/u, 'Gift'], [/👑/u, 'Crown'], [/🧭/u, 'Compass'], [/🚀/u, 'Rocket'], [/⚖️?/u, 'Scale'], [/⚡/u, 'Zap'], [/♾️?|🔁|🔄/u, 'Repeat'],
  [/🧩/u, 'Puzzle'], [/⚓/u, 'Anchor'], [/🚩|🏁/u, 'Flag'], [/🎵|🎶/u, 'Music'], [/💼/u, 'Briefcase'], [/🎓/u, 'GraduationCap'], [/👍/u, 'ThumbsUp'],
  [/😊|😀|😄|🙂|😁/u, 'Smile'], [/😢|😞|😔|😟|😥/u, 'Frown'], [/😡|😠|🤬/u, 'Angry'], [/💎/u, 'Gem'], [/🗺️?/u, 'Map'], [/%|💯/u, 'Percent'],
];
const CATEGORY_ICON: Record<string, keyof typeof Lucide> = { bible: 'BookOpen', health: 'HeartPulse', wealth: 'Coins', quote: 'Quote', other: 'Sparkles' };
export function iconFor(emoji?: string, category?: string): React.FC<any> {
  const hit = emoji ? EMOJI_ICON.find(([re]) => re.test(emoji)) : null;
  const name = (hit && hit[1]) || CATEGORY_ICON[category || 'other'] || 'Sparkles';
  return ((Lucide as any)[name] || Lucide.Sparkles) as React.FC<any>;
}

/** 둥근 배지 안의 선 아이콘. 천천히 떠다니고 빛이 돈다 */
const IconBadge: React.FC<{ e?: string; theme: Theme; category?: string; size?: number; delay?: number; always?: boolean }> = ({ e, theme, category, size = 170, delay = 0, always }) => {
  const s = useSpring(delay, { damping: 10, stiffness: 140 });
  const frame = useCurrentFrame();
  if (!e && !always) return null;
  const Icon = iconFor(e, category);
  return (
    <div style={{ position: 'relative', width: size, height: size, marginBottom: 40, transform: `scale(${s}) translateY(${Math.sin(frame / 16) * 6}px)` }}>
      <div style={{ position: 'absolute', inset: -size * 0.14, borderRadius: '50%', background: `conic-gradient(from ${frame * 2}deg, transparent 0deg, ${theme.accent} 60deg, transparent 140deg, ${theme.accent2} 220deg, transparent 300deg)`, opacity: 0.55, filter: 'blur(6px)' }} />
      <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: `radial-gradient(circle at 35% 30%, rgba(255,255,255,0.18), ${theme.card} 60%)`, border: `3px solid ${theme.cardBorder}`, boxShadow: `0 20px 60px rgba(0,0,0,0.35), inset 0 0 40px ${theme.blobA}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={size * 0.5} color={theme.accent} strokeWidth={1.8} />
      </div>
    </div>
  );
};

export const Kicker: React.FC<{ text?: string; theme: Theme; delay?: number }> = ({ text, theme, delay = 0 }) => {
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
export const KineticText: React.FC<{ text: string; highlight?: string[]; theme: Theme; size: number; font?: string; delay?: number; stagger?: number; lang: string }> = ({ text, highlight = [], theme, size, font, delay = 0, stagger = 3, lang }) => {
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

export const fmt = (v: number, d: number, lang: string) => v.toLocaleString(lang === 'ko' ? 'ko-KR' : 'en-US', { minimumFractionDigits: d, maximumFractionDigits: d });

// ── 장면 템플릿 ──
const Headline: React.FC<P> = ({ scene, theme, lang, category }) => {
  const v = scene.visual;
  const len = (v.text || '').length;
  const size = lang === 'ko' ? (len > 22 ? 96 : len > 12 ? 118 : 140) : (len > 34 ? 88 : len > 18 ? 104 : 124);
  return (
    <Center>
      <IconBadge e={v.emoji} theme={theme} category={category} always={v.type === 'icon'} size={v.type === 'icon' ? 230 : 170} />
      <KineticText text={v.text || ''} highlight={v.highlight} theme={theme} size={size} lang={lang} delay={v.emoji || v.type === 'icon' ? 6 : 0} />
    </Center>
  );
};

const Stat: React.FC<P> = ({ scene, theme, lang, durationInFrames }) => {
  const v = scene.visual;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const target = v.value || 0;
  // 숫자는 장면 시작과 함께 올라간다 (말할 때까지 0으로 멈춰 있지 않게). 나레이션이 일찍 말하면 그때에 맞춘다.
  const spokenAt = spokenFrame(scene, fmt(target, 0, 'en').replace(/,/g, ''), fps);
  const startF = Math.min(10, Math.max(4, (spokenAt ?? 10) - 10));
  const countLen = Math.round(Math.min(48, durationInFrames * 0.45));
  const p = interpolate(frame, [startF, startF + countLen], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.exp) });
  const tickAt = Array.from({ length: 7 }, (_, k) => startF + Math.round(countLen * (1 - Math.pow(1 - (k + 1) / 8, 2.2))));
  const shown = fmt(target * p, v.decimals || 0, lang);
  const isPct = /%|퍼센트/.test(v.suffix || '') && target <= 100;
  const pop = spring({ frame: frame - startF - countLen, fps, config: { damping: 8, stiffness: 200 } });
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
      {tickAt.map((f, k) => <Sfx key={k} name="tick" at={f} volume={0.16} />)}
      <Sfx name="pop" at={startF + countLen} volume={0.28} />
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
      {at.map((f, i) => <Sfx key={i} name="pop" at={f} volume={0.18} />)}
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
      {at.map((f, i) => <Sfx key={i} name="pop" at={f} volume={0.26} />)}
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
        {scripture && <Sfx name="chime" at={2} volume={0.22} />}
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

const Outro: React.FC<P> = ({ scene, theme, lang, category }) => {
  const v = scene.visual;
  const frame = useCurrentFrame();
  const cta = useSpring(20, { damping: 10, stiffness: 160 });
  const press = 1 - 0.06 * Math.max(0, Math.sin((frame - 40) / 9)) * (frame > 40 ? 1 : 0);
  return (
    <Center>
      <IconBadge e={v.emoji} theme={theme} category={category} />
      <KineticText text={v.text || ''} highlight={v.highlight} theme={theme} size={lang === 'ko' ? 104 : 96} lang={lang} />
      <Sfx name="swell" at={0} volume={0.22} />
      {v.cta && <Sfx name="pop" at={20} volume={0.3} />}
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
  const landscape = useLandscape();
  const size = landscape ? (lang === 'ko' ? (len > 14 ? 70 : 84) : (len > 24 ? 62 : 76)) : lang === 'ko' ? (len > 14 ? 78 : 92) : (len > 24 ? 70 : 84);
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ transform: `scale(${scale}) translate(${tx}px, ${ty}px)` }}>
        <Img src={resolveSrc(v.src)!} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </AbsoluteFill>
      {/* 위: 키워드 가독성, 아래: 자막 가독성 */}
      <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.62) 0%, rgba(0,0,0,0.08) 30%, rgba(0,0,0,0.05) 52%, rgba(0,0,0,0.55) 72%, rgba(0,0,0,0.72) 100%)' }} />
      {v.text && (
        <AbsoluteFill style={landscape
          ? { top: 70, height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 220px' }
          : { top: 250, height: 420, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 70px' }}>
          <KineticText text={v.text} highlight={v.highlight} theme={theme} size={size} lang={lang} delay={6} />
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};

export const Center: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const landscape = useLandscape();
  if (landscape) {
    // 롱폼 16:9: 세로용으로 만든 장면을 1780×911 가상 화면에 그리고 0.9배로 줄여 자막 위(30~850px)에 둔다
    return (
      <AbsoluteFill style={{ top: 30, height: 820, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ flex: 'none', width: 1780, height: 911, transform: 'scale(0.9)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 70px', position: 'relative' }}>{children}</div>
      </AbsoluteFill>
    );
  }
  // 쇼츠: 그래픽은 위 220px(상단 UI)와 자막 영역(1260~) 사이에 배치
  return <AbsoluteFill style={{ top: 230, height: 1010, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 70px' }}>{children}</AbsoluteFill>;
};

/** 롱폼 챕터 표지: 큰 번호 + 제목 */
const ChapterCard: React.FC<P> = ({ scene, theme, lang }) => {
  const v = scene.visual;
  const frame = useCurrentFrame();
  const n = useSpring(0, { damping: 12, stiffness: 120 });
  const line = interpolate(frame, [6, 26], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) });
  const len = (v.title || v.text || '').length;
  const size = lang === 'ko' ? (len > 18 ? 104 : 128) : (len > 30 ? 92 : 112);
  return (
    <Center>
      <div style={{ fontFamily: SANS_FONT, fontWeight: 900, fontSize: 64, letterSpacing: 8, color: theme.accent, opacity: n, transform: `translateY(${(1 - n) * 30}px)` }}>
        {lang === 'ko' ? `PART ${v.number || ''}` : `CHAPTER ${v.number || ''}`}
      </div>
      <div style={{ width: 640 * line, height: 6, borderRadius: 3, background: `linear-gradient(90deg, transparent, ${theme.accent}, transparent)`, margin: '34px 0 44px' }} />
      <KineticText text={v.title || v.text || ''} highlight={v.highlight} theme={theme} size={size} font={theme.headlineFont} lang={lang} delay={10} />
      <Sfx name="chime" at={0} volume={0.3} />
    </Center>
  );
};

/** 타임라인: 왼쪽 세로선이 그려지며 단계/연도가 차례로 */
const Timeline: React.FC<P> = ({ scene, theme, durationInFrames }) => {
  const v = scene.visual;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const items = (v.items || []) as { label: string; text: string }[];
  const at = revealFrames(scene, items.map(i => i.text || i.label), fps, durationInFrames);
  const lastAt = at[at.length - 1] || 0;
  const line = interpolate(frame, [at[0] || 0, lastAt + 12], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <Center>
      <Kicker text={v.title} theme={theme} />
      <div style={{ position: 'relative', width: 900, display: 'flex', flexDirection: 'column', gap: 38, paddingLeft: 70 }}>
        <div style={{ position: 'absolute', left: 24, top: 30, width: 6, borderRadius: 3, height: `calc(${line * 100}% - 60px)`, background: `linear-gradient(180deg, ${theme.accent}, ${theme.accent2})` }} />
        {items.map((it, i) => {
          const s = spring({ frame: frame - at[i], fps, config: { damping: 14, stiffness: 150 } });
          const current = frame >= at[i] && (i === items.length - 1 || frame < at[i + 1]);
          return (
            <div key={i} style={{ position: 'relative', opacity: s, transform: `translateX(${(1 - s) * 80}px)` }}>
              <div style={{ position: 'absolute', left: -62, top: 18, width: 34, height: 34, borderRadius: 17, background: current ? theme.accent : theme.bg2, border: `5px solid ${theme.accent}`, boxShadow: current ? `0 0 30px ${theme.blobA}` : 'none', transform: `scale(${s})` }} />
              <div style={{ fontFamily: SANS_FONT, fontWeight: 900, fontSize: 46, color: theme.accent, letterSpacing: 1 }}>{it.label}</div>
              <div style={{ fontFamily: SANS_FONT, fontWeight: 800, fontSize: 56, color: current ? theme.fg : theme.muted, lineHeight: 1.2, wordBreak: 'keep-all' }}>{it.text}</div>
            </div>
          );
        })}
      </div>
      {at.map((f, i) => <Sfx key={i} name="pop" at={f} volume={0.24} />)}
    </Center>
  );
};

/** 체크리스트: 항목을 말할 때 체크 표시가 그려진다 */
const Checklist: React.FC<P> = ({ scene, theme, durationInFrames }) => {
  const v = scene.visual;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const items = (v.items || []) as string[];
  const at = revealFrames(scene, items, fps, durationInFrames);
  const CheckIcon = Lucide.Check;
  return (
    <Center>
      <Kicker text={v.title} theme={theme} />
      <div style={{ width: 920, display: 'flex', flexDirection: 'column', gap: 28 }}>
        {items.map((it, i) => {
          const appear = spring({ frame: frame - (at[i] - 10), fps, config: { damping: 16, stiffness: 140 } });
          const tick = spring({ frame: frame - at[i], fps, config: { damping: 9, stiffness: 220 } });
          const done = frame >= at[i];
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 34, padding: '28px 36px', borderRadius: 32, background: done ? theme.card : 'rgba(255,255,255,0.03)', border: `2px solid ${done ? theme.accent : theme.cardBorder}`, opacity: Math.max(0.35, appear), transform: `translateY(${(1 - appear) * 30}px)` }}>
              <div style={{ width: 88, height: 88, flex: 'none', borderRadius: 24, border: `4px solid ${done ? theme.accent : 'rgba(255,255,255,0.3)'}`, background: done ? theme.accent : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ transform: `scale(${tick})` }}><CheckIcon size={62} color={theme.bg1} strokeWidth={3.5} /></div>
              </div>
              <div style={{ fontFamily: SANS_FONT, fontWeight: 800, fontSize: 54, color: done ? theme.fg : theme.muted, lineHeight: 1.2, wordBreak: 'keep-all', textDecoration: 'none' }}>{it}</div>
            </div>
          );
        })}
      </div>
      {at.map((f, i) => <Sfx key={i} name="check" at={f} volume={0.26} />)}
    </Center>
  );
};

/** 아이콘 그리드: 2~4칸, 각 칸에 아이콘 + 짧은 라벨 */
const IconGrid: React.FC<P> = ({ scene, theme, durationInFrames, category }) => {
  const v = scene.visual;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const items = (v.items || []) as { emoji?: string; label: string }[];
  const at = revealFrames(scene, items.map(i => i.label), fps, durationInFrames);
  const cols = items.length === 3 ? 3 : 2;
  const cell = cols === 3 ? 290 : 420;
  return (
    <Center>
      <Kicker text={v.title} theme={theme} />
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 34, width: cols * cell + (cols - 1) * 34 }}>
        {items.map((it, i) => {
          const s = spring({ frame: frame - at[i], fps, config: { damping: 11, stiffness: 160 } });
          const Icon = iconFor(it.emoji, category);
          const current = frame >= at[i] && (i === items.length - 1 || frame < at[i + 1]);
          return (
            <div key={i} style={{ width: cell, padding: '44px 20px 38px', borderRadius: 40, background: current ? theme.card : 'rgba(255,255,255,0.04)', border: `2px solid ${current ? theme.accent : theme.cardBorder}`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 26, opacity: s, transform: `scale(${0.7 + 0.3 * s})` }}>
              <Icon size={cols === 3 ? 110 : 130} color={current ? theme.accent : theme.fg} strokeWidth={1.7} />
              <div style={{ fontFamily: SANS_FONT, fontWeight: 800, fontSize: cols === 3 ? 44 : 52, color: theme.fg, textAlign: 'center', wordBreak: 'keep-all', lineHeight: 1.2 }}>{it.label}</div>
            </div>
          );
        })}
      </div>
      {at.map((f, i) => <Sfx key={i} name="pop" at={f} volume={0.24} />)}
    </Center>
  );
};

export const TEMPLATES: Record<Visual['type'], React.FC<P>> = {
  headline: Headline, icon: Headline, stat: Stat, chart: Chart, list: List,
  quote: QuoteCard, scripture: (p) => <QuoteCard {...p} scripture />, compare: Compare, outro: Outro, image: ImageScene, chapter: ChapterCard,
  timeline: Timeline, checklist: Checklist, iconGrid: IconGrid,
};

/** 장면 진입/퇴장 전환을 장면마다 바꾼다.
 *  overlap: 다음 장면과 겹치는 프레임 수 — 이 구간에서 이 장면이 사라지고 다음 장면이 나타난다(크로스페이드, 화면이 어두워지지 않음). */
export const SceneView: React.FC<P> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ov = Math.max(0, p.overlap ?? 0);
  const inS = spring({ frame, fps, config: { damping: 18, stiffness: 140 } });
  const outLen = ov > 0 ? ov : 8;
  // 겹치는 구간에서는 빠르게 사라진다 (다음 장면이 들어오는 동안 글자가 오래 겹치지 않게)
  const out = interpolate(frame, [p.durationInFrames - outLen, p.durationInFrames - (ov > 0 ? 1 : 0)], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.quad) });
  const type = p.scene.visual.type;
  const isImage = type === 'image';
  const KINDS = ['up', 'wipe', 'left', 'circle', 'zoom', 'blur'];
  const kind = isImage ? (p.index % 3 === 0 ? 'circle' : 'fade') : p.index === 0 ? 'zoom' : type === 'chapter' ? 'wipe' : KINDS[p.index % KINDS.length];
  const drift = isImage ? 1 : 1 + 0.03 * (frame / Math.max(1, p.durationInFrames)); // 느린 카메라 줌
  let transform = `scale(${drift})`, filter = 'none', clipPath: string | undefined;
  if (kind === 'up') transform += ` translateY(${(1 - inS) * 160}px)`;
  if (kind === 'left') transform += ` translateX(${(1 - inS) * 220}px)`;
  if (kind === 'zoom') transform += ` scale(${0.82 + 0.18 * inS})`;
  if (kind === 'blur') filter = `blur(${(1 - inS) * 24}px)`;
  const reveal = interpolate(frame, [0, 14], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) });
  if (kind === 'wipe' && reveal < 1) clipPath = `inset(0 ${(1 - reveal) * 100}% 0 0)`;
  if (kind === 'circle' && reveal < 1) clipPath = `circle(${reveal * 75}% at 50% 45%)`;
  if (!isImage) transform += ` scale(${0.96 + 0.04 * out})`;
  const fadeIn = kind === 'wipe' || kind === 'circle' ? 1 : Math.min(inS * 1.4, 1);
  const T = TEMPLATES[type] || Headline;
  // 전환 효과음: 장면이 바뀔 때 '휙' (챕터·성경 구절은 종소리가 대신, 같은 종류가 이어지면 더 작게)
  const whoosh = p.index > 0 && type !== 'chapter' && type !== 'scripture';
  return (
    <AbsoluteFill style={{ opacity: fadeIn * out, transform, filter, clipPath }}>
      <T {...p} />
      {whoosh && <Sfx name="whoosh" at={0} volume={isImage ? 0.2 : 0.13} />}
    </AbsoluteFill>
  );
};
