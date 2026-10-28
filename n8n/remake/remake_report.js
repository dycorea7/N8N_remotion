// 리메이크 4/4: 텔레그램 보고 (HTML 모드)
const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const rows = $('Parse Remake Plan').all().map(i => i.json);
const left = ($('Pick Remake Candidates').first().json.candidateCount || rows.length) - rows.length;
const re = rows.filter(r => r.Decision === 'remake'), sk = rows.filter(r => r.Decision !== 'remake');
let msg = '♻️ <b>비공개 쇼츠 리메이크</b> (조회수 100회 미만)\n';
if (re.length) msg += '\n<b>다시 만들 쇼츠 ' + re.length + '편</b> — Motion Shorts 대기열에 추가, 이번 주 안에 제작\n' + re.map(r => '• ' + esc(r.OldTitle.slice(0, 40)) + ' (' + r.OldViews + '회)\n   → <b>' + esc(r.NewTopic) + '</b>\n   원인: ' + esc(r.Diagnosis) + '\n   고칠 점: ' + esc(r.Fix)).join('\n') + '\n';
if (sk.length) msg += '\n<b>건너뜀 ' + sk.length + '편</b>\n' + sk.map(r => '– ' + esc(r.OldTitle.slice(0, 40)) + ': ' + esc(r.Reason || r.Diagnosis)).join('\n') + '\n';
if (left > 0) msg += '\n남은 후보 ' + left + '편은 다음 주에 검토합니다.';
msg += '\n기록: 시트 Remakes 탭';
if (msg.length > 4000) msg = msg.slice(0, 3990) + '\n…';
return [{ json: { text: msg } }];
