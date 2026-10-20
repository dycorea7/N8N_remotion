import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { Caption } from '../types';
import { Cross, Mono, SplitFlap } from './parts';
import { CODE, F, H, hash, pad2, tc } from './util';

/** 밝은 스튜디오 배경: 종이색 그라디언트 + 바닥 그림자 + 옅은 격자 */
export const Backdrop: React.FC = () => {
  const { width, height } = useVideoConfig();
  const grid = `repeating-linear-gradient(0deg, rgba(0,0,0,0.045) 0 1px, transparent 1px 64px), repeating-linear-gradient(90deg, rgba(0,0,0,0.045) 0 1px, transparent 1px 64px)`;
  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 38%, #f6f5f1 0%, ${H.paper} 45%, ${H.paper2} 100%)` }}>
      <AbsoluteFill style={{ backgroundImage: grid }} />
      {/* 바닥: 아래쪽이 살짝 어둡고, 지평선 그림자 */}
      <div style={{ position: 'absolute', left: 0, right: 0, top: height * 0.68, bottom: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.05), rgba(0,0,0,0.12))' }} />
      <div style={{ position: 'absolute', left: width * 0.1, right: width * 0.1, top: height * 0.68 - 1, height: 2, background: 'rgba(0,0,0,0.08)' }} />
    </AbsoluteFill>
  );
};

