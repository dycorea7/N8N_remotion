// 50만+ 벤치마크 2/3: 롱폼 주제용 — 기둥별 검색어 × 길이 2종(4~20분, 20분 이상), 최근 1년, 관련도 순 50개(조회수 순은 결과가 거의 0이라 Viral Report에서 50만+만 거른다)
// 롱폼 주제는 여기서 찾은 50만+ 영상 중 하나를 기준(BenchVideo)으로 정한다. 할당량 12 × 100
const Q = [
  ['money', '돈 관리 재테크'],
  ['money', '경제 상식 돈의 원리'],
  ['money', '노후 준비 연금 월급'],
  ['health', '건강 상식 습관 의사'],
  ['psychology', '심리학 인간관계'],
  ['wisdom', '인생 조언 지혜']
];
const after = new Date(Date.now() - 365 * 86400000).toISOString();
const out = [];
for (const p of Q) for (const d of ['medium', 'long']) out.push({ json: { pillar: p[0], q: p[1], dur: d, after: after } });
return out;
