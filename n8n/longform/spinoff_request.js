// 업로드한 롱폼에서 쇼츠 2편을 뽑는다: 서로 다른 챕터의 가장 강한 핵심 하나씩 → 45초 훅 쇼츠 주제 + 핵심 요약(Brief)
// 쇼츠 워크플로우가 이 Brief를 대본의 근거로 쓰고, 설명란 맨 위에 롱폼 링크를 단다.
const SPINOFFS = 2;
const p = $('Parse Longform Script').first().json;
const url = 'https://youtube.com/watch?v=' + $('YouTube Upload').first().json.uploadId;
// 챕터별 나레이션 (너무 길면 챕터마다 앞부분만)
const byCh = p.chapters.map(function (c, i) {
  const text = p.scenes.filter(function (s) { return s.chapter === i; }).map(function (s) { return s.narration; }).join(' ');
  return '## ' + (i + 1) + '. ' + c.title + '\n' + text.slice(0, 1400);
}).join('\n\n');
let existing = '';
try { existing = $('Read Topic Sheet').all().map(function (i) { return i.json.Topic; }).filter(Boolean).slice(-80).join('\n'); } catch (e) { /* 없음 */ }

const prompt = `You plan YouTube Shorts for NextYou Global, a Korean channel. We just published this long-form video and want ${SPINOFFS} Shorts cut from it. Each Short is a separate 45-second video with its own hook that makes the viewer want the full video.

Long-form title: ${p.title}
Category: ${p.category}

Script by chapter:
${byCh}

Pick ${SPINOFFS} standalone points, each from a DIFFERENT body chapter (not the hook, not the closing recap): the most surprising fact, the clearest number, or the most useful method. For each Short:
- title: the hook as the viewer would see it, 12 to 28 Korean characters, concrete, searchable keyword early, no em dash, no hashtags. It must not copy the long-form title.
- angle: one short line (max 40 characters) on the specific take.
- brief: 3 to 5 key facts, steps or numbers taken ONLY from the script above, in Korean, max 350 characters total, separated by ' / '. The Short's scriptwriter will use only these, so they must be accurate and complete enough for a 45-second Short.
- chapter: the chapter number it comes from.
Do not resemble these existing Shorts topics:
${existing || '(none)'}

Respond ONLY with JSON, first character the opening brace, no straight double-quote characters inside strings:
{"shorts":[{"title":"...","angle":"...","brief":"...","chapter":2}]}`;

return [{ json: {
  body: { model: 'claude-sonnet-4-6', max_tokens: 2500, system: 'You are a JSON-only API. You return a single valid JSON object and nothing else.', messages: [{ role: 'user', content: prompt }] },
  longUrl: url, longTitle: p.title
} }];
