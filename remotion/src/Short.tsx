import React from 'react';
import { AbsoluteFill, Audio, interpolate, Sequence, useCurrentFrame, useVideoConfig } from 'remotion';
import { Chapter, ShortProps } from './types';
import { Theme, themeFor, SANS_FONT } from './theme';
import { Background } from './Background';
import { Captions } from './Captions';
import { SceneView } from './scenes';
import { loadFonts, loadTextFonts } from './fonts';
import { GlyphFloor } from './glyph/GlyphFloor';
import { GlyphSceneView, FilmFx } from './glyph/scenes';
import { FONT_LOADS, glyphThemeFor } from './glyph/util';
import { useState } from 'react';
import { Backdrop, Chrome, FilmFx as HudFilm, HudCaptions } from './hud/chrome';
import { HudSceneView } from './hud/scenes';
import { FONT_LOADS as HUD_FONTS, HUD_THEME } from './hud/util';
import { PopCaptions, PopChrome, PopSceneView, blockOf } from './pop/scenes';
import { FONT_LOADS as POP_FONTS, POP_THEME, isLight } from './pop/util';
import { resolveSrc } from './assets';
import { KeynoteShort } from './keynote/Keynote';

loadFonts();

const OVERLAP = 5; // 프레임 (짧게: 글자끼리 겹쳐 보이는 시간을 줄인다)

export const Short: React.FC<ShortProps> = (props) => {
  // 키노트 스타일은 장면·전환·커서·카메라를 통째로 따로 그린다 (스타일은 렌더 중 바뀌지 않음)
  if (props.style === 'keynote') return <KeynoteShort {...props} />;
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();
  const landscape = width > height;
  const glyph = props.style === 'glyph';
  const hud = props.style === 'hud';
  const pop = props.style === 'pop';
  const theme = pop ? POP_THEME : hud ? HUD_THEME : glyph ? glyphThemeFor(props.category) : themeFor(props.category);
  useState(() => { if (glyph) loadTextFonts(FONT_LOADS, allText(props)); if (hud) loadTextFonts(HUD_FONTS, allText(props)); if (pop) loadTextFonts(POP_FONTS, allText(props)); return 0; });
  const ticker = React.useMemo(() => hud ? props.scenes.map(s => { const v: any = s.visual; return String(v.text || v.title || v.label || '').trim(); }).filter(Boolean).map(x => x.slice(0, 24)) : [], [hud, props.scenes]);
  const floorWords = React.useMemo(() => glyph ? Array.from(new Set(props.scenes.flatMap(s => s.narration.split(/\s+/)).map(w => w.replace(/[^\p{L}\p{N}]/gu, '')).filter(w => w.length >= 2))).slice(0, 120) : [], [glyph, props.scenes]);
  const View = pop ? PopSceneView : hud ? HudSceneView : glyph ? GlyphSceneView : SceneView;
  const t = frame / fps;
  const sceneIndex = Math.max(0, props.scenes.findIndex(s => t >= s.start && t < s.end));
  const musicVol = props.musicVolume ?? 0.16;
  return (
    <AbsoluteFill style={{ backgroundColor: theme.bg1 }}>
      {hud ? <Backdrop /> : glyph ? <GlyphFloor theme={theme as any} words={floorWords} sceneIndex={sceneIndex} /> : <Background theme={theme} sceneIndex={sceneIndex} />}
      {props.scenes.map((s, i) => {
        const from = Math.round(s.start * fps);
        const dur = Math.max(1, Math.round(s.end * fps) - from);
        // 마지막 장면이 아니면 다음 장면과 OVERLAP 프레임 겹쳐 크로스페이드 (장면 사이가 어두워지지 않게)
        const ov = i < props.scenes.length - 1 ? Math.min(OVERLAP, Math.floor(dur / 3)) : 0;
        return (
          <Sequence key={i} from={from} durationInFrames={dur + ov} name={`${i}:${s.visual.type}`}>
            <View scene={s} theme={theme as any} index={i} durationInFrames={dur + ov} overlap={ov} lang={props.lang} category={props.category} />
          </Sequence>
        );
      })}
      {glyph && <FilmFx />}
      {hud && <HudFilm dark={props.scenes[sceneIndex]?.visual.type === 'image'} />}
      {hud && <Chrome dark={props.scenes[sceneIndex]?.visual.type === 'image'} sceneIndex={sceneIndex} sceneCount={props.scenes.length} ticker={ticker} />}
      {pop && props.scenes[sceneIndex] && <PopChrome type={props.scenes[sceneIndex].visual.type} index={sceneIndex} light={isLight(blockOf(props.scenes[sceneIndex].visual.type, sceneIndex)[0])} />}
      {pop ? <PopCaptions captions={props.captions} lang={props.lang} /> : hud ? <HudCaptions captions={props.captions} lang={props.lang} /> : <Captions captions={props.captions} theme={theme} lang={props.lang} />}
      {!hud && !pop && landscape && props.chapters && props.chapters.length > 1 && <ChapterLabel chapters={props.chapters} t={t} theme={theme} />}
      {/* 진행 바 */}
      {!pop && <div style={{ position: 'absolute', left: 0, top: 0, height: 10, width: `${(frame / durationInFrames) * 100}%`, background: theme.accent, opacity: 0.85 }} />}
      {props.audioSrc && <Audio src={resolveSrc(props.audioSrc)!} />}
      {props.musicSrc && (
        <Audio src={resolveSrc(props.musicSrc)!} loop volume={(f) => musicVol * interpolate(f, [0, fps * 1.5, durationInFrames - fps * 2.5, durationInFrames], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })} />
      )}
    </AbsoluteFill>
  );
};

/** 롱폼: 왼쪽 위에 지금 챕터 (번호/전체 · 제목) */
const ChapterLabel: React.FC<{ chapters: Chapter[]; t: number; theme: Theme }> = ({ chapters, t, theme }) => {
  let i = 0;
  for (let k = 0; k < chapters.length; k++) if (t >= chapters[k].start) i = k;
  const since = t - chapters[i].start;
  const op = Math.min(1, since / 0.6) * 0.92;
  return (
    <div style={{ position: 'absolute', left: 56, top: 44, display: 'flex', alignItems: 'center', gap: 16, opacity: op, fontFamily: SANS_FONT }}>
      <div style={{ padding: '8px 18px', borderRadius: 999, background: theme.accent, color: theme.bg1, fontWeight: 900, fontSize: 26 }}>{i + 1} / {chapters.length}</div>
      <div style={{ fontWeight: 700, fontSize: 30, color: theme.fg, textShadow: '0 2px 12px rgba(0,0,0,0.6)', maxWidth: 1000, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{chapters[i].title}</div>
    </div>
  );
};

/** 화면에 나오는 모든 글자 (폰트 미리 받기용) */
function allText(p: ShortProps) {
  const parts: string[] = [p.title || ''];
  for (const s of p.scenes) {
    parts.push(s.narration);
    const v: any = s.visual;
    for (const k of ['text', 'label', 'sub', 'title', 'author', 'cta', 'prefix', 'suffix']) if (v[k]) parts.push(String(v[k]));
    for (const it of v.items || []) parts.push(typeof it === 'string' ? it : [it.label, it.text].filter(Boolean).join(' '));
    if (v.left) parts.push(v.left.label, v.left.text); if (v.right) parts.push(v.right.label, v.right.text);
  }
  for (const c of p.chapters || []) parts.push(c.title);
  return parts.join(' ');
}
