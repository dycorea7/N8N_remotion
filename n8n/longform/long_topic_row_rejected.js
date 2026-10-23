// 거절된 롱폼: 롱폼 주제 시트의 그 행을 rejected로 (다시 고르지 않게). 쇼츠에서 고른 주제면 여기서 끝
const p = $('Pick Short').first().json;
if (!p.longTopic) return [];
return [{ json: { Topic: p.longTopic, Status: 'rejected', LongTitle: $('Parse Longform Script').first().json.title, LongURL: '' } }];
