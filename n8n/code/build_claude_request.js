// ===== 설정 =====
const USE_AI_IMAGES = true;   // false면 이미지 없이 모션 그래픽만
const MAX_IMAGES = 6;         // 영상 한 편 AI 그림 최대 개수: 이미지 장면 + 그래픽 뒤 사진 배경(bg) 합계 (fal.ai 비용)
// ================

const topic = $json.Topic;
const language = $json.Language || 'Korean';
const isKorean = String(language).trim().toLowerCase() === 'korean';

const lengthRule = isKorean
  ? 'The full narration (all scene narrations together) must be between 270 and 350 Korean characters including spaces (~45 seconds spoken). Under 270 is too thin; over 350 is a failure.'
  : 'The full narration (all scene narrations together) must be between 115 and 150 English words (~45 seconds spoken). Under 115 is too thin; over 150 is a failure.';

const seed = Math.floor(Date.now() / 86400000) + (Number($json.row_number) || 0);

const SERMON_SHAPES = [
  'THE PROMISE - open by stating the promise itself as a flat fact, then show what it costs to believe it. Scripture appears early.',
  'THE QUESTION - open with a question the listener has actually asked God in private. Let the scripture answer only partly.',
  'THE SCENE - open by describing one very ordinary moment: a commute, a kitchen at night, a phone that does not ring. Let the passage speak into that scene.',
  'THE OBJECTION - open by naming the doubt out loud, that the verse can sound hollow when things are this hard. Take it seriously before the passage answers.',
  'THE PERSON - open with the biblical figure in the passage and what was happening to them, then turn to the listener late.',
  'THE INVERSION - open with what the passage does NOT say, correcting a common misreading, then give what it does say.',
  'THE SINGLE WORD - pick one word in the verse and turn it over: what it meant, what it did not mean, what it means now.'
];
const PHILOSOPHY_FORMAT = 'PHILOSOPHY IN PRACTICE - four beats in this exact order. (1) QUOTE: open with the quote itself and name the thinker. (2) PROOF: immediately tell what ONE real person actually did that embodies the idea. (3) MEANING: only now explain what the idea claims, and name one thing it does NOT mean. (4) CARRY: one line the viewer can use tomorrow.';
const ESSAY_FORMATS = [
  'EXPLAINER - explain one mechanism plainly: what actually happens, and why. One concrete everyday analogy. End with what it means tomorrow morning.',
  'MYTH BUSTER - state the belief almost everyone holds, show precisely where it breaks, give what is actually true.',
  'NUMBERED METHOD - three concrete steps or signs, numbered aloud, with a line of substance each. No preamble.',
  'CASE STUDY - tell what happened to ONE real person in sequence, with real detail. Do not state the lesson until the final lines.',
  'COMPARISON - hold two things side by side that people confuse and separate them cleanly.',
  'CAUTIONARY - name a cost that compounds quietly over years, show the arithmetic, name the one decision that changes it.',
  'QUOTE ESSAY - open with one short quote, name the thinker and the claim, bring in a real person whose life illustrates it, close with a two-line aphorism.',
  PHILOSOPHY_FORMAT
];
const CLOSINGS = [
  'end on a single short sentence under eight words',
  'end by returning to the opening line, changed by what came between',
  'end with a question left open',
  'end with one concrete action small enough to do today',
  'end on a contrast between what was feared and what is true'
];
const sermonShape = SERMON_SHAPES[seed % SERMON_SHAPES.length];
let essayFormat = ESSAY_FORMATS[(seed + 3) % ESSAY_FORMATS.length];
const closing = CLOSINGS[(seed + 5) % CLOSINGS.length];
const PHILOSOPHY_HINT = /철학|명언|사상|노자|장자|공자|맹자|도덕경|소크라테스|플라톤|아리스토텔레스|스토아|에픽테토스|세네카|아우렐리우스|니체|쇼펜하우어|칸트|사르트르|카뮈|philosophy|philosopher|stoic|stoicism|laozi|lao tzu|taoism|confucius|nietzsche|socrates|aurelius|seneca|epictetus/i;
if (PHILOSOPHY_HINT.test(String(topic))) essayFormat = PHILOSOPHY_FORMAT;

