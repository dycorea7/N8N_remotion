// ===== 설정 =====
// 렌더용 GitHub 저장소 "아이디/저장소이름"
const GITHUB_REPO = 'dycorea7/N8N_remotion';
const GITHUB_BRANCH = 'main';
const MUSIC_VOLUME = 0.16;
// 영상 스타일: 'classic' = 기존 카드형 / 'glyph' = 글자로 그린 이미지·글자 바닥·네온 타이포 (참고 영상 스타일)
// 'hud' = 에디토리얼 HUD (추적 상자·태그 카드·플랩 숫자) / 'pop' = 원색 블록·초대형 타이포·도형 모핑 / 'keynote' = 애플 키노트풍 (오프화이트·검은 UI·리퀴드 글래스·커서)
// 'editorial' = 다큐 설명 영상풍 종이 콜라주 (크림 종이·큰 빨간 원·테이프 붙인 사진·빨간 마커·스톱모션)
const STYLE_BY_CATEGORY = { wealth: 'glyph' };
// ================

// 영상 스타일
//  - 카테고리 고정: STYLE_BY_CATEGORY (경제 = glyph)
//  - 설교·성경: 항상 classic
//  - 나머지: Claude가 주제에 맞다고 고른 스타일(hud / classic / pop / keynote / editorial). 'either'면 다섯 가지를 날마다 돌아가며 쓴다
const ROTATION = ['classic', 'hud', 'pop', 'keynote', 'editorial'];
function pickStyle(p) {
  if (STYLE_BY_CATEGORY[p.category]) return STYLE_BY_CATEGORY[p.category];
  if (p.format === 'sermon' || p.category === 'bible') return 'classic';
  if (ROTATION.includes(p.styleFit)) return p.styleFit;
  return ROTATION[Math.floor(Date.now() / 86400000) % ROTATION.length];
}

if (!GITHUB_REPO) throw new Error('Build Render Job 노드의 GITHUB_REPO에 저장소 이름(아이디/저장소)을 입력하세요');

const p = $('Parse Script JSON').first().json;
const tts = $('ElevenLabs TTS (timestamps)').first().json;
if (!tts.audio_base64 || !tts.alignment) throw new Error('ElevenLabs 응답에 audio_base64/alignment가 없습니다: ' + JSON.stringify(tts).slice(0, 300));

// ── fal.ai 결과를 장면에 붙인다 (요청 순서 = 응답 순서). 실패한 장면은 렌더러가 텍스트 장면으로 바꾼다 ──
const scenes = JSON.parse(JSON.stringify(p.scenes));
let imagesOk = 0, imagesFailed = 0;
const failures = [];
let reqs = [], res = [];
try { reqs = $('Prepare Image Jobs').all(); } catch (e) { /* 이미지 단계 없음 */ }
try { res = $('fal.ai Generate Image').all(); } catch (e) { /* 이미지가 하나도 없던 실행 */ }
reqs.forEach((r, k) => {
  if (r.json.skip) return;
  const idx = r.json.sceneIndex;
  const out = res[k] && res[k].json;
  const url = out && out.images && out.images[0] && out.images[0].url;
  // kind 'bg' = 그래픽 장면 뒤 사진 배경 → visual.bgSrc / 그 밖 = 이미지 장면 → visual.src
  if (url && scenes[idx]) { if (r.json.kind === 'bg') scenes[idx].visual.bgSrc = url; else scenes[idx].visual.src = url; imagesOk++; }
  else { imagesFailed++; failures.push('장면 ' + (idx + 1) + ': ' + JSON.stringify(out && (out.error || out.detail) || 'no image').slice(0, 160)); }
});
// 실사 영상(Pixabay): 영상 + 같은 영상의 정지 화면(src). 렌더러가 영상을 못 받으면 정지 화면으로 남는다
let footage = {};
try { footage = $('Pick Footage').first().json.picks || {}; } catch (e) { /* 실사 영상 단계 없음 */ }
let clips = 0;
Object.keys(footage).forEach(k => {
  const s = scenes[Number(k)], f = footage[k];
  if (!s || !s.visual || s.visual.type !== 'image' || !f.video) return;
  s.visual.video = f.video; s.visual.videoStart = f.videoStart || 0;
  if (!s.visual.src) s.visual.src = f.poster;
  clips++;
});
for (const s of scenes) if (s.visual) { delete s.visual.prompt; delete s.visual.bg; delete s.visual.footage; } // 렌더러에는 필요 없음
// 처음-끝 이어짐: 마지막 장면 뒤에 첫 장면 그림을 깔아, 쇼츠가 다시 시작될 때 화면이 끊기지 않고 이어지게 한다
const firstV = scenes[0] && scenes[0].visual, lastV = scenes.length > 1 && scenes[scenes.length - 1].visual;
const firstPic = firstV && (firstV.type === 'image' ? firstV.src : firstV.bgSrc);
if (lastV && firstPic && lastV.type !== 'image') lastV.bgSrc = firstPic;

// ── 배경음악: 드라이브 라이브러리에서 무드에 맞는 곡 하나 ──
let musicUrl = '', musicName = 'none';
let files = [];
try { files = $('List Music Files').all().map(i => i.json).filter(f => f && f.id && f.name); } catch (e) { /* 폴더 조회 실패 */ }
const lower = f => f.name.toLowerCase();
const MOODS = ['calm_reflective', 'hopeful_uplifting', 'tense_dramatic', 'dark_serious', 'warm_gentle'];
let pool = [];
if (p.format === 'sermon') pool = files.filter(f => lower(f).startsWith('hymn'));
if (!pool.length) pool = files.filter(f => lower(f).startsWith(p.mood));
if (!pool.length) pool = files.filter(f => MOODS.some(m => lower(f).startsWith(m)));
if (pool.length) {
  const pick = pool[Math.floor(Math.random() * pool.length)];
  musicUrl = 'https://drive.google.com/uc?export=download&id=' + pick.id;
  musicName = pick.name;
}

const jobId = 'ms_' + $now.toFormat('yyyyMMdd_HHmmss') + '_' + Math.random().toString(36).slice(2, 7);
const job = {
  job_id: jobId, lang: p.subtitleLang, category: p.category, title: p.title,
  scenes, alignment: tts.alignment, audio_base64: tts.audio_base64,
  music_url: musicUrl, music_volume: MUSIC_VOLUME, style: pickStyle(p)
};
const text = JSON.stringify(job);
console.log('job ' + jobId + ' | style ' + job.style + ' (fit ' + (p.styleFit || '-') + ') | ' + Math.round(text.length / 1024) + 'KB | images ' + imagesOk + ' ok / ' + imagesFailed + ' failed | music: ' + musicName);
if (failures.length) console.log('image failures: ' + failures.join(' | '));

return [{
  json: { jobId, repo: GITHUB_REPO, branch: GITHUB_BRANCH, imagesOk, imagesFailed, clips, musicName, sceneTypes: scenes.map(s => s.visual && s.visual.video ? 'video' : s.visual && s.visual.src ? 'image' : (s.visual && s.visual.type === 'image' ? 'headline' : s.visual && s.visual.type)).join(' → ') },
  binary: { data: { data: Buffer.from(text, 'utf8').toString('base64'), mimeType: 'application/json', fileName: jobId + '.json' } }
}];
