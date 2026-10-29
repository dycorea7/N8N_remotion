// 지금 뜨는 쇼츠 1/3: 우리 분야(지혜·심리·건강·경제)의 최근 7일 한국어 쇼츠를 조회수 순으로 찾는다
//  search.list 1회 = 할당량 100 → 4개 × 하루 2번 = 800/일
const Q = [
  ['wisdom', '인생 조언 인간관계 #shorts'],
  ['psychology', '심리 #shorts'],
  ['health', '건강 상식 #shorts'],
  ['money', '돈 관리 #shorts']
];
const DAYS = 7;
const after = new Date(Date.now() - DAYS * 86400000).toISOString();
return Q.map(p => ({ json: { pillar: p[0], q: p[1], after } }));
