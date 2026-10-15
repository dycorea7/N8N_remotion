export type Word = { text: string; start: number; end: number };
export type Visual = {
  type: 'headline' | 'stat' | 'chart' | 'list' | 'quote' | 'compare' | 'scripture' | 'icon' | 'outro' | 'image';
  src?: string;
  emoji?: string; text?: string; highlight?: string[]; cta?: string;
  value?: number; prefix?: string; suffix?: string; label?: string; sub?: string; decimals?: number;
  title?: string; unit?: string; items?: any[];
  author?: string;
  left?: { label: string; text: string }; right?: { label: string; text: string };
};
export type Scene = { start: number; end: number; narration: string; words: Word[]; visual: Visual };
export type Caption = { start: number; end: number; words: Word[] };
export type ShortProps = {
  fps: number; durationInFrames: number; lang: 'ko' | 'en'; category: string;
  scenes: Scene[]; captions: Caption[];
  audioSrc?: string; musicSrc?: string; musicVolume?: number; title?: string;
};
