import React from 'react';
import { Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';

/** 롱폼(가로) 왼쪽 위 채널 로고. 밝은 배경에서도 보이게 남색 배지 위에 얹는다. */
export const LOGO_BOX = { x: 32, y: 26, w: 176, h: 96 };

export const showLogo = (logo: unknown, width: number, height: number) => logo !== false && (logo === true || width > height);

export const ChannelLogo: React.FC<{ hideFrom?: number }> = ({ hideFrom }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const end = hideFrom ?? durationInFrames;
  const op = interpolate(frame, [0, fps * 0.6, end - fps * 0.5, end], [0, 0.95, 0.95, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  if (op <= 0) return null;
  const { x, y, w, h } = LOGO_BOX;
  return (
    <div style={{ position: 'absolute', left: x, top: y, width: w, height: h, borderRadius: 20, background: 'rgba(31,42,68,0.9)', boxShadow: '0 4px 14px rgba(0,0,0,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: op, pointerEvents: 'none' }}>
      <Img src={staticFile('brand/logo.png')} style={{ height: h - 16, width: w - 26, objectFit: 'contain' }} />
    </div>
  );
};
