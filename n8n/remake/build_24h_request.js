// 24시간 점검 2/3: 방금 비공개한 쇼츠마다 같은 주제의 인기 쇼츠(조회수)를 붙여 Claude에게 원인 분석 + 새 주제를 요청한다
// 부진한 영상은 전부 다시 만든다 (이미 리메이크본인 것과 채널에 맞지 않는 주제만 제외)
const cands = $('Pick Remake Candidates').all().map(i => i.json);
const REMAKES_PER_RUN = cands.filter(c => c.remakeOk).length;
const stats = $('Bench Stats').all().map(i => i.json);
const fmtV = n => n >= 10000 ? Math.round(n / 10000) + '만' : String(n);
const OWN = /next\s*you/i;
let existing = [];
// 후보 자신의 옛 주제는 중복 목록에서 뺀다 (같은 주제를 새 훅으로 다시 만드는 것이 목적)
const own = new Set(cands.map(c => c.oldTopic).filter(Boolean));
try { existing = $('Read Topic Sheet').all().map(i => i.json.Topic).filter(t => t && !own.has(t)).slice(-120); } catch (e) {}
const blocks = cands.map((c, i) => {
  const top = ((stats[i] || {}).items || []).map(v => ({ t: String((v.snippet || {}).title || '').replace(/#[^\s#]+/g, '').trim(), ch: (v.snippet || {}).channelTitle || '', views: Number((v.statistics || {}).viewCount || 0) }))
    .filter(v => /[가-힣]/.test(v.t) && !OWN.test(v.ch)).sort((a, b) => b.views - a.views).slice(0, 6);
  return '[' + c.label + '] old title: ' + c.title + '\n' +
    (c.remakeOk ? '' : '  NOTE: this video is already a remake of an earlier flop. Set remake=false for it.\n') +
    (c.oldTopic ? '  old topic/angle in our sheet: ' + c.oldTopic + '\n' : '') +
    '  result: ' + c.views + ' views, ' + c.likes + ' likes, ' + c.sec + 's long, published ' + String(c.published).slice(0, 10) + ' (' + c.ageDays + ' days ago)\n' +
    '  popular Korean Shorts for the search 「' + c.q + '」: ' + (top.length ? top.map(v => v.t.slice(0, 50) + ' (' + fmtV(v.views) + ')').join(' / ') : '(none found)');
}).join('\n');
const n = Math.min(REMAKES_PER_RUN, cands.length);
const prompt = `You are the content strategist for NextYou Global, a Korean YouTube Shorts channel (life wisdom, psychology, health science, money and the economy). These Shorts of ours got under 100 views in their first 24 hours, so the YouTube Shorts feed stopped testing them, and we just made them private. Each one will be remade TOMORROW as a new, better Short in Korean; plan each remake so it actually gets views.

=== OUR FLOPPED SHORTS ===
${blocks}

=== YOUR JOB ===
1. For EVERY candidate give a short diagnosis in Korean (max 80 characters) of the most likely reason it flopped. Typical reasons: an English title on a Korean channel, an abstract or literary hook with no clear payoff, a title over 30 characters, the overused paradox shape (~할수록 오히려), a subject Korean Shorts viewers do not search for, a famous-name title with no benefit to the viewer, a dated or off-brand subject.
An English title is a reason the video flopped, NOT a reason to skip it: judge the SUBJECT, because every remake is written in Korean. For English titles the popular-Shorts search ran in English, so (none found) there says nothing about Korean demand - use your knowledge of the Korean Shorts market instead.
2. Remake every candidate (up to ${n}) except: ones marked NOTE above, off-brand subjects (sci-fi, cars, dating tips, pets, hymns, random clips) and faith topics. Mark those remake=false with the reason. If a subject has weak demand, keep the subject area but pick the angle the popular Shorts for its search prove viewers want.
3. For each remake, write TWO title options with different hook shapes. Same subject area, but a new hook that a scrolling Korean viewer stops for: concrete, immediately understandable, keyword early, a clear payoff (what the viewer gets), and name the viewer when it helps (40대, 퇴근 후, 부모님). Learn the SHAPE of the popular titles above, never copy or lightly reword them. The old hook failed, so each option must be a genuinely different hook - a different promise and wording, not the old sentence with a few words swapped (bad: 잘못도 없이 계속 사과하는 사람이 조용히 잃어가는 것 → 잘못 없이 사과하는 사람이 조용히 잃는 능력). Do not use the paradox shape.
4. fix: one line in Korean (max 120 characters) telling the scriptwriter what to do differently from the failed video (e.g. 첫 장면에 숫자로 결론부터, 철학자 이름 대신 시청자 상황으로 시작).

=== TOPIC RULES ===
- title: 12 to 28 Korean characters, no em dash, no hashtags. angle: max 40 characters (the specific take or mechanism).
- health: evidence-based and general, no medical advice, no dosages, no fear-mongering. money: literacy not advice, never a specific stock, coin, fund or product, no promised returns. wisdom: never attribute a quote or idea to someone wrongly; a thinker is optional.
- Must not duplicate any existing topic:
${existing.join('\n') || '(none)'}

=== OUTPUT (JSON only) ===
First character the opening brace, last the closing brace, no code fences, no straight double-quote characters inside strings.
{"decisions": [{"id": "C1", "remake": true, "diagnosis": "...", "reason": "why remake or skip, max 40 chars", "pillar": "wisdom|health|psychology|money", "titles": ["option 1", "option 2"], "angle": "...", "fix": "...", "shape": "number_list|age_target|warning|reason|people|question|story"}]}
Include every candidate (${cands.map(c => c.label).join(', ')}); for remake=false leave titles empty and angle and fix empty.`;
return [{ json: { remakesPerRun: n, body: { model: 'claude-sonnet-4-6', max_tokens: 3000, temperature: 0.8, system: 'You are a JSON-only API. You return a single valid JSON object and nothing else.', messages: [{ role: 'user', content: prompt }] } } }];
