// 폴더에 올린 Flow 클립을 장면에 붙여 렌더 작업 파일(job.json)을 만든다
const GITHUB_REPO = 'dycorea7/N8N_remotion';
const GITHUB_BRANCH = 'main';
const MUSIC_VOLUME = 0.14;
const p = $('Parse Script').first().json;
const tts = $('ElevenLabs TTS').first().json;
function stripTags(al) {
  const c = al.characters || [], st = al.character_start_times_seconds || [], en = al.character_end_times_seconds || [];
  const C = [], S = [], E = [];
  let inTag = false, skipSpace = false;
  for (let i = 0; i < c.length; i++) {
    const ch = c[i];
    if (ch === '[') { inTag = true; continue; }
    if (inTag) { if (ch === ']') { inTag = false; skipSpace = true; } continue; }
    if (skipSpace && ch === ' ') { skipSpace = false; continue; }
    skipSpace = false;
    C.push(ch); S.push(st[i]); E.push(en[i]);
  }
  return { characters: C, character_start_times_seconds: S, character_end_times_seconds: E };
}
const alignment = stripTags(tts.alignment);
// 클립: 이름의 첫 숫자 = 장면 번호. 숫자가 하나도 없으면 이름 순서대로
const files = $('List Clips').all().map(i => i.json).filter(f => f && f.id && f.name && (/^video\//.test(f.mimeType || '') || /\.(mp4|mov|m4v|webm)$/i.test(f.name)));
if (!files.length) throw new Error('폴더에 영상 클립이 없습니다. 01.mp4, 02.mp4 … 처럼 올린 뒤 이 실행을 다시 하거나, 시트 Status를 pending으로 돌려 새로 시작하세요.');
const N = p.scenes.length;
const byScene = new Array(N).fill(null);
const numbered = files.map(f => ({ f, n: parseInt((String(f.name).match(/\d+/) || [])[0], 10) })).filter(x => x.n >= 1 && x.n <= N);
if (numbered.length) numbered.sort((a, b) => a.f.name.localeCompare(b.f.name)).forEach(x => { if (!byScene[x.n - 1]) byScene[x.n - 1] = x.f; });
else files.slice().sort((a, b) => a.name.localeCompare(b.name)).slice(0, N).forEach((f, i) => { byScene[i] = f; });
const missing = byScene.map((f, i) => f ? 0 : i + 1).filter(Boolean);
const scenes = p.scenes.map((s, i) => {
  const f = byScene[i];
  const visual = f
    ? { type: 'image', src: 'https://drive.google.com/thumbnail?id=' + f.id + '&sz=w1080', video: 'https://drive.google.com/uc?export=download&id=' + f.id, videoStart: 0, text: i === 0 ? p.hookText : '', highlight: [] }
    : { type: 'headline', text: (i === 0 && p.hookText) || s.narration.slice(0, 18), highlight: [] };
  return { narration: s.narration, visual };
});
// 배경음악: 무드에 맞는 곡
let musicUrl = '', musicName = 'none';
let mfiles = [];
try { mfiles = $('List Music Files').all().map(i => i.json).filter(f => f && f.id && f.name); } catch (e) {}
const MOODS = ['calm_reflective', 'hopeful_uplifting', 'tense_dramatic', 'dark_serious', 'warm_gentle'];
let pool = mfiles.filter(f => f.name.toLowerCase().startsWith(p.mood));
if (!pool.length) pool = mfiles.filter(f => MOODS.some(m => f.name.toLowerCase().startsWith(m)));
if (pool.length) { const pick = pool[Math.floor(Math.random() * pool.length)]; musicUrl = 'https://drive.google.com/uc?export=download&id=' + pick.id; musicName = pick.name; }
const jobId = 'fs_' + $now.toFormat('yyyyMMdd_HHmmss') + '_' + Math.random().toString(36).slice(2, 7);
const job = { job_id: jobId, lang: p.subtitleLang, category: p.category, title: p.title, scenes, alignment, audio_base64: tts.audio_base64, music_url: musicUrl, music_volume: MUSIC_VOLUME, style: 'classic' };
const text = JSON.stringify(job);
console.log('job ' + jobId + ' | 클립 ' + (N - missing.length) + '/' + N + (missing.length ? ' (빠진 장면 ' + missing.join(', ') + ')' : '') + ' | music: ' + musicName);
return [{
  json: { jobId, repo: GITHUB_REPO, branch: GITHUB_BRANCH, clips: N - missing.length, sceneCount: N, missingText: missing.length ? missing.join(', ') : '없음', musicName },
  binary: { data: { data: Buffer.from(text, 'utf8').toString('base64'), mimeType: 'application/json', fileName: jobId + '.json' } }
}];
