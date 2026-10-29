// 24시간 점검 보고 (텔레그램 HTML 모드)
const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const rows = $('Parse Remake Plan').all().map(i => i.json);
const re = rows.filter(r => r.Decision === 'remake'), sk = rows.filter(r => r.Decision !== 'remake');
let msg = '⏱ <b>24시간 점검</b> — 조회수 100회 미만 쇼츠 ' + rows.length + '편을 비공개로 바꿨습니다\n';
if (re.length) msg += '\n<b>리메이크 ' + re.length + '편</b> (새 각도로, 이틀 뒤부터 Motion Shorts가 먼저 제작)\n' + re.map(r => '• ' + esc(r.OldTitle.slice(0, 40)) + ' (' + r.OldViews + '회)\n   → <b>' + esc(r.NewTopic) + '</b>\n   원인: ' + esc(r.Diagnosis) + '\n   고칠 점: ' + esc(r.Fix)).join('\n') + '\n';
if (sk.length) msg += '\n<b>비공개만 ' + sk.length + '편</b>\n' + sk.map(r => '– ' + esc(r.OldTitle.slice(0, 40)) + ' (' + r.OldViews + '회): ' + esc(r.Reason || r.Diagnosis)).join('\n') + '\n';
msg += '\n기록: 시트 Remakes 탭 (Check=24h)';
if (msg.length > 4000) msg = msg.slice(0, 3990) + '\n…';
return [{ json: { text: msg } }];
