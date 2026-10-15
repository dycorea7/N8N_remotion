import { workflow, node, trigger, sticky, newCredential, ifElse, expr } from '@n8n/workflow-sdk';

const dailyTrigger = trigger({
  type: 'n8n-nodes-base.scheduleTrigger',
  version: 1.2,
  config: { name: 'Daily Trigger', parameters: { rule: { interval: [{ field: 'cronExpression', expression: '23 8 * * *' }] } } }
});

const getNextTopic = node({
  type: 'n8n-nodes-base.googleSheets',
  version: 4.5,
  config: {
    name: 'Get Next Topic',
    parameters: {
      documentId: { __rl: true, mode: 'id', value: '1_RFLFLkxolbaSVOw-tWf8SuBKE0FV9n6dfqUrFoOA2k' },
      sheetName: { __rl: true, mode: 'list', value: 'gid=0', cachedResultName: 'Sheet1' },
      filtersUI: { values: [{ lookupColumn: 'Status', lookupValue: 'pending' }] },
      options: { returnFirstMatch: true }
    },
    retryOnFail: true, maxTries: 4, waitBetweenTries: 5000,
    credentials: { googleSheetsOAuth2Api: { id: '0cZFMuAKCn5sTGLr', name: 'Google Sheets account' } }
  },
  output: [{ Topic: '월급의 10%를 30년 모으면', Language: 'Korean', Status: 'pending', row_number: 2 }]
});

