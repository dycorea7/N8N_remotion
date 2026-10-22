// GitHub Actions(또는 로컬)에서 작업 1건을 렌더한다.
//   node render-job.mjs <job.json 경로 또는 URL> <출력 mp4 경로>
// job.json = n8n이 만든 { job_id, lang, category, title, scenes, alignment, audio_base64 | audio_url, music_url, music_volume }
//   롱폼은 추가로 { format: 'long', fps: 24, chapters: [{title}], thumbnail: {text, highlight, src, badge} } (장면마다 chapter 번호)
//   썸네일이 있으면 <출력>.jpg 도 만든다.
// 결과 요약은 <출력>.result.json 으로 남긴다.
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { bundle } from '@remotion/bundler';
import { renderMedia, renderStill, selectComposition } from '@remotion/renderer';
import { prepare } from './lib/prepare.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const [, , jobArg, outArg] = process.argv;
if (!jobArg || !outArg) { console.error('usage: node render-job.mjs <job.json|url> <out.mp4>'); process.exit(2); }
const BROWSER = process.env.BROWSER_EXECUTABLE || null;

async function fetchBuf(url, maxBytes = 40e6) {
  let lastErr;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(90000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const type = res.headers.get('content-type') || '';
      if (type.includes('text/html')) throw new Error('파일 대신 HTML 페이지가 왔습니다 (드라이브 공유 설정 확인)');
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length > maxBytes) throw new Error('파일이 너무 큽니다');
      return buf;
    } catch (e) { lastErr = e; await new Promise(r => setTimeout(r, 2000 * attempt)); }
  }
  throw new Error(`${url.slice(0, 120)} 다운로드 실패: ${lastErr.message}`);
}

const extOf = (url, fallback) => { const m = String(url).split('?')[0].match(/\.(jpe?g|png|webp|mp3|wav|m4a)$/i); return m ? m[0].toLowerCase() : fallback; };

const t0 = Date.now();
const job = /^https?:\/\//.test(jobArg) ? JSON.parse((await fetchBuf(jobArg)).toString('utf8')) : JSON.parse(fs.readFileSync(jobArg, 'utf8'));
const id = String(job.job_id || 'job').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40) || 'job';
const rel = `job/${id}`;
const dir = path.join(__dirname, 'public', rel);
fs.mkdirSync(dir, { recursive: true });
const warnings = [];

// ── 나레이션 ──
if (job.audio_base64) fs.writeFileSync(path.join(dir, 'voice.mp3'), Buffer.from(job.audio_base64, 'base64'));
else if (job.audio_url) fs.writeFileSync(path.join(dir, 'voice.mp3'), await fetchBuf(job.audio_url));
else throw new Error('audio_base64 또는 audio_url이 필요합니다');

