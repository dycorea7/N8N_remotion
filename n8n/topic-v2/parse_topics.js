const raw = String(($json.content && $json.content[0] && $json.content[0].text) || '');
const clean = raw.replace(/```json|```/g, '').trim();
const tryParse = function (t) { try { return JSON.parse(t); } catch (e) { return null; } };
let parsed = tryParse(clean);
if (typeof parsed === 'string') parsed = tryParse(parsed);
if (!parsed || typeof parsed !== 'object') {
  const s = clean.indexOf('{'), e = clean.lastIndexOf('}');
  if (s !== -1 && e > s) parsed = tryParse(clean.slice(s, e + 1));
}
if (!parsed || !Array.isArray(parsed.topics)) throw new Error('토픽 JSON 파싱 실패 — 응답 앞부분: ' + clean.slice(0, 300));

const normalize = function (s) { return String(s || '').toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim(); };
const tokens = function (s) { return new Set(normalize(s).split(' ').filter(function (w) { return w.length > 1; })); };
const similarity = function (a, b) {
  const A = tokens(a), B = tokens(b);
  if (!A.size || !B.size) return 0;
  let shared = 0; A.forEach(function (w) { if (B.has(w)) shared++; });
  return shared / Math.min(A.size, B.size);
};
const existing = $('Read Existing Topics').all().map(function (i) { return i.json.Topic; }).filter(Boolean);
// 기존 토픽은 「제목 — 각도」 또는 「테마 | 구절」 형태라 앞부분(제목)끼리도 비교한다
const head = function (t) { return String(t).split(/\s[—|]\s/)[0]; };

// 역설형(~할수록 오히려 / 역설)은 채널에 너무 많아서 한 번에 최대 2개만 받는다. 제목과 각도를 함께 본다.
const MAX_PARADOX = 2;
const PARADOX = /할수록|수록|오히려|역설/;
let paradoxCount = 0;
const accepted = [], rejected = [], shapes = {};
for (const t of parsed.topics) {
  let title = String((t && t.title) || '').replace(/["]/g, '”').replace(/\s*—\s*/g, ' ').trim();
  let ref = String((t && t.reference) || '').trim();
  // 제목 끝에 「| 구절」을 붙여 보내는 경우: 떼어서 reference로 옮긴다 (구절이 두 번 들어가지 않게)
  const inTitle = title.match(/\s*\|\s*([^|]+)$/);
  if (inTitle) { if (!ref) ref = inTitle[1].trim(); title = title.slice(0, inTitle.index).trim(); }
  // 각도는 한 줄 설명: 대시·세로줄은 쉼표로 바꾼다 (시트의 「제목 — 각도 | 구절」 구분자와 섞이지 않게)
  const angle = String((t && t.angle) || '').replace(/["]/g, '”').replace(/\s*[—|]\s*/g, ', ').trim().slice(0, 60);
  const pillar = String((t && t.pillar) || '').trim();
  if (!title || !/[가-힣]/.test(title)) { rejected.push((title || '(빈 제목)') + ' (한글 없음)'); continue; }
  if (title.length > 40) { rejected.push(title + ' (제목 ' + title.length + '자, 너무 김)'); continue; }
  if (pillar === 'bible' && !ref) { rejected.push(title + ' (성경 구절 없음)'); continue; }
  const pool = existing.concat(accepted.map(function (a) { return a.Topic; }));
  const dup = pool.some(function (old) {
    return normalize(old) === normalize(title) || similarity(head(old), title) >= 0.6 || similarity(old, title + ' ' + angle) >= 0.7;
  });
  if (dup) { rejected.push(title + ' (기존 토픽과 유사)'); continue; }
  const isParadox = t.shape === 'paradox' || PARADOX.test(title + ' ' + angle);
  if (isParadox && paradoxCount >= MAX_PARADOX) { rejected.push(title + ' (역설형 ' + MAX_PARADOX + '개 초과)'); continue; }
  if (isParadox) paradoxCount++;
  // 시트의 Topic: 성경은 「테마 | 구절」(기존 형식), 나머지는 「제목 — 각도」
  const topic = pillar === 'bible' ? title + (angle ? ' — ' + angle : '') + ' | ' + ref : title + (angle ? ' — ' + angle : '');
  shapes[t.shape] = (shapes[t.shape] || 0) + 1;
  // Pillar는 텔레그램 요약용 (시트에는 Topic/Language/Status/VideoURL만 들어간다)
  accepted.push({ Topic: topic, Language: 'Korean', Status: 'pending', VideoURL: '', Pillar: pillar });
  console.log('✔ [' + pillar + '/' + (t.shape || '?') + '] ' + topic + (t.evidence ? '  ← ' + t.evidence : ''));
}
if (!accepted.length) throw new Error('생성된 ' + parsed.topics.length + '개가 모두 제외되었습니다 — 재시도하세요. 제외: ' + rejected.join(' | '));
console.log('accepted ' + accepted.length + ', rejected ' + rejected.length + ' | 훅 유형 ' + JSON.stringify(shapes));
if (rejected.length) console.log('rejected: ' + rejected.join(' | '));
// ── 롱폼 주제: LongformTopics 탭에 넣을 행 (첫 항목에 붙여 두고, 텔레그램 뒤의 Longform Rows 노드가 펼친다) ──
let longExisting = [];
try { longExisting = $('Read Longform Topics').all().map(function (i) { return i.json.Topic; }).filter(Boolean); } catch (e) { /* 탭 없음 */ }
const longAccepted = [], longRejected = [];
const LONG_PILLARS = ['money', 'wisdom', 'health', 'psychology'];
for (const t of (Array.isArray(parsed.longform) ? parsed.longform : [])) {
  const title = String((t && t.title) || '').replace(/["]/g, '”').replace(/\s*—\s*/g, ' ').trim();
  const angle = String((t && t.angle) || '').replace(/["]/g, '”').replace(/\s*[—|]\s*/g, ', ').trim().slice(0, 80);
  const pillar = LONG_PILLARS.includes(String(t && t.pillar)) ? String(t.pillar) : 'wisdom';
  if (!title || !/[가-힣]/.test(title)) { longRejected.push((title || '(빈 제목)') + ' (한글 없음)'); continue; }
  const pool = longExisting.concat(existing, longAccepted.map(function (a) { return a.Topic; }));
  const dup = pool.some(function (old) { return normalize(old) === normalize(title) || similarity(head(old), title) >= 0.6 || similarity(old, title + ' ' + angle) >= 0.7; });
  if (dup) { longRejected.push(title + ' (기존 주제와 유사)'); continue; }
  longAccepted.push({ Topic: title + (angle ? ' — ' + angle : ''), Pillar: pillar, Status: 'pending', Source: 'generated', Added: $now.toFormat('yyyy-MM-dd'), LongTitle: '', LongURL: '' });
  console.log('✔ [롱폼/' + pillar + '] ' + title + (angle ? ' — ' + angle : ''));
}
if (longRejected.length) console.log('롱폼 제외: ' + longRejected.join(' | '));
// 제외 목록은 첫 항목에 붙여 텔레그램 요약에서 쓴다
accepted[0].Rejected = rejected;
accepted[0].Longform = longAccepted;
accepted[0].LongRejected = longRejected;
return accepted.map(function (json) { return { json: json }; });
