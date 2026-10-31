// 실사 영상 4/4: Claude가 통과시킨 후보만 장면에 붙인다. 검수 응답을 못 읽으면 실사 영상 없이 모두 AI 사진 (엉뚱한 영상보다 낫다)
const BT = String.fromCharCode(96), FENCE = BT + BT + BT;
const prep = $('Footage Candidates').first().json;
const cands = prep.cands || {};
const asked = Object.keys(cands).length;
const picks = {};
let approved = 0, rejected = 0, verdict = null;
if (!prep.skip) {
  const parts = Array.isArray($json.content) ? $json.content : [];
  const raw = parts.filter(function (c) { return c && c.type === 'text'; }).map(function (c) { return c.text || ''; }).join('').split(FENCE + 'json').join('').split(FENCE).join('');
  try { verdict = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1)); } catch (e) {}
  if (!verdict || typeof verdict.picks !== 'object') console.log('실사 영상 검수 응답을 읽지 못함 → 실사 영상 없이 AI 사진만 사용: ' + JSON.stringify($json.error || raw.slice(0, 200)));
  else Object.keys(cands).forEach(function (sid) {
    const c = cands[sid];
    const label = String(verdict.picks[sid] || '');
    const n = Number(label.split('-C')[1]);
    const chosen = label.indexOf(sid + '-C') === 0 && n >= 1 ? c.list[n - 1] : null;
    if (!chosen) { rejected++; console.log('  장면 ' + (c.sceneIndex + 1) + ' 「' + c.q + '」 후보 ' + c.list.length + '개 모두 거절 → AI 사진'); return; }
    approved++;
    picks[c.sceneIndex] = { kind: c.kind || 'image', video: chosen.video, poster: chosen.poster, id: chosen.id, page: chosen.page, q: c.q, w: chosen.w, h: chosen.h, dur: chosen.dur, videoStart: chosen.videoStart };
    console.log('  장면 ' + (c.sceneIndex + 1) + ' 「' + c.q + '」 → ' + chosen.page + ' (' + chosen.tags + ')');
  });
}
console.log('실사 영상 통과 ' + approved + ' / 검수 ' + asked + ' (거절 ' + rejected + ')');
return [{ json: { picks: picks, found: approved, asked: asked, rejected: rejected } }];