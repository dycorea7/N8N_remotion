// 리퀴드 글래스: backdrop-filter 대신 '뒤에 있는 사진'을 직접 복제해서 굴절시킨다.
//  - 둥근 사각형 거리장(SDF)의 법선 방향으로 가장자리 픽셀을 밀어 굴절 (R/G/B를 조금씩 다른 세기로 → 색수차)
//  - 빛 방향(왼쪽 위)을 향한 가장자리에 림 라이트
//  - 글래스 글자: 글자 마스크를 흐려 만든 높이장 기울기로 굴절
// 사진은 화면 크기(cover)로 한 번 그려 픽셀을 캐시해 두고, 각 글래스는 그 픽셀을 표본으로 쓴다.
import React, { useLayoutEffect, useRef, useState } from 'react';
import { continueRender, delayRender } from 'remotion';
import { resolveSrc } from '../assets';
import { clamp, measure } from './util';

type Photo = { W: number; H: number; sharp: Uint8ClampedArray; frost: Uint8ClampedArray; warm?: Uint8ClampedArray; url: string };
const CACHE = new Map<string, Photo>();
const keyOf = (src: string, W: number, H: number) => `${src}|${W}x${H}`;
export const getPhoto = (src: string | undefined, W: number, H: number) => (src ? CACHE.get(keyOf(src, W, H)) : undefined);

function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, W: number, H: number, pad = 0) {
  const s = Math.max((W + pad * 2) / img.naturalWidth, (H + pad * 2) / img.naturalHeight);
  const w = img.naturalWidth * s, h = img.naturalHeight * s;
  ctx.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
}

/** 렌더 전에 사진들을 받아 픽셀을 캐시한다. 준비되면 true */
export function usePhotos(srcs: string[], W: number, H: number) {
  const [ready, setReady] = useState(() => srcs.every(s => CACHE.has(keyOf(s, W, H))));
  const [handle] = useState(() => (ready || typeof document === 'undefined' ? null : delayRender('keynote photos')));
  useLayoutEffect(() => {
    if (ready || !handle) return;
    let alive = true;
    Promise.all(srcs.map(src => new Promise<void>((res) => {
      const k = keyOf(src, W, H);
      if (CACHE.has(k)) return res();
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const c = document.createElement('canvas'); c.width = W; c.height = H;
          const ctx = c.getContext('2d', { willReadFrequently: true })!;
          drawCover(ctx, img, W, H);
          const sharp = ctx.getImageData(0, 0, W, H).data;
          ctx.filter = 'blur(18px) saturate(1.15)';
          drawCover(ctx, img, W, H, 60);
          ctx.filter = 'none';
          const frost = ctx.getImageData(0, 0, W, H).data;
          CACHE.set(k, { W, H, sharp, frost, url: resolveSrc(src)! });
        } catch (e) { console.error('photo cache failed', e); }
        res();
      };
      img.onerror = () => { console.error('photo load failed', src); res(); };
      img.src = resolveSrc(src)!;
    }))).then(() => { if (alive) setReady(true); });
    return () => { alive = false; };
  }, []);
  useLayoutEffect(() => { if (ready && handle) continueRender(handle); }, [ready]);
  return ready;
}

/** 해 질 녘 버전 (같은 사진에 따뜻한 그레이딩) — 슬라이더로 다시 비추기 */
export function warmOf(p: Photo) {
  if (p.warm) return p.warm;
  const s = p.sharp, o = new Uint8ClampedArray(s.length);
  for (let i = 0; i < s.length; i += 4) {
    const r = s[i], g = s[i + 1], b = s[i + 2];
    // 해 질 녘: 따뜻하게 + 대비 (그림자를 들어 올리지 않음 → 바래 보이지 않게)
    const cv = (x: number) => { const t = x / 255; return 255 * (t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t)) * 0.35 + x * 0.65; };
    o[i] = Math.min(255, cv(r) * 1.1 + 8);
    o[i + 1] = Math.min(255, cv(g) * 0.9);
    o[i + 2] = Math.min(255, cv(b) * 0.62);
    o[i + 3] = 255;
  }
  p.warm = o;
  return o;
}

const LX = -0.55, LY = -0.83; // 빛 방향 (왼쪽 위에서)

export type GlassOpts = {
  frost?: boolean;      // 젖빛 (글자가 올라가는 카드)
  tint?: [number, number, number, number]; // rgba 0~1
  strength?: number;    // 가장자리 굴절 픽셀
  band?: number;        // 굴절 띠 두께
  mag?: number;         // 가운데 확대 (1 = 그대로, 0.85 = 15% 확대)
  warm?: boolean;
};

