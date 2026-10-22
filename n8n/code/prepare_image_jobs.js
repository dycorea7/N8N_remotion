// image 장면마다 fal.ai 요청 1건을 만든다. 없으면 skip 1건만 내보내 다음 단계가 계속 돌게 한다.
const p = $('Parse Script JSON').first().json;

// 화풍은 카테고리로 정한다 (v2와 같은 톤). 프롬프트에는 장면 내용만 있고, 여기서 화풍을 붙인다.
// 애니풍은 인물이 어려 보이기 쉬워서 성인임을 분명히 적는다. 교복류는 금지.
// 주의: 이미지 모델은 '~없이'라는 부정어를 잘 못 알아듣고 단어 자체를 그린다 (예: "no school uniform" → 교복을 그림).
// 그래서 금지할 옷·사람을 문구에 적지 않고, 사람이 나오는 장면에만 '어떤 사람인지'를 긍정형으로 적는다.
const BASE_SAFETY = 'wholesome, modest, clean image without any written words or logos';
const PERSON_RE = /\b(person|people|man|men|woman|women|figure|adult|someone|lady|gentleman|couple|family|parent|mother|father|worker|hands?|face)\b/i;
const NO_PEOPLE_RE = /\b(no (people|person|humans?|figures?)|empty|unoccupied|nobody)\b/i;
function safetyFor(scene) {
  if (NO_PEOPLE_RE.test(scene) || !PERSON_RE.test(scene)) return 'empty scene with no human figures, ' + BASE_SAFETY;
  return 'the person is a mature adult in their forties or older, wearing an everyday knit sweater or plain casual shirt, ' + BASE_SAFETY;
}
const FRAME = 'upright tall vertical portrait composition with a level horizon, main subject in the middle third, calm empty space at top and bottom';
const SHINKAI = {
  prefix: 'An anime style illustration inspired by Makoto Shinkai',
  suffix: 'massive detailed cumulonimbus clouds, vibrant gradient sky, cinematic lighting, hyper-detailed background, emotional lighting, nostalgic ambiance, masterpiece'
};
const STYLES = {
  bible: {
    prefix: 'A sacred devotional illustration with luminous painterly light',
    suffix: 'golden light breaking through clouds, soft radiant glow, classical oil painting texture, warm ochre and amber palette, reverent peaceful atmosphere, hyper-detailed'
  },
  health: {
    prefix: 'A photorealistic cinematic photograph',
    suffix: 'shot on 50mm lens at f1.8, shallow depth of field, bright natural daylight, clean crisp detail, fresh airy colour grade, subtle film grain'
  },
  quote: SHINKAI, wealth: SHINKAI, other: SHINKAI
};

function sanitizePrompt(text) {
  let out = String(text || '');
  const rules = [
    [/\b(nude|naked|topless|lingerie|bikini|swimsuit|shirtless|undressed|underwear|cleavage|thighs?|curvy|busty|seductive|sensual|sexy|erotic|provocative|revealing|skimpy|tight[- ]fitting|wet clothes|wet shirt)\b/gi, ''],
    [/\b(sultry|flirt\w*|intimate|caress\w*|lying on a bed)\b/gi, ''],
    // 미성년 묘사는 성인으로 바꾼다. 이 규칙은 완화하지 않는다.
    [/\b(a |an |the )?(young|little|small|teenage|teen|adolescent|high[- ]school|middle[- ]school|school[- ]age)\s+(girl|boy|child|kid|student|schoolgirl|schoolboy)s?\b/gi, 'a young adult'],
    [/\b(teenagers?|teens?|adolescents?|schoolchildren|schoolgirls?|schoolboys?|minors?)\b/gi, 'young adults'],
    [/\b(girls|boys|children|kids|toddlers?|babies|baby)\b/gi, 'young adults'],
    [/\b(girl|boy|child|kid)\b/gi, 'young adult'],
    // 위에서 내려다본 구도는 세로 화면에서 그림이 옆으로 누워 나오기 쉽다 → 눈높이 구도로
    [/\b(top[- ]down|overhead|bird'?s[- ]eye|flat[- ]lay|from above)( view| shot| angle| perspective)?\b/gi, 'eye-level close view'],
    [/\b(school uniforms?|sailor (uniform|collar)|schoolbag|school bag|classroom|high school)\b/gi, 'adult casual clothes'],
    [/\byoung adults?\b/gi, 'adult in their thirties'],
    [/\b(young|youthful|cute)\s+(woman|man|person|lady|guy)\b/gi, 'adult $2 in their thirties'],
    [/\ba adult\b/gi, 'an adult'],
    [/\b(blood|bloody|bleeding|wound|wounds|gore|gory|corpse|cadaver)\b/gi, ''],
    [/,?\s*(9:16( aspect ratio)?|--ar\s*\d+:\d+|anime style|Makoto Shinkai style|photorealistic|oil painting|8k|masterpiece|no text|no logos)\b/gi, ''],
    [/\s{2,}/g, ' '], [/\s+,/g, ','], [/,\s*,+/g, ','], [/^[\s,.]+|[\s,.]+$/g, '']
  ];
  for (const [re, rep] of rules) out = out.replace(re, rep);
  return out;
}

const style = STYLES[p.category] || SHINKAI;
const jobs = [];
(p.scenes || []).forEach((s, i) => {
  const v = s.visual;
  if (!v || v.type !== 'image') return;
  const scene = sanitizePrompt(v.prompt);
  if (scene.replace(/[^a-z]/gi, '').length < 15) return;
  jobs.push({ json: {
    sceneIndex: i,
    body: {
      prompt: style.prefix + '. ' + scene + ', ' + style.suffix + ', ' + FRAME + ', ' + safetyFor(scene),
      image_size: { width: 1080, height: 1920 },
      num_images: 1,
      enable_safety_checker: true
    }
  } });
});

// 그래픽 장면 뒤 사진 배경(bg): 글자·그래픽이 올라가므로 단순하고 차분한 구도로
const BG_FRAME = 'simple uncluttered composition with soft calm areas, gentle depth of field, works as a background behind on-screen graphics';
(p.scenes || []).forEach((s, i) => {
  const v = s.visual;
  if (!v || v.type === 'image' || !v.bg) return;
  const scene = sanitizePrompt(v.bg);
  if (scene.replace(/[^a-z]/gi, '').length < 15) return;
  jobs.push({ json: {
    sceneIndex: i, kind: 'bg',
    body: {
      prompt: style.prefix + '. ' + scene + ', ' + style.suffix + ', ' + FRAME + ', ' + BG_FRAME + ', ' + safetyFor(scene),
      image_size: { width: 1080, height: 1920 },
      num_images: 1,
      enable_safety_checker: true
    }
  } });
});

console.log('image jobs: ' + jobs.length + ' (' + p.category + ')');
return jobs.length ? jobs : [{ json: { skip: true } }];
