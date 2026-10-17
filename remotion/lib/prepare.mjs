// n8n 요청(장면 + ElevenLabs 문자 타임스탬프)을 Remotion 입력값으로 바꾼다.
// 대본은 장면 narration을 "\n"으로 이어 붙인 문자열이어야 한다 (n8n이 그렇게 TTS를 호출한다).

export const FPS = 30;
const TAIL_SEC = 0.9;

const VISUAL_TYPES = ['headline', 'stat', 'chart', 'list', 'quote', 'compare', 'scripture', 'icon', 'outro', 'image', 'chapter', 'timeline', 'checklist', 'iconGrid'];

/** 문자 배열 → 단어 [{text, start, end, charStart, charEnd}] */
export function wordsFromAlignment(chars, starts, ends) {
  const words = [];
  let cur = null;
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i];
    if (/\s/.test(c)) {
      if (cur) { words.push(cur); cur = null; }
      continue;
    }
    if (!cur) cur = { text: '', start: starts[i], end: ends[i], charStart: i, charEnd: i };
    cur.text += c;
    cur.end = ends[i];
    cur.charEnd = i;
  }
  if (cur) words.push(cur);
  return words;
}

/** 자막 묶음: 한 줄에 읽기 좋은 길이로. 문장부호나 장면 경계에서 끊는다. */
export function chunkCaptions(words, lang, sceneBreaks) {
  const maxChars = lang === 'ko' ? 12 : 18;
  const maxWords = lang === 'ko' ? 3 : 4;
  const chunks = [];
  let cur = [];
  const flush = () => { if (cur.length) { chunks.push({ start: cur[0].start, end: cur[cur.length - 1].end, words: cur.map(w => ({ text: w.text, start: w.start, end: w.end })) }); cur = []; } };
  for (const w of words) {
    if (cur.length && sceneBreaks.has(w.charStart)) flush();
    const len = cur.reduce((n, x) => n + x.text.length, 0) + w.text.length;
    if (cur.length && (len > maxChars || cur.length >= maxWords)) flush();
    cur.push(w);
    if (/[.!?。…,，:;]["”’」]?$/.test(w.text)) flush();
  }
  flush();
  // 자막이 다음 묶음 직전까지 남아 있게 (깜빡임 방지, 최대 0.6초)
  for (let i = 0; i < chunks.length; i++) {
    const next = chunks[i + 1];
    chunks[i].end = next ? Math.min(next.start, chunks[i].end + 0.6) : chunks[i].end + 0.6;
  }
  return chunks;
}

function clean(v, n) { return String(v == null ? '' : v).trim().slice(0, n); }
function num(v) { const n = typeof v === 'number' ? v : Number(String(v).replace(/[,\s]/g, '')); return Number.isFinite(n) ? n : null; }

/** Claude가 만든 visual을 검증하고 정리한다. 이상하면 headline으로 대체. */
export function sanitizeVisual(v, narration) {
  const fallback = { type: 'headline', text: clean(narration, 40), highlight: [] };
  if (!v || typeof v !== 'object' || !VISUAL_TYPES.includes(v.type)) return fallback;
  const t = v.type;
  const out = { type: t, emoji: clean(v.emoji, 4) };
  if (t === 'image') {
    // 이미지 생성이 실패했거나 꺼져 있으면 src가 없다 → 같은 키워드의 headline으로 대체
    const text = clean(v.text, 40);
    const highlight = (Array.isArray(v.highlight) ? v.highlight : []).map(h => clean(h, 20)).filter(Boolean).slice(0, 2);
    const src = String(v.src || '');
    if (!/^(https?:\/\/|job\/)/.test(src)) return { type: 'headline', text: text || fallback.text, highlight, emoji: out.emoji };
    return { type: 'image', src, text, highlight };
  }
  if (t === 'chapter') {
    const title = clean(v.title || v.text, 40) || fallback.text;
    return { type: 'chapter', title, number: Math.max(1, Math.round(num(v.number) || 1)), highlight: (Array.isArray(v.highlight) ? v.highlight : []).map(h => clean(h, 20)).filter(Boolean).slice(0, 2) };
  }
  if (t === 'headline' || t === 'icon' || t === 'outro') {
    out.text = clean(v.text, 48) || fallback.text;
    out.highlight = (Array.isArray(v.highlight) ? v.highlight : []).map(h => clean(h, 20)).filter(Boolean).slice(0, 3);
    if (t === 'outro') out.cta = clean(v.cta, 24);
    if (t === 'icon' && !out.emoji) return { ...fallback, text: out.text };
    return out;
  }
  if (t === 'stat') {
    const value = num(v.value);
    if (value === null) return fallback;
    return { ...out, value, prefix: clean(v.prefix, 4), suffix: clean(v.suffix, 6), label: clean(v.label, 28), sub: clean(v.sub, 40), decimals: Math.min(2, Math.max(0, Math.round(num(v.decimals) || (String(value).split('.')[1] || '').length))) };
  }
  if (t === 'chart') {
    const items = (Array.isArray(v.items) ? v.items : []).map(it => ({ label: clean(it && it.label, 10), value: num(it && it.value) })).filter(it => it.label && it.value !== null && it.value >= 0).slice(0, 5);
    if (items.length < 2) return fallback;
    return { ...out, title: clean(v.title, 28), unit: clean(v.unit, 6), items };
  }
  if (t === 'list') {
    const items = (Array.isArray(v.items) ? v.items : []).map(x => clean(x, 26)).filter(Boolean).slice(0, 4);
    if (items.length < 2) return fallback;
    return { ...out, title: clean(v.title, 28), items };
  }
  if (t === 'timeline') {
    const items = (Array.isArray(v.items) ? v.items : []).map(it => ({ label: clean(it && it.label, 12), text: clean(it && (it.text || it.title), 26) })).filter(it => it.label || it.text).slice(0, 4);
    if (items.length < 2) return fallback;
    return { ...out, title: clean(v.title, 28), items };
  }
  if (t === 'checklist') {
    const items = (Array.isArray(v.items) ? v.items : []).map(x => clean(typeof x === 'string' ? x : x && (x.text || x.label), 26)).filter(Boolean).slice(0, 4);
    if (items.length < 2) return fallback;
    return { ...out, title: clean(v.title, 28), items };
  }
  if (t === 'iconGrid') {
    const items = (Array.isArray(v.items) ? v.items : []).map(it => ({ emoji: clean(it && (it.emoji || it.icon), 4), label: clean(it && (it.label || it.text), 12) })).filter(it => it.label).slice(0, 4);
    if (items.length < 2) return fallback;
    return { ...out, title: clean(v.title, 28), items };
  }
  if (t === 'quote' || t === 'scripture') {
    const text = clean(v.text, 90);
    if (!text) return fallback;
    return { ...out, text, author: clean(v.author || v.reference, 30) };
  }
  if (t === 'compare') {
    const side = s => ({ label: clean(s && s.label, 14), text: clean(s && s.text, 40) });
    const left = side(v.left), right = side(v.right);
    if (!left.label || !right.label) return fallback;
    return { ...out, title: clean(v.title, 28), left, right };
  }
  return fallback;
}

/**
 * req: { lang, category, scenes:[{narration, visual}], alignment:{characters, character_start_times_seconds, character_end_times_seconds} }
 * 반환: Remotion inputProps (audioSrc/musicSrc는 서버가 채운다)
 */
export function prepare(req) {
  const lang = req.lang === 'en' ? 'en' : 'ko';
  const fps = [24, 25, 30].includes(Number(req.fps)) ? Number(req.fps) : FPS;
  const scenesIn = (Array.isArray(req.scenes) ? req.scenes : []).filter(s => s && String(s.narration || '').trim());
  if (!scenesIn.length) throw new Error('scenes가 비어 있습니다');
  const al = req.alignment || {};
  const chars = al.characters || [];
  const starts = al.character_start_times_seconds || [];
  const ends = al.character_end_times_seconds || [];
  if (!chars.length || chars.length !== starts.length || chars.length !== ends.length) throw new Error('alignment 형식이 올바르지 않습니다');

  const narrations = scenesIn.map(s => String(s.narration).trim());
  const script = narrations.join('\n');
  const spoken = chars.join('');
  const exact = spoken === script;

  // 장면별 시작 문자 위치. 대본과 정렬 문자가 다르면 길이 비율로 근사한다.
  const offsets = [];
  let acc = 0;
  for (const n of narrations) { offsets.push(acc); acc += n.length + 1; }
  const toAlignIdx = i => exact ? i : Math.min(chars.length - 1, Math.round(i * chars.length / script.length));
  const sceneCharStarts = offsets.map(toAlignIdx);

  const words = wordsFromAlignment(chars, starts, ends);
  const audioEnd = Math.max(...ends.filter(Number.isFinite));
  const duration = audioEnd + TAIL_SEC;

  // 장면 경계 시각 = 그 장면 첫 단어의 시작
  const firstWordAt = ci => { const w = words.find(w => w.charEnd >= ci); return w ? w : null; };
  const breakChars = new Set();
  const times = sceneCharStarts.map((ci, i) => {
    if (i === 0) return 0;
    const w = firstWordAt(ci);
    if (w) breakChars.add(w.charStart);
    return w ? Math.max(0, w.start - 0.15) : audioEnd * i / sceneCharStarts.length;
  });

  const scenes = scenesIn.map((s, i) => {
    const start = times[i];
    const end = i + 1 < times.length ? times[i + 1] : duration;
    const lo = sceneCharStarts[i], hi = i + 1 < sceneCharStarts.length ? sceneCharStarts[i + 1] : chars.length;
    const sceneWords = words.filter(w => w.charStart >= lo && w.charStart < hi).map(w => ({ text: w.text, start: w.start, end: w.end }));
    const chapter = Number.isInteger(s.chapter) ? s.chapter : undefined;
    return { start, end, narration: narrations[i], words: sceneWords, visual: sanitizeVisual(s.visual, narrations[i]), chapter };
  }).filter(s => s.end - s.start > 0.3);

  // 롱폼 챕터: 각 챕터의 첫 장면 시작 시각 (유튜브 설명란 타임스탬프에도 쓴다)
  const chapterTitles = Array.isArray(req.chapters) ? req.chapters.map(c => clean(c && c.title, 60)) : [];
  const chapters = [];
  chapterTitles.forEach((title, ci) => {
    const first = scenes.find(s => s.chapter === ci);
    if (first && title) chapters.push({ title, start: chapters.length === 0 ? 0 : Math.round(first.start * 10) / 10 });
  });

  return {
    fps,
    durationInFrames: Math.ceil(duration * fps),
    chapters,
    lang,
    category: String(req.category || 'other'),
    scenes,
    captions: chunkCaptions(words, lang, breakChars),
    alignmentExact: exact,
    title: clean(req.title, 90),
  };
}
