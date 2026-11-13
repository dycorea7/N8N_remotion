import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { Theme, themeFor } from './theme';

/**
 * 스킨 스타일: 기존(classic) 장면 템플릿을 그대로 쓰고 색·글꼴·배경·효과만 바꾼다.
 *  - flat      : 크림색 바탕 + 둥근 도형이 떠다니는 플랫 일러스트 톤 (코랄·머스터드·틸)
 *  - isometric : 비스듬한 입체(아이소메트릭) 격자 배경 + 떠 있는 블록 + 카드에 입체 두께
 *  - whiteboard: 흰 보드 + 손글씨(나눔펜) + 손으로 그린 듯 흔들리는 선 + 왼쪽→오른쪽 마커 등장
 *  - neon      : 어두운 신스웨이브 격자 + 빛나는 선과 글자
 *  - ai        : 기존 장면 + 장면마다 AI 일러스트(신카이풍) 배경 (n8n이 그래픽 장면에도 배경 그림을 만든다)
 */
export const SKINS = ['flat', 'isometric', 'whiteboard', 'neon', 'ai'] as const;
export type Skin = typeof SKINS[number];
export const isSkin = (s?: string): s is Skin => !!s && (SKINS as readonly string[]).includes(s);

const SANS = "'Pretendard', 'Noto Sans CJK KR', 'Noto Sans KR', 'Noto Color Emoji', sans-serif";
export const HAND_FONT = "'Gaegu', 'Nanum Pen Script', 'Pretendard', cursive";
export const SKIN_FONT_LOADS = ["700 40px 'Gaegu'"];

export function skinTheme(skin: Skin, category: string): Theme {
  if (skin === 'neon') return { bg1: '#07051a', bg2: '#1a0a3a', blobA: 'rgba(255,46,136,0.12)', blobB: 'rgba(0,245,255,0.10)', fg: '#F4F0FF', muted: 'rgba(244,240,255,0.62)', accent: '#FF2E88', accent2: '#00F5FF', card: 'rgba(255,46,136,0.07)', cardBorder: '#FF2E88', headlineFont: SANS };
  if (skin === 'whiteboard') return { bg1: '#FBFBF8', bg2: '#EFEFEA', blobA: 'rgba(0,0,0,0)', blobB: 'rgba(0,0,0,0)', fg: '#222222', muted: 'rgba(34,34,34,0.62)', accent: '#E8604C', accent2: '#2A6FDB', card: 'rgba(0,0,0,0.025)', cardBorder: '#2B2B2B', headlineFont: HAND_FONT };
  if (skin === 'flat') return { bg1: '#F4EDE1', bg2: '#EADFCD', blobA: 'rgba(232,96,76,0.16)', blobB: 'rgba(42,157,143,0.14)', fg: '#1F2A44', muted: 'rgba(31,42,68,0.62)', accent: '#E8604C', accent2: '#2A9D8F', card: '#FFFFFF', cardBorder: 'rgba(31,42,68,0.10)', headlineFont: SANS };
  if (skin === 'isometric') return { bg1: '#E7EDF6', bg2: '#D5DFEE', blobA: 'rgba(59,130,246,0.18)', blobB: 'rgba(255,107,74,0.14)', fg: '#24324F', muted: 'rgba(36,50,79,0.62)', accent: '#FF6B4A', accent2: '#3B82F6', card: '#FFFFFF', cardBorder: 'rgba(36,50,79,0.14)', headlineFont: SANS };
  return themeFor(category);
}