/** 화면 좌표의 둥근 사각형 글래스. 사진 src의 해당 영역을 굴절시켜 그린다 */
export const Glass: React.FC<{ src?: string; x: number; y: number; w: number; h: number; r: number; W: number; H: number; opts?: GlassOpts; style?: React.CSSProperties; children?: React.ReactNode }> = ({ src, x, y, w, h, r, W, H, opts = {}, style, children }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const p = getPhoto(src, W, H);
  const iw = Math.max(1, Math.round(w)), ih = Math.max(1, Math.round(h));
  const sig = [Math.round(x), Math.round(y), iw, ih, Math.round(r), opts.frost, opts.mag, opts.strength, opts.band, opts.warm, (opts.tint || []).join(',')].join('|');
  useLayoutEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext('2d')!;
    const out = ctx.createImageData(iw, ih);
    const d = out.data;
    const src0 = p ? (opts.warm ? warmOf(p) : opts.frost ? p.frost : p.sharp) : null;
    const PW = p ? p.W : 1, PH = p ? p.H : 1;
    const rr = Math.min(r, iw / 2, ih / 2);
    const band = opts.band ?? Math.min(70, Math.min(iw, ih) * 0.28);
    const str = opts.strength ?? Math.min(46, band * 0.75);
    const mag = opts.mag ?? 1;
    const [tr, tg, tb, ta] = opts.tint || [1, 1, 1, opts.frost ? 0.42 : 0.06];
    const hw = iw / 2, hh = ih / 2, ox = x, oy = y;
    const cxs = ox + hw, cys = oy + hh;
    const sample = (sx: number, sy: number, ch: number) => {
      const X = Math.max(0, Math.min(PW - 1, Math.round(sx))), Y = Math.max(0, Math.min(PH - 1, Math.round(sy)));
      return src0 ? src0[(Y * PW + X) * 4 + ch] : 236;
    };
    for (let j = 0; j < ih; j++) {
      for (let i = 0; i < iw; i++) {
        const px = i + 0.5 - hw, py = j + 0.5 - hh;
        const qx = Math.abs(px) - (hw - rr), qy = Math.abs(py) - (hh - rr);
        const mx = Math.max(qx, 0), my = Math.max(qy, 0);
        const sd = Math.hypot(mx, my) + Math.min(Math.max(qx, qy), 0) - rr; // 음수 = 안쪽
        const k = (j * iw + i) * 4;
        if (sd > 1) { d[k + 3] = 0; continue; }
        let nx = 0, ny = 0;
        if (qx > 0 && qy > 0) { const l = Math.hypot(qx, qy) || 1; nx = (qx / l) * Math.sign(px); ny = (qy / l) * Math.sign(py); }
        else if (qx > qy) nx = Math.sign(px); else ny = Math.sign(py);
        const e = clamp(-sd / band);
        const f = (1 - e) * (1 - e) * str;
        const bx = cxs + px * mag, by = cys + py * mag;
        let R = sample(bx - nx * f * 1.0, by - ny * f * 1.0, 0);
        let G = sample(bx - nx * f * 1.12, by - ny * f * 1.12, 1);
        let B = sample(bx - nx * f * 1.26, by - ny * f * 1.26, 2);
        R = R * (1 - ta) + tr * 255 * ta; G = G * (1 - ta) + tg * 255 * ta; B = B * (1 - ta) + tb * 255 * ta;
        // 림 라이트: 빛을 향한 가장자리는 밝게, 반대쪽은 살짝
        const facing = Math.max(0, -(nx * LX + ny * LY));
        const rim = clamp(1 - (-sd) / 2.6) * (0.28 + 0.62 * facing) + clamp(1 - (-sd) / 14) * 0.16 * facing;
        const shade = clamp(1 - (-sd) / 10) * 0.1 * Math.max(0, nx * LX + ny * LY);
        R = R + (255 - R) * rim - R * shade; G = G + (255 - G) * rim - G * shade; B = B + (255 - B) * rim - B * shade;
        d[k] = R; d[k + 1] = G; d[k + 2] = B;
        d[k + 3] = clamp(0.5 - sd) * 255;
      }
    }
    ctx.putImageData(out, 0, 0);
  }, [sig, !!p]);
  return (
    <div style={{ position: 'absolute', left: x, top: y, width: iw, height: ih, ...style }}>
      <canvas ref={ref} width={iw} height={ih} style={{ position: 'absolute', inset: 0, width: iw, height: ih, filter: 'drop-shadow(0 18px 30px rgba(0,0,0,0.22))' }} />
      <div style={{ position: 'absolute', inset: 0 }}>{children}</div>
    </div>
  );
};

