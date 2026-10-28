// 다시 만들 주제를 Sheet1(쇼츠 주제 시트) 행으로. Source=remake → Motion Shorts가 일반 주제보다 먼저 만들고, RemakeNote를 대본 지시에 쓴다
const rows = $('Parse Remake Plan').all().map(i => i.json).filter(r => r.Decision === 'remake' && r.NewTopic);
return rows.map(r => ({ json: { Topic: r.NewTopic, Language: 'Korean', Status: 'pending', VideoURL: '', Source: 'remake', RemakeOf: r.OldVideoId, RemakeNote: '기존 영상 「' + r.OldTitle + '」 조회수 ' + r.OldViews + '회. 원인: ' + r.Diagnosis + ' / 고칠 점: ' + r.Fix } }));
