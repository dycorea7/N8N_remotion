// 실사 영상 2/4: 장면마다 Pixabay 결과에서 후보를 최대 2개 고르고, Claude가 썸네일을 직접 보고 검수하도록 요청을 만든다
//  - 1차로 태그로 걸러낸다: 아이·미성년, 노출, 술·담배·무기, 정치(시위·국기·경찰), 종교 시설, 로고·글자
//  - 세로 영상 우선, 6초 이상, 9:16 화면을 채울 만한 해상도 중 가장 작은 파일. 같은 영상은 한 장면에만
const NL = String.fromCharCode(10);
const MAX_PER_SCENE = 2, MAX_IMAGES = 30;
const jobs = $('Prepare Footage Jobs').all().map(i => i.json);
const res = $('Pixabay Search').all().map(i => i.json);
const p = $('Parse Script JSON').first().json;
const KID = /\b(child|children|kid|kids|baby|babies|girl|girls|boy|boys|toddler|toddlers|teen|teens|teenager|teenagers|school|schoolgirl|schoolboy|student|students|infant|newborn|daughter|son)\b/i;
const BAD = /\b(bikini|swimsuit|sexy|lingerie|underwear|nude|blood|gun|guns|weapon|knife|war|soldier|police|protest|flag|smoking|cigarette|smoke|alcohol|beer|wine|whiskey|drunk|christmas|halloween|logo|brand|text|letters|watermark|church|cross|temple|gambling|casino|drugs|syringe|surgery|funeral|coffin|skull|explosion|riot)\b/i;
const used = new Set();
const cands = {};
const content = [];
let images = 0, scenesAsked = 0;
jobs.forEach((j, k) => {
  if (j.skip) return;
  const hits = Array.isArray((res[k] || {}).hits) ? res[k].hits : [];
  const list = hits.map((h, idx) => {
    if (used.has(h.id) || !(h.duration >= 6) || KID.test(h.tags || '') || BAD.test(h.tags || '')) return null;
    const vs = h.videos || {};
    const opts = ['tiny', 'small', 'medium', 'large'].map(n => Object.assign({ n }, vs[n] || {})).filter(o => o.url && o.width && o.height);
    if (!opts.length) return null;
    const portrait = opts[0].height > opts[0].width;
    const need = portrait ? 1900 : 1070;   // 세로 영상은 1080x1920, 가로 영상은 높이 1080 이상이어야 9:16으로 잘라도 선명하다
    const ok = opts.filter(o => o.height >= need && (o.size || 0) <= 40e6).sort((a, b) => (a.size || 0) - (b.size || 0));
    const best = ok[0] || opts.slice().sort((a, b) => b.height - a.height)[0];
    if (best.height < 720) return null;
    const thumb = best.thumbnail || (vs.medium && vs.medium.thumbnail) || (vs.small && vs.small.thumbnail) || (vs.tiny && vs.tiny.thumbnail) || '';
    if (!/^https:/.test(thumb)) return null;
    // 검색 순서(관련도) + 세로 + 선명도 + 인기
    const score = -idx * 0.35 + (portrait ? 2 : 0) + (best.height >= need ? 1 : -2) + Math.log10(1 + (h.downloads || 0)) * 0.4;
    return { id: h.id, tags: String(h.tags || '').slice(0, 120), thumb, video: best.url, poster: thumb, page: h.pageURL, w: best.width, h: best.height, dur: h.duration, portrait, score,
      videoStart: Math.round(Math.min(2, Math.max(0, (h.duration - 6) / 2)) * 10) / 10 };
  }).filter(Boolean).sort((a, b) => b.score - a.score).slice(0, MAX_PER_SCENE);
  if (!list.length || images + list.length > MAX_IMAGES) return;
  scenesAsked++;
  const sid = 'S' + j.sceneIndex;
  cands[sid] = { sceneIndex: j.sceneIndex, kind: j.kind || 'image', q: j.q, list };
  list.forEach(c => used.add(c.id));
  content.push({ type: 'text', text: NL + '=== ' + sid + ' ===' + NL + 'Narration (Korean): ' + j.narration + NL + 'What the scene should show' + (j.kind === 'bg' ? ' (background behind on-screen text)' : '') + ': ' + j.prompt + NL + 'Search used: ' + j.q });
  list.forEach((c, ci) => {
    content.push({ type: 'text', text: sid + '-C' + (ci + 1) + ' (' + (c.portrait ? 'vertical' : 'horizontal, center-cropped to vertical') + '; stock tags: ' + c.tags + ')' });
    content.push({ type: 'image', source: { type: 'url', url: c.thumb } });
    images++;
  });
});
if (!scenesAsked) { console.log('검수할 실사 영상 후보 없음 → 모두 AI 그림'); return [{ json: { skip: true, cands: {} } }]; }
const intro = 'You check stock-video clips for a Korean YouTube Short (vertical 9:16). Title: ' + p.title + ' / topic: ' + (p.topic || '') + '.' + NL +
  'For each scene you get the narration, what the picture should show and up to 2 candidate clips (one frame each). Choose the candidate that clearly shows THAT moment, place, object or action, so a viewer instantly sees why it is on screen. A calm general shot that fits literally is fine (coins on a table for saving money, a person walking in a park for exercise, a city at night for modern stress). A horizontal clip is cropped to its centre, so reject it if the subject would be cut off. Reject a candidate if it shows a different subject, children or teenagers, a close-up of an identifiable face as the main subject, text, logos or brands, political symbols, flags or protests, alcohol, smoking, gambling, weapons, violence, hospitals or medical procedures, anything sexual, or anything cheesy, staged-looking or that would confuse a viewer. When unsure, choose none - an AI picture will be used instead, and a wrong clip is much worse than no clip.';
const outro = NL + 'Reply ONLY with JSON, first character the opening brace: {"picks": {"S3": "S3-C2", "S5": null}} with every scene id listed above.';
const body = { model: 'claude-sonnet-4-6', max_tokens: 800, temperature: 0, messages: [{ role: 'user', content: [{ type: 'text', text: intro }].concat(content).concat([{ type: 'text', text: outro }]) }] };
console.log('실사 영상 검수 요청: 장면 ' + scenesAsked + '개, 후보 썸네일 ' + images + '장');
return [{ json: { skip: false, cands, body } }];
