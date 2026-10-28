// 대본 벤치마크 1/3: 오늘 주제로 유튜브 검색어를 만든다 (한국 조회수 순)
//   - 주제 「제목 — 각도 | 구절」에서 제목 부분만 검색어로
//   - 쇼츠는 짧은 영상, 롱폼은 4~20분 영상. 최근 3년
// ===== 설정 =====
const SOURCE_NODE = '__SOURCE_NODE__';   // 주제를 고른 노드
const MODE = 'short';                 // 'short' | 'long'
// ================
const row = $(SOURCE_NODE).first().json;
const topic = String(row.Topic || '');
const head = topic.split(/\s[—|]\s/)[0].replace(/[「」“”"'?!.,…]/g, ' ').replace(/\s+/g, ' ').trim();
// 검색어 = 제목의 핵심 명사 2~3개 (훅 문장 그대로 검색하면 조회수 큰 영상이 거의 안 걸린다)
//  - 서술어(~는데, ~하는, ~이다…)와 흔한 말(사람, 이유, 진짜…)은 빼고, 조사(이/가/은/는/을/를/의…)는 떼어 낸다
const STOP = /^(사람|사람들|이유|진짜|정말|결국|그대로|가장|모두|모든|절대|반드시|오늘|지금|하나|한가지|가지|것|이것|그것|방법|비밀|순간|때|후|전|우리|당신|내가|나는)$/;
const VERBISH = /(는데|지만|면서|하고|하는|하면|해야|했던|하던|된다|한다|이다|있다|없다|었다|았다|였다|는다|을까|일까|인가|나요|세요|어요|아요|게|고|며|서|면|던|든|요|다)$/;
const JOSA = /(에서부터|으로부터|에게서|이라는|라는|에서|으로|부터|까지|처럼|보다|에게|한테|이랑|이나|이라|이며|의|이|가|은|는|을|를|에|로|도|만|과|와|인|한)$/;
const words = head.split(' ').map(function (w) { return w.replace(/[^가-힣A-Za-z0-9]/g, ''); }).filter(Boolean);
const keys = [];
for (const w of words) {
  if (/^\d/.test(w)) continue;
  if (VERBISH.test(w) && !JOSA.test(w)) continue;
  const base = w.length > 2 ? w.replace(JOSA, '') : w;
  if (base.length < 2 || STOP.test(base) || VERBISH.test(base)) continue;
  if (!keys.includes(base)) keys.push(base);
}
const q = (keys.length >= 2 ? keys.slice(0, 3) : head.split(' ').slice(0, 3)).join(' ');
const after = new Date(Date.now() - 3 * 365 * 86400000).toISOString();
// 실제 검색어는 Claude가 '한국 시청자가 검색할 말'로 바꿔 준다 (실패하면 위의 낱말 조합을 그대로 쓴다)
// 검색어 2개: 1줄 = 주제 그대로, 2줄 = 같은 시청자가 찾는 조금 넓은 주제 (예: 잠들기 전 스마트폰 → 수면 습관). 다음 노드(Benchmark Queries)가 줄마다 검색한다
const body = { model: 'claude-sonnet-4-6', max_tokens: 60, messages: [{ role: 'user', content: 'Give two YouTube search queries Korean viewers would type to find popular videos on this topic, one per line. Line 1: the specific subject, 2 or 3 Korean nouns. Line 2: the slightly broader subject the same viewers also search, 2 Korean nouns (e.g. 수면 습관 for a topic about phones before bed). Nouns only, no particles, quotes, numbering or punctuation. Reply with the two lines only.\nTopic: ' + head }] };
console.log('벤치마크 기본 검색어: ' + q);
return [{ json: { q: q, duration: MODE === 'long' ? 'medium' : 'short', after: after, body: body } }];

