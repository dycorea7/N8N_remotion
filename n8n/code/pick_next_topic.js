// pending 주제 중 오늘 만들 것 하나를 고른다 (시트 맨 위 행 대신 점수 순).
//  - BIBLE_MODE: 'skip' = 성경 주제는 건너뜀 (Bible Shorts 워크플로우가 하루 한 편씩 만든다)
//                'first' = 성경 주제부터, 'mix' = 다른 분야와 번갈아
//  - 영어 제목 제외
//  - 최근 업로드 2개와 같은 분야는 감점 → 분야가 번갈아 나온다
//  - 짧은 훅 제목 가산, 「~할수록 오히려 / 역설」 형태 감점
//  - 롱폼 파생 쇼츠(Source=longform)는 크게 가산 → 롱폼 업로드 뒤 며칠 안에 나간다
//  - 리메이크 주제(Source=remake)는 가산 → 추가된 주에 나간다
//  - 다시 만들 주제(Status=redo)는 맨 먼저 (잘못 나간 영상을 고쳐 다시 올릴 때 시트에서 Status를 redo로)
//  - 점수가 비슷하면 최근에 만든 주제(아래쪽 행) 우선
//  - 우리 채널 성적(Own Performance): 강한 테마 가산, 약한 테마 감점, 최근 14일에 올린 영상과 비슷한 주제는 건너뜀, 이틀 안에 같은 테마는 감점
//  - 리메이크 주제: 원본과 이틀 간격(RemakeAfter), 원본과 비슷한 각도면 건너뜀, 원본이 약한 테마인데 같은 테마로 다시 만들면 건너뜀
//  - 시리즈(Source=series): 하루 한 편, 그날 첫 실행에서 Episode 순서대로. 일반 점수 경쟁에는 끼지 않는다
//  - 지금 뜨는 쇼츠(Trend Pick): 최근 7일 인기 쇼츠에 가장 가까운 대기 주제를 고르거나, 맞는 것이 없으면 새 주제를 만든다 (redo가 있으면 redo가 먼저)
// ===== 설정 =====
// 'skip': 성경 주제는 Bible Shorts가 만든다 / 'first': 성경 주제부터 / 'mix': 분야를 번갈아
const BIBLE_MODE = 'skip';
// ================
const rows = $('Read Topic Sheet').all().map(function (i) { return i.json; }).filter(function (r) { return r && r.Topic; });
const HANGUL = /[가-힣]/;
const BIBLE_BOOKS = /(창세기|출에굽기|레위기|민수기|신명기|여호수아|사사기|룻기|사무엘|열왕기|역대|에스라|느헤미야|에스더|욥기|시편|잠언|전도서|아가|이사야|예레미야|애가|에스겔|다니엘|호세아|요엘|아모스|오바댜|요나|미가|나훈|하박국|스바냐|학개|스가랴|말라기|마태복음|마가복음|누가복음|요한복음|사도행전|로마서|고린도|갈라디아서|에베소서|빌립보서|골로새서|데살로니가|디모데|디도서|빌레몬서|히브리서|야고보서|베드로|요한[일이삼]서|유다서|요한계시록)\s*\d+[:장]/;
const HEALTH = /카페인|커피|혈압|혈당|수면|잠|근육|무릎|관절|마그네슘|장내|장 속|유익균|노화|건강|나트륨|면역|피부|체중|식후|단백질|비타민|심장|혈관|뼈|호르몬|햇빛/;
// 습관·관계 같은 말은 건강·지혜 주제에도 흔해서 넣지 않는다 (심리 고유 단어만)
const PSYCH = /심리|자존감|결심|사과하는|의지력|행동과학|불안|감정|미움받|눈치|습관적|인지 편향|뇌가 /;
const MONEY = /돈|재테크|경제|금리|물가|연금|저축|투자|부자|월급|노후 자금|빚|대출|복리|절약|소비|자산|통장/;
function pillarOf(t) {
  if (BIBLE_BOOKS.test(t) || /하나님|기도|말씀|예수|믿음|은혜/.test(t)) return 'bible';
  if (MONEY.test(head(t))) return 'money';
  if (HEALTH.test(t)) return 'health';
  if (PSYCH.test(t)) return 'psychology';
  return 'wisdom';
}
const head = function (t) { return String(t).split(/\s[—|]\s/)[0].trim(); };

// ── 최근 업로드 분야: 이 워크플로우가 기억한 값 → 없으면 시트의 마지막 uploaded 행 ──
const sd = $getWorkflowStaticData('global');
let recent = Array.isArray(sd.recentPillars) ? sd.recentPillars.slice(0, 2) : [];
if (recent.length < 2) {
  const uploaded = rows.filter(function (r) { return r.Status === 'uploaded'; })
    .sort(function (a, b) { return (b.row_number || 0) - (a.row_number || 0); });
  recent = recent.concat(uploaded.slice(0, 2 - recent.length).map(function (r) { return pillarOf(r.Topic); }));
}

