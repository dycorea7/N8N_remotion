import { continueRender, delayRender, staticFile } from 'remotion';
import '@fontsource/noto-serif-kr/700.css';
import '@fontsource/black-han-sans/400.css';
import '@fontsource/nanum-pen-script/400.css';
import '@fontsource/nanum-gothic-coding/400.css';
import '@fontsource/nanum-gothic-coding/700.css';

const WEIGHTS: [string, number][] = [['Medium', 500], ['SemiBold', 600], ['Bold', 700], ['ExtraBold', 800], ['Black', 900]];

let started = false;
export function loadFonts() {
  if (started || typeof document === 'undefined') return;
  started = true;
  const handle = delayRender('fonts');
  const faces = WEIGHTS.map(([name, weight]) => new FontFace('Pretendard', `url(${staticFile(`fonts/Pretendard-${name}.woff2`)}) format('woff2')`, { weight: String(weight) }));
  Promise.all(faces.map(f => f.load().then(l => (document as any).fonts.add(l))))
    .then(() => (document as any).fonts.ready)
    .then(() => continueRender(handle))
    .catch(err => { console.error('font load failed', err); continueRender(handle); });
}

/** 글리프 스타일: 쓰는 글자(한글은 글자 범위별로 나뉜 폰트 파일)를 렌더 전에 모두 받아 둔다 */
export function loadTextFonts(fonts: string[], text: string) {
  if (typeof document === 'undefined') return;
  const handle = delayRender('text fonts');
  const sample = Array.from(new Set([...text, ...'0123456789#*+=-:.<>/$%&@ABCDEFGHIJKLMNOPQRSTUVWXYZ'])).join('');
  Promise.all(fonts.map(f => (document as any).fonts.load(f, sample)))
    .then(() => (document as any).fonts.ready)
    .then(() => continueRender(handle))
    .catch(err => { console.error('text font load failed', err); continueRender(handle); });
}
