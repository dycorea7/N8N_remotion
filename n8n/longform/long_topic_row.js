// 롱폼 주제 시트(LongformTopics)에서 고른 주제면 그 행을 uploaded로 바꿀 값을 만든다 (쇼츠에서 고른 주제면 여기서 끝)
const p = $('Pick Short').first().json;
if (!p.longTopic) return [];
return [{ json: { Topic: p.longTopic, Status: 'uploaded', LongTitle: $('Build Upload Meta').first().json.title, LongURL: 'https://youtube.com/watch?v=' + $('YouTube Upload').first().json.uploadId } }];
