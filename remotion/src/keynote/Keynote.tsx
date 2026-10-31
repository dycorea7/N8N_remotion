// KEYNOTE 스타일 컴포지션: 끊김 없는 한 테이크.
//  - 장면 사이: 검은 원이 화면을 덮었다가 다음 장면의 알약으로 줄어들기 / 조리개 / 페이지 밀기 (크로스페이드 없음)
//  - 커서가 모든 변화를 직접 누르고 끌고, 카메라가 그 순간을 스크린 스튜디오처럼 확대 (커서도 같이 커짐)
//  - 처음: 워드마크가 마침표 속으로 접히고 점이 알약이 된다 / 끝: 알약 → 점 → 글자가 튀어나와 첫 프레임과 같아진다
import React, { useLayoutEffect, useMemo, useState } from 'react';
import '@fontsource-variable/archivo/wdth.css';
import '@fontsource-variable/geist/index.css';
import { AbsoluteFill, Audio, continueRender, delayRender, interpolate, OffthreadVideo, Sequence, useCurrentFrame, useVideoConfig } from 'remotion';
import { resolveSrc } from '../assets';
import { Sfx } from '../scenes';
import { Caption, ShortProps } from '../types';
import { Photo, usePhotos } from './glass';
import { Cursor, Iris, Pill, Wordmark, wordmarkOut, wordmarkState } from './parts';
import { CKey, GCtx, OUTRO_TAIL, ZKey, tplFor } from './scenes';
import { FONT_LOADS, F, INTRO, K, Kind, PILL_FONT, PUSH, SP, T_IN, T_OUT, clamp, easeInCubic, easeInOut, easeOutCubic, fitLines, frameLayout, hasPill, kindsFor, lerp, measure, pillLabel, pillRect, springSum } from './util';

type Plan = { from: number; dur: number; kin: Kind; kout: Kind; t0: number; outAt: number; c: GCtx; g: any; bg?: string };

const IRIS_OUT = 8, IRIS_IN = 12;

