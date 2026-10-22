// KEYNOTE 장면 템플릿. 각 템플릿은 geo()에서 배치·타이밍·커서 동선(keys)·카메라 줌(zooms)을 한 번에 계산하고
// View는 그 값으로만 그린다 → 커서가 누르는 자리와 화면 요소가 정확히 맞는다.
import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { Scene } from '../types';
import { counterProgress, counterTiming, fmt, iconFor, revealFrames, spokenFrame } from '../scenes';
import { Glass, GlassText, Photo } from './glass';
import { Pill, Rise } from './parts';
import { F, K, SP, clamp, easeInOut, easeOutCubic, fitLines, frameLayout, lerp, measure, pillRect } from './util';

export type CKey = { f: number; x: number; y: number; act?: 'click' | 'down' | 'up' };
export type ZKey = { f: number; z: number; x: number; y: number };
export type GCtx = { scene: Scene; index: number; W: number; H: number; fps: number; dur: number; t0: number; lang: string; category?: string; bg?: string; outAt: number; ord?: number };
type G = { keys: CKey[]; zooms: ZKey[]; [k: string]: any };
type Tpl = { geo: (c: GCtx) => G; View: React.FC<{ c: GCtx; g: G }> };

const sec = (f: number, fps: number) => f / fps;
const hasPhoto = (c: GCtx) => !!c.bg;
const KO_FONT = (w: number, s: number) => `${w} ${s}px ${F.ko}`;
const center = (c: GCtx) => { const L = frameLayout(c.W, c.H); return (L.top + L.bottom) / 2; };

/** 사진이 있으면 젖빛 글래스 카드, 없으면 흰 카드 (white=false면 카드 없음) */
const Panel: React.FC<{ c: GCtx; x: number; y: number; w: number; h: number; r?: number; white?: boolean; children?: React.ReactNode; scale?: number; origin?: string }> = ({ c, x, y, w, h, r = 48, white = true, children, scale = 1, origin = 'center' }) => {
  if (hasPhoto(c)) return <div style={{ position: 'absolute', left: 0, top: 0, width: c.W, height: c.H, transform: `scale(${scale})`, transformOrigin: origin }}><Glass src={c.bg} x={x} y={y} w={w} h={h} r={r} W={c.W} H={c.H} opts={{ frost: true, tint: [1, 1, 1, 0.5] }}>{children}</Glass></div>;
  return (
    <div style={{ position: 'absolute', left: x, top: y, width: w, height: h, borderRadius: r, background: white ? K.card : 'transparent', boxShadow: white ? '0 24px 60px rgba(40,34,20,0.10), 0 2px 0 rgba(0,0,0,0.03)' : undefined, transform: `scale(${scale})`, transformOrigin: origin }}>{children}</div>
  );
};

// ───────────────── 헤드라인: 마스크에서 줄마다 올라오는 큰 글자, 커서가 강조어를 누르면 검은 막대가 그어진다 ─────────────────
const Headline: Tpl = {
  geo: (c) => {
    const L = frameLayout(c.W, c.H);
    const v = c.scene.visual;
    const sizes = L.land ? [210, 180, 150, 132, 116, 100] : [210, 186, 168, 150, 134, 118, 104, 92];
    const fit = fitLines(v.text || '', L.colW - (hasPhoto(c) ? 120 : 0), sizes, 800, 3);
    const lh = fit.size * 1.14;
    const blockH = fit.lines.length * lh;
    const y0 = center(c) - blockH / 2 - 20;
    const font = KO_FONT(800, fit.size), sp = -fit.size * 0.035;
    const hl = (v.highlight || []).map(h => h.replace(/\s+/g, '')).filter(Boolean)[0];
    let hit: any = null;
    fit.lines.forEach((ln, li) => {
      const words = ln.split(' ');
      const lw = measure(ln, font, sp);
      let x = c.W / 2 - lw / 2;
      words.forEach((w) => {
        const ww = measure(w, font, sp);
        const clean = w.replace(/[^\p{L}\p{N}%]/gu, '');
        if (!hit && hl && (clean.includes(hl) || (hl.includes(clean) && clean.length > 1))) hit = { li, x, w: ww, word: w, y: y0 + li * lh };
        x += ww + measure(' ', font, sp);
      });
    });
    const spoken = hl ? spokenFrame(c.scene, hl, c.fps) : null;
    const hlF = Math.max(c.t0 + 16, Math.min(spoken != null ? spoken : Math.round(c.dur * 0.4), c.outAt - 24));
    const keys: CKey[] = [], zooms: ZKey[] = [];
    if (hit) {
      keys.push({ f: hlF, x: hit.x + hit.w * 0.5, y: hit.y + lh * 0.55, act: 'click' });
      zooms.push({ f: hlF - 6, z: 1.12, x: hit.x + hit.w / 2, y: hit.y + lh / 2 }, { f: Math.min(c.outAt - 14, hlF + 40), z: 1, x: c.W / 2, y: c.H / 2 });
    } else {
      keys.push({ f: c.t0 + 20, x: c.W * 0.7, y: y0 + blockH + 60 });
    }
    return { keys, zooms, fit, lh, y0, font, sp, hit, hlF, blockH };
  },
  View: ({ c, g }) => {
    const f = useCurrentFrame();
    const { fit, lh, y0, hit, hlF, blockH } = g;
    const bar = easeOutCubic((f - hlF) / 9);
    const pad = fit.size * 0.1;
    const line = (ln: string, li: number, color: string) => (
      <div style={{ font: KO_FONT(800, fit.size), letterSpacing: -fit.size * 0.035, lineHeight: `${lh}px`, color, whiteSpace: 'nowrap', textAlign: 'center' }}>{ln}</div>
    );
    return (
      <>
        {hasPhoto(c) && <Panel c={c} x={c.W / 2 - frameLayout(c.W, c.H).colW / 2} y={y0 - 60} w={frameLayout(c.W, c.H).colW} h={blockH + 120} r={56} />}
        {fit.lines.map((ln: string, li: number) => (
          <div key={li} style={{ position: 'absolute', left: 0, width: c.W, top: y0 + li * lh }}>
            <Rise p={SP.rise(sec(f - c.t0 - li * 4, c.fps))}>{line(ln, li, K.ink)}</Rise>
          </div>
        ))}
        {hit && bar > 0 && (
          <>
            <div style={{ position: 'absolute', left: hit.x - pad, top: hit.y + lh * 0.08, width: (hit.w + pad * 2) * bar, height: lh * 0.86, borderRadius: lh * 0.2, background: K.ink }} />
            <div style={{ position: 'absolute', left: hit.x - pad, top: hit.y, width: (hit.w + pad * 2) * bar, height: lh, overflow: 'hidden' }}>
              <div style={{ position: 'absolute', left: pad, top: 0, font: KO_FONT(800, fit.size), letterSpacing: -fit.size * 0.035, lineHeight: `${lh}px`, color: K.white, whiteSpace: 'nowrap' }}>{hit.word}</div>
            </div>
          </>
        )}
      </>
    );
  },
};

