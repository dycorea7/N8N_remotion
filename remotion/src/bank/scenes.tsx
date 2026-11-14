import React from 'react';
import { AbsoluteFill, Img, useCurrentFrame, useVideoConfig } from 'remotion';
import * as Lucide from 'lucide-react';
import { Media } from '../Media';
import { resolveSrc } from '../assets';
import { Caption } from '../types';
import { Center, P, Sfx, TEMPLATES, counterProgress, counterTiming, fmt, iconFor, revealFrames, useLandscape } from '../scenes';
import { C, F, SHADOW, back, barcode, clamp01, easeOut, pad2, zigzag } from './util';

// ── 공통 ──
const isHl = (w: string, hl: string[]) => { const c = w.replace(/[^\p{L}\p{N}%]/gu, ''); return c.length > 0 && hl.some(h => { const x = h.replace(/[^\p{L}\p{N}%]/gu, ''); return x && (c.includes(x) || (x.includes(c) && c.length > 1)); }); };
const hlList = (v: any) => (v.highlight || []).flatMap((h: string) => String(h).split(/\s+/)).filter(Boolean);
const ko = (lang: string, k: string, e: string) => (lang === 'ko' ? k : e);

/** 등장: at 프레임부터 len 프레임 동안 0→1 */
const useIn = (at = 0, len = 10, curve: (x: number) => number = easeOut) => curve(clamp01((useCurrentFrame() - at) / len));

/** 앱 바탕. 사진 배경(bgSrc)이 있으면 흐리게 깔고 밝은 회색으로 덮는다 (유리 같은 앱 화면) */
const BgCtx = React.createContext<{ src?: string; video?: string; videoStart?: number; dur: number; index: number }>({ dur: 150, index: 0 });
const Bg: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const ctx = React.useContext(BgCtx);
  const f = useCurrentFrame();
  const z = 1.12 + 0.05 * clamp01(f / Math.max(1, ctx.dur));
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      {ctx.src && (
        <AbsoluteFill style={{ overflow: 'hidden' }}>
          <AbsoluteFill style={{ transform: `scale(${z})`, filter: 'blur(14px) saturate(1.1)' }}>{ctx.video
            ? <Media video={ctx.video} videoStart={ctx.videoStart} />
            : <Img src={resolveSrc(ctx.src)!} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}</AbsoluteFill>
          <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(241,243,246,0.80), rgba(241,243,246,0.90))' }} />
        </AbsoluteFill>
      )}
      {children}
    </AbsoluteFill>
  );
};

/** 흰 카드 (아래에서 떠오르며 등장) */
const Card: React.FC<{ at?: number; w?: number | string; pad?: string | number; style?: React.CSSProperties; children: React.ReactNode; from?: 'up' | 'left' | 'right' | 'pop' }> = ({ at = 0, w, pad = 48, style, children, from = 'up' }) => {
  const e = useIn(at, 12, from === 'pop' ? back : easeOut);
  const tr = from === 'left' ? `translateX(${-(1 - e) * 120}px)` : from === 'right' ? `translateX(${(1 - e) * 120}px)` : from === 'pop' ? `scale(${0.85 + 0.15 * e})` : `translateY(${(1 - e) * 70}px)`;
  return <div style={{ position: 'relative', width: w, background: C.card, borderRadius: 44, boxShadow: SHADOW, padding: pad, opacity: Math.min(1, e * 1.6), transform: tr, ...style }}>{children}</div>;
};

/** 둥근 꼬리표 */
const Chip: React.FC<{ text: string; color?: string; bg?: string; size?: number; icon?: React.ReactNode; style?: React.CSSProperties }> = ({ text, color = C.blue, bg = C.blueSoft, size = 30, icon, style }) => (
  <div style={{ display: 'inline-flex', alignItems: 'center', gap: size * 0.3, padding: `${size * 0.3}px ${size * 0.7}px`, borderRadius: 999, background: bg, color, fontFamily: F.sans, fontWeight: 800, fontSize: size, letterSpacing: -0.5, whiteSpace: 'nowrap', ...style }}>{icon}{text}</div>
);

