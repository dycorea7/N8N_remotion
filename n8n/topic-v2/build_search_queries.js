// 기둥별 유튜브 쇼츠 검색어 (한국어만). 기둥 이름은 Build Topic Request의 PILLARS와 같아야 한다.
// search.list 1회 = 할당량 100. 18개 = 1,800 + 영상/채널 조회 36 ≈ 1,840 / 주 1회 (하루 한도 10,000).
const Q = [
  ['bible', '성경 말씀 #shorts'],
  ['bible', '오늘의 말씀 묵상 #shorts'],
  ['bible', '하나님 기도 #shorts'],
  ['wisdom', '인생 명언 #shorts'],
  ['wisdom', '철학 명언 #shorts'],
  ['wisdom', '인간관계 조언 #shorts'],
  ['wisdom', '처세 지혜 #shorts'],
  ['health', '건강 상식 #shorts'],
  ['health', '50대 건강 #shorts'],
  ['health', '먹으면 안 되는 #shorts 건강'],
  ['psychology', '심리 #shorts 인간관계'],
  ['psychology', '자존감 #shorts'],
  ['psychology', '습관 #shorts 뇌'],
  ['money', '돈 습관 부자 #shorts'],
  ['money', '재테크 #shorts'],
  ['money', '경제 상식 #shorts'],
  ['money', '돈 모으는 법 #shorts'],
  ['money', '노후 준비 돈 #shorts']
];
// 최근 3주. 30일보다 짧게 잡아 지금 뜨는 주제에 무게를 둔다.
const after = new Date(Date.now() - 21 * 86400000).toISOString();
return Q.map(function (p) { return { json: { pillar: p[0], q: p[1], after: after } }; });