// ───────────────── 숫자: 커서가 슬라이더 노브를 끌면 숫자가 올라가고, 말하는 순간 멈춘다 ─────────────────
const Stat: Tpl = {
  geo: (c) => {
    const L = frameLayout(c.W, c.H);
    const v = c.scene.visual;
    const target = v.value || 0;
    const tm = counterTiming(c.scene, target, c.fps, c.dur);
    const startF = Math.max(c.t0 + 10, tm.startF), endF = Math.max(startF + 12, Math.min(tm.endF, c.outAt - 20));
    const final = (v.prefix || '') + fmt(target, v.decimals || 0, c.lang);
    let size = L.land ? 300 : 260;
    const numFont = (s: number) => `800 expanded ${s}px ${F.word}`;
    const sufSize = (s: number) => s * 0.4;
    const fullW = (s: number) => measure(final, numFont(s)) + (v.suffix ? measure(v.suffix, KO_FONT(800, sufSize(s))) + 20 : 0);
    while (size > 90 && fullW(size) > L.colW - 40) size -= 10;
    const cy = center(c) - 120;
    const trackW = Math.min(L.colW * 0.86, 820), trackX = c.W / 2 - trackW / 2, trackY = cy + size * 0.75 + 70;
    const keys: CKey[] = [
      { f: startF - 2, x: trackX, y: trackY + 8, act: 'down' },
      { f: endF, x: trackX + trackW, y: trackY + 8, act: 'up' },
    ];
    const zooms: ZKey[] = [{ f: endF - 4, z: 1.1, x: c.W / 2, y: cy }, { f: Math.min(c.outAt - 14, endF + 34), z: 1, x: c.W / 2, y: c.H / 2 }];
    return { keys, zooms, tm: { startF, endF, countLen: endF - startF }, size, numFont, sufSize, cy, trackW, trackX, trackY, final };
  },
  View: ({ c, g }) => {
    const f = useCurrentFrame();
    const v = c.scene.visual;
    const p = counterProgress(f, g.tm);
    const target = v.value || 0;
    const shown = (v.prefix || '') + fmt(p >= 1 ? target : target * p, v.decimals || 0, c.lang);
    const rise = SP.rise(sec(f - c.t0, c.fps));
    const held = f >= g.tm.startF - 2 && f <= g.tm.endF;
    const knob = SP.snap(sec(f - g.tm.startF + 2, c.fps)) - SP.snap(sec(f - g.tm.endF, c.fps));
    const kx = g.trackX + g.trackW * p;
    const L = frameLayout(c.W, c.H);
    const trackDraw = easeOutCubic((f - c.t0 - 4) / 10);
    const lens = 64 + 40 * knob;
    return (
      <>
        {hasPhoto(c) && <Panel c={c} x={c.W / 2 - L.colW / 2} y={g.cy - g.size * 0.75 - 50} w={L.colW} h={g.size * 1.5 + 260} r={60} />}
        <div style={{ position: 'absolute', left: 0, width: c.W, top: g.cy - g.size * 0.62 }}>
          <Rise p={rise}>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'baseline', gap: 16, height: g.size * 1.1 }}>
              <span style={{ font: g.numFont(g.size), fontStretch: '125%', color: K.ink, letterSpacing: -g.size * 0.02, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{shown}</span>
              {v.suffix && <span style={{ font: KO_FONT(800, g.sufSize(g.size)), color: K.ink, lineHeight: 1 }}>{v.suffix}</span>}
            </div>
          </Rise>
        </div>
        {/* 슬라이더: 회색 트랙이 그어지고, 검은 채움이 노브를 따라간다 */}
        <div style={{ position: 'absolute', left: g.trackX, top: g.trackY, width: g.trackW * trackDraw, height: 16, borderRadius: 8, background: hasPhoto(c) ? 'rgba(11,11,12,0.16)' : K.soft }} />
        <div style={{ position: 'absolute', left: g.trackX, top: g.trackY, width: g.trackW * p, height: 16, borderRadius: 8, background: K.ink }} />
        {trackDraw > 0.98 && (hasPhoto(c) && held
          ? <Glass src={c.bg} x={kx - lens * 0.75} y={g.trackY + 8 - lens / 2} w={lens * 1.5} h={lens} r={lens / 2} W={c.W} H={c.H} opts={{ mag: 0.78, strength: 18, band: 22, tint: [1, 1, 1, 0.05] }} />
          : <div style={{ position: 'absolute', left: kx - lens * 0.75, top: g.trackY + 8 - lens / 2, width: lens * 1.5, height: lens, borderRadius: lens / 2, background: K.white, boxShadow: '0 6px 18px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.05)' }} />)}
        {v.sub && (
          <div style={{ position: 'absolute', left: 0, width: c.W, top: g.trackY + 60 }}>
            <Rise p={SP.rise(sec(f - c.t0 - 8, c.fps))}><div style={{ textAlign: 'center', font: `500 ${L.land ? 40 : 42}px ${F.ui}`, color: K.gray }}>{v.sub}</div></Rise>
          </div>
        )}
      </>
    );
  },
};

