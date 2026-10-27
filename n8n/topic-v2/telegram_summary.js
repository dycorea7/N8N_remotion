// 시트에 추가한 주제를 기둥별로 묶어 텔레그램 메시지로 만든다 (HTML 모드라 < > & 는 바꾼다)
const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const items = $('Parse Topics').all().map(i => i.json);
const rejected = (items[0] && items[0].Rejected) || [];
let mix = {};
try { mix = $('Build Topic Request').first().json.mix || {}; } catch (e) { /* 배정 정보 없음 */ }
const NAMES = { bible: '성경', wisdom: '지혜', health: '건강', psychology: '심리', money: '경제' };
const groups = {};
for (const t of items) { const k = t.Pillar || 'other'; (groups[k] = groups[k] || []).push(t.Topic); }
let msg = '🗓 <b>이번 주 쇼츠 주제 ' + items.length + '개 추가</b>\n';
const mixText = Object.keys(mix).map(k => (NAMES[k] || k) + ' ' + mix[k]).join(' · ');
if (mixText) msg += '배정: ' + esc(mixText) + '\n';
for (const k of Object.keys(groups)) {
  msg += '\n<b>' + esc(NAMES[k] || k) + '</b> (' + groups[k].length + ')\n' + groups[k].map(x => '• ' + esc(x)).join('\n') + '\n';
}
const longs = (items[0] && items[0].Longform) || [];
if (longs.length) msg += '\n<b>🎬 롱폼 주제 ' + longs.length + '개</b> (화·금, 50만+ 롱폼 기준, 롱폼마다 쇼츠 2편 파생)\n' + longs.map(x => '• [' + esc(NAMES[x.Pillar] || x.Pillar) + '] ' + esc(x.Topic) + (x.BenchTitle ? '\n   ↳ 기준 영상: ' + esc(x.BenchTitle) : '')).join('\n') + '\n';
if (rejected.length) msg += '\n<b>제외 ' + rejected.length + '개</b>\n' + rejected.slice(0, 10).map(x => '– ' + esc(x)).join('\n') + (rejected.length > 10 ? '\n…' : '') + '\n';
msg += '\n시트: https://docs.google.com/spreadsheets/d/1_RFLFLkxolbaSVOw-tWf8SuBKE0FV9n6dfqUrFoOA2k';
// 텔레그램 한 메시지 최대 4096자
if (msg.length > 4000) msg = msg.slice(0, 3990) + '\n…';
return [{ json: { text: msg } }];
