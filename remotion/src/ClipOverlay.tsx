// 실사 클립 위에 함께 나오는 모션 그래픽 (Flow 쇼츠·요리 쇼츠)
//  - 영상은 그대로 보이고, 반투명 유리 카드가 위쪽에 떠서 숫자·재료·단계·타이머를 보여 준다 (아래는 자막 자리)
//  - 항목은 나레이션이 그 말을 하는 순간에 나타난다
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import * as Lucide from 'lucide-react';
import { Scene } from './types';
import { Theme } from './theme';
import { Sfx, counterProgress, counterTiming, fmt, revealFrames } from './scenes';

export type Overlay = {
  kind: 'stat' | 'list' | 'checklist' | 'step' | 'timer' | 'compare' | 'tag';
  title?: string; label?: string; text?: string;
  value?: number; prefix?: string; suffix?: string; decimals?: number;
  items?: string[]; number?: number; seconds?: number;
  left?: string; right?: string;
};

const SANS = "'Pretendard', 'Noto Sans CJK KR', sans-serif";
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const ease = (x: number) => 1 - Math.pow(1 - clamp01(x), 3);
const back = (x: number) => { if (x <= 0) return 0; if (x >= 1) return 1; const c1 = 1.4, c3 = c1 + 1, t = x - 1; return 1 + c3 * t * t * t + c1 * t * t; };

const Glass: React.FC<{ e: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ e, children, style }) => (
  <div style={{ background: 'rgba(12,14,20,0.58)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', border: '2px solid rgba(255,255,255,0.14)', borderRadius: 40, boxShadow: '0 20px 50px rgba(0,0,0,0.35)', padding: '34px 44px', color: '#fff', fontFamily: SANS, opacity: clamp01(e * 1.6), transform: `translateY(${(1 - e) * -40}px) scale(${0.94 + 0.06 * e})`, ...style }}>{children}</div>
);

