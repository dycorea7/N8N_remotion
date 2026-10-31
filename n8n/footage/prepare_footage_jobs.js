// 실사 영상 1/4: footage(이미지 장면)·bgFootage(그래픽 뒤 배경) 검색어를 붙인 장면마다 Pixabay 영상 검색 1건
//  - Pixabay: 상업적 이용 가능·출처 표기 불필요 (유튜브·방송 영상은 저작권 신고 위험이 있어 쓰지 않는다)
//  - 검색어가 없으면 skip 1건만 내보내 다음 단계가 계속 돈다
const MAX_SEARCH = 14;
const p = $('Parse Script JSON').first().json;
const jobs = [];
(p.scenes || []).forEach((s, i) => {
  const v = s.visual;
  if (!v || v.type === 'outro' || jobs.length >= MAX_SEARCH) return;
  const kind = v.type === 'image' ? 'image' : 'bg';
  if (kind === 'bg' && !v.bg) return;
  const words = String((kind === 'image' ? v.footage : v.bgFootage) || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(' ').filter(Boolean).slice(0, 5);
  if (words.length < 2) return;
  jobs.push({ json: { sceneIndex: i, kind, q: words.join(' '), narration: String(s.display || s.narration || '').slice(0, 140), prompt: String((kind === 'image' ? v.prompt : v.bg) || '').slice(0, 200) } });
});
console.log('실사 영상 검색 ' + jobs.length + '건: ' + jobs.map(j => j.json.q).join(' / '));
return jobs.length ? jobs : [{ json: { skip: true, q: 'nature' } }];
