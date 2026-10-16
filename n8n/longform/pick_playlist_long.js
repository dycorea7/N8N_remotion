// 롱폼은 재생목록 하나에 모은다. 제목이 정확히 같은 재생목록이 있으면 거기에 추가하고, 없으면 새로 만든다.
const p = $('Parse Longform Script').first().json;
const target = { title: 'NextYou Global 롱폼 | 깊이 보기', description: '쇼츠에서 반응이 좋았던 주제를 8~10분으로 깊이 풀어낸 영상 모음' };
const res = $input.first().json || {};

// 조회가 실패했는데 새로 만들면 같은 재생목록이 매번 하나씩 생긴다. 그럴 땐 건너뛴다.
if (res.error || !Array.isArray(res.items)) {
  console.log('재생목록 조회 실패 — 이번엔 건너뜀 (중복 생성 방지): ' + JSON.stringify(res.error || res).slice(0, 200));
  return [];
}

const norm = function (s) { return String(s || '').replace(/\s+/g, ' ').trim(); };
const found = res.items.find(function (it) { return norm(it.snippet && it.snippet.title) === norm(target.title); });
console.log((found ? '기존 재생목록에 추가: ' : '새 재생목록 생성: ') + target.title + ' (category: ' + p.category + ')');

return [{ json: { playlistId: found ? found.id : '', title: target.title, description: target.description } }];