export const KeynoteShort: React.FC<ShortProps> = (props) => {
  const frame = useCurrentFrame();
  const { fps, width: W, height: H, durationInFrames } = useVideoConfig();
  const L = frameLayout(W, H);
  const scenes = props.scenes;
  const srcs = useMemo(() => Array.from(new Set(scenes.flatMap(s => [s.visual.type === 'image' ? s.visual.src : undefined, s.visual.bgSrc]).filter(Boolean) as string[])), [scenes]);
  const fontsOk = useKeynoteFonts();
  const photosOk = usePhotos(srcs, W, H);
  const ready = fontsOk && photosOk;
  const IF = Math.round(INTRO * fps);
  const outF = Math.round(T_OUT * fps), inF = Math.round(T_IN * fps), P = Math.round(PUSH * fps);
  const tail = Math.round(OUTRO_TAIL * fps);

  const plans: Plan[] = useMemo(() => {
    const kinds = kindsFor(scenes);
    if (scenes[0] && scenes[0].visual.type === 'image') kinds[0] = 'iris';
    return scenes.map((s, i) => {
      const from = Math.round(s.start * fps);
      const dur = Math.max(1, Math.round(s.end * fps) - from);
      const kin = kinds[i], kout: Kind = i < scenes.length - 1 ? kinds[i + 1] : 'none';
      const t0 = i === 0 ? IF + (kin === 'iris' ? 4 : 0) : kin === 'flood' ? inF - 2 : kin === 'iris' ? 5 : kin === 'push' ? Math.round(P * 0.55) : 0;
      const outLen = kout === 'flood' ? outF + 10 : kout === 'iris' ? IRIS_OUT + 10 : kout === 'push' ? 8 : tail;
      const outAt = Math.max(t0 + 20, dur - outLen);
      const v: any = s.visual;
      const bg = v.bgSrc && !['image', 'chapter', 'outro'].includes(v.type) ? v.bgSrc : undefined;
      const ord = scenes.slice(0, i).filter(x => x.visual.type === v.type).length;
      const c: GCtx = { scene: s, index: i, W, H, fps, dur, t0, lang: props.lang, category: props.category, bg, outAt, ord };
      return { from, dur, kin, kout, t0, outAt, c, g: null as any, bg };
    });
  }, [scenes, W, H, fps]);
  // geo는 글자 폭을 재므로 폰트·사진이 준비된 뒤에 계산
  const geos = useMemo(() => (ready ? plans.map(p => tplFor(p.c.scene.visual.type).geo(p.c)) : null), [ready, plans]);

  // ── 커서 동선 (전역 프레임) ──
  const { keys, zooms } = useMemo(() => {
    const keys: CKey[] = [], zooms: ZKey[] = [];
    if (!geos) return { keys, zooms };
    const rest = (i: number) => ({ x: W * 0.66, y: L.land ? H * 0.62 : H * 0.6 + (i % 2) * 40 });
    // 인트로: 알약을 누른다 (사진이면 조리개가 닫히는 계기)
    const c0 = { x: W / 2, y: H * 0.44 };
    keys.push({ f: Math.round(fps * 0.96), x: c0.x + 30, y: c0.y + 10, act: scenes[0]?.visual.type === 'image' ? 'click' : undefined });
    plans.forEach((p, i) => {
      const g = geos[i];
      for (const k of g.keys) if (k.f >= p.t0 && k.f <= p.outAt + 4) keys.push({ ...k, f: k.f + p.from });
      for (const z of g.zooms) zooms.push({ ...z, f: z.f + p.from });
      const end = p.from + p.dur;
      // 나가는 전환의 커서 동작
      if (p.kout === 'flood' || p.kout === 'iris') {
        const pr = hasPill(p.c.scene) ? pillRect(p.c.scene, i, W, H) : null;
        const o = pr ? { x: pr.x + pr.w * 0.6, y: pr.y + pr.h * 0.55 } : rest(i);
        const at = end - (p.kout === 'flood' ? outF : IRIS_OUT) - 3;
        keys.push({ f: at, ...o, act: 'click' });
        zooms.push({ f: at - 14, z: 1, x: W / 2, y: H / 2 });
      } else if (p.kout === 'push') {
        const y = L.land ? H * 0.55 : H * 0.62;
        keys.push({ f: end - 4, x: W * 0.84, y, act: 'down' }, { f: end + P - 4, x: W * 0.2, y, act: 'up' });
        zooms.push({ f: end - 18, z: 1, x: W / 2, y: H / 2 });
      }
      if (i === plans.length - 1) {
        zooms.push({ f: durationInFrames - tail - 16, z: 1, x: W / 2, y: H / 2 });
        // 마지막 프레임 = 첫 프레임: 커서는 처음처럼 화면 밖으로 나간다
        keys.push({ f: durationInFrames - Math.round(fps * 0.5), x: W * 1.06, y: H * 0.8 });
      }
    });
    keys.sort((a, b) => a.f - b.f);
    zooms.sort((a, b) => a.f - b.f);
    return { keys, zooms };
  }, [geos, plans]);

  // 카메라: 바뀔 때마다 스프링 하나씩 더한 합
  const z = springSum(frame / fps, 1, zooms.map(k => ({ t: k.f / fps, v: k.z })), SP.move);
  const zx = springSum(frame / fps, W / 2, zooms.map(k => ({ t: k.f / fps, v: k.x })), SP.move);
  const zy = springSum(frame / fps, H / 2, zooms.map(k => ({ t: k.f / fps, v: k.y })), SP.move);
  const cur = cursorAt(keys, frame, fps, W, H);
  const musicVol = props.musicVolume ?? 0.16;
  const lastPlan = plans[plans.length - 1];

  return (
    <AbsoluteFill style={{ backgroundColor: K.canvas, overflow: 'hidden' }}>
      <AbsoluteFill style={{ transformOrigin: `${zx}px ${zy}px`, transform: `scale(${Math.max(0.5, z)})` }}>
        {geos && plans.map((p, i) => (
          <Sequence key={i} from={p.from} durationInFrames={p.dur + (p.kout === 'push' ? P : 0)} name={`${i}:${p.c.scene.visual.type}`}>
            <KScene p={p} g={geos[i]} P={P} inF={inF} />
          </Sequence>
        ))}
        {/* 장면 사이 전환 (검은 원 / 조리개) */}
        {geos && plans.map((p, i) => i > 0 && <Transition key={'t' + i} i={i} p={p} prev={plans[i - 1]} frame={frame} outF={outF} inF={inF} keys={keys} />)}
        {/* 인트로 워드마크 */}
        {geos && frame < IF + 2 && <Intro frame={frame} first={plans[0]} IF={IF} />}
        {/* 아웃트로 워드마크 (마지막 프레임 = 첫 프레임) */}
        {geos && lastPlan && frame >= durationInFrames - tail && <OutroTail u={(frame - (durationInFrames - tail)) / fps} origin={keys.length ? cursorAt(keys, durationInFrames - tail, fps, W, H) : { x: W / 2, y: H / 2 }} lang={props.lang} />}
        <Cursor x={cur.x} y={cur.y} pressed={cur.pressed} ring={cur.ring} scale={L.land ? 1 : 1.1} />
      </AbsoluteFill>
      {ready && <KCaptions captions={props.captions} lang={props.lang} hideAfter={durationInFrames - tail + Math.round(0.3 * fps)} />}
      {/* 효과음: 클릭마다 딸깍, 덮기·밀기는 휙 */}
      {keys.filter(k => k.act === 'click' || k.act === 'down').map((k, i) => <Sfx key={'c' + i} name="tick" at={k.f} volume={0.32} />)}
      {plans.map((p, i) => i > 0 && p.kin !== 'none' && <Sfx key={'w' + i} name="whoosh" at={p.from - (p.kin === 'flood' ? outF : p.kin === 'iris' ? IRIS_OUT : 0)} volume={p.kin === 'push' ? 0.16 : 0.2} />)}
      <Sfx name="pop" at={Math.round(fps * 0.7)} volume={0.26} />
      <Sfx name="whoosh" at={durationInFrames - tail} volume={0.2} />
      <Sfx name="pop" at={durationInFrames - tail + Math.round(fps * 1.04)} volume={0.28} />
      {props.audioSrc && <Audio src={resolveSrc(props.audioSrc)!} />}
      {props.musicSrc && <Audio src={resolveSrc(props.musicSrc)!} loop volume={(f) => musicVol * interpolate(f, [0, fps * 1.5, durationInFrames - fps * 2.5, durationInFrames], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })} />}
    </AbsoluteFill>
  );
};