/** 둥근 사각 아이콘 타일 */
const Tile: React.FC<{ I: React.FC<any>; size: number; color?: string; bg?: string }> = ({ I, size, color = C.blue, bg = C.blueSoft }) => (
  <div style={{ width: size, height: size, borderRadius: size * 0.3, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}><I size={size * 0.52} color={color} strokeWidth={2.3} /></div>
);

/** 강조 단어: 파란 글자 + 아래에서 차오르는 연한 파란 띠 */
const Hl: React.FC<{ at: number; children: React.ReactNode }> = ({ at, children }) => {
  const e = useIn(at, 8);
  return (
    <span style={{ position: 'relative', display: 'inline-block', zIndex: 0, color: e > 0.2 ? C.blue : C.ink }}>
      <span style={{ position: 'absolute', left: '-0.08em', right: '-0.08em', bottom: '0.06em', height: '0.36em', borderRadius: '0.12em', background: C.blueSoft, zIndex: -1, transform: `scaleX(${e})`, transformOrigin: 'left' }} />
      {children}
    </span>
  );
};

/** 제목 줄 (카드 위 작은 머리글) */
const Title: React.FC<{ text?: string; at?: number; size?: number }> = ({ text, at = 0, size = 54 }) => {
  const e = useIn(at, 10);
  if (!text) return null;
  return <div style={{ fontFamily: F.sans, fontWeight: 800, fontSize: size, color: C.ink, letterSpacing: -1.5, lineHeight: 1.2, marginBottom: 34, wordBreak: 'keep-all', opacity: e, transform: `translateY(${(1 - e) * 20}px)` }}>{text}</div>;
};

/** 줄 나누기: 한 줄 최대 maxChars자 (단어 단위) */
function lines(text: string, maxChars: number): string[] {
  const out: string[] = [];
  for (const w of text.split(/\s+/).filter(Boolean)) { const last = out[out.length - 1]; if (last && [...(last + ' ' + w)].length <= maxChars) out[out.length - 1] = last + ' ' + w; else out.push(w); }
  return out;
}

/** 토글 스위치 */
const Toggle: React.FC<{ at: number; size?: number }> = ({ at, size = 1 }) => {
  const e = useIn(at, 7);
  const W = 120 * size, H = 70 * size, k = 58 * size;
  return (
    <div style={{ position: 'relative', width: W, height: H, borderRadius: H, background: e > 0.5 ? C.blue : '#d5dae1', flex: 'none', transition: 'none' }}>
      <div style={{ position: 'absolute', top: (H - k) / 2, left: (H - k) / 2 + e * (W - H), width: k, height: k, borderRadius: '50%', background: '#fff', boxShadow: '0 3px 8px rgba(0,0,0,0.18)' }} />
    </div>
  );
};

// ── 장면 ──

/** 헤드라인: 알림 꼬리표 + 크게 한 줄씩 올라오는 글자 */
const Headline: React.FC<P> = ({ scene, index, lang, category }) => {
  const v = scene.visual;
  const land = useLandscape();
  const text = v.text || '';
  const n = [...text.replace(/\s/g, '')].length;
  const size = lang === 'ko' ? (n <= 6 ? 160 : n <= 10 ? 132 : n <= 14 ? 112 : 96) : (n <= 12 ? 124 : n <= 22 ? 100 : 84);
  const ls = lines(text, lang === 'ko' ? (n <= 10 ? 5 : land ? 9 : 7) : land ? 22 : 14);
  const hl = hlList(v);
  const I = v.emoji ? iconFor(v.emoji, category) : Lucide.BellRing;
  const f = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Bg />
      <Center>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: land ? 'center' : 'flex-start', width: land ? 1500 : 920 }}>
          <div style={{ opacity: useIn(0, 8), transform: `translateY(${(1 - useIn(0, 8)) * -30}px)`, marginBottom: 40 }}>
            <Chip text={ko(lang, `알림 ${pad2(index + 1)}`, `ALERT ${pad2(index + 1)}`)} icon={<I size={34} color={C.blue} strokeWidth={2.4} style={{ transform: `rotate(${Math.sin(f / 2.2) * 14 * (1 - clamp01(f / 18))}deg)` }} />} size={32} />
          </div>
          {ls.map((ln, i) => {
            const e = easeOut(clamp01((f - 4 - i * 4) / 10));
            return (
              <div key={i} style={{ overflow: 'hidden', padding: '0 0.05em' }}>
                <div style={{ fontFamily: F.sans, fontWeight: 900, fontSize: size, lineHeight: 1.18, color: C.ink, letterSpacing: -size * 0.04, whiteSpace: 'nowrap', transform: `translateY(${(1 - e) * 105}%)`, textAlign: land ? 'center' : 'left' }}>
                  {ln.split(' ').map((w, k) => <React.Fragment key={k}>{k > 0 && ' '}{isHl(w, hl) ? <Hl at={14 + i * 4}>{w}</Hl> : w}</React.Fragment>)}
                </div>
              </div>
            );
          })}
        </div>
      </Center>
      <Sfx name="pop" at={0} volume={0.18} />
    </AbsoluteFill>
  );
};

/** 숫자: 계좌 잔액 화면 (계좌 줄 + 크게 올라가는 금액 + 버튼 두 개) */
const Stat: React.FC<P> = ({ scene, index, lang, durationInFrames }) => {
  const v = scene.visual;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const land = useLandscape();
  const target = v.value || 0;
  const tm = counterTiming(scene, target, fps, durationInFrames);
  const p = counterProgress(frame, tm);
  const shown = fmt(p >= 1 ? target : target * p, v.decimals || 0, lang);
  const nChars = [...shown].length + [...(v.prefix || '')].length + [...(v.suffix || '')].length * 0.6;
  const size = nChars > 10 ? 120 : nChars > 7 ? 150 : nChars > 4 ? 190 : 230;
  const done = frame >= tm.endF;
  const pulse = done ? 1 + 0.05 * Math.sin(clamp01((frame - tm.endF) / 8) * Math.PI) : 1;
  const W = land ? 1200 : 920;
  return (
    <AbsoluteFill>
      <Bg />
      <Center>
        <Card w={W} pad={land ? '56px 70px' : '52px 56px'}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <Tile I={Lucide.Landmark} size={86} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: F.sans, fontWeight: 800, fontSize: 40, color: C.ink, letterSpacing: -1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v.label || ko(lang, '내 통장', 'My account')}</div>
            </div>
            <Lucide.ChevronRight size={44} color={C.gray} />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', flexWrap: 'nowrap', marginTop: 50, color: C.ink, fontFamily: F.sans, fontWeight: 900, transform: `scale(${pulse})`, transformOrigin: 'left center' }}>
            {v.prefix && <span style={{ fontSize: size * 0.5, marginRight: 10 }}>{v.prefix}</span>}
            <span style={{ fontSize: size, letterSpacing: -size * 0.045, lineHeight: 1, fontVariantNumeric: 'tabular-nums', color: done ? C.blue : C.ink }}>{shown}</span>
            {v.suffix && <span style={{ fontSize: size * 0.42, marginLeft: 12 }}>{v.suffix}</span>}
          </div>
          {v.sub && <div style={{ fontFamily: F.sans, fontWeight: 600, fontSize: 34, color: C.gray, marginTop: 22, opacity: clamp01((frame - tm.endF) / 6), wordBreak: 'keep-all' }}>{v.sub}</div>}
          {/* 숫자가 올라가는 만큼 차오르는 막대 (버튼 같은 꾸밈 글자는 넣지 않는다) */}
          <div style={{ height: 22, borderRadius: 11, background: C.bg, marginTop: 46, overflow: 'hidden' }}>
            <div style={{ width: `${p * 100}%`, height: '100%', borderRadius: 11, background: C.blue }} />
          </div>
        </Card>
      </Center>
      {Array.from({ length: 6 }, (_, k) => <Sfx key={k} name="tick" at={tm.startF + Math.round(tm.countLen * (1 - Math.pow(1 - (k + 1) / 7, 2)))} volume={0.12} />)}
      <Sfx name="chime" at={tm.endF} volume={0.2} />
    </AbsoluteFill>
  );
};