// 하루 2번 실행: 제작 중인 주제는 Status를 making|원래상태|시각 으로 표시해 두 번째 실행이 같은 주제를 다시 고르지 않게 한다.
// 승인 없이 MAKING_STALE_H시간이 지나면(오류로 멈춘 실행 등) 원래 상태로 돌아가 다시 고를 수 있다.
const MAKING_STALE_H = 30;
const statusOf = function (r) {
  const st = String(r.Status || '').trim().toLowerCase();
  const m = st.match(/^making\|([a-z]*)\|(.+)$/);
  if (!m) return st;
  const age = (Date.now() - Date.parse(m[2].toUpperCase())) / 3600000;
  return age > MAKING_STALE_H ? (m[1] || 'pending') : 'making';
};
// 리메이크 행(Source=remake)은 Status가 redo여도 맨 먼저 만들지 않는다 (아래 리메이크 규칙을 따른다)
const isRemake = function (r) { return String(r.Source || '').trim() === 'remake'; };
const isRedo = function (r) { return statusOf(r) === 'redo' && !isRemake(r); };
const isSeries = function (r) { return String(r.Source || '').trim() === 'series'; };
const pending = rows.filter(function (r) { const st = statusOf(r); return st === 'pending' || st === 'redo'; });
const maxRow = Math.max.apply(null, pending.map(function (r) { return Number(r.row_number) || 0; }).concat([1]));

// ── 우리 채널 성적 ──
let own = null;
try { own = $('Own Performance').first().json; } catch (e) {}
const THEME_RE = ((own && own.themes) || []).map(function (t) { return { key: t.key, label: t.label, re: new RegExp(t.re), verdict: t.verdict, ratio: t.ratio }; });
const themesOf = function (t) { return THEME_RE.filter(function (x) { return x.re.test(t); }); };
// 낱말 겹침 비율 (조사를 대충 떼고, 어느 제목에나 나오는 말은 빼고 비교) — 0.4 이상이면 같은 주제로 본다
const SIM_STOP = /^(사람|사람들|공통점|공통된|이유|진짜|정말|결국|가장|모두|절대|반드시|오늘|지금|하나|가지|이것|그것|방법|비밀|순간|있다|없다|되면|하는|한다|된다|이후|이상|이전|실제로|일어나는|사실)$/;
const toks = function (t) { return new Set(String(t).toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).map(function (w) { return w.replace(/^(\d+)(세|대|살|이|에|부터)$/, '$1').replace(/(은|는|이|가|을|를|의|에|도|만|로|으로|하는|하게|에서|이다|한다)$/, ''); }).filter(function (w) { return w.length > 1 && !SIM_STOP.test(w); })); };
const sim = function (a, b) { const A = toks(a), B = toks(b); if (!A.size || !B.size) return 0; let n = 0; A.forEach(function (w) { if (B.has(w)) n++; }); return n / Math.min(A.size, B.size); };
const REF = /([가-힣]+(?:복음|서|기|편|언)?)\s*(\d+):(\d+)/;
const recentOwn = (own && own.recent) || [];
const repeatOf = function (t) {
  const h = head(t), ref = (String(t).match(REF) || [])[0];
  return recentOwn.find(function (r) { return sim(h, r.head) >= 0.4 || (ref && r.head.indexOf(ref) >= 0); }) || null;
};
const last2 = recentOwn.filter(function (r) { return r.ageDays <= 2; });

