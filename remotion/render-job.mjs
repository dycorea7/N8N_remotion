// GitHub Actions(또는 로컬)에서 작업 1건을 렌더한다.
//   node render-job.mjs <job.json 경로 또는 URL> <출력 mp4 경로>
// job.json = n8n이 만든 { job_id, lang, category, title, scenes, alignment, audio_base64 | audio_url, music_url, music_volume }
// 결과 요약은 <출력>.result.json 으로 남긴다.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
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
  if (!v || v.type !== 'image' || !/^https?:\/\//.test(String(v.src || ''))) return;
  try {
    const name = `img_${i}${extOf(v.src, '.jpg')}`;
    fs.writeFileSync(path.join(dir, name), await fetchBuf(v.src, 20e6));
    v.src = `${rel}/${name}`;
    imgOk++;
  } catch (e) {
    warnings.push(`장면 ${i + 1} 이미지 실패 → 텍스트 장면으로 대체: ${e.message}`);
    delete v.src;
    imgFail++;
  }
}));

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
const composition = await selectComposition({ serveUrl, id: 'Short', inputProps: props, browserExecutable: BROWSER, timeoutInMilliseconds: 120000 });
const tr = Date.now();
let lastLog = 0;
await renderMedia({
  serveUrl, composition, inputProps: props, codec: 'h264', crf: 23, audioBitrate: '192k',
  outputLocation: outArg, browserExecutable: BROWSER, timeoutInMilliseconds: 120000,
  onProgress: ({ progress }) => { const p = Math.floor(progress * 10); if (p > lastLog) { lastLog = p; console.log(`render ${p * 10}%`); } },
});

const result = {
  job_id: id,
  status: 'done',
  duration_sec: Math.round(props.durationInFrames / props.fps),
  render_sec: Math.round((Date.now() - tr) / 1000),
  total_sec: Math.round((Date.now() - t0) / 1000),
  size_mb: Number((fs.statSync(outArg).size / 1e6).toFixed(1)),
  scenes: props.scenes.map(s => s.visual.type),
  images: { ok: imgOk, failed: imgFail },
  warnings,
};
fs.writeFileSync(outArg + '.result.json', JSON.stringify(result));
console.log(JSON.stringify(result));
