// 카테고리별 재생목록 (Daily Shorts와 같은 재생목록을 쓴다).
// 제목이 정확히 같은 재생목록이 있으면 거기에 추가하고, 없으면 새로 만든다.
// 이미 쓰고 있는 재생목록이 있으면 아래 title을 그 제목 그대로 바꾸세요.
const PLAYLISTS = {
  bible:  { title: '오늘의 말씀 | 60초 설교', description: '하루 한 구절, 60초 성경 말씀 묵상 쇼츠' },
  quote:  { title: '철학·명언 쇼츠', description: '동서양 사상가의 한 문장과 그것을 살아낸 사람들의 이야기' },
  wealth: { title: '부자 마인드셋 쇼츠', description: '돈과 시간, 선택에 대한 생각을 바꾸는 짧은 이야기' },
  health: { title: '건강 상식 쇼츠', description: '근거 있는 건강 과학을 60초로' },
  other:  { title: '자기계발 쇼츠', description: '오늘 하루를 바꾸는 짧은 생각' }
};

const p = $('Parse Script JSON').first().json;
// 시리즈 회차는 시리즈 재생목록으로 (회차 순서대로 쌓인다)
let row = {};
try { row = $('Pick Next Topic').first().json || {}; } catch (e) {}
const SERIES_PLAYLISTS = { '뇌과학 도파민 디톡스': { title: '뇌과학 도파민 디톡스 10부작', description: '집중력·피로·습관을 뇌과학으로 풀어 보는 쇼츠 시리즈 (EP.1~10)' } };
const target = (String(row.Source || '').trim() === 'series' && SERIES_PLAYLISTS[String(row.Series || '').trim()]) || PLAYLISTS[p.category] || PLAYLISTS.other;
const res = $input.first().json || {};

// 조회가 실패했는데 새로 만들면 같은 재생목록이 매일 하나씩 생긴다. 그럴 땐 건너뛴다.
if (res.error || !Array.isArray(res.items)) {
  console.log('재생목록 조회 실패 — 이번엔 건너뜀 (중복 생성 방지): ' + JSON.stringify(res.error || res).slice(0, 200));
  return [];
}

const norm = function (s) { return String(s || '').replace(/\s+/g, ' ').trim(); };
const found = res.items.find(function (it) { return norm(it.snippet && it.snippet.title) === norm(target.title); });
console.log((found ? '기존 재생목록에 추가: ' : '새 재생목록 생성: ') + target.title + ' (category: ' + p.category + ')');

return [{ json: { playlistId: found ? found.id : '', title: target.title, description: target.description } }];
