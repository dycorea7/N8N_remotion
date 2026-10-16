import React from 'react';
import { AbsoluteFill, Audio, interpolate, Sequence, useCurrentFrame, useVideoConfig } from 'remotion';
import { Chapter, ShortProps } from './types';
import { Theme, themeFor, SANS_FONT } from './theme';
import { Background } from './Background';
import { Captions } from './Captions';
import { SceneView } from './scenes';
import { loadFonts } from './fonts';
import { resolveSrc } from './assets';

loadFonts();

export const Short: React.FC<ShortProps> = (props) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();
  const landscape = width > height;
  const theme = themeFor(props.category);
  const t = frame / fps;
  const sceneIndex = Math.max(0, props.scenes.findIndex(s => t >= s.start && t < s.end));
  const musicVol = props.musicVolume ?? 0.16;
  return (
    <AbsoluteFill style={{ backgroundColor: theme.bg1 }}>
      <Background theme={theme} sceneIndex={sceneIndex} />
      {props.scenes.map((s, i) => {
        const from = Math.round(s.start * fps);
        const dur = Math.max(1, Math.round(s.end * fps) - from);
        return (
          <Sequence key={i} from={from} durationInFrames={dur} name={`${i}:${s.visual.type}`}>
            <SceneView scene={s} theme={theme} index={i} durationInFrames={dur} lang={props.lang} />
          </Sequence>
        );
      })}
      <Captions captions={props.captions} theme={theme} lang={props.lang} />
      {landscape && props.chapters && props.chapters.length > 1 && <ChapterLabel chapters={props.chapters} t={t} theme={theme} />}
      {/* 진행 바 */}
      <div style={{ position: 'absolute', left: 0, top: 0, height: 10, width: `${(frame / durationInFrames) * 100}%`, background: theme.accent, opacity: 0.85 }} />
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
