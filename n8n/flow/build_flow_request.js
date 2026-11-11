// 대본 + 장면별 Google Flow(Veo) 프롬프트를 쓰게 하는 Claude 요청
// 대본 쓰는 원칙(content-principles 스킬)은 저장소의 n8n/content_principles.md를 받아 system 프롬프트로 쓴다
const t = $('Pick Topic').first().json;
let principles = '';
try { principles = String($('Get Principles').first().json.data || ''); } catch (e) { /* 못 받으면 없이 */ }
const isKorean = t.Language.toLowerCase() === 'korean';
const lengthRule = isKorean
  ? 'The full narration (all scenes together) is 250 to 320 Korean characters including spaces (about 35 to 40 seconds).'
  : 'The full narration (all scenes together) is 100 to 135 English words (about 35 to 40 seconds).';
const sceneRule = isKorean
  ? 'Write 6 or 7 scenes. Each scene narration is 30 to 48 Korean characters (5 to 7 seconds spoken). Never longer: each scene is covered by ONE 8-second video clip.'
  : 'Write 6 or 7 scenes. Each scene narration is 12 to 20 English words (5 to 7 seconds spoken). Never longer: each scene is covered by ONE 8-second video clip.';
const style = isKorean ? `
=== NARRATION STYLE (read aloud by an expressive AI voice) ===
Conversational 해요체 (해요, 거든요, 잖아요, 볼까요, 죠), never 합니다/습니다. Short breath units, a comma where a speaker breathes, a period at the end of each thought. Cut connecting words (그리고, 하지만, 따라서, 그래서, 또한). Spell every number and unit out in Hangul as it is spoken (삼십 퍼센트, 천만 원, 이십 대) - the voice reads digits badly. No parentheses, slashes or abbreviations.
` : '';
const prompt = `You are the scriptwriter for NextYou Global, a YouTube Shorts channel about motivation, wealth mindset, money habits, health and self-improvement.
This Short is made by hand: the producer creates every visual as an AI video clip in Google Flow (Veo), one clip per scene, vertical 9:16, 8 seconds each. Our system then lays your narration (ElevenLabs voice) and captions over the clips. So you write the narration AND a ready-to-paste Flow prompt for each scene.

Topic: ${t.Topic}
Language: ${t.Language}. Narration, title, description and on-screen text are in ${t.Language}; Flow prompts are always in English.

=== LENGTH (hard rule) ===
${lengthRule}
${sceneRule}
${style}
=== VOICE & TONE ===
Sound like a smart, warm friend with a slightly playful streak; one or two playful moments in the whole Short, the facts stay accurate. Each scene gets "tone": ONE delivery cue from: playful, curious, excited, surprised, thoughtful, warm, serious, mischievously, chuckles, sighs, whispers. Vary it; chuckles, sighs and whispers rarely.

=== HOOK AND LOOP ===
Scene 1 narration is ONE short definite sentence (at most 20 Korean characters / 8 English words): a surprising claim or the payoff itself, never hedged, no greeting. BANNED openings: 안녕하세요, 여러분, 혹시 ~한 적 있나요, Have you ever, In this video.
Keep one open loop until the last third. The last line flows straight back into the first line when the Short replays (never a goodbye or a subscribe request in the narration).
One scene near the end asks one easy question viewers can answer in a word or a number.

=== FACTS ===
Never invent a statistic, study, quote or personal story. Use only well-documented facts; say a point generally when you are not sure of the exact figure.

=== FLOW PROMPTS (one per scene, English, 50 to 90 words) ===
Each prompt describes ONE continuous 8-second shot that shows what that scene's narration is about, written the way Veo understands best, in this order: shot type and camera movement (slow push-in, handheld follow, top-light close-up, gentle dolly), the subject and the action that happens during the shot (something must move), the setting with time of day, weather and light, the mood and colour, then "photorealistic, cinematic, shallow depth of field, vertical 9:16 composition".
- If a person appears, use ONE recurring main character for the whole Short. Describe them once in "character" (an adult, age range, hair, clothing, no name, no celebrity likeness) and paste that exact description into every prompt where they appear, so every clip shows the same person.
- Never children or minors, never a real or famous person, modest everyday clothing, no brand logos.
- No readable text anywhere in the shot (no signs, screens with words, documents or subtitles): Veo draws text badly. Show numbers through objects and actions instead (coins stacking, a jar filling up).
- End every prompt with: "No on-screen text, no subtitles, no logos. No dialogue."
- Vary the shot from scene to scene (close-up, wide, eye-level medium shot, detail of hands, environment) so the cut feels alive.

=== ON-SCREEN TEXT ===
hook_text: the key phrase of scene 1 as big text over the first clip, at most 14 Korean characters / 5 English words.

=== SEO ===
title: 20 to 45 characters, the main search keyword first, a payoff the video really delivers.
description: first line states the main keyword as a question or promise, then one or two lines on what the video answers, then the channel line (Korean: 📌 Next You Global 채널은 성경 말씀, 동기부여, 부자 마인드셋, 자기계발 쇼츠를 업로드합니다. English: 📌 Next You Global posts motivation, wealth mindset and self-improvement shorts.) and a subscribe line (Korean: 👉 구독 & 좋아요로 함께 성장해요! English: 👉 Subscribe and like to grow with us!).
hashtags: 4 to 6, main keyword first, #NextYouGlobal last.
category: EXACTLY ONE of quote, wealth, health, other. mood: EXACTLY ONE of calm_reflective, hopeful_uplifting, tense_dramatic, dark_serious, warm_gentle.

Respond ONLY with valid JSON, no markdown fences. Never use the straight double-quote character inside a value; use “ ” instead.
{"title":"...","description":"...","hashtags":["#..."],"category":"...","mood":"...","character":"... or empty if no person appears","hook_text":"...","scenes":[{"narration":"...","tone":"curious","flow_prompt":"..."}]}`;
return [{ json: { body: { model: 'claude-sonnet-4-6', max_tokens: 6000, system: principles || undefined, messages: [{ role: 'user', content: prompt }] } } }];
