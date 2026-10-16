"""Motion Longform 워크플로우 SDK 코드 생성기 (python3 gen_longform_workflow.py > longform_workflow.ts)."""
import json, pathlib

HERE = pathlib.Path(__file__).resolve().parent
def code(name): return (HERE / name).read_text(encoding='utf-8')

SHEET_DOC = {"__rl": True, "mode": "id", "value": "1_RFLFLkxolbaSVOw-tWf8SuBKE0FV9n6dfqUrFoOA2k"}
SHEET_MAIN = {"__rl": True, "cachedResultName": "Sheet1", "mode": "list", "value": "gid=0"}
SHEET_LOG = {"__rl": True, "mode": "name", "value": "MotionLongform"}
SHEETS = {"googleSheetsOAuth2Api": {"id": "0cZFMuAKCn5sTGLr", "name": "Google Sheets account"}}
DRIVE = {"googleDriveOAuth2Api": {"id": "1k1XeWhKkI3b2p1u", "name": "Google Drive account"}}
GH = {"githubApi": {"id": "a2UFvOs5ceHM8VC5", "name": "GitHub account"}}
TG = {"telegramApi": {"id": "MqKwiZpa0oSigPGM", "name": "Telegram account"}}
YT = {"youTubeOAuth2Api": {"id": "HE5xUScbPHMgviXV", "name": "YouTube account"}}
NARR_FOLDER = {"__rl": True, "mode": "id", "value": "1xNjOz0G8N_ZIQsJwfB-JRW4g9gKvjajd"}
MY_DRIVE = {"__rl": True, "mode": "list", "value": "My Drive"}
RETRY3 = dict(retryOnFail=True, maxTries=3, waitBetweenTries=5000)
YT_AUTH = {"authentication": "predefinedCredentialType", "nodeCredentialType": "youTubeOAuth2Api"}
GH_AUTH = {"authentication": "predefinedCredentialType", "nodeCredentialType": "githubApi"}

TG_MSG = ("=🎬 롱폼 렌더 완료\n\n제목: {{ $('Parse Longform Script').first().json.title }}\n"
  "원본 쇼츠: {{ $('Pick Short').first().json.shortTitle }} (조회 {{ $('Pick Short').first().json.shortViews }})\n"
  "길이: {{ $('Check Render Result').first().json.durationText }} · 챕터 {{ $('Parse Longform Script').first().json.chapters.length }}개 · 장면 {{ $('Build Render Job').first().json.sceneCount }}개\n"
  "대본: {{ $('Parse Longform Script').first().json.scriptLength }}자 · 카테고리 {{ $('Parse Longform Script').first().json.category }}\n"
  "AI 이미지: {{ $('Build Render Job').first().json.imagesOk }}장 (실패 {{ $('Build Render Job').first().json.imagesFailed }}) · 썸네일 이미지 {{ $('Build Render Job').first().json.thumbImage ? '있음' : '없음' }}\n"
  "렌더: {{ Math.round($('Check Render Result').first().json.render_sec / 60) }}분 · {{ $('Check Render Result').first().json.size_mb }}MB\n"
  "경고: {{ $('Check Render Result').first().json.warningsText }}\n\n"
  "미리보기: https://drive.google.com/file/d/{{ $json.id }}/view\n\n업로드할까요? (거절하면 이 쇼츠는 다음에 다시 고르지 않습니다)")

def gh_get(name, url, extra=None):
    return dict(name=name, type='n8n-nodes-base.httpRequest', v=4.3, extra=extra or RETRY3, cred=GH, params=dict(
        url=url, **GH_AUTH, sendHeaders=True, headerParameters={"parameters": [{"name": "Accept", "value": "application/octet-stream"}]},
        options={"response": {"response": {"responseFormat": "file"}}, "timeout": 300000}))

def codenode(name, f): return dict(name=name, type='n8n-nodes-base.code', v=2, params={"jsCode": code(f)})
def append_log(name): return dict(name=name, type='n8n-nodes-base.googleSheets', v=4.5, cred=SHEETS, extra=dict(retryOnFail=True, maxTries=4, waitBetweenTries=5000),
    params={"operation": "append", "documentId": SHEET_DOC, "sheetName": SHEET_LOG, "columns": {"mappingMode": "autoMapInputData", "value": {}}, "options": {}})
