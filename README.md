# Motion Shorts — GitHub Actions 렌더 (VPS 없음)

n8n 워크플로우 **"NextYou Global - Motion Shorts v2 (GitHub Actions + fal.ai)"** 의 렌더 부분입니다.
이 폴더를 그대로 **비공개 GitHub 저장소**에 올리면, n8n이 렌더할 때마다 GitHub의 클라우드 머신이 영상을 만들어 돌려줍니다.

```
시트(pending) → Claude: 대본을 7~9장면으로 나누고 장면마다 모션 그래픽 또는 AI 이미지 설계
  → ElevenLabs /with-timestamps: 나레이션 + 글자별 타임스탬프
  → fal.ai Seedream: image 장면 이미지 (최대 3장, 카테고리별 화풍)
  → job.json을 드라이브에 올리고 링크 공유
  → GitHub Actions(render.yml): Remotion으로 1080×1920 렌더 → 릴리스 'renders'에 mp4 업로드 → n8n Wait 노드 깨움
  → n8n: 영상을 드라이브에 복사 → 텔레그램 승인 → YouTube(unlisted) → 시트 uploaded
```

## 1. GitHub 저장소 만들기 (처음 한 번)

1. github.com → **New repository** → 이름 `N8N_remotion` (이미 만들어져 있음)
2. 이 zip을 풀어서 안의 내용(`.github` 폴더, `remotion` 폴더, `README.md`)을 저장소에 올립니다.
   - 웹에서: 저장소 화면 → **Add file → Upload files** → 폴더들을 끌어다 놓기 → Commit
   - Windows 탐색기에서 `.github` 폴더가 안 보이면 보기 → 숨긴 항목 체크
   - 또는 git:
     ```bash
     cd N8N_remotion && git init -b main && git add . && git commit -m "motion shorts renderer"
     git remote add origin https://github.com/dycorea7/N8N_remotion.git && git push -u origin main
     ```
3. 저장소 → **Actions** 탭에 "Render Short"가 보이면 성공입니다.

## 2. GitHub 토큰 만들기

github.com → 오른쪽 위 프로필 → **Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token**
- Repository access: **Only select repositories** → `N8N_remotion`
- Permissions → Repository permissions:
  - **Actions: Read and write** (렌더 실행)
  - **Contents: Read-only** (완성 영상 다운로드)
- 만료일은 원하는 만큼 (만료되면 n8n 크리덴셜만 새 토큰으로 바꾸면 됩니다)

## 3. n8n 설정 (2곳)

1. **Build Render Job** 노드 맨 위 `const GITHUB_REPO = '';` → `'dycorea7/N8N_remotion'`
2. **Start GitHub Render** 노드 → 크리덴셜 **GitHub** 새로 만들기 → Access Token에 위 토큰 붙여넣기
   (**Download Video**, **Download Video for Upload** 노드에도 같은 크리덴셜 선택)

나머지 크리덴셜(Anthropic, ElevenLabs, fal.ai, 드라이브, 시트, 텔레그램, 유튜브)은 기존 것이 이미 연결돼 있습니다.

v2/v3 Daily Shorts를 끈 상태에서 수동 실행하세요. 텔레그램 메시지에 장면 구성, AI 이미지 개수, 렌더 시간, 경고가 같이 옵니다.

## 비용과 시간

- GitHub Free 플랜: 비공개 저장소에 월 2,000분 무료. 1편당 약 7~10분(설치 2~3분 + 렌더 5~6분) → 하루 1편이면 한 달 약 300분.
- 완성 영상은 GitHub 릴리스 `renders`에 올라가고 7일 지나면 자동 삭제됩니다. 드라이브 나레이션 폴더에도 미리보기용 mp4와 job.json이 남습니다.
- fal.ai 이미지는 편당 최대 3장. 끄려면 **Build Claude Request** 맨 위 `USE_AI_IMAGES = false`, 개수는 `MAX_IMAGES`.

## 장면 종류 (Claude가 고름)

| type | 화면 | 타이밍 |
|---|---|---|
| image | fal.ai 이미지 전체 화면 + 천천히 줌/패닝, 위쪽 키워드 | 장면 시작 |
| headline | 단어별로 튀어 오르는 큰 문장, 강조 단어 색+밑줄 | 장면 시작 |
| stat | 숫자 카운트업 (% 이면 원형 게이지) | 나레이션이 그 숫자를 말할 때 |
| chart | 가로 막대, 최댓값 강조 | 각 라벨을 말할 때 막대가 자람 |
| list | 번호 카드, 현재 항목 강조 | 각 항목을 말할 때 등장 |
| compare | 위·아래 카드 + VS | 순서대로 |
| quote / scripture | 인용 카드 (scripture는 빛줄기·세리프체) | 단어별 페이드 |
| icon | 큰 이모지 + 문장 | |
| outro | 마무리 문장 + 구독 버튼 | |

**자막:** 모든 장면에 나레이션 자막이 화면 중하단(유튜브 UI를 피한 위치)에 2~3단어씩 나오고, 지금 말하는 단어가 강조색으로 바뀝니다. 이미지 장면에서는 아래쪽을 어둡게 깔아 읽히게 합니다.

**실패 처리:** 이미지 생성이나 다운로드가 실패한 장면은 같은 키워드의 headline 장면으로 바뀌어 렌더가 멈추지 않습니다. Claude가 잘못된 장면 데이터를 줘도 그 장면만 headline으로 대체됩니다. Actions 렌더가 실패하면 n8n이 로그 링크와 함께 에러로 멈춥니다.

## 화풍·색 바꾸기

- AI 이미지 화풍: n8n **Prepare Image Jobs** 노드의 `STYLES` (bible=회화풍 빛, health=실사, 나머지=신카이풍)
- 영상 색 테마: `remotion/src/theme.ts`
- 로컬 미리보기: `cd remotion && npm install && npm run studio`

## (선택) VPS로 돌리기

`remotion/server.mjs`, `remotion/Dockerfile`, `deploy/`는 VPS 렌더 서버용입니다. GitHub Actions만 쓰면 필요 없습니다.
