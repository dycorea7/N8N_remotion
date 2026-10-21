// Claude 롱폼 대본(JSON)을 검증하고 장면을 한 줄로 펼친다 (장면마다 chapter 번호).
const raw = String($json.content && $json.content[0] && $json.content[0].text || '');
const stop = $json.stop_reason || '';
let clean = raw.replace(/```json|```/g, '').trim();
const tryParse = t => { try { return JSON.parse(t); } catch (e) { return null; } };
const sliceBraces = t => { const s = t.indexOf('{'), e = t.lastIndexOf('}'); return (s !== -1 && e > s) ? t.slice(s, e + 1) : t; };
let parsed = tryParse(clean);
if (typeof parsed === 'string') parsed = tryParse(parsed);
if (!parsed) parsed = tryParse(sliceBraces(clean));
if (!parsed) {
  const fixed = sliceBraces(clean).replace(/([^\s{\[,:])"([^\s,}\]:])/g, '$1”$2');
  parsed = tryParse(fixed);
}
if (!parsed) throw new Error('Claude 롱폼 JSON 파싱 실패' + (stop === 'max_tokens' ? ' (응답이 max_tokens에서 잘림)' : '') + ' — 앞 300자: ' + clean.slice(0, 300));

const src = $('Build Longform Request').first().json;
const subtitleLang = String(src.Language || 'Korean').trim().toLowerCase() === 'english' ? 'en' : 'ko';
const maxImages = Number(src.maxImages) || 14;
const s = v => String(v == null ? '' : v).replace(/["]/g, '”').trim();

const chaptersIn = (Array.isArray(parsed.chapters) ? parsed.chapters : []).filter(c => c && Array.isArray(c.scenes) && c.scenes.length);
if (chaptersIn.length < 3) throw new Error('챕터가 너무 적습니다: ' + chaptersIn.length + '개');

const chapters = [];
const scenes = [];
chaptersIn.forEach((c, ci) => {
  const title = s(c.title).slice(0, 40) || ('Part ' + (ci + 1));
  chapters.push({ title });
  c.scenes.forEach((sc, si) => {
    const narration = s(sc && sc.narration).replace(/\s*\n\s*/g, ' ');
    if (!narration) return;
    let visual = sc && typeof sc.visual === 'object' && sc.visual ? sc.visual : { type: 'headline', text: narration.slice(0, 18) };
    // 챕터 첫 장면은 챕터 표지 (1장 제외), 그 밖의 chapter 타입은 headline으로
    if (si === 0 && ci > 0) visual = { type: 'chapter', title, number: ci + 1, highlight: [] };
    else if (visual.type === 'chapter') visual = { type: 'headline', text: s(visual.title || visual.text || narration.slice(0, 18)) };
    scenes.push({ narration, visual, chapter: ci });
  });
});
if (scenes.length < 30) throw new Error('장면이 너무 적습니다: ' + scenes.length + '개');
if (scenes.length > 140) scenes.splice(140);

const MOODS = ['calm_reflective', 'hopeful_uplifting', 'tense_dramatic', 'dark_serious', 'warm_gentle'];
const CATEGORIES = ['bible', 'quote', 'wealth', 'health', 'other'];
const script = scenes.map(x => x.narration).join('\n');
const isSermon = /아멘|Amen/.test(script.slice(-400)) || String(parsed.category) === 'bible';
let category = String(parsed.category || '').trim().toLowerCase();
if (!CATEGORIES.includes(category)) category = isSermon ? 'bible' : 'other';
const mood = MOODS.includes(parsed.mood) ? parsed.mood : 'calm_reflective';
const styleFit = ['hud', 'classic', 'pop', 'either'].includes(String(parsed.style || '').trim().toLowerCase()) ? String(parsed.style).trim().toLowerCase() : 'either';

// 이미지 장면: 개수 상한, 연속 금지, 프롬프트 너무 짧으면 headline
let imageCount = 0, prevImage = false;
for (const x of scenes) {
  const v = x.visual;
  if (v.type !== 'image') { prevImage = false; continue; }
  const ok = String(v.prompt || '').replace(/[^a-z]/gi, '').length >= 15;
  if (ok && !prevImage && imageCount < maxImages) { imageCount++; prevImage = true; continue; }
  x.visual = { type: 'headline', text: s(v.text || x.narration.slice(0, 18)), highlight: v.highlight || [] };
  prevImage = false;
}
if (isSermon) for (const x of scenes) if (x.visual.type === 'stat' || x.visual.type === 'chart') x.visual = { type: 'headline', text: x.narration.slice(0, 18), highlight: [] };
// 마지막 장면만 outro
scenes.forEach((x, i) => { if (x.visual.type === 'outro' && i !== scenes.length - 1) x.visual = { type: 'headline', text: s(x.visual.text), highlight: x.visual.highlight || [] }; });

const len = subtitleLang === 'en' ? script.split(/\s+/).length : script.length;
const [lo, hi] = subtitleLang === 'en' ? [1000, 2200] : [2400, 5500];
if (len < lo) throw new Error('대본이 너무 짧습니다: ' + len + (subtitleLang === 'en' ? '단어' : '자') + ' (최소 ' + lo + ') — 다시 실행하세요');
if (len > hi) throw new Error('대본이 너무 깁니다: ' + len + (subtitleLang === 'en' ? '단어' : '자') + ' (최대 ' + hi + ')');
const warnings = [];
if (subtitleLang === 'ko' && len < 3200) warnings.push('대본 ' + len + '자 — 목표(3,400자)보다 짧아 8분이 안 될 수 있음');

const th = parsed.thumbnail || {};
const thumbnail = { text: s(th.text).slice(0, 24) || s(parsed.title).slice(0, 20), highlight: (Array.isArray(th.highlight) ? th.highlight : []).map(s).slice(0, 2), badge: s(th.badge).slice(0, 14), prompt: s(th.prompt) };
const hashtags = (Array.isArray(parsed.hashtags) ? parsed.hashtags : []).map(s).filter(h => h.startsWith('#')).slice(0, 3);
const tags = (Array.isArray(parsed.tags) ? parsed.tags : []).map(t => s(t).replace(/^#/, '')).filter(Boolean);
let tagStr = '';
for (const t of tags) { if ((tagStr + ',' + t).length > 450) break; tagStr = tagStr ? tagStr + ',' + t : t; }

console.log('chars: ' + len + ' | chapters: ' + chapters.length + ' | scenes: ' + scenes.length + ' | images: ' + imageCount + ' | ' + category + '/' + mood + ' | style ' + styleFit + (warnings.length ? ' | ' + warnings.join(' ') : ''));
return [{ json: {
  title: s(parsed.title || src.Topic).slice(0, 100),
  description: s(parsed.description),
  hashtags, tagStr, script, scenes, chapters, thumbnail,
  category, mood, styleFit, imageCount, format: isSermon ? 'sermon' : 'essay',
  scriptLength: len, warnings,
  topic: src.Topic, language: src.Language || 'Korean', subtitleLang,
  shortVideoId: src.shortVideoId, shortViews: src.shortViews
} }];