def ifnode(name, left, op): return dict(name=name, type='n8n-nodes-base.if', v=2.2, ifelse=True, params={"conditions": {
    "options": {"caseSensitive": True, "leftValue": "", "typeValidation": "loose", "version": 2},
    "conditions": [{"leftValue": left, "operator": op, "rightValue": ""}], "combinator": "and"}, "options": {}})
BOOL_TRUE = {"type": "boolean", "operation": "true", "singleValue": True}

N = {}
def add(var, d): N[var] = d

add('schedule', dict(name='Tue & Fri 1PM', type='n8n-nodes-base.scheduleTrigger', v=1.2, trigger=True,
    params={"rule": {"interval": [{"field": "cronExpression", "expression": "0 13 * * 2,5"}]}}))
add('readSheet', dict(name='Read Topic Sheet', type='n8n-nodes-base.googleSheets', v=4.5, cred=SHEETS,
    extra=dict(retryOnFail=True, maxTries=4, waitBetweenTries=5000), params={"documentId": SHEET_DOC, "sheetName": SHEET_MAIN, "options": {}}))
add('readLog', dict(name='Read Longform Log', type='n8n-nodes-base.googleSheets', v=4.5, cred=SHEETS,
    extra=dict(executeOnce=True, alwaysOutputData=True, retryOnFail=True, maxTries=4, waitBetweenTries=5000),
    params={"documentId": SHEET_DOC, "sheetName": SHEET_LOG, "options": {}}))
add('collect', codenode('Collect Short IDs', 'collect_short_ids.js'))
add('ytStats', dict(name='Shorts View Counts', type='n8n-nodes-base.httpRequest', v=4.3, cred=YT, extra=RETRY3, params=dict(
    url="https://www.googleapis.com/youtube/v3/videos", **YT_AUTH, sendQuery=True,
    queryParameters={"parameters": [{"name": "part", "value": "statistics,snippet"}, {"name": "id", "value": "={{ $json.ids }}"}, {"name": "maxResults", "value": "50"}]},
    options={"timeout": 60000})))
add('pickShort', codenode('Pick Short', 'pick_short.js'))
add('buildReq', codenode('Build Longform Request', 'build_longform_request.js'))
add('claude', dict(name='Claude - Longform Script', type='n8n-nodes-base.httpRequest', v=4.3, extra=dict(retryOnFail=True, maxTries=2, waitBetweenTries=10000),
    cred={"anthropicApi": {"id": "AsWnrNE2knZqRLta", "name": "Anthropic account"}}, params={
    "method": "POST", "url": "https://api.anthropic.com/v1/messages", "authentication": "predefinedCredentialType", "nodeCredentialType": "anthropicApi",
    "sendHeaders": True, "headerParameters": {"parameters": [{"name": "anthropic-version", "value": "2023-06-01"}, {"name": "content-type", "value": "application/json"}]},
    "sendBody": True, "specifyBody": "json", "jsonBody": "={{ $json.body }}", "options": {"timeout": 600000}}))
add('parse', codenode('Parse Longform Script', 'parse_longform_script.js'))
add('tts', dict(name='ElevenLabs TTS (timestamps)', type='n8n-nodes-base.httpRequest', v=4.3, extra=dict(retryOnFail=True, maxTries=2, waitBetweenTries=10000),
    cred={"httpHeaderAuth": {"id": "tttbA9a5I55qIbLc", "name": "ElevenLabs API"}}, params={
    "method": "POST", "url": "=https://api.elevenlabs.io/v1/text-to-speech/{{ $json.subtitleLang === 'ko' ? 'srhGhMYcxqeTNVuSRvWg' : 'CwhRBWXzGAHq8TQ4Fs17' }}/with-timestamps",
    "authentication": "genericCredentialType", "genericAuthType": "httpHeaderAuth", "sendHeaders": True,
    "headerParameters": {"parameters": [{"name": "content-type", "value": "application/json"}]}, "sendBody": True, "specifyBody": "json",
    "jsonBody": "={{ { \"text\": $json.script, \"model_id\": \"eleven_multilingual_v2\", \"voice_settings\": { \"stability\": 0.5, \"similarity_boost\": 0.75, \"speed\": 1.08 } } }}",
    "options": {"timeout": 480000}}))
add('music', dict(name='List Music Files', type='n8n-nodes-base.googleDrive', v=3, cred=DRIVE,
    extra=dict(executeOnce=True, alwaysOutputData=True, onError='continueRegularOutput'), params={
    "resource": "fileFolder", "searchMethod": "query", "queryString": "=", "returnAll": True,
    "filter": {"driveId": MY_DRIVE, "folderId": {"__rl": True, "mode": "id", "value": "1_ThaZQ29sauz4BvRejOjg-0Ug3SaiTlm"}, "whatToSearch": "files"},
    "options": {"fields": ["id", "name"]}}))
