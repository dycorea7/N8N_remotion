// 실사 영상 3/3: 장면마다 Pixabay 검색 결과에서 쓸 영상 하나를 고른다
//  - 아이·미성년이 나오는 영상, 술·담배·무기·축제·로고 같은 것은 뺀다 (태그 기준)
//  - 세로 영상 우선, 6초 이상, 9:16 화면을 채울 만한 해상도 중 가장 작은 파일
//  - 같은 영상을 두 장면에 쓰지 않는다. 못 찾은 장면은 AI 그림으로 만든다 (Prepare Image Jobs)
const jobs = $('Prepare Footage Jobs').all().map(i => i.json);
const res = $('Pixabay Search').all().map(i => i.json);
const KID = /\b(child|children|kid|kids|baby|babies|girl|girls|boy|boys|toddler|toddlers|teen|teens|teenager|teenagers|school|schoolgirl|schoolboy|student|students|infant|newborn|daughter|son)\b/i;
const BAD = /\b(bikini|swimsuit|sexy|lingerie|underwear|nude|blood|gun|guns|weapon|knife|war|soldier|police|protest|flag|smoking|cigarette|smoke|alcohol|beer|wine|whiskey|drunk|christmas|halloween|logo|brand|text|letters|watermark|church|cross|temple)\b/i;
const used = new Set();
const picks = {};
const notes = [];
jobs.forEach((j, k) => {
  if (j.skip) return;
  const out = res[k] || {};
  const hits = Array.isArray(out.hits) ? out.hits : [];
  const cands = hits.map((h, idx) => {
    if (used.has(h.id) || !(h.duration >= 6) || KID.test(h.tags || '') || BAD.test(h.tags || '')) return null;
    const vs = h.videos || {};
    const opts = ['tiny', 'small', 'medium', 'large'].map(n => Object.assign({ n }, vs[n] || {})).filter(o => o.url && o.width && o.height);
    if (!opts.length) return null;
    const portrait = opts[0].height > opts[0].width;
    const need = portrait ? 1900 : 1070;   // 세로 영상은 1080x1920, 가로 영상은 높이 1080 이상이어야 9:16으로 잘라도 선명하다
    const ok = opts.filter(o => o.height >= need && (o.size || 0) <= 40e6).sort((a, b) => (a.size || 0) - (b.size || 0));
    const best = ok[0] || opts.slice().sort((a, b) => b.height - a.height)[0];
    const sharp = best.height >= need;
    // 검색 순서(관련도) + 세로 + 선명도 + 인기
    const score = -idx * 0.35 + (portrait ? 2 : 0) + (sharp ? 1 : -2) + Math.log10(1 + (h.downloads || 0)) * 0.4;
    return { h, best, portrait, score };
  }).filter(Boolean).sort((a, b) => b.score - a.score);
  const c = cands[0];
  if (!c) { notes.push('장면 ' + (j.sceneIndex + 1) + ' 「' + j.q + '」 없음 → AI 그림'); return; }
  used.add(c.h.id);
  picks[j.sceneIndex] = {
    video: c.best.url, poster: c.best.thumbnail || '', id: c.h.id, page: c.h.pageURL, q: j.q,
    w: c.best.width, h: c.best.height, dur: c.h.duration, portrait: c.portrait,
    // 스톡 영상 첫머리는 페이드인·흔들림이 많아 1~2초 건너뛴다
    videoStart: Math.round(Math.min(2, Math.max(0, (c.h.duration - 6) / 2)) * 10) / 10,
    tags: String(c.h.tags || '').slice(0, 80)
  };
  notes.push('장면 ' + (j.sceneIndex + 1) + ' 「' + j.q + '」 → ' + c.h.pageURL + ' (' + c.best.width + 'x' + c.best.height + ', ' + c.h.duration + '초' + (c.portrait ? ', 세로' : '') + ')');
});
const asked = jobs.filter(j => !j.skip).length;
console.log('실사 영상 ' + Object.keys(picks).length + '/' + asked + '개 찾음');
notes.forEach(n => console.log('  ' + n));
return [{ json: { picks, found: Object.keys(picks).length, asked } }];
