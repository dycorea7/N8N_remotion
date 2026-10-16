// [Bible Shorts 전용] pending 주제 중 성경 주제 하나만 고른다.
//  - 성경 판별: 성경 책 이름+장절, 또는 하나님·기도·말씀·예수·믿음·은혜
//  - 짧은 훅 제목 가산, 「~할수록 오히려 / 역설」 형태 감점
//  - 점수가 비슷하면 최근에 만든 주제(아래쪽 행) 우선
//  - 다른 분야 주제는 Motion Shorts v2가 만든다 (그쪽은 성경 주제를 건너뜀)
const rows = $input.all().map(function (i) { return i.json; }).filter(function (r) { return r && r.Topic; });
const HANGUL = /[가-힣]/;
const BIBLE_BOOKS = /(창세기|출애굽기|레위기|민수기|신명기|여호수아|사사기|룻기|사무엘|열왕기|역대|에스라|느헤미야|에스더|욥기|시편|잠언|전도서|아가|이사야|예레미야|애가|에스겔|다니엘|호세아|요엘|아모스|오바댜|요나|미가|나훔|하박국|스바냐|학개|스가랴|말라기|마태복음|마가복음|누가복음|요한복음|사도행전|로마서|고린도|갈라디아서|에베소서|빌립보서|골로새서|데살로니가|디모데|디도서|빌레몬서|히브리서|야고보서|베드로|요한[일이삼]서|유다서|요한계시록)\s*\d+[:장]/;
const isBible = function (t) { return BIBLE_BOOKS.test(t) || /하나님|기도|말씀|예수|믿음|은혜/.test(t); };
const head = function (t) { return String(t).split(/\s[—|]\s/)[0].trim(); };

const pending = rows.filter(function (r) {
  return String(r.Status || '').trim().toLowerCase() === 'pending' && isBible(String(r.Topic)) && HANGUL.test(head(r.Topic));
});
if (!pending.length) throw new Error('pending 성경 주제가 없습니다 — 시트에 성경 주제를 추가하거나 Weekly Topic Generator를 실행하세요');
const maxRow = Math.max.apply(null, pending.map(function (r) { return Number(r.row_number) || 0; }).concat([1]));

const scored = pending.map(function (r) {
  const t = String(r.Topic);
  const h = head(t);
  const why = [];
  let s = 100;
  if (h.length <= 28) { s += 20; why.push('짧은 훅'); }
  else if (h.length <= 40) { s += 5; }
  else if (h.length > 50) { s -= 15; why.push('제목 김'); }
  if (/할수록|수록|오히려|역설/.test(t)) { s -= 15; why.push('역설형'); }
  s += Math.round(((Number(r.row_number) || 0) / maxRow) * 15);
  return { row: r, score: s, why: why };
}).sort(function (a, b) { return b.score - a.score || (b.row.row_number || 0) - (a.row.row_number || 0); });

const pick = scored[0];
console.log('pending 성경 주제 ' + pending.length + '개');
scored.slice(0, 5).forEach(function (x, i) {
  console.log((i === 0 ? '▶ ' : '  ') + x.score + '점 ' + x.row.row_number + '행 ' + head(x.row.Topic) + (x.why.length ? ' (' + x.why.join(', ') + ')' : ''));
});
return [{ json: Object.assign({}, pick.row, { pickedPillar: 'bible', pickScore: pick.score, biblePendingLeft: pending.length - 1 }) }];
