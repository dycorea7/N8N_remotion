// ===== 설정 =====
const MAX_IMAGES = 14;          // 영상 한 편 AI 이미지 장면 최대 개수 (+ 썸네일 1장)
const TARGET_KO = [3400, 4000]; // 한국어 나레이션 글자 수 (공백 포함) ≈ 8~9.5분
const TARGET_EN = [1350, 1600]; // 영어 단어 수
// ================

const topic = $json.Topic;
const language = $json.Language || 'Korean';
const isKorean = String(language).trim().toLowerCase() === 'korean';
const lengthRule = isKorean
  ? `The full narration (all scenes together) must be between ${TARGET_KO[0]} and ${TARGET_KO[1]} Korean characters including spaces (8 to 9.5 minutes spoken). This is a hard rule: count as you go. Under ${TARGET_KO[0]} is a failure.`
  : `The full narration (all scenes together) must be between ${TARGET_EN[0]} and ${TARGET_EN[1]} English words (8 to 9.5 minutes spoken). Under ${TARGET_EN[0]} is a failure.`;

const prompt = `You are the scriptwriter AND motion designer for NextYou Global, a YouTube channel covering Bible devotionals, life wisdom, psychology, health science and money. One of our Shorts did well, and you are turning its topic into an 8 to 10 minute long-form video (16:9) that goes far deeper than the Short could.

Source Short topic: ${topic}
Short title on YouTube: ${$json.shortTitle || ''} (${$json.shortViews || 0} views)
Language: ${language}. Write everything viewers see or hear in ${language}.

=== LENGTH (hard rule) ===
${lengthRule}
Earn the length with substance: concrete scenes, real examples, mechanisms, counter-arguments, a practical method. Never pad, never restate a point you already made.

=== STRUCTURE ===
5 to 7 chapters, in order:
1. HOOK (30 to 45 seconds): open mid-tension with the most surprising claim or scene, then promise exactly what the viewer will walk away with. No greeting, no channel intro. BANNED openings: 안녕하세요, 여러분, 오늘은 ~에 대해, 지금 마음이 힘드신가요, Hello everyone, In this video.
2. Body chapters (3 to 5): each answers one question the viewer would ask next. Each opens with a fresh mini-hook, contains at least one concrete example (a person, a scene, a number, a study or a passage), and ends with a one-line takeaway that pulls into the next chapter (an open loop).
3. CLOSING chapter: recap the 3 key points in one breath each, give one action small enough to do today, then ask viewers one specific question to answer in the comments, then a natural subscribe line.
Chapter titles: max 18 Korean characters / 6 English words, plain and searchable (these become YouTube chapters).

=== CONTENT RULES BY TYPE ===
- If the topic is a Bible passage or faith theme: sermon-style. Quote scripture accurately (Korean: 개역개정 wording) with the reference, warm 합니다 register, bring in the biblical person and context, no psychology studies or secular figures, end with a short prayer line and 아멘. Never invent or paraphrase a verse and call it scripture.
- Wisdom / psychology: only quotes that are genuinely and widely attributed; never claim a person followed a philosophy unless well documented. Name studies only if you are sure they exist; otherwise describe the finding generally.
- Health: evidence-based and general, no medical advice, no dosages, add one line that people with conditions should talk to their doctor.
- Money / economy: financial literacy, not advice. Never name a stock, coin, fund or product to buy, never promise returns or predict markets. Use standard checkable math (compound interest, rule of 72, inflation).

=== SCENES (motion design) ===
Split each chapter into 8 to 14 scenes. Each scene = { "narration": the exact words spoken (one or two sentences, about 40 to 80 Korean characters), "visual": what is on screen }. Narration is spoken text only: no stage directions, emoji or brackets. Joining all narrations in order must give the complete script.
The narration already appears as captions, so on-screen text must NOT repeat it: pull out the key phrase, number or contrast.

Visual types (use ONLY these):
- chapter: {"type":"chapter","title":"chapter title","number":2} - REQUIRED as the visual of the FIRST scene of every chapter except chapter 1. Its narration is the chapter's opening line.
- headline: {"type":"headline","text":"key phrase, max 18 Korean chars / 7 English words","highlight":["1-2 words from text"],"emoji":"optional single emoji"}
- stat: {"type":"stat","label":"max 16 chars","value":number,"prefix":"optional","suffix":"unit","decimals":0,"sub":"assumption or source, max 24 chars"} - only real numbers that the narration says.
- chart: {"type":"chart","title":"max 18 chars","unit":"shared unit","items":[{"label":"max 6 chars","value":number}]} - 2 to 4 bars, labels spoken in the narration.
- list: {"type":"list","title":"max 16 chars","items":["2 to 4 items, max 12 Korean chars each"]}
- compare: {"type":"compare","title":"max 16 chars","left":{"label":"the common/wrong side","text":"max 16 chars"},"right":{"label":"the better side","text":"max 16 chars"}}
- quote: {"type":"quote","text":"max 40 chars","author":"name"} - real quotes only.
- scripture: {"type":"scripture","text":"verse wording, max 60 chars","author":"reference e.g. 이사야 41:10"} - sermon only.
- icon: {"type":"icon","emoji":"one emoji","text":"max 14 chars"}
- timeline: {"type":"timeline","title":"max 16 chars","items":[{"label":"step or year, max 8 chars","text":"max 14 Korean chars / 5 English words"}]}  - 2 to 4 ordered stages or years; each appears as it is spoken.
- checklist: {"type":"checklist","title":"max 16 chars","items":["2 to 4 concrete actions, max 12 Korean chars each"]}  - things the viewer should do; each gets ticked as it is spoken.
- iconGrid: {"type":"iconGrid","title":"max 16 chars","items":[{"emoji":"one common emoji","label":"max 8 Korean chars"}]}  - 2 to 4 parallel ideas side by side.
(Emoji are drawn as clean line icons, so pick a common, literal emoji: 💰 ⏰ 🧠 ❤️ 📖 🙏 🎯 💡 ✅ ⚠️ 🌙 🏃 🍎 🤝 📈.)
- image: {"type":"image","prompt":"English image prompt, under 30 words","text":"optional overlay keyword, max 12 Korean chars","highlight":["word from text"]} - a full-screen 16:9 AI illustration. Use for up to ${MAX_IMAGES} scenes spread across all chapters (a concrete moment, place or object), never two in a row, never for numbers or lists. Prompt rules: describe only the CONTENT (style is added automatically); give time of day, weather and light; at most one person, written as an adult figure with no age, gender, nationality or ethnicity; never children; modest clothing; never a real identifiable person; no text or logos; no religious icons of specific figures.
- outro: {"type":"outro","text":"closing line, max 16 chars","highlight":["word"],"cta":"short subscribe call"} - ONLY the very last scene.

Design rules: never the same type twice in a row (except image never twice in a row either). Each body chapter uses at least 3 different types; use timeline, checklist and iconGrid where they fit instead of repeating list or headline. Numbers on screen must exactly match the narration; never invent numbers. SERMON: no stat or chart. highlight words must literally appear in that scene's text. Never use the straight double-quote character inside any value; use “ ” or 「 」.

=== SEO & THUMBNAIL ===
title: under 60 characters, the searchable keyword first, a curiosity gap, honest. Include the scripture reference for sermons. Must differ from the Short's title.
description: 3 to 5 short lines on what the video answers and who it is for (no timestamps - they are added automatically), then the channel line (Korean: 📌 Next You Global 채널은 성경 말씀, 지혜, 심리, 건강, 돈 이야기를 깊이 있게 전합니다.) and a subscribe line (👉 구독 & 좋아요로 함께 성장해요!).
tags: 10 to 15 search tags without #, specific first.
hashtags: exactly 3, the last is #NextYouGlobal.
thumbnail: {"text":"6 to 14 Korean characters, a punchy promise that complements the title (not a copy)","highlight":["one word from text"],"badge":"very short label e.g. 10분 정리 / 말씀 묵상 / 꼭 알아야 할 3가지","prompt":"English image prompt for the thumbnail picture: one striking subject on the RIGHT half, simple darker background on the left for text, same safety rules as image scenes"}
category: EXACTLY ONE of bible, quote, wealth, health, other.
style: EXACTLY ONE of hud, classic, pop, either - which motion-graphics look suits this topic.
- hud: a sharp, modern editorial look (camera tracking boxes, spec-sheet and tag cards, split-flap numbers, black and white with one orange accent). Fits the mind and brain, psychology, how things really work, modern life, technology, data-driven health facts, sharp contrarian takes.
- classic: soft gradients, rounded cards, warm colours. Fits emotional, warm or comforting topics - family and parents, love, grief, gratitude, loneliness, aging gracefully, faith and prayer.
- pop: loud, playful colour blocks (orange, lime, electric blue), giant bouncing type, morphing shapes, bright patterns. Fits energetic, upbeat topics - habits and routines, motivation, productivity, quick tips and hacks, numbered methods, fun facts.
- either: two or more would work equally well.
Sermons and faith topics are always classic.

mood: EXACTLY ONE of calm_reflective, hopeful_uplifting, tense_dramatic, dark_serious, warm_gentle.

Respond ONLY with valid JSON, no markdown fences, first character the opening brace:
{"title":"...","description":"...","tags":["..."],"hashtags":["#..."],"category":"...","mood":"...","style":"hud|classic|pop|either","thumbnail":{"text":"...","highlight":["..."],"badge":"...","prompt":"..."},"chapters":[{"title":"...","scenes":[{"narration":"...","visual":{"type":"headline","text":"...","highlight":["..."]}}]}]}`;

console.log('롱폼 주제: ' + topic + ' (쇼츠 조회 ' + ($json.shortViews || 0) + ')');
return [{ json: {
  body: { model: 'claude-sonnet-4-6', max_tokens: 24000, messages: [{ role: 'user', content: prompt }] },
  Topic: topic, Language: language, shortVideoId: $json.shortVideoId, shortViews: $json.shortViews, maxImages: MAX_IMAGES
} }];
