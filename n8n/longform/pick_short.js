// 롱폼 주제를 고른다.
// 롱폼 주제: LongformTopics 탭의 pending 주제를 먼저 쓴다 (직접 적은 주제 owner → 주간 생성기 주제 generated 순, 위쪽 행부터).
// 탭이 비어 있으면 예전처럼 아직 롱폼으로 만들지 않은 쇼츠 중 조회수 1위를 쓴다.
let longRows = [];
try { longRows = $('Read Longform Topics').all().map(function (i) { return i.json; }).filter(function (r) { return r && r.Topic; }); } catch (e) { /* 탭 없음 */ }
const pendingLong = longRows
  .filter(function (r) { return String(r.Status || '').trim().toLowerCase() === 'pending'; })
  .sort(function (a, b) {
    const oa = String(a.Source || '').trim() === 'owner' ? 0 : 1, ob = String(b.Source || '').trim() === 'owner' ? 0 : 1;
    return oa - ob || (Number(a.row_number) || 0) - (Number(b.row_number) || 0);
  });
if (pendingLong.length) {
  const L = pendingLong[0];
  const src = String(L.Source || '').trim() === 'owner' ? '직접 지정' : '주간 주제 생성기';
  console.log('롱폼 주제 (' + src + ', ' + L.row_number + '행): ' + L.Topic + ' | 남은 pending ' + (pendingLong.length - 1) + '개');
  return [{ json: { Topic: String(L.Topic), Language: 'Korean', shortVideoId: '', shortViews: 0, shortTitle: '', row_number: null, longTopicRow: L.row_number, longTopic: String(L.Topic), sourceLabel: '롱폼 주제 시트 (' + src + ')' } }];
}
console.log('LongformTopics에 pending 주제가 없어 조회수 1위 쇼츠를 씁니다');
const viewItems = $('Shorts View Counts').first().json.items || [];
const c = $('Collect Short IDs').first().json;
const stats = {};
viewItems.forEach(function (v) {
  const s = v.statistics || {};
  stats[v.id] = { views: Number(s.viewCount || 0), likes: Number(s.likeCount || 0), title: (v.snippet && v.snippet.title) || '' };
});
const ranked = c.candidates
  .filter(function (x) { return stats[x.id]; })
  .map(function (x) { return Object.assign({}, x, stats[x.id]); })
  .sort(function (a, b) { return b.views - a.views; });
if (!ranked.length) throw new Error('유튜브 조회수를 가져오지 못했습니다 (영상 ' + c.candidates.length + '개 모두 조회 실패) — YouTube 크리덴셜/할당량 확인');
const top = ranked[0];
console.log('조회수 순위: ' + ranked.slice(0, 5).map(function (x) { return x.views + '회 ' + String(x.title).slice(0, 30); }).join(' | '));
return [{ json: { Topic: top.topic, Language: 'Korean', shortVideoId: top.id, shortViews: top.views, shortTitle: top.title, row_number: top.row, longTopicRow: null, longTopic: '', sourceLabel: '조회수 1위 쇼츠: ' + top.title + ' (조회 ' + top.views + ')' } }];
