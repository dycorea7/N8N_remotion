// 우리 채널 성적표: 최근 업로드 50개의 조회수(Data API) + 평균 시청 비율(YouTube Analytics)을 합쳐
//  - 주제 묶음(테마)별로 "채널 중간값 대비 몇 배"인지 계산 → 강한 테마 / 약한 테마
//  - 최근 14일에 올린 영상 제목(비공개 포함) → 같은 주제 반복 방지
//  다음 노드(Trend Request · Pick Next Topic · 24시간 리메이크 계획)가 이 결과를 쓴다
// ===== 설정 =====
const MIN_AGE_DAYS = 2;     // 올린 지 이 기간이 지나야 성적에 넣는다 (막 올린 영상은 조회수가 아직 쌓이는 중)
const REPEAT_DAYS = 14;     // 이 기간 안에 올린 주제는 다시 쓰지 않는다
const STRONG = 1.5, WEAK = 0.6, MIN_N = 2;   // 테마 중간값이 채널 중간값의 1.5배 이상이면 강함, 0.6배 이하면 약함 (영상 2개 이상일 때만)
// 테마: 제목에 이 말이 있으면 그 테마 (여러 개 가능)
const THEMES = [
  ['family', '부모·가족', '부모|엄마|아버지|어머니|아빠|가족|자식|자녀|효도|임종'],
  ['relation', '인간관계', '인간관계|관계|친구|무시|퍼줬|베풂|곁에|손절|사람을|사람이 떠'],
  ['philosophy', '철학·명언', '세네카|에픽테토스|아우렐리우스|스토아|쇼펜하우어|니체|철학|노자|장자|공자|명언|소크라테스'],
  ['heart', '혈압·혈관', '혈압|혈관|혈당|심장|나트륨|콜레스테롤|짜게'],
  ['sleep', '수면', '수면|잠|불면|멜라토닌|햇빛|피곤|블루라이트|야식|카페인|커피'],
  ['body', '몸·영양', '근육|관절|무릎|마그네슘|비타민|단백질|장내|유익균|면역|노화|체중'],
  ['money', '돈·저축', '돈|저축|월급|재테크|투자|복리|72의 법칙|금리|물가|연금|부자|소비|통장|빚'],
  ['habit', '습관·의지', '습관|결심|의지력|루틴|집중|미루|작심'],
  ['self', '자존감·감정', '자존감|사과|눈치|불안|감정|화를|분노|상처|강해지|미움'],
  ['age', '나이·노후', '\\d0대|\\d0이 되면|노후|나이 들|은퇴'],
  ['bible', '성경·신앙', '하나님|기도|말씀|예수|믿음|은혜|\\d+:\\d+'],
  ['food', '요리', '레시피|요리|전자레인지|리조또|계란|달걀|밥']
];
// ================
const secs = d => { const m = String(d || '').match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/); return m ? (+m[1] || 0) * 3600 + (+m[2] || 0) * 60 + (+m[3] || 0) : 0; };
const head = t => String(t || '').split(/\s[—|]\s/)[0].trim();
const themesOf = t => THEMES.filter(x => new RegExp(x[2]).test(t)).map(x => x[0]);
const median = a => { if (!a.length) return 0; const s = a.slice().sort((x, y) => x - y); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

// 평균 시청 비율 (Analytics 연결이 실패하면 조회수만으로 계산)
const an = {};
let analyticsOk = false;
try {
  const a = $('Own Analytics').first().json;
  const cols = (a.columnHeaders || []).map(c => c.name);
  (a.rows || []).forEach(r => { const o = {}; cols.forEach((c, i) => { o[c] = r[i]; }); an[o.video] = o; });
  analyticsOk = Array.isArray(a.rows);
  if (a.error) console.log('Analytics 실패: ' + JSON.stringify(a.error).slice(0, 200));
} catch (e) { console.log('Analytics 노드 결과 없음'); }

const now = Date.now();
const videos = [];
// Motion Shorts에서는 'Own Stats', 24시간 점검에서는 'Video Stats' 노드가 최근 업로드 정보를 갖고 있다
let statItems = [];
try { statItems = $('Own Stats').all(); } catch (e) { statItems = $('Video Stats').all(); }
for (const it of statItems) for (const v of (it.json.items || [])) {
  const sn = v.snippet || {}, st = v.statistics || {};
  const sec = secs((v.contentDetails || {}).duration);
  if (!sec || sec > 180) continue;  // 쇼츠만
  const a = an[v.id] || {};
  videos.push({
    id: v.id, title: sn.title || '', head: head(sn.title), privacy: (v.status || {}).privacyStatus || '',
    ageDays: Math.round((now - Date.parse(sn.publishedAt)) / 8640000) / 10, sec,
    views: Number(st.viewCount || 0), likes: Number(st.likeCount || 0), comments: Number(st.commentCount || 0),
    avp: a.averageViewPercentage != null ? Math.round(a.averageViewPercentage) : null,
    avd: a.averageViewDuration != null ? a.averageViewDuration : null,
    shares: a.shares != null ? a.shares : null, subs: a.subscribersGained != null ? a.subscribersGained : null,
    themes: themesOf(sn.title || '')
  });
}
// 성경(중단)·요리(쇼츠 파이프라인 주제 아님)는 채널 성적 비교에서 뺀다
const judged = videos.filter(v => v.ageDays >= MIN_AGE_DAYS && v.themes.indexOf('bible') === -1 && v.themes.indexOf('food') === -1);
const overall = median(judged.map(v => v.views)) || 1;
const overallAvp = median(judged.filter(v => v.avp != null).map(v => v.avp));
const themes = THEMES.map(x => {
  const g = judged.filter(v => v.themes.indexOf(x[0]) >= 0);
  const med = median(g.map(v => v.views));
  const ratio = g.length ? Math.round(med / overall * 100) / 100 : null;
  const avps = g.filter(v => v.avp != null).map(v => v.avp);
  const verdict = g.length >= MIN_N ? (ratio >= STRONG ? 'strong' : ratio <= WEAK ? 'weak' : 'normal') : 'unknown';
  return { key: x[0], label: x[1], re: x[2], n: g.length, median: med, ratio, avp: avps.length ? Math.round(median(avps)) : null, verdict };
});
// 성경·요리는 쇼츠 파이프라인 주제가 아니므로 강약 판정에서 뺀다 (성경 쇼츠는 중단)
const strong = themes.filter(t => t.verdict === 'strong' && t.key !== 'bible' && t.key !== 'food');
const weak = themes.filter(t => t.verdict === 'weak' && t.key !== 'bible' && t.key !== 'food');
const recent = videos.filter(v => v.ageDays <= REPEAT_DAYS).map(v => ({ head: v.head, ageDays: v.ageDays, themes: v.themes, views: v.views }));
const byViews = judged.slice().sort((a, b) => b.views - a.views);
const fmt = v => v.head.slice(0, 40) + ' (' + v.views + '회' + (v.avp != null ? ', 평균 ' + v.avp + '% 시청' : '') + ', ' + v.sec + '초)';
console.log('쇼츠 ' + videos.length + '개 / 판정 ' + judged.length + '개 / 채널 중간값 ' + overall + '회' + (analyticsOk ? ' / 평균 시청 비율 중간값 ' + overallAvp + '%' : ' / Analytics 없음'));
console.log('강한 테마: ' + (strong.map(t => t.label + ' ×' + t.ratio).join(', ') || '-') + ' | 약한 테마: ' + (weak.map(t => t.label + ' ×' + t.ratio).join(', ') || '-'));
return [{ json: {
  analyticsOk, overallMedian: overall, overallAvp,
  themes, strong: strong.map(t => t.key), weak: weak.map(t => t.key),
  top: byViews.slice(0, 8).map(fmt), bottom: byViews.slice(-8).reverse().map(fmt),
  recent, videos
} }];
