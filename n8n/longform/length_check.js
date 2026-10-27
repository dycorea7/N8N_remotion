// 분량 확인: 나레이션이 목표보다 짧으면 같은 대화에 이어서 장면을 늘려 달라고 한 번 더 요청한다 (Claude는 대개 목표의 절반쯤 쓴다)
const MIN_KO = 7000, MIN_EN = 2700;
const raw = String((($json.content || [])[0] || {}).text || '');
let chapters = [];
try {
  const s = raw.indexOf('{'), e = raw.lastIndexOf('}');
  const j = JSON.parse(raw.slice(s, e + 1));
  chapters = (j.chapters || []).map(function (c) {
    const text = (c.scenes || []).map(function (x) { return String(x.narration || ''); }).join(' ');
    return { title: c.title, chars: text.replace(/\s+/g, ' ').length, words: text.split(/\s+/).filter(Boolean).length, scenes: (c.scenes || []).length };
  });
} catch (e) { console.log('대본 JSON을 읽지 못함 — 분량 확인 생략'); }
const ko = /[가-힣]/.test(raw.slice(0, 3000));
const total = chapters.reduce(function (a, c) { return a + (ko ? c.chars : c.words); }, 0);
const min = ko ? MIN_KO : MIN_EN;
const longEnough = !chapters.length || total >= min || $json.stop_reason === 'max_tokens';
const unit = ko ? 'Korean characters' : 'English words';
const goal = ko ? '8,000 to 8,800 Korean characters (each chapter about 1,000)' : '2,900 to 3,300 English words';
const per = chapters.map(function (c, i) { return (i + 1) + '. ' + c.title + ': ' + (ko ? c.chars : c.words) + ' ' + (ko ? 'chars' : 'words') + ', ' + c.scenes + ' scenes'; }).join('\n');
const msg = 'The narration you wrote is only ' + total + ' ' + unit + ' - far below the required length (17 to 20 minutes). Per chapter now:\n' + per +
  '\n\nReturn the COMPLETE script JSON again, expanded to ' + goal + '.\n' +
  'How to expand: ADD NEW SCENES rather than stretching sentences - roughly double the scenes in every chapter. Each new scene must add substance: a concrete everyday example, a worked calculation with simple checkable numbers, a common mistake and how to avoid it, a viewer doubt answered, or one step the viewer can do. Never pad or repeat a point.\n' +
  'Keep every existing scene and its visual in order, and insert the new scenes between them. Keep all rules from the first message: the chapter visual as the first scene of each chapter, never the same visual type twice in a row except image, picture pacing and the picture limit, numbers on screen exactly matching the narration, the outro only as the last scene. Never invent statistics or study results: use only standard, checkable figures or clearly labelled hypothetical examples (예를 들어 ~라고 해 봅시다). Same JSON schema, JSON only, first character the opening brace.';
let body = null;
if (!longEnough) {
  const orig = $('Build Longform Request').first().json.body;
  body = Object.assign({}, orig, { messages: orig.messages.concat([{ role: 'assistant', content: raw }, { role: 'user', content: msg }]) });
}
console.log('분량 ' + total + ' ' + unit + ' (최소 ' + min + ') → ' + (longEnough ? '통과' : '늘리기 요청'));
return [{ json: { longEnough: longEnough, total: total, perChapter: per, expandBody: body } }];