/** 한 장면: 배경(캔버스 색 또는 사진) + 머리 알약 + 템플릿. 밀기 전환이면 통째로 옆으로 */
const KScene: React.FC<{ p: Plan; g: any; P: number; inF: number }> = ({ p, g, P, inF }) => {
  const f = useCurrentFrame();
  const { width: W, height: H, fps } = useVideoConfig();
  const T = tplFor(p.c.scene.visual.type);
  let x = 0;
  if (p.kin === 'push') x += W * (1 - easeInOut(f / P));
  if (p.kout === 'push' && f > p.dur - 1) x -= W * easeInOut((f - p.dur + 1) / P);
  const pr = hasPill(p.c.scene) ? pillRect(p.c.scene, p.c.index, W, H) : null;
  const labelP = p.c.index === 0 ? 1 : p.kin === 'flood' ? SP.rise((f - inF + 3) / fps) : SP.rise((f - p.t0) / fps);
  const pillScale = p.kin === 'push' ? SP.pop((f - p.t0 + 6) / fps) : 1;
  return (
    <AbsoluteFill style={{ transform: x ? `translateX(${x}px)` : undefined, background: K.canvas, overflow: 'hidden' }}>
      {p.bg && (p.c.scene.visual.bgVideo
        // 그래픽 뒤 실사 영상: 화면을 채워 재생 (유리 패널은 같은 영상의 정지 화면으로 굴절을 그린다)
        ? <OffthreadVideo src={resolveSrc(p.c.scene.visual.bgVideo)!} muted trimBefore={Math.max(0, Math.round((p.c.scene.visual.bgVideoStart || 0) * fps))} style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, objectFit: 'cover' }} />
        : <Photo src={p.bg} W={W} H={H} />)}
      <T.View c={p.c} g={g} />
      {pr && <Pill x={pr.x} y={pr.y} w={pr.w} h={pr.h} label={pr.label} labelP={labelP} scale={pillScale} />}
    </AbsoluteFill>
  );
};