const buildClaudeRequest = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: { name: 'Build Claude Request', parameters: { jsCode: "// ===== 설정 =====\nconst USE_AI_IMAGES = true;   // false면 이미지 없이 모션 그래픽만\nconst MAX_IMAGES = 3;         // 영상 한 편에 AI 이미지 장면 최대 개수 (fal.ai 비용)\n// ================\n\nconst topic = $json.Topic;\nconst language = $json.Language || 'Korean';\nconst isKorean = String(language).trim().toLowerCase() === 'korean';\n\nconst lengthRule = isKorean\n  ? 'The full narration (all scene narrations together) must be between 270 and 350 Korean characters including spaces (~45 seconds spoken). Under 270 is too thin; over 350 is a failure.'\n  : 'The full narration (all scene narrations together) must be between 115 and 150 English words (~45 seconds spoken). Under 115 is too thin; over 150 is a failure.';\n\nconst seed = Math.floor(Date.now() / 86400000) + (Number($json.row_number) || 0);\n\nconst SERMON_SHAPES = [\n  'THE PROMISE - open by stating the promise itself as a flat fact, then show what it costs to believe it. Scripture appears early.',\n  'THE QUESTION - open with a question the listener has actually asked God in private. Let the scripture answer only partly.',\n  'THE SCENE - open by describing one very ordinary moment: a commute, a kitchen at night, a phone that does not ring. Let the passage speak into that scene.',\n  'THE OBJECTION - open by naming the doubt out loud, that the verse can sound hollow when things are this hard. Take it seriously before the passage answers.',\n  'THE PERSON - open with the biblical figure in the passage and what was happening to them, then turn to the listener late.',\n  'THE INVERSION - open with what the passage does NOT say, correcting a common misreading, then give what it does say.',\n  'THE SINGLE WORD - pick one word in the verse and turn it over: what it meant, what it did not mean, what it means now.'\n];\nconst PHILOSOPHY_FORMAT = 'PHILOSOPHY IN PRACTICE - four beats in this exact order. (1) QUOTE: open with the quote itself and name the thinker. (2) PROOF: immediately tell what ONE real person actually did that embodies the idea. (3) MEANING: only now explain what the idea claims, and name one thing it does NOT mean. (4) CARRY: one line the viewer can use tomorrow.';\nconst ESSAY_FORMATS = [\n  'EXPLAINER - explain one mechanism plainly: what actually happens, and why. One concrete everyday analogy. End with what it means tomorrow morning.',\n  'MYTH BUSTER - state the belief almost everyone holds, show precisely where it breaks, give what is actually true.',\n  'NUMBERED METHOD - three concrete steps or signs, numbered aloud, with a line of substance each. No preamble.',\n  'CASE STUDY - tell what happened to ONE real person in sequence, with real detail. Do not state the lesson until the final lines.',\n  'COMPARISON - hold two things side by side that people confuse and separate them cleanly.',\n  'CAUTIONARY - name a cost that compounds quietly over years, show the arithmetic, name the one decision that changes it.',\n  'QUOTE ESSAY - open with one short quote, name the thinker and the claim, bring in a real person whose life illustrates it, close with a two-line aphorism.',\n  PHILOSOPHY_FORMAT\n];\nconst CLOSINGS = [\n  'end on a single short sentence under eight words',\n  'end by returning to the opening line, changed by what came between',\n  'end with a question left open',\n  'end with one concrete action small enough to do today',\n  'end on a contrast between what was feared and what is true'\n];\nconst sermonShape = SERMON_SHAPES[seed % SERMON_SHAPES.length];\nlet essayFormat = ESSAY_FORMATS[(seed + 3) % ESSAY_FORMATS.length];\nconst closing = CLOSINGS[(seed + 5) % CLOSINGS.length];\nconst PHILOSOPHY_HINT = /철학|명언|사상|노자|장자|공자|맹자|도덕경|소크라테스|플라톤|아리스토텔레스|스토아|에픽테토스|세네카|아우렐리우스|니체|쇼펜하우어|칸트|사르트르|카뮈|philosophy|philosopher|stoic|stoicism|laozi|lao tzu|taoism|confucius|nietzsche|socrates|aurelius|seneca|epictetus/i;\nif (PHILOSOPHY_HINT.test(String(topic))) essayFormat = PHILOSOPHY_FORMAT;\n\nconst IMAGE_TYPE = USE_AI_IMAGES ? `\n- image: {\"type\":\"image\",\"prompt\":\"English image prompt, under 30 words\",\"text\":\"optional short overlay keyword, max 12 Korean chars / 4 English words\",\"highlight\":[\"word from text\"]}  - a full-screen AI illustration (with slow zoom) behind the captions. Use it for 1 to ${MAX_IMAGES} scenes where a concrete moment, place or object makes the viewer feel the script - the hook scene is a good candidate. Never for numbers, lists or comparisons.\n  Image prompt rules: describe only the CONTENT of the scene (the art style is added automatically per category); always give time of day, weather and light; at most one person, written as an adult figure with no age, gender, nationality or ethnicity; never children or minors; ordinary modest clothing, nothing suggestive; never a real identifiable person (when the script names someone, show their world instead - a workshop, a desk, a road); no text, letters or logos in the image; no religious icons of specific figures. Consecutive image scenes must differ in place and distance.` : '';\nconst IMAGE_RULE = USE_AI_IMAGES ? `\\n- Use at most ${MAX_IMAGES} image scenes, never two in a row.` : '';\n\nconst prompt = `You are the scriptwriter AND motion designer for NextYou Global, a YouTube Shorts channel covering Bible devotionals, motivation, wealth mindset and self-improvement.\nThe video is animated motion graphics (kinetic type, counters, charts, cards) over an animated gradient${USE_AI_IMAGES ? ', plus a few full-screen AI illustrations' : ''}, with word-by-word narration captions in the lower third. You write the narration and design every scene.\n\nTopic: ${topic}\nLanguage: ${language}\nWrite everything viewers see or hear - narration, on-screen text, title, description, hashtags - in ${language}.\n\n=== LENGTH (hard rule) ===\n${lengthRule}\nEarn the length with SPECIFICS (a concrete scene, a real number, a counter-argument), never with restatement.\n\n=== THE FIRST TWO SECONDS DECIDE EVERYTHING ===\nThe first narration line must be under 12 words, open mid-tension or mid-claim, and create an information gap.\nBANNED openings: 지금 마음이 힘드신가요, 힘드신가요, 지치셨나요, 사랑하는 여러분, 오늘도 수고하셨습니다, 혹시 〇〇한 적 있나요, Are you struggling, Have you ever, Let me tell you, In this video.\n\n=== STEP 1: CLASSIFY ===\nformat: sermon or essay. category: EXACTLY ONE of bible, quote, wealth, health, other.\n\n=== STEP 2: WRITE ===\nFORMAT A - SERMON (Bible passages, faith, prayer). ASSIGNED STRUCTURE: ${sermonShape}\nQuote scripture accurately (Korean: 개역개정 wording), name the reference, warm 합니다 register, concrete about one real worry, final scene ends with 아멘. or Amen. No psychology, science, studies or secular figures. Never invent or paraphrase a verse.\n\nFORMAT B - NON-SCRIPTURAL. ASSIGNED FORMAT: ${essayFormat}\nOnly quotes genuinely and widely attributed. Facts and figures accurate and mainstream; omit anything uncertain. Health: evidence-based and general, no medical advice or dosages. Never claim a person followed a philosophy unless well documented.\n\nFor the ending: ${closing}.\n\n=== STEP 3: SCENES (this is the motion design) ===\nSplit the narration into 7 to 9 scenes, in order. Each scene = { \"narration\": the exact words spoken during it (one or two sentences), \"visual\": what is on screen }.\nJoining every narration with a line break must give the complete script - nothing spoken outside scenes. Narration is spoken text only: no stage directions, no emoji, no brackets.\nEach scene lasts while its narration is spoken (about 4-7 seconds), so the visual must be readable at a glance.\n\nThe narration already appears as captions, so on-screen text must NOT repeat the narration. It is the headline a designer would pull out: the key phrase, number, or contrast, short and punchy.\n\nVisual types and fields (use ONLY these):\n- headline: {\"type\":\"headline\",\"text\":\"key phrase, max 18 Korean chars / 7 English words\",\"highlight\":[\"1-2 words from text to colour\"],\"emoji\":\"optional single emoji\"}\n- stat: {\"type\":\"stat\",\"label\":\"what the number is, max 16 chars\",\"value\":number,\"prefix\":\"optional e.g. $ or ₩\",\"suffix\":\"unit e.g. %, 억 원, 시간, 배\",\"decimals\":0,\"sub\":\"assumption or source, max 24 chars\"}  - the counter animates up when the narration says the number.\n- chart: {\"type\":\"chart\",\"title\":\"max 18 chars\",\"unit\":\"shared unit\",\"items\":[{\"label\":\"max 6 chars\",\"value\":number}]}  - 2 to 4 comparable bars; each bar grows when its label is spoken, so use labels that appear in the narration.\n- list: {\"type\":\"list\",\"title\":\"max 16 chars\",\"items\":[\"2 to 4 items, max 12 Korean chars / 4 English words each\"]}  - each item appears as it is spoken; items should echo words in the narration.\n- compare: {\"type\":\"compare\",\"title\":\"max 16 chars\",\"left\":{\"label\":\"the wrong/common side\",\"text\":\"max 16 chars\"},\"right\":{\"label\":\"the better side\",\"text\":\"max 16 chars\"}}\n- quote: {\"type\":\"quote\",\"text\":\"the quote, max 40 chars\",\"author\":\"name\"}  - only real, accurately attributed quotes.\n- scripture: {\"type\":\"scripture\",\"text\":\"verse wording, max 60 chars\",\"author\":\"reference e.g. 이사야 41:10\"}  - sermon only.\n- icon: {\"type\":\"icon\",\"emoji\":\"one emoji\",\"text\":\"max 14 chars\"}\n- outro: {\"type\":\"outro\",\"text\":\"closing line, max 16 chars\",\"highlight\":[\"word\"],\"cta\":\"short subscribe call, e.g. 구독하고 같이 성장해요 or Follow for more\"}${IMAGE_TYPE}\n\nDesign rules:\n- Scene 1 is the hook: headline (or stat if the hook is a number). The last scene is always outro.\n- Never use the same type twice in a row. Essays use at least 4 different types.${IMAGE_RULE}\n- Numbers on screen must match exactly what the narration says. Never invent a number for a stat or chart; if the script has no real numbers, use headline, list, compare, icon instead.\n- SERMON: use scripture for the verse, otherwise headline, icon, quote-free cards; never stat or chart.\n- highlight words must literally appear in that scene's text.\n- Never use the straight double-quote character inside any value; use “ ” or 「 」.\n\n=== STEP 4: SEO ===\ntitle: under 90 characters, hook front-loaded; include the scripture reference for sermons.\ndescription: two or three lines on the question the video answers; three lines starting with ✔ naming situations the viewer might be in; one line on what they gain; channel line (Korean: 📌 Next You Global 채널은 성경 말씀, 동기부여, 부자 마인드셋, 자기계발 쇼츠를 업로드합니다. English: 📌 Next You Global posts Bible devotionals, motivation, wealth mindset and self-improvement shorts.); subscribe line (Korean: 👉 구독 & 좋아요로 함께 성장해요! English: 👉 Subscribe and like to grow with us!).\nhashtags: 12 to 16, specific first, then broad, then #NextYouGlobal.\n\n=== MUSIC ===\nmood: EXACTLY ONE of calm_reflective, hopeful_uplifting, tense_dramatic, dark_serious, warm_gentle.\n\nRespond ONLY with valid JSON, no markdown fences:\n{\"title\":\"...\",\"description\":\"...\",\"hashtags\":[\"#tag\"],\"format\":\"sermon or essay\",\"category\":\"bible|quote|wealth|health|other\",\"mood\":\"...\",\"scenes\":[{\"narration\":\"...\",\"visual\":{\"type\":\"headline\",\"text\":\"...\",\"highlight\":[\"...\"],\"emoji\":\"...\"}}]}`;\n\nconsole.log('seed ' + seed + ' | sermon: ' + sermonShape.split(' - ')[0] + ' | essay: ' + essayFormat.split(' - ')[0]);\nreturn [{ json: { body: { model: 'claude-sonnet-4-6', max_tokens: 4000, messages: [{ role: 'user', content: prompt }] }, Topic: topic, Language: language, row_number: $json.row_number, useImages: USE_AI_IMAGES, maxImages: MAX_IMAGES } }];\n" } },
  output: [{ body: { model: 'claude-sonnet-4-6', max_tokens: 4000 }, Topic: '월급의 10%를 30년 모으면', Language: 'Korean', row_number: 2, useImages: true, maxImages: 3 }]
});