add('prepImages', codenode('Prepare Image Jobs', 'prepare_image_jobs_long.js'))
add('anyImages', ifnode('Any Images?', "={{ $json.skip !== true }}", BOOL_TRUE))
add('fal', dict(name='fal.ai Generate Image', type='n8n-nodes-base.httpRequest', v=4.3,
    extra=dict(retryOnFail=True, maxTries=2, waitBetweenTries=5000, onError='continueRegularOutput'),
    cred={"httpHeaderAuth": {"id": "zJNmrgWyP178Ecfj", "name": "Fal.ai"}}, params={
    "method": "POST", "url": "https://fal.run/fal-ai/bytedance/seedream/v4/text-to-image", "authentication": "genericCredentialType",
    "genericAuthType": "httpHeaderAuth", "sendBody": True, "specifyBody": "json", "jsonBody": "={{ $json.body }}",
    "options": {"batching": {"batch": {"batchSize": 3}}, "timeout": 180000}}))
add('renderJob', codenode('Build Render Job', 'build_render_job_long.js'))
add('uploadJob', dict(name='Upload Job to Drive', type='n8n-nodes-base.googleDrive', v=3, cred=DRIVE, extra=RETRY3,
    params={"name": "={{ $json.jobId }}.json", "driveId": MY_DRIVE, "folderId": NARR_FOLDER, "options": {}}))
add('shareJob', dict(name='Share Job File', type='n8n-nodes-base.googleDrive', v=3, cred=DRIVE, extra=RETRY3, params={
    "operation": "share", "fileId": {"__rl": True, "mode": "id", "value": "={{ $json.id }}"},
    "permissionsUi": {"permissionsValues": {"role": "reader", "type": "anyone"}}, "options": {}}))
add('startRender', dict(name='Start GitHub Render', type='n8n-nodes-base.httpRequest', v=4.3, cred=GH, extra=RETRY3, params=dict(
    method="POST", url="=https://api.github.com/repos/{{ $('Build Render Job').first().json.repo }}/actions/workflows/render.yml/dispatches", **GH_AUTH,
    sendHeaders=True, headerParameters={"parameters": [{"name": "Accept", "value": "application/vnd.github+json"}, {"name": "X-GitHub-Api-Version", "value": "2022-11-28"}]},
    sendBody=True, specifyBody="json",
    jsonBody="={{ { \"ref\": $('Build Render Job').first().json.branch, \"inputs\": { \"job_id\": $('Build Render Job').first().json.jobId, \"job_url\": 'https://drive.google.com/uc?export=download&id=' + $('Upload Job to Drive').first().json.id, \"resume_url\": $execution.resumeUrl, \"format\": \"long\" } } }}",
    options={"timeout": 60000})))
add('waitRender', dict(name='Wait for Render', type='n8n-nodes-base.wait', v=1.1, params={
    "resume": "webhook", "httpMethod": "POST", "limitWaitTime": True, "resumeAmount": 3, "resumeUnit": "hours", "options": {}}))
add('checkResult', codenode('Check Render Result', 'check_render_result_long.js'))
add('dlPreview', gh_get('Download Video', "=https://api.github.com/repos/{{ $json.repo }}/releases/assets/{{ $json.asset_id }}"))
add('uploadPreview', dict(name='Upload Preview to Drive', type='n8n-nodes-base.googleDrive', v=3, cred=DRIVE, extra=RETRY3,
    params={"name": "={{ $('Check Render Result').first().json.jobId }}.mp4", "driveId": MY_DRIVE, "folderId": NARR_FOLDER, "options": {}}))
add('tgApproval', dict(name='Telegram Approval', type='n8n-nodes-base.telegram', v=1.2, cred=TG,
    params={"operation": "sendAndWait", "chatId": "6213393108", "message": TG_MSG, "options": {}}))
