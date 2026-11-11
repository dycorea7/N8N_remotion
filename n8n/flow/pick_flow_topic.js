// FlowShorts 시트에서 Status가 pending인 첫 주제를 고른다
const rows = $input.all().map(i => i.json).filter(r => r && r.row_number);
const r = rows.find(x => String(x.Status || '').trim().toLowerCase() === 'pending' && String(x.Topic || '').trim());
if (!r) throw new Error('FlowShorts 시트에 Status가 pending인 주제가 없습니다. Topic을 적고 Status를 pending으로 바꾼 뒤 다시 실행하세요.');
console.log('Flow 쇼츠 주제: ' + r.Topic + ' (행 ' + r.row_number + ')');
return [{ json: { row_number: r.row_number, Topic: String(r.Topic).trim(), Language: String(r.Language || 'Korean').trim() || 'Korean' } }];
