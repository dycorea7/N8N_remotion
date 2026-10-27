// 조회수 안 나온 쇼츠 고르기 (매주 실행)
// ===== 설정 =====
const MIN_VIEWS = 100;       // 이 조회수 미만이면 정리 대상
const MIN_AGE_DAYS = 7;      // 올린 지 이만큼 지난 영상만 (새 영상은 노출될 시간을 준다)
const MAX_SHORT_SEC = 180;   // 이 길이 이하만 쇼츠로 본다 (롱폼은 건드리지 않음)
const MAX_PER_RUN = 30;      // 한 번에 최대 몇 개까지 (오류로 대량 처리되는 것 방지)
const DRY_RUN = false;       // true면 비공개로 바꾸지 않고 텔레그램으로 목록만 보낸다
// ================
const secs = d => { const m = String(d).match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/); return m ? (+m[1] || 0) * 3600 + (+m[2] || 0) * 60 + (+m[3] || 0) : 0; };
const now = Date.now();
const all = [];
for (const it of $input.all()) for (const v of (it.json.items || [])) {
  all.push({ id: v.id, title: (v.snippet || {}).title || '', published: (v.snippet || {}).publishedAt || '', views: Number((v.statistics || {}).viewCount || 0), sec: secs((v.contentDetails || {}).duration), privacy: (v.status || {}).privacyStatus, live: (v.snippet || {}).liveBroadcastContent });
}
const ageDays = v => (now - Date.parse(v.published)) / 86400000;
const cand = all.filter(v => v.privacy === 'public' && v.live !== 'live' && v.live !== 'upcoming' && v.sec > 0 && v.sec <= MAX_SHORT_SEC && v.views < MIN_VIEWS && ageDays(v) >= MIN_AGE_DAYS)
  .sort((a, b) => a.views - b.views);
const pick = cand.slice(0, MAX_PER_RUN);
const publicShorts = all.filter(v => v.privacy === 'public' && v.sec > 0 && v.sec <= MAX_SHORT_SEC).length;
console.log('영상 ' + all.length + '개 / 공개 쇼츠 ' + publicShorts + '개 / 정리 대상 ' + cand.length + '개 (이번에 ' + pick.length + '개)' + (DRY_RUN ? ' — 시험 모드' : ''));
const meta = { total: all.length, publicShorts, candidates: cand.length, dryRun: DRY_RUN, minViews: MIN_VIEWS, minAge: MIN_AGE_DAYS, maxPerRun: MAX_PER_RUN };
if (!pick.length || DRY_RUN) return [{ json: Object.assign({ act: false, list: pick }, meta) }];
return pick.map(v => ({ json: Object.assign({ act: true, video: v, body: { id: v.id, status: { privacyStatus: 'private', selfDeclaredMadeForKids: false, embeddable: true, publicStatsViewable: true, license: 'youtube' } } }, meta) }));
