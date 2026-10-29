// 사실 확인 2/3: 검사 결과를 읽고, 문제가 있으면 대본을 한 번 고쳐 쓰게 하는 요청을 만든다
// ===== 설정 =====
const SCRIPT_NODE = 'Claude - Script & Motion Design';
const REQUEST_NODE = 'Build Claude Request';
// ================
const req = $('Fact Check Request').first().json;
if (req.skip) { console.log('사실 확인 건너뜀: ' + req.reason); return [{ json: { ok: true, problems: [], skipped: req.reason } }]; }
// 웹 검색을 쓰면 응답이 여러 조각(검색 호출·검색 결과·글)으로 온다 → 글 조각만 모아 마지막 JSON을 읽는다
const texts = (Array.isArray($json.content) ? $json.content : []).filter(c => c && c.type === 'text').map(c => c.text || '');
const raw = texts.join('\n');
const searches = (Array.isArray($json.content) ? $json.content : []).filter(c => c && c.type === 'server_tool_use').length;
let res = null;
try {
  const t = raw.replace(/```json|```/g, '');
  const end = t.lastIndexOf('}');
  // 마지막 JSON 객체: 끝 중괄호에서 거꾸로 짝이 맞는 여는 중괄호를 찾는다
  let depth = 0, start = -1;
  for (let i = end; i >= 0; i--) { if (t[i] === '}') depth++; else if (t[i] === '{') { depth--; if (depth === 0) { start = i; break; } } }
  res = JSON.parse(t.slice(start, end + 1));
} catch (e) { /* 검사 실패 */ }
console.log('사실 확인: 웹 검색 ' + searches + '회' + (res && res.checked != null ? ', 확인한 주장 ' + res.checked + '개' : ''));
// 검사 호출이 실패하면 막지 않고 통과 (영상이 멈추지 않게)
if (!res) { console.log('사실 확인 응답을 읽지 못함 — 통과: ' + raw.slice(0, 200)); return [{ json: { ok: true, problems: [], skipped: 'check failed' } }]; }
const problems = (Array.isArray(res.problems) ? res.problems : []).filter(p => p && p.text);
if (res.ok !== false && !problems.length) { console.log('사실 확인 통과'); return [{ json: { ok: true, problems: [] } }]; }
console.log('사실 확인 문제 ' + problems.length + '건: ' + problems.map(p => p.text.slice(0, 40) + ' (' + String(p.issue || '').slice(0, 60) + ')').join(' | '));
const orig = $(REQUEST_NODE).first().json.body;
const prev = String(($(SCRIPT_NODE).first().json.content || [{}])[0].text || '');
const list = problems.map((p, i) => (i + 1) + '. ' + p.text + '\n   issue: ' + (p.issue || '') + '\n   suggested: ' + (p.fix || 'paraphrase without quotation marks') + (p.source ? '\n   source: ' + p.source : '')).join('\n');
const fix = `A web-search fact-check of your script found these problems:
${list}

Rewrite the script and fix ONLY these problems:
- For each doubtful quotation, express the idea in your own words, without quotation marks and without saying the person said it (e.g. 쇼펜하우어는 고통이 사람을 단련한다고 봤습니다). Use a different direct quotation only if it is one of that person's most famous, widely documented lines and you are certain of the wording.
- If no such quotation remains for a quote card, change that scene's visual to a headline.
- Correct or remove wrong facts. Remove made-up or unsupported numbers and study claims (say it generally instead); if a stat or chart scene loses its number, change its visual to a headline.
- Keep every other scene, the length rule, the visual rules and exactly the same JSON format.
Respond ONLY with the full corrected JSON.`;
const body = Object.assign({}, orig, { messages: orig.messages.concat([{ role: 'assistant', content: prev }, { role: 'user', content: fix }]) });
return [{ json: { ok: false, problems, fixBody: body } }];
