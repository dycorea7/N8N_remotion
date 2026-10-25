// 50만+ 벤치마크 1/3: 이번 주 검색 결과 중 조회수 50만 이상 쇼츠 (많은 순 최대 6개) → 영상마다 인기 댓글을 읽으러 간다
const MIN_VIEWS = 500000, MAX_VIDEOS = 6;
const seeds = $('Build Search Queries').all().map(function (i) { return i.json; });
const seen = {};
const rows = [];
$('Shorts Video Stats').all().forEach(function (it, i) {
  const pillar = (seeds[i] || {}).pillar || 'other';
  (it.json.items || []).forEach(function (v) {
    const s = v.statistics || {}, sn = v.snippet || {};
    const views = Number(s.viewCount || 0);
    if (seen[v.id] || views < MIN_VIEWS || !/[가-힣]/.test(sn.title || '')) return;
    seen[v.id] = true;
    rows.push({ videoId: v.id, title: String(sn.title || '').replace(/#[^\s#]+/g, '').trim(), views: views, pillar: pillar, publishedAt: sn.publishedAt || '' });
  });
});
rows.sort(function (a, b) { return b.views - a.views; });
const pick = rows.slice(0, MAX_VIDEOS);
console.log('50만+ 쇼츠 ' + rows.length + '개 중 ' + pick.length + '개 댓글 분석');
if (!pick.length) return [{ json: { videoId: 'none', skip: true } }];
return pick.map(function (r) { return { json: r }; });
