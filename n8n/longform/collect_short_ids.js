// 업로드된 쇼츠 중 아직 롱폼으로 만들지 않은 것의 유튜브 ID를 모은다 (최근 50개 — videos.list 1회 한도).
const rows = $('Read Topic Sheet').all().map(function (i) { return i.json; });
const log = $input.all().map(function (i) { return i.json; }).filter(function (r) { return r && r.ShortVideoId; });
const used = new Set(log.map(function (r) { return String(r.ShortVideoId).trim(); }));
const idOf = function (url) {
  const m = String(url || '').match(/(?:v=|shorts\/|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
};
const seen = new Set();
const cands = [];
rows.filter(function (r) { return String(r.Status || '').trim() === 'uploaded'; })
  .sort(function (a, b) { return (b.row_number || 0) - (a.row_number || 0); })
  .forEach(function (r) {
    const id = idOf(r.VideoURL);
    if (!id || used.has(id) || seen.has(id) || !/[가-힣]/.test(String(r.Topic || ''))) return;
    seen.add(id);
    cands.push({ id: id, topic: r.Topic, row: r.row_number });
  });
const pick = cands.slice(0, 50);
if (!pick.length) throw new Error('롱폼으로 만들 쇼츠가 없습니다 — 업로드된 한국어 쇼츠가 모두 이미 롱폼으로 만들어졌거나 VideoURL이 비어 있습니다');
console.log('후보 쇼츠 ' + pick.length + '개 (이미 롱폼 ' + used.size + '개 제외)');
return [{ json: { ids: pick.map(function (c) { return c.id; }).join(','), candidates: pick } }];