const claudeWrite = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.3,
  config: {
    name: 'Claude - Script & Motion Design',
    parameters: {
      method: 'POST',
      url: 'https://api.anthropic.com/v1/messages',
      authentication: 'predefinedCredentialType',
      nodeCredentialType: 'anthropicApi',
      sendHeaders: true,
      headerParameters: { parameters: [{ name: 'anthropic-version', value: '2023-06-01' }, { name: 'content-type', value: 'application/json' }] },
      sendBody: true,
      specifyBody: 'json',
      jsonBody: expr('{{ $json.body }}'),
      options: { timeout: 180000 }
    },
    retryOnFail: true, maxTries: 3, waitBetweenTries: 5000,
    credentials: { anthropicApi: { id: 'AsWnrNE2knZqRLta', name: 'Anthropic account' } }
  },
  output: [{ content: [{ type: 'text', text: '{"title":"..."}' }] }]
});

const parseScript = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: { name: 'Parse Script JSON', parameters: { jsCode: "const raw = String($json.content && $json.content[0] && $json.content[0].text || '');\nlet clean = raw.replace(/```json|```/g, '').trim();\nconst tryParse = t => { try { return JSON.parse(t); } catch (e) { return null; } };\nconst sliceBraces = t => { const s = t.indexOf('{'), e = t.lastIndexOf('}'); return (s !== -1 && e > s) ? t.slice(s, e + 1) : t; };\n\nlet parsed = tryParse(clean);\nif (typeof parsed === 'string') parsed = tryParse(parsed);\nif (!parsed) parsed = tryParse(sliceBraces(clean));\nif (!parsed) {\n  // 값 안에 이스케이프 안 된 \" 가 섞인 경우: 따옴표 사이 한 글자 \" 를 ” 로 바꿔 재시도\n  const fixed = sliceBraces(clean).replace(/([^\\s{\\[,:])\"([^\\s,}\\]:])/g, '$1”$2');\n  parsed = tryParse(fixed);\n}\nif (!parsed) throw new Error('Claude 응답 JSON 파싱 실패 — 앞 400자: ' + clean.slice(0, 400));\n\nconst src = $('Build Claude Request').first().json;\nconst langKey = String(src.Language || 'Korean').trim().toLowerCase();\nconst subtitleLang = langKey === 'english' ? 'en' : 'ko';\n\n// ── 장면 검증 ──\nconst scenes = (Array.isArray(parsed.scenes) ? parsed.scenes : [])\n  .map(s => ({\n    narration: String(s && s.narration || '').replace(/\\s*\\n\\s*/g, ' ').replace(/[\"]/g, '”').trim(),\n    visual: s && typeof s.visual === 'object' ? s.visual : null\n  }))\n  .filter(s => s.narration.length > 0);\nif (scenes.length < 4) throw new Error('장면이 너무 적습니다: ' + scenes.length + '개');\nif (scenes.length > 12) scenes.splice(12);\n\nconst script = scenes.map(s => s.narration).join('\\n');\nconst MAX_CHARS = subtitleLang === 'en' ? 1150 : 900;\nif (script.length > MAX_CHARS) throw new Error('대본이 너무 깁니다: ' + script.length + '자 (상한 ' + MAX_CHARS + ')');\n\nconst MOODS = ['calm_reflective', 'hopeful_uplifting', 'tense_dramatic', 'dark_serious', 'warm_gentle'];\nconst CATEGORIES = ['bible', 'quote', 'wealth', 'health', 'other'];\nlet format = String(parsed.format || '').trim().toLowerCase();\nif (format !== 'sermon' && format !== 'essay') format = /아멘|Amen/.test(script) ? 'sermon' : 'essay';\nlet category = String(parsed.category || '').trim().toLowerCase();\nif (!CATEGORIES.includes(category)) category = format === 'sermon' ? 'bible' : 'other';\nconst mood = MOODS.includes(parsed.mood) ? parsed.mood : 'calm_reflective';\n\n// ── AI 이미지 장면: 꺼져 있거나 개수 초과, 프롬프트 없음 → 같은 키워드의 headline ──\nconst useImages = src.useImages !== false;\nconst maxImages = Number(src.maxImages) || 3;\nlet imageCount = 0;\nfor (const s of scenes) {\n  const v = s.visual;\n  if (!v || v.type !== 'image') continue;\n  const promptOk = String(v.prompt || '').replace(/[^a-z]/gi, '').length >= 15;\n  if (useImages && promptOk && imageCount < maxImages) { imageCount++; continue; }\n  s.visual = { type: 'headline', text: String(v.text || s.narration.slice(0, 18)), highlight: v.highlight || [] };\n}\n\n// 설교에는 숫자 그래픽을 쓰지 않는다\nif (format === 'sermon') {\n  for (const s of scenes) {\n    if (s.visual && (s.visual.type === 'stat' || s.visual.type === 'chart')) s.visual = { type: 'headline', text: s.narration.slice(0, 18), highlight: [] };\n  }\n}\n\nconst hashtags = Array.isArray(parsed.hashtags) ? parsed.hashtags : [];\nconst types = scenes.map(s => (s.visual && s.visual.type) || '?');\nconsole.log('chars: ' + script.length + '/' + MAX_CHARS + ' | scenes: ' + scenes.length + ' [' + types.join(', ') + '] | ' + format + '/' + category + ' | mood: ' + mood + ' | images: ' + imageCount);\n\nreturn [{ json: {\n  title: String(parsed.title || src.Topic).slice(0, 100),\n  description: String(parsed.description || '') + '\\n\\n' + hashtags.join(' '),\n  hashtags, script, scenes, sceneTypes: types.join(' → '),\n  format, category, mood, imageCount,\n  topic: src.Topic, language: src.Language || 'Korean', subtitleLang, rowNumber: src.row_number\n} }];\n" } },
  output: [{ title: '월급의 10%가 바꾸는 30년', script: '월급의 10%만 떼어도', scenes: [{ narration: '월급의 10%만 떼어도', visual: { type: 'image', prompt: 'a kitchen table at dawn', text: '월급의 10%' } }], sceneTypes: 'image', format: 'essay', category: 'wealth', mood: 'hopeful_uplifting', imageCount: 1, subtitleLang: 'ko', topic: '월급의 10%를 30년 모으면', hashtags: ['#저축'], description: '...' }]
});