/** 글래스 글자 (잠금 화면 시계처럼): 글자 마스크를 흐려 만든 높이장으로 굴절 + 림 라이트 */
export const GlassText: React.FC<{ src?: string; text: string; font: string; size: number; cx: number; y: number; W: number; H: number; spacing?: number }> = ({ src, text, font, size, cx, y, W, H, spacing = 0 }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const p = getPhoto(src, W, H);
  const tw = Math.ceil(measure(text, font, spacing)) + Math.round(size * 0.3);
  const th = Math.round(size * 1.35);
  const x = Math.round(cx - tw / 2);
  useLayoutEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext('2d', { willReadFrequently: true })!;
    ctx.clearRect(0, 0, tw, th);
    ctx.font = font; (ctx as any).letterSpacing = `${spacing}px`;
    ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff';
    ctx.fillText(text, tw / 2, th * 0.8);
    const m = ctx.getImageData(0, 0, tw, th).data;
    const A = new Float32Array(tw * th);
    for (let i = 0; i < A.length; i++) A[i] = m[i * 4 + 3] / 255;
    // 높이장: 상자 흐림 두 번
    const rad = Math.max(2, Math.round(size * 0.045));
    const blur = (src: Float32Array) => {
      const tmp = new Float32Array(src.length), dst = new Float32Array(src.length);
      for (let j = 0; j < th; j++) { let acc = 0; for (let i = -rad; i <= rad; i++) acc += src[j * tw + Math.max(0, Math.min(tw - 1, i))]; for (let i = 0; i < tw; i++) { tmp[j * tw + i] = acc / (2 * rad + 1); acc += src[j * tw + Math.min(tw - 1, i + rad + 1)] - src[j * tw + Math.max(0, i - rad)]; } }
      for (let i = 0; i < tw; i++) { let acc = 0; for (let j = -rad; j <= rad; j++) acc += tmp[Math.max(0, Math.min(th - 1, j)) * tw + i]; for (let j = 0; j < th; j++) { dst[j * tw + i] = acc / (2 * rad + 1); acc += tmp[Math.min(th - 1, j + rad + 1) * tw + i] - tmp[Math.max(0, j - rad) * tw + i]; } }
      return dst;
    };
    const Hf = blur(blur(A));
    const s0 = p ? p.sharp : null, PW = p ? p.W : 1, PH = p ? p.H : 1;
    const out = ctx.createImageData(tw, th), d = out.data;
    const str = size * 0.22;
    for (let j = 1; j < th - 1; j++) for (let i = 1; i < tw - 1; i++) {
      const k = j * tw + i, a = A[k];
      if (a <= 0.003) continue;
      const gx = (Hf[k + 1] - Hf[k - 1]) * 0.5, gy = (Hf[k + tw] - Hf[k - tw]) * 0.5;
      const sx = x + i - gx * str * 6, sy = y + j - gy * str * 6;
      const smp = (ch: number, f: number) => { if (!s0) return 240; const X = Math.max(0, Math.min(PW - 1, Math.round(x + i - gx * str * 6 * f))), Y = Math.max(0, Math.min(PH - 1, Math.round(y + j - gy * str * 6 * f))); return s0[(Y * PW + X) * 4 + ch]; };
      void sx; void sy;
      let R = smp(0, 1), G = smp(1, 1.15), B = smp(2, 1.3);
      const gl = Math.hypot(gx, gy);
      const facing = gl > 1e-4 ? Math.max(0, (gx * LX + gy * LY) / gl) : 0;
      const edge = clamp(gl * 14);
      const rim = edge * (0.18 + 0.7 * facing);
      const lift = 0.16; // 살짝 밝게 (유리 느낌)
      R = R + (255 - R) * (rim + lift); G = G + (255 - G) * (rim + lift); B = B + (255 - B) * (rim + lift);
      d[k * 4] = R; d[k * 4 + 1] = G; d[k * 4 + 2] = B; d[k * 4 + 3] = a * 255;
    }
    ctx.putImageData(out, 0, 0);
  }, [text, font, size, cx, y, W, H, !!p]);
  return <canvas ref={ref} width={tw} height={th} style={{ position: 'absolute', left: x, top: y, width: tw, height: th, filter: 'drop-shadow(0 8px 22px rgba(0,0,0,0.28))' }} />;
};

/** 꽉 찬 사진 (캐시와 같은 cover 배치). warmTo(0~1): 왼쪽부터 노브 위치까지 해 질 녘 버전 */
export const Photo: React.FC<{ src?: string; W: number; H: number; warmX?: number }> = ({ src, W, H, warmX }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const p = getPhoto(src, W, H);
  const wx = warmX == null ? -1 : Math.round(warmX);
  useLayoutEffect(() => {
    const c = ref.current; if (!c || !p) return;
    const ctx = c.getContext('2d')!;
    const img = new ImageData(new Uint8ClampedArray(p.sharp), W, H);
    if (wx > 0) {
      const w = warmOf(p), d = img.data;
      for (let j = 0; j < H; j++) { const row = j * W * 4; for (let i = 0; i < Math.min(W, wx) * 4; i++) d[row + i] = w[row + i]; }
    }
    ctx.putImageData(img, 0, 0);
  }, [wx, !!p, W, H]);
  if (!p) return null;
  return <canvas ref={ref} width={W} height={H} style={{ position: 'absolute', left: 0, top: 0, width: W, height: H }} />;
};
