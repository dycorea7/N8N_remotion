export type Word = { text: string; start: number; end: number };
export type Visual = {
  type: 'headline' | 'stat' | 'chart' | 'list' | 'quote' | 'compare' | 'scripture' | 'icon' | 'outro' | 'image' | 'chapter' | 'timeline' | 'checklist' | 'iconGrid';
  src?: string;
  emoji?: string; text?: string; highlight?: string[]; cta?: string;
  value?: number; prefix?: string; suffix?: string; label?: string; sub?: string; decimals?: number;
  title?: string; unit?: string; items?: any[];
  author?: string;
  left?: { label: string; text: string }; right?: { label: string; text: string };
  number?: number;
  bgSrc?: string; // 그래픽 장면 뒤 AI 사진 배경
};
export type Scene = { start: number; end: number; narration: string; words: Word[]; visual: Visual; chapter?: number };
export type Caption = { start: number; end: number; words: Word[] };
export type Chapter = { title: string; start: number };
export type ShortProps = {
  fps: number; durationInFrames: number; lang: 'ko' | 'en'; category: string;
  scenes: Scene[]; captions: Caption[];
  audioSrc?: string; musicSrc?: string; musicVolume?: number; title?: string;
  chapters?: Chapter[];
  style?: 'classic' | 'glyph' | 'hud' | 'pop' | 'keynote';
};
export type ThumbProps = { category: string; lang: 'ko' | 'en'; text: string; highlight?: string[]; src?: string; badge?: string };
