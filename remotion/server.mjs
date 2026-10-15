// Motion Shorts 렌더 서버
// POST /render-short  → 작업 등록 (202, job_id)
// GET  /jobs/:id      → 상태 (queued | rendering | done | error), 완료 시 url
// GET  /videos/:file  → 완성 영상 (인증 없음, 추측 불가능한 파일명)
import express from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import { prepare } from './lib/prepare.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3000);
const API_KEY = process.env.API_KEY || '';
const PUBLIC_BASE = (process.env.PUBLIC_BASE || `http://localhost:${PORT}`).replace(/\/$/, '');
const DATA = process.env.DATA_DIR || path.join(__dirname, 'data');
const KEEP_HOURS = Number(process.env.KEEP_HOURS || 48);
const CONCURRENCY = process.env.RENDER_CONCURRENCY ? Number(process.env.RENDER_CONCURRENCY) : null;
const BROWSER = process.env.BROWSER_EXECUTABLE || null;

if (!API_KEY) console.warn('⚠️  API_KEY가 비어 있습니다 — 누구나 렌더를 요청할 수 있습니다');
for (const d of ['jobs', 'videos']) fs.mkdirSync(path.join(DATA, d), { recursive: true });

// ── 작업 저장 (재시작해도 완료 상태 유지) ──
const jobs = new Map();
const jobFile = id => path.join(DATA, 'jobs', id, 'job.json');
function save(job) { jobs.set(job.id, job); fs.writeFileSync(jobFile(job.id), JSON.stringify(job)); }
for (const id of fs.readdirSync(path.join(DATA, 'jobs'))) {
  try {
    const j = JSON.parse(fs.readFileSync(jobFile(id), 'utf8'));
    if (j.status === 'queued' || j.status === 'rendering') { j.status = 'error'; j.error = '서버 재시작으로 중단됨 — 다시 요청하세요'; }
    save(j);
  } catch { /* 깨진 폴더는 무시 */ }
}

// ── Remotion 번들 (시작 시 1회) ──
let serveUrl = null;
const bundling = bundle({ entryPoint: path.join(__dirname, 'src/index.ts'), publicDir: path.join(__dirname, 'public') })
  .then(u => { serveUrl = u; console.log('bundle ready'); })
  .catch(e => { console.error('bundle failed', e); process.exit(1); });

// ── 대기열: 한 번에 하나씩 렌더 ──
const queue = [];
let busy = false;
async function pump() {
  if (busy || !queue.length) return;
  busy = true;
  const job = jobs.get(queue.shift());
  try {
    await bundling;
    job.status = 'rendering'; job.startedAt = Date.now(); save(job);
    const props = JSON.parse(fs.readFileSync(path.join(DATA, 'jobs', job.id, 'props.json'), 'utf8'));
    const composition = await selectComposition({ serveUrl, id: 'Short', inputProps: props, browserExecutable: BROWSER, timeoutInMilliseconds: 120000 });
    const out = path.join(DATA, 'videos', `${job.id}.mp4`);
    let lastSaved = 0;
    await renderMedia({
      serveUrl, composition, inputProps: props, codec: 'h264', crf: 20, audioBitrate: '192k',
      outputLocation: out, browserExecutable: BROWSER, concurrency: CONCURRENCY, timeoutInMilliseconds: 120000,
      onProgress: ({ progress }) => { job.progress = Math.round(progress * 100); if (Date.now() - lastSaved > 3000) { lastSaved = Date.now(); save(job); } },
    });
    Object.assign(job, { status: 'done', progress: 100, url: `${PUBLIC_BASE}/videos/${job.id}.mp4`, finishedAt: Date.now(), renderSec: Math.round((Date.now() - job.startedAt) / 1000) });
    save(job);
    console.log(`job ${job.id} done in ${job.renderSec}s`);
  } catch (e) {
    Object.assign(job, { status: 'error', error: String(e && e.message || e).slice(0, 800) });
    save(job);
    console.error(`job ${job.id} failed`, e);
  } finally {
    busy = false;
    pump();
  }
}