const elevenTts = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.3,
  config: {
    name: 'ElevenLabs TTS (timestamps)',
    parameters: {
      method: 'POST',
      url: expr("https://api.elevenlabs.io/v1/text-to-speech/{{ $json.subtitleLang === 'ko' ? 'srhGhMYcxqeTNVuSRvWg' : 'CwhRBWXzGAHq8TQ4Fs17' }}/with-timestamps"),
      authentication: 'genericCredentialType',
      genericAuthType: 'httpHeaderAuth',
      sendHeaders: true,
      headerParameters: { parameters: [{ name: 'content-type', value: 'application/json' }] },
      sendBody: true,
      specifyBody: 'json',
      jsonBody: expr('{{ { "text": $json.script, "model_id": "eleven_multilingual_v2", "voice_settings": { "stability": 0.5, "similarity_boost": 0.75, "speed": 1.12 } } }}'),
      options: { timeout: 180000 }
    },
    retryOnFail: true, maxTries: 3, waitBetweenTries: 5000,
    credentials: { httpHeaderAuth: { id: 'tttbA9a5I55qIbLc', name: 'ElevenLabs API' } }
  },
  output: [{ audio_base64: 'SUQz...', alignment: { characters: ['월'], character_start_times_seconds: [0], character_end_times_seconds: [0.1] } }]
});

const listMusic = node({
  type: 'n8n-nodes-base.googleDrive',
  version: 3,
  config: {
    name: 'List Music Files',
    parameters: {
      resource: 'fileFolder',
      searchMethod: 'query',
      queryString: '=',
      returnAll: true,
      filter: {
        driveId: { __rl: true, mode: 'list', value: 'My Drive' },
        folderId: { __rl: true, mode: 'id', value: '1_ThaZQ29sauz4BvRejOjg-0Ug3SaiTlm' },
        whatToSearch: 'files'
      },
      options: { fields: ['id', 'name'] }
    },
    executeOnce: true,
    alwaysOutputData: true,
    onError: 'continueRegularOutput',
    credentials: { googleDriveOAuth2Api: { id: '1k1XeWhKkI3b2p1u', name: 'Google Drive account' } }
  },
  output: [{ id: '1abc', name: 'hopeful_uplifting_20261001.mp3' }]
});

