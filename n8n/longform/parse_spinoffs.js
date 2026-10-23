// Claude가 뽑은 파생 쇼츠 주제를 Sheet1(쇼츠 주제 시트) 행으로 만든다.
//  Source = longform → 쇼츠 워크플로우가 일반 주제보다 먼저 만든다 / Brief = 대본 근거 / LongURL = 설명란 링크
const req = $('Build Spinoff Request').first().json;
const raw = String(($json.content && $json.content[0] && $json.content[0].text) || '');
const clean = raw.replace(/```json|```/g, '').trim();
const tryParse = function (t) { try { return JSON.parse(t); } catch (e) { return null; } };
let parsed = tryParse(clean);
if (!parsed) { const s = clean.indexOf('{'), e = clean.lastIndexOf('}'); if (s !== -1 && e > s) parsed = tryParse(clean.slice(s, e + 1)); }
const list = parsed && Array.isArray(parsed.shorts) ? parsed.shorts : [];
if (!list.length) { console.log('파생 쇼츠 파싱 실패: ' + clean.slice(0, 200)); return []; }
const norm = function (s) { return String(s || '').replace(/[^\p{L}\p{N}]/gu, ''); };
let existing = [];
try { existing = $('Read Topic Sheet').all().map(function (i) { return norm(i.json.Topic); }); } catch (e) { /* 없음 */ }
const rows = [];
for (const t of list.slice(0, 3)) {
  const title = String(t.title || '').replace(/["]/g, '”').replace(/\s*—\s*/g, ' ').trim();
  const angle = String(t.angle || '').replace(/["]/g, '”').replace(/\s*[—|]\s*/g, ', ').trim().slice(0, 60);
  const brief = String(t.brief || '').replace(/["]/g, '”').replace(/\s*\n\s*/g, ' / ').trim().slice(0, 500);
  if (!title || !/[가-힣]/.test(title) || !brief) continue;
  const topic = title + (angle ? ' — ' + angle : '');
  if (existing.includes(norm(topic))) continue;
  rows.push({ Topic: topic, Language: 'Korean', Status: 'pending', VideoURL: '', Source: 'longform', LongURL: req.longUrl, Brief: brief });
  console.log('✔ 파생 쇼츠 (' + (t.chapter || '?') + '장): ' + topic);
}
return rows.map(function (json) { return { json: json }; });
