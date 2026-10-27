// 사실 확인 1/3: 대본에서 인용·인물 사실·성경 구절만 뽑아 Claude에게 따로 검사시킨다
//  - 잘못 붙은 명언(인터넷에 도는 가짜 명언)이 그대로 영상에 나가는 것을 막는다
// ===== 설정 =====
const SCRIPT_NODE = 'Claude - Script & Motion Design';   // 대본을 쓴 Claude 노드
// ================
const raw = String(($json.content && $json.content[0] && $json.content[0].text) || '');
const clean = raw.replace(/```json|```/g, '').trim();
const tryParse = t => { try { return JSON.parse(t); } catch (e) { return null; } };
const s0 = clean.indexOf('{'), s1 = clean.lastIndexOf('}');
let parsed = tryParse(clean) || (s0 !== -1 && s1 > s0 ? tryParse(clean.slice(s0, s1 + 1)) : null);
// 파싱이 안 되면 검사하지 않고 넘긴다 (다음 노드의 파서가 오류를 낸다)
if (!parsed) return [{ json: { skip: true, reason: 'unparsed' } }];
// 롱폼은 chapters[].scenes, 쇼츠는 scenes
const scenes = Array.isArray(parsed.scenes) ? parsed.scenes : (parsed.chapters || []).flatMap(c => (c && c.scenes) || []);
const narr = scenes.map(x => String((x && x.narration) || '')).filter(Boolean).join('\n');
const cards = scenes.map(x => x && x.visual).filter(v => v && (v.type === 'quote' || v.type === 'scripture')).map(v => '- [' + v.type + '] ' + v.text + ' — ' + (v.author || ''));
// 따옴표·인용 표현·성경이 하나도 없으면 검사할 것이 없다
const hasQuote = cards.length > 0 || /[「」“”"]|말했|라고 했|이렇게 썼|남겼|명언|\d+:\d+/.test(narr);
if (!hasQuote) return [{ json: { skip: true, reason: 'no quotes' } }];
const prompt = `You are a strict fact-checker for a Korean YouTube script. Check ONLY these three things:
(a) Every direct quotation attributed to a named person (in the narration or on the quote cards): is it a well-documented quotation - a faithful Korean rendering of words that person actually wrote or said, traceable to their works, letters, speeches or a reliable quotation reference? Popular internet "quotes" that are misattributed, invented or only loosely inspired by the person are PROBLEMS. A sentence stated as "X said / 말했습니다 / 라고 했습니다" counts as a quotation.
(b) Specific factual claims about real named people or events (what they did, ages, years, numbers).
(c) Scripture: does that reference really contain that wording (Korean 개역개정)?
Be strict: if you are not confident something is accurate, list it as a problem. Ignore opinions, advice and general statements.

Narration:
${narr}
${cards.length ? '\nOn-screen quote/scripture cards:\n' + cards.join('\n') : ''}

Respond ONLY with JSON: {"ok": true or false, "problems": [{"text": "the exact doubtful sentence or quote", "issue": "why it is doubtful", "fix": "how to correct it - usually: paraphrase without quotation marks"}]}`;
return [{ json: { skip: false, body: { model: 'claude-sonnet-4-6', max_tokens: 1500, temperature: 0, messages: [{ role: 'user', content: prompt }] } } }];