const prepareImages = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: { name: 'Prepare Image Jobs', parameters: { jsCode: "// image 장면마다 fal.ai 요청 1건을 만든다. 없으면 skip 1건만 내보내 다음 단계가 계속 돌게 한다.\nconst p = $('Parse Script JSON').first().json;\n\n// 화풍은 카테고리로 정한다 (v2와 같은 톤). 프롬프트에는 장면 내용만 있고, 여기서 화풍을 붙인다.\nconst SAFETY = 'adults only, wholesome, non-sexual, fully clothed, modest clothing, no text, no lettering, no numbers, no logos, no watermark, no signature';\nconst FRAME = 'tall vertical portrait composition, main subject in the middle third, calm empty space at top and bottom';\nconst SHINKAI = {\n  prefix: 'An anime style illustration inspired by Makoto Shinkai',\n  suffix: 'massive detailed cumulonimbus clouds, vibrant gradient sky, cinematic lighting, hyper-detailed background, emotional lighting, nostalgic ambiance, masterpiece'\n};\nconst STYLES = {\n  bible: {\n    prefix: 'A sacred devotional illustration with luminous painterly light',\n    suffix: 'golden light breaking through clouds, soft radiant glow, classical oil painting texture, warm ochre and amber palette, reverent peaceful atmosphere, hyper-detailed'\n  },\n  health: {\n    prefix: 'A photorealistic cinematic photograph',\n    suffix: 'shot on 50mm lens at f1.8, shallow depth of field, bright natural daylight, clean crisp detail, fresh airy colour grade, subtle film grain'\n  },\n  quote: SHINKAI, wealth: SHINKAI, other: SHINKAI\n};\n\nfunction sanitizePrompt(text) {\n  let out = String(text || '');\n  const rules = [\n    [/\\b(nude|naked|topless|lingerie|bikini|swimsuit|shirtless|undressed|underwear|cleavage|thighs?|curvy|busty|seductive|sensual|sexy|erotic|provocative|revealing|skimpy|tight[- ]fitting|wet clothes|wet shirt)\\b/gi, ''],\n    [/\\b(sultry|flirt\\w*|intimate|caress\\w*|lying on a bed)\\b/gi, ''],\n    // 미성년 묘사는 성인으로 바꾼다. 이 규칙은 완화하지 않는다.\n    [/\\b(a |an |the )?(young|little|small|teenage|teen|adolescent|high[- ]school|middle[- ]school|school[- ]age)\\s+(girl|boy|child|kid|student|schoolgirl|schoolboy)s?\\b/gi, 'a young adult'],\n    [/\\b(teenagers?|teens?|adolescents?|schoolchildren|schoolgirls?|schoolboys?|minors?)\\b/gi, 'young adults'],\n    [/\\b(girls|boys|children|kids|toddlers?|babies|baby)\\b/gi, 'young adults'],\n    [/\\b(girl|boy|child|kid)\\b/gi, 'young adult'],\n    [/\\b(blood|bloody|bleeding|wound|wounds|gore|gory|corpse|cadaver)\\b/gi, ''],\n    [/,?\\s*(9:16( aspect ratio)?|--ar\\s*\\d+:\\d+|anime style|Makoto Shinkai style|photorealistic|oil painting|8k|masterpiece|no text|no logos)\\b/gi, ''],\n    [/\\s{2,}/g, ' '], [/\\s+,/g, ','], [/,\\s*,+/g, ','], [/^[\\s,.]+|[\\s,.]+$/g, '']\n  ];\n  for (const [re, rep] of rules) out = out.replace(re, rep);\n  return out;\n}\n\nconst style = STYLES[p.category] || SHINKAI;\nconst jobs = [];\n(p.scenes || []).forEach((s, i) => {\n  const v = s.visual;\n  if (!v || v.type !== 'image') return;\n  const scene = sanitizePrompt(v.prompt);\n  if (scene.replace(/[^a-z]/gi, '').length < 15) return;\n  jobs.push({ json: {\n    sceneIndex: i,\n    body: {\n      prompt: style.prefix + '. ' + scene + ', ' + style.suffix + ', ' + FRAME + ', ' + SAFETY,\n      image_size: { width: 1080, height: 1920 },\n      num_images: 1,\n      enable_safety_checker: true\n    }\n  } });\n});\n\nconsole.log('image jobs: ' + jobs.length + ' (' + p.category + ')');\nreturn jobs.length ? jobs : [{ json: { skip: true } }];\n" } },
  output: [{ skip: false, sceneIndex: 0, body: { prompt: 'An anime style illustration. a kitchen table at dawn', image_size: { width: 1080, height: 1920 }, num_images: 1, enable_safety_checker: true } }]
});

const anyImages = ifElse({
  version: 2.2,
  config: {
    name: 'Any Images?',
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: '', typeValidation: 'loose' },
        conditions: [{ leftValue: expr('{{ $json.skip !== true }}'), operator: { type: 'boolean', operation: 'true', singleValue: true } }],
        combinator: 'and'
      }
    }
  }
});

const falImage = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.3,
  config: {
    name: 'fal.ai Generate Image',
    parameters: {
      method: 'POST',
      url: 'https://fal.run/fal-ai/bytedance/seedream/v4/text-to-image',
      authentication: 'genericCredentialType',
      genericAuthType: 'httpHeaderAuth',
      sendBody: true,
      specifyBody: 'json',
      jsonBody: expr('{{ $json.body }}'),
      options: { batching: { batch: { batchSize: 2, batchInterval: 1000 } }, timeout: 180000 }
    },
    retryOnFail: true, maxTries: 2, waitBetweenTries: 5000,
    onError: 'continueRegularOutput',
    credentials: { httpHeaderAuth: { id: 'zJNmrgWyP178Ecfj', name: 'Fal.ai' } }
  },
  output: [{ images: [{ url: 'https://v3.fal.media/files/example.jpg', width: 1080, height: 1920 }], seed: 1 }]
});

