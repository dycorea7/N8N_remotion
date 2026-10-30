// 실사 영상 1/3: Claude가 footage 검색어를 붙인 이미지 장면마다 Pixabay 영상 검색 1건을 만든다
//  - Pixabay: 상업적 이용 가능·출처 표기 불필요 (유튜브·방송 영상은 저작권 신고 위험이 있어 쓰지 않는다)
//  - 검색어가 없으면 skip 1건만 내보내 다음 단계가 계속 돈다
const p = $('Parse Script JSON').first().json;
const jobs = [];
(p.scenes || []).forEach((s, i) => {
  const v = s.visual;
  if (!v || v.type !== 'image') return;
  const q = String(v.footage || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim().split(' ').slice(0, 5).join(' ');
  if (q.length < 3) return;
  jobs.push({ json: { sceneIndex: i, q } });
});
console.log('실사 영상 검색 ' + jobs.length + '건: ' + jobs.map(j => j.json.q).join(' / '));
return jobs.length ? jobs : [{ json: { skip: true, q: 'nature' } }];
