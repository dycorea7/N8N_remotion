// 장면별 길이(나레이션 타이밍)를 재고, 텔레그램으로 보낼 제작 키트 메시지를 만든다 (머리글 1개 + 장면마다 1개)
const p = $('Parse Script').first().json;
const folder = $('Create Folder').first().json;
const drama = p.format === 'drama';
// 드라마는 나레이션(ElevenLabs)이 없다 → 장면마다 클립 8초
let tts = { alignment: { characters: [], character_start_times_seconds: [], character_end_times_seconds: [] } };
if (!drama) { tts = $('ElevenLabs TTS').first().json; if (!tts.alignment) throw new Error('ElevenLabs 응답에 alignment가 없습니다'); }
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
  return { C, S, E };
}
const { C, S, E } = stripTags(tts.alignment);
// 줄바꿈으로 장면을 나눠 장면마다 말하는 시간
const secs = [];
let start = 0, from = 0;
if (drama) p.scenes.forEach(() => secs.push(8));
else for (let k = 0; k <= C.length; k++) {
  if (k === C.length || C[k] === '\n') {
    const end = k > from ? E[k - 1] : start;
    secs.push(Math.max(0, end - (S[from] != null ? S[from] : start)));
    from = k + 1; start = end;
  }
}
const esc = x => String(x || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const folderUrl = 'https://drive.google.com/drive/folders/' + folder.id;
const total = drama ? p.scenes.length * 8 : (E.length ? E[E.length - 1] : 0);
const head = [
  (drama ? '🎭 <b>Flow AI 드라마 제작 키트</b>' : p.format === 'cooking' ? '🍳 <b>Flow 요리 쇼츠 제작 키트</b>' : '🎬 <b>Flow 쇼츠 제작 키트</b>'),
  '<b>' + esc(p.title) + '</b>',
  '주제: ' + esc(p.topic) + (drama ? ' · 약 ' : ' · 나레이션 ') + Math.round(total) + '초 · 장면 ' + p.scenes.length + '개',
  '',
  drama ? '1) Google Flow(Veo 3)에서 <b>세로 9:16</b>, <b>소리 켜고</b> 장면마다 클립 1개씩 만드세요 (8초). 배우 대사와 효과음은 클립 소리 그대로 써요.' : '1) Google Flow에서 <b>세로 9:16</b>으로 장면마다 클립 1개씩 만드세요 (8초, 소리는 쓰지 않아요).',
  '2) 클립을 아래 폴더에 장면 번호로 올리세요: <code>01.mp4</code>, <code>02.mp4</code> …',
  '3) 다 올리면 마지막 메시지의 버튼을 누르세요. 빠진 장면은 그래픽 화면으로 채워요.',
  '',
  '📁 폴더: ' + folderUrl,
  p.setting ? '\n' + (p.format === 'cooking' ? '🍳 <b>주방</b>' : '📍 <b>장소</b>') + ' (모든 장면에 같은 곳)\n<code>' + esc(p.setting) + '</code>' : '',
  p.character ? '\n👤 <b>인물</b> (모든 장면에 같은 사람)\n<code>' + esc(p.character) + '</code>' : '',
  drama && p.characters && p.characters.length ? '\n👥 <b>등장인물</b> (장면마다 같은 얼굴·목소리)\n' + p.characters.map(c => '<b>' + esc(c.name) + '</b>\n<code>' + esc(c.look) + '</code>\n🎙 <code>' + esc(c.voice) + '</code>').join('\n') : '',
  drama ? '\n⚠️ 대사가 프롬프트와 다르게 나오면 그 클립만 다시 만드세요. 자막은 대본 대사로 들어가요.' : ''
].join('\n');
// 장면 위 모션 그래픽 미리 알려 주기 (클립에 글자를 넣을 필요 없음)
const OV = { stat: '숫자', list: '목록', checklist: '체크리스트', step: '단계', timer: '타이머', compare: '비교', tag: '꼬리표' };
const ovText = o => !o ? '' : '\n🎨 그래픽(자동): ' + (OV[o.kind] || o.kind) + ' · ' + esc([o.title, o.label, o.text, o.value != null ? String(o.value) + (o.suffix || '') : '', o.seconds ? o.seconds + '초' : '', (o.items || []).join(', '), o.left && o.right ? o.left + ' → ' + o.right : ''].filter(Boolean).join(' · '));
const items = [{ json: { text: head } }];
p.scenes.forEach((s, i) => {
  items.push({ json: { text: '<b>장면 ' + String(i + 1).padStart(2, '0') + '</b> · 약 ' + (Math.round((secs[i] || 0) * 10) / 10) + '초' + (s.tone ? ' · ' + s.tone : '') + (drama ? (s.dialogue || []).map(d => '\n🗣 <b>' + esc(d.speaker) + '</b>: ' + esc(d.line)).join('') : '\n🗣 ' + esc(s.narration)) + ovText(s.overlay) + '\n\n<code>' + esc(s.prompt) + '</code>' } });
});
console.log('키트: 장면 길이 ' + secs.map(x => x.toFixed(1)).join(' / ') + '초');
return items;