// ── 파일 받기 (드라이브 리디렉트 포함) ──
async function download(url, dest, maxBytes = 30e6) {
  const res = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(60000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const type = res.headers.get('content-type') || '';
  if (type.includes('text/html')) throw new Error('오디오 대신 HTML이 왔습니다 (드라이브 공유 설정 확인)');
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > maxBytes) throw new Error('파일이 너무 큽니다');
  fs.writeFileSync(dest, buf);
}

const app = express();
app.use(express.json({ limit: '40mb' }));
const auth = (req, res, next) => (!API_KEY || req.get('x-api-key') === API_KEY) ? next() : res.status(401).json({ error: 'unauthorized' });

app.get('/health', (req, res) => res.json({ ok: true, bundled: Boolean(serveUrl), queue: queue.length, busy }));
app.use('/videos', express.static(path.join(DATA, 'videos'), { maxAge: '1h' }));
// 렌더 중 브라우저가 나레이션/음악을 읽어 가는 경로 (job 폴더 내 mp3만)
app.get('/assets/:id/:file', (req, res) => {
  const { id, file } = req.params;
  if (!/^[a-f0-9]{24}$/.test(id) || !/^(voice|music)\.mp3$/.test(file)) return res.sendStatus(404);
  res.sendFile(path.join(DATA, 'jobs', id, file));
});

app.post('/render-short', auth, async (req, res) => {
  const b = req.body || {};
  const id = crypto.randomBytes(12).toString('hex');
  const dir = path.join(DATA, 'jobs', id);
  try {
    const props = prepare(b);
    fs.mkdirSync(dir, { recursive: true });
    if (b.audio_base64) fs.writeFileSync(path.join(dir, 'voice.mp3'), Buffer.from(b.audio_base64, 'base64'));
    else if (b.audio_url) await download(b.audio_url, path.join(dir, 'voice.mp3'));
    else throw new Error('audio_base64 또는 audio_url이 필요합니다');
    props.audioSrc = `http://127.0.0.1:${PORT}/assets/${id}/voice.mp3`;
    const warnings = [];
    if (!props.alignmentExact) warnings.push('정렬 문자와 대본이 달라 장면 시점을 비율로 근사했습니다');
    if (b.music_url) {
      try {
        await download(b.music_url, path.join(dir, 'music.mp3'));
        props.musicSrc = `http://127.0.0.1:${PORT}/assets/${id}/music.mp3`;
        props.musicVolume = Number.isFinite(Number(b.music_volume)) ? Number(b.music_volume) : 0.16;
      } catch (e) { warnings.push('배경음악 생략: ' + e.message); }
    }
    fs.writeFileSync(path.join(dir, 'props.json'), JSON.stringify(props));
    const job = { id, status: 'queued', progress: 0, createdAt: Date.now(), title: props.title, durationSec: Math.round(props.durationInFrames / props.fps), scenes: props.scenes.map(s => s.visual.type), warnings };
    save(job);
    queue.push(id);
    pump();
    res.status(202).json({ job_id: id, status: 'queued', position: queue.length, duration_sec: job.durationSec, scenes: job.scenes, warnings, status_url: `${PUBLIC_BASE}/jobs/${id}` });
  } catch (e) {
    fs.rmSync(dir, { recursive: true, force: true });
    res.status(400).json({ error: String(e.message || e) });
  }
});

app.get('/jobs/:id', auth, (req, res) => {
  const j = jobs.get(req.params.id);
  if (!j) return res.status(404).json({ error: 'not found', status: 'error' });
  res.json({ job_id: j.id, status: j.status, progress: j.progress || 0, url: j.url || null, error: j.error || null, duration_sec: j.durationSec, render_sec: j.renderSec || null, scenes: j.scenes, warnings: j.warnings || [] });
});

// ── 오래된 파일 정리 ──
setInterval(() => {
  const cutoff = Date.now() - KEEP_HOURS * 3600e3;
  for (const j of jobs.values()) {
    if ((j.finishedAt || j.createdAt) < cutoff && j.status !== 'queued' && j.status !== 'rendering') {
      fs.rmSync(path.join(DATA, 'jobs', j.id), { recursive: true, force: true });
      fs.rmSync(path.join(DATA, 'videos', `${j.id}.mp4`), { force: true });
      jobs.delete(j.id);
    }
  }
}, 3600e3);

app.listen(PORT, () => console.log(`motion-shorts render server on :${PORT}`));
