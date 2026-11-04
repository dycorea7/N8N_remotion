// 사실 확인 2/3: 검사 결과를 읽고, 문제가 있으면 대본을 한 번 고쳐 쓰게 하는 요청을 만든다
// ===== 설정 =====
const SCRIPT_NODE = 'Claude - Script & Motion Design';
const REQUEST_NODE = 'Build Claude Request';
// ================
const req = $('Fact Check Request').first().json;
const orig = $(REQUEST_NODE).first().json.body;
const prev = String(($(SCRIPT_NODE).first().json.content || [{}])[0].text || '');
// ── 길이·첫 장면 점검: 영상이 길거나 첫 문장이 길고 흐리면 시청자가 몇 초 만에 넘긴다 ──
const lenIssues = [];
try {
  const t0 = prev.replace(/```json|```/g, '');
  const sj = JSON.parse(t0.slice(t0.indexOf('{'), t0.lastIndexOf('}') + 1));
  const nar = (sj.scenes || []).map(sc => String(sc.narration || '').trim()).filter(Boolean);
  const ko = /[가-힣]/.test(nar.join(''));
  const size = x => ko ? x.length : x.split(/\s+/).filter(Boolean).length;
  const total = size(nar.join(' '));
  if (total > (ko ? 335 : 145)) lenIssues.push('The narration is ' + total + (ko ? ' characters' : ' words') + ' long. It must be ' + (ko ? '250 to 320 Korean characters' : '100 to 135 words') + ' (about 35 to 40 seconds): cut whole points or scenes, keep the hook, the payoff and the loop ending.');
  const h = nar[0] || '';
  if (size(h) > (ko ? 24 : 9)) lenIssues.push('Scene 1 narration is too long (' + size(h) + (ko ? ' characters' : ' words') + '). Make it ONE short definite sentence of at most 20 Korean characters / 8 English words.');
  if (ko && /수 있어요|수 있습니다|일지도|아닐까요|할 수도|일 수도/.test(h)) lenIssues.push('Scene 1 is hedged (' + h + '). Make it a definite, surprising claim.');
  if (nar.length > 13) lenIssues.push('There are ' + nar.length + ' scenes; use 10 to 12.');
  console.log('길이 점검: ' + total + (ko ? '자' : ' words') + ', 첫 장면 ' + size(h) + ', 장면 ' + nar.length + '개' + (lenIssues.length ? ' → 줄이기' : ' → 통과'));
} catch (e) { console.log('길이 점검 실패: ' + e.message); }
const lengthFix = lenIssues.length ? '\n\nThe script is also too long or its opening is too weak:\n' + lenIssues.map(x => '- ' + x).join('\n') + '\nFix these too.' : '';
const fixOnlyLength = () => {
  const msg = 'Rewrite the script to fix its length and opening:\n' + lenIssues.map(x => '- ' + x).join('\n') + '\nKeep the facts, the loop ending, the visual rules and exactly the same JSON format. Respond ONLY with the full corrected JSON.';
  const body = Object.assign({}, orig, { messages: orig.messages.concat([{ role: 'assistant', content: prev }, { role: 'user', content: msg }]) });
  return [{ json: { ok: false, problems: [], lengthIssues: lenIssues, fixBody: body } }];
};
if (req.skip) { console.log('사실 확인 건너뜀: ' + req.reason); return lenIssues.length ? fixOnlyLength() : [{ json: { ok: true, problems: [], skipped: req.reason } }]; }
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
if (!res) { console.log('사실 확인 응답을 읽지 못함 — 통과: ' + raw.slice(0, 200)); return lenIssues.length ? fixOnlyLength() : [{ json: { ok: true, problems: [], skipped: 'check failed' } }]; }
const problems = (Array.isArray(res.problems) ? res.problems : []).filter(p => p && p.text);
if (res.ok !== false && !problems.length) { console.log('사실 확인 통과'); return lenIssues.length ? fixOnlyLength() : [{ json: { ok: true, problems: [] } }]; }
console.log('사실 확인 문제 ' + problems.length + '건: ' + problems.map(p => p.text.slice(0, 40) + ' (' + String(p.issue || '').slice(0, 60) + ')').join(' | '));
const list = problems.map((p, i) => (i + 1) + '. ' + p.text + '\n   issue: ' + (p.issue || '') + '\n   suggested: ' + (p.fix || 'paraphrase without quotation marks') + (p.source ? '\n   source: ' + p.source : '')).join('\n');
const fix = `A web-search fact-check of your script found these problems:
${list}

Rewrite the script and fix ONLY these problems:
- For each doubtful quotation, express the idea in your own words, without quotation marks and without saying the person said it (e.g. 쇼펜하우어는 고통이 사람을 단련한다고 봤습니다). Use a different direct quotation only if it is one of that person's most famous, widely documented lines and you are certain of the wording.
- If no such quotation remains for a quote card, change that scene's visual to a headline.
- Correct or remove wrong facts. Remove made-up or unsupported numbers and study claims (say it generally instead); if a stat or chart scene loses its number, change its visual to a headline.
- Keep every other scene, the length rule, the visual rules and exactly the same JSON format.${lengthFix}
Respond ONLY with the full corrected JSON.`;
const body = Object.assign({}, orig, { messages: orig.messages.concat([{ role: 'assistant', content: prev }, { role: 'user', content: fix }]) });
return [{ json: { ok: false, problems, fixBody: body } }];
