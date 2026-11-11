// ===== 설정 =====
// 렌더용 GitHub 저장소 "아이디/저장소이름". 예: 'dycorea7/motion-shorts'
const GITHUB_REPO = 'dycorea7/N8N_remotion';
const GITHUB_BRANCH = 'main';
const MUSIC_VOLUME = 0.10;   // 롱폼은 오래 들으니 쇼츠보다 낮게
// 영상 스타일: 'classic' = 기존 카드형 / 'glyph' = 글자로 그린 이미지·글자 바닥·네온 타이포 (참고 영상 스타일)
// 롱폼은 글리프를 쓰지 않는다 (렌더가 너무 오래 걸림). 'hud' = 에디토리얼 HUD / 'pop' = 원색 블록·초대형 타이포·도형 모핑 / 'keynote' = 애플 키노트풍 (오프화이트·검은 UI·리퀘드 글래스·커서)
// 'editorial' = 다큐 설명 영상풍 종이 콜라주 (크림 종이·큰 빨간 원·테이프 붙인 사진·빨간 마커·스톱모션)
// 'bank' = 모바일 은행 앱·영수증 (잔액 카운터·소비 분석 막대·자동이체 토글·영수증 출력·이체 완료 화면). 돈 주제 전용
const STYLE_BY_CATEGORY = { wealth: 'bank' };
// ================

// 영상 스타일
//  - 카테고리 고정: STYLE_BY_CATEGORY (돈·경제 = bank). 롱폼 고정 스타일(FORCE_STYLE)보다 먼저
//  - 설교·성경: 항상 classic
//  - 나머지: Claude가 주제에 맞다고 고른 스타일(hud / classic / pop / keynote / editorial). 'either'면 다섯 가지를 날마다 돌아가며 쓴다
const ROTATION = ['classic', 'hud', 'pop', 'keynote', 'editorial'];
// 롱폼 스타일 고정 (빈 문자열이면 아래 규칙대로 고른다)
const FORCE_STYLE = 'editorial';
// 한 번만 쓰는 스타일 지정: 이 날짜 전까지 만드는 롱폼은 이 스타일로 (10/27 화요일 롱폼 = 키노트). 지나면 자동으로 원래대로
const ONE_OFF_STYLE = { style: 'keynote', before: '2026-10-28T00:00:00-04:00' };
function pickStyle(p) {
  if (STYLE_BY_CATEGORY[p.category]) return STYLE_BY_CATEGORY[p.category];
  if (FORCE_STYLE) return FORCE_STYLE;
  if (ONE_OFF_STYLE.style && Date.now() < Date.parse(ONE_OFF_STYLE.before)) return ONE_OFF_STYLE.style;
  if (STYLE_BY_CATEGORY[p.category]) return STYLE_BY_CATEGORY[p.category];
  if (p.format === 'sermon' || p.category === 'bible') return 'classic';
  if (ROTATION.includes(p.styleFit)) return p.styleFit;
  return ROTATION[Math.floor(Date.now() / 86400000) % ROTATION.length];
}

if (!GITHUB_REPO) throw new Error('Build Render Job 노드의 GITHUB_REPO에 저장소 이름(아이디/저장소)을 입력하세요');

const p = $('Parse Longform Script').first().json;
// 나레이션 음성(롱폼은 약 15~20MB)은 실행 데이터에 넣지 않고 드라이브 파일로 넘긴다 → 렌더 기다리는 동안 n8n이 큰 데이터를 저장하다 멈추지 않게
const tts = $('TTS Unpack').first().json;
const voiceId = $('Upload Voice to Drive').first().json.id;   // 공유(Share Voice File) 결과의 id는 파일 id가 아니라 'anyoneWithLink'
if (!tts.alignment || !voiceId) throw new Error('나레이션 음성 또는 타이밍(alignment)이 없습니다: ' + JSON.stringify(tts).slice(0, 300));

// ── fal.ai 결과를 장면에 붙인다 (요청 순서 = 응답 순서). 실패한 장면은 렌더러가 텍스트 장면으로 바꾼다 ──
const scenes = JSON.parse(JSON.stringify(p.scenes)); // 장면마다 chapter 번호가 있다
let imagesOk = 0, imagesFailed = 0, clips = 0, bgClips = 0;
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
// ── 실사 영상(Pixabay): 이미지 장면은 화면 가득(video), 그래픽 장면은 그 뒤 배경(bgVideo). 정지 화면(src/bgSrc)도 넣어 영상을 못 받으면 사진으로 남는다 ──
let footage = {};
try { footage = $('Pick Footage').first().json.picks || {}; } catch (e) {}
for (const k of Object.keys(footage)) {
  const sc = scenes[Number(k)], f = footage[k];
  if (!sc || !sc.visual || !f.video) continue;
  if (f.kind === 'bg') {
    if (['image', 'chapter', 'outro'].includes(sc.visual.type)) continue;
    sc.visual.bgVideo = f.video; sc.visual.bgVideoStart = f.videoStart || 0;
    if (!sc.visual.bgSrc) sc.visual.bgSrc = f.poster;
    bgClips++;
    continue;
  }
  if (sc.visual.type !== 'image') continue;
  sc.visual.video = f.video; sc.visual.videoStart = f.videoStart || 0;
  if (!sc.visual.src) sc.visual.src = f.poster;
  clips++;
}
for (const s of scenes) if (s.visual) { delete s.visual.prompt; delete s.visual.bg; delete s.visual.footage; delete s.visual.bgFootage; } // 렌더러에는 필요 없음
const textOnly = scenes.filter(s => { const v = s.visual || {}; return !['image', 'chapter', 'outro'].includes(v.type) && !v.bgSrc; }).length;

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
  scenes, alignment: tts.alignment, audio_url: 'https://drive.google.com/uc?export=download&id=' + voiceId,
  music_url: musicUrl, music_volume: MUSIC_VOLUME, style: pickStyle(p)
};
const text = JSON.stringify(job);
console.log('job ' + jobId + ' | ' + Math.round(text.length / 1024) + 'KB | 실사 영상 ' + clips + ' + 그래픽 뒤 ' + bgClips + ' | AI 그림 ' + imagesOk + ' ok / ' + imagesFailed + ' failed | 글씨만 나오는 장면 ' + textOnly + ' | music: ' + musicName);
if (failures.length) console.log('image failures: ' + failures.join(' | '));

return [{
  json: { jobId, repo: GITHUB_REPO, branch: GITHUB_BRANCH, imagesOk, imagesFailed, clips: clips + bgClips, textOnly, thumbImage: !!thumbSrc, musicName, sceneCount: scenes.length, jobKB: Math.round(text.length / 1024) },
  binary: { data: { data: Buffer.from(text, 'utf8').toString('base64'), mimeType: 'application/json', fileName: jobId + '.json' } }
}];