export const ClipOverlay: React.FC<{ o: Overlay; scene: Scene; theme: Theme; lang: string; dur: number }> = ({ o, scene, theme, lang, dur }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const land = width > height;
  const A = theme.accent;
  const e = ease((frame - 4) / 10);
  const wrap: React.CSSProperties = land
    ? { top: 60, left: 80, right: 'auto', width: 760, alignItems: 'flex-start' }
    : { top: 250, left: 60, right: 60, alignItems: 'center' };
  const title = o.title ? <div style={{ fontSize: land ? 34 : 38, fontWeight: 800, color: A, letterSpacing: -0.5, marginBottom: 18 }}>{o.title}</div> : null;
  let body: React.ReactNode = null;
  const sfx: React.ReactNode[] = [];

  if (o.kind === 'stat' && o.value != null) {
    const tm = counterTiming(scene, o.value, fps, dur);
    const p = counterProgress(frame, tm);
    const shown = fmt(p >= 1 ? o.value : o.value * p, o.decimals || 0, lang);
    const done = frame >= tm.endF;
    body = (
      <Glass e={e} style={{ textAlign: 'center', minWidth: 520 }}>
        {o.label && <div style={{ fontSize: 40, fontWeight: 700, opacity: 0.85, marginBottom: 6 }}>{o.label}</div>}
        <div style={{ fontWeight: 900, letterSpacing: -4, lineHeight: 1.05, color: done ? A : '#fff', transform: `scale(${done ? 1 + 0.06 * Math.sin(clamp01((frame - tm.endF) / 8) * Math.PI) : 1})` }}>
          {o.prefix && <span style={{ fontSize: 70 }}>{o.prefix}</span>}
          <span style={{ fontSize: 150, fontVariantNumeric: 'tabular-nums' }}>{shown}</span>
          {o.suffix && <span style={{ fontSize: 64, marginLeft: 8 }}>{o.suffix}</span>}
        </div>
      </Glass>
    );
    sfx.push(<Sfx key="c" name="chime" at={tm.endF} volume={0.18} />);
  } else if ((o.kind === 'list' || o.kind === 'checklist') && o.items && o.items.length) {
    const at = revealFrames(scene, o.items, fps, dur);
    const check = o.kind === 'checklist';
    body = (
      <Glass e={e} style={{ minWidth: land ? 0 : 640, maxWidth: 940 }}>
        {title}
        {o.items.map((it, i) => {
          const ie = back((frame - at[i]) / 8);
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 20, margin: '12px 0', opacity: clamp01(ie * 2), transform: `translateX(${(1 - Math.min(1, ie)) * -40}px)` }}>
              <div style={{ width: 54, height: 54, borderRadius: check ? 16 : '50%', background: check ? A : 'rgba(255,255,255,0.16)', color: check ? '#111' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 30, flex: 'none', transform: `scale(${0.6 + 0.4 * Math.min(1, ie)})` }}>
                {check ? <Lucide.Check size={34} color="#111" strokeWidth={3.4} /> : i + 1}
              </div>
              <div style={{ fontSize: land ? 44 : 50, fontWeight: 800, letterSpacing: -1, lineHeight: 1.2, wordBreak: 'keep-all' }}>{it}</div>
            </div>
          );
        })}
      </Glass>
    );
    at.forEach((f, i) => sfx.push(<Sfx key={i} name={check ? 'check' : 'tick'} at={f} volume={0.16} />));
  } else if (o.kind === 'step') {
    const be = back((frame - 2) / 10);
    body = (
      <div style={{ display: 'flex', alignItems: 'center', gap: 24, opacity: clamp01(e * 1.6) }}>
        <div style={{ background: A, color: '#111', borderRadius: 28, padding: '16px 28px', fontFamily: SANS, fontWeight: 900, fontSize: 44, letterSpacing: 1, transform: `scale(${be})`, boxShadow: '0 12px 30px rgba(0,0,0,0.3)' }}>STEP {o.number || 1}</div>
        {o.text && <Glass e={e} style={{ padding: '22px 34px' }}><div style={{ fontSize: land ? 46 : 52, fontWeight: 900, letterSpacing: -1.5, wordBreak: 'keep-all', lineHeight: 1.15 }}>{o.text}</div></Glass>}
      </div>
    );
    sfx.push(<Sfx key="s" name="pop" at={2} volume={0.18} />);
  } else if (o.kind === 'timer') {
    const total = Math.max(1, Math.round(o.seconds || 60));
    const p = ease((frame - 6) / Math.max(10, dur * 0.7));
    const R = 74, C = 2 * Math.PI * R;
    const mm = Math.floor(total / 60), ss = total % 60;
    const label = o.text || (mm ? `${mm}${lang === 'ko' ? '분' : ' min'}${ss ? ` ${ss}${lang === 'ko' ? '초' : ' s'}` : ''}` : `${ss}${lang === 'ko' ? '초' : ' s'}`);
    body = (
      <Glass e={e} style={{ display: 'flex', alignItems: 'center', gap: 34 }}>
        <svg width={180} height={180} viewBox="0 0 180 180" style={{ flex: 'none' }}>
          <circle cx={90} cy={90} r={R} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth={16} />
          <circle cx={90} cy={90} r={R} fill="none" stroke={A} strokeWidth={16} strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - p)} transform="rotate(-90 90 90)" />
          <g transform={`rotate(${p * 360} 90 90)`}><line x1={90} y1={90} x2={90} y2={36} stroke="#fff" strokeWidth={8} strokeLinecap="round" /></g>
          <circle cx={90} cy={90} r={9} fill="#fff" />
        </svg>
        <div>
          {o.title && <div style={{ fontSize: 36, fontWeight: 700, opacity: 0.85 }}>{o.title}</div>}
          <div style={{ fontSize: 84, fontWeight: 900, letterSpacing: -2, color: A }}>{label}</div>
        </div>
      </Glass>
    );
    sfx.push(<Sfx key="t" name="tick" at={6} volume={0.16} />);
  } else if (o.kind === 'compare' && (o.left || o.right)) {
    const le = back((frame - 4) / 9), re = back((frame - 16) / 9);
    const strike = ease((frame - 12) / 8);
    body = (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18, alignItems: land ? 'flex-start' : 'center' }}>
        {title && <div style={{ opacity: clamp01(e * 2) }}>{title}</div>}
        <Glass e={le} style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '22px 34px' }}>
          <Lucide.X size={46} color="#ff6b6b" strokeWidth={3.4} />
          <span style={{ position: 'relative', fontSize: 48, fontWeight: 800, opacity: 0.8, wordBreak: 'keep-all' }}>{o.left}<span style={{ position: 'absolute', left: -4, right: -4, top: '54%', height: 6, background: '#ff6b6b', transform: `scaleX(${strike})`, transformOrigin: 'left' }} /></span>
        </Glass>
        <Glass e={re} style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '22px 34px', border: `3px solid ${A}` }}>
          <Lucide.Check size={46} color={A} strokeWidth={3.4} />
          <span style={{ fontSize: 52, fontWeight: 900, wordBreak: 'keep-all' }}>{o.right}</span>
        </Glass>
      </div>
    );
    sfx.push(<Sfx key="a" name="tick" at={4} volume={0.14} />, <Sfx key="b" name="check" at={16} volume={0.18} />);
  } else if (o.kind === 'tag' && (o.text || o.label)) {
    // 화면 가운데쯤 대상 옆에 붙는 꼬리표 (점 → 선 → 이름표)
    const de = back((frame - 4) / 8), lnE = ease((frame - 8) / 8), te = back((frame - 12) / 9);
    return (
      <AbsoluteFill style={{ pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', left: land ? 900 : 300, top: land ? 520 : 980, display: 'flex', alignItems: 'center' }}>
          <div style={{ width: 34, height: 34, borderRadius: '50%', background: A, boxShadow: `0 0 0 ${10 * de}px rgba(255,255,255,0.25)`, transform: `scale(${de})` }} />
          <div style={{ width: 120 * lnE, height: 5, background: '#fff', borderRadius: 3 }} />
          <div style={{ background: 'rgba(12,14,20,0.66)', backdropFilter: 'blur(12px)', border: '2px solid rgba(255,255,255,0.18)', borderRadius: 26, padding: '16px 26px', color: '#fff', fontFamily: SANS, transform: `scale(${te})`, transformOrigin: 'left center', whiteSpace: 'nowrap' }}>
            {o.label && <div style={{ fontSize: 30, fontWeight: 700, color: A }}>{o.label}</div>}
            {o.text && <div style={{ fontSize: 50, fontWeight: 900, letterSpacing: -1 }}>{o.text}</div>}
          </div>
        </div>
        <Sfx name="pop" at={12} volume={0.16} />
      </AbsoluteFill>
    );
  }
  if (!body) return null;
  return (
    <AbsoluteFill style={{ pointerEvents: 'none', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', ...wrap }}>
      {body}
      {sfx}
    </AbsoluteFill>
  );
};
