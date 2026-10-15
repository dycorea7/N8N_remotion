export type Theme = {
  bg1: string; bg2: string;      // 배경 그라디언트
  blobA: string; blobB: string;  // 떠다니는 빛 번짐
  fg: string; muted: string;     // 본문 / 보조 텍스트
  accent: string; accent2: string;
  card: string; cardBorder: string;
  headlineFont: string;
};

const SANS = "'Pretendard', 'Noto Sans CJK KR', 'Noto Sans KR', 'Noto Color Emoji', sans-serif";
const SERIF = "'Noto Serif KR', 'Noto Serif CJK KR', 'Noto Color Emoji', serif";

export const THEMES: Record<string, Theme> = {
  bible: {
    bg1: '#0b1024', bg2: '#1d1a33', blobA: 'rgba(255,196,110,0.32)', blobB: 'rgba(120,140,255,0.18)',
    fg: '#fbf6ea', muted: 'rgba(251,246,234,0.62)', accent: '#ffcf6e', accent2: '#f4a259',
    card: 'rgba(255,255,255,0.06)', cardBorder: 'rgba(255,207,110,0.28)', headlineFont: SERIF,
  },
  wealth: {
    bg1: '#06120d', bg2: '#0f2a1f', blobA: 'rgba(245,197,66,0.30)', blobB: 'rgba(32,201,151,0.22)',
    fg: '#f4fbf6', muted: 'rgba(244,251,246,0.6)', accent: '#f5c542', accent2: '#20c997',
    card: 'rgba(255,255,255,0.06)', cardBorder: 'rgba(245,197,66,0.30)', headlineFont: SANS,
  },
  health: {
    bg1: '#06161a', bg2: '#0b2b33', blobA: 'rgba(72,230,190,0.28)', blobB: 'rgba(255,128,102,0.22)',
    fg: '#f1fbfa', muted: 'rgba(241,251,250,0.62)', accent: '#48e6be', accent2: '#ff8066',
    card: 'rgba(255,255,255,0.06)', cardBorder: 'rgba(72,230,190,0.30)', headlineFont: SANS,
  },
  quote: {
    bg1: '#0c0a1f', bg2: '#22163f', blobA: 'rgba(167,139,250,0.32)', blobB: 'rgba(56,189,248,0.22)',
    fg: '#f6f3ff', muted: 'rgba(246,243,255,0.62)', accent: '#c4b5fd', accent2: '#38bdf8',
    card: 'rgba(255,255,255,0.06)', cardBorder: 'rgba(196,181,253,0.30)', headlineFont: SANS,
  },
};
THEMES.other = THEMES.quote;

export const SANS_FONT = SANS;
export const themeFor = (c: string): Theme => THEMES[c] || THEMES.other;
