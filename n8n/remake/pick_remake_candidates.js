// 리메이크 1/4: 조회수가 안 나와 비공개된 쇼츠 중 다시 만들 후보를 고른다 (매주)
//  - 비공개 + 쇼츠 길이 + 조회수 100 미만 + 올린 지 7일 이상
//  - 성경 쇼츠는 제외 (Bible Shorts가 따로 만든다), 이미 검토한 영상(Remakes 탭)은 제외
//  - 최근 영상부터 (지금 제작 방식과 가까운 것) 최대 MAX_CANDIDATES개를 Claude에게 보낸다
// ===== 설정 =====
const MIN_VIEWS = 100;
const MIN_AGE_DAYS = 7;
const MAX_SHORT_SEC = 180;
const MAX_CANDIDATES = 6;
// ================
const secs = d => { const m = String(d).match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/); return m ? (+m[1] || 0) * 3600 + (+m[2] || 0) * 60 + (+m[3] || 0) : 0; };
const BIBLE = /(창세기|출애굽기|레위기|민수기|신명기|여호수아|사사기|룻기|사무엘|열왕기|역대|에스라|느헤미야|에스더|욥기|시편|잠언|전도서|아가|이사야|예레미야|애가|에스겔|다니엘|호세아|요엘|아모스|오바댜|요나|미가|나훔|하박국|스바냐|학개|스가랴|말라기|마태복음|마가복음|누가복음|요한복음|사도행전|로마서|고린도|갈라디아서|에베소서|빌립보서|골로새서|데살로니가|디모데|디도서|빌레몬서|히브리서|야고보서|베드로|요한[일이삼]서|유다서|요한계시록)\s*\d+|하나님|예수|찬송가|말씀|기도|God's|Bible|Jesus/;
// 이미 리메이크한 영상은 다시 보지 않는다. 건너뛴 영상은 SKIP_RETRY_DAYS가 지나면 다시 검토한다
const SKIP_RETRY_DAYS = 56;
let done = new Set();
try {
  $('Read Remakes Log').all().forEach(i => {
    const r = i.json || {};
    if (!r.OldVideoId) return;
    const age = (Date.now() - Date.parse(r.Date || 0)) / 86400000;
    if (r.Decision === 'remake' || !(age > SKIP_RETRY_DAYS)) done.add(String(r.OldVideoId).trim());
  });
} catch (e) { /* 탭 없음 */ }
let sheet = [];
try { sheet = $('Read Topic Sheet').all().map(i => i.json).filter(r => r && r.Topic); } catch (e) {}
const now = Date.now();
const all = [];
for (const it of $('Video Stats').all()) for (const v of (it.json.items || [])) {
  const sn = v.snippet || {};
  all.push({ id: v.id, title: sn.title || '', description: String(sn.description || '').slice(0, 300), tags: (sn.tags || []).slice(0, 8), published: sn.publishedAt || '', views: Number((v.statistics || {}).viewCount || 0), likes: Number((v.statistics || {}).likeCount || 0), sec: secs((v.contentDetails || {}).duration), privacy: (v.status || {}).privacyStatus });
}
const ageDays = v => (now - Date.parse(v.published)) / 86400000;
const cand = all.filter(v => v.privacy === 'private' && v.sec > 0 && v.sec <= MAX_SHORT_SEC && v.views < MIN_VIEWS && ageDays(v) >= MIN_AGE_DAYS && !done.has(v.id) && !BIBLE.test(v.title))
  .sort((a, b) => Date.parse(b.published) - Date.parse(a.published));
console.log('영상 ' + all.length + '개 / 리메이크 후보 ' + cand.length + '개 (이미 검토 ' + done.size + '개 제외) → 이번 주 ' + Math.min(cand.length, MAX_CANDIDATES) + '개 검토');
// 검색어: 제목에서 핵심 명사 2~3개 (Motion Shorts 벤치마크와 같은 방식)
const STOP = /^(사람|사람들|이유|진짜|정말|결국|그대로|가장|모두|모든|절대|반드시|오늘|지금|하나|가지|것|이것|그것|방법|비밀|순간|때|후|전|우리|당신|내가|나는)$/;
const VERBISH = /(는데|지만|면서|하고|하는|하면|해야|했던|하던|된다|한다|이다|있다|없다|었다|았다|였다|는다|을까|일까|인가|나요|세요|어요|아요|게|고|며|서|면|던|든|요|다)$/;
const JOSA = /(에서부터|으로부터|에게서|이라는|라는|에서|으로|부터|까지|처럼|보다|에게|한테|이랑|이나|이라|이며|의|이|가|은|는|을|를|에|로|도|만|과|와|인|한)$/;
const query = t => {
  const head = String(t).split(/\s[—|:]\s|\s—|—/)[0].replace(/[「」“”"'?!.,…#]/g, ' ').replace(/\s+/g, ' ').trim();
  const keys = [];
  for (const w0 of head.split(' ')) {
    const w = w0.replace(/[^가-힣A-Za-z0-9]/g, '');
    if (!w || /^\d/.test(w) || (VERBISH.test(w) && !JOSA.test(w))) continue;
    const base = w.length > 2 ? w.replace(JOSA, '') : w;
    if (base.length < 2 || STOP.test(base) || VERBISH.test(base)) continue;
    if (!keys.includes(base)) keys.push(base);
  }
  return (keys.length ? keys.slice(0, 3) : head.split(' ').slice(0, 3)).join(' ');
};
const after = new Date(now - 3 * 365 * 86400000).toISOString();
return cand.slice(0, MAX_CANDIDATES).map((v, i) => {
  const row = sheet.find(r => String(r.VideoURL || '').includes(v.id));
  return { json: Object.assign({}, v, { label: 'C' + (i + 1), oldTopic: row ? String(row.Topic) : '', ageDays: Math.round(ageDays(v)), q: query(row ? row.Topic : v.title), after: after, candidateCount: cand.length }) };
});
