import React from 'react';
import { AbsoluteFill, Audio, interpolate, Sequence, useCurrentFrame, useVideoConfig } from 'remotion';
import { ShortProps } from './types';
import { themeFor } from './theme';
import { Background } from './Background';
import { Captions } from './Captions';
import { SceneView } from './scenes';
import { loadFonts } from './fonts';
import { resolveSrc } from './assets';

loadFonts();

export const Short: React.FC<ShortProps> = (props) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
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
      {/* 진행 바 */}
      <div style={{ position: 'absolute', left: 0, top: 0, height: 10, width: `${(frame / durationInFrames) * 100}%`, background: theme.accent, opacity: 0.85 }} />
      {props.audioSrc && <Audio src={resolveSrc(props.audioSrc)!} />}
      {props.musicSrc && (
        <Audio src={resolveSrc(props.musicSrc)!} loop volume={(f) => musicVol * interpolate(f, [0, fps * 1.5, durationInFrames - fps * 2.5, durationInFrames], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })} />
      )}
    </AbsoluteFill>
  );
};
