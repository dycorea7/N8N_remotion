// [롱폼] image 장면마다 fal.ai 요청 1건 + 썸네일 1건(sceneIndex -1). 16:9.
const p = $('Parse Longform Script').first().json;

// 화풍은 카테고리로 정한다 (v2와 같은 톤). 프롬프트에는 장면 내용만 있고, 여기서 화풍을 붙인다.
const SAFETY = 'adults only, wholesome, non-sexual, fully clothed, modest clothing, no text, no lettering, no numbers, no logos, no watermark, no signature';
const FRAME = 'wide cinematic 16:9 landscape composition, clear focal subject, calm uncluttered area near the bottom';
const THUMB_FRAME = 'wide 16:9 landscape composition, one striking subject on the right half, simple darker background on the left half, high contrast, vivid';
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
      prompt: style.prefix + '. ' + scene + ', ' + style.suffix + ', ' + FRAME + ', ' + SAFETY,
      image_size: { width: 1920, height: 1080 },
      num_images: 1,
      enable_safety_checker: true
    }
  } });
});

const tp = sanitizePrompt(p.thumbnail && p.thumbnail.prompt);
if (tp.replace(/[^a-z]/gi, '').length >= 15) {
  jobs.push({ json: { sceneIndex: -1, body: { prompt: style.prefix + '. ' + tp + ', ' + style.suffix + ', ' + THUMB_FRAME + ', ' + SAFETY, image_size: { width: 1920, height: 1080 }, num_images: 1, enable_safety_checker: true } } });
}
console.log('image jobs: ' + jobs.length + ' (' + p.category + ', 썸네일 포함)');
return jobs.length ? jobs : [{ json: { skip: true } }];
