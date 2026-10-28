// 장면 벤치마크 2/2: Gemini 분석을 짧은 '장면 설계 참고'로 정리해 대본 요청에 넘긴다 (실패하면 빈 값 → 대본은 그대로 진행)
// ===== 설정 =====
const ROW_NODE = 'Benchmark Build';   // 주제·벤치마크가 담긴 행을 넘기는 노드
// ================
const row = $(ROW_NODE).first().json;
const reqs = $('Scene Analysis Request').all().map(i => i.json);
// 첫 시도 결과 + 대체 모델 결과를 영상 ID로 모은다
const first = $('Gemini - Scene Analysis').all().map(i => i.json);
const prep = $('Scene Retry Prep').all().map(i => i.json);
const retry = $input.all().map(i => i.json);
const byId = {};
reqs.forEach((q, i) => { if (first[i] && (first[i].candidates || [])[0]) byId[q.videoId] = first[i]; });
prep.forEach((p, i) => { if (p.videoId && retry[i] && (retry[i].candidates || [])[0]) byId[p.videoId] = retry[i]; });
const fmtV = n => n >= 10000 ? Math.round(n / 10000) + '만' : String(n);
const blocks = [];
reqs.forEach((q, i) => {
  if (q.skip) return;
  const r = byId[q.videoId] || first[i] || {};
  const txt = (((r.candidates || [])[0] || {}).content || { parts: [] }).parts.map(p => p.text || '').join('');
  let a = null;
  try { a = JSON.parse(txt.replace(/```json|```/g, '').trim()); } catch (e) { try { a = JSON.parse(txt.slice(txt.indexOf('{'), txt.lastIndexOf('}') + 1)); } catch (e2) {} }
  if (!a) { console.log('장면 분석 실패 ' + q.videoId + ': ' + String(JSON.stringify(r.error || txt)).slice(0, 200)); return; }
  const mix = a.visual_mix || {};
  const seg = (a.segments || []).slice(0, 14).map(s => '    ' + (s.start || '') + '-' + (s.end || '') + ' ' + (s.role || '') + ': ' + (s.visual || '') + (s.text ? ' | text: ' + s.text : '') + (s.why_it_works ? ' | why: ' + s.why_it_works : '')).join('\n');
  blocks.push('[Video ' + (blocks.length + 1) + ', ' + fmtV(q.views) + ' views] format: ' + (a.format || '?') + '\n' +
    '  hook: ' + [a.hook && a.hook.seconds, a.hook && a.hook.visual, a.hook && a.hook.text_on_screen, a.hook && a.hook.device].filter(Boolean).join(' / ') + '\n' +
    '  pacing: ~' + ((a.pacing || {}).avg_shot_seconds || '?') + 's per shot, ' + ((a.pacing || {}).cuts_per_minute || '?') + ' cuts/min, narration ' + ((a.pacing || {}).narration_speed || '?') + '\n' +
    '  visual mix: presenter ' + (mix.presenter_on_camera || 0) + '%, photos/footage ' + (mix.photos_or_footage || 0) + '%, motion graphics ' + (mix.motion_graphics_or_animation || 0) + '%, text cards ' + (mix.text_cards || 0) + '%, numbers/charts ' + (mix.numbers_charts_diagrams || 0) + '%\n' +
    '  on-screen text: ' + (a.on_screen_text || '') + '\n' +
    '  beats:\n' + seg + '\n' +
    '  retention: ' + (a.retention_devices || []).join('; ') + '\n' +
    '  ending: ' + (a.ending || '') + '\n' +
    '  lessons: ' + (a.lessons || []).join('; '));
});
const text = blocks.join('\n');
console.log('장면 분석 ' + blocks.length + '개, ' + text.length + '자');
// 대본 요청의 BENCHMARK 칸에 이어 붙인다 → 쇼츠·성경·롱폼 대본 프롬프트가 그대로 받아 쓴다
const HOW = '\nHOW TO USE THE SCENE COMPOSITION: copy the RHYTHM and the SHAPE, never the content. Match their hook timing and how fast the first visual hits; follow the same kind of beat structure (hook, problem, explanation, proof, steps, turn, ending) with beats of a similar length; match their balance of pictures and graphics (their photos, footage or presenter shots become our image scenes or graphics with bg; their keyword pop-ups become headline; numbers on screen become stat or chart; lists and steps become checklist or timeline; side-by-side contrasts become compare); reuse their retention devices that fit (open loops, numbered steps, a mid-video turn). Our wording, examples, numbers and ideas stay our own.';
const bench = String(row.Benchmark || '').trim();
const merged = blocks.length ? (bench ? bench + '\n\n' : '') + '[SCENE COMPOSITION - analysed from the top videos themselves]\n' + text + HOW : bench;
return [{ json: Object.assign({}, row, { Benchmark: merged, SceneBlueprint: text, sceneCount: blocks.length }) }];
