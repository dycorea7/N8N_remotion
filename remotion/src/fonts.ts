import { continueRender, delayRender, staticFile } from 'remotion';
import '@fontsource/noto-serif-kr/700.css';

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
