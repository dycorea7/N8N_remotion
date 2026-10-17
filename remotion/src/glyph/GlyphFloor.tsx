import React, { useLayoutEffect, useMemo, useRef } from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { F, GlyphTheme, rng } from './util';

/** 배경: 원근으로 깔린 '글자 바닥'이 카메라 쪽으로 흘러오고, 지평선 빛·별·보케가 깔린 밤 무대 */
type Tok = { x: number; z: number; w: string; c: number; s: number; tw: number };
const DEPTH = 34;

export const GlyphFloor: React.FC<{ theme: GlyphTheme; words: string[]; sceneIndex: number }> = ({ theme, words, sceneIndex }) => {
  const frame = useCurrentFrame();
  const { width: W, height: H, fps } = useVideoConfig();
  const ref = useRef<HTMLCanvasElement>(null);
  const landscape = W > H;
  const horizon = H * (landscape ? 0.56 : 0.6);

  const data = useMemo(() => {
    const r = rng(7);
    const pool = words.length ? words : ['next', 'you', 'global'];
    const extra = ['0', '1', '#', '*', '·', '+', '—', '>', '%'];
    const toks: Tok[] = Array.from({ length: landscape ? 1100 : 900 }, () => ({
      x: (r() - 0.5) * (landscape ? 30 : 18),
      z: 1 + r() * DEPTH,
      w: r() < 0.72 ? pool[Math.floor(r() * pool.length)] : extra[Math.floor(r() * extra.length)],
      c: Math.floor(r() * 4),
      s: 0.7 + r() * 0.6,
      tw: r() * 6.28,
    }));
    const stars = Array.from({ length: 170 }, () => ({ x: r() * W, y: r() * horizon * 0.95, s: 0.6 + r() * 1.8, tw: r() * 6.28 }));
    const bokeh = Array.from({ length: 16 }, () => ({ x: r(), y: 0.62 + r() * 0.36, s: 10 + r() * 46, sp: 0.2 + r() * 0.8, c: Math.floor(r() * 4) }));
    return { toks, stars, bokeh };
  }, [words, W, H, horizon, landscape]);

  useLayoutEffect(() => {
    const cv = ref.current; if (!cv) return;
    const ctx = cv.getContext('2d'); if (!ctx) return;
    const t = frame / fps;
    ctx.clearRect(0, 0, W, H);
    // 하늘 → 지평선 → 바닥 그라디언트
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, theme.bg1); g.addColorStop(horizon / H * 0.9, theme.bg2); g.addColorStop(horizon / H, '#2a1838'); g.addColorStop(1, '#07050c');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // 별
    for (const s of data.stars) {
      const a = 0.25 + 0.5 * (0.5 + 0.5 * Math.sin(t * 1.6 + s.tw));
      ctx.fillStyle = `rgba(255,240,220,${a})`; ctx.fillRect(s.x, s.y, s.s, s.s);
    }
    // 지평선 빛 띠
    const hg = ctx.createLinearGradient(0, horizon - H * 0.09, 0, horizon + H * 0.06);
    hg.addColorStop(0, 'rgba(255,170,90,0)'); hg.addColorStop(0.62, `rgba(255,170,90,${0.30 + 0.05 * Math.sin(t)})`); hg.addColorStop(1, 'rgba(255,170,90,0)');
    ctx.fillStyle = hg; ctx.fillRect(0, horizon - H * 0.09, W, H * 0.15);
    const glow = ctx.createRadialGradient(W / 2, horizon, 0, W / 2, horizon, W * 0.7);
    glow.addColorStop(0, theme.blobA); glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);

    // 글자 바닥 (멀리 있는 것부터)
    const f = H * 0.85, camH = 1.25, speed = 1.6 + 0.15 * (sceneIndex % 3);
    const items = data.toks.map(k => {
      let z = (k.z - t * speed) % DEPTH; if (z < 0) z += DEPTH; z += 0.6;
      return { k, z };
    }).sort((a, b) => b.z - a.z);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const { k, z } of items) {
      const sx = W / 2 + (k.x * f) / z, sy = horizon + (camH * f) / z;
      if (sx < -200 || sx > W + 200 || sy > H + 60) continue;
      const size = (k.s * f * 0.15) / z;
      if (size < 3) continue;
      const fade = Math.min(1, (DEPTH - z) / 8) * Math.min(1, (z - 0.6) / 1.2);
      const a = fade * (0.6 + 0.4 * (0.5 + 0.5 * Math.sin(t * 2 + k.tw)));
      ctx.save();
      ctx.translate(sx, sy); ctx.scale(1, 0.5);
      ctx.font = `700 ${size}px ${F.mono}`;
      ctx.fillStyle = theme.floor[k.c]; ctx.globalAlpha = a;
      if (z < 7) { ctx.shadowColor = theme.floor[k.c]; ctx.shadowBlur = 16; }
      ctx.fillText(k.w, 0, 0);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    // 보케 (바닥 위 빛망울)
    ctx.globalCompositeOperation = 'lighter';
    for (const b of data.bokeh) {
      const x = ((b.x + t * 0.012 * b.sp) % 1) * W, y = b.y * H, rr = b.s * (landscape ? 1 : 1.2);
      const bg = ctx.createRadialGradient(x, y, 0, x, y, rr);
      const c = theme.floor[b.c];
      bg.addColorStop(0, c + '30'); bg.addColorStop(0.55, c + '12'); bg.addColorStop(1, c + '00');
      ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(x, y, rr, 0, 6.29); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  }, [frame, W, H, data, theme, horizon, fps, sceneIndex, landscape]);

  return (
    <AbsoluteFill>
      <canvas ref={ref} width={W} height={H} style={{ width: W, height: H }} />
    </AbsoluteFill>
  );
};
