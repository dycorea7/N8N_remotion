import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { continueRender, delayRender, useCurrentFrame } from 'remotion';
import { F, GLYPHS, clamp01, easeOut, rng } from './util';

/** 그림(AI 이미지·아이콘)을 '색 있는 글자'로 다시 그린다.
 *  흩어진 글자들이 날아와 모이면서(assemble) 형체가 생기고, 일부 글자는 계속 바뀌며 반짝인다.
 *  mode 'color': 이미지 픽셀 색을 쓴다 / 'mask': 투명도(아이콘 모양)만 쓰고 색은 tint */
type Props = {
  src: string; width: number; height: number; cell?: number; mode?: 'color' | 'mask';
  tint?: string; tint2?: string; start?: number; assemble?: number; seed?: number;
  zoom?: [number, number]; durationInFrames?: number; threshold?: number; from?: 'below' | 'center' | 'scatter';
};
type Cell = { x: number; y: number; v: number; r: number; g: number; b: number; ch: number; d: number; rx: number; ry: number; fl: number };

export const GlyphRaster: React.FC<Props> = ({ src, width, height, cell = 14, mode = 'color', tint = '#ffc65a', tint2 = '#ffffff', start = 0, assemble = 28, seed = 1, zoom = [1, 1], durationInFrames = 150, threshold = 0.07, from = 'below' }) => {
  const frame = useCurrentFrame();
  const ref = useRef<HTMLCanvasElement>(null);
  const [handle] = useState(() => delayRender('glyph raster ' + src.slice(0, 60)));
  const [cells, setCells] = useState<Cell[] | null>(null);
  const cols = Math.floor(width / cell), rows = Math.floor(height / cell);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const c = document.createElement('canvas'); c.width = cols; c.height = rows;
        const x = c.getContext('2d')!;
        x.imageSmoothingEnabled = true; (x as any).imageSmoothingQuality = 'high';
        const iw = img.naturalWidth || width, ih = img.naturalHeight || height;
        const sc = mode === 'mask' ? Math.min(cols / iw, rows / ih) : Math.max(cols / iw, rows / ih);
        const sw = cols / sc, sh = rows / sc;
        x.drawImage(img, (iw - sw) / 2, (ih - sh) / 2, sw, sh, 0, 0, cols, rows);
        const px = x.getImageData(0, 0, cols, rows).data;
        const r = rng(seed * 977 + 13);
        const out: Cell[] = [];
        // 대비 늘리기: 밝기 하위 8% → 0, 상위 2% → 1 (어두운 곳은 비워서 형체가 보이게)
        const lums: number[] = [];
        for (let o = 0; o < px.length; o += 4) lums.push((0.2126 * px[o] + 0.7152 * px[o + 1] + 0.0722 * px[o + 2]) / 255);
        const sorted = [...lums].sort((a, b) => a - b);
        const lo = sorted[Math.floor(sorted.length * 0.08)] || 0, hi = sorted[Math.floor(sorted.length * 0.98)] || 1;
        for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
          const o = (j * cols + i) * 4;
          const R = px[o], G = px[o + 1], B = px[o + 2], A = px[o + 3] / 255;
          const lum = Math.pow(clamp01((lums[j * cols + i] - lo) / Math.max(0.05, hi - lo)), 1.35);
          const v = mode === 'mask' ? A : lum;
          const rnd = r();
          if (v < threshold) continue;
          // 등장 순서: 아래에서 위로(바닥에서 솟아오름) 또는 가운데에서 바깥으로
          const dist = from === 'center' ? Math.hypot(i / cols - 0.5, j / rows - 0.5) / 0.71 : from === 'below' ? 1 - j / rows : rnd;
          out.push({ x: i, y: j, v, r: R, g: G, b: B, ch: Math.floor(r() * GLYPHS.length), d: clamp01(dist * 0.75 + rnd * 0.25), rx: r() - 0.5, ry: r(), fl: rnd });
        }
        setCells(out);
      } catch (e) {
        console.error('glyph raster sample failed', e); setCells([]);
      }
    };
    img.onerror = () => { console.error('glyph raster load failed', src); setCells([]); };
    img.src = src;
  }, [src, cols, rows, mode, seed, width, height, threshold, from]);

  useEffect(() => { if (cells) continueRender(handle); }, [cells, handle]);

  useLayoutEffect(() => {
    const cv = ref.current; if (!cv || !cells) return;
    const ctx = cv.getContext('2d')!;
    ctx.clearRect(0, 0, width, height);
    const p = clamp01(frame / Math.max(1, durationInFrames));
    const z = zoom[0] + (zoom[1] - zoom[0]) * p;
    ctx.save();
    ctx.translate(width / 2, height / 2); ctx.scale(z, z); ctx.translate(-width / 2, -height / 2);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.globalCompositeOperation = 'lighter';
    const ox = (width - cols * cell) / 2 + cell / 2, oy = (height - rows * cell) / 2 + cell / 2;
    let lastFont = '';
    for (const c of cells) {
      const local = (frame - start - c.d * assemble) / Math.max(1, assemble * 0.45);
      if (local <= 0) continue;
      const e = easeOut(local);
      const dx = (1 - e) * c.rx * width * 0.9;
      const dy = (1 - e) * (from === 'below' ? (0.4 + c.ry) * height * 0.6 : (c.ry - 0.5) * height * 0.8);
      // 15% 글자는 계속 바뀐다 (데이터가 흐르는 느낌)
      const flick = c.fl < 0.15 ? Math.floor((frame + c.fl * 100) / 5) : 0;
      const ch = GLYPHS[(c.ch + flick) % GLYPHS.length];
      const size = Math.round(cell * (0.55 + 0.75 * c.v));
      const font = `700 ${size}px ${F.mono}`;
      if (font !== lastFont) { ctx.font = font; lastFont = font; }
      let col: string;
      if (mode === 'mask') col = c.fl > 0.7 ? tint2 : tint;
      else {
        // 색을 밝고 진하게 (글자 사이 검은 틈 때문에 원본보다 어두워 보이므로)
        const k = 1.6 + 0.5 * (1 - c.v);
        col = `rgb(${Math.min(255, c.r * k + 30)},${Math.min(255, c.g * k + 22)},${Math.min(255, c.b * k + 18)})`;
      }
      ctx.globalAlpha = clamp01(e * (mode === 'mask' ? 0.35 + 0.75 * c.v : 0.25 + 0.9 * c.v)) * (c.fl < 0.04 ? 0.6 + 0.4 * Math.sin(frame * 0.7) : 1);
      ctx.fillStyle = col;
      ctx.fillText(ch, ox + c.x * cell + dx, oy + c.y * cell + dy);
    }
    ctx.restore();
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }, [frame, cells, width, height, cell, cols, rows, start, assemble, mode, tint, tint2, zoom, durationInFrames, from]);

  return <canvas ref={ref} width={width} height={height} style={{ width, height, display: 'block' }} />;
};

/** Lucide 아이콘 → SVG data URL (글리프 래스터의 mask 입력) */
export function svgDataUrl(markup: string) {
  return `data:image/svg+xml;utf8,${encodeURIComponent(markup)}`;
}
export const useMemoSvg = (fn: () => string, deps: any[]) => useMemo(fn, deps); // eslint-disable-line react-hooks/exhaustive-deps