/** 스킨별 배경 */
export const SkinBackground: React.FC<{ skin: Skin; sceneIndex: number }> = ({ skin, sceneIndex }) => {
  const f = useCurrentFrame();
  const { width: W, height: H, fps } = useVideoConfig();
  const t = f / fps;
  if (skin === 'neon') {
    const hz = H * 0.64, lines: React.ReactNode[] = [];
    for (let i = -14; i <= 14; i++) lines.push(<line key={'v' + i} x1={W / 2 + i * W * 0.032} y1={hz} x2={W / 2 + i * W * 0.22} y2={H} stroke="#FF2E88" strokeWidth={2} opacity={0.35} />);
    const sp = (t * 0.25) % 1;
    for (let k = 0; k < 9; k++) { const q = Math.pow((k + sp) / 9, 1.8); const y = hz + q * (H - hz); lines.push(<line key={'h' + k} x1={0} y1={y} x2={W} y2={y} stroke="#FF2E88" strokeWidth={2} opacity={0.12 + q * 0.4} />); }
    return (
      <AbsoluteFill style={{ background: 'linear-gradient(180deg,#0b0624 0%,#1a0a3a 62%,#05030f 100%)' }}>
        <svg width={W} height={H} style={{ position: 'absolute', inset: 0 }}>
          <defs><filter id="nbg"><feGaussianBlur stdDeviation="3" /></filter></defs>
          <circle cx={W / 2} cy={hz - H * 0.08} r={H * 0.2} fill="#FF2E88" opacity={0.18} filter="url(#nbg)" />
          <rect x={0} y={hz - 6} width={W} height={12} fill="#FF2E88" opacity={0.35} filter="url(#nbg)" />
          {lines}
        </svg>
      </AbsoluteFill>
    );
  }
  if (skin === 'whiteboard') {
    return (
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 50% 40%, #FFFFFF 0%, #EDEDE7 100%)' }}>
        <div style={{ position: 'absolute', inset: 14, border: '10px solid #C9CCD2', borderRadius: 12 }} />
        <div style={{ position: 'absolute', left: '8%', top: '12%', width: '30%', height: '18%', borderRadius: '50%', background: 'rgba(120,130,150,0.05)', filter: 'blur(30px)' }} />
        <div style={{ position: 'absolute', right: '10%', bottom: '18%', width: '26%', height: '16%', borderRadius: '50%', background: 'rgba(120,130,150,0.05)', filter: 'blur(30px)' }} />
      </AbsoluteFill>
    );
  }
  if (skin === 'flat') {
    const s = W / 1920;
    const shapes = [[0.08, 0.2, 120, '#F2B33D', 0], [0.92, 0.18, 90, '#2A9D8F', 1], [0.86, 0.82, 150, '#E8604C', 2], [0.12, 0.84, 70, '#2A9D8F', 3], [0.5, 0.08, 46, '#E8604C', 4], [0.3, 0.92, 54, '#F2B33D', 5]] as const;
    return (
      <AbsoluteFill style={{ background: '#F4EDE1' }}>
        <svg width={W} height={H} style={{ position: 'absolute', inset: 0 }}>
          <rect x={0} y={H * 0.78} width={W} height={H * 0.22} fill="#EADFCD" />
          {shapes.map(([cx, cy, r, col, k]) => {
            const y = cy * H + Math.sin(t * 0.9 + k + sceneIndex * 0.7) * 14 * s;
            return k % 2 === 0
              ? <circle key={k} cx={cx * W} cy={y} r={r * s} fill={col} opacity={0.22} />
              : <rect key={k} x={cx * W - r * s} y={y - r * s} width={2 * r * s} height={2 * r * s} rx={r * 0.4 * s} fill={col} opacity={0.2} transform={`rotate(${(t * 6 + k * 20) % 360} ${cx * W} ${y})`} />;
          })}
        </svg>
      </AbsoluteFill>
    );
  }
  if (skin === 'isometric') {
    const dots: React.ReactNode[] = [];
    const s = W / 1920;
    for (let i = 0; i < 30; i++) for (let j = 0; j < 30; j++) { const x = (i - j) * 52 * s + W / 2, y = (i + j) * 30 * s - H * 0.3; if (y > -20 && y < H + 20 && x > -20 && x < W + 20) dots.push(<circle key={i + '_' + j} cx={x} cy={y} r={2.4 * s} fill="#B9C6DA" />); }
    const cubes = [[0.12, 0.78, 70, '#3B82F6'], [0.86, 0.72, 56, '#FF6B4A'], [0.08, 0.28, 44, '#F5B83D'], [0.9, 0.22, 64, '#22C3A6'], [0.5, 0.9, 40, '#8B5CF6']] as const;
    return (
      <AbsoluteFill style={{ background: 'linear-gradient(180deg,#EEF3FA 0%,#D7E0EE 100%)' }}>
        <svg width={W} height={H} style={{ position: 'absolute', inset: 0 }}>
          {dots}
          {cubes.map(([cx, cy, sz, col], k) => <IsoCube key={k} x={cx * W} y={cy * H + Math.sin(t * 1.2 + k + sceneIndex) * 10 * s} size={sz * s} color={col} />)}
        </svg>
      </AbsoluteFill>
    );
  }
  return null;
};

