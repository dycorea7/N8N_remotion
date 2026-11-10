// ElevenLabs v3: 한 번에 너무 길게 읽히면 약 6분 지점에서 음성이 끊긴다 (11/10 롱폼: 4,500자 조각 두 개가 모두 367초에서 멈춰 끝 1,000자씩 빠짐)
// → 장면 경계에서 1,500자(약 3분) 이하 조각으로 다시 나눠 음성 요청 1건씩
const MAX = 1500;
const p = $('Parse Longform Script').first().json;
const lines = (Array.isArray(p.ttsChunks) && p.ttsChunks.length ? p.ttsChunks.join('\n') : p.script).split('\n').filter(l => l.trim());
const chunks = [];
let cur = [];
for (const line of lines) {
  if (cur.length && (cur.join('\n').length + 1 + line.length) > MAX) { chunks.push(cur.join('\n')); cur = []; }
  cur.push(line);
}
if (cur.length) chunks.push(cur.join('\n'));
console.log('음성 요청 ' + chunks.length + '조각 (최대 ' + Math.max(...chunks.map(c => c.length)) + '자)');
return chunks.map((text, i) => ({ json: { text, part: i + 1, parts: chunks.length, subtitleLang: p.subtitleLang } }));
// 다음 단계: TTS Loop(Loop Over Items, 1개씩) → ElevenLabs TTS → TTS Loop → (done) TTS Unpack
//  - HTTP 노드의 batching은 응답을 기다리지 않고 요청만 띄엄띄엄 보낸다 → 동시 요청 5개 초과(429)나, 오래 기다린 응답 스트림이 끊김(ECONNRESET)
//  - 그래서 루프로 한 조각씩 보내고 응답을 바로 읽는다
