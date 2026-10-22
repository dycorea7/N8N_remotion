import React from 'react';
import { AbsoluteFill, Img, interpolate, useCurrentFrame } from 'remotion';
import { resolveSrc } from './assets';

/** 그래픽 장면 뒤에 까는 AI 사진 배경 (visual.bgSrc).
 *  mode: 'dark'  = 어둡게 눌러 흰 글자/카드가 잘 보이게 (기존·글리프)
 *        'paper' = 종이색으로 바래게 해 검은 글자가 잘 보이게 (HUD)
 *        'duotone' = 흑백 사진 위에 원색을 곱해 컬러 블록처럼 (팝) */
export const SceneBg: React.FC<{ src: string; durationInFrames: number; mode: 'dark' | 'paper' | 'duotone'; color?: string; index?: number }> = ({ src, durationInFrames, mode, color = '#ff5a36', index = 0 }) => {
  const frame = useCurrentFrame();
  // 어두운 블록 색이면 곱하기 대신 반투명으로 덮는다 (곱하면 사진이 안 보임)
  const hx = color.replace('#', '');
  const darkColor = hx.length === 6 && (0.2126 * parseInt(hx.slice(0, 2), 16) + 0.7152 * parseInt(hx.slice(2, 4), 16) + 0.0722 * parseInt(hx.slice(4, 6), 16)) / 255 < 0.25;
  const p = interpolate(frame, [0, durationInFrames], [0, 1], { extrapolateRight: 'clamp' });
  const zoomIn = index % 2 === 0;
  const scale = zoomIn ? 1.06 + 0.08 * p : 1.14 - 0.08 * p;
  const filter = mode === 'duotone' ? 'grayscale(1) contrast(1.25) brightness(1.05)' : mode === 'paper' ? 'saturate(0.7) contrast(1.05)' : 'saturate(1.05)';
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <AbsoluteFill style={{ transform: `scale(${scale})` }}>
        <Img src={resolveSrc(src)!} style={{ width: '100%', height: '100%', objectFit: 'cover', filter }} />
      </AbsoluteFill>
      {mode === 'dark' && <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.62) 0%, rgba(0,0,0,0.45) 40%, rgba(0,0,0,0.55) 65%, rgba(0,0,0,0.78) 100%)' }} />}
      {mode === 'paper' && <AbsoluteFill style={{ background: 'rgba(236,235,230,0.72)', backdropFilter: 'blur(2px)' }} />}
      {mode === 'duotone' && !darkColor && <AbsoluteFill style={{ background: color, mixBlendMode: 'multiply', opacity: 0.92 }} />}
      {mode === 'duotone' && <AbsoluteFill style={{ background: color, opacity: darkColor ? 0.72 : 0.35 }} />}
    </AbsoluteFill>
  );
};

/** 사진 배경을 쓸 수 있는 장면인가 (이미지·챕터 장면은 제외) */
export const hasBg = (v: any) => !!(v && v.bgSrc && v.type !== 'image' && v.type !== 'chapter');
