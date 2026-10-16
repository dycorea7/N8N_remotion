// 업로드할 설명란: Claude 설명 + 렌더 결과의 챕터 시각(유튜브 챕터) + 원본 쇼츠 링크 + 해시태그
const p = $('Parse Longform Script').first().json;
const r = $('Check Render Result').first().json;
const fmt = function (sec) {
  sec = Math.max(0, Math.floor(sec));
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  const pad = function (n) { return String(n).padStart(2, '0'); };
  return h ? h + ':' + pad(m) + ':' + pad(s) : pad(m) + ':' + pad(s);
};
// 유튜브 챕터 조건: 00:00 시작, 3개 이상, 각 10초 이상
let chapters = (r.chapters || []).filter(function (c) { return c && c.title && Number.isFinite(Number(c.start)); });
chapters = chapters.filter(function (c, i) { return i === 0 || Number(c.start) - Number(chapters[i - 1].start) >= 10; });
let chapterBlock = '';
if (chapters.length >= 3) {
  chapters[0].start = 0;
  chapterBlock = '\n\n⏱ 목차\n' + chapters.map(function (c) { return fmt(c.start) + ' ' + c.title; }).join('\n');
}
const shortLine = p.shortVideoId ? '\n\n▶ 이 영상의 60초 쇼츠: https://youtube.com/shorts/' + p.shortVideoId : '';
const description = (p.description + chapterBlock + shortLine + '\n\n' + (p.hashtags || []).join(' ')).slice(0, 4900);
console.log('챕터 ' + chapters.length + '개 | 설명 ' + description.length + '자');
return [{ json: { title: p.title, description: description, tags: p.tagStr, chapterCount: chapters.length } }];
