// 대본 벤치마크 3/3: 50만+ 영상의 공개 정보(제목·길이·설명란 챕터·인기 댓글)를 요약해 대본 요청에 넘긴다.
// 대본·문장은 가져오지 않는다 — 무엇이 먹혔는지(훅 유형, 전개 순서, 시청자가 궁금해한 것)만 배우게 한다.
const SOURCE_NODE = 'Pick Short';
const row = $(SOURCE_NODE).first().json;
let vids = [];
try { vids = $('Benchmark Pick').all().map(function (i) { return i.json; }).filter(function (v) { return !v.skip; }); } catch (e) { /* 없음 */ }
let threads = [];
try { threads = $('Benchmark Comments').all().map(function (i) { return i.json; }); } catch (e) { /* 없음 */ }
const clean = function (s, n) { return String(s || '').replace(/<[^>]+>/g, ' ').replace(/&quot;|&#39;|&amp;/g, ' ').replace(/https?:\/\/\S+/g, '').replace(/["]/g, '”').replace(/\s+/g, ' ').trim().slice(0, n); };
const dur = function (iso) { const m = String(iso).match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/); if (!m) return '?'; const h = +m[1] || 0, mi = +m[2] || 0, s = +m[3] || 0; return (h ? h + ':' : '') + (h ? String(mi).padStart(2, '0') : mi) + ':' + String(s).padStart(2, '0'); };
const fmtV = function (n) { return n >= 10000 ? Math.round(n / 10000) + '만' : String(n); };
const blocks = vids.map(function (v, i) {
  // 같은 순서로 댓글 응답이 온다 (HTTP 노드는 입력 순서대로 한 번씩)
  const t = threads[i] || {};
  const cs = (t.items || []).map(function (c) {
    const s = c.snippet && c.snippet.topLevelComment && c.snippet.topLevelComment.snippet;
    return s ? { text: clean(s.textDisplay || s.textOriginal, 120), likes: Number(s.likeCount || 0) } : null;
  }).filter(function (c) { return c && c.text.length >= 6; }).sort(function (a, b) { return b.likes - a.likes; }).slice(0, 8);
  // 설명란에서 챕터(타임스탬프) 줄만
  const chapters = String(v.description || '').split(/\n/).filter(function (l) { return /^\s*\d{1,2}:\d{2}/.test(l); }).slice(0, 10).map(function (l) { return clean(l, 60); });
  return '[' + (i + 1) + '] ' + (v.ref ? 'REFERENCE · ' : '') + clean(v.title, 90) + ' (조회 ' + fmtV(v.views) + ', 길이 ' + dur(v.duration) + ', ' + String(v.publishedAt).slice(0, 7) + ')' +
    (chapters.length ? '\n  chapters: ' + chapters.join(' / ') : '') +
    (cs.length ? '\n  top comments (likes): ' + cs.map(function (c) { return c.text + ' (' + c.likes + ')'; }).join(' || ') : '');
});
const text = blocks.join('\n');
console.log('벤치마크 ' + vids.length + '개 영상, ' + text.length + '자');
return [{ json: Object.assign({}, row, { Benchmark: text, benchmarkCount: vids.length }) }];