/** 장면 i로 들어가는 전환 (전역 프레임 기준) */
const Transition: React.FC<{ i: number; p: Plan; prev: Plan; frame: number; outF: number; inF: number; keys: CKey[] }> = ({ i, p, prev, frame, outF, inF, keys }) => {
  const { width: W, height: H, fps } = useVideoConfig();
  const tb = p.from;
  if (p.kin === 'flood') {
    if (frame < tb - outF || frame >= tb + inF) return null;
    if (frame < tb) {
      const o = cursorAt(keys, tb - outF, fps, W, H);
      const R = Math.hypot(Math.max(o.x, W - o.x), Math.max(o.y, H - o.y)) * 1.08;
      const r = R * easeInCubic((frame - (tb - outF)) / outF);
      return <div style={{ position: 'absolute', left: o.x - r, top: o.y - r, width: r * 2, height: r * 2, borderRadius: '50%', background: K.ink }} />;
    }
    const pr = hasPill(p.c.scene) ? pillRect(p.c.scene, i, W, H) : { x: W / 2 - 40, y: H / 2 - 40, w: 80, h: 80 };
    const e = easeOutCubic((frame - tb) / inF);
    const ov = 60;
    const x = lerp(-ov, pr.x, e), y = lerp(-ov, pr.y, e), w = lerp(W + ov * 2, pr.w, e), h = lerp(H + ov * 2, pr.h, e);
    const r = lerp(0, pr.h / 2, Math.pow(e, 0.6));
    return <div style={{ position: 'absolute', left: x, top: y, width: w, height: h, borderRadius: r, background: K.ink }} />;
  }
  if (p.kin === 'iris') {
    if (frame < tb - IRIS_OUT || frame >= tb + IRIS_IN) return null;
    const open = frame < tb ? 1 - easeInCubic((frame - (tb - IRIS_OUT)) / IRIS_OUT) : easeOutCubic((frame - tb) / IRIS_IN);
    return <Iris open={open} cx={W / 2} cy={H * 0.46} W={W} H={H} />;
  }
  void prev;
  return null;
};

/** 인트로: 워드마크가 접히고 → 점이 알약 → 알약이 첫 장면 자리로 (사진이면 조리개가 닫힘) */
const Intro: React.FC<{ frame: number; first: Plan; IF: number }> = ({ frame, first, IF }) => {
  const { width: W, height: H, fps } = useVideoConfig();
  const L = frameLayout(W, H);
  const S = L.land ? 190 : 150;
  const cy = H * 0.44;
  const isImg = first.c.scene.visual.type === 'image';
  const v: any = first.c.scene.visual;
  const label = isImg ? String(v.text || (v.highlight && v.highlight[0]) || 'NextYou') : pillLabel(first.c.scene, 0);
  const ph = L.pillH * (isImg ? 1.25 : 1);
  const pw = measure(label, PILL_FONT(ph)) + ph * 1.1;
  const u = frame / fps;
  const st = wordmarkState(u, S, { w: pw, h: ph });
  // 1.0초 뒤: 알약이 첫 장면의 알약 자리로 날아간다
  const target = !isImg && hasPill(first.c.scene) ? pillRect(first.c.scene, 0, W, H) : null;
  const m = target ? easeInOut((u - 1.0) / (INTRO - 1.0)) : 0;
  const cx = target ? lerp(W / 2, target.x + target.w / 2, m) : W / 2;
  const py = target ? lerp(cy, target.y + target.h / 2, m) : cy;
  const w = target ? lerp(st.w, target.w, m) : st.w;
  const h = target ? lerp(st.h, target.h, m) : st.h;
  const irisOut = isImg && frame >= IF - IRIS_OUT;
  if (frame >= IF) return null;
  return (
    <AbsoluteFill style={{ background: target && m >= 1 ? 'transparent' : K.canvas }}>
      <Wordmark k={st.k} S={S} cx={W / 2} cy={cy} dot={!st.showPill} />
      {st.showPill && <Pill x={cx - w / 2} y={py - h / 2} w={w} h={h} label={label} labelP={st.labelP} />}
      {irisOut && <Iris open={1 - easeInCubic((frame - (IF - IRIS_OUT)) / IRIS_OUT)} cx={W / 2} cy={H * 0.46} W={W} H={H} />}
    </AbsoluteFill>
  );
};

