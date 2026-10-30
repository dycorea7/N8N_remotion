import React from 'react';
import { Img, OffthreadVideo, useVideoConfig } from 'remotion';
import { resolveSrc } from './assets';

/** 장면 그림: 실사 영상(visual.video)이 있으면 영상, 없으면 사진(visual.src).
 *  영상은 소리 없이, 시작 몇 초(videoStart)를 건너뛰고 재생한다 (스톡 영상 첫머리는 페이드인·흔들림이 많다).
 *  objectFit cover로 9:16 화면을 꽉 채운다 (가로 영상은 가운데를 잘라 쓴다). */
export const Media: React.FC<{ src?: string; video?: string; videoStart?: number; style?: React.CSSProperties }> = ({ src, video, videoStart = 0, style }) => {
  const { fps } = useVideoConfig();
  const s: React.CSSProperties = { width: '100%', height: '100%', objectFit: 'cover', ...style };
  if (video) return <OffthreadVideo src={resolveSrc(video)!} muted trimBefore={Math.max(0, Math.round(videoStart * fps))} style={s} />;
  if (!src) return null;
  return <Img src={resolveSrc(src)!} style={s} />;
};
