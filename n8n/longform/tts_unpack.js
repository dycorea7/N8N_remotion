// 롱폼 나레이션: 조각별 ElevenLabs 응답(JSON 파일)을 이어 붙인다
//  - 음성: mp3를 순서대로 이어 붙임 (ElevenLabs 기본 mp3 44.1kHz 128kbps 고정 비트레이트 → 조각 길이 = 바이트 ÷ 16,000초)
//  - 타이밍: 다음 조각은 앞 조각들의 음성 길이만큼 밀고, 조각 사이에 줄바꿈 한 글자를 넣는다 (장면 narration을 줄바꿈으로 이은 것과 같아지게)
//  - v3 감정 표시([playful] 등)는 타이밍에서 뺀다 (자막에 나오지 않게)
// 음성 base64(약 20MB)는 실행 데이터에 두지 않는다 — 렌더를 기다리는 동안 n8n이 실행을 저장하다 멈춘다 (11/6 충돌)
// v3 감정 표시([playful] 등)는 음성 연기에만 쓰고 자막·장면 타이밍에서는 뺀다 → 남은 글자가 장면 narration을 줄바꿈으로 이은 것과 정확히 같아진다
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

const items = $input.all();
const C = [], S = [], E = [], bufs = [];
let offset = 0;
for (let i = 0; i < items.length; i++) {
  const buf = await this.helpers.getBinaryDataBuffer(i, 'data');
  const r = JSON.parse(buf.toString('utf8'));
  if (!r.audio_base64 || !r.alignment) throw new Error('ElevenLabs 응답 ' + (i + 1) + '번째 조각에 audio_base64/alignment가 없습니다: ' + buf.toString('utf8').slice(0, 300));
  const audio = Buffer.from(r.audio_base64, 'base64');
  const al = stripTags(r.alignment);
  if (i > 0) { C.push('\n'); S.push(offset); E.push(offset); }
  al.characters.forEach((ch, k) => { C.push(ch); S.push(offset + al.character_start_times_seconds[k]); E.push(offset + al.character_end_times_seconds[k]); });
  const dur = Math.max(audio.length / 16000, al.character_end_times_seconds[al.characters.length - 1] || 0);
  offset += dur;
  bufs.push(audio);
}
const mp3 = Buffer.concat(bufs);
const p = $('Parse Longform Script').first().json;
const name = 'voice_' + $now.toFormat('yyyyMMdd_HHmmss') + '.mp3';
const alignment = { characters: C, character_start_times_seconds: S, character_end_times_seconds: E };
const expect = p.scenes.map(x => String(x.narration).trim()).join('\n');
console.log('나레이션 ' + items.length + '조각, ' + Math.round(mp3.length / 1024) + 'KB, ' + Math.round(offset) + '초, 글자 타이밍 ' + C.length + '개 (대본과 ' + (C.join('') === expect ? '정확히 일치' : '불일치 — 렌더러가 비율로 맞춤') + ')');
return [{ json: { alignment, voiceName: name, subtitleLang: p.subtitleLang, parts: items.length, seconds: Math.round(offset) }, binary: { data: { data: mp3.toString('base64'), mimeType: 'audio/mpeg', fileName: name } } }];
