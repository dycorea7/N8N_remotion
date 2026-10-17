// ===== 설정 =====
// 렌더용 GitHub 저장소 "아이디/저장소이름"
const GITHUB_REPO = 'dycorea7/N8N_remotion';
const GITHUB_BRANCH = 'main';
const MUSIC_VOLUME = 0.16;
// 영상 스타일: 'classic' = 기존 카드형 / 'glyph' = 글자로 그린 이미지·글자 바닥·네온 타이포 (참고 영상 스타일)
const VIDEO_STYLE = 'classic';
// ================

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
  if (url && scenes[idx]) { scenes[idx].visual.src = url; imagesOk++; }
  else { imagesFailed++; failures.push('장면 ' + (idx + 1) + ': ' + JSON.stringify(out && (out.error || out.detail) || 'no image').slice(0, 160)); }
});
for (const s of scenes) if (s.visual) delete s.visual.prompt; // 렌더러에는 필요 없음

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
  music_url: musicUrl, music_volume: MUSIC_VOLUME, style: VIDEO_STYLE
};
const text = JSON.stringify(job);
console.log('job ' + jobId + ' | ' + Math.round(text.length / 1024) + 'KB | images ' + imagesOk + ' ok / ' + imagesFailed + ' failed | music: ' + musicName);
if (failures.length) console.log('image failures: ' + failures.join(' | '));

return [{
  json: { jobId, repo: GITHUB_REPO, branch: GITHUB_BRANCH, imagesOk, imagesFailed, musicName, sceneTypes: scenes.map(s => s.visual && s.visual.src ? 'image' : (s.visual && s.visual.type === 'image' ? 'headline' : s.visual && s.visual.type)).join(' → ') },
  binary: { data: { data: Buffer.from(text, 'utf8').toString('base64'), mimeType: 'application/json', fileName: jobId + '.json' } }
}];
