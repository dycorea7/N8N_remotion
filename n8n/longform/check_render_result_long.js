// GitHub Actions가 Wait 노드로 보낸 결과. 3시간 안에 아무것도 안 오면 body가 비어 있다.
const b = $json.body || {};
const job = $('Build Render Job').first().json;
if (!b.status) throw new Error('롱폼 렌더 결과가 3시간 안에 오지 않았습니다. GitHub 저장소의 Actions 탭에서 실행 상태를 확인하세요: https://github.com/' + job.repo + '/actions');
if (b.status !== 'done') throw new Error('GitHub Actions 렌더 실패: ' + (b.error || 'unknown') + (b.run_url ? ' | 로그: ' + b.run_url : ''));
if (!b.asset_id) throw new Error('렌더는 끝났지만 영상 asset_id가 없습니다: ' + JSON.stringify(b).slice(0, 300));
console.log('render done: ' + b.duration_sec + 's video, ' + b.render_sec + 's render, ' + b.size_mb + 'MB' + (b.warnings && b.warnings.length ? ' | ' + b.warnings.join(' | ') : ''));
const minutes = Math.floor((b.duration_sec || 0) / 60) + '분 ' + ((b.duration_sec || 0) % 60) + '초';
return [{ json: { ...b, repo: job.repo, jobId: job.jobId, durationText: minutes, warningsText: (b.warnings || []).concat($('Parse Longform Script').first().json.warnings || []).join('\n') || '없음' } }];
