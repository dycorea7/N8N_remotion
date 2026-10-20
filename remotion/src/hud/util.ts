// HUD(에디토리얼 패션필름) 스타일 공용: 색, 글꼴, 작은 도우미
import { Theme } from '../theme';
export { rng, hash, clamp01, easeOut } from '../glyph/util';

export const H = {
  paper: '#ecebe6',     // 밝은 스튜디오 배경
  paper2: '#dcdbd5',
  card: '#f7f6f2',      // 태그·영수증 카드
  ink: '#131313',       // 검은 글자
  ink2: 'rgba(19,19,19,0.55)',
  line: 'rgba(19,19,19,0.28)',
  white: '#f5f5f2',
  accent: '#ff5a1f',    // 단 하나의 포인트 색 (주황)
  tile: '#151618',      // 스플릿 플랩 타일
};

export const F = {
  sans: "'Pretendard', 'Noto Sans CJK KR', sans-serif",
  mono: "'Nanum Gothic Coding', 'Pretendard', monospace",
  cond: "'Black Han Sans', 'Pretendard', sans-serif",
  serif: "'Noto Serif KR', 'Noto Serif CJK KR', serif",
};
export const FONT_LOADS = ["400 40px 'Black Han Sans'", "400 40px 'Nanum Gothic Coding'", "700 40px 'Nanum Gothic Coding'", "700 40px 'Noto Serif KR'"];

/** 기존 장면 템플릿(차트 등)에 넘길 때 쓰는 테마. 밝은 배경 위 검은 글자 */
export const HUD_THEME: Theme = {
  bg1: H.paper, bg2: H.paper2, blobA: 'rgba(255,90,31,0.18)', blobB: 'rgba(0,0,0,0.06)',
  fg: H.ink, muted: H.ink2, accent: H.accent, accent2: '#1f1f1f',
  card: 'rgba(255,255,255,0.7)', cardBorder: 'rgba(19,19,19,0.22)', headlineFont: F.sans,
};

/** 화면 한쪽에 붙는 작은 영문 라벨용: 장면 종류 → 코드 이름 */
export const CODE: Record<string, string> = {
  headline: 'NOTE', icon: 'SPEC', stat: 'DATA', chart: 'CHART', list: 'LIST', checklist: 'TODO', compare: 'DIFF',
  quote: 'QUOTE', scripture: 'VERSE', image: 'LOOK', outro: 'END', chapter: 'PART', timeline: 'TIME', iconGrid: 'SET',
};
export const pad2 = (n: number) => String(n).padStart(2, '0');
export const tc = (sec: number) => `${pad2(Math.floor(sec / 60))}:${pad2(Math.floor(sec % 60))}:${pad2(Math.floor((sec * 24) % 24))}`;
