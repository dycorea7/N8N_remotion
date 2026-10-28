// 리메이크 3/4: Claude의 판단을 Remakes 탭 기록(검토한 영상 전부)과 새 쇼츠 주제로 정리한다
const cands = $('Pick Remake Candidates').all().map(i => i.json);
const want = $('Build Remake Request').first().json.remakesPerRun;
const raw = String((($json.content || [])[0] || {}).text || '');
let parsed = null;
try { const t = raw.replace(/```json|```/g, ''); parsed = JSON.parse(t.slice(t.indexOf('{'), t.lastIndexOf('}') + 1)); } catch (e) {}
if (!parsed || !Array.isArray(parsed.decisions)) throw new Error('리메이크 계획 JSON 파싱 실패 — 응답 앞부분: ' + raw.slice(0, 300));
const clean = (s, n) => String(s || '').replace(/["]/g, '”').replace(/\s*[—|]\s*/g, ', ').replace(/\s+/g, ' ').trim().slice(0, n);
const norm = s => String(s || '').replace(/[^\p{L}\p{N}]/gu, '');
let existing = [];
try { existing = $('Read Topic Sheet').all().map(i => norm(String(i.json.Topic || '').split(/\s[—|]\s/)[0])); } catch (e) {}
const PILLARS = ['wisdom', 'health', 'psychology', 'money'];
// 낱말 겹침 비율 (조사·어미를 대충 떼고 비교)
const toks = t => new Set(String(t).toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).map(w => w.replace(/(은|는|이|가|을|를|의|에|도|만|로|으로|하는|하게|이는|에서)$/, '')).filter(w => w.length > 1));
const sim = (a, b) => { const A = toks(a), B = toks(b); if (!A.size || !B.size) return 0; let n = 0; A.forEach(w => { if (B.has(w)) n++; }); return n / Math.min(A.size, B.size); };
const today = $now.toFormat('yyyy-MM-dd');
let made = 0;
const out = cands.map(c => {
  const d = parsed.decisions.find(x => String(x.id || '').trim().toUpperCase() === c.label) || {};
  // 제목 후보 2개 중 옛 제목과 가장 덜 닮은 것 (옛 훅을 살짝 바꾼 제목은 버린다)
  const opts = (Array.isArray(d.titles) ? d.titles : [d.title]).map(t => clean(t, 40).replace(/,\s*$/, '')).filter(t => /[가-힣]/.test(t) && t.length <= 34);
  const scoredOpts = opts.map(t => ({ t, sim: sim(t, c.title) })).sort((a, b) => a.sim - b.sim);
  let title = scoredOpts.length ? scoredOpts[0].t : '';
  const tooClose = scoredOpts.length && scoredOpts[0].sim >= 0.7;
  const angle = clean(d.angle, 60);
  let remake = d.remake === true && made < want && !!title && !tooClose && PILLARS.includes(d.pillar);
  let reason = clean(d.reason, 60);
  if (d.remake === true && tooClose) reason = '새 제목이 옛 제목과 너무 비슷함';
  if (remake && existing.includes(norm(title))) { remake = false; reason = '새 제목이 기존 주제와 같음'; }
  if (d.remake === true && !remake && !reason) reason = '형식 오류로 제외';
  if (remake) made++;
  const topic = remake ? title + (angle ? ' — ' + angle : '') : '';
  return { json: {
    Date: today, OldVideoId: c.id, OldTitle: c.title, OldViews: c.views, OldPublished: String(c.published).slice(0, 10),
    Decision: remake ? 'remake' : 'skip', Diagnosis: clean(d.diagnosis, 120), Reason: reason, Pillar: remake ? d.pillar : '',
    NewTopic: topic, Fix: remake ? clean(d.fix, 160) : '', Status: remake ? 'queued' : ''
  } };
});
console.log('리메이크 ' + made + '개 / 건너뜀 ' + (out.length - made) + '개');
out.forEach(o => console.log((o.json.Decision === 'remake' ? '♻️ ' : '⏭ ') + o.json.OldTitle.slice(0, 40) + ' (' + o.json.OldViews + '회) → ' + (o.json.NewTopic || o.json.Reason) + ' | ' + o.json.Diagnosis));
return out;
