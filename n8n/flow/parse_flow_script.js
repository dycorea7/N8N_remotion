// Claude 응답(JSON) 검사 → 장면·대본·음성용 대본(감정 표시 포함)
const raw = String(($json.content && $json.content[0] && $json.content[0].text) || '');
const t = $('Pick Topic').first().json;
let clean = raw.replace(/```json|```/g, '').trim();
const tryParse = s => { try { return JSON.parse(s); } catch (e) { return null; } };
let parsed = tryParse(clean);
if (!parsed) { const a = clean.indexOf('{'), b = clean.lastIndexOf('}'); if (a >= 0 && b > a) parsed = tryParse(clean.slice(a, b + 1)); }
if (!parsed) throw new Error('Claude 대본 JSON을 읽지 못했습니다: ' + clean.slice(0, 300));
const TONES = ['playful', 'curious', 'excited', 'surprised', 'thoughtful', 'warm', 'serious', 'mischievously', 'chuckles', 'sighs', 'whispers'];
const s = v => String(v == null ? '' : v).replace(/["]/g, '”').trim();
const isDrama = String(parsed.format || '').toLowerCase() === 'drama';
// 드라마: 대사를 이어 붙인 것이 자막(narration)이다. 대사가 없는 장면은 말없음표
const lineOf = x => (Array.isArray(x && x.dialogue) ? x.dialogue : []).map(d => s(d && d.line)).filter(Boolean).join(' ');
const scenes = (Array.isArray(parsed.scenes) ? parsed.scenes : []).map(x => isDrama ? ({
  narration: lineOf(x) || '…',
  dialogue: (Array.isArray(x && x.dialogue) ? x.dialogue : []).map(d => ({ speaker: s(d && d.speaker), line: s(d && d.line) })).filter(d => d.line),
  tone: '', prompt: s(x && (x.flow_prompt || x.prompt)), overlay: null
}) : ({
  narration: s(x && x.narration).replace(/\[[^\]]*\]/g, '').replace(/\s*\n\s*/g, ' ').trim(),
  tone: TONES.includes(String(x && x.tone || '').trim().toLowerCase()) ? String(x.tone).trim().toLowerCase() : '',
  prompt: s(x && (x.flow_prompt || x.prompt)),
  overlay: x && x.overlay && typeof x.overlay === 'object' && x.overlay.kind ? x.overlay : null
})).filter(x => x.narration && x.prompt);
if (scenes.length < 4 || scenes.length > 10) throw new Error('장면 수가 이상합니다: ' + scenes.length + '개 (6~7개여야 함)');
const subtitleLang = t.Language.toLowerCase() === 'english' ? 'en' : 'ko';
const script = scenes.map(x => x.narration).join('\n');
const ttsScript = scenes.map(x => (x.tone ? '[' + x.tone + '] ' : '') + x.narration).join('\n');
const len = subtitleLang === 'ko' ? script.replace(/\n/g, ' ').length : script.split(/\s+/).length;
const CATS = ['food', 'quote', 'wealth', 'health', 'other'];
const format = isDrama ? 'drama' : String(parsed.format || '').toLowerCase() === 'cooking' ? 'cooking' : 'general';
const characters = (Array.isArray(parsed.characters) ? parsed.characters : []).map(c => ({ name: s(c && c.name), look: s(c && c.look), voice: s(c && c.voice) })).filter(c => c.name);
scenes.forEach((x, i) => { if (i === 0) x.overlay = null; }); // 첫 장면은 훅 글자만
const MOODS = ['calm_reflective', 'hopeful_uplifting', 'tense_dramatic', 'dark_serious', 'warm_gentle'];
const hashtags = (Array.isArray(parsed.hashtags) ? parsed.hashtags : []).map(s).filter(h => h.startsWith('#')).slice(0, 6);
console.log('Flow 쇼츠 대본(' + format + '): ' + len + (subtitleLang === 'ko' ? '자' : ' words') + ' | 장면 ' + scenes.length + '개 | ' + s(parsed.title));
return [{ json: {
  title: s(parsed.title || t.Topic).slice(0, 100), description: s(parsed.description), hashtags,
  category: format === 'cooking' ? 'food' : format === 'drama' ? 'other' : CATS.includes(parsed.category) ? parsed.category : 'other', mood: MOODS.includes(parsed.mood) ? parsed.mood : 'hopeful_uplifting',
  format, characters, setting: s(parsed.setting), character: s(parsed.character), hookText: s(parsed.hook_text).slice(0, 20),
  scenes, script, ttsScript, scriptLength: len, subtitleLang, topic: t.Topic, row_number: t.row_number
} }];
