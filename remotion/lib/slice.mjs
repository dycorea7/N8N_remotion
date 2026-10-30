// 롱폼 작업(job.json)에서 장면 구간 하나를 잘라 세로 쇼츠 작업으로 만든다.
//   n8n이 보내는 쇼츠 작업: { job_id, format: 'short', source_job_url, scene_from, scene_to, title?, style?, music_volume? }
//   반환: 일반 쇼츠 작업과 같은 모양 + audio_trim {start, end} (render-job이 ffmpeg로 음성을 자른다)
// 장면·이미지·실사 영상·나레이션은 롱폼 그대로 쓴다 (새로 만들지 않는다).

const LEAD_SEC = 0.12;  // 첫 단어 앞 여유
const TAIL_SEC = 0.25;  // 마지막 단어 뒤 여유 (자르기 경계에서 소리가 끊기지 않게)

export function sliceLongJob(src, req) {
  const all = (Array.isArray(src.scenes) ? src.scenes : []).filter(s => s && String(s.narration || '').trim());
  if (!all.length) throw new Error('원본 롱폼 작업에 장면이 없습니다');
  const from = Math.max(0, Math.floor(Number(req.scene_from)));
  const to = Math.min(all.length - 1, Math.floor(Number(req.scene_to)));
  if (!Number.isFinite(from) || !Number.isFinite(to) || to < from) throw new Error(`장면 구간이 잘못됐습니다: ${req.scene_from}~${req.scene_to} (원본 ${all.length}장면)`);

  const al = src.alignment || {};
  const chars = al.characters || [], starts = al.character_start_times_seconds || [], ends = al.character_end_times_seconds || [];
  if (!chars.length || chars.length !== starts.length || chars.length !== ends.length) throw new Error('원본 alignment 형식이 올바르지 않습니다');

  // 장면별 문자 위치 (n8n은 narration을 줄바꿈으로 이어 TTS를 부른다)
  const narr = all.map(s => String(s.narration).trim());
  const script = narr.join('\n');
  const spoken = chars.join('');
  const exact = spoken === script;
  const map = i => exact ? i : Math.min(chars.length, Math.round(i * chars.length / script.length));
  const offs = [];
  let acc = 0;
  for (const n of narr) { offs.push(acc); acc += n.length + 1; }
  let c0 = map(offs[from]);
  let c1 = map(offs[to] + narr[to].length);  // 마지막 장면 끝 (뒤 줄바꿈 제외)
  // 정확히 맞지 않을 때는 공백·줄바꿈에서 시작/끝나도록 다듬는다
  while (c0 < c1 && /\s/.test(chars[c0])) c0++;
  while (c1 > c0 && /\s/.test(chars[c1 - 1])) c1--;
  if (c1 - c0 < 10) throw new Error('잘라낸 구간이 너무 짧습니다');

  const t0 = Math.max(0, starts[c0] - LEAD_SEC);
  const t1 = ends[c1 - 1] + TAIL_SEC;
  const sub = n => Math.max(0, Math.round((n - t0) * 1000) / 1000);

  const scenes = all.slice(from, to + 1).map((s, i) => {
    const v = JSON.parse(JSON.stringify(s.visual || {}));
    // 챕터 표지는 쇼츠에서 의미가 없으니 같은 제목의 큰 글씨 장면으로
    const visual = v.type === 'chapter' ? { type: 'headline', text: String(v.title || v.text || '').slice(0, 40), highlight: [] } : v;
    return { narration: narr[from + i], visual };
  });
  // 정확히 맞을 때만 잘라낸 문자들이 장면 narration과 같다 (아니면 prepare가 비율로 근사한다)
  const sliced = {
    characters: chars.slice(c0, c1),
    character_start_times_seconds: starts.slice(c0, c1).map(sub),
    character_end_times_seconds: ends.slice(c0, c1).map(sub),
  };

  return {
    job_id: req.job_id,
    format: 'short',
    lang: src.lang || 'ko',
    category: src.category || 'other',
    title: String(req.title || src.title || '').slice(0, 100),
    scenes,
    alignment: sliced,
    audio_base64: src.audio_base64,
    audio_url: src.audio_base64 ? undefined : src.audio_url,
    audio_trim: { start: Math.round(t0 * 1000) / 1000, end: Math.round(t1 * 1000) / 1000 },
    music_url: src.music_url || '',
    music_volume: Number.isFinite(Number(req.music_volume)) ? Number(req.music_volume) : 0.14,
    style: req.style || src.style,
    source: { job_id: src.job_id, scene_from: from, scene_to: to, seconds: Math.round((t1 - t0) * 10) / 10, exact },
  };
}
