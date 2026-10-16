// 조회수가 가장 높은 쇼츠를 롱폼 주제로 고른다.
const c = $('Collect Short IDs').first().json;
const stats = {};
($input.first().json.items || []).forEach(function (v) {
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
return [{ json: { Topic: top.topic, Language: 'Korean', shortVideoId: top.id, shortViews: top.views, shortTitle: top.title, row_number: top.row } }];
