import React from 'react';
import { AbsoluteFill, Img } from 'remotion';
import { ThumbProps } from './types';
import { themeFor, SANS_FONT } from './theme';
import { resolveSrc } from './assets';
import { loadFonts } from './fonts';

loadFonts();

// 롱폼 썸네일 1280×720: 왼쪽에 큰 문구(강조 단어 색), 오른쪽은 AI 이미지
export const Thumb: React.FC<ThumbProps> = ({ category, lang, text, highlight = [], src, badge }) => {
  const theme = themeFor(category);
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const hl = highlight.map(h => h.replace(/\s+/g, ''));
  const len = String(text || '').replace(/\s/g, '').length;
  const size = lang === 'ko' ? (len > 14 ? 94 : len > 10 ? 108 : 128) : (len > 26 ? 80 : 96);
  return (
    <AbsoluteFill style={{ background: `linear-gradient(135deg, ${theme.bg1}, ${theme.bg2})` }}>
      {src && (
        <AbsoluteFill style={{ left: 420 }}>
          <Img src={resolveSrc(src)!} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </AbsoluteFill>
      )}
      <AbsoluteFill style={{ background: `linear-gradient(90deg, ${theme.bg1} 0%, ${theme.bg1} 34%, rgba(0,0,0,0.55) 58%, rgba(0,0,0,0) 80%)` }} />
      <AbsoluteFill style={{ padding: '0 0 0 64px', justifyContent: 'center', width: 900 }}>
        {badge && <div style={{ alignSelf: 'flex-start', padding: '10px 24px', borderRadius: 14, background: theme.accent, color: theme.bg1, fontFamily: SANS_FONT, fontWeight: 900, fontSize: 34, marginBottom: 26 }}>{badge}</div>}
        <div style={{ fontFamily: SANS_FONT, fontWeight: 900, fontSize: size, lineHeight: 1.12, letterSpacing: lang === 'ko' ? -3 : -1, color: '#fff', wordBreak: 'keep-all' }}>
          {words.map((w, i) => {
            const isHl = hl.some(h => h && (w.includes(h) || (h.includes(w.replace(/[^\p{L}\p{N}]/gu, '')) && w.length > 1)));
            return <span key={i} style={{ color: isHl ? theme.accent : '#fff', WebkitTextStroke: '6px rgba(0,0,0,0.9)', paintOrder: 'stroke fill', textShadow: '0 8px 30px rgba(0,0,0,0.6)', marginRight: size * 0.22, display: 'inline-block' }}>{w}</span>;
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
