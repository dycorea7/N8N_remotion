// ===== 설정 =====
// 한 번에 만드는 쇼츠 주제 수. Bible Shorts(하루 1편) 7편 + Motion Shorts 3편.
// Motion Shorts의 나머지 4편(주)은 롱폼(화·금)마다 2편씩 롱폼에서 파생된 쇼츠 주제로 채워진다.
const TOTAL = 10;
// 기둥별 최소 편수. 남는 편수는 이번 주 한국어 쇼츠 수요가 큰 기둥(성경 제외)에 배정한다.
// 성경은 Bible Shorts가 매일 쓰므로 한 주 치(7편)를 지킨다.
// 경제·재테크: 여기서 1편 + 경제 롱폼 1편의 파생 쇼츠 2편 = 주 3편 이상.
const MIN_PER_PILLAR = { bible: 7, wisdom: 0, health: 0, psychology: 0, money: 1 };
// 롱폼(8~10분) 주제 수 — 화·금 롱폼 2편. 하나는 경제, 하나는 지혜·건강·심리 중에서.
const LONG_TOTAL = 2;
const PILLAR_DESC = {
  bible: 'Bible / faith reflection. Topic is a Korean theme, then a vertical bar, then the scripture reference: 두려움을 이기는 믿음 | 이사야 41:10',
  wisdom: 'Life wisdom: philosophy, 인간관계, 처세, aging well. This is the biggest Shorts market in Korea.',
  health: 'Health science, evidence-based (nutrition science, sleep, blood sugar, aging, joints, gut). Never recipes or cooking.',
  psychology: 'Psychology: habits, self-esteem, relationships, cognitive biases, how people read each other.',
  money: 'Economy and personal finance for ordinary Korean viewers: saving and spending habits, 월급 관리, 금리·물가가 내 지갑에 미치는 영향, 연금·노후 자금, 복리, 빚과 대출, 소비 심리, 부자들의 돈 습관, 경제 개념을 생활 예시로 설명.'
};
// ================

const existingList = $('Read Existing Topics').all().map(function (i) { return i.json.Topic; }).filter(Boolean);
const existing = existingList.slice(-150).join('\n') || '(none yet)';
let longList = [];
try { longList = $('Read Longform Topics').all().map(function (i) { return i.json.Topic; }).filter(Boolean); } catch (e) { /* 탭 없음 */ }
const existingLong = longList.slice(-60).join('\n') || '(none yet)';

// ── 수요 기반 기둥 배정 ──
let demandInfo = { demand: {}, report: '' };
try { demandInfo = $('Shorts Demand Analysis').first().json; } catch (e) { console.log('수요 데이터 없음'); }
const demand = demandInfo.demand || {};
const mix = Object.assign({}, MIN_PER_PILLAR);
let left = TOTAL - Object.keys(mix).reduce(function (a, k) { return a + mix[k]; }, 0);
const ranked = Object.keys(mix).filter(function (k) { return k !== 'bible'; }).sort(function (a, b) { return (demand[b] || 0) - (demand[a] || 0); });
if (left > 0 && ranked.length) {
  const first = ranked[0], second = ranked[1];
  // 1위 수요가 2위의 3배 이상이면 남는 편수를 1위에 몰아준다
  if (!second || (demand[first] || 0) >= 3 * (demand[second] || 1)) { mix[first] += left; }
  else { mix[first] += Math.ceil(left / 2); mix[second] += Math.floor(left / 2); }
  left = 0;
}
const mixText = Object.keys(mix).map(function (k) { return k + ' ' + mix[k]; }).join(', ');

// ── 사상가 로테이션 (wisdom 기둥에서 인물을 쓸 때만) ──
const THINKER_POOL = [
  ['쇼펜하우어', '키에르케고르', '스피노자'], ['니체', '카뮈', '파스칼'], ['에피쿠로스', '디오게네스', '헤라클레이토스'],
  ['장자', '노자', '한비자'], ['공자', '맹자', '순자'], ['아들러', '융', '빅터 프랭클'], ['몽테뉴', '로크', '토크빌'],
  ['한나 아렌트', '시몬 베유', '버트런드 러셀'], ['이이', '정약용', '최치원'], ['소크라테스', '플라톤', '아리스토텔레스'],
  ['세네카', '마르쿠스 아우렐리우스', '에픽테토스'], ['간디', '링컨', '프레더릭 더글러스']
];
const thinkers = THINKER_POOL[Math.floor(Date.now() / 604800000) % THINKER_POOL.length];

// ── 지난주 채널 성과: 훅 가이드와 피할 것만 쓴다 ──
// (기둥 비율은 시청 지속률 기준이라 표본이 작은 영상에 끌려간다 → 조회수 목표에는 위의 수요 기반 비율을 쓴다)
let feedback = '';
try {
  const rows = $('Read Latest Insights').all().map(function (i) { return i.json; }).filter(function (r) { return r && r.Date; });
  if (rows.length) {
    const last = rows[rows.length - 1];
    let avoid = '';
    try { avoid = JSON.parse(last.Raw || '{}').avoid || ''; } catch (e) {}
    feedback = 'OUR CHANNEL - last analytics run (' + last.Date + '):\n' +
      '- Working on our channel: ' + (last.TopPattern || 'n/a') + '\n' +
      '- Not working: ' + (last.WeakPattern || 'n/a') + '\n' +
      (avoid ? '- Avoid: ' + avoid + '\n' : '') +
      'Use this to judge execution quality on OUR channel, but do NOT use its pillar mix - the pillar counts below are already set for views.';
  }
} catch (e) { console.log('Insights 탭을 읽지 못함'); }