add('approved', ifnode('Approved?', "={{ $json.data.approved }}", BOOL_TRUE))
add('uploadMeta', codenode('Build Upload Meta', 'build_upload_meta.js'))
add('dlFinal', gh_get('Download Video for Upload', "=https://api.github.com/repos/{{ $('Check Render Result').first().json.repo }}/releases/assets/{{ $('Check Render Result').first().json.asset_id }}"))
add('ytUpload', dict(name='YouTube Upload', type='n8n-nodes-base.youTube', v=1, cred=YT, extra=RETRY3, params={
    "resource": "video", "operation": "upload", "title": "={{ $('Build Upload Meta').first().json.title }}", "regionCode": "CA", "categoryId": "27",
    "options": {"description": "={{ $('Build Upload Meta').first().json.description }}", "privacyStatus": "public", "tags": "={{ $('Build Upload Meta').first().json.tags }}"}}))
add('dlThumb', gh_get('Download Thumbnail', "=https://api.github.com/repos/{{ $('Check Render Result').first().json.repo }}/releases/assets/{{ $('Check Render Result').first().json.thumb_asset_id || 'none' }}",
    extra=dict(retryOnFail=True, maxTries=2, waitBetweenTries=5000, onError='continueRegularOutput')))
add('setThumb', dict(name='Set Thumbnail', type='n8n-nodes-base.httpRequest', v=4.3, cred=YT, extra=dict(onError='continueRegularOutput'), params=dict(
    method="POST", url="=https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId={{ $('YouTube Upload').first().json.uploadId }}", **YT_AUTH,
    sendBody=True, contentType="binaryData", inputDataFieldName="data", options={"timeout": 60000})))
add('logRow', codenode('Log Row (uploaded)', 'log_row.js'))
add('appendLog', append_log('Append Longform Log'))
add('notifyDone', dict(name='Notify Upload Complete', type='n8n-nodes-base.telegram', v=1.2, cred=TG, params={
    "chatId": "6213393108", "additionalFields": {},
    "text": "=✅ 롱폼 업로드 완료\n\n제목: {{ $('Build Upload Meta').first().json.title }}\n챕터: {{ $('Build Upload Meta').first().json.chapterCount }}개 · 썸네일: {{ $('Set Thumbnail').first().json.error ? '실패 (유튜브 채널 인증 필요할 수 있음)' : '적용' }}\n\n링크: https://youtube.com/watch?v={{ $('YouTube Upload').first().json.uploadId }}"}))
add('findPlaylists', dict(name='Find Playlists', type='n8n-nodes-base.httpRequest', v=4.3, cred=YT, extra=dict(onError='continueRegularOutput'), params=dict(
    url="https://www.googleapis.com/youtube/v3/playlists", **YT_AUTH, sendQuery=True,
    queryParameters={"parameters": [{"name": "part", "value": "snippet"}, {"name": "mine", "value": "true"}, {"name": "maxResults", "value": "50"}]},
    options={"timeout": 30000})))
add('pickPlaylist', codenode('Pick Playlist', 'pick_playlist_long.js'))
add('plExists', ifnode('Playlist Exists?', "={{ $json.playlistId }}", {"operation": "notEmpty", "singleValue": True, "type": "string"}))
add('createPlaylist', dict(name='Create Playlist', type='n8n-nodes-base.httpRequest', v=4.3, cred=YT, extra=dict(retryOnFail=True, maxTries=2, waitBetweenTries=5000), params=dict(
    method="POST", url="https://www.googleapis.com/youtube/v3/playlists", **YT_AUTH, sendQuery=True,
    queryParameters={"parameters": [{"name": "part", "value": "snippet,status"}]}, sendBody=True, specifyBody="json",
    jsonBody="={{ { snippet: { title: $json.title, description: $json.description, defaultLanguage: 'ko' }, status: { privacyStatus: 'public' } } }}",
    options={"timeout": 30000})))
add('addToPlaylist', dict(name='Add To Playlist', type='n8n-nodes-base.httpRequest', v=4.3, cred=YT, extra=RETRY3, params=dict(
    method="POST", url="https://www.googleapis.com/youtube/v3/playlistItems", **YT_AUTH, sendQuery=True,
    queryParameters={"parameters": [{"name": "part", "value": "snippet"}]}, sendBody=True, specifyBody="json",
    jsonBody="={{ { snippet: { playlistId: $json.playlistId || $json.id, resourceId: { kind: 'youtube#video', videoId: $('YouTube Upload').first().json.uploadId } } } }}",
    options={"timeout": 30000})))
add('logRejected', codenode('Log Row (rejected)', 'log_row_rejected.js'))
add('appendRejected', append_log('Append Rejected Log'))

