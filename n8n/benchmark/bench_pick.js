// 대본 벤치마크 3/4: Claude가 '같은 주제'라고 판정한 50만+ 영상만 쓴다 (최대 3개). 관련 영상이 없으면 벤치마크 없이 진행
//  - 판정 호출이 실패하면 제목·설명에 주제 키워드가 그대로 들어간 영상만 쓴다 (엉뚱한 영상은 절대 쓰지 않는다)
const MAX_VIDEOS = 3;
const req = $('Benchmark Relevance Request').first().json;
const cands = req.candidates || [];
if (req.skip || !cands.length) { console.log('50만+ 후보 없음 — 벤치마크 없이 진행'); return [{ json: { videoId: 'none', skip: true } }]; }
const raw = String(($json.content && $json.content[0] && $json.content[0].text) || '');
let verdict = null;
try { const t = raw.replace(/```json|```/g, ''); verdict = JSON.parse(t.slice(t.indexOf('{'), t.lastIndexOf('}') + 1)); } catch (e) {}
let vids = [], how = '';
if (verdict && Array.isArray(verdict.relevant)) {
  verdict.relevant.forEach(r => { const c = cands.find(x => x.label === String(r.id || '').trim().toUpperCase()); if (c && !vids.includes(c) && vids.length < MAX_VIDEOS) vids.push(Object.assign({}, c, { why: String(r.why || '') })); });
  how = 'Claude 관련성 판정';
} else {
  // 판정 실패: 첫 검색어의 낱말이 제목에 모두 들어간 영상만 (보수적으로)
  const q = String((cands[0] && cands[0].query) || '');
  const stems = q.split(/\s+/).filter(w => w.length >= 2).map(w => w.length >= 3 ? w.slice(0, 2) : w);
  vids = cands.filter(c => stems.length && stems.every(s => c.title.replace(/\s+/g, '').includes(s))).slice(0, MAX_VIDEOS);
  how = '판정 실패 → 키워드 전부 일치만';
}
console.log('50만+ 후보 ' + cands.length + '개 중 관련 ' + vids.length + '개 (' + how + '): ' + vids.map(v => Math.round(v.views / 10000) + '만 ' + v.title.slice(0, 30) + (v.why ? ' ← ' + v.why : '')).join(' | ') + (vids.length ? '' : ' / 제외: ' + cands.slice(0, 5).map(c => c.title.slice(0, 20)).join(', ')));
if (!vids.length) return [{ json: { videoId: 'none', skip: true } }];
return vids.map(v => ({ json: v }));