/** 아웃트로 꼬리: 검은 원이 덮고 → 가운데 알약으로 줄고 → 점 → 글자가 튀어나와 워드마크 */
const OutroTail: React.FC<{ u: number; origin: { x: number; y: number }; lang: string }> = ({ u, origin, lang }) => {
  const { width: W, height: H } = useVideoConfig();
  const L = frameLayout(W, H);
  const S = L.land ? 190 : 150;
  const cy = H * 0.44;
  const label = lang === 'ko' ? '오늘도 고맙습니다' : 'Thanks for watching';
  const ph = L.pillH * 1.25, pw = measure(label, PILL_FONT(ph)) + ph * 1.1;
  if (u < T_OUT) {
    const o = origin;
    const R = Math.hypot(Math.max(o.x, W - o.x), Math.max(o.y, H - o.y)) * 1.08;
    const r = R * easeInCubic(u / T_OUT);
    return <div style={{ position: 'absolute', left: o.x - r, top: o.y - r, width: r * 2, height: r * 2, borderRadius: '50%', background: K.ink }} />;
  }
  const v = u - T_OUT;
  if (v < 0.32) {
    const e = easeOutCubic(v / 0.32), ov = 60;
    const x = lerp(-ov, W / 2 - pw / 2, e), y = lerp(-ov, cy - ph / 2, e), w = lerp(W + ov * 2, pw, e), h = lerp(H + ov * 2, ph, e);
    return (
      <AbsoluteFill style={{ background: K.canvas }}>
        <div style={{ position: 'absolute', left: x, top: y, width: w, height: h, borderRadius: lerp(0, ph / 2, Math.pow(e, 0.6)), background: K.ink }} />
      </AbsoluteFill>
    );
  }
  const q = v - 0.32;
  if (q < 0.42) {
    // 알약 안에서 글자가 올라옴
    return <AbsoluteFill style={{ background: K.canvas }}><Pill x={W / 2 - pw / 2} y={cy - ph / 2} w={pw} h={ph} label={label} labelP={SP.rise(q)} /></AbsoluteFill>;
  }
  const st = wordmarkOut(q - 0.42, S, { w: pw, h: ph });
  return (
    <AbsoluteFill style={{ background: K.canvas }}>
      <Wordmark k={st.k} S={S} cx={W / 2} cy={cy} dot={!st.showPill} />
      {st.showPill && <Pill x={W / 2 - st.w / 2} y={cy - st.h / 2} w={st.w} h={st.h} label={label} labelP={0} />}
    </AbsoluteFill>
  );
};

/** 커서 위치·눌림 (전역 키 사이를 부드럽게, 끌기 중에는 끝까지 이어서) */
export function cursorAt(keys: CKey[], f: number, fps: number, W: number, H: number) {
  const start = { x: W * 1.06, y: H * 0.8 };
  let i = -1;
  for (let k = 0; k < keys.length; k++) if (keys[k].f <= f) i = k; else break;
  const a = i >= 0 ? keys[i] : { f: 0, ...start };
  const b = keys[i + 1];
  let x = a.x, y = a.y;
  if (b) {
    const dragging = i >= 0 && a.act === 'down';
    const gap = b.f - a.f;
    const len = dragging ? gap : Math.max(1, Math.min(gap - 2, Math.round(fps * 0.55)));
    const s = b.f - len;
    const e = easeInOut((f - s) / len);
    const d = Math.hypot(b.x - a.x, b.y - a.y);
    const arc = dragging ? 0 : Math.sin(Math.PI * e) * Math.min(80, d * 0.08);
    const nx = d ? -(b.y - a.y) / d : 0, ny = d ? (b.x - a.x) / d : 0;
    x = lerp(a.x, b.x, e) + nx * arc; y = lerp(a.y, b.y, e) + ny * arc;
  }
  // 눌림
  let pressed = 0, ring = 0;
  for (let k = Math.max(0, i - 3); k <= i; k++) {
    const kk = keys[k]; if (!kk) continue;
    if (kk.act === 'click' && f - kk.f < 5) pressed = 1;
    if ((kk.act === 'click' || kk.act === 'down') && f - kk.f < 12) ring = (f - kk.f + 1) / 12;
  }
  if (i >= 0 && keys[i].act === 'down') pressed = 1;
  return { x, y, pressed, ring };
}

