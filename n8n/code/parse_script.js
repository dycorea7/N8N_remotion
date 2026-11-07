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

const raw = String($json.content && $json.content[0] && $json.content[0].text || '');
let clean = raw.replace(/```json|```/g, '').trim();
const tryParse = t => { try { return JSON.parse(t); } catch (e) { return null; } };
const sliceBraces = t => { const s = t.indexOf('{'), e = t.lastIndexOf('}'); return (s !== -1 && e > s) ? t.slice(s, e + 1) : t; };

let parsed = tryParse(clean);
if (typeof parsed === 'string') parsed = tryParse(parsed);
if (!parsed) parsed = tryParse(sliceBraces(clean));
if (!parsed) {
  // 값 안에 이스케이프 안 된 " 가 섞인 경우: 따옴표 사이 한 글자 " 를 ” 로 바꿔 재시도
  const fixed = sliceBraces(clean).replace(/([^\s{\[,:])"([^\s,}\]:])/g, '$1”$2');
  parsed = tryParse(fixed);
}
if (!parsed) throw new Error('Claude 응답 JSON 파싱 실패 — 앞 400자: ' + clean.slice(0, 400));

const src = $('Build Claude Request').first().json;
const langKey = String(src.Language || 'Korean').trim().toLowerCase();
const subtitleLang = langKey === 'english' ? 'en' : 'ko';

// ── 장면 검증 ──
const TONES = ['playful', 'curious', 'excited', 'surprised', 'thoughtful', 'warm', 'serious', 'mischievously', 'chuckles', 'sighs', 'whispers'];   // v3 음성 연기 표시 (장면 맨 앞에 [tone]으로 붙는다)
const scenes = (Array.isArray(parsed.scenes) ? parsed.scenes : [])
  .map(s => ({
    narration: String(s && s.narration || '').replace(/\s*\n\s*/g, ' ').replace(/["]/g, '”').replace(/[\[\]]/g, '').trim(),
    tone: TONES.indexOf(String(s && s.tone || '').trim().toLowerCase()) >= 0 ? String(s.tone).trim().toLowerCase() : '',
    visual: s && typeof s.visual === 'object' ? s.visual : null
  }))
  .filter(s => s.narration.length > 0);
if (scenes.length < 4) throw new Error('장면이 너무 적습니다: ' + scenes.length + '개');
if (scenes.length > 12) scenes.splice(12);

// 읽기용 변환 (한국어): TTS에는 숫자·단위를 한글 읽기로 푼 문장(narration), 자막에는 원래 표기(display)
for (const s of scenes) { s.display = s.narration; if (subtitleLang === 'ko') s.narration = koSpeech(s.narration); }
const displayScript = scenes.map(s => s.display).join('\n');
const script = scenes.map(s => s.narration).join('\n');
// ElevenLabs v3에 보내는 글: 장면마다 [tone]을 앞에 붙인다 (자막·장면 타이밍은 Build Render Job에서 tone을 뺀 script 기준)
const ttsScript = scenes.map(s => (s.tone ? '[' + s.tone + '] ' : '') + s.narration).join('\n');
const MAX_CHARS = subtitleLang === 'en' ? 1150 : 900;
if (displayScript.length > MAX_CHARS) throw new Error('대본이 너무 깁니다: ' + displayScript.length + '자 (상한 ' + MAX_CHARS + ')');

const MOODS = ['calm_reflective', 'hopeful_uplifting', 'tense_dramatic', 'dark_serious', 'warm_gentle'];
const CATEGORIES = ['bible', 'quote', 'wealth', 'health', 'other'];
let format = String(parsed.format || '').trim().toLowerCase();
if (format !== 'sermon' && format !== 'essay') format = /아멘|Amen/.test(displayScript) ? 'sermon' : 'essay';
let category = String(parsed.category || '').trim().toLowerCase();
if (!CATEGORIES.includes(category)) category = format === 'sermon' ? 'bible' : 'other';
const mood = MOODS.includes(parsed.mood) ? parsed.mood : 'calm_reflective';
// 영상 스타일 적합도 (hud / classic / pop / keynote / editorial / either). 실제 선택은 Build Render Job에서
const styleFit = ['hud', 'classic', 'pop', 'keynote', 'editorial', 'either'].includes(String(parsed.style || '').trim().toLowerCase()) ? String(parsed.style).trim().toLowerCase() : 'either';

// ── AI 그림: 이미지 장면 + 그래픽 장면 뒤 사진 배경(bg)을 합쳐 상한까지 (앞 장면부터) ──
//    이미지 장면이 넘치면 같은 키워드의 headline, 사진 배경이 넘치면 배경 없이
const useImages = src.useImages !== false;
const maxImages = Number(src.maxImages) || 14;
const promptOk = t => String(t || '').replace(/[^a-z]/gi, '').length >= 15;
let imageCount = 0, bgCount = 0;
for (const s of scenes) {
  const v = s.visual;
  if (!v) continue;
  if (v.type === 'image') {
    if (useImages && promptOk(v.prompt) && imageCount + bgCount < maxImages) { imageCount++; continue; }
    // 그림 장면이 넘치면 큰 글씨 장면으로 바꾸되, 그 그림을 배경으로 깐다 (글씨만 나오는 화면 방지)
    s.visual = { type: 'headline', text: String(v.text || s.display.slice(0, 18)), highlight: v.highlight || [], bg: v.prompt, bgFootage: v.footage };
  }
  const w = s.visual;
  if (w.bg) {
    if (useImages && promptOk(w.bg) && w.type !== 'chapter' && imageCount + bgCount < maxImages) bgCount++;
    else { delete w.bg; delete w.bgFootage; }
  }
}

// 설교에는 숫자 그래픽을 쓰지 않는다
if (format === 'sermon') {
  for (const s of scenes) {
    if (s.visual && (s.visual.type === 'stat' || s.visual.type === 'chart')) s.visual = { type: 'headline', text: s.display.slice(0, 18), highlight: [] };
  }
}

const hashtags = Array.isArray(parsed.hashtags) ? parsed.hashtags : [];
const types = scenes.map(s => (s.visual && s.visual.type) || '?');
const textOnly = scenes.filter(s => s.visual && !['image', 'outro'].includes(s.visual.type) && !s.visual.bg).length;
console.log('글씨만 나오는 장면 ' + textOnly + ' | chars: ' + displayScript.length + '/' + MAX_CHARS + ' (읽기용 ' + script.length + ')' + ' | scenes: ' + scenes.length + ' [' + types.join(', ') + '] | ' + format + '/' + category + ' | mood: ' + mood + ' | style: ' + styleFit + ' | images: ' + imageCount + ' + bg ' + bgCount);

return [{ json: {
  title: String(parsed.title || src.Topic).slice(0, 100),
  // 롱폼 파생 쇼츠는 설명란 맨 위에 전체 영상 링크
  description: (src.LongURL ? '▶ 전체 영상 보기: ' + src.LongURL + '\n\n' : '') + String(parsed.description || '') + '\n\n' + hashtags.join(' '),
  hashtags, script, ttsScript, scenes, sceneTypes: types.join(' → '),
  format, category, mood, styleFit, imageCount, bgCount,
  topic: src.Topic, language: src.Language || 'Korean', subtitleLang, rowNumber: src.row_number
} }];
