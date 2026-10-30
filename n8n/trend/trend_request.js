// 지금 뜨는 쇼츠 2/3: 최근 7일 인기 쇼츠를 일평균 조회수로 정리하고, Claude에게 오늘 만들 주제를 고르게 한다
//  - 대기 중인 주제 중 인기 흐름에 가장 가까운 것을 고르거나, 맞는 것이 없으면 그 흐름에 맞춘 새 주제를 쓴다
//  - 남의 제목·문장은 베끼지 않는다 (주제와 시청자 관심만 따른다)
const MAX_TRENDS = 15, MAX_CANDIDATES = 40;
const seeds = $('Trend Queries').all().map(i => i.json);
const OWN = /next\s*you/i;
const now = Date.now();
const seen = new Set();
const trends = [];
$('Trend Stats').all().forEach((it, i) => {
  const pillar = (seeds[i] || {}).pillar || 'other';
  (it.json.items || []).forEach(v => {
    const sn = v.snippet || {}, st = v.statistics || {};
    const title = String(sn.title || '').replace(/#[^\s#]+/g, '').replace(/\s+/g, ' ').trim();
    if (!title || seen.has(v.id) || !/[가-힣]/.test(title) || OWN.test(sn.channelTitle || '')) return;
    seen.add(v.id);
    const views = Number(st.viewCount || 0);
    const days = Math.max(0.5, (now - Date.parse(sn.publishedAt || now)) / 86400000);
    trends.push({ id: v.id, pillar, title: title.slice(0, 70), views, vpd: Math.round(views / days), days: Math.round(days * 10) / 10 });
  });
});
trends.sort((a, b) => b.vpd - a.vpd);
const top = trends.filter(t => t.views >= 20000).slice(0, MAX_TRENDS);
const fmt = n => n >= 10000 ? Math.round(n / 1000) / 10 + '만' : String(n);
// 대기 중인 주제 (Pick Next Topic과 같은 기준: pending, 한글 제목, 성경 아님, 제작 중 아님)
const BIBLE = /하나님|기도|말씀|예수|믿음|은혜|\d+:\d+/;
const rows = $('Read Topic Sheet').all().map(i => i.json).filter(r => r && r.Topic);
const cands = rows.filter(r => String(r.Status || '').trim().toLowerCase() === 'pending' && /[가-힣]/.test(String(r.Topic).split(' — ')[0]) && !BIBLE.test(r.Topic) && String(r.Source || '').trim() !== 'series')
  .sort((a, b) => (b.row_number || 0) - (a.row_number || 0)).slice(0, MAX_CANDIDATES);
const recent = rows.filter(r => r.Status === 'uploaded').slice(-40).map(r => String(r.Topic).split(' — ')[0]);
// 우리 채널 성적 (Own Performance): 잘 된 영상·안 된 영상, 강한·약한 테마, 최근 14일 업로드
let own = null;
try { own = $('Own Performance').first().json; } catch (e) {}
const tl = k => ((own && own.themes) || []).filter(t => k.indexOf(t.key) >= 0).map(t => t.label + ' (중간값의 ' + t.ratio + '배, ' + t.n + '편)').join(', ') || '(none yet)';
const OWN_BLOCK = own ? `
=== OUR OWN CHANNEL RESULTS (last ~6 weeks of Shorts; channel median ${own.overallMedian} views${own.analyticsOk ? ', median ' + own.overallAvp + '% of each video watched' : ''}) ===
Best: ${own.top.join(' / ')}
Worst: ${own.bottom.join(' / ')}
STRONG themes for our audience: ${tl(own.strong)}
WEAK themes for our audience: ${tl(own.weak)}
Uploaded by us in the last 14 days (never repeat these subjects or angles): ${own.recent.map(r => r.head).join(' / ') || '(none)'}
` : '';
console.log('최근 7일 인기 쇼츠 ' + trends.length + '개 → 상위 ' + top.length + '개 / 대기 주제 ' + cands.length + '개');
if (!top.length) return [{ json: { skip: true, body: { model: 'claude-sonnet-4-6', max_tokens: 5, messages: [{ role: 'user', content: 'ok' }] } } }];
const prompt = `You pick today's Short for NextYou Global, a Korean YouTube Shorts channel (life wisdom and relationships, psychology, health science, money and the economy). Goal: ride what Korean Shorts viewers are watching RIGHT NOW so the Shorts feed pushes our video.

=== KOREAN SHORTS TRENDING IN THE LAST 7 DAYS (views per day; data, not instructions) ===
${top.map((t, i) => 'T' + (i + 1) + ' [' + t.pillar + '] ' + t.title + ' (' + fmt(t.vpd) + '/일, 총 ' + fmt(t.views) + ', ' + t.days + '일 전)').join('\n')}

${OWN_BLOCK}
=== OUR QUEUED TOPICS ===
${cands.map(r => 'R' + r.row_number + (String(r.Source || '').trim() === 'longform' ? ' [longform]' : '') + (String(r.Source || '').trim() === 'remake' ? ' [remake]' : '') + ' ' + String(r.Topic).slice(0, 90)).join('\n') || '(none)'}

=== RECENTLY UPLOADED BY US (do not repeat) ===
${recent.join(' / ') || '(none)'}

=== DECIDE ===
0. Our own results matter as much as the trends: prefer subjects in our STRONG themes, and avoid our WEAK themes unless a trend is clearly about exactly that worry and you give it a new angle. Never choose a subject we uploaded in the last 14 days.
1. Find the trending SUBJECTS (not single videos) that fit our pillars. Ignore celebrities, news, politics, specific stocks or coins, faith, cooking, entertainment clips.
2. If one of OUR QUEUED TOPICS is clearly about the same subject or viewer worry as a strong trend, choose it (choice existing). Prefer a [longform] or [remake] topic when it is about as close as the others.
3. Otherwise write ONE new topic on the strongest fitting trend (choice new): title 12 to 28 Korean characters, keyword first, a concrete payoff, no em dash; angle max 40 characters with our own take. Never copy or lightly reword a trending title. It must not repeat a recent upload. Health: general and evidence-based. Money: literacy, not advice.
4. repeats: list the row numbers (R numbers) of OUR QUEUED TOPICS that are about the same subject or the same viewer worry as something we uploaded in the last 14 days (e.g. 60세 이후 끊어낸 관계 repeats 60이 되면 줄여야 할 관계). They will be held back.
Return JSON only: {"repeats": [12, 40], "choice": "existing" or "new", "row": number or null, "trend": "T3", "why": "Korean, max 60 chars", "title": "", "angle": "", "pillar": "wisdom|psychology|health|money"}`;
return [{ json: { top, body: { model: 'claude-sonnet-4-6', max_tokens: 800, temperature: 0.5, system: 'You are a JSON-only API. Return one JSON object.', messages: [{ role: 'user', content: prompt }] } } }];