/** 자막: 검은 알약. 덩어리가 바뀌면 알약 폭이 스프링으로 바뀌고 글자는 마스크에서 올라온다 */
const KCaptions: React.FC<{ captions: Caption[]; lang: string; hideAfter: number }> = ({ captions, lang, hideAfter }) => {
  const frame = useCurrentFrame();
  const { fps, width: W, height: H } = useVideoConfig();
  const L = frameLayout(W, H);
  if (frame >= hideAfter) return null;
  const t = frame / fps;
  const idx = captions.findIndex(c => t >= c.start - 0.05 && t < c.end);
  if (idx < 0) return null;
  const cur = captions[idx];
  const size = L.land ? 46 : 52;
  const font = `700 ${size}px ${F.ko}`;
  const text = cur.words.map(w => w.text).join(' ');
  const fit = fitLines(text, L.colW - 80, [size], 700, 3);
  const widthOf = (c: Caption) => { const ft = fitLines(c.words.map(w => w.text).join(' '), L.colW - 80, [size], 700, 3); return Math.max(...ft.lines.map(l => measure(l, font, 0))) + 72; };
  const wNow = widthOf(cur);
  const wPrev = idx > 0 && captions[idx - 1].end > cur.start - 0.3 ? widthOf(captions[idx - 1]) : wNow * 0.3;
  const k = SP.move(t - cur.start + 0.05);
  const w = lerp(wPrev, wNow, clamp(k, 0, 1.15));
  const lh = size * 1.32;
  const h = fit.lines.length * lh + 28;
  const p = SP.rise(t - cur.start + 0.05);
  let wi = 0;
  return (
    <div style={{ position: 'absolute', left: W / 2 - w / 2, top: L.capY, width: w, height: h, borderRadius: Math.min(h / 2, 46), background: K.ink, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 14, transform: `translateY(${(1 - p) * h}px)` }}>
        {fit.lines.map((ln, li) => (
          <div key={li} style={{ textAlign: 'center', font, lineHeight: `${lh}px`, whiteSpace: 'nowrap' }}>
            {ln.split(' ').map((word, j) => {
              const wd = cur.words[wi++];
              const active = wd && t >= wd.start - 0.03 && t < wd.end + 0.08;
              const said = wd && t >= wd.start - 0.03;
              return <span key={j} style={{ color: active ? K.white : said ? 'rgba(255,255,255,0.78)' : 'rgba(255,255,255,0.42)' }}>{word}{j < ln.split(' ').length - 1 ? ' ' : ''}</span>;
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

/** 워드마크·UI 폰트를 다 받은 뒤에 글자 폭을 잰다 (먼저 재면 폭이 틀어진 채 캐시됨) */
function useKeynoteFonts() {
  const [ok, setOk] = useState(typeof document === 'undefined');
  const [h] = useState(() => (typeof document === 'undefined' ? null : delayRender('keynote fonts')));
  useLayoutEffect(() => {
    const fonts = [...FONT_LOADS, "800 40px 'Pretendard'", "700 40px 'Pretendard'", "500 40px 'Pretendard'"];
    Promise.all(fonts.map(f => (document as any).fonts.load(f, 'NextYou0123456789.%가나다')))
      .then(() => (document as any).fonts.ready)
      .catch(() => null)
      .then(() => setOk(true));
  }, []);
  useLayoutEffect(() => { if (ok && h) continueRender(h); }, [ok]);
  return ok;
}