// ───────────────── 차트: 막대가 가로로 그어진다. 커서가 줄을 누를 때마다 하나씩 ─────────────────
const Chart: Tpl = {
  geo: (c) => {
    const L = frameLayout(c.W, c.H);
    const v = c.scene.visual;
    const items = (v.items || []).slice(0, 4) as { label: string; value: number }[];
    const max = Math.max(1e-9, ...items.map(i => Math.abs(Number(i.value) || 0)));
    const rowH = L.land ? 130 : 150;
    const cardW = L.colW, cardH = items.length * rowH + 80;
    const cardX = c.W / 2 - cardW / 2, cardY = center(c) - cardH / 2;
    const labelW = Math.max(...items.map(i => measure(String(i.label), KO_FONT(700, 44)))) + 40;
    const barX = cardX + 50 + labelW, barMax = cardW - 100 - labelW - 150;
    const rev = revealFrames(c.scene, items.map(i => String(i.label)), c.fps, c.dur).map(r => Math.max(c.t0 + 8, Math.min(r, c.outAt - 24)));
    const rows = items.map((it, i) => ({ ...it, y: cardY + 40 + i * rowH, w: barMax * Math.abs(Number(it.value) || 0) / max, at: rev[i] }));
    const keys: CKey[] = rows.map(r => ({ f: r.at, x: barX + 20, y: r.y + rowH / 2, act: 'click' as const }));
    const top = rows.reduce((a, b) => (b.w > a.w ? b : a), rows[0]);
    const zooms: ZKey[] = top ? [{ f: Math.min(c.outAt - 30, top.at + 14), z: 1.08, x: barX + top.w / 2, y: top.y + rowH / 2 }, { f: c.outAt - 14, z: 1, x: c.W / 2, y: c.H / 2 }] : [];
    return { keys, zooms, rows, rowH, cardX, cardY, cardW, cardH, barX, top };
  },
  View: ({ c, g }) => {
    const f = useCurrentFrame();
    const v = c.scene.visual;
    return (
      <Panel c={c} x={g.cardX} y={g.cardY} w={g.cardW} h={g.cardH} scale={1}>
        {g.rows.map((r: any, i: number) => {
          const e = easeOutCubic((f - r.at) / 12);
          const isTop = r === g.top;
          const y = r.y - g.cardY;
          return (
            <React.Fragment key={i}>
              <div style={{ position: 'absolute', left: 50, top: y, height: g.rowH, display: 'flex', alignItems: 'center' }}>
                <Rise p={SP.rise(sec(f - r.at + 4, c.fps))}><div style={{ font: KO_FONT(700, 44), color: K.ink, whiteSpace: 'nowrap' }}>{r.label}</div></Rise>
              </div>
              <div style={{ position: 'absolute', left: g.barX - g.cardX, top: y + g.rowH / 2 - 30, width: Math.max(0, r.w * e), height: 60, borderRadius: 18, background: isTop ? K.ink : '#B9B5AC' }} />
              {e > 0.6 && <div style={{ position: 'absolute', left: g.barX - g.cardX + r.w * e + 18, top: y, height: g.rowH, display: 'flex', alignItems: 'center', font: `600 42px ${F.ui}`, color: K.ink, whiteSpace: 'nowrap' }}>
                <Rise p={SP.rise(sec(f - r.at - 6, c.fps))}>{fmt(Number(r.value) || 0, 0, c.lang)}{v.unit ? <span style={{ font: KO_FONT(600, 30), color: K.gray, marginLeft: 6 }}>{v.unit}</span> : null}</Rise>
              </div>}
              {i > 0 && <div style={{ position: 'absolute', left: 50, right: 50, top: y, height: 2, background: K.line }} />}
            </React.Fragment>
          );
        })}
      </Panel>
    );
  },
};

