// 50만+ 벤치마크 3/3: 조회수 50만 이상 쇼츠(인기 댓글 포함)와 롱폼(길이·챕터)을 요약해 주제 요청에 넘긴다.
// 남의 대본은 가져오지 않는다 — 어떤 주제·훅·전개가 먹혔고 시청자가 무엇을 궁금해했는지만.
const clean = function (s, n) { return String(s || '').replace(/<[^>]+>/g, ' ').replace(/&quot;|&#39;|&amp;/g, ' ').replace(/https?:\/\/\S+/g, '').replace(/#[^\s#]+/g, '').replace(/["]/g, '”').replace(/\s+/g, ' ').trim().slice(0, n); };
const fmtV = function (n) { return n >= 10000 ? Math.round(n / 10000) + '만' : String(n); };
const dur = function (iso) { const m = String(iso).match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/); if (!m) return '?'; return ((+m[1] || 0) * 60 + (+m[2] || 0)) + '분'; };
const lines = [];
// 쇼츠
let picks = [], threads = [];
try { picks = $('Viral Picks').all().map(function (i) { return i.json; }).filter(function (v) { return !v.skip; }); } catch (e) {}
try { threads = $('Viral Comments').all().map(function (i) { return i.json; }); } catch (e) {}
if (picks.length) {
  lines.push('[SHORTS WITH 500K+ VIEWS - subject, title shape and what viewers said]');
  picks.forEach(function (v, i) {
    const cs = ((threads[i] || {}).items || []).map(function (c) {
      const s = c.snippet && c.snippet.topLevelComment && c.snippet.topLevelComment.snippet;
      return s ? { t: clean(s.textDisplay || s.textOriginal, 100), l: Number(s.likeCount || 0) } : null;
    }).filter(function (c) { return c && c.t.length >= 6; }).sort(function (a, b) { return b.l - a.l; }).slice(0, 5);
    lines.push('  - ' + clean(v.title, 80) + ' (' + v.pillar + ', 조회 ' + fmtV(v.views) + ')' + (cs.length ? '\n    comments: ' + cs.map(function (c) { return c.t; }).join(' || ') : ''));
  });
}
// 롱폼
let seeds = [];
try { seeds = $('Long Search Queries').all().map(function (i) { return i.json; }); } catch (e) {}
const longRows = [];
try {
  $('Long Video Stats').all().forEach(function (it, i) {
    const pillar = (seeds[i] || {}).pillar || 'other';
    (it.json.items || []).forEach(function (v) {
      const s = v.statistics || {}, sn = v.snippet || {};
      const views = Number(s.viewCount || 0);
      if (views < 500000 || !/[가-힣]/.test(sn.title || '') || longRows.some(function (r) { return r.id === v.id; })) return;
      const chapters = String(sn.description || '').split(/\n/).filter(function (l) { return /^\s*\d{1,2}:\d{2}/.test(l); }).slice(0, 8).map(function (l) { return clean(l, 40); });
      longRows.push({ id: v.id, pillar: pillar, title: clean(sn.title, 80), views: views, len: dur((v.contentDetails || {}).duration), chapters: chapters });
    });
  });
} catch (e) {}
// 롱폼 주제는 이 목록의 영상 하나를 기준으로 고른다 → [L1] 같은 번호와 영상 ID 표
const longMap = {};
if (longRows.length) {
  lines.push('');
  lines.push('[LONG-FORM VIDEOS WITH 500K+ VIEWS (last 12 months) - each long-form topic must be based on one of these; use its label]');
  const byP = {};
  longRows.sort(function (a, b) { return b.views - a.views; }).forEach(function (r) { (byP[r.pillar] = byP[r.pillar] || []).push(r); });
  let n = 0;
  Object.keys(byP).forEach(function (p) {
    byP[p].slice(0, p === 'money' ? 8 : 4).forEach(function (r) {
      const label = 'L' + (++n);
      longMap[label] = { id: r.id, title: r.title, views: r.views, pillar: p };
      lines.push('  - [' + label + '] [' + p + '] ' + r.title + ' (조회 ' + fmtV(r.views) + ', ' + r.len + ')' + (r.chapters.length ? '\n    chapters: ' + r.chapters.join(' / ') : ''));
    });
  });
}
console.log('벤치마크: 쇼츠 ' + picks.length + '개, 롱폼 ' + longRows.length + '개');
return [{ json: { report: lines.join('\n'), shortCount: picks.length, longCount: longRows.length, longMap: longMap } }];