const scored = pending.map(function (r) {
  const t = String(r.Topic);
  const h = head(t);
  const pillar = pillarOf(t);
  const why = [];
  let s = 100;
  if (!HANGUL.test(h)) { s -= 1000; why.push('영어'); }
  if (BIBLE_MODE === 'skip' && pillar === 'bible') { s -= 1000; why.push('성경은 Bible Shorts에서'); }
  else if (BIBLE_MODE === 'first' && pillar === 'bible') { s += 500; why.push('성경 우선'); }
  else if (pillar === recent[0]) { s -= 40; why.push('직전과 같은 분야'); }
  else if (pillar === recent[1]) { s -= 20; why.push('전전과 같은 분야'); }
  // 롱폼에서 파생된 쇼츠는 롱폼이 올라간 직후에 나가도록 먼저 (분야 감점보다 크게)
  if (String(r.Source || '').trim() === 'longform') { s += 70; why.push('롱폼 파생'); }
  // 조회수가 안 나와 비공개한 쇼츠의 리메이크(Weekly Shorts Remake가 주 2편 추가) → 그 주 안에 나가도록 가산
  if (String(r.Source || '').trim() === 'remake') { s += 50; why.push('리메이크'); }
  if (isRedo(r)) { s += 300; why.push('다시 제작'); }
  if (isSeries(r)) { s -= 1000; why.push('시리즈는 하루 한 편 따로'); }
  // 리메이크 규칙: 원본을 올린 지 이틀은 쉬었다가, 원본과 다른 각도일 때만, 원본이 약한 테마면 그 테마를 벗어났을 때만
  if (isRemake(r)) {
    const after = Date.parse(String(r.RemakeAfter || ''));
    const orig = ((own && own.videos) || []).find(function (v) { return v.id === String(r.RemakeOf || '').trim(); });
    if ((after && after > Date.now()) || (orig && orig.ageDays < 2)) { s -= 1000; why.push('리메이크 대기 (원본과 이틀 간격)'); }
    if (orig && sim(h, orig.head) >= 0.3) { s -= 1000; why.push('원본과 같은 각도: ' + orig.head.slice(0, 24)); }
    const weakSame = orig ? themesOf(t).filter(function (x) { return x.verdict === 'weak' && orig.themes.indexOf(x.key) >= 0; }) : [];
    if (weakSame.length) { s -= 1000; why.push('약한 테마를 그대로 리메이크: ' + weakSame.map(function (x) { return x.label; }).join('·')); }
  }
  // 최근 14일에 올린 영상과 같은 주제는 건너뜀
  const rep = repeatOf(t);
  if (rep) { s -= 1000; why.push('최근 ' + Math.round(rep.ageDays) + '일 전에 비슷한 영상: ' + rep.head.slice(0, 24)); }
  // 우리 채널에서 강한 테마 가산, 약한 테마 감점, 이틀 안에 같은 테마 감점
  const th = themesOf(t);
  if (th.some(function (x) { return x.verdict === 'strong'; })) { s += 30; why.push('강한 테마 ' + th.filter(function (x) { return x.verdict === 'strong'; }).map(function (x) { return x.label; }).join('·')); }
  if (th.some(function (x) { return x.verdict === 'weak'; })) { s -= 40; why.push('약한 테마 ' + th.filter(function (x) { return x.verdict === 'weak'; }).map(function (x) { return x.label; }).join('·')); }
  if (th.some(function (x) { return last2.some(function (r) { return r.themes.indexOf(x.key) >= 0; }); })) { s -= 25; why.push('이틀 안에 같은 테마'); }
  if (h.length <= 28) { s += 20; why.push('짧은 훅'); }
  else if (h.length <= 40) { s += 5; }
  else if (h.length > 50) { s -= 15; why.push('제목 김'); }
  if (/할수록|수록|오히려|역설/.test(t)) { s -= 15; why.push('역설형'); }
  const fresh = Math.round(((Number(r.row_number) || 0) / maxRow) * 15);
  s += fresh;
  return { row: r, score: s, pillar: pillar, why: why };
}).sort(function (a, b) { return b.score - a.score || (b.row.row_number || 0) - (a.row.row_number || 0); });