const buildRenderJob = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: { name: 'Build Render Job', parameters: { jsCode: "// ===== 설정 =====\n// 렌더용 GitHub 저장소 \"아이디/저장소이름\". 예: 'dycorea7/motion-shorts'\nconst GITHUB_REPO = '';\nconst GITHUB_BRANCH = 'main';\nconst MUSIC_VOLUME = 0.16;\n// ================\n\nif (!GITHUB_REPO) throw new Error('Build Render Job 노드의 GITHUB_REPO에 저장소 이름(아이디/저장소)을 입력하세요');\n\nconst p = $('Parse Script JSON').first().json;\nconst tts = $('ElevenLabs TTS (timestamps)').first().json;\nif (!tts.audio_base64 || !tts.alignment) throw new Error('ElevenLabs 응답에 audio_base64/alignment가 없습니다: ' + JSON.stringify(tts).slice(0, 300));\n\n// ── fal.ai 결과를 장면에 붙인다 (요청 순서 = 응답 순서). 실패한 장면은 렌더러가 텍스트 장면으로 바꾼다 ──\nconst scenes = JSON.parse(JSON.stringify(p.scenes));\nlet imagesOk = 0, imagesFailed = 0;\nconst failures = [];\nlet reqs = [], res = [];\ntry { reqs = $('Prepare Image Jobs').all(); } catch (e) { /* 이미지 단계 없음 */ }\ntry { res = $('fal.ai Generate Image').all(); } catch (e) { /* 이미지가 하나도 없던 실행 */ }\nreqs.forEach((r, k) => {\n  if (r.json.skip) return;\n  const idx = r.json.sceneIndex;\n  const out = res[k] && res[k].json;\n  const url = out && out.images && out.images[0] && out.images[0].url;\n  if (url && scenes[idx]) { scenes[idx].visual.src = url; imagesOk++; }\n  else { imagesFailed++; failures.push('장면 ' + (idx + 1) + ': ' + JSON.stringify(out && (out.error || out.detail) || 'no image').slice(0, 160)); }\n});\nfor (const s of scenes) if (s.visual) delete s.visual.prompt; // 렌더러에는 필요 없음\n\n// ── 배경음악: 드라이브 라이브러리에서 무드에 맞는 곡 하나 ──\nlet musicUrl = '', musicName = 'none';\nlet files = [];\ntry { files = $('List Music Files').all().map(i => i.json).filter(f => f && f.id && f.name); } catch (e) { /* 폴더 조회 실패 */ }\nconst lower = f => f.name.toLowerCase();\nconst MOODS = ['calm_reflective', 'hopeful_uplifting', 'tense_dramatic', 'dark_serious', 'warm_gentle'];\nlet pool = [];\nif (p.format === 'sermon') pool = files.filter(f => lower(f).startsWith('hymn'));\nif (!pool.length) pool = files.filter(f => lower(f).startsWith(p.mood));\nif (!pool.length) pool = files.filter(f => MOODS.some(m => lower(f).startsWith(m)));\nif (pool.length) {\n  const pick = pool[Math.floor(Math.random() * pool.length)];\n  musicUrl = 'https://drive.google.com/uc?export=download&id=' + pick.id;\n  musicName = pick.name;\n}\n\nconst jobId = 'ms_' + $now.toFormat('yyyyMMdd_HHmmss') + '_' + Math.random().toString(36).slice(2, 7);\nconst job = {\n  job_id: jobId, lang: p.subtitleLang, category: p.category, title: p.title,\n  scenes, alignment: tts.alignment, audio_base64: tts.audio_base64,\n  music_url: musicUrl, music_volume: MUSIC_VOLUME\n};\nconst text = JSON.stringify(job);\nconsole.log('job ' + jobId + ' | ' + Math.round(text.length / 1024) + 'KB | images ' + imagesOk + ' ok / ' + imagesFailed + ' failed | music: ' + musicName);\nif (failures.length) console.log('image failures: ' + failures.join(' | '));\n\nreturn [{\n  json: { jobId, repo: GITHUB_REPO, branch: GITHUB_BRANCH, imagesOk, imagesFailed, musicName, sceneTypes: scenes.map(s => s.visual && s.visual.src ? 'image' : (s.visual && s.visual.type === 'image' ? 'headline' : s.visual && s.visual.type)).join(' → ') },\n  binary: { data: { data: Buffer.from(text, 'utf8').toString('base64'), mimeType: 'application/json', fileName: jobId + '.json' } }\n}];\n" } },
  output: [{ jobId: 'ms_20261014_084500_ab12c', repo: 'owner/motion-shorts', branch: 'main', imagesOk: 2, imagesFailed: 0, musicName: 'hopeful_uplifting_1.mp3', sceneTypes: 'image → stat' }]
});

const uploadJob = node({
  type: 'n8n-nodes-base.googleDrive',
  version: 3,
  config: {
    name: 'Upload Job to Drive',
    parameters: {
      resource: 'file',
      operation: 'upload',
      inputDataFieldName: 'data',
      name: expr('{{ $json.jobId }}.json'),
      driveId: { __rl: true, mode: 'list', value: 'My Drive' },
      folderId: { __rl: true, mode: 'id', value: '1xNjOz0G8N_ZIQsJwfB-JRW4g9gKvjajd' },
      options: {}
    },
    retryOnFail: true, maxTries: 3, waitBetweenTries: 5000,
    credentials: { googleDriveOAuth2Api: { id: '1k1XeWhKkI3b2p1u', name: 'Google Drive account' } }
  },
  output: [{ id: '1JobFileId', name: 'ms_20261014_084500_ab12c.json' }]
});

const shareJob = node({
  type: 'n8n-nodes-base.googleDrive',
  version: 3,
  config: {
    name: 'Share Job File',
    parameters: {
      resource: 'file',
      operation: 'share',
      fileId: { __rl: true, mode: 'id', value: expr('{{ $json.id }}') },
      permissionsUi: { permissionsValues: { role: 'reader', type: 'anyone', allowFileDiscovery: false } },
      options: {}
    },
    retryOnFail: true, maxTries: 3, waitBetweenTries: 5000,
    credentials: { googleDriveOAuth2Api: { id: '1k1XeWhKkI3b2p1u', name: 'Google Drive account' } }
  },
  output: [{ id: 'anyoneWithLink', role: 'reader', type: 'anyone' }]
});

const startRender = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.3,
  config: {
    name: 'Start GitHub Render',
    parameters: {
      method: 'POST',
      url: expr("https://api.github.com/repos/{{ $('Build Render Job').first().json.repo }}/actions/workflows/render.yml/dispatches"),
      authentication: 'predefinedCredentialType',
      nodeCredentialType: 'githubApi',
      sendHeaders: true,
      headerParameters: { parameters: [{ name: 'Accept', value: 'application/vnd.github+json' }, { name: 'X-GitHub-Api-Version', value: '2022-11-28' }] },
      sendBody: true,
      specifyBody: 'json',
      jsonBody: expr("{{ { \"ref\": $('Build Render Job').first().json.branch, \"inputs\": { \"job_id\": $('Build Render Job').first().json.jobId, \"job_url\": 'https://drive.google.com/uc?export=download&id=' + $('Upload Job to Drive').first().json.id, \"resume_url\": $execution.resumeUrl } } }}"),
      options: { timeout: 60000 }
    },
    retryOnFail: true, maxTries: 3, waitBetweenTries: 5000,
    credentials: { githubApi: newCredential('GitHub') }
  },
  output: [{}]
});

