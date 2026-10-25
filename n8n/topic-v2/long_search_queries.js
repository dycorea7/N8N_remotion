// 50만+ 벤치마크 2/3: 롱폼 주제용 — 기둥마다 4~20분 영상 검색 1회 (최근 1년, 조회수 순). 할당량 5 × 100
const Q = [
  ['money', '돈 관리 재테크 습관'],
  ['health', '건강 상식 습관 의사'],
  ['psychology', '심리학 인간관계 습관'],
  ['wisdom', '인생 조언 지혜'],
  ['bible', '성경 말씀 설교 묵상']
];
const after = new Date(Date.now() - 365 * 86400000).toISOString();
return Q.map(function (p) { return { json: { pillar: p[0], q: p[1], after: after } }; });