// ── 지금 뜨는 쇼츠에 맞춘 선택 ──
const normHead = function (t) { return String(t || '').split(/\s[—|]\s/)[0].replace(/[^\p{L}\p{N}]/gu, ''); };
let trendPick = null;
try {
  const raw = String((($('Claude - Trend Pick').first().json.content || [])[0] || {}).text || '');
  const d = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1));
  const topT = $('Trend Request').first().json.top || [];
  const tr = topT[Number(String(d.trend || '').replace(/\D/g, '')) - 1] || null;
  const trendNote = tr ? tr.title + ' (' + tr.vpd + '회/일)' : '';
  // Claude가 최근 14일 업로드와 같은 주제라고 본 대기 주제는 건너뜀 (낱말 비교로 못 잡는 비슷한 주제)
  (Array.isArray(d.repeats) ? d.repeats : []).forEach(function (n) {
    const x = scored.find(function (y) { return Number(y.row.row_number) === Number(String(n).replace(/\D/g, '')); });
    if (x && !isRedo(x.row)) { x.score -= 1000; x.why.push('Claude: 최근 영상과 같은 주제'); }
  });
  scored.sort(function (a, b) { return b.score - a.score || (b.row.row_number || 0) - (a.row.row_number || 0); });
  if (d.choice === 'existing') {
    const s = scored.find(function (x) { return Number(x.row.row_number) === Number(d.row) && x.score >= 0; });
    if (s) trendPick = { row: s.row, pillar: s.pillar, why: d.why, note: trendNote };
  } else if (d.choice === 'new') {
    const clean = function (x, n) { return String(x || '').replace(/["]/g, '”').replace(/\s*[—|]\s*/g, ', ').replace(/\s+/g, ' ').trim().slice(0, n); };
    const title = clean(d.title, 40).replace(/,\s*$/, ''), angle = clean(d.angle, 60);
    const heads = rows.map(function (r) { return normHead(r.Topic); });
    if (/[가-힣]/.test(title) && title.length >= 8 && title.length <= 34 && heads.indexOf(normHead(title)) === -1) {
      const PILLARS = ['wisdom', 'psychology', 'health', 'money'];
      trendPick = { row: { Topic: title + (angle ? ' — ' + angle : ''), Language: 'Korean', Status: 'pending', VideoURL: '', Source: 'trend' }, pillar: PILLARS.indexOf(d.pillar) >= 0 ? d.pillar : pillarOf(title), why: d.why, note: trendNote, isNew: true };
    }
  }
  console.log('지금 뜨는 쇼츠 → ' + (trendPick ? (trendPick.isNew ? '새 주제 ' : '대기 주제 ') + trendPick.row.Topic + ' ← ' + trendPick.note + ' | ' + (d.why || '') : '선택 없음 (점수 순으로 고른다)'));
} catch (e) { console.log('지금 뜨는 쇼츠 판단 실패 → 점수 순으로 고른다'); }

// 지금 뜨는 주제라도 최근 14일에 올린 것과 비슷하면 쓰지 않는다
if (trendPick) {
  const rep = repeatOf(trendPick.row.Topic);
  const blocked = rep || (!trendPick.isNew && !scored.some(function (x) { return x.row === trendPick.row && x.score >= 0; }));
  if (blocked) { console.log('지금 뜨는 주제 취소 → ' + (rep ? '최근 영상과 비슷함: ' + rep.head : '쓸 수 없는 주제')); trendPick = null; }
}
// ── 시리즈: 하루 한 편 (그날 첫 실행). 대기 중인 회차 중 Episode가 가장 작은 것 ──
const today = $now.toFormat('yyyy-MM-dd');
let seriesPick = null;
if (sd.seriesDay !== today) {
  const eps = pending.filter(function (r) { return isSeries(r) && statusOf(r) === 'pending'; })
    .sort(function (a, b) { return (Number(a.Episode) || 99) - (Number(b.Episode) || 99) || (a.row_number || 0) - (b.row_number || 0); });
  if (eps.length) seriesPick = { row: eps[0], score: 900, pillar: 'psychology', why: ['시리즈 ' + (eps[0].Series || '') + ' EP.' + (eps[0].Episode || '?')] };
}
let pick = scored[0];
if (seriesPick && !(pick && isRedo(pick.row))) { pick = seriesPick; trendPick = null; sd.seriesDay = today; console.log('시리즈 → ' + seriesPick.why[0] + ' ' + head(seriesPick.row.Topic) + ' (남은 회차 ' + pending.filter(function (r) { return isSeries(r) && statusOf(r) === 'pending'; }).length + '편)'); }
if (trendPick && !seriesPick && !(pick && isRedo(pick.row))) pick = { row: trendPick.row, score: 999, pillar: trendPick.pillar, why: ['지금 뜨는 주제: ' + trendPick.note] };
if (!pick) throw new Error('pending 주제가 없습니다 — 시트에 주제를 추가하거나 Weekly Topic Generator를 실행하세요');
if (pick.score < 0) throw new Error('쓸 수 있는 pending 주제가 없습니다 (남은 것이 전부 영어이거나 성경 주제 — 성경 주제는 Bible Shorts가 만듭니다)');

// 다음 실행을 위해 이번 분야를 기억 (프로덕션 실행에서만 저장됨)
sd.recentPillars = [pick.pillar].concat(recent).slice(0, 2);

console.log('채널 성적: ' + (own ? '강한 테마 ' + (THEME_RE.filter(function (x) { return x.verdict === 'strong'; }).map(function (x) { return x.label; }).join(', ') || '-') + ' / 약한 테마 ' + (THEME_RE.filter(function (x) { return x.verdict === 'weak'; }).map(function (x) { return x.label; }).join(', ') || '-') + ' / 최근 14일 ' + recentOwn.length + '편' : '없음'));
console.log('최근 분야: ' + recent.join(', ') + ' | pending ' + pending.length + '개');
scored.slice(0, 5).forEach(function (x, i) {
  console.log((i === 0 ? '▶ ' : '  ') + x.score + '점 [' + x.pillar + '] ' + x.row.row_number + '행 ' + head(x.row.Topic) + (x.why.length ? ' (' + x.why.join(', ') + ')' : ''));
});
return [{ json: Object.assign({}, pick.row, { pickedPillar: pick.pillar, pickScore: pick.score, MakingStatus: 'making|' + (statusOf(pick.row) || 'pending') + '|' + new Date().toISOString(), TrendRef: trendPick && pick.row === trendPick.row ? trendPick.note : '' }) }];