const waitRender = node({
  type: 'n8n-nodes-base.wait',
  version: 1.1,
  config: {
    name: 'Wait for Render',
    parameters: { resume: 'webhook', httpMethod: 'POST', limitWaitTime: true, limitType: 'afterTimeInterval', resumeAmount: 45, resumeUnit: 'minutes', options: {} }
  },
  output: [{ body: { status: 'done', asset_id: '123456', duration_sec: 45, render_sec: 300, size_mb: 14.2, warnings: [] } }]
});

const checkResult = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: { name: 'Check Render Result', parameters: { jsCode: "// GitHub Actions가 Wait 노드로 보낸 결과. 45분 안에 아무것도 안 오면 body가 비어 있다.\nconst b = $json.body || {};\nconst job = $('Build Render Job').first().json;\nif (!b.status) throw new Error('렌더 결과가 45분 안에 오지 않았습니다. GitHub 저장소의 Actions 탭에서 실행 상태를 확인하세요: https://github.com/' + job.repo + '/actions');\nif (b.status !== 'done') throw new Error('GitHub Actions 렌더 실패: ' + (b.error || 'unknown') + (b.run_url ? ' | 로그: ' + b.run_url : ''));\nif (!b.asset_id) throw new Error('렌더는 끝났지만 영상 asset_id가 없습니다: ' + JSON.stringify(b).slice(0, 300));\nconsole.log('render done: ' + b.duration_sec + 's video, ' + b.render_sec + 's render, ' + b.size_mb + 'MB' + (b.warnings && b.warnings.length ? ' | ' + b.warnings.join(' | ') : ''));\nreturn [{ json: { ...b, repo: job.repo, jobId: job.jobId, warningsText: (b.warnings || []).join('\\n') || '없음' } }];\n" } },
  output: [{ status: 'done', asset_id: '123456', repo: 'owner/motion-shorts', jobId: 'ms_20261014_084500_ab12c', duration_sec: 45, render_sec: 300, size_mb: 14.2, warningsText: '없음' }]
});

const downloadPreview = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.3,
  config: {
    name: 'Download Video',
    parameters: {
      url: expr('https://api.github.com/repos/{{ $json.repo }}/releases/assets/{{ $json.asset_id }}'),
      authentication: 'predefinedCredentialType',
      nodeCredentialType: 'githubApi',
      sendHeaders: true,
      headerParameters: { parameters: [{ name: 'Accept', value: 'application/octet-stream' }] },
      options: { response: { response: { responseFormat: 'file' } }, timeout: 120000 }
    },
    retryOnFail: true, maxTries: 3, waitBetweenTries: 5000,
    credentials: { githubApi: newCredential('GitHub') }
  },
  output: [{}]
});

const uploadPreview = node({
  type: 'n8n-nodes-base.googleDrive',
  version: 3,
  config: {
    name: 'Upload Preview to Drive',
    parameters: {
      resource: 'file',
      operation: 'upload',
      inputDataFieldName: 'data',
      name: expr("{{ $('Check Render Result').first().json.jobId }}.mp4"),
      driveId: { __rl: true, mode: 'list', value: 'My Drive' },
      folderId: { __rl: true, mode: 'id', value: '1xNjOz0G8N_ZIQsJwfB-JRW4g9gKvjajd' },
      options: {}
    },
    retryOnFail: true, maxTries: 3, waitBetweenTries: 5000,
    credentials: { googleDriveOAuth2Api: { id: '1k1XeWhKkI3b2p1u', name: 'Google Drive account' } }
  },
  output: [{ id: '1PreviewFileId', name: 'ms_20261014_084500_ab12c.mp4' }]
});

const telegramApproval = node({
  type: 'n8n-nodes-base.telegram',
  version: 1.2,
  config: {
    name: 'Telegram Approval',
    parameters: {
      resource: 'message',
      operation: 'sendAndWait',
      chatId: '6213393108',
      message: expr("🎬 새 쇼츠 렌더 완료 (모션 그래픽)\n\n제목: {{ $('Parse Script JSON').first().json.title }}\n카테고리: {{ $('Parse Script JSON').first().json.category }} · {{ $('Check Render Result').first().json.duration_sec }}초\n장면: {{ $('Build Render Job').first().json.sceneTypes }}\nAI 이미지: {{ $('Build Render Job').first().json.imagesOk }}장 (실패 {{ $('Build Render Job').first().json.imagesFailed }})\n음악: {{ $('Build Render Job').first().json.musicName }}\n렌더: {{ $('Check Render Result').first().json.render_sec }}초 · {{ $('Check Render Result').first().json.size_mb }}MB\n경고: {{ $('Check Render Result').first().json.warningsText }}\n\n미리보기: https://drive.google.com/file/d/{{ $json.id }}/view\n\n업로드할까요?"),
      options: {}
    },
    credentials: { telegramApi: { id: 'MqKwiZpa0oSigPGM', name: 'Telegram account' } }
  },
  output: [{ data: { approved: true } }]
});

const approved = ifElse({
  version: 2.2,
  config: {
    name: 'Approved?',
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: '', typeValidation: 'loose' },
        conditions: [{ leftValue: expr('{{ $json.data.approved }}'), operator: { type: 'boolean', operation: 'true', singleValue: true } }],
        combinator: 'and'
      }
    }
  }
});

const downloadFinal = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.3,
  config: {
    name: 'Download Video for Upload',
    parameters: {
      url: expr("https://api.github.com/repos/{{ $('Check Render Result').first().json.repo }}/releases/assets/{{ $('Check Render Result').first().json.asset_id }}"),
      authentication: 'predefinedCredentialType',
      nodeCredentialType: 'githubApi',
      sendHeaders: true,
      headerParameters: { parameters: [{ name: 'Accept', value: 'application/octet-stream' }] },
      options: { response: { response: { responseFormat: 'file' } }, timeout: 120000 }
    },
    retryOnFail: true, maxTries: 3, waitBetweenTries: 5000,
    credentials: { githubApi: newCredential('GitHub') }
  },
  output: [{}]
});

