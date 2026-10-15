const raw = String($json.content && $json.content[0] && $json.content[0].text || '');
let clean = raw.replace(/```json|```/g, '').trim();
const tryParse = t => { try { return JSON.parse(t); } catch (e) { return null; } };
const sliceBraces = t => { const s = t.indexOf('{'), e = t.lastIndexOf('}'); return (s !== -1 && e > s) ? t.slice(s, e + 1) : t; };

let parsed = tryParse(clean);
if (typeof parsed === 'string') parsed = tryParse(parsed);
if (!parsed) parsed = tryParse(sliceBraces(clean));
if (!parsed) {
  // 값 안에 이스케이프 안 된 " 가 섞인 경우: 따옴표 사이 한 글자 " 를 ” 로 바꿔 재시도
  const fixed = sliceBraces(clean).replace(/([^\s{\[,:])"([^\s,}\]:])/g, '$1”$2');
  parsed = tryParse(fixed);
}
if (!parsed) throw new Error('Claude 응답 JSON 파싱 실패 — 앞 400자: ' + clean.slice(0, 400));

const src = $('Build Claude Request').first().json;
const langKey = String(src.Language || 'Korean').trim().toLowerCase();
const subtitleLang = langKey === 'english' ? 'en' : 'ko';

// ── 장면 검증 ──
const scenes = (Array.isArray(parsed.scenes) ? parsed.scenes : [])
  .map(s => ({
    narration: String(s && s.narration || '').replace(/\s*\n\s*/g, ' ').replace(/["]/g, '”').trim(),
    visual: s && typeof s.visual === 'object' ? s.visual : null
  }))
  .filter(s => s.narration.length > 0);
if (scenes.length < 4) throw new Error('장면이 너무 적습니다: ' + scenes.length + '개');
if (scenes.length > 12) scenes.splice(12);

const script = scenes.map(s => s.narration).join('\n');
const MAX_CHARS = subtitleLang === 'en' ? 1150 : 900;
if (script.length > MAX_CHARS) throw new Error('대본이 너무 깁니다: ' + script.length + '자 (상한 ' + MAX_CHARS + ')');

const MOODS = ['calm_reflective', 'hopeful_uplifting', 'tense_dramatic', 'dark_serious', 'warm_gentle'];
const CATEGORIES = ['bible', 'quote', 'wealth', 'health', 'other'];
let format = String(parsed.format || '').trim().toLowerCase();
if (format !== 'sermon' && format !== 'essay') format = /아멘|Amen/.test(script) ? 'sermon' : 'essay';
let category = String(parsed.category || '').trim().toLowerCase();
if (!CATEGORIES.includes(category)) category = format === 'sermon' ? 'bible' : 'other';
const mood = MOODS.includes(parsed.mood) ? parsed.mood : 'calm_reflective';

// ── AI 이미지 장면: 꺼져 있거나 개수 초과, 프롬프트 없음 → 같은 키워드의 headline ──
const useImages = src.useImages !== false;
const maxImages = Number(src.maxImages) || 3;
let imageCount = 0;
for (const s of scenes) {
  const v = s.visual;
  if (!v || v.type !== 'image') continue;
  const promptOk = String(v.prompt || '').replace(/[^a-z]/gi, '').length >= 15;
  if (useImages && promptOk && imageCount < maxImages) { imageCount++; continue; }
  s.visual = { type: 'headline', text: String(v.text || s.narration.slice(0, 18)), highlight: v.highlight || [] };
}

// 설교에는 숫자 그래픽을 쓰지 않는다
if (format === 'sermon') {
  for (const s of scenes) {
    if (s.visual && (s.visual.type === 'stat' || s.visual.type === 'chart')) s.visual = { type: 'headline', text: s.narration.slice(0, 18), highlight: [] };
  }
}

const hashtags = Array.isArray(parsed.hashtags) ? parsed.hashtags : [];
const types = scenes.map(s => (s.visual && s.visual.type) || '?');
console.log('chars: ' + script.length + '/' + MAX_CHARS + ' | scenes: ' + scenes.length + ' [' + types.join(', ') + '] | ' + format + '/' + category + ' | mood: ' + mood + ' | images: ' + imageCount);

return [{ json: {
  title: String(parsed.title || src.Topic).slice(0, 100),
  description: String(parsed.description || '') + '\n\n' + hashtags.join(' '),
  hashtags, script, scenes, sceneTypes: types.join(' → '),
  format, category, mood, imageCount,
  topic: src.Topic, language: src.Language || 'Korean', subtitleLang, rowNumber: src.row_number
} }];
