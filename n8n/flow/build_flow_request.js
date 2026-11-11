// 대본 + 장면별 Google Flow(Veo) 프롬프트를 쓰게 하는 Claude 요청
// 대본 쓰는 원칙(content-principles 스킬)은 저장소의 n8n/content_principles.md를 받아 system 프롬프트로 쓴다
const t = $('Pick Topic').first().json;
let principles = '';
try { principles = String($('Get Principles').first().json.data || ''); } catch (e) { /* 못 받으면 없이 */ }
const isKorean = t.Language.toLowerCase() === 'korean';
// 요리 쇼츠: 시트 Type 칸이 cooking/요리이거나 주제가 요리 같으면 요리 규칙을 강하게 적용 (최종 판단은 Claude가 format으로)
const COOK_RE = /레시피|요리|볶음|계란찜|달걀찜|조림|무침|라면|덮밥|볶음밥|김밥|계란|달걀|김치|찌개|반찬|디저트|베이킹|케이크|파스타|샐러드|에어프라이어|전자레인지|recipe|cooking|bake/i;
const cookingHint = /cook|요리|recipe/i.test(String(t.Type || '')) || COOK_RE.test(t.Topic);
// ── 드라마 쇼츠: 배우(Flow 클립)가 직접 대사를 말한다. 나레이션 없음, 자막은 대본 대사 ──
const dramaMode = /drama|드라마/i.test(String(t.Type || '')) || /드라마/.test(t.Topic);
if (dramaMode) {
  const dprompt = `You are the writer and director of a one-episode AI drama Short for the YouTube channel NextYou Global.
The producer films every scene by hand in Google Flow (Veo 3): one 8-second vertical 9:16 clip per scene, and Veo makes the actors SPEAK the dialogue with lip-sync and natural ambient sound. There is no narrator. Our system adds subtitles from your dialogue and joins the clips.

Story idea: ${t.Topic}
Language of the dialogue, title and description: ${t.Language}. Flow prompts are in English except the spoken lines, which stay in ${t.Language}.

=== STORY (one complete episode, 7 or 8 scenes, about 60 seconds) ===
- Scene 1 is a cold open at the most intense or surprising moment (a line that makes the viewer need to know why). Then rewind or continue, build the conflict, land ONE strong twist around 70 percent in, and end with a satisfying payoff (사이다, a warm reversal or a sting). The last line should make the viewer want to watch it again from the start.
- Relatable everyday Korean drama: family, couples, in-laws, workplace, friends, neighbours, money, a kind act repaid. Adults only. No violence, weapons, crime how-tos, sexual content or real people.
- 2 or 3 characters at most, each with a Korean name.
- Every scene has 1 or 2 short spoken lines, at most 30 Korean characters in total per scene (it must fit 8 seconds with a pause), natural spoken 반말/존댓말 that fits the relationship. Mostly one speaker per scene.

=== CHARACTERS (consistency is everything) ===
For each character give: name, look (English: age range, hair, face shape, clothing, one distinctive detail; no celebrity likeness) and voice (English: e.g. a calm low female voice, early thirties, Seoul accent). Paste the exact look AND voice description into every prompt where that character appears.
Give ONE "setting" per location (English, room, furniture, light, colour palette) and paste it exactly into every prompt in that location.

=== FLOW PROMPTS (one per scene, English, 60 to 110 words) ===
Order: shot type and camera movement; the character(s) with their exact look; the action and facial emotion during the 8 seconds; the setting; light and colour; then the dialogue written exactly like this: <character name> (<voice description>) says in ${t.Language}: “<the line>”. Then: "Audio: natural dialogue and room ambience only, no background music. Photorealistic, cinematic Korean drama look, shallow depth of field, vertical 9:16 composition. No subtitles, no on-screen text, no logos."
Vary the shots (close-up on a face for the big line, over-the-shoulder, two-shot, a detail of hands or an object for the twist).

=== ON-SCREEN TEXT ===
hook_text: an optional short title card over scene 1, at most 12 Korean characters (e.g. 결혼식 사흘 전), or empty.

=== SEO ===
title: 20 to 45 characters, a curiosity hook about the twist without spoiling it, ending with " | AI 드라마" (or " | AI Drama" in English).
description: two lines teasing the story, then ${isKorean ? '📌 Next You Global 채널은 성경 말씀, 동기부여, 부자 마인드셋, 자기계발 쇼츠를 업로드합니다. / 👉 구독 & 좋아요로 함께 성장해요!' : '📌 Next You Global posts motivation, wealth mindset and self-improvement shorts. / 👉 Subscribe and like to grow with us!'} each on its own line, then one line saying the video was made with AI.
hashtags: 4 to 6, include #AI드라마 (or #AIdrama) and #NextYouGlobal last.
mood: EXACTLY ONE of calm_reflective, hopeful_uplifting, tense_dramatic, dark_serious, warm_gentle.

Respond ONLY with valid JSON, no markdown fences. Never use the straight double-quote character inside a value; use “ ” instead.
{"format":"drama","title":"...","description":"...","hashtags":["#..."],"mood":"...","characters":[{"name":"...","look":"...","voice":"..."}],"setting":"... (all locations, one line each)","hook_text":"...","scenes":[{"dialogue":[{"speaker":"name","line":"..."}],"flow_prompt":"..."}]}`;
  return [{ json: { body: { model: 'claude-sonnet-4-6', max_tokens: 8000, system: principles || undefined, messages: [{ role: 'user', content: dprompt }] } } }];
}
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
const prompt = `You are the scriptwriter for NextYou Global, a YouTube Shorts channel about motivation, wealth mindset, money habits, health, self-improvement and quick home cooking.
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

=== COOKING SHORTS (format "cooking") ===
${cookingHint ? 'This topic looks like a dish or recipe: if it is, use format "cooking" and follow these rules.' : 'If the topic is a dish or recipe, use format "cooking" and follow these rules; otherwise use format "general" and ignore this section.'}
- Scene 1 shows and names the finished dish at its most delicious (the payoff first: glossy, steaming, cut open). Then ingredients, then the steps in order, one real tip, and the final plating and first bite; the last line loops back to the dish.
- Exact, reliable quantities, times and temperatures that really work at home (a standard recipe, nothing invented). Say them in the narration; they also appear in the overlays.
- Flow prompts are food cinematography: macro close-ups, steam rising, butter sizzling, sauce pouring in slow motion, a knife slicing, ingredients dropping into a pan. Show only adult hands, never a face. Describe ONE kitchen once in "setting" (countertop material, cookware, window light, colour palette) and paste that exact description into every prompt so all clips look like the same kitchen. Show the ingredient state the narration describes at that moment.
- Overlays carry the recipe: a "list" of ingredients with amounts, a "step" badge for each step, a "timer" for cooking times, a "stat" for a temperature, a "tag" for the key tip.

=== MOTION GRAPHICS OVER THE CLIPS ===
Each scene may have "overlay": ONE motion graphic shown on top of the clip (the clip stays visible; the graphic floats in the upper part, captions sit at the bottom). Give an overlay to at least 4 scenes, never scene 1 (hook_text is shown there). Kinds:
- {"kind":"stat","label":"max 10 chars","value":number,"prefix":"","suffix":"unit e.g. 원, %, ℃, 분"} - a counter that stops when the narration says the number.
- {"kind":"list","title":"max 12 chars","items":["2 to 4 items, max 12 chars each"]} - items appear as they are spoken (ingredients, reasons).
- {"kind":"checklist","title":"max 12 chars","items":["2 to 4 actions, max 12 chars"]} - each gets ticked as spoken.
- {"kind":"step","number":1,"text":"max 12 chars"} - a STEP badge with a short action.
- {"kind":"timer","title":"max 10 chars","seconds":150} - a clock ring for a duration the narration says.
- {"kind":"compare","left":"the wrong way, max 12 chars","right":"the better way, max 12 chars"}
- {"kind":"tag","label":"max 6 chars e.g. 포인트","text":"max 12 chars"} - a label pinned to the subject.
Numbers in an overlay must exactly match what the narration says; never invent one. The overlay pulls out the key fact; it does not repeat the whole sentence.

=== ON-SCREEN TEXT ===
hook_text: the key phrase of scene 1 as big text over the first clip, at most 14 Korean characters / 5 English words.

=== SEO ===
title: 20 to 45 characters, the main search keyword first, a payoff the video really delivers.
description: first line states the main keyword as a question or promise, then one or two lines on what the video answers, then ONLY the channel line and the subscribe line in the video's language (${isKorean ? '📌 Next You Global 채널은 성경 말씀, 동기부여, 부자 마인드셋, 자기계발 쇼츠를 업로드합니다. / 👉 구독 & 좋아요로 함께 성장해요!' : '📌 Next You Global posts motivation, wealth mindset and self-improvement shorts. / 👉 Subscribe and like to grow with us!'}), each on its own line.
hashtags: 4 to 6, main keyword first, #NextYouGlobal last.
category: EXACTLY ONE of food, quote, wealth, health, other (food for cooking shorts). mood: EXACTLY ONE of calm_reflective, hopeful_uplifting, tense_dramatic, dark_serious, warm_gentle.

Respond ONLY with valid JSON, no markdown fences. Never use the straight double-quote character inside a value; use “ ” instead.
{"format":"general or cooking","title":"...","description":"...","hashtags":["#..."],"category":"...","mood":"...","character":"... or empty if no person appears","setting":"... the one place every clip shares (always for cooking), or empty","hook_text":"...","scenes":[{"narration":"...","tone":"curious","flow_prompt":"...","overlay":{"kind":"list","title":"...","items":["..."]}}]}`;
return [{ json: { body: { model: 'claude-sonnet-4-6', max_tokens: 8000, system: principles || undefined, messages: [{ role: 'user', content: prompt }] } } }];