def ts(v):
    if isinstance(v, str):
        if len(v) > 1 and v.startswith('='): return 'expr(' + json.dumps(v[1:], ensure_ascii=False) + ')'
        return json.dumps(v, ensure_ascii=False)
    if isinstance(v, bool): return 'true' if v else 'false'
    if isinstance(v, (int, float)): return json.dumps(v)
    if isinstance(v, list): return '[' + ', '.join(ts(x) for x in v) + ']'
    if isinstance(v, dict): return '{ ' + ', '.join(json.dumps(k) + ': ' + ts(x) for k, x in v.items()) + ' }'
    raise TypeError(v)

out = ["import { workflow, node, trigger, sticky, ifElse, expr } from '@n8n/workflow-sdk';", ""]
for var, d in N.items():
    cfg = {"name": d['name'], "parameters": d['params']}
    cfg.update(d.get('extra') or {})
    if d.get('cred'): cfg["credentials"] = d['cred']
    body = ts(cfg)
    if d.get('trigger'): out.append(f"const {var} = trigger({{ type: '{d['type']}', version: {d['v']}, config: {body} }});")
    elif d.get('ifelse'): out.append(f"const {var} = ifElse({{ version: {d['v']}, config: {body} }});")
    else: out.append(f"const {var} = node({{ type: '{d['type']}', version: {d['v']}, config: {body}, output: [{{}}] }});")

NOTE = ("## 🎬 Motion Longform (16:9, 8~10분)\n조회수가 가장 높은 업로드 쇼츠(아직 롱폼으로 안 만든 것)를 골라 롱폼으로 확장합니다. 화·금 오후 1시.\n\n"
        "Claude 챕터 대본·장면 설계 → ElevenLabs → fal.ai 이미지(최대 14장 + 썸네일) → GitHub Actions 렌더(약 50~70분, 쇼츠와 다른 대기열) → 텔레그램 승인 → 공개 업로드 + 썸네일 + 챕터 타임스탬프 + 롱폼 재생목록\n\n"
        "기록: 시트 `MotionLongform` 탭 (거절도 기록 → 같은 쇼츠를 다시 고르지 않음. 다시 만들려면 그 줄을 지우세요)\n"
        "길이·이미지 수: Build Longform Request 맨 위")
out.append(f"const note = sticky({json.dumps(NOTE, ensure_ascii=False)}, [readSheet, readLog, collect, pickShort], {{ color: 5 }});")
out.append("""
export default workflow('motion-longform', 'NextYou Global - Motion Longform (16:9 롱폼)')
  .add(schedule)
  .to(readSheet)
  .to(readLog)
  .to(collect)
  .to(ytStats)
  .to(pickShort)
  .to(buildReq)
  .to(claude)
  .to(parse)
  .to(tts)
  .to(music)
  .to(prepImages)
  .to(anyImages
    .onTrue(fal.to(renderJob))
    .onFalse(renderJob))
  .add(renderJob)
  .to(uploadJob)
  .to(shareJob)
  .to(startRender)
  .to(waitRender)
  .to(checkResult)
  .to(dlPreview)
  .to(uploadPreview)
  .to(tgApproval)
  .to(approved
    .onTrue(uploadMeta.to(dlFinal.to(ytUpload.to(dlThumb.to(setThumb.to(logRow.to(appendLog.to(notifyDone.to(findPlaylists.to(pickPlaylist.to(plExists
      .onTrue(addToPlaylist)
      .onFalse(createPlaylist.to(addToPlaylist)))))))))))))
    .onFalse(logRejected.to(appendRejected)))
  .add(note)
  .group('Pick a short', [readSheet, readLog, collect, ytStats, pickShort], { description: 'Most-viewed uploaded Korean short that has no long-form yet' })
  .group('Script & voice', [buildReq, claude, parse, tts, music], { description: 'Claude writes a chaptered 8-10 minute script with scene designs, ElevenLabs narration with timestamps' })
  .group('Images & render', [prepImages, anyImages, fal, renderJob, uploadJob, shareJob, startRender, waitRender, checkResult, dlPreview, uploadPreview], { description: '16:9 fal.ai images + thumbnail image, GitHub Actions renders the long composition and thumbnail' })
  .group('Publish', [tgApproval, approved, uploadMeta, dlFinal, ytUpload, dlThumb, setThumb, logRow, appendLog, notifyDone, findPlaylists, pickPlaylist, plExists, createPlaylist, addToPlaylist, logRejected, appendRejected], { description: 'Telegram approval, public upload with chapters and thumbnail, log, playlist' });
""")
print('\n'.join(out))