// ── AI 이미지: 받아서 public에 두고 경로를 바꾼다. 실패한 장면은 headline으로 대체된다 ──
let imgOk = 0, imgFail = 0;
await Promise.all((job.scenes || []).map(async (s, i) => {
  const v = s && s.visual;
  if (!v) return;
  // 이미지 장면(src)과 그래픽 장면의 사진 배경(bgSrc)
  for (const key of ['src', 'bgSrc']) {
    if (key === 'src' && v.type !== 'image') continue;
    if (!/^https?:\/\//.test(String(v[key] || ''))) continue;
    try {
      const name = `${key === 'src' ? 'img' : 'bg'}_${i}${extOf(v[key], '.jpg')}`;
      fs.writeFileSync(path.join(dir, name), await fetchBuf(v[key], 20e6));
      v[key] = `${rel}/${name}`;
      imgOk++;
    } catch (e) {
      warnings.push(`장면 ${i + 1} ${key === 'src' ? '이미지 실패 → 텍스트 장면으로 대체' : '사진 배경 실패 → 배경 없이'}: ${e.message}`);
      delete v[key];
      imgFail++;
    }
  }
}));

// ── 롱폼 썸네일 이미지 ──
const isLong = job.format === 'long';
let thumbSrc = '';
if (isLong && job.thumbnail && /^https?:\/\//.test(String(job.thumbnail.src || ''))) {
  try {
    const name = `thumb${extOf(job.thumbnail.src, '.jpg')}`;
    fs.writeFileSync(path.join(dir, name), await fetchBuf(job.thumbnail.src, 20e6));
    thumbSrc = `${rel}/${name}`;
  } catch (e) { warnings.push('썸네일 이미지 실패 → 첫 이미지 장면 사용: ' + e.message); }
}

const props = prepare(job);
props.audioSrc = `${rel}/voice.mp3`;
if (!props.alignmentExact) warnings.push('정렬 문자와 대본이 달라 장면 시점을 비율로 근사했습니다');

// ── 배경음악 ──
if (job.music_url) {
  try {
    fs.writeFileSync(path.join(dir, 'music.mp3'), await fetchBuf(job.music_url));
    props.musicSrc = `${rel}/music.mp3`;
    props.musicVolume = Number.isFinite(Number(job.music_volume)) ? Number(job.music_volume) : 0.16;
  } catch (e) { warnings.push('배경음악 생략: ' + e.message); }
}

// public 파일을 다 놓은 뒤에 번들해야 staticFile로 읽힌다
console.log(`assets ready (${((Date.now() - t0) / 1000).toFixed(0)}s) — images ${imgOk} ok / ${imgFail} failed`);
const serveUrl = await bundle({ entryPoint: path.join(__dirname, 'src/index.ts'), publicDir: path.join(__dirname, 'public') });
const composition = await selectComposition({ serveUrl, id: isLong ? 'Long' : 'Short', inputProps: props, browserExecutable: BROWSER, timeoutInMilliseconds: 120000 });

// 썸네일은 영상보다 먼저 만든다 (렌더가 길어서 실패하면 원인 파악이 늦어지지 않게)
let thumbPath = null;
if (isLong && job.thumbnail && job.thumbnail.text) {
  try {
    const firstImg = props.scenes.find(s => s.visual.type === 'image');
    const tp = { category: props.category, lang: props.lang, text: String(job.thumbnail.text).slice(0, 40), highlight: job.thumbnail.highlight || [], badge: String(job.thumbnail.badge || '').slice(0, 14), src: thumbSrc || (firstImg && firstImg.visual.src) || undefined };
    const still = await selectComposition({ serveUrl, id: 'Thumb', inputProps: tp, browserExecutable: BROWSER, timeoutInMilliseconds: 120000 });
    thumbPath = outArg.replace(/\.mp4$/, '') + '.jpg';
    await renderStill({ serveUrl, composition: still, inputProps: tp, output: thumbPath, imageFormat: 'jpeg', jpegQuality: 90, browserExecutable: BROWSER, timeoutInMilliseconds: 120000 });
  } catch (e) { warnings.push('썸네일 생성 실패: ' + e.message); thumbPath = null; }
}


// ── 음량 맞추기: 유튜브 기준(-14 LUFS)으로 전체 소리를 올린다 (영상은 다시 인코딩하지 않음) ──
// 유튜브는 큰 소리만 줄이고 작은 소리는 키워 주지 않아서, 작게 올리면 그대로 작게 들린다.
const TARGET_LUFS = -14;
function normalizeLoudness(file, bitrate) {
  const ff = (args) => spawnSync('ffmpeg', ['-hide_banner', '-nostdin', ...args], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const ln = `loudnorm=I=${TARGET_LUFS}:TP=-1.5:LRA=11`;
  const p1 = ff(['-i', file, '-map', '0:a:0', '-af', `${ln}:print_format=json`, '-f', 'null', '-']);
  if (p1.error) return { skipped: 'ffmpeg 없음: ' + p1.error.message };
  const m = String(p1.stderr || '').match(/\{[\s\S]*?"input_i"[\s\S]*?\}/);
  if (!m) return { skipped: '음량 측정 실패' };
  const j = JSON.parse(m[0]);
  const tmp = file.replace(/\.mp4$/, '') + '.norm.mp4';
  const p2 = ff(['-y', '-i', file, '-map', '0:v:0', '-map', '0:a:0', '-c:v', 'copy',
    '-af', `${ln}:measured_I=${j.input_i}:measured_TP=${j.input_tp}:measured_LRA=${j.input_lra}:measured_thresh=${j.input_thresh}:offset=${j.target_offset}:linear=true,aresample=48000`,
    '-c:a', 'aac', '-b:a', bitrate, '-movflags', '+faststart', tmp]);
  if (p2.status !== 0 || !fs.existsSync(tmp)) return { skipped: '음량 적용 실패: ' + String(p2.stderr || '').slice(-300) };
  fs.renameSync(tmp, file);
  return { before_lufs: Number(j.input_i), target_lufs: TARGET_LUFS };
}

const tr = Date.now();
let lastLog = 0;
await renderMedia({
  serveUrl, composition, inputProps: props, codec: 'h264', crf: isLong ? 26 : 23, audioBitrate: isLong ? '160k' : '192k',
  outputLocation: outArg, browserExecutable: BROWSER, timeoutInMilliseconds: 120000,
  onProgress: ({ progress }) => { const step = isLong ? 20 : 10; const p = Math.floor(progress * step); if (p > lastLog) { lastLog = p; console.log(`render ${Math.round(p * 100 / step)}% (${((Date.now() - tr) / 60000).toFixed(1)}분)`); } },
});

const loudness = normalizeLoudness(outArg, isLong ? '160k' : '192k');
if (loudness.skipped) warnings.push('음량 맞추기 생략: ' + loudness.skipped);
else console.log(`loudness ${loudness.before_lufs} → ${loudness.target_lufs} LUFS`);

const result = {
  job_id: id,
  status: 'done',
  duration_sec: Math.round(props.durationInFrames / props.fps),
  render_sec: Math.round((Date.now() - tr) / 1000),
  total_sec: Math.round((Date.now() - t0) / 1000),
  size_mb: Number((fs.statSync(outArg).size / 1e6).toFixed(1)),
  format: isLong ? 'long' : 'short',
  scenes: isLong ? props.scenes.length : props.scenes.map(s => s.visual.type),
  chapters: props.chapters || [],
  thumbnail: thumbPath ? path.basename(thumbPath) : null,
  images: { ok: imgOk, failed: imgFail },
  loudness,
  warnings,
};
fs.writeFileSync(outArg + '.result.json', JSON.stringify(result));
console.log(JSON.stringify(result));
