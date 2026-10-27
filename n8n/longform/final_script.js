// 최종 대본: 처음 쓴 대본과 늘린 대본 중 완전하고 더 긴 쪽을 고른다 (늘리기가 실패하거나 잘리면 처음 대본)
const narr = function (t) {
  try {
    const s = t.indexOf('{'), e = t.lastIndexOf('}');
    const j = JSON.parse(t.slice(s, e + 1));
    return (j.chapters || []).reduce(function (a, c) { return a + (c.scenes || []).reduce(function (b, x) { return b + String(x.narration || '').length; }, 0); }, 0);
  } catch (e) { return 0; }
};
const draft = $('Claude - Longform Script').first().json;
const dText = String(((draft.content || [])[0] || {}).text || '');
let text = dText, stop = draft.stop_reason, used = 'draft';
// IF의 false 쪽(늘리기)에서 왔을 때만 늘린 대본을 본다
if (!('longEnough' in $json)) {
  const eText = String((($json.content || [])[0] || {}).text || '');
  if ($json.stop_reason !== 'max_tokens' && narr(eText) > narr(dText)) { text = eText; stop = $json.stop_reason; used = 'expanded'; }
  else console.log('늘린 대본을 쓰지 않음 (stop ' + $json.stop_reason + ', ' + narr(eText) + '자)');
}
console.log('최종 대본: ' + used + ', 나레이션 ' + narr(text) + '자 (처음 ' + narr(dText) + '자)');
return [{ json: { content: [{ type: 'text', text: text }], stop_reason: stop, scriptSource: used } }];
