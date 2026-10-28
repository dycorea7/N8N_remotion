// 장면 벤치마크 1/2: 50만+ 영상을 Gemini가 직접 보고 장면 구성(컷 길이·화면 글자·그림/그래픽 비율·훅 연출·전개)을 분석하게 한다
//  - 공개 유튜브 URL을 Gemini에 그대로 넘긴다 (영상 다운로드 없음)
//  - 문장·대사는 옮기지 않고 '구조'만 받는다 (우리 대본은 항상 새로 쓴다)
// ===== 설정 =====
const PICK_NODE = 'Benchmark Pick';   // 50만+ 영상을 고른 노드
const MODE = 'short';                 // 'short' | 'long'
const MAX_VIDEOS = MODE === 'long' ? 1 : 2;
// 혼잡(503)이면 다음 모델로 넘어간다 (Gemini - Scene Analysis Retry 노드가 fallbackUrl을 쓴다)
const MODEL = 'gemini-3.5-flash';
const FALLBACK_MODEL = 'gemini-3.8-flash';
// ================
let vids = [];
try { vids = $(PICK_NODE).all().map(i => i.json).filter(v => v && v.videoId && !v.skip && v.videoId !== 'none'); } catch (e) {}
// 롱폼은 주제를 고른 기준 영상(REFERENCE)이 있으면 그것부터
vids = vids.sort((a, b) => (b.ref ? 1 : 0) - (a.ref ? 1 : 0)).slice(0, MAX_VIDEOS);
if (!vids.length) return [{ json: { skip: true } }];
// 롱폼은 통째로 보내면 혼잡(503)으로 자주 실패한다 → 앞 6분(훅·도입·첫 본론)만 초당 0.5프레임으로 본다. 전체 흐름은 설명란 챕터로 이미 알고 있다
const CLIP = MODE === 'long' ? { videoMetadata: { startOffset: '0s', endOffset: '360s', fps: 0.5 } } : {};
const prompt = `Watch this YouTube ${MODE === 'long' ? 'long-form video' : 'Short'} (it has over 500,000 views)${MODE === 'long' ? ' - you see its first 6 minutes' : ''} and analyse HOW it is built visually and structurally, so that a faceless motion-graphics channel can learn its scene composition. Describe structure only: never transcribe sentences; quote at most 3 words at a time.

Return JSON only, no code fences:
{"format": "one line: talking head / faceless voice-over with b-roll / motion graphics / text-on-screen slideshow / animation / mixed",
"hook": {"seconds": "how long the hook lasts", "visual": "what is on screen in the first 3 seconds", "text_on_screen": "how the opening text looks (size, position, colour, how many words)", "device": "the hook technique (question, shocking number, warning, contrast, visual surprise...)"},
"pacing": {"avg_shot_seconds": number, "cuts_per_minute": number, "narration_speed": "slow / medium / fast"},
"visual_mix": {"presenter_on_camera": percent, "photos_or_footage": percent, "motion_graphics_or_animation": percent, "text_cards": percent, "numbers_charts_diagrams": percent},
"on_screen_text": "how text is used through the video: subtitles style, keyword pop-ups, highlight colours, frequency",
"segments": [{"start": "m:ss", "end": "m:ss", "role": "hook / problem / explanation / example / proof / step / twist / recap / cta", "visual": "what the viewer sees", "text": "kind of on-screen text (not verbatim)", "why_it_works": "short"}],
"retention_devices": ["concrete techniques that keep people watching: open loops, numbered steps, pattern interrupts, zooms, sound effects..."],
"audio": "voice tone, music mood, sound effects",
"ending": "how it ends (loop, CTA, punchline, question)",
"lessons": ["4 to 6 concrete, structural things we can apply in our own videos, e.g. a number on screen within the first 2 seconds"]}
${MODE === 'long' ? 'Segments: one per beat of those 6 minutes, at most 14; pacing and visual mix for that part.' : 'Segments: every distinct beat, at most 12.'} Write every value in English.`;
return vids.map(v => ({ json: {
  skip: false, videoId: v.videoId, title: v.title, views: v.views,
  url: 'https://generativelanguage.googleapis.com/v1beta/models/' + MODEL + ':generateContent',
  fallbackUrl: 'https://generativelanguage.googleapis.com/v1beta/models/' + FALLBACK_MODEL + ':generateContent',
  body: {
    contents: [{ role: 'user', parts: [Object.assign({ fileData: { fileUri: 'https://www.youtube.com/watch?v=' + v.videoId } }, CLIP), { text: prompt }] }],
    generationConfig: { responseMimeType: 'application/json', temperature: 0.3, maxOutputTokens: 6000, mediaResolution: MODE === 'long' ? 'MEDIA_RESOLUTION_LOW' : 'MEDIA_RESOLUTION_MEDIUM' }
  }
} }));