const shade = (hex: string, k: number) => { const n = parseInt(hex.slice(1), 16); const c = (v: number) => Math.max(0, Math.min(255, Math.round(v * k))); return `rgb(${c(n >> 16)},${c((n >> 8) & 255)},${c(n & 255)})`; };
const IsoCube: React.FC<{ x: number; y: number; size: number; color: string }> = ({ x, y, size: a, color }) => {
  const w = a * 0.866, h = a * 0.5;
  return (
    <g transform={`translate(${x},${y})`}>
      <ellipse cx={0} cy={a * 1.25} rx={w * 1.1} ry={h * 0.6} fill="rgba(36,50,79,0.12)" />
      <polygon points={`0,${-h} ${w},0 0,${h} ${-w},0`} fill={shade(color, 1.18)} />
      <polygon points={`${-w},0 0,${h} 0,${h + a} ${-w},${a}`} fill={color} />
      <polygon points={`${w},0 0,${h} 0,${h + a} ${w},${a}`} fill={shade(color, 0.72)} />
    </g>
  );
};

/** 장면 묶음에 스킨 효과를 입힌다 (글꼴·빛·두께·손그림 흔들림) */
export const SkinWrap: React.FC<{ skin: Skin; children: React.ReactNode }> = ({ skin, children }) => {
  const f = useCurrentFrame();
  if (skin === 'ai') return <>{children}</>;
  const cls = 'skin-' + skin;
  const css = skin === 'neon'
    ? `.${cls} *{ text-shadow: 0 0 6px currentColor, 0 0 18px currentColor, 0 0 34px rgba(255,46,136,0.45); }
       .${cls} [style*="border"]{ box-shadow: 0 0 14px rgba(255,46,136,0.75), inset 0 0 14px rgba(255,46,136,0.35) !important; }
       .${cls} [style*="rgba(255, 255, 255, 0.1)"]{ background: rgba(0,245,255,0.08) !important; box-shadow: 0 0 14px rgba(0,245,255,0.6) !important; }
       .${cls} svg *{ filter: drop-shadow(0 0 6px currentColor); }`
    : skin === 'whiteboard'
    ? `.${cls} *{ font-family: ${HAND_FONT} !important; font-weight: 700 !important; text-shadow: none !important; letter-spacing: 0 !important; }
       .${cls} [style*="rgba(255, 255, 255"]{ background: transparent !important; border: 4px solid #2B2B2B !important; }
       .${cls} [style*="border-radius"]{ box-shadow: none !important; }
       .${cls} [style*="font-size"]{ line-height: 1.15 !important; }`
    : skin === 'flat'
    ? `.${cls} [style*="rgba(255, 255, 255, 0.1)"]{ background: #FFFFFF !important; }
       .${cls} [style*="border-radius"]{ box-shadow: 0 10px 0 rgba(31,42,68,0.08), 0 18px 34px rgba(31,42,68,0.10) !important; }`
    : `.${cls} [style*="border-radius"]{ box-shadow: 6px 6px 0 #C9D4E6, 12px 12px 0 #B3C1DA, 22px 26px 30px rgba(30,45,80,0.22) !important; }
       .${cls} [style*="rgba(255, 255, 255, 0.1)"]{ background: #FFFFFF !important; }`;
  const seed = 1 + (Math.floor(f / 3) % 4);
  return (
    <AbsoluteFill className={cls} style={skin === 'whiteboard' ? { filter: 'url(#wbRough)', fontSize: '115%' } : undefined}>
      <style>{css}</style>
      {skin === 'whiteboard' && (
        <svg width={0} height={0} style={{ position: 'absolute' }}>
          <filter id="wbRough" x="-5%" y="-5%" width="110%" height="110%">
            <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves={2} seed={seed} result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale={4} />
          </filter>
        </svg>
      )}
      {children}
    </AbsoluteFill>
  );
};

/** 화이트보드: 장면이 시작할 때 마커로 쓰듯 왼쪽에서 오른쪽으로 드러난다 */
export const boardReveal = (frameInScene: number, fps: number) => {
  const p = Math.min(1, frameInScene / (fps * 0.7));
  return p < 1 ? `inset(0 ${(1 - p) * 100}% 0 0)` : undefined;
};

export const BoardReveal: React.FC<{ on: boolean; children: React.ReactNode }> = ({ on, children }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (!on) return <>{children}</>;
  return <AbsoluteFill style={{ clipPath: boardReveal(f, fps) }}>{children}</AbsoluteFill>;
};
