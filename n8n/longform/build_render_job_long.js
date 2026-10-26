// ===== 설정 =====
// 렌더용 GitHub 저장소 "아이디/저장소이름". 예: 'dycorea7/motion-shorts'
const GITHUB_REPO = 'dycorea7/N8N_remotion';
const GITHUB_BRANCH = 'main';
const MUSIC_VOLUME = 0.10;   // 롱폼은 오래 들으니 쇼츠보다 낮게
// 영상 스타일: 'classic' = 기존 카드형 / 'glyph' = 글자로 그린 이미지·글자 바닥·네온 타이포 (참고 영상 스타일)
// 롱폼은 글리프를 쓰지 않는다 (렌더가 너무 오래 걸림). 'hud' = 에디토리얼 HUD / 'pop' = 원색 블록·초대형 타이포·도형 모핑 / 'keynote' = 애플 키노트풍 (오프화이트·검은 UI·리퀴드 글래스·커서)
// 'editorial' = 다큐 설명 영상풍 종이 콜라주 (크림 종이·큰 빨간 원·테이프 붙인 사진·빨간 마커·스톱모션)
const STYLE_BY_CATEGORY = {};
// ================

// 영상 스타일
//  - 카테고리 고정: STYLE_BY_CATEGORY (경제 = glyph)
//  - 설교·성경: 항상 classic
//  - 나머지: Claude가 주제에 맞다고 고른 스타일(hud / classic / pop / keynote / editorial). 'either'면 다섯 가지를 날마다 돌아가며 쓴다
const ROTATION = ['classic', 'hud', 'pop', 'keynote', 'editorial'];
// 한 번만 쓰는 스타일 지정: 이 날짜 전까지 만드는 롱폼은 이 스타일로 (10/27 화요일 롱폼 = 키노트). 지나면 자동으로 원래대로
const ONE_OFF_STYLE = { style: 'keynote', before: '2026-10-28T00:00:00-04:00' };
function pickStyle(p) {
  if (ONE_OFF_STYLE.style && Date.now() < Date.parse(ONE_OFF_STYLE.before)) return ONE_OFF_STYLE.style;
  if (STYLE_BY_CATEGORY[p.category]) return STYLE_BY_CATEGORY[p.category];
  if (p.format === 'sermon' || p.category === 'bible') return 'classic';
  if (ROTATION.includes(p.styleFit)) return p.styleFit;
  return ROTATION[Math.floor(Date.now() / 86400000) % ROTATION.length];
}

if (!GITHUB_REPO) throw new Error('Build Render Job 노드의 GITHUB_REPO에 저장소 이름(아이디/저장소)을 입력하세요');

const p = $('Parse Longform Script').first().json;
const tts = $('ElevenLabs TTS (timestamps)').first().json;
if (!tts.audio_base64 || !tts.alignment) throw new Error('ElevenLabs 응답에 audio_base64/alignment가 없습니다: ' + JSON.stringify(tts).slice(0, 300));

// ── fal.ai 결과를 장면에 붙인다 (요청 순서 = 응답 순서). 실패한 장면은 렌더러가 텍스트 장면으로 바꾼다 ──
const scenes = JSON.parse(JSON.stringify(p.scenes)); // 장면마다 chapter 번호가 있다
let imagesOk = 0, imagesFailed = 0;
const failures = [];
let reqs = [], res = [];
try { reqs = $('Prepare Image Jobs').all(); } catch (e) { /* 이미지 단계 없음 */ }
try { res = $('fal.ai Generate Image').all(); } catch (e) { /* 이미지가 하나도 없던 실행 */ }
let thumbSrc = '';
reqs.forEach((r, k) => {
  if (r.json.skip) return;
  const idx = r.json.sceneIndex;
  const out = res[k] && res[k].json;
  const url = out && out.images && out.images[0] && out.images[0].url;
  if (idx === -1) { if (url) thumbSrc = url; else failures.push('썸네일 이미지 실패'); return; }
  // kind 'bg' = 그래픽 장면 뒤 사진 배경 → visual.bgSrc / 그 밖 = 이미지 장면 → visual.src
  if (url && scenes[idx]) { if (r.json.kind === 'bg') scenes[idx].visual.bgSrc = url; else scenes[idx].visual.src = url; imagesOk++; }
  else { imagesFailed++; failures.push('장면 ' + (idx + 1) + ': ' + JSON.stringify(out && (out.error || out.detail) || 'no image').slice(0, 160)); }
});
for (const s of scenes) if (s.visual) { delete s.visual.prompt; delete s.visual.bg; } // 렌더러에는 필요 없음

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

const jobId = 'lf_' + $now.toFormat('yyyyMMdd_HHmmss') + '_' + Math.random().toString(36).slice(2, 7);
const job = {
  job_id: jobId, format: 'long', fps: 24, lang: p.subtitleLang, category: p.category, title: p.title,
  chapters: p.chapters, thumbnail: Object.assign({}, p.thumbnail, { src: thumbSrc }),
  scenes, alignment: tts.alignment, audio_base64: tts.audio_base64,
  music_url: musicUrl, music_volume: MUSIC_VOLUME, style: pickStyle(p)
};
const text = JSON.stringify(job);
console.log('job ' + jobId + ' | ' + Math.round(text.length / 1024) + 'KB | images ' + imagesOk + ' ok / ' + imagesFailed + ' failed | music: ' + musicName);
if (failures.length) console.log('image failures: ' + failures.join(' | '));

return [{
  json: { jobId, repo: GITHUB_REPO, branch: GITHUB_BRANCH, imagesOk, imagesFailed, thumbImage: !!thumbSrc, musicName, sceneCount: scenes.length, jobKB: Math.round(text.length / 1024) },
  binary: { data: { data: Buffer.from(text, 'utf8').toString('base64'), mimeType: 'application/json', fileName: jobId + '.json' } }
}];
