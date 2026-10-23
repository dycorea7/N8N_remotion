// 조회수가 가장 높은 쇼츠를 롱폼 주제로 고른다.
// 한 번만 쓰는 주제 지정: 이 날짜 전까지 만드는 롱폼은 쇼츠 대신 이 주제로 (10/27 화요일 롱폼). 지나면 자동으로 원래대로
const ONE_OFF_TOPIC = {
  topic: '잠 잘 자는 사람들의 저녁 루틴 — 빛·온도·카페인 시간표로 수면의 질을 높이는 과학적 방법: 잠들기 몇 시간 전에 무엇을 끄고, 무엇을 낮추고, 무엇을 멈추는가',
  before: '2026-10-28T00:00:00-04:00'
};
if (ONE_OFF_TOPIC.topic && Date.now() < Date.parse(ONE_OFF_TOPIC.before)) {
  console.log('지정 주제 사용: ' + ONE_OFF_TOPIC.topic);
  return [{ json: { Topic: ONE_OFF_TOPIC.topic, Language: 'Korean', shortVideoId: '', shortViews: 0, shortTitle: '(쇼츠 없이 직접 지정한 주제)', row_number: null } }];
}
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
