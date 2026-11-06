// 롱폼 나레이션: ElevenLabs 응답(JSON 파일)을 풀어서 타이밍(alignment)만 데이터로 남기고, 음성은 mp3 파일(바이너리)로 내보낸다
// 음성 base64(약 20MB)를 실행 데이터에 두면 렌더를 기다리는 동안 n8n이 실행을 저장하다 멈춘다 (11/6 충돌)
const buf = await this.helpers.getBinaryDataBuffer(0, 'data');
const r = JSON.parse(buf.toString('utf8'));
if (!r.audio_base64 || !r.alignment) throw new Error('ElevenLabs 응답에 audio_base64/alignment가 없습니다: ' + buf.toString('utf8').slice(0, 300));
const p = $('Parse Longform Script').first().json;
const name = 'voice_' + $now.toFormat('yyyyMMdd_HHmmss') + '.mp3';
console.log('나레이션 ' + Math.round(r.audio_base64.length * 0.75 / 1024) + 'KB, 글자 타이밍 ' + r.alignment.characters.length + '개');
return [{ json: { alignment: r.alignment, voiceName: name, subtitleLang: p.subtitleLang }, binary: { data: { data: r.audio_base64, mimeType: 'audio/mpeg', fileName: name } } }];
