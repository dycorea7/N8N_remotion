// Parse Topics가 만든 롱폼 주제를 LongformTopics 탭에 넣을 행으로 펼친다 (없으면 여기서 끝)
const first = $('Parse Topics').first().json;
const rows = (first && first.Longform) || [];
console.log('롱폼 주제 ' + rows.length + '개 추가');
return rows.map(function (json) { return { json: json }; });
