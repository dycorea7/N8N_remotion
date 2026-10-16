// 최근 3주 한국어 쇼츠 수요를 기둥별로 정리한다.
// - 일평균 조회수(조회수 ÷ 게시 후 일수)로 비교해 오래된 영상이 유리해지지 않게 한다.
// - 한글 제목만 쓴다 (검색 결과에 외국어 영상이 섞여 수치가 부풀려지는 것을 막음).
// - 구독자 대비 조회수(돌파 배수)로 채널 덕이 아니라 '주제 덕'에 뜬 영상을 따로 뽑는다.
const NL = String.fromCharCode(10);
const HANGUL = /[가-힣]/;
const seeds = $('Build Search Queries').all().map(function (i) { return i.json; });
const statsItems = $('Shorts Video Stats').all();
const chanItems = $input.all();
const now = Date.now();

const subs = {};
chanItems.forEach(function (it) {
  (it.json.items || []).forEach(function (c) {
    const s = c.statistics || {};
    subs[c.id] = s.hiddenSubscriberCount ? null : Number(s.subscriberCount || 0);
  });
});

const clean = function (t) { return String(t || '').replace(/#[^\s#]+/g, '').replace(/\s{2,}/g, ' ').trim(); };
const seen = {};
const byPillar = {};
const all = [];
statsItems.forEach(function (it, i) {
  const seed = seeds[i] || { pillar: 'other', q: '' };
  (it.json.items || []).forEach(function (v) {
    const sn = v.snippet || {};
    const title = clean(sn.title);
    const key = title.replace(/\s+/g, '');
    // 같은 영상이 여러 검색어에 걸리거나, 같은 제목 재업로드가 섞이는 것을 한 번만 센다
    if (seen[v.id] || seen[key]) return;
    if (!HANGUL.test(title)) return;
    const views = Number((v.statistics || {}).viewCount || 0);
    const days = Math.max(1, (now - new Date(sn.publishedAt || now).getTime()) / 86400000);
    const sub = subs[sn.channelId];
    const row = {
      pillar: seed.pillar, title: title, channel: sn.channelTitle || '',
      views: views, vpd: Math.round(views / days),
      subs: sub == null ? null : sub,
      breakout: sub ? Math.round((views / Math.max(sub, 1000)) * 10) / 10 : null
    };
    seen[v.id] = true; seen[key] = true;
    (byPillar[seed.pillar] = byPillar[seed.pillar] || []).push(row);
    all.push(row);
  });
});

const median = function (arr) { if (!arr.length) return 0; const s = arr.slice().sort(function (a, b) { return a - b; }); return s[Math.floor(s.length / 2)]; };
const fmtN = function (n) { return n >= 10000 ? (Math.round(n / 1000) / 10) + '만' : String(n); };

// ── 기둥별 수요 점수: 상위 8개 일평균 조회수의 중앙값 ──
const demand = {};
const lines = [];
Object.keys(byPillar).forEach(function (p) {
  const rows = byPillar[p].sort(function (a, b) { return b.vpd - a.vpd; });
  demand[p] = median(rows.slice(0, 8).map(function (r) { return r.vpd; }));
  lines.push('[' + p + '] 한국어 영상 ' + rows.length + '개 / 상위 8개 일평균 조회수 중앙값 ' + fmtN(demand[p]));
  rows.slice(0, 6).forEach(function (r) {
    lines.push('  - ' + r.title + ' (' + fmtN(r.vpd) + '/일' + (r.breakout ? ', 구독자 대비 ' + r.breakout + '배' : '') + ')');
  });
});

// ── 작은 채널에서 터진 영상: 채널 덕이 아니라 주제·훅 덕에 뜬 것 → 가장 따라 하기 좋은 신호 ──
const breakouts = all
  .filter(function (r) { return r.subs != null && r.subs < 100000 && r.breakout >= 3 && r.views >= 20000; })
  .sort(function (a, b) { return b.breakout - a.breakout; })
  .slice(0, 12);
if (breakouts.length) {
  lines.push('');
  lines.push('[SMALL-CHANNEL BREAKOUTS - topic-driven hits, the most copyable signal]');
  breakouts.forEach(function (r) {
    lines.push('  - ' + r.title + ' (' + r.pillar + ', 구독자 ' + fmtN(r.subs) + ', 조회 ' + fmtN(r.views) + ', ' + r.breakout + '배)');
  });
}

// ── 훅 유형 통계: 상위 40개 제목 중 각 장치를 쓴 비율 ──
const SHAPES = [
  ['숫자 리스트 (N가지·N초·N분)', /\d+\s*(가지|개|단계|초|분|시간|일|년|배|%|살)/],
  ['나이 타깃 (50대·60세 이후)', /\d0\s*(대|세|살)|중년|노후|노년|\d{2}세/],
  ['경고·금지 (절대·하지 마라·최악)', /절대|하지\s*마|마세요|위험|망한|망친|안\s*되는|최악|조심|모르면/],
  ['이유형 (~하는 이유)', /이유/],
  ['사람·관계 (~하는 사람, 부모, 인간관계)', /사람|인간관계|부모|자녀|친구|남편|아내|사이/],
  ['역설형 (~할수록, 오히려)', /할수록|수록|오히려|사실은/]
];
const top = all.slice().sort(function (a, b) { return b.vpd - a.vpd; }).slice(0, 40);
const shapeStats = SHAPES.map(function (s) {
  const n = top.filter(function (r) { return s[1].test(r.title); }).length;
  return { name: s[0], pct: top.length ? Math.round((n / top.length) * 100) : 0 };
});
const avgLen = top.length ? Math.round(top.reduce(function (a, r) { return a + r.title.length; }, 0) / top.length) : 0;
lines.push('');
lines.push('[HOOK SHAPES in the top ' + top.length + ' Korean titles by views/day]');
shapeStats.forEach(function (s) { lines.push('  - ' + s.name + ': ' + s.pct + '%'); });
lines.push('  - 평균 제목 길이(해시태그 제외): ' + avgLen + '자');

console.log('한국어 영상 ' + all.length + '개 | 돌파 영상 ' + breakouts.length + '개 | 수요 ' + JSON.stringify(demand));
return [{ json: { report: lines.length ? lines.join(NL) : '(no demand data this week)', demand: demand, avgTitleLen: avgLen, koreanCount: all.length } }];
