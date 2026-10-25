// 대본 벤치마크 2/3: 검색 결과 중 조회수 50만 이상만 (많은 순 최대 3개) → 영상마다 댓글을 읽으러 간다
const MIN_VIEWS = 500000;
const MAX_VIDEOS = 3;
const items = ($input.first().json.items || []);
const vids = items.map(function (v) {
  const s = v.statistics || {}, sn = v.snippet || {};
  return { videoId: v.id, title: sn.title || '', channel: sn.channelTitle || '', publishedAt: sn.publishedAt || '', views: Number(s.viewCount || 0), likes: Number(s.likeCount || 0), comments: Number(s.commentCount || 0), duration: (v.contentDetails || {}).duration || '', description: String(sn.description || '').slice(0, 1500) };
}).filter(function (v) { return v.views >= MIN_VIEWS && /[가-힣]/.test(v.title); })
  .sort(function (a, b) { return b.views - a.views; }).slice(0, MAX_VIDEOS);
console.log('50만 이상 ' + vids.length + '개: ' + vids.map(function (v) { return Math.round(v.views / 10000) + '만 ' + v.title.slice(0, 30); }).join(' | '));
// 없으면 자리표시 하나 (다음 노드가 건너뛰고 대본은 벤치마크 없이 진행)
if (!vids.length) return [{ json: { videoId: 'none', skip: true } }];
return vids.map(function (v) { return { json: v }; });