/** 차트: 소비 분석 (가로 막대, 가장 큰 항목만 파랑) */
const Chart: React.FC<P> = ({ scene, lang, durationInFrames }) => {
  const v = scene.visual;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const land = useLandscape();
  const items = (v.items || []) as { label: string; value: number }[];
  const max = Math.max(...items.map(i => i.value), 1);
  const top = items.reduce((b, it, i) => (it.value > items[b].value ? i : b), 0);
  const at = revealFrames(scene, items.map(i => i.label), fps, durationInFrames);
  const W = land ? 1300 : 920;
  return (
    <AbsoluteFill>
      <Bg />
      <Center>
        <Card w={W} pad={land ? '56px 70px' : '52px 52px 60px'}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 46 }}>
            <div style={{ fontFamily: F.sans, fontWeight: 800, fontSize: 48, color: C.ink, letterSpacing: -1.2, wordBreak: 'keep-all' }}>{v.title || ko(lang, '이번 달 분석', 'This month')}</div>
            <Chip text={v.unit || ko(lang, '분석', 'Stats')} size={26} bg={C.bg} color={C.ink2} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: items.length > 3 ? 44 : land ? 50 : 64 }}>
            {items.map((it, i) => {
              const e = easeOut(clamp01((frame - at[i]) / 14));
              const best = i === top && items.length > 1;
              return (
                <div key={i} style={{ opacity: clamp01((frame - at[i] + 4) / 6) }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
                    <span style={{ fontFamily: F.sans, fontWeight: 700, fontSize: land ? 40 : 46, color: C.ink2 }}>{it.label}</span>
                    <span style={{ fontFamily: F.sans, fontWeight: 900, fontSize: land ? 46 : 58, color: best ? C.blue : C.ink, fontVariantNumeric: 'tabular-nums' }}>{fmt(it.value * e, Math.min(2, (String(it.value).split('.')[1] || '').length), lang)}{v.unit ? <span style={{ fontSize: 32, marginLeft: 4 }}>{v.unit}</span> : null}</span>
                  </div>
                  <div style={{ height: land ? 34 : 44, borderRadius: 22, background: C.bg, overflow: 'hidden' }}>
                    <div style={{ width: `${Math.max(3, (it.value / max) * 100 * e)}%`, height: '100%', borderRadius: 22, background: best ? C.blue : '#b9c9f5' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </Center>
      {at.map((f, i) => <Sfx key={i} name="tick" at={f} volume={0.16} />)}
    </AbsoluteFill>
  );
};

/** 목록: 영수증이 프린터에서 한 줄씩 출력된다 */
const Receipt: React.FC<P> = ({ scene, index, lang, durationInFrames }) => {
  const v = scene.visual;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const land = useLandscape();
  const items = (v.items || []) as string[];
  const at = revealFrames(scene, items, fps, durationInFrames);
  const W = land ? 900 : 820;
  const headH = v.title ? 250 : 170, rowH = land ? 92 : items.length > 3 ? 104 : 116, footH = 230;
  const H = headH + rowH * items.length + footH;
  const lastAt = Math.max(...at, 0) + 10;
  // 지금까지 출력된 길이: 위(머리글)부터 아래로, 항목을 말할 때마다 한 줄씩 더 나온다
  const shown = headH * easeOut(clamp01(frame / 8)) + items.reduce((s, _, i) => s + rowH * easeOut(clamp01((frame - at[i]) / 6)), 0) + footH * easeOut(clamp01((frame - lastAt) / 10));
  const slotW = W + 80;
  const jitter = frame < lastAt + 10 ? Math.sin(frame * 2.3) * 1.2 : 0;
  const mono = (s: string, size: number, weight = 700, color = C.paperInk) => <span style={{ fontFamily: F.mono, fontWeight: weight, fontSize: size, color, letterSpacing: 1 }}>{s}</span>;
  const dash = <div style={{ height: 0, borderTop: `3px dashed rgba(38,36,31,0.35)`, margin: '0 0' }} />;
  const bars = barcode(index + 3);
  return (
    <AbsoluteFill>
      <Bg />
      <Center>
        <div style={{ position: 'relative', width: slotW, height: land ? 860 : 1000, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {/* 프린터 출구 */}
          <div style={{ position: 'relative', zIndex: 3, width: slotW, height: 64, borderRadius: 32, background: C.dark, boxShadow: '0 14px 30px rgba(20,26,35,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: W + 20, height: 12, borderRadius: 6, background: '#000' }} />
            <div style={{ position: 'absolute', right: 34, width: 14, height: 14, borderRadius: '50%', background: frame < lastAt + 10 && frame % 10 < 6 ? '#3ddc84' : '#2a3442' }} />
          </div>
          {/* 종이: 출구 아래로 출력된 만큼만 보인다 */}
          <div style={{ position: 'relative', zIndex: 2, width: W, height: Math.min(H, shown + 20), marginTop: -26, overflow: 'hidden' }}>
            <div style={{ position: 'absolute', left: 0, top: jitter, width: W, height: H, filter: 'drop-shadow(0 12px 18px rgba(20,26,35,0.14))' }}>
              <div style={{ position: 'absolute', inset: 0, background: C.paper, clipPath: zigzag(W, H) }} />
              <div style={{ position: 'relative', height: H, display: 'flex', flexDirection: 'column', padding: '0 54px' }}>
                <div style={{ height: headH, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', paddingBottom: 26, gap: 14, textAlign: 'center' }}>
                  {mono(ko(lang, '영 수 증', 'R E C E I P T'), 40)}
                  {mono(`NEXT YOU BANK · NO.${pad2(index + 1)}`, 24, 400, C.gray)}
                  {v.title && <div style={{ fontFamily: F.sans, fontWeight: 900, fontSize: 50, color: C.paperInk, letterSpacing: -1.2, marginTop: 8, wordBreak: 'keep-all', lineHeight: 1.15 }}>{v.title}</div>}
                </div>
                {dash}
                {items.map((it, i) => (
                  <div key={i} style={{ height: rowH, display: 'flex', alignItems: 'center', gap: 26, borderBottom: i < items.length - 1 ? '2px dotted rgba(38,36,31,0.18)' : 'none' }}>
                    {mono(pad2(i + 1), 34, 700, C.blue)}
                    <span style={{ flex: 1, fontFamily: F.sans, fontWeight: 800, fontSize: [...it].length > 10 ? 42 : 48, color: C.paperInk, letterSpacing: -1, wordBreak: 'keep-all', lineHeight: 1.15 }}>{it}</span>
                    {mono('✓', 38, 700, C.blue)}
                  </div>
                ))}
                {dash}
                <div style={{ height: footH - 6, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', paddingTop: 26, gap: 22 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>{mono(ko(lang, '합계', 'TOTAL'), 38)}{mono(ko(lang, `${items.length}가지`, `${items.length} ITEMS`), 38)}</div>
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'stretch', height: 70, gap: 3 }}>
                    {bars.map((b, k) => <div key={k} style={{ width: b * 2.4, background: k % 2 ? 'transparent' : C.paperInk }} />)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Center>
      {at.map((f, i) => <Sfx key={i} name="tick" at={f} volume={0.2} />)}
      <Sfx name="pop" at={lastAt} volume={0.16} />
    </AbsoluteFill>
  );
};

/** 할 일: 자동이체 설정 화면 — 말할 때마다 토글이 켜진다 */
const Toggles: React.FC<P> = ({ scene, lang, durationInFrames }) => {
  const v = scene.visual;
  const { fps } = useVideoConfig();
  const land = useLandscape();
  const items = (v.items || []) as string[];
  const at = revealFrames(scene, items, fps, durationInFrames);
  const W = land ? 1250 : 920;
  return (
    <AbsoluteFill>
      <Bg />
      <Center>
        <div style={{ width: W }}>
          <Title text={v.title || ko(lang, '자동 설정', 'Auto settings')} />
          <Card w={W} pad="10px 48px">
            {items.map((it, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 30, padding: items.length > 3 ? '34px 0' : '42px 0', borderBottom: i < items.length - 1 ? `2px solid ${C.line}` : 'none' }}>
                <Tile I={[Lucide.CalendarClock, Lucide.Repeat, Lucide.PiggyBank, Lucide.ShieldCheck][i % 4]} size={84} color={[C.blue, C.green, C.orange, C.purple][i % 4]} bg={[C.blueSoft, C.greenSoft, C.orangeSoft, C.purpleSoft][i % 4]} />
                <span style={{ flex: 1, fontFamily: F.sans, fontWeight: 800, fontSize: [...it].length > 10 ? 44 : 50, color: C.ink, letterSpacing: -1.2, wordBreak: 'keep-all', lineHeight: 1.2 }}>{it}</span>
                <Toggle at={at[i] + 4} />
              </div>
            ))}
          </Card>
        </div>
      </Center>
      {at.map((f, i) => <Sfx key={i} name="check" at={f + 6} volume={0.2} />)}
    </AbsoluteFill>
  );
};

/** 비교: 두 계좌 사이 이체 — 위(흔한 방식, 빨강) → 아래(더 나은 방식, 파랑) */
const Compare: React.FC<P> = ({ scene, lang }) => {
  const v = scene.visual;
  const land = useLandscape();
  const frame = useCurrentFrame();
  const W = land ? 680 : 920;
  const row = (side: { label: string; text: string }, good: boolean, at: number) => (
    <Card at={at} w={W} pad={land ? '50px 50px' : '44px 48px'} from={land ? (good ? 'right' : 'left') : 'up'}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 22, marginBottom: 26 }}>
        <Tile I={good ? Lucide.CircleCheck : Lucide.CircleX} size={70} color={good ? C.blue : C.red} bg={good ? C.blueSoft : C.redSoft} />
        <Chip text={side.label} size={30} color={good ? C.blue : C.red} bg={good ? C.blueSoft : C.redSoft} />
      </div>
      <div style={{ position: 'relative', display: 'inline-block', fontFamily: F.sans, fontWeight: 900, fontSize: lang === 'ko' ? (land ? 70 : 74) : 64, lineHeight: 1.18, letterSpacing: -2, color: good ? C.ink : C.gray, wordBreak: 'keep-all' }}>
        {side.text}
        {!good && <div style={{ position: 'absolute', left: -6, right: -6, top: '52%', height: 7, borderRadius: 4, background: C.red, transform: `scaleX(${easeOut(clamp01((frame - at - 12) / 8))})`, transformOrigin: 'left' }} />}
      </div>
    </Card>
  );
  const ae = useIn(10, 10, back);
  return (
    <AbsoluteFill>
      <Bg />
      <Center>
        <div style={{ display: 'flex', flexDirection: land ? 'row' : 'column', alignItems: 'center', gap: land ? 90 : 70 }}>
          {row(v.left!, false, 0)}
          <div style={{ position: 'absolute', left: '50%', top: '50%', width: 130, height: 130, marginLeft: -65, marginTop: -65, zIndex: 5, borderRadius: '50%', background: C.blue, boxShadow: '0 12px 28px rgba(47,107,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${ae}) rotate(${(1 - ae) * -90}deg)` }}>
            {land ? <Lucide.ArrowRight size={70} color="#fff" strokeWidth={2.8} /> : <Lucide.ArrowDown size={70} color="#fff" strokeWidth={2.8} />}
          </div>
          {row(v.right!, true, 14)}
        </div>
      </Center>
      <Sfx name="tick" at={0} volume={0.16} /><Sfx name="whoosh" at={10} volume={0.14} /><Sfx name="check" at={22} volume={0.2} />
    </AbsoluteFill>
  );
};

/** 타임라인: 이체 진행 단계 (택배 조회처럼 점이 차례로 파랗게 찬다) */
const Stepper: React.FC<P> = ({ scene, lang, durationInFrames }) => {
  const v = scene.visual;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const land = useLandscape();
  const items = (v.items || []) as { label: string; text: string }[];
  const at = revealFrames(scene, items.map(i => i.text || i.label), fps, durationInFrames);
  const W = land ? 1250 : 920, rowH = land ? 150 : items.length > 3 ? 170 : 190;
  const reached = at.filter(a => frame >= a).length;
  const lineP = items.length > 1 ? clamp01(at.reduce((s, a, i) => (i === 0 ? s : s + easeOut(clamp01((frame - a) / 8))), 0) / (items.length - 1)) : 0;
  return (
    <AbsoluteFill>
      <Bg />
      <Center>
        <div style={{ width: W }}>
          <Title text={v.title || ko(lang, '진행 상황', 'Progress')} />
          <Card w={W} pad="44px 50px">
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: 33, top: rowH / 2 - 10, width: 6, height: rowH * (items.length - 1), background: C.line, borderRadius: 3 }} />
              <div style={{ position: 'absolute', left: 33, top: rowH / 2 - 10, width: 6, height: rowH * (items.length - 1) * lineP, background: C.blue, borderRadius: 3 }} />
              {items.map((it, i) => {
                const e = back(clamp01((frame - at[i]) / 8));
                const on = frame >= at[i];
                return (
                  <div key={i} style={{ position: 'relative', height: rowH, display: 'flex', alignItems: 'center', gap: 36 }}>
                    <div style={{ width: 72, height: 72, borderRadius: '50%', background: on ? C.blue : '#fff', border: `6px solid ${on ? C.blue : C.line}`, boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${on ? 0.8 + 0.2 * e : 0.8})`, flex: 'none', marginTop: -20 }}>
                      {on && <Lucide.Check size={40} color="#fff" strokeWidth={3.4} />}
                    </div>
                    <div style={{ flex: 1, opacity: on ? 1 : 0.35, transform: `translateX(${on ? (1 - e) * 30 : 0}px)`, marginTop: -20 }}>
                      <div style={{ fontFamily: F.mono, fontWeight: 700, fontSize: 28, color: i === reached - 1 ? C.blue : C.gray, marginBottom: 6 }}>{it.label}</div>
                      <div style={{ fontFamily: F.sans, fontWeight: 800, fontSize: land ? 48 : 50, color: C.ink, letterSpacing: -1.2, lineHeight: 1.18, wordBreak: 'keep-all' }}>{it.text}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </Center>
      {at.map((f, i) => <Sfx key={i} name="tick" at={f} volume={0.2} />)}
    </AbsoluteFill>
  );
};

/** 아이콘 여러 개: 앱 첫 화면의 바로가기 메뉴 */
const QuickMenu: React.FC<P> = ({ scene, durationInFrames, category }) => {
  const v = scene.visual;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const land = useLandscape();
  const items = (v.items || []) as { emoji?: string; label: string }[];
  const at = revealFrames(scene, items.map(i => i.label), fps, durationInFrames);
  const cols = land ? Math.min(4, items.length) : items.length === 3 ? 3 : 2;
  const cell = land ? 300 : cols === 3 ? 270 : 400;
  const tones: [string, string][] = [[C.blue, C.blueSoft], [C.green, C.greenSoft], [C.orange, C.orangeSoft], [C.purple, C.purpleSoft]];
  return (
    <AbsoluteFill>
      <Bg />
      <Center>
        <div style={{ width: cols * cell + (cols - 1) * 28 }}>
          <Title text={v.title} />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 28 }}>
            {items.map((it, i) => {
              const I = iconFor(it.emoji, category);
              const e = back(clamp01((frame - at[i]) / 10));
              const [fg, bg] = tones[i % 4];
              return (
                <div key={i} style={{ width: cell, height: cell * (cols === 3 ? 1.12 : 0.9), borderRadius: 40, background: C.card, boxShadow: SHADOW, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 22, padding: 20, boxSizing: 'border-box', transform: `scale(${0.6 + 0.4 * e})`, opacity: clamp01(e * 2) }}>
                  <Tile I={I} size={cell * 0.38} color={fg} bg={bg} />
                  <div style={{ fontFamily: F.sans, fontWeight: 800, fontSize: cols === 3 ? 40 : 48, color: C.ink, textAlign: 'center', wordBreak: 'keep-all', lineHeight: 1.15, letterSpacing: -1 }}>{it.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      </Center>
      {at.map((f, i) => <Sfx key={i} name="pop" at={f} volume={0.16} />)}
    </AbsoluteFill>
  );
};

/** 아이콘 하나: 앱 아이콘 + 빨간 알림 숫자 */
const AppIcon: React.FC<P> = ({ scene, lang, category }) => {
  const v = scene.visual;
  const frame = useCurrentFrame();
  const land = useLandscape();
  const I = iconFor(v.emoji, category);
  const D = land ? 340 : 380;
  const e = back(clamp01(frame / 12));
  const be = back(clamp01((frame - 14) / 8));
  const hl = hlList(v);
  const words = (v.text || '').split(/\s+/).filter(Boolean);
  const te = useIn(10, 10);
  return (
    <AbsoluteFill>
      <Bg />
      <Center>
        <div style={{ position: 'relative', width: D, height: D, borderRadius: D * 0.26, background: `linear-gradient(145deg, #4d86ff, ${C.blueDeep})`, boxShadow: '0 30px 60px rgba(47,107,255,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${e})`, marginBottom: 70 }}>
          <I size={D * 0.48} color="#fff" strokeWidth={2} />
          <div style={{ position: 'absolute', right: -26, top: -26, width: 100, height: 100, borderRadius: '50%', background: C.red, border: `8px solid ${C.bg}`, color: '#fff', fontFamily: F.sans, fontWeight: 900, fontSize: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${be})` }}>1</div>
        </div>
        <div style={{ fontFamily: F.sans, fontWeight: 900, fontSize: lang === 'ko' ? 92 : 80, color: C.ink, letterSpacing: -3, textAlign: 'center', lineHeight: 1.2, wordBreak: 'keep-all', opacity: te, transform: `translateY(${(1 - te) * 30}px)`, maxWidth: land ? 1500 : 940 }}>
          {words.map((w, k) => <React.Fragment key={k}>{k > 0 && ' '}{isHl(w, hl) ? <Hl at={18}>{w}</Hl> : w}</React.Fragment>)}
        </div>
      </Center>
      <Sfx name="pop" at={0} volume={0.2} /><Sfx name="chime" at={14} volume={0.16} />
    </AbsoluteFill>
  );
};

/** 인용·성경: 앱 안 메시지 (보낸 사람 + 말풍선, 글자가 한 단어씩) */
const Message: React.FC<P> = ({ scene, lang, durationInFrames }) => {
  const v = scene.visual;
  const frame = useCurrentFrame();
  const land = useLandscape();
  const scripture = v.type === 'scripture';
  const words = (v.text || '').split(/\s+/).filter(Boolean);
  const size = lang === 'ko' ? ((v.text || '').length > 30 ? 62 : (v.text || '').length > 20 ? 70 : 80) : 64;
  const per = Math.max(2, Math.min(5, (durationInFrames * 0.45) / Math.max(1, words.length)));
  const name = v.author || '';
  const be = useIn(4, 10, back);
  return (
    <AbsoluteFill>
      <Bg />
      <Center>
        <div style={{ width: land ? 1400 : 920 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 22, marginBottom: 26, opacity: useIn(0, 8) }}>
            <div style={{ width: 90, height: 90, borderRadius: '50%', background: scripture ? C.orangeSoft : C.blueSoft, color: scripture ? C.orange : C.blue, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F.sans, fontWeight: 900, fontSize: 44 }}>
              {scripture ? <Lucide.BookOpen size={46} color={C.orange} strokeWidth={2.3} /> : [...name][0] || '“'}
            </div>
            <div>
              <div style={{ fontFamily: F.sans, fontWeight: 800, fontSize: 40, color: C.ink, letterSpacing: -1 }}>{name || ko(lang, '오늘의 한마디', 'Quote')}</div>
              <div style={{ fontFamily: F.sans, fontWeight: 600, fontSize: 28, color: C.gray }}>{ko(lang, scripture ? '오늘의 말씀' : '메시지가 도착했어요', scripture ? 'Verse of the day' : 'New message')}</div>
            </div>
          </div>
          <div style={{ background: C.card, borderRadius: '14px 48px 48px 48px', boxShadow: SHADOW, padding: land ? '56px 66px' : '52px 56px', transform: `scale(${0.9 + 0.1 * be})`, transformOrigin: 'top left', opacity: clamp01(be * 2) }}>
            <div style={{ fontFamily: F.sans, fontWeight: 800, fontSize: size, lineHeight: 1.42, color: C.ink, letterSpacing: -1.5, wordBreak: 'keep-all' }}>
              {words.map((w, i) => <span key={i} style={{ opacity: frame >= 8 + i * per ? 1 : 0.12 }}>{w} </span>)}
            </div>
          </div>
        </div>
      </Center>
      <Sfx name="pop" at={4} volume={0.18} />
    </AbsoluteFill>
  );
};

/** 이미지: 앱 속 둥근 사진 카드 + 아래 글자 꼬리표 */
const ImageScene: React.FC<P> = ({ scene, lang, durationInFrames }) => {
  const v = scene.visual;
  const frame = useCurrentFrame();
  const land = useLandscape();
  const W = land ? 1340 : 940, H = land ? 720 : 1000;
  const e = useIn(0, 12);
  const z = 1.04 + 0.08 * clamp01(frame / Math.max(1, durationInFrames));
  const hl = hlList(v);
  const words = (v.text || '').split(/\s+/).filter(Boolean);
  const te = useIn(10, 10, back);
  return (
    <AbsoluteFill>
      <Bg />
      <Center>
        <div style={{ position: 'relative', width: W, height: H, borderRadius: 56, overflow: 'hidden', boxShadow: '0 30px 70px rgba(20,26,35,0.22)', transform: `translateY(${(1 - e) * 80}px) scale(${0.96 + 0.04 * e})`, opacity: Math.min(1, e * 1.5) }}>
          <AbsoluteFill style={{ transform: `scale(${z})` }}><Media src={v.src} video={v.video} videoStart={v.videoStart} /></AbsoluteFill>
          <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0) 55%, rgba(10,14,22,0.55))' }} />
          {words.length > 0 && (
            <div style={{ position: 'absolute', left: 44, bottom: 44, right: 44, transform: `translateY(${(1 - te) * 40}px)`, opacity: clamp01(te * 2) }}>
              <div style={{ display: 'inline-block', background: 'rgba(255,255,255,0.94)', borderRadius: 30, padding: '18px 34px', fontFamily: F.sans, fontWeight: 900, fontSize: land ? 66 : lang === 'ko' ? 70 : 62, color: C.ink, letterSpacing: -2, lineHeight: 1.2, wordBreak: 'keep-all' }}>
                {words.map((w, k) => <React.Fragment key={k}>{k > 0 && ' '}{isHl(w, hl) ? <Hl at={18}>{w}</Hl> : w}</React.Fragment>)}
              </div>
            </div>
          )}
        </div>
      </Center>
      <Sfx name="whoosh" at={0} volume={0.1} />
    </AbsoluteFill>
  );
};

/** 마무리: 이체 완료 화면 (파란 원 안에 체크가 그려지고, 아래 버튼) */
const Outro: React.FC<P> = ({ scene, lang }) => {
  const v = scene.visual;
  const frame = useCurrentFrame();
  const land = useLandscape();
  const D = land ? 230 : 260;
  const ce = back(clamp01(frame / 10));
  const ck = easeOut(clamp01((frame - 6) / 10));
  const te = useIn(10, 10);
  const be = useIn(20, 10);
  const press = frame > 44 && frame < 52 ? 0.95 : 1;
  const size = lang === 'ko' ? ((v.text || '').length > 10 ? 78 : 96) : 80;
  return (
    <AbsoluteFill>
      <Bg />
      <Center>
        <div style={{ position: 'relative', width: D, height: D, borderRadius: '50%', background: C.blue, transform: `scale(${ce})`, boxShadow: '0 24px 50px rgba(47,107,255,0.35)', marginBottom: 60 }}>
          <svg viewBox="0 0 100 100" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
            <path d="M28 52 L44 67 L73 36" fill="none" stroke="#fff" strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - ck} />
          </svg>
        </div>
        <div style={{ fontFamily: F.sans, fontWeight: 900, fontSize: size, color: C.ink, letterSpacing: -3, lineHeight: 1.2, textAlign: 'center', wordBreak: 'keep-all', maxWidth: land ? 1500 : 940, opacity: te, transform: `translateY(${(1 - te) * 24}px)` }}>{v.text}</div>
        <div style={{ fontFamily: F.mono, fontWeight: 700, fontSize: 28, color: C.gray, marginTop: 22, letterSpacing: 3, opacity: te }}>NEXT YOU BANK</div>
        {v.cta && (
          <div style={{ marginTop: 70, width: land ? 900 : 900, height: 130, borderRadius: 36, background: C.blue, color: '#fff', fontFamily: F.sans, fontWeight: 800, fontSize: [...v.cta].length > 14 ? 42 : 50, display: 'flex', alignItems: 'center', justifyContent: 'center', letterSpacing: -1, opacity: be, transform: `translateY(${(1 - be) * 40}px) scale(${press})`, padding: '0 40px', textAlign: 'center' }}>{v.cta}</div>
        )}
      </Center>
      <Sfx name="chime" at={6} volume={0.22} /><Sfx name="pop" at={44} volume={0.16} />
    </AbsoluteFill>
  );
};

/** 롱폼 챕터 표지: STEP 번호 + 제목 */
const Chapter: React.FC<P> = ({ scene, lang }) => {
  const v = scene.visual;
  const frame = useCurrentFrame();
  const e = back(clamp01(frame / 12));
  const te = useIn(8, 10);
  return (
    <AbsoluteFill>
      <Bg />
      <Center>
        <Chip text={`STEP ${pad2(v.number || 1)}`} size={40} style={{ transform: `scale(${e})`, marginBottom: 40 }} />
        <div style={{ fontFamily: F.sans, fontWeight: 900, fontSize: lang === 'ko' ? 110 : 96, color: C.ink, letterSpacing: -4, lineHeight: 1.15, textAlign: 'center', wordBreak: 'keep-all', opacity: te, transform: `translateY(${(1 - te) * 40}px)`, maxWidth: 1500 }}>{v.title || v.text}</div>
        <div style={{ width: 500, height: 14, borderRadius: 7, background: C.line, marginTop: 60, overflow: 'hidden' }}>
          <div style={{ width: `${easeOut(clamp01((frame - 8) / 20)) * 100}%`, height: '100%', background: C.blue, borderRadius: 7 }} />
        </div>
      </Center>
      <Sfx name="chime" at={0} volume={0.22} />
    </AbsoluteFill>
  );
};

const BANK_TEMPLATES: Partial<Record<string, React.FC<P>>> = {
  headline: Headline, stat: Stat, chart: Chart, list: Receipt, checklist: Toggles, compare: Compare, timeline: Stepper,
  iconGrid: QuickMenu, icon: AppIcon, quote: Message, scripture: Message, image: ImageScene, outro: Outro, chapter: Chapter,
};

/** 전환: 짝수 장면은 아래에서 시트가 올라오고, 홀수 장면은 오른쪽에서 밀려 들어온다 (앱 화면 이동처럼) */
export const BankSceneView: React.FC<P> = (p) => {
  const frame = useCurrentFrame();
  const type = p.scene.visual.type;
  const T = (BANK_TEMPLATES[type] || (TEMPLATES as any)[type]) as React.FC<P>;
  const w = easeOut(clamp01(frame / 9));
  const v: any = p.scene.visual;
  let style: React.CSSProperties = {};
  if (p.index > 0 && w < 1) style = p.index % 2
    ? { transform: `translateX(${(1 - w) * 100}%)`, boxShadow: '-30px 0 60px rgba(20,26,35,0.18)' }
    : { transform: `translateY(${(1 - w) * 100}%)`, boxShadow: '0 -30px 60px rgba(20,26,35,0.18)', borderRadius: `${(1 - w) * 60}px ${(1 - w) * 60}px 0 0`, overflow: 'hidden' };
  const bg = v.bgSrc && type !== 'image' && type !== 'chapter';
  return (
    <AbsoluteFill style={style}>
      <BgCtx.Provider value={{ src: bg ? v.bgSrc : undefined, video: bg ? v.bgVideo : undefined, videoStart: v.bgVideoStart, dur: p.durationInFrames, index: p.index }}><T {...p} /></BgCtx.Provider>
      {p.index > 0 && <Sfx name="whoosh" at={0} volume={0.1} />}
    </AbsoluteFill>
  );
};

/** 테두리: 앱 상단 바 (뒤로 · NEXT YOU BANK · 알림) + 그 아래 진행선 */
export const BankChrome: React.FC<{ index: number; count: number; logo?: boolean }> = ({ logo }) => {
  const frame = useCurrentFrame();
  const { width: W, height: H, durationInFrames } = useVideoConfig();
  const land = W > H;
  const top = land ? 26 : 150, m = land ? 50 : 60;
  const s = land ? 0.8 : 1;
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', left: m, right: m, top, height: 70 * s, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {logo ? <span style={{ width: 160 }} /> : <Lucide.ChevronLeft size={46 * s} color={C.ink} strokeWidth={2.4} />}
        <span style={{ fontFamily: F.sans, fontWeight: 800, fontSize: 32 * s, color: C.ink, letterSpacing: -0.5 }}>NEXT YOU BANK</span>
        <Lucide.Bell size={40 * s} color={C.ink} strokeWidth={2.2} />
      </div>
      <div style={{ position: 'absolute', left: m, right: m, top: logo ? top + 106 : top + 82 * s, height: 6, borderRadius: 3, background: 'rgba(20,26,35,0.08)' }}>
        <div style={{ width: `${(frame / durationInFrames) * 100}%`, height: '100%', borderRadius: 3, background: C.blue }} />
      </div>
    </AbsoluteFill>
  );
};

/** 자막: 어두운 둥근 토스트, 지금 단어는 하늘색 */
export const BankCaptions: React.FC<{ captions: Caption[]; lang: string }> = ({ captions, lang }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const land = width > height;
  const t = frame / fps;
  const idx = captions.findIndex(c => t >= c.start - 0.05 && t < c.end);
  if (idx < 0) return null;
  const cur = captions[idx];
  const size = land ? (lang === 'ko' ? 50 : 46) : (lang === 'ko' ? 62 : 56);
  const e = easeOut(clamp01((frame - Math.round(cur.start * fps)) / 5));
  return (
    <AbsoluteFill style={{ justifyContent: 'flex-start', alignItems: 'center', top: land ? 905 : 1310 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', maxWidth: land ? 1500 : 960, padding: '16px 36px 20px', borderRadius: 32, background: 'rgba(20,26,35,0.92)', boxShadow: '0 14px 36px rgba(20,26,35,0.25)', transform: `translateY(${(1 - e) * 16}px)`, opacity: 0.4 + 0.6 * e }}>
        {cur.words.map((w, i) => {
          const active = t >= w.start - 0.03 && t < w.end + 0.08;
          return <span key={i} style={{ fontFamily: F.sans, fontWeight: 800, fontSize: size, lineHeight: 1.32, margin: '0 7px', color: active ? '#8fb6ff' : '#ffffff', letterSpacing: -0.5 }}>{w.text}</span>;
        })}
      </div>
    </AbsoluteFill>
  );
};
