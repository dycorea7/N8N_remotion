// ElevenLabs v3는 한 번에 5,000자까지 → Parse Longform Script가 나눈 조각마다 음성 요청 1건
const p = $('Parse Longform Script').first().json;
const chunks = Array.isArray(p.ttsChunks) && p.ttsChunks.length ? p.ttsChunks : [p.script];
return chunks.map((text, i) => ({ json: { text, part: i + 1, parts: chunks.length, subtitleLang: p.subtitleLang } }));
