// MotionLongform 탭에 남길 한 줄. STATUS는 노드마다 다르다 (uploaded / rejected).
const STATUS = 'rejected';
const p = $('Parse Longform Script').first().json;
const r = $('Check Render Result').first().json;
let url = '';
try { url = 'https://youtube.com/watch?v=' + $('YouTube Upload').first().json.uploadId; } catch (e) { /* 거절된 경우 */ }
return [{ json: {
  Date: $now.toFormat('yyyy-MM-dd HH:mm'), ShortTopic: p.topic, ShortVideoId: p.shortVideoId, ShortViews: p.shortViews,
  LongTitle: p.title, Status: STATUS, LongURL: STATUS === 'uploaded' ? url : '', JobId: r.jobId
} }];
