// 다시 만들 주제를 Sheet1 행으로. Status=redo → Motion Shorts가 다음 실행(내일 아침)에 가장 먼저 만든다. Source=remake → RemakeNote를 대본 지시에 쓴다
const rows = $('Parse Remake Plan').all().map(i => i.json).filter(r => r.Decision === 'remake' && r.NewTopic);
return rows.map(r => ({ json: { Topic: r.NewTopic, Language: 'Korean', Status: 'redo', VideoURL: '', Source: 'remake', RemakeOf: r.OldVideoId, RemakeNote: '기존 영상 「' + r.OldTitle + '」 올린 지 24시간 조회수 ' + r.OldViews + '회. 원인: ' + r.Diagnosis + ' / 고칠 점: ' + r.Fix } }));