const youtubeUpload = node({
  type: 'n8n-nodes-base.youTube',
  version: 1,
  config: {
    name: 'YouTube Upload',
    parameters: {
      resource: 'video',
      operation: 'upload',
      title: expr("{{ $('Parse Script JSON').first().json.title }}"),
      regionCode: 'CA',
      categoryId: '27',
      options: {
        description: expr("{{ $('Parse Script JSON').first().json.description }}"),
        privacyStatus: 'unlisted',
        tags: expr("{{ $('Parse Script JSON').first().json.hashtags.map(h => h.replace('#','')).join(',') }}")
      }
    },
    retryOnFail: true, maxTries: 3, waitBetweenTries: 5000,
    credentials: { youTubeOAuth2Api: { id: 'HE5xUScbPHMgviXV', name: 'YouTube account' } }
  },
  output: [{ uploadId: 'abc123' }]
});

const markUploaded = node({
  type: 'n8n-nodes-base.googleSheets',
  version: 4.5,
  config: {
    name: 'Mark as Uploaded',
    parameters: {
      operation: 'update',
      documentId: { __rl: true, mode: 'id', value: '1_RFLFLkxolbaSVOw-tWf8SuBKE0FV9n6dfqUrFoOA2k' },
      sheetName: { __rl: true, mode: 'list', value: 'gid=0', cachedResultName: 'Sheet1' },
      columns: {
        mappingMode: 'defineBelow',
        matchingColumns: ['Topic'],
        attemptToConvertTypes: false,
        convertFieldsToString: false,
        schema: [
          { id: 'Topic', displayName: 'Topic', required: false, type: 'string', canBeUsedToMatch: true },
          { id: 'Language', displayName: 'Language', required: false, type: 'string', canBeUsedToMatch: true },
          { id: 'Status', displayName: 'Status', required: false, type: 'string', canBeUsedToMatch: true },
          { id: 'VideoURL', displayName: 'VideoURL', required: false, type: 'string', canBeUsedToMatch: true }
        ],
        value: {
          Topic: expr("{{ $('Parse Script JSON').first().json.topic }}"),
          Status: 'uploaded',
          VideoURL: expr("https://youtube.com/watch?v={{ $('YouTube Upload').first().json.uploadId }}")
        }
      },
      options: {}
    },
    retryOnFail: true, maxTries: 4, waitBetweenTries: 5000,
    credentials: { googleSheetsOAuth2Api: { id: '0cZFMuAKCn5sTGLr', name: 'Google Sheets account' } }
  },
  output: [{ Topic: '월급의 10%를 30년 모으면', Status: 'uploaded' }]
});

const notifyDone = node({
  type: 'n8n-nodes-base.telegram',
  version: 1.2,
  config: {
    name: 'Notify Upload Complete',
    parameters: {
      chatId: '6213393108',
      text: expr("✅ 업로드 완료\n\n제목: {{ $('Parse Script JSON').first().json.title }}\n\n링크: https://youtube.com/watch?v={{ $('YouTube Upload').first().json.uploadId }}"),
      additionalFields: {}
    },
    credentials: { telegramApi: { id: 'MqKwiZpa0oSigPGM', name: 'Telegram account' } }
  },
  output: [{ ok: true }]
});

const setupNote = sticky(
  '## 모션 그래픽 + AI 이미지 쇼츠 (VPS 없음)\nClaude 대본·장면 설계 → ElevenLabs 타임스탬프 음성 → fal.ai 이미지(최대 3장) → GitHub Actions가 Remotion으로 렌더 → 결과가 Wait 노드로 돌아옴\n\n**설정**\n1. **Build Render Job** 노드: `GITHUB_REPO` = 아이디/저장소\n2. **GitHub** 크리덴셜: Fine-grained 토큰 (해당 저장소 Actions: Read and write, Contents: Read)\n3. 이미지 끄기/개수: **Build Claude Request** 맨 위 `USE_AI_IMAGES`, `MAX_IMAGES`\n\n⚠️ v2/v3와 같은 시트(pending)를 읽으므로 하나만 활성화하세요.',
  [getNextTopic, buildClaudeRequest, claudeWrite],
  { color: 4 }
);

export default workflow('motion-shorts', 'NextYou Global - Motion Shorts (Claude 모션 그래픽 + ElevenLabs)')
  .add(dailyTrigger)
  .to(getNextTopic)
  .to(buildClaudeRequest)
  .to(claudeWrite)
  .to(parseScript)
  .to(elevenTts)
  .to(listMusic)
  .to(prepareImages)
  .to(anyImages
    .onTrue(falImage.to(buildRenderJob))
    .onFalse(buildRenderJob))
  .add(buildRenderJob)
  .to(uploadJob)
  .to(shareJob)
  .to(startRender)
  .to(waitRender)
  .to(checkResult)
  .to(downloadPreview)
  .to(uploadPreview)
  .to(telegramApproval)
  .to(approved.onTrue(downloadFinal.to(youtubeUpload.to(markUploaded.to(notifyDone)))))
  .add(setupNote)
  .group('Script & motion design', [buildClaudeRequest, claudeWrite, parseScript], { description: 'Claude writes the narration split into scenes, each with a motion-graphic or AI-image design' })
  .group('Voice & music', [elevenTts, listMusic], { description: 'ElevenLabs narration with character timestamps, plus the Drive music library' })
  .group('AI images (fal.ai)', [prepareImages, anyImages, falImage, buildRenderJob], { description: 'Seedream images for image scenes in the category art style, then the render job file is packed' })
  .group('Render on GitHub Actions', [uploadJob, shareJob, startRender, waitRender, checkResult, downloadPreview, uploadPreview], { description: 'Job file to Drive, GitHub Actions renders with Remotion and calls back, video copied to Drive for preview' })
  .group('Publish', [telegramApproval, approved, downloadFinal, youtubeUpload, markUploaded, notifyDone], { description: 'Telegram preview approval, then unlisted YouTube upload and sheet update' });