const IMAGE_TYPE = USE_AI_IMAGES ? `
- image: {"type":"image","prompt":"English image prompt, under 30 words","text":"optional short overlay keyword, max 12 Korean chars / 4 English words","highlight":["word from text"]}  - a full-screen AI illustration (with slow zoom) behind the captions. Use it for 2 to 4 scenes where a concrete moment, place or object makes the viewer feel the script - the hook scene is a good candidate. Never for numbers, lists or comparisons (use a graphic with bg for those).
  Image prompt rules: describe only the CONTENT of the scene (the art style is added automatically per category); always give time of day, weather and light; at most one person, written as an adult figure with no age, gender, nationality or ethnicity; never children or minors; ordinary modest clothing, nothing suggestive; never a real identifiable person (when the script names someone, show their world instead - a workshop, a desk, a road); no text, letters or logos in the image; no religious icons of specific figures. Consecutive image scenes must differ in place and distance.\n- bg (optional field on ANY non-image scene: headline, stat, chart, list, checklist, compare, timeline, icon, iconGrid, quote, scripture, outro): "bg":"English image prompt, under 30 words" puts an AI photo behind that scene's motion graphic, so the viewer sees the picture and the graphic together (the number over the kitchen table, the checklist over the morning street). Same prompt rules as image. Use it on 1 to 3 graphic scenes whose idea has a concrete place or object.` : '';
const IMAGE_RULE = USE_AI_IMAGES ? `\n- PACING: the video is a flow of pictures with motion graphics woven in between. About half of the scenes show a picture (an image scene, or a graphic with bg); never more than two scenes in a row without a picture; never three image scenes in a row.\n- At most ${MAX_IMAGES} pictures in total (image scenes + bg fields together).` : '';