/** 필름 질감: 망점(하프톤) + 노이즈 + 비네팅 */
const NOISE = `url("data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='260' height='260'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0.16 0'/></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>`)}")`;
export const FilmFx: React.FC<{ dark: boolean }> = ({ dark }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <AbsoluteFill style={{ backgroundImage: 'radial-gradient(rgba(0,0,0,0.16) 1.1px, transparent 1.5px)', backgroundSize: '7px 7px', opacity: dark ? 0.55 : 0.35, mixBlendMode: 'multiply' }} />
      <AbsoluteFill style={{ backgroundImage: NOISE, backgroundPosition: `${Math.floor(hash(frame) * 260)}px ${Math.floor(hash(frame + 7) * 260)}px`, mixBlendMode: 'overlay' }} />
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,${dark ? 0.5 : 0.18}) 100%)` }} />
    </AbsoluteFill>
  );
};

/** 화면 테두리 HUD: 모서리 십자, 장면 번호, 남은 시간 플랩, 눈금자, 아래 티커, 타임코드 */
export const Chrome: React.FC<{ dark: boolean; sceneIndex: number; sceneCount: number; ticker: string[]; brand?: string }> = ({ dark, sceneIndex, sceneCount, ticker, brand = 'NEXT YOU · GLOBAL' }) => {
  const frame = useCurrentFrame();
  const { fps, width: W, height: Hh, durationInFrames } = useVideoConfig();
  const land = W > Hh;
  const col = dark ? 'rgba(245,245,242,0.85)' : 'rgba(19,19,19,0.72)';
  const m = land ? 34 : 40;
  const top = land ? 34 : 132;           // 쇼츠는 위쪽 유튜브 버튼 아래로
  const bottom = land ? Hh - 34 : Hh - 54;
  const left = Math.max(0, Math.ceil((durationInFrames - frame) / fps));
  const tickerText = ticker.length ? ticker.join('   ◆   ') + '   ◆   ' : 'NEXT YOU GLOBAL   ◆   ';
  const tx = -((frame * 2.2) % (tickerText.length * 15));
  return (
    <AbsoluteFill style={{ pointerEvents: 'none', color: col }}>
      <Cross x={m} y={top - 10} color={col} /><Cross x={W - m} y={top - 10} color={col} />
      <Cross x={m} y={bottom - 40} color={col} /><Cross x={W - m} y={bottom - 40} color={col} />
      {/* 왼쪽 위: 장면 번호 */}
      <div style={{ position: 'absolute', left: m + 24, top: top + 6 }}>
        <Mono size={land ? 20 : 26} color={col}>SCENE {pad2(sceneIndex + 1)} / {pad2(sceneCount)}</Mono>
      </div>
      {/* 오른쪽 위: 브랜드 + 남은 초 플랩 + 미니 파형 */}
      <div style={{ position: 'absolute', right: m + 20, top: top + 2, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 }}>
        <Mono size={land ? 18 : 22} color={col}>{brand}</Mono>
        <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: 26 }}>
          {Array.from({ length: 22 }, (_, k) => <div key={k} style={{ width: 4, height: 6 + 18 * Math.abs(Math.sin(frame / 5 + k * 1.7)) * (0.4 + hash(k) * 0.6), background: col }} />)}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 10px', background: dark ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.55)', border: `1px solid ${col}` }}>
          <div style={{ display: 'flex', gap: 4 }}>
            {pad2(Math.min(99, left)).split('').map((d, i) => (
              <div key={i} style={{ width: land ? 26 : 34, height: land ? 36 : 46, background: H.tile, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F.mono, fontWeight: 700, fontSize: land ? 26 : 34, color: H.accent, position: 'relative' }}>
                {d}<div style={{ position: 'absolute', left: 0, right: 0, top: '50%', height: 2, background: 'rgba(0,0,0,0.8)' }} />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <Mono size={land ? 15 : 19} color={col}>SEC</Mono>
            <Mono size={land ? 15 : 19} color={col}>TO GO</Mono>
          </div>
        </div>
      </div>
      {/* 왼쪽 눈금자 */}
      <div style={{ position: 'absolute', left: 10, top: top + 80, bottom: Hh - bottom + 120 }}>
        {Array.from({ length: 24 }, (_, k) => (
          <div key={k} style={{ position: 'absolute', top: `${(k / 23) * 100}%`, left: 0, width: k % 4 === 0 ? 18 : 9, height: 2, background: col, opacity: 0.6 }} />
        ))}
      </div>
      {/* 아래: 티커 띠 + 타임코드 */}
      <div style={{ position: 'absolute', left: 0, right: 0, top: bottom - 6, height: 34, borderTop: `1px solid ${col}`, overflow: 'hidden', background: dark ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.4)' }}>
        <div style={{ whiteSpace: 'nowrap', transform: `translateX(${tx}px)`, paddingTop: 5 }}>
          <Mono size={land ? 17 : 20} color={col}>{tickerText.repeat(4)}</Mono>
        </div>
      </div>
      <div style={{ position: 'absolute', right: m + 20, top: bottom - 52, padding: '2px 8px', border: `1px solid ${col}` }}>
        <Mono size={land ? 17 : 20} color={col}>{tc(frame / fps)}</Mono>
      </div>
    </AbsoluteFill>
  );
};

/** 자막: 종이색 라벨 상자 안에 문장, 지금 말하는 단어는 검은 칸으로 뒤집힌다 */
export const HudCaptions: React.FC<{ captions: Caption[]; lang: string }> = ({ captions, lang }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const land = width > height;
  const t = frame / fps;
  const cur = captions.find(c => t >= c.start - 0.05 && t < c.end);
  if (!cur) return null;
  const local = (t - cur.start) * fps;
  const e = interpolate(local, [0, 5], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const size = land ? (lang === 'ko' ? 54 : 50) : (lang === 'ko' ? 66 : 60);
  return (
    <AbsoluteFill style={{ justifyContent: 'flex-start', alignItems: land ? 'flex-start' : 'center', top: land ? 880 : 1300, paddingLeft: land ? 90 : 0 }}>
      <div style={{ display: 'inline-flex', flexWrap: 'wrap', justifyContent: 'center', maxWidth: land ? 1500 : 960, padding: '10px 18px', background: 'rgba(247,246,242,0.94)', boxShadow: '0 10px 30px rgba(0,0,0,0.18)', opacity: e, transform: `translateY(${(1 - e) * 10}px)` }}>
        {cur.words.map((w, i) => {
          const active = t >= w.start - 0.03 && t < w.end + 0.08;
          return (
            <span key={i} style={{ fontFamily: F.sans, fontWeight: 700, fontSize: size, lineHeight: 1.25, padding: '0 8px', color: active ? H.card : H.ink, background: active ? H.ink : 'transparent' }}>{w.text}</span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

/** 장면 종류 라벨 (스크린 왼쪽에 쓰는 코드) */
export const codeFor = (type: string, i: number) => `${CODE[type] || 'NOTE'} · ${pad2(i + 1)}`;
