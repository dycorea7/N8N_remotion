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
// ===== 설정 =====
// 'skip': 성경 주제는 Bible Shorts가 만든다 / 'first': 성경 주제부터 / 'mix': 분야를 번갈아
const BIBLE_MODE = 'skip';
// ================
const rows = $input.all().map(function (i) { return i.json; }).filter(function (r) { return r && r.Topic; });
const HANGUL = /[가-힣]/;
const BIBLE_BOOKS = /(창세기|출에굽기|레위기|민수기|신명기|여호수아|사사기|룻기|사무엘|열왕기|역대|에스라|느헤미야|에스더|욥기|시편|잠언|전도서|아가|이사야|예레미야|애가|에스겔|다니엘|호세아|요엘|아모스|오바댜|요나|미가|나훈|하박국|스바냐|학개|스가랴|말라기|마태복음|마가복음|누가복음|요한복음|사도행전|로마서|고린도|갈라디아서|에베소서|빌립보서|골로새서|데살로니가|디모데|디도서|빌레몬서|히브리서|야고보서|베드로|요한[일이삼]서|유다서|요한계시록)\s*\d+[:장]/;
const HEALTH = /혈압|혈당|수면|잠|근육|무릎|관절|마그네슘|장내|장 속|유익균|노화|건강|나트륨|면역|피부|체중|식후|단백질|비타민|심장|혈관|뼈|호르몬|햇빛/;
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

const isRedo = function (r) { return String(r.Status || '').trim().toLowerCase() === 'redo'; };
const pending = rows.filter(function (r) { const st = String(r.Status || '').trim().toLowerCase(); return st === 'pending' || st === 'redo'; });
if (!pending.length) throw new Error('pending 주제가 없습니다 — 시트에 주제를 추가하거나 Weekly Topic Generator를 실행하세요');
const maxRow = Math.max.apply(null, pending.map(function (r) { return Number(r.row_number) || 0; }).concat([1]));

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
  if (h.length <= 28) { s += 20; why.push('짧은 훅'); }
  else if (h.length <= 40) { s += 5; }
  else if (h.length > 50) { s -= 15; why.push('제목 김'); }
  if (/할수록|수록|오히려|역설/.test(t)) { s -= 15; why.push('역설형'); }
  const fresh = Math.round(((Number(r.row_number) || 0) / maxRow) * 15);
  s += fresh;
  return { row: r, score: s, pillar: pillar, why: why };
}).sort(function (a, b) { return b.score - a.score || (b.row.row_number || 0) - (a.row.row_number || 0); });

const pick = scored[0];
if (pick.score < 0) throw new Error('쓸 수 있는 pending 주제가 없습니다 (남은 것이 전부 영어이거나 성경 주제 — 성경 주제는 Bible Shorts가 만듭니다)');

// 다음 실행을 위해 이번 분야를 기억 (프로덕션 실행에서만 저장됨)
sd.recentPillars = [pick.pillar].concat(recent).slice(0, 2);

console.log('최근 분야: ' + recent.join(', ') + ' | pending ' + pending.length + '개');
scored.slice(0, 5).forEach(function (x, i) {
  console.log((i === 0 ? '▶ ' : '  ') + x.score + '점 [' + x.pillar + '] ' + x.row.row_number + '행 ' + head(x.row.Topic) + (x.why.length ? ' (' + x.why.join(', ') + ')' : ''));
});
return [{ json: Object.assign({}, pick.row, { pickedPillar: pick.pillar, pickScore: pick.score }) }];

