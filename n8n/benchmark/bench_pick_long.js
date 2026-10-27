// 대본 벤치마크 2/3 (롱폼):
//  - 주제를 고를 때 기준이 된 영상(LongformTopics의 BenchVideo)은 조회수·키워드와 상관없이 맨 앞에 REFERENCE로 넣는다
// 검색 결과(관련도 순 50개) 중 조회수 50만 이상 + 제목에 검색 키워드가 들어간 영상 (많은 순 최대 3개)
//  - 유튜브 '조회수 순' 정렬은 좁은 검색어에서 결과를 거의 안 돌려준다 → 관련도 순으로 받아 여기서 조회수로 거른다
//  - 관련도 순은 주제와 먼 인기 영상도 섞이므로 제목·설명 앞부분에 첫 키워드(주제 명사)가 있어야 한다. 우리 채널 영상은 뺀다
//    (뇌·심리·습관 같은 넓은 낱말로 맞추면 엉뚱한 인기 영상이 걸린다)
const MIN_VIEWS = 500000;
const MAX_VIDEOS = 3;
const OWN = /next\s*you/i;
let q = '';
try { const k = $('Benchmark Keywords').first().json; q = (k.content && k.content[0] && k.content[0].text) || ''; } catch (e) {}
if (!q) q = $('Benchmark Query').first().json.q || '';
const keys = String(q).replace(/["'\n]/g, ' ').split(/\s+/).map(function (w) { return w.replace(/[^가-힣A-Za-z0-9]/g, ''); }).filter(function (w) { return w.length >= 2; });
const stems = keys.map(function (w) { return w.length >= 3 ? w.slice(0, 2) : w; });
const items = ($input.first().json.items || []);
const all = items.map(function (v) {
  const s = v.statistics || {}, sn = v.snippet || {};
  return { videoId: v.id, title: sn.title || '', channel: sn.channelTitle || '', publishedAt: sn.publishedAt || '', views: Number(s.viewCount || 0), likes: Number(s.likeCount || 0), comments: Number(s.commentCount || 0), duration: (v.contentDetails || {}).duration || '', description: String(sn.description || '').slice(0, 1500) };
});
const main = stems[0] || '';
const onTopic = function (v) { const t = (v.title + ' ' + v.description.slice(0, 200)).replace(/\s+/g, ''); return !!main && t.includes(main); };
let refId = '';
try { refId = String($('Pick Short').first().json.benchVideo || '').trim(); } catch (e) {}
const ref = all.find(function (v) { return v.videoId === refId; });
const others = all.filter(function (v) { return v.videoId !== refId && v.views >= MIN_VIEWS && /[가-힣]/.test(v.title) && !OWN.test(v.channel) && onTopic(v); })
  .sort(function (a, b) { return b.views - a.views; });
const vids = (ref ? [Object.assign({}, ref, { ref: true })] : []).concat(others).slice(0, MAX_VIDEOS);
if (refId && !ref) console.log('기준 영상 ' + refId + '을 찾지 못함 (삭제·비공개?)');
console.log('검색어 「' + q + '」 (주제 낱말 ' + main + ') 결과 ' + all.length + '개 → 50만+ 주제 일치 ' + vids.length + '개: ' + vids.map(function (v) { return Math.round(v.views / 10000) + '만 ' + v.title.slice(0, 30); }).join(' | '));
// 없으면 자리표시 하나 (다음 노드가 건너뛰고 대본은 벤치마크 없이 진행)
if (!vids.length) return [{ json: { videoId: 'none', skip: true } }];
return vids.map(function (v) { return { json: v }; });
