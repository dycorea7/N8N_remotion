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
  bgSrc?: string; // 그래픽 장면 뒤 AI 사진 배경 (실사 영상이면 그 정지 화면)
  bgVideo?: string; bgVideoStart?: number; plain?: boolean; // 그래픽 장면 뒤 실사 영상
  video?: string; videoStart?: number; // 이미지 장면의 실사 영상 (src는 같은 영상의 정지 화면)
  overlay?: import('./ClipOverlay').Overlay; // 이미지·영상 장면 위에 함께 나오는 모션 그래픽 (Flow 쇼츠)
};
export type Scene = { start: number; end: number; narration: string; words: Word[]; visual: Visual; chapter?: number };
export type Caption = { start: number; end: number; words: Word[] };
export type Chapter = { title: string; start: number };
export type ShortProps = {
  fps: number; durationInFrames: number; lang: 'ko' | 'en'; category: string;
  scenes: Scene[]; captions: Caption[];
  audioSrc?: string; musicSrc?: string; musicVolume?: number; title?: string;
  chapters?: Chapter[];
  /** 채널 로고 (왼쪽 위). 기본: 가로 영상이면 표시, false면 끔 */
  logo?: boolean;
  style?: 'classic' | 'glyph' | 'hud' | 'pop' | 'keynote' | 'editorial' | 'bank' | 'flat' | 'isometric' | 'whiteboard' | 'neon' | 'ai';
};
export type ThumbProps = { category: string; lang: 'ko' | 'en'; text: string; highlight?: string[]; src?: string; badge?: string };