// 롱폼에서 파생된 쇼츠: 롱폼 대본에서 뽑은 핵심(Brief)을 근거로 쓰고, 끝에서 전체 영상으로 이끈다
const brief = String($json.Brief || '').trim();
const longUrl = String($json.LongURL || '').trim();
const SPINOFF = brief ? `\n=== SOURCE: THIS SHORT IS CUT FROM OUR LONG-FORM VIDEO ===\nKey points from the long-form script (use these as the factual backbone; do not contradict them, and add nothing you are unsure of):\n${brief}\nThe Short must stand on its own with its own hook. In the last scene, invite the viewer to the full video in one short natural line (Korean e.g. 전체 영상에서 나머지 방법까지 확인하세요). The link is added to the description automatically - never write a URL.\n` : '';
const prompt = `You are the scriptwriter AND motion designer for NextYou Global, a YouTube Shorts channel covering Bible devotionals, motivation, wealth mindset and self-improvement.
The video is animated motion graphics (kinetic type, counters, charts, cards) over an animated gradient${USE_AI_IMAGES ? ', plus a few full-screen AI illustrations' : ''}, with word-by-word narration captions in the lower third. You write the narration and design every scene.

Topic: ${topic}
Language: ${language}${SPINOFF}
Write everything viewers see or hear - narration, on-screen text, title, description, hashtags - in ${language}.

=== LENGTH (hard rule) ===
${lengthRule}
Earn the length with SPECIFICS (a concrete scene, a real number, a counter-argument), never with restatement.

=== THE FIRST TWO SECONDS DECIDE EVERYTHING ===
The first narration line must be under 12 words, open mid-tension or mid-claim, and create an information gap.
BANNED openings: 지금 마음이 힘드신가요, 힘드신가요, 지치셨나요, 사랑하는 여러분, 오늘도 수고하셨습니다, 혹시 〇〇한 적 있나요, Are you struggling, Have you ever, Let me tell you, In this video.

=== STEP 1: CLASSIFY ===
format: sermon or essay. category: EXACTLY ONE of bible, quote, wealth, health, other.

=== STEP 2: WRITE ===
FORMAT A - SERMON (Bible passages, faith, prayer). ASSIGNED STRUCTURE: ${sermonShape}
Quote scripture accurately (Korean: 개역개정 wording), name the reference, warm 합니다 register, concrete about one real worry, final scene ends with 아멘. or Amen. No psychology, science, studies or secular figures. Never invent or paraphrase a verse.

FORMAT B - NON-SCRIPTURAL. ASSIGNED FORMAT: ${essayFormat}
Only quotes genuinely and widely attributed. Facts and figures accurate and mainstream; omit anything uncertain. Health: evidence-based and general, no medical advice or dosages. Never claim a person followed a philosophy unless well documented.

For the ending: ${closing}.

=== STEP 3: SCENES (this is the motion design) ===
Split the narration into 8 to 11 scenes, in order. Each scene = { "narration": the exact words spoken during it (one or two sentences), "visual": what is on screen }.
Joining every narration with a line break must give the complete script - nothing spoken outside scenes. Narration is spoken text only: no stage directions, no emoji, no brackets.
Each scene lasts while its narration is spoken (about 3-6 seconds), so the visual must be readable at a glance.

The narration already appears as captions, so on-screen text must NOT repeat the narration. It is the headline a designer would pull out: the key phrase, number, or contrast, short and punchy.

Visual types and fields (use ONLY these):
- headline: {"type":"headline","text":"key phrase, max 18 Korean chars / 7 English words","highlight":["1-2 words from text to colour"],"emoji":"optional single emoji"}
- stat: {"type":"stat","label":"what the number is, max 16 chars","value":number,"prefix":"optional e.g. $ or ₩","suffix":"unit e.g. %, 억 원, 시간, 배","decimals":0,"sub":"assumption or source, max 24 chars"}  - the counter animates up when the narration says the number.
- chart: {"type":"chart","title":"max 18 chars","unit":"shared unit","items":[{"label":"max 6 chars","value":number}]}  - 2 to 4 comparable bars; each bar grows when its label is spoken, so use labels that appear in the narration.
- list: {"type":"list","title":"max 16 chars","items":["2 to 4 items, max 12 Korean chars / 4 English words each"]}  - each item appears as it is spoken; items should echo words in the narration.
- compare: {"type":"compare","title":"max 16 chars","left":{"label":"the wrong/common side","text":"max 16 chars"},"right":{"label":"the better side","text":"max 16 chars"}}
- quote: {"type":"quote","text":"the quote, max 40 chars","author":"name"}  - only real, accurately attributed quotes.
- scripture: {"type":"scripture","text":"verse wording, max 60 chars","author":"reference e.g. 이사야 41:10"}  - sermon only.
- icon: {"type":"icon","emoji":"one emoji","text":"max 14 chars"}
- timeline: {"type":"timeline","title":"max 16 chars","items":[{"label":"step or year, max 8 chars","text":"max 14 Korean chars / 5 English words"}]}  - 2 to 4 ordered stages or years; each appears as it is spoken.
- checklist: {"type":"checklist","title":"max 16 chars","items":["2 to 4 concrete actions, max 12 Korean chars each"]}  - things the viewer should do; each gets ticked as it is spoken.
- iconGrid: {"type":"iconGrid","title":"max 16 chars","items":[{"emoji":"one common emoji","label":"max 8 Korean chars"}]}  - 2 to 4 parallel ideas side by side.
(Emoji are drawn as clean line icons, so pick a common, literal emoji: 💰 ⏰ 🧠 ❤️ 📖 🙏 🎯 💡 ✅ ⚠️ 🌙 🏃 🍎 🤝 📈.)
- outro: {"type":"outro","text":"closing line, max 16 chars","highlight":["word"],"cta":"short subscribe call, e.g. 구독하고 같이 성장해요 or Follow for more"}${IMAGE_TYPE}

Design rules:
- Scene 1 is the hook: headline (or stat if the hook is a number). The last scene is always outro.
- Never use the same type twice in a row. Essays use at least 4 different types; prefer timeline / checklist / iconGrid over a plain list when they fit.${IMAGE_RULE}
- Numbers on screen must match exactly what the narration says. Never invent a number for a stat or chart; if the script has no real numbers, use headline, list, compare, icon instead.
- SERMON: use scripture for the verse, otherwise headline, icon, quote-free cards; never stat or chart.
- highlight words must literally appear in that scene's text.
- Never use the straight double-quote character inside any value; use “ ” or 「 」.

=== STEP 4: SEO ===
title: under 90 characters, hook front-loaded; include the scripture reference for sermons.
description: two or three lines on the question the video answers; three lines starting with ✔ naming situations the viewer might be in; one line on what they gain; channel line (Korean: 📌 Next You Global 채널은 성경 말씀, 동기부여, 부자 마인드셋, 자기계발 쇼츠를 업로드합니다. English: 📌 Next You Global posts Bible devotionals, motivation, wealth mindset and self-improvement shorts.); subscribe line (Korean: 👉 구독 & 좋아요로 함께 성장해요! English: 👉 Subscribe and like to grow with us!).
hashtags: 12 to 16, specific first, then broad, then #NextYouGlobal.

=== VISUAL STYLE ===
style: EXACTLY ONE of hud, classic, pop, keynote, either - which motion-graphics look suits this topic.
- hud: a sharp, modern editorial look (camera tracking boxes, spec-sheet and tag cards, split-flap numbers, black and white with one orange accent). Fits the mind and brain, psychology, how things really work, modern life, technology, data-driven health facts, sharp contrarian takes.
- classic: soft gradients, rounded cards, warm colours. Fits emotional, warm or comforting topics - family and parents, love, grief, gratitude, loneliness, aging gracefully, faith and prayer.
- pop: loud, playful colour blocks (orange, lime, electric blue), giant bouncing type, morphing shapes, bright patterns. Fits energetic, upbeat topics - habits and routines, motivation, productivity, quick tips and hacks, numbered methods, fun facts.
- keynote: a clean Apple-keynote launch-film look (warm off-white canvas, black UI, liquid-glass panels over photos, a cursor that clicks toggles, drags sliders and opens pages, smooth zooms). Fits practical, step-by-step and how-to topics - methods and routines to try, smart everyday choices, comparisons and decisions, clear health or money explainers, anything that feels like a calm, premium product demo.
- either: two or more would work equally well.
Sermons and faith topics are always classic.

=== MUSIC ===
mood: EXACTLY ONE of calm_reflective, hopeful_uplifting, tense_dramatic, dark_serious, warm_gentle.

Respond ONLY with valid JSON, no markdown fences:
{"title":"...","description":"...","hashtags":["#tag"],"format":"sermon or essay","category":"bible|quote|wealth|health|other","mood":"...","style":"hud|classic|pop|keynote|either","scenes":[{"narration":"...","visual":{"type":"headline","text":"...","highlight":["..."],"emoji":"..."}}]}`;

console.log('seed ' + seed + ' | sermon: ' + sermonShape.split(' - ')[0] + ' | essay: ' + essayFormat.split(' - ')[0]);
return [{ json: { body: { model: 'claude-sonnet-4-6', max_tokens: 4000, messages: [{ role: 'user', content: prompt }] }, Topic: topic, Language: language, row_number: $json.row_number, useImages: USE_AI_IMAGES, maxImages: MAX_IMAGES, LongURL: longUrl, Source: String($json.Source || '') } }];