// ───────────────── 목록 / 체크리스트: iOS 설정 화면 같은 카드. 줄이 하나씩 늘어나며 카드가 자란다 ─────────────────
const listGeo = (check: boolean) => (c: GCtx): G => {
  const L = frameLayout(c.W, c.H);
  const v = c.scene.visual;
  const items = ((v.items || []) as any[]).slice(0, 4).map(x => String(typeof x === 'string' ? x : x.text || x.label || ''));
  const rowH = L.land ? 120 : 140;
  const cardW = L.colW, cardH = items.length * rowH;
  const cardX = c.W / 2 - cardW / 2, cardY = center(c) - cardH / 2;
  const rev = revealFrames(c.scene, items, c.fps, c.dur).map(r => Math.max(c.t0 + 6, Math.min(r, c.outAt - 26)));
  const swX = cardX + cardW - 50 - 116;
  const keys: CKey[] = items.map((_, i) => check
    ? { f: rev[i] + 8, x: swX + 80, y: cardY + i * rowH + rowH / 2, act: 'click' as const }
    : { f: rev[i], x: cardX + 90, y: cardY + i * rowH + rowH / 2, act: 'click' as const });
  const last = items.length - 1;
  const zooms: ZKey[] = last >= 0 ? [{ f: rev[last] + 4, z: 1.06, x: c.W / 2, y: cardY + last * rowH + rowH / 2 }, { f: c.outAt - 14, z: 1, x: c.W / 2, y: c.H / 2 }] : [];
  return { keys, zooms, items, rowH, cardW, cardH, cardX, cardY, rev, swX };
};
const ListView = (check: boolean): React.FC<{ c: GCtx; g: G }> => ({ c, g }) => {
  const f = useCurrentFrame();
  const L = frameLayout(c.W, c.H);
  // 카드 높이 = 줄이 나타날 때마다 한 줄씩 스프링으로 자람
  const h = g.rev.reduce((acc: number, r: number) => acc + g.rowH * SP.move(sec(f - r + 2, c.fps)), 0);
  const fs = L.land ? 50 : 52;
  return (
    <Panel c={c} x={g.cardX} y={g.cardY} w={g.cardW} h={Math.max(2, h)} r={48}>
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', borderRadius: 48 }}>
        {g.items.map((t: string, i: number) => {
          const at = g.rev[i];
          const pop = SP.pop(sec(f - at, c.fps));
          const on = check ? SP.snap(sec(f - at - 8, c.fps)) : 0;
          const y = i * g.rowH;
          return (
            <React.Fragment key={i}>
              {i > 0 && <div style={{ position: 'absolute', left: 140, right: 0, top: y, height: 2, background: K.line }} />}
              <div style={{ position: 'absolute', left: 44, top: y + g.rowH / 2 - 38, width: 76, height: 76, borderRadius: 22, background: K.ink, transform: `scale(${pop})`, display: 'flex', alignItems: 'center', justifyContent: 'center', font: `700 38px ${F.ui}`, color: K.white }}>{i + 1}</div>
              <div style={{ position: 'absolute', left: 150, right: check ? 200 : 40, top: y, height: g.rowH, display: 'flex', alignItems: 'center' }}>
                <Rise p={SP.rise(sec(f - at - 2, c.fps))}><div style={{ font: KO_FONT(700, fs), color: K.ink, whiteSpace: 'nowrap', letterSpacing: -fs * 0.02 }}>{t}</div></Rise>
              </div>
              {check && (
                <div style={{ position: 'absolute', left: g.swX - g.cardX, top: y + g.rowH / 2 - 35, width: 116, height: 70, borderRadius: 35, background: on > 0.5 ? K.ink : K.soft, transform: `scale(${pop})` }}>
                  <div style={{ position: 'absolute', left: 5 + 46 * on, top: 5, width: 60, height: 60, borderRadius: 30, background: K.white, boxShadow: '0 3px 8px rgba(0,0,0,0.2)' }} />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </Panel>
  );
};

// ───────────────── 비교: 세그먼트 컨트롤 노브를 커서가 끌어 옮기면 카드 페이지가 밀린다 ─────────────────
const Compare: Tpl = {
  geo: (c) => {
    const L = frameLayout(c.W, c.H);
    const v = c.scene.visual;
    const segW = Math.min(L.colW, 900), segH = 104, segX = c.W / 2 - segW / 2;
    const cardH = L.land ? 420 : 560;
    const segY = center(c) - (segH + 40 + cardH) / 2;
    const cardY = segY + segH + 40;
    const right = v.right || { label: '', text: '' };
    const sp = spokenFrame(c.scene, right.label, c.fps) ?? spokenFrame(c.scene, right.text, c.fps);
    const sw = Math.max(c.t0 + 26, Math.min(sp != null ? sp : Math.round(c.dur * 0.5), c.outAt - 22));
    const lx = segX + segW / 4, rx = segX + segW * 3 / 4, yy = segY + segH / 2;
    const keys: CKey[] = [{ f: sw - 10, x: lx, y: yy, act: 'down' }, { f: sw + 4, x: rx, y: yy, act: 'up' }];
    const zooms: ZKey[] = [{ f: sw - 14, z: 1.08, x: c.W / 2, y: segY + segH / 2 }, { f: sw + 10, z: 1, x: c.W / 2, y: c.H / 2 }];
    return { keys, zooms, segW, segH, segX, segY, cardH, cardY, sw };
  },
  View: ({ c, g }) => {
    const f = useCurrentFrame();
    const v = c.scene.visual;
    const L = frameLayout(c.W, c.H);
    const k = clamp(easeInOut((f - (g.sw - 10)) / 14)); // 노브 = 커서 끌기와 같은 곡선
    const push = SP.move(sec(f - g.sw + 2, c.fps));
    const sideL = v.left || { label: '', text: '' }, sideR = v.right || { label: '', text: '' };
    const appear = SP.pop(sec(f - c.t0, c.fps));
    const card = (s: { label: string; text: string }, dark: boolean) => {
      const fit = fitLines(s.text, L.colW - 140, [96, 84, 74, 64, 56], 800, 3);
      return (
        <div style={{ width: L.colW, height: g.cardH, borderRadius: 56, background: dark ? K.ink : K.card, boxShadow: '0 24px 60px rgba(40,34,20,0.10)', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 70px', boxSizing: 'border-box', flex: 'none' }}>
          <div style={{ font: `600 36px ${F.ui}`, color: dark ? 'rgba(255,255,255,0.6)' : K.gray, marginBottom: 24 }}>{s.label}</div>
          {fit.lines.map((ln, i) => <div key={i} style={{ font: KO_FONT(800, fit.size), letterSpacing: -fit.size * 0.03, color: dark ? K.white : K.ink, lineHeight: 1.15 }}>{ln}</div>)}
        </div>
      );
    };
    return (
      <>
        <Panel c={c} x={g.segX} y={g.segY} w={g.segW} h={g.segH} r={g.segH / 2} white={false}>
          <div style={{ position: 'absolute', inset: 0, borderRadius: g.segH / 2, background: hasPhoto(c) ? 'transparent' : '#DEDAD1', transform: `scale(${appear})` }}>
            <div style={{ position: 'absolute', left: 8 + (g.segW / 2 - 8) * k, top: 8, width: g.segW / 2 - 8, height: g.segH - 16, borderRadius: (g.segH - 16) / 2, background: K.ink }} />
            {[sideL, sideR].map((s, i) => {
              const active = i === 0 ? k < 0.5 : k >= 0.5;
              return <div key={i} style={{ position: 'absolute', left: i * g.segW / 2, width: g.segW / 2, top: 0, height: g.segH, display: 'flex', alignItems: 'center', justifyContent: 'center', font: KO_FONT(700, 40), color: active ? K.white : K.ink }}>{s.label}</div>;
            })}
          </div>
        </Panel>
        <div style={{ position: 'absolute', left: c.W / 2 - L.colW / 2, top: g.cardY, width: L.colW, height: g.cardH + 80, overflow: 'hidden' }}>
          <div style={{ display: 'flex', gap: 80, transform: `translateX(${-(L.colW + 80) * push}px) translateY(${(1 - SP.rise(sec(f - c.t0 - 4, c.fps))) * (g.cardH + 80)}px)` }}>
            {card(sideL, false)}
            {card(sideR, true)}
          </div>
        </div>
      </>
    );
  },
};

// ───────────────── 타임라인: 세로 선이 그어지고 마디가 튀어나온다 ─────────────────
const Timeline: Tpl = {
  geo: (c) => {
    const L = frameLayout(c.W, c.H);
    const v = c.scene.visual;
    const items = ((v.items || []) as any[]).slice(0, 4).map(x => (typeof x === 'string' ? { label: '', text: x } : { label: String(x.label || ''), text: String(x.text || '') }));
    const gapY = L.land ? 150 : 200;
    const h = (items.length - 1) * gapY;
    const y0 = center(c) - h / 2;
    const railX = c.W / 2 - L.colW / 2 + 70;
    const rev = revealFrames(c.scene, items.map(i => i.label || i.text), c.fps, c.dur).map(r => Math.max(c.t0 + 8, Math.min(r, c.outAt - 24)));
    const nodes = items.map((it, i) => ({ ...it, y: y0 + i * gapY, at: rev[i] }));
    const keys: CKey[] = nodes.map(n => ({ f: n.at, x: railX, y: n.y, act: 'click' as const }));
    const zooms: ZKey[] = [];
    return { keys, zooms, nodes, railX, y0, gapY };
  },
  View: ({ c, g }) => {
    const f = useCurrentFrame();
    const L = frameLayout(c.W, c.H);
    const nodes = g.nodes as any[];
    // 선 길이: 다음 마디가 나타날 때마다 거기까지 그어진다
    let lineTo = g.y0;
    nodes.forEach((n, i) => { if (i > 0) lineTo += (n.y - nodes[i - 1].y) * easeOutCubic((f - n.at + 8) / 10); });
    const panelW = L.colW;
    return (
      <>
        {hasPhoto(c) && <Panel c={c} x={c.W / 2 - panelW / 2} y={g.y0 - 90} w={panelW} h={(nodes.length - 1) * g.gapY + 180} r={56} />}
        <div style={{ position: 'absolute', left: g.railX - 4, top: g.y0, width: 8, height: Math.max(0, lineTo - g.y0), borderRadius: 4, background: K.ink }} />
        {nodes.map((n, i) => {
          const pop = SP.pop(sec(f - n.at, c.fps));
          const lw = n.label ? measure(n.label, `700 34px ${F.ui}`) + 44 : 0;
          return (
            <React.Fragment key={i}>
              <div style={{ position: 'absolute', left: g.railX - 24, top: n.y - 24, width: 48, height: 48, borderRadius: 24, background: K.ink, border: `8px solid ${hasPhoto(c) ? 'rgba(255,255,255,0.9)' : K.canvas}`, boxSizing: 'border-box', transform: `scale(${pop})` }} />
              {n.label && <div style={{ position: 'absolute', left: g.railX + 60, top: n.y - 32, width: lw, height: 64, borderRadius: 32, background: K.ink, transform: `scale(${pop})`, transformOrigin: 'left center', display: 'flex', alignItems: 'center', justifyContent: 'center', font: `700 34px ${F.ui}`, color: K.white, whiteSpace: 'nowrap' }}>{n.label}</div>}
              <div style={{ position: 'absolute', left: g.railX + 60 + (lw ? lw + 26 : 0), top: n.y - 40, height: 80, display: 'flex', alignItems: 'center' }}>
                <Rise p={SP.rise(sec(f - n.at - 3, c.fps))}><div style={{ font: KO_FONT(700, L.land ? 50 : 50), color: K.ink, whiteSpace: 'nowrap', letterSpacing: -1 }}>{n.text}</div></Rise>
              </div>
            </React.Fragment>
          );
        })}
      </>
    );
  },
};

// ───────────────── 아이콘 그리드: 벤토 타일이 종이 지도처럼 가운데부터 펼쳐진다 ─────────────────
const IconGrid: Tpl = {
  geo: (c) => {
    const L = frameLayout(c.W, c.H);
    const v = c.scene.visual;
    const items = ((v.items || []) as any[]).slice(0, 4).map(x => (typeof x === 'string' ? { emoji: '', label: x } : { emoji: x.emoji, label: String(x.label || x.text || '') }));
    const n = items.length, gap = 28;
    const gw = L.colW, gh = L.land ? 560 : (n <= 2 ? 560 : 860);
    const gx = c.W / 2 - gw / 2, gy = center(c) - gh / 2;
    let tiles: { x: number; y: number; w: number; h: number }[] = [];
    if (L.land) { const w = (gw - gap * (n - 1)) / n; tiles = items.map((_, i) => ({ x: gx + i * (w + gap), y: gy, w, h: gh })); }
    else if (n <= 2) { const w = (gw - gap) / 2; tiles = items.map((_, i) => ({ x: gx + i * (w + gap), y: gy, w, h: gh })); }
    else if (n === 3) { const h = (gh - gap) / 2, w = (gw - gap) / 2; tiles = [{ x: gx, y: gy, w: gw, h }, { x: gx, y: gy + h + gap, w, h }, { x: gx + w + gap, y: gy + h + gap, w, h }]; }
    else { const h = (gh - gap) / 2, w = (gw - gap) / 2; tiles = [0, 1, 2, 3].map(i => ({ x: gx + (i % 2) * (w + gap), y: gy + Math.floor(i / 2) * (h + gap), w, h })); }
    const rev = revealFrames(c.scene, items.map(i => i.label), c.fps, c.dur).map(r => Math.max(c.t0 + 6, Math.min(r, c.outAt - 26)));
    const ccx = gx + gw / 2, ccy = gy + gh / 2;
    const keys: CKey[] = tiles.map((t, i) => ({ f: rev[i] + 4, x: t.x + t.w * 0.62, y: t.y + t.h * 0.6, act: 'click' as const }));
    const last = tiles[tiles.length - 1];
    const zooms: ZKey[] = last ? [{ f: Math.min(c.outAt - 34, rev[rev.length - 1] + 20), z: 1.14, x: last.x + last.w / 2, y: last.y + last.h / 2 }, { f: c.outAt - 14, z: 1, x: c.W / 2, y: c.H / 2 }] : [];
    return { keys, zooms, items, tiles, rev, ccx, ccy };
  },
  View: ({ c, g }) => {
    const f = useCurrentFrame();
    return (
      <>
        {g.tiles.map((t: any, i: number) => {
          const it = g.items[i];
          const at = g.rev[i];
          const u = SP.move(sec(f - at, c.fps));
          // 가운데(그리드 중심) 쪽 가장자리에서 펼쳐진다
          const ox = g.ccx < t.x ? 'left' : g.ccx > t.x + t.w ? 'right' : 'center';
          const oy = g.ccy < t.y ? 'top' : g.ccy > t.y + t.h ? 'bottom' : 'center';
          const horiz = Math.abs((t.x + t.w / 2) - g.ccx) > Math.abs((t.y + t.h / 2) - g.ccy);
          const sx = horiz ? u : 1, sy = horiz ? 1 : u;
          const Icon = iconFor(it.emoji, c.category);
          const isz = Math.min(t.w, t.h) * 0.32;
          return (
            <div key={i} style={{ position: 'absolute', left: 0, top: 0, width: c.W, height: c.H, transform: `scale(${sx}, ${sy})`, transformOrigin: `${ox === 'left' ? t.x : ox === 'right' ? t.x + t.w : t.x + t.w / 2}px ${oy === 'top' ? t.y : oy === 'bottom' ? t.y + t.h : t.y + t.h / 2}px` }}>
              {u > 0.01 && (
                <Panel c={c} x={t.x} y={t.y} w={t.w} h={t.h} r={52}>
                  <div style={{ position: 'absolute', left: 50, top: 50, transform: `scale(${SP.pop(sec(f - at - 5, c.fps))})`, transformOrigin: 'left top' }}><Icon size={isz} color={K.ink} strokeWidth={2} /></div>
                  <div style={{ position: 'absolute', left: 50, right: 40, bottom: 46 }}>
                    <Rise p={SP.rise(sec(f - at - 7, c.fps))}><div style={{ font: KO_FONT(800, Math.min(64, t.w / Math.max(4, [...it.label].length) * 1.05)), color: K.ink, letterSpacing: -1.5, whiteSpace: 'nowrap' }}>{it.label}</div></Rise>
                  </div>
                </Panel>
              )}
            </div>
          );
        })}
      </>
    );
  },
};

// ───────────────── 아이콘: 앱 아이콘이 0에서 튀어나오고, 커서가 길게 누른다 ─────────────────
const IconScene: Tpl = {
  geo: (c) => {
    const L = frameLayout(c.W, c.H);
    const v = c.scene.visual;
    const sz = L.land ? 300 : 340;
    const cy = center(c) - 130;
    const fit = fitLines(v.text || '', L.colW, [120, 104, 92, 80, 70], 800, 2);
    const press = Math.min(c.t0 + 26, c.outAt - 30);
    const keys: CKey[] = [{ f: press, x: c.W / 2 + sz * 0.1, y: cy + sz * 0.1, act: 'down' }, { f: press + 16, x: c.W / 2 + sz * 0.1, y: cy + sz * 0.1, act: 'up' }];
    const zooms: ZKey[] = [{ f: press - 4, z: 1.1, x: c.W / 2, y: cy }, { f: press + 30, z: 1, x: c.W / 2, y: c.H / 2 }];
    return { keys, zooms, sz, cy, fit, press };
  },
  View: ({ c, g }) => {
    const f = useCurrentFrame();
    const v = c.scene.visual;
    const Icon = iconFor(v.emoji, c.category);
    const pop = SP.pop(sec(f - c.t0, c.fps));
    const squish = 1 - 0.08 * (SP.snap(sec(f - g.press, c.fps)) - SP.pop(sec(f - g.press - 16, c.fps)));
    const lh = g.fit.size * 1.15;
    return (
      <>
        <div style={{ position: 'absolute', left: c.W / 2 - g.sz / 2, top: g.cy - g.sz / 2, width: g.sz, height: g.sz, borderRadius: g.sz * 0.23, background: K.ink, transform: `scale(${pop * squish})`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 30px 60px rgba(0,0,0,0.18)' }}>
          <div style={{ transform: `scale(${SP.pop(sec(f - c.t0 - 6, c.fps))})` }}><Icon size={g.sz * 0.5} color={K.white} strokeWidth={1.9} /></div>
        </div>
        {hasPhoto(c) && <Panel c={c} x={c.W / 2 - frameLayout(c.W, c.H).colW / 2} y={g.cy + g.sz / 2 + 40} w={frameLayout(c.W, c.H).colW} h={g.fit.lines.length * lh + 70} r={48} />}
        {g.fit.lines.map((ln: string, i: number) => (
          <div key={i} style={{ position: 'absolute', left: 0, width: c.W, top: g.cy + g.sz / 2 + 74 + i * lh }}>
            <Rise p={SP.rise(sec(f - c.t0 - 10 - i * 4, c.fps))}><div style={{ textAlign: 'center', font: KO_FONT(800, g.fit.size), letterSpacing: -g.fit.size * 0.03, color: K.ink, lineHeight: `${lh}px`, whiteSpace: 'nowrap' }}>{ln}</div></Rise>
          </div>
        ))}
      </>
    );
  },
};

// ───────────────── 인용 / 성경 구절: 줄마다 올라오고, 커서가 첫 줄을 드래그해 선택한다 ─────────────────
const Quote: Tpl = {
  geo: (c) => {
    const L = frameLayout(c.W, c.H);
    const v = c.scene.visual;
    const fit = fitLines(v.text || '', L.colW - 120, [92, 84, 76, 68, 60, 54], 800, 5);
    const lh = fit.size * 1.32;
    const h = fit.lines.length * lh;
    const y0 = center(c) - h / 2;
    const x0 = c.W / 2 - L.colW / 2 + 60;
    const w0 = measure(fit.lines[0] || '', KO_FONT(800, fit.size), -fit.size * 0.02);
    const sel = Math.min(c.t0 + 34, c.outAt - 30);
    const keys: CKey[] = [{ f: sel, x: x0, y: y0 + lh * 0.55, act: 'down' }, { f: sel + 16, x: x0 + w0, y: y0 + lh * 0.55, act: 'up' }];
    const zooms: ZKey[] = [];
    return { keys, zooms, fit, lh, h, y0, x0, w0, sel };
  },
  View: ({ c, g }) => {
    const f = useCurrentFrame();
    const L = frameLayout(c.W, c.H);
    const s = clamp(easeInOut((f - g.sel) / 16));
    const font = KO_FONT(800, g.fit.size);
    return (
      <>
        <Panel c={c} x={c.W / 2 - L.colW / 2} y={g.y0 - 80} w={L.colW} h={g.h + 160} r={56} white={hasPhoto(c)} />
        {s > 0 && <div style={{ position: 'absolute', left: g.x0 - 12, top: g.y0 + g.lh * 0.1, width: (g.w0 + 24) * s, height: g.lh * 0.82, borderRadius: 14, background: K.ink }} />}
        {g.fit.lines.map((ln: string, i: number) => (
          <div key={i} style={{ position: 'absolute', left: g.x0, top: g.y0 + i * g.lh }}>
            <Rise p={SP.rise(sec(f - c.t0 - i * 4, c.fps))}>
              <div style={{ font, letterSpacing: -g.fit.size * 0.02, lineHeight: `${g.lh}px`, color: K.ink, whiteSpace: 'nowrap', position: 'relative' }}>
                {ln}
                {i === 0 && s > 0 && <div style={{ position: 'absolute', left: -12, top: 0, width: (g.w0 + 24) * s, height: g.lh, overflow: 'hidden' }}><div style={{ position: 'absolute', left: 12, top: 0, color: K.white, whiteSpace: 'nowrap' }}>{ln}</div></div>}
              </div>
            </Rise>
          </div>
        ))}
      </>
    );
  },
};

// ───────────────── 사진: 리퀴드 글래스 툴바 → 슬라이더로 바뀌고, 끌면 사진이 해 질 녘 빛으로 다시 비춰진다
//                    (번갈아) 잠금 화면처럼 큰 글래스 글자 + 홈 바가 늘어나 글래스 플레이어가 된다 ─────────────────
const ImageScene: Tpl = {
  geo: (c) => {
    const L = frameLayout(c.W, c.H);
    const v = c.scene.visual;
    const lock = (c.ord ?? c.index) % 2 === 1 && !!v.text;
    const barW = Math.min(L.colW, 900), barH = 132, barX = c.W / 2 - barW / 2, barY = L.bottom - barH - 20;
    const clickF = Math.min(c.t0 + 22, c.outAt - 50);
    const dragA = clickF + 12, dragB = Math.min(dragA + Math.round(c.fps * 1.3), c.outAt - 16);
    const trackX = barX + 150, trackW = barW - 210, ky = barY + barH / 2;
    const keys: CKey[] = lock ? [] : [
      { f: clickF, x: barX + 70, y: ky, act: 'click' },
      { f: dragA, x: trackX, y: ky, act: 'down' },
      { f: dragB, x: trackX + trackW, y: ky, act: 'up' },
    ];
    const zooms: ZKey[] = lock ? [{ f: c.t0 + 4, z: 1.06, x: c.W / 2, y: c.H * 0.4 }, { f: c.outAt - 14, z: 1, x: c.W / 2, y: c.H / 2 }]
      : [{ f: clickF - 6, z: 1.1, x: c.W / 2, y: ky }, { f: dragB + 6, z: 1, x: c.W / 2, y: c.H / 2 }];
    const tfit = lock ? fitLines(v.text || '', L.colW, L.land ? [230, 200, 170, 140] : [210, 180, 150, 124, 104], 800, 2) : null;
    return { keys, zooms, lock, barW, barH, barX, barY, clickF, dragA, dragB, trackX, trackW, ky, tfit };
  },
  View: ({ c, g }) => {
    const f = useCurrentFrame();
    const v = c.scene.visual;
    const L = frameLayout(c.W, c.H);
    const src = v.src;
    if (g.lock) {
      const lh = g.tfit.size * 1.08;
      const y0 = L.land ? 150 : 330;
      const bar = SP.move(sec(f - c.t0 - 30, c.fps)); // 홈 바 → 플레이어
      const pw = lerp(280, L.colW, bar), ph = lerp(12, 150, bar), py = L.bottom - ph - 10 * (1 - bar);
      const prog = clamp((f - c.t0 - 40) / Math.max(1, c.outAt - c.t0 - 40));
      return (
        <>
          <Photo src={src} W={c.W} H={c.H} />
          {g.tfit.lines.map((ln: string, i: number) => {
            const p = SP.pop(sec(f - c.t0 - 4 - i * 5, c.fps));
            return <div key={i} style={{ position: 'absolute', left: 0, top: 0, width: c.W, height: c.H, transform: `scale(${p})`, transformOrigin: `${c.W / 2}px ${y0 + i * lh + lh / 2}px` }}>
              <GlassText src={src} text={ln} font={KO_FONT(800, g.tfit.size)} size={g.tfit.size} cx={c.W / 2} y={y0 + i * lh} W={c.W} H={c.H} spacing={-g.tfit.size * 0.03} />
            </div>;
          })}
          {bar < 0.05
            ? <div style={{ position: 'absolute', left: c.W / 2 - 140, top: L.bottom - 22, width: 280, height: 12, borderRadius: 6, background: K.white }} />
            : <Glass src={src} x={c.W / 2 - pw / 2} y={py} w={pw} h={ph} r={Math.min(ph / 2, 48)} W={c.W} H={c.H} opts={{ frost: true, tint: [0.08, 0.08, 0.1, 0.28] }}>
                {bar > 0.7 && <>
                  <div style={{ position: 'absolute', left: 40, top: 30, font: `700 36px ${F.ui}`, color: K.white }}>NextYou</div>
                  <div style={{ position: 'absolute', left: 40, top: 76, font: `500 28px ${F.ui}`, color: 'rgba(255,255,255,0.7)' }}>{String(c.index + 1).padStart(2, '0')} — {(v.highlight && v.highlight[0]) || ''}</div>
                  <div style={{ position: 'absolute', left: 40, right: 40, bottom: 22, height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.3)' }}><div style={{ width: `${prog * 100}%`, height: '100%', borderRadius: 4, background: K.white }} /></div>
                </>}
              </Glass>}
        </>
      );
    }
    // 툴바 → 슬라이더
    const morph = SP.move(sec(f - g.clickF, c.fps));
    const kp = clamp(easeInOut((f - g.dragA) / Math.max(1, g.dragB - g.dragA)));
    const held = f >= g.dragA && f <= g.dragB;
    const kx = g.trackX + g.trackW * kp;
    const warmX = f >= g.dragA ? c.W * kp : -1; // 노브가 끝까지 가면 사진 전체가 해 질 녘 빛
    const hold = SP.snap(sec(f - g.dragA, c.fps)) - SP.snap(sec(f - g.dragB, c.fps));
    const lens = 66 + 54 * hold;
    const ap = SP.pop(sec(f - c.t0 - 6, c.fps));
    const w = g.barW * ap;
    const Adjust = iconFor('🎚️');
    return (
      <>
        <Photo src={src} W={c.W} H={c.H} warmX={warmX} />
        {w > 4 && (
          <Glass src={src} x={c.W / 2 - w / 2} y={g.barY} w={w} h={g.barH} r={g.barH / 2} W={c.W} H={c.H} opts={{ frost: true, tint: [0.06, 0.06, 0.08, 0.3] }}>
            {ap > 0.9 && <>
              <div style={{ position: 'absolute', left: 30, top: g.barH / 2 - 40, width: 80, height: 80, borderRadius: 40, background: morph > 0.5 ? K.white : 'rgba(255,255,255,0.16)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <SunIcon color={morph > 0.5 ? K.ink : K.white} />
              </div>
              {/* 글자는 위로 빠져나가고 트랙이 그어진다 (모양으로만 바뀜) */}
              <div style={{ position: 'absolute', left: 140, right: 40, top: 0, height: g.barH, overflow: 'hidden' }}>
                <div style={{ height: g.barH, display: 'flex', alignItems: 'center', transform: `translateY(${-morph * g.barH}px)`, font: KO_FONT(800, 52), color: K.white, whiteSpace: 'nowrap' }}>{v.text || 'Golden hour'}</div>
              </div>
              <div style={{ position: 'absolute', left: g.trackX - (c.W / 2 - w / 2), top: g.barH / 2 - 6, width: g.trackW * easeOutCubic((f - g.clickF - 4) / 10), height: 12, borderRadius: 6, background: 'rgba(255,255,255,0.35)' }} />
              <div style={{ position: 'absolute', left: g.trackX - (c.W / 2 - w / 2), top: g.barH / 2 - 6, width: g.trackW * kp, height: 12, borderRadius: 6, background: K.white }} />
            </>}
          </Glass>
        )}
        {morph > 0.95 && (held
          ? <Glass src={src} x={kx - lens * 0.7} y={g.ky - lens / 2} w={lens * 1.4} h={lens} r={lens / 2} W={c.W} H={c.H} opts={{ mag: 0.75, strength: 20, band: 24, tint: [1, 1, 1, 0.04], warm: false }} />
          : <div style={{ position: 'absolute', left: kx - lens * 0.7, top: g.ky - lens / 2, width: lens * 1.4, height: lens, borderRadius: lens / 2, background: K.white, boxShadow: '0 6px 16px rgba(0,0,0,0.25)' }} />)}
        {void Adjust}
      </>
    );
  },
};
const SunIcon: React.FC<{ color: string }> = ({ color }) => (
  <svg width={44} height={44} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round"><circle cx={12} cy={12} r={4} />{[0, 45, 90, 135, 180, 225, 270, 315].map(a => { const r = (a * Math.PI) / 180; return <line key={a} x1={12 + Math.cos(r) * 7} y1={12 + Math.sin(r) * 7} x2={12 + Math.cos(r) * 9.5} y2={12 + Math.sin(r) * 9.5} />; })}</svg>
);

// ───────────────── 챕터 ─────────────────
const Chapter: Tpl = {
  geo: (c) => {
    const L = frameLayout(c.W, c.H);
    const v = c.scene.visual;
    const fit = fitLines(v.title || v.text || '', L.colW, [110, 96, 84, 72], 800, 2);
    return { keys: [{ f: c.t0 + 16, x: c.W * 0.68, y: center(c) + 200 }], zooms: [], fit };
  },
  View: ({ c, g }) => {
    const f = useCurrentFrame();
    const v = c.scene.visual;
    const n = String(v.number || c.index + 1).padStart(2, '0');
    const cy = center(c);
    const size = frameLayout(c.W, c.H).land ? 300 : 360;
    const lh = g.fit.size * 1.15;
    return (
      <>
        <div style={{ position: 'absolute', left: 0, width: c.W, top: cy - size * 0.9 }}>
          <Rise p={SP.rise(sec(f - c.t0, c.fps))}><div style={{ textAlign: 'center', font: `800 ${size}px ${F.word}`, fontStretch: '125%', color: K.ink, lineHeight: 1 }}>{n}</div></Rise>
        </div>
        {g.fit.lines.map((ln: string, i: number) => (
          <div key={i} style={{ position: 'absolute', left: 0, width: c.W, top: cy + size * 0.25 + i * lh }}>
            <Rise p={SP.rise(sec(f - c.t0 - 6 - i * 4, c.fps))}><div style={{ textAlign: 'center', font: KO_FONT(800, g.fit.size), color: K.ink, lineHeight: `${lh}px`, letterSpacing: -2, whiteSpace: 'nowrap' }}>{ln}</div></Rise>
          </div>
        ))}
      </>
    );
  },
};

// ───────────────── 마무리: 커서가 구독 버튼을 누르면 버튼이 '구독 중 ✓'으로 모양을 바꾼다 ─────────────────
export const OUTRO_TAIL = 1.45; // 마지막 워드마크 시퀀스 (초)
const Outro: Tpl = {
  geo: (c) => {
    const L = frameLayout(c.W, c.H);
    const v = c.scene.visual;
    const fit = fitLines(v.text || '', L.colW, [120, 104, 92, 80], 800, 3);
    const lh = fit.size * 1.15;
    const h = fit.lines.length * lh;
    const y0 = center(c) - h / 2 - 90;
    const label = c.lang === 'ko' ? '구독하기' : 'Subscribe';
    const done = c.lang === 'ko' ? '구독 중' : 'Subscribed';
    const bh = 112;
    const w1 = measure(label, `700 46px ${F.ui}`) + 150, w2 = measure(done, `700 46px ${F.ui}`) + 170;
    const by = y0 + h + 90;
    const tail = Math.round(OUTRO_TAIL * c.fps);
    const clickF = Math.max(c.t0 + 14, Math.min(c.t0 + 30, c.dur - tail - 24));
    const keys: CKey[] = [{ f: clickF, x: c.W / 2 + 20, y: by + bh / 2, act: 'click' }];
    const zooms: ZKey[] = [{ f: clickF - 6, z: 1.08, x: c.W / 2, y: by }, { f: c.dur - tail - 14, z: 1, x: c.W / 2, y: c.H / 2 }];
    return { keys, zooms, fit, lh, y0, h, label, done, bh, w1, w2, by, clickF, tail };
  },
  View: ({ c, g }) => {
    const f = useCurrentFrame();
    const sw = SP.move(sec(f - g.clickF, c.fps));
    const w = lerp(g.w1, g.w2, sw);
    const on = f >= g.clickF;
    const swap = SP.rise(sec(f - g.clickF, c.fps));
    return (
      <>
        {g.fit.lines.map((ln: string, i: number) => (
          <div key={i} style={{ position: 'absolute', left: 0, width: c.W, top: g.y0 + i * g.lh }}>
            <Rise p={SP.rise(sec(f - c.t0 - i * 4, c.fps))}><div style={{ textAlign: 'center', font: KO_FONT(800, g.fit.size), letterSpacing: -g.fit.size * 0.03, color: K.ink, lineHeight: `${g.lh}px`, whiteSpace: 'nowrap' }}>{ln}</div></Rise>
          </div>
        ))}
        <div style={{ position: 'absolute', left: c.W / 2 - w / 2, top: g.by, width: w, height: g.bh, borderRadius: g.bh / 2, background: on ? '#D6D2C8' : K.ink, transform: `scale(${SP.pop(sec(f - c.t0 - 8, c.fps))})`, overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `translateY(${-swap * g.bh}px)`, font: `700 46px ${F.ui}`, color: K.white }}>{g.label}</div>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, transform: `translateY(${(1 - swap) * g.bh}px)`, font: `700 46px ${F.ui}`, color: K.ink }}>
            <svg width={40} height={40} viewBox="0 0 24 24" fill="none" stroke={K.ink} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.2 4.2L19 7" strokeDasharray={24} strokeDashoffset={24 * (1 - easeOutCubic((f - g.clickF - 6) / 10))} /></svg>
            {g.done}
          </div>
        </div>
      </>
    );
  },
};

export const KTEMPLATES: Record<string, Tpl> = {
  headline: Headline, stat: Stat, chart: Chart,
  list: { geo: listGeo(false), View: ListView(false) }, checklist: { geo: listGeo(true), View: ListView(true) },
  compare: Compare, timeline: Timeline, iconGrid: IconGrid, icon: IconScene,
  quote: Quote, scripture: Quote, image: ImageScene, chapter: Chapter, outro: Outro,
};
export const tplFor = (type: string) => KTEMPLATES[type] || Headline;
export { pillRect };