const pillarLines = Object.keys(mix).filter(function (k) { return mix[k] > 0; }).map(function (k) { return '- ' + k + ' x' + mix[k] + ': ' + PILLAR_DESC[k]; }).join('\n');

const prompt = `You are the content strategist for NextYou Global, a Korean YouTube Shorts channel (faith, life wisdom, health science, psychology, money and the economy). The goal of this batch is VIEWS: pick subjects Korean Shorts viewers are already watching in large numbers, and frame each so it stops a scrolling thumb.

Generate exactly ${TOTAL} new Shorts topics and ${LONG_TOTAL} long-form topics (section below), all in Korean. Shorts pillar counts (exactly):
${pillarLines}

=== MARKET DATA - Korean YouTube Shorts from the last 3 weeks ===
${demandInfo.report || '(no demand data this week)'}

How to use the market data:
1. SUBJECT: choose subjects the data shows people watch - everyday situations, relationships, aging, money, the body. A proven subject with a fresh angle beats a clever subject nobody searches for.
2. SMALL-CHANNEL BREAKOUTS are the strongest signal: those videos won on topic and hook, not on channel size. Learn what made them work.
3. HOOK SHAPE: copy the SHAPES that dominate the top titles (the percentages above), never the wording. Use at least 5 different shapes across the ${TOTAL} topics and no shape in more than ${Math.ceil(TOTAL / 4)} topics. The paradox shape (~할수록 오히려, 역설, 사실은 ~였다) has been overused on our channel: at most 2 topics may use it, counting title AND angle - do not write the word 역설 in an angle. Extra paradox topics are discarded automatically, so spend them on other shapes.
4. SPECIFIC VIEWER: name who it is for when it helps - an age (40대, 50대 이후), a situation (퇴근 후, 잠들기 전), a relationship (부모님, 직장 동료).
5. Never copy or lightly reword a title from the data. Treat the data as what people watch, not as fact - never repeat a dubious health claim or a misattributed quote.

${feedback}

=== TOPIC RULES ===
- title: the hook as the viewer would see it. 12 to 28 Korean characters. Concrete and immediately understandable, with the searchable keyword early. No em dash, no subtitle, no hashtags.
- angle: one short line (max 40 characters) telling the scriptwriter the specific take, the person or mechanism, or the turn.
- reference: Bible pillar only - a real reference that genuinely contains the theme (e.g. 이사야 41:10). Empty for other pillars.
- Must be specific enough for a 45-second script, and the hook must be honest: the script has to deliver what the title promises.
- wisdom pillar: if a topic is built on a thinker, use one from this week's list (${thinkers.join(', ')}) or another thinker not already in the existing topics; never attribute a quote or a school to someone wrongly. A topic does not need a thinker - life advice framed for a specific viewer is often stronger.
- health pillar: evidence-based and general. No medical advice, no dosages, no fear-mongering claims the science does not support. Never recipes or cooking.
- money pillar: general financial literacy, not advice. Never name a specific stock, coin, fund or product to buy, never promise returns or predict markets, no get-rich-quick or 무조건 오른다 framing. Numbers must be standard and checkable (복리 계산, 72의 법칙, 물가상승률의 의미). Economy topics explain a concept through everyday life, not today's headlines.
- No politics, no real living public figures in the title.
- MUST NOT duplicate or closely resemble any existing topic:
${existing}

=== LONG-FORM TOPICS (8 to 10 minute videos) ===
Also generate exactly ${LONG_TOTAL} long-form topics: one money pillar, and one from wisdom, health or psychology. Each long-form video is then cut into two Shorts, so it must contain at least two strong standalone points.
- Use the same market data: pick a subject Korean viewers already watch, then go deeper than a Short can.
- Practical and step-by-step: a method, a routine, a decision, a comparison or a mechanism the viewer can apply - concrete actions, times, numbers and settings.
- long title: 15 to 32 Korean characters, the searchable keyword first, honest. angle: max 60 characters on what the video covers and its structure (e.g. 3단계, 시간표, 체크리스트).
- Same honesty rules as the Shorts (health: general and evidence-based; money: literacy, not advice).
- Must not duplicate or closely resemble any existing long-form topic or Shorts topic:
${existingLong}

=== OUTPUT (JSON only) ===
The first character must be the opening brace and the last the closing brace. No prose, no code fences, no straight double-quote characters inside strings.
shape is one of: number_list, age_target, warning, reason, people, paradox, question, story.
evidence names the market-data title or pattern that this topic leans on (short).
{"topics": [{"pillar": "bible|wisdom|health|psychology|money", "title": "...", "angle": "...", "reference": "", "shape": "...", "evidence": "..."}], "longform": [{"pillar": "money|wisdom|health|psychology", "title": "...", "angle": "...", "evidence": "..."}]}`;

console.log('수요 ' + JSON.stringify(demand) + ' → 배정 ' + mixText + ' | 사상가 ' + thinkers.join(', '));
return [{ json: {
  mix: mix,
  body: {
    model: 'claude-sonnet-4-6',
    max_tokens: 8000,
    temperature: 1,
    system: 'You are a JSON-only API. You return a single valid JSON object and nothing else.',
    messages: [{ role: 'user', content: prompt }]
  }
} }];
