// ── 한국어 나레이션 읽기용 변환 (TTS가 숫자·단위·일부 낱말을 이상하게 읽는 것 방지) ──
//  - 숫자+단위를 한글 읽기로: 63℃ → 육십삼도, 2큰술 → 두큰술, 700W → 칠백와트, 1/2컵 → 반컵, 2~3분 → 이삼분, 3~4개 → 서너개
//  - 고유어 수(한·두·세…)는 개·큰술·컵·번·시간 같은 단위 앞에서, 한자어 수(일·이·삼…)는 분·초·도·g·ml 앞과 단위 없는 수에
//  - 낱말(띄어쓰기) 수는 바꾸지 않는다 → 렌더러가 자막에는 원래 표기(63℃, 2큰술)를 보여 준다
//  - RESPELL: TTS가 잘못 읽는 낱말의 발음 표기 (예: 주의 → 주이). 필요하면 여기에 추가
const RESPELL = [['주의', '주이'], ['유의', '유이'], ['희석', '히석']];
const SINO_D = ['', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구'];
function sino(n) {
  n = Math.floor(Number(n));
  if (!Number.isFinite(n)) return '';
  if (n === 0) return '영';
  const part = function (x) { // 0~9999
    let s = '';
    [[1000, '천'], [100, '백'], [10, '십']].forEach(function (u) { const d = Math.floor(x / u[0]) % 10; if (d) s += (d === 1 ? '' : SINO_D[d]) + u[1]; });
    return s + SINO_D[x % 10];
  };
  let s = '';
  const eok = Math.floor(n / 100000000), man = Math.floor(n / 10000) % 10000, rest = n % 10000;
  if (eok) s += part(eok) + '억';
  if (man) s += (man === 1 ? '' : part(man)) + '만';
  return s + part(rest);
}
const NAT_ONE = ['', '한', '두', '세', '네', '다섯', '여섯', '일곱', '여덟', '아홉'];
const NAT_TEN = ['', '열', '스물', '서른', '마흔', '쉰', '예순', '일흔', '여든', '아흔'];
function native(n) { // 1~99, 단위 앞 (관형형)
  if (n === 20) return '스무';
  return NAT_TEN[Math.floor(n / 10)] + NAT_ONE[n % 10];
}
function decimal(str) { // 1.5 → 일점오
  const p = String(str).split('.');
  return sino(p[0]) + (p[1] ? '점' + p[1].split('').map(function (d) { return d === '0' ? '영' : SINO_D[d]; }).join('') : '');
}
const NATIVE_COUNTERS = ['작은술', '큰술', '숟가락', '스푼', '꼬집', '주먹', '방울', '덩이', '조각', '그릇', '봉지', '송이', '마리', '시간', '번째', '사람', '걸음', '군데', '마디', '컵', '개', '번', '장', '줌', '가지', '알', '쪽', '시', '통', '줄', '판', '살', '모', '명', '권', '잔', '곳'];
// 단위처럼 보이지만 한자어 수로 읽는 낱말 (1개월 → 일개월, 3명상 X)
const NOT_NATIVE = ['개월', '번지', '명상', '시작', '시기', '시대', '시장', '시즌', '장기', '장점', '통계'];
const UNITS = [['kcal', '킬로칼로리'], ['Kcal', '킬로칼로리'], ['°C', '도'], ['℃', '도'], ['°', '도'], ['%', '퍼센트'], ['kg', '킬로그램'], ['mL', '밀리리터'], ['ml', '밀리리터'], ['cc', '씨씨'], ['cm', '센티미터'], ['mm', '밀리미터'], ['g', '그램'], ['L', '리터'], ['W', '와트']];
const RANGE_NATIVE = { '1-2': '한두', '2-3': '두세', '3-4': '서너', '4-5': '네다섯', '5-6': '대여섯', '6-7': '예닐곱' };
function nativeCounterOf(word) {
  if (NOT_NATIVE.some(function (c) { return word.indexOf(c) === 0; })) return '';
  return NATIVE_COUNTERS.find(function (c) { return word.indexOf(c) === 0; }) || '';
}
function koSpeech(text) {
  let s = String(text || '');
  RESPELL.forEach(function (r) { s = s.split(r[0]).join(r[1]); });
  // 성경 장절: 41:10 → 사십일장십절 (띄어쓰기 수는 그대로)
  s = s.replace(/(\d+):(\d+)/g, function (m, a, b) { return sino(a) + '장' + sino(b) + '절'; });
  s = s.replace(/(\d+)장(\s?)(\d+)절/g, function (m, a, sp, b) { return sino(a) + '장' + sp + sino(b) + '절'; });
  // 분수: 1/2컵 → 반컵, 1/3 → 삼분의일
  s = s.replace(/(\d+)\/(\d+)(\s?)([가-힣]*)/g, function (m, a, b, sp, word) {
    if (a === '1' && b === '2' && word) return '반' + sp + word;
    return sino(b) + '분의' + sino(a) + sp + word;
  });
  // 숫자 (범위·소수·쉼표) + 띄어쓰기 1칸까지 + 단위/한글 낱말
  const unitAlt = UNITS.map(function (u) { return u[0].replace(/[°%]/g, '\\$&'); }).join('|');
  const re = new RegExp('(\\d[\\d,]*(?:\\.\\d+)?)(?:([~\\-–])(\\d[\\d,]*(?:\\.\\d+)?))?(\\s?)(' + unitAlt + '|[가-힣]+)?', 'g');
  s = s.replace(re, function (m, a, dash, b, sp, word) {
    word = word || '';
    const A = a.split(',').join(''), B = b ? b.split(',').join('') : '';
    const unit = UNITS.find(function (u) { return u[0] === word; });
    const nc = unit ? '' : nativeCounterOf(word);
    const isInt = function (x) { return /^\d+$/.test(x); };
    const ordinal = nc === '번째';
    if (nc && isInt(A) && Number(A) >= 1 && Number(A) <= 99 && (!B || (isInt(B) && Number(B) <= 99))) {
      const nat = function (x) { return ordinal && Number(x) === 1 ? '첫' : native(Number(x)); };
      if (B) return (RANGE_NATIVE[A + '-' + B] || (nat(A) + '에서' + nat(B))) + sp + word;
      return nat(A) + sp + word;
    }
    // 1.5컵 → 한컵반
    if (nc && /^\d+\.5$/.test(A) && !B && Number(A) >= 1 && Number(A) < 99) return native(Math.floor(Number(A))) + sp + word.slice(0, nc.length) + '반' + word.slice(nc.length);
    // 6월 → 유월, 10월 → 시월
    if (!B && word.indexOf('월') === 0 && (A === '6' || A === '10')) return (A === '6' ? '유' : '시') + sp + word;
    const num = function (x) { return x.indexOf('.') >= 0 ? decimal(x) : sino(x); };
    let spoken;
    if (B) spoken = (isInt(A) && isInt(B) && A.length === 1 && Number(B) === Number(A) + 1) ? num(A) + num(B) : num(A) + '에서' + num(B);
    else spoken = num(A);
    return spoken + sp + (unit ? unit[1] : word);
  });
  return s;
}

// Claude 롱폼 대본(JSON)을 검증하고 장면을 한 줄로 펼친다 (장면마다 chapter 번호).
const raw = String($json.content && $json.content[0] && $json.content[0].text || '');
const stop = $json.stop_reason || '';
let clean = raw.replace(/```json|```/g, '').trim();
const tryParse = t => { try { return JSON.parse(t); } catch (e) { return null; } };
const sliceBraces = t => { const s = t.indexOf('{'), e = t.lastIndexOf('}'); return (s !== -1 && e > s) ? t.slice(s, e + 1) : t; };
let parsed = tryParse(clean);
if (typeof parsed === 'string') parsed = tryParse(parsed);
if (!parsed) parsed = tryParse(sliceBraces(clean));
if (!parsed) {
  const fixed = sliceBraces(clean).replace(/([^\s{\[,:])"([^\s,}\]:])/g, '$1”$2');
  parsed = tryParse(fixed);
}
if (!parsed) throw new Error('Claude 롱폼 JSON 파싱 실패' + (stop === 'max_tokens' ? ' (응답이 max_tokens에서 잘림)' : '') + ' — 앞 300자: ' + clean.slice(0, 300));

const src = $('Build Longform Request').first().json;
const subtitleLang = String(src.Language || 'Korean').trim().toLowerCase() === 'english' ? 'en' : 'ko';
const maxImages = Number(src.maxImages) || 90;
const s = v => String(v == null ? '' : v).replace(/["]/g, '”').trim();

const chaptersIn = (Array.isArray(parsed.chapters) ? parsed.chapters : []).filter(c => c && Array.isArray(c.scenes) && c.scenes.length);
if (chaptersIn.length < 3) throw new Error('챕터가 너무 적습니다: ' + chaptersIn.length + '개');

const TONES = ['playful', 'curious', 'excited', 'surprised', 'thoughtful', 'warm', 'serious', 'mischievously', 'chuckles', 'sighs', 'whispers'];   // v3 음성 연기 표시 (장면 맨 앞에 [tone]으로 붙는다)
const chapters = [];
const scenes = [];
chaptersIn.forEach((c, ci) => {
  const title = s(c.title).slice(0, 40) || ('Part ' + (ci + 1));
  chapters.push({ title });
  c.scenes.forEach((sc, si) => {
    const narration = s(sc && sc.narration).replace(/\s*\n\s*/g, ' ').replace(/[\[\]]/g, '');
    if (!narration) return;
    let visual = sc && typeof sc.visual === 'object' && sc.visual ? sc.visual : { type: 'headline', text: narration.slice(0, 18) };
    // 챕터 첫 장면은 챕터 표지 (1장 제외), 그 밖의 chapter 타입은 headline으로
    if (si === 0 && ci > 0) visual = { type: 'chapter', title, number: ci + 1, highlight: [] };
    else if (visual.type === 'chapter') visual = { type: 'headline', text: s(visual.title || visual.text || narration.slice(0, 18)) };
    const tone = TONES.indexOf(s(sc && sc.tone).toLowerCase()) >= 0 ? s(sc.tone).toLowerCase() : '';
    scenes.push({ narration, tone, visual, chapter: ci });
  });
});
if (scenes.length < 60) throw new Error('장면이 너무 적습니다: ' + scenes.length + '개');
if (scenes.length > 260) scenes.splice(260);

const MOODS = ['calm_reflective', 'hopeful_uplifting', 'tense_dramatic', 'dark_serious', 'warm_gentle'];
const CATEGORIES = ['bible', 'quote', 'wealth', 'health', 'other'];
// 읽기용 변환 (한국어): TTS에는 숫자·단위를 한글 읽기로 푼 문장(narration), 자막에는 원래 표기(display)
for (const x of scenes) { x.display = x.narration; if (subtitleLang === 'ko') x.narration = koSpeech(x.narration); }
const displayScript = scenes.map(x => x.display).join('\n');
const script = scenes.map(x => x.narration).join('\n');
// ElevenLabs v3: 한 번에 5,000자까지 → 장면 경계에서 4,500자 이하 조각으로 나눈다. 장면마다 [tone]을 앞에 붙인다
const TTS_CHUNK = 4500;
const ttsChunks = [];
{ let cur = [];
  for (const x of scenes) {
    const line = (x.tone ? '[' + x.tone + '] ' : '') + x.narration;
    if (cur.length && (cur.join('\n').length + 1 + line.length) > TTS_CHUNK) { ttsChunks.push(cur.join('\n')); cur = []; }
    cur.push(line);
  }
  if (cur.length) ttsChunks.push(cur.join('\n')); }
const isSermon = /아멘|Amen/.test(displayScript.slice(-400)) || String(parsed.category) === 'bible';
let category = String(parsed.category || '').trim().toLowerCase();
if (!CATEGORIES.includes(category)) category = isSermon ? 'bible' : 'other';
const mood = MOODS.includes(parsed.mood) ? parsed.mood : 'calm_reflective';
const styleFit = ['hud', 'classic', 'pop', 'keynote', 'editorial', 'either'].includes(String(parsed.style || '').trim().toLowerCase()) ? String(parsed.style).trim().toLowerCase() : 'either';

// AI 그림: 이미지 장면 + 그래픽 장면 뒤 사진 배경(bg)을 합쳐 상한까지. 이미지 장면은 3개 연속 금지
const promptOk = t => String(t || '').replace(/[^a-z]/gi, '').length >= 15;
let imageCount = 0, bgCount = 0, run = 0;
for (const x of scenes) {
  const v = x.visual;
  if (v.type === 'image') {
    if (promptOk(v.prompt) && run < 2 && imageCount + bgCount < maxImages) { imageCount++; run++; continue; }
    // 그림 장면이 넘치면 큰 글씨 장면으로 바꾸되, 그 그림을 배경으로 깐다 (글씨만 나오는 화면 방지)
    x.visual = { type: 'headline', text: s(v.text || x.display.slice(0, 18)), highlight: v.highlight || [], bg: v.prompt, bgFootage: v.footage };
  }
  run = 0;
  if (x.visual.bg) {
    if (promptOk(x.visual.bg) && x.visual.type !== 'chapter' && x.visual.type !== 'outro' && imageCount + bgCount < maxImages) bgCount++;
    else { delete x.visual.bg; delete x.visual.bgFootage; }
  }
}
if (isSermon) for (const x of scenes) if (x.visual.type === 'stat' || x.visual.type === 'chart') x.visual = { type: 'headline', text: x.display.slice(0, 18), highlight: [] };
// 마지막 장면만 outro
scenes.forEach((x, i) => { if (x.visual.type === 'outro' && i !== scenes.length - 1) x.visual = { type: 'headline', text: s(x.visual.text), highlight: x.visual.highlight || [] }; });

const len = subtitleLang === 'en' ? displayScript.split(/\s+/).length : displayScript.length;
// 하한은 너무 짧은 대본만 막고, 상한은 ElevenLabs 한 번 요청 한도(10,000자) 아래로
const [lo, hi] = subtitleLang === 'en' ? [2200, 3800] : [5500, 9600];
if (len < lo) throw new Error('대본이 너무 짧습니다: ' + len + (subtitleLang === 'en' ? '단어' : '자') + ' (최소 ' + lo + ') — 다시 실행하세요');
if (len > hi) throw new Error('대본이 너무 깁니다: ' + len + (subtitleLang === 'en' ? '단어' : '자') + ' (최대 ' + hi + ')');
const warnings = [];
if (ttsChunks.some(t => t.length > 4990)) throw new Error('장면 하나가 너무 깁니다 (ElevenLabs v3 한 번 한도 5,000자) — 다시 실행하세요');
if (subtitleLang === 'ko' && len < 7000) warnings.push('대본 ' + len + '자 — 목표(7,000자 이상)보다 짧음');

const th = parsed.thumbnail || {};
const thumbnail = { text: s(th.text).slice(0, 24) || s(parsed.title).slice(0, 20), highlight: (Array.isArray(th.highlight) ? th.highlight : []).map(s).slice(0, 2), badge: s(th.badge).slice(0, 14), prompt: s(th.prompt) };
const hashtags = (Array.isArray(parsed.hashtags) ? parsed.hashtags : []).map(s).filter(h => h.startsWith('#')).slice(0, 3);
const tags = (Array.isArray(parsed.tags) ? parsed.tags : []).map(t => s(t).replace(/^#/, '')).filter(Boolean);
let tagStr = '';
for (const t of tags) { if ((tagStr + ',' + t).length > 450) break; tagStr = tagStr ? tagStr + ',' + t : t; }

const textOnly = scenes.filter(x => !['image', 'chapter', 'outro'].includes(x.visual.type) && !x.visual.bg).length;
console.log('글씨만 나오는 장면 ' + textOnly + ' | chars: ' + len + ' (읽기용 ' + script.length + ') | chapters: ' + chapters.length + ' | scenes: ' + scenes.length + ' | images: ' + imageCount + ' + bg ' + bgCount + ' | ' + category + '/' + mood + ' | style ' + styleFit + (warnings.length ? ' | ' + warnings.join(' ') : '') + ' | 음성 요청 ' + ttsChunks.length + '조각');
return [{ json: {
  title: s(parsed.title || src.Topic).slice(0, 100),
  description: s(parsed.description),
  hashtags, tagStr, script, ttsChunks, scenes, chapters, thumbnail,
  category, mood, styleFit, imageCount, bgCount, format: isSermon ? 'sermon' : 'essay',
  scriptLength: len, warnings,
  topic: src.Topic, language: src.Language || 'Korean', subtitleLang,
  shortVideoId: src.shortVideoId, shortViews: src.shortViews
} }];
