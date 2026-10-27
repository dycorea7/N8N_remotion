// 결과를 텔레그램 메시지로
const picked = $('Pick Low-View Shorts').all().map(i => i.json);
const m = picked[0] || {};
let done = [], failed = [];
if (m.act) {
  const res = $('Set Private').all().map(i => i.json);
  picked.forEach((p, i) => { const r = res[i] || {}; if (r.status && r.status.privacyStatus === 'private') done.push(p.video); else failed.push(p.video); });
}
const list = m.act ? done : (m.list || []);
const line = v => '• ' + v.views + '회 · ' + String(v.published).slice(0, 10) + ' · ' + v.title.slice(0, 40);
let text = '🧹 조회수 안 나온 쇼츠 정리 (' + m.minViews + '회 미만, ' + m.minAge + '일 지난 공개 쇼츠)\n\n';
if (!m.candidates) text += '정리할 쇼츠가 없습니다. (공개 쇼츠 ' + m.publicShorts + '개)';
else if (m.dryRun) text += '시험 모드라 바꾸지 않았습니다. 대상 ' + m.candidates + '개 중 ' + list.length + '개:\n' + list.map(line).join('\n');
else {
  text += '비공개로 바꾼 쇼츠 ' + done.length + '개' + (m.candidates > done.length + failed.length ? ' (대상 ' + m.candidates + '개 중 한 번에 ' + m.maxPerRun + '개까지 — 나머지는 다음 주)' : '') + ':\n' + done.map(line).join('\n');
  if (failed.length) text += '\n\n⚠️ 실패 ' + failed.length + '개:\n' + failed.map(line).join('\n');
  text += '\n\n되돌리려면 YouTube Studio에서 공개로 바꾸면 됩니다.';
}
if (text.length > 3900) text = text.slice(0, 3900) + '\n…';
return [{ json: { text } }];
