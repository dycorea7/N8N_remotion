// 대본 벤치마크 1.5: Claude가 준 검색어 2줄을 따로 검색한다 (주제 그대로 + 같은 시청자의 조금 넓은 주제). 실패하면 기본 검색어 하나
const k = $json;
const text = String((k.content && k.content[0] && k.content[0].text) || '');
const qs = [];
text.split(/\n/).map(l => l.replace(/^\s*(\d+[.)]|line\s*\d+:?|-)\s*/i, '').replace(/["'`]/g, ' ').replace(/[^가-힣A-Za-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim())
  .filter(Boolean).forEach(l => { if (!qs.includes(l) && qs.length < 2) qs.push(l); });
if (!qs.length) qs.push(String($('Benchmark Query').first().json.q || '').trim());
console.log('벤치마크 검색어: ' + qs.join(' / '));
return qs.map((q, i) => ({ json: { q, broad: i > 0 } }));
