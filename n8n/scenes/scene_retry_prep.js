// 첫 시도가 실패한 영상(혼잡 503 등)만 대체 모델로 한 번 더. 모두 성공했으면 빈 자리표시 하나 (다음 노드는 오류를 무시하고 넘어간다)
const reqs = $('Scene Analysis Request').all().map(i => i.json);
const first = $input.all().map(i => i.json);
const failed = reqs.map((q, i) => ({ q, r: first[i] || {} })).filter(x => !x.q.skip && !((x.r.candidates || [])[0]))
  .map(x => ({ json: { videoId: x.q.videoId, url: x.q.fallbackUrl, body: x.q.body } }));
if (failed.length) console.log('장면 분석 대체 모델로 재시도: ' + failed.map(f => f.json.videoId).join(', '));
return failed.length ? failed : [{ json: { noop: true, url: 'https://generativelanguage.googleapis.com/v1beta/models/none:generateContent', body: {} } }];
