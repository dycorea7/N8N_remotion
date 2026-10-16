"""Bible Shorts 워크플로우 SDK 코드 생성기.
Motion Shorts v2(live)와 같은 파이프라인. 다른 점: 성경 주제만 고름, 저녁 실행, 텔레그램 문구, 재생목록 고정."""
import json, sys, pathlib

CODE = pathlib.Path(__file__).resolve().parent.parent / 'code'
def code(name): return (CODE / name).read_text(encoding='utf-8')

SHEET_DOC = {"__rl": True, "mode": "id", "value": "1_RFLFLkxolbaSVOw-tWf8SuBKE0FV9n6dfqUrFoOA2k"}
SHEET_TAB = {"__rl": True, "cachedResultName": "Sheet1", "mode": "list", "value": "gid=0"}
SHEETS = {"googleSheetsOAuth2Api": {"id": "0cZFMuAKCn5sTGLr", "name": "Google Sheets account"}}
DRIVE = {"googleDriveOAuth2Api": {"id": "1k1XeWhKkI3b2p1u", "name": "Google Drive account"}}
GH = {"githubApi": {"id": "a2UFvOs5ceHM8VC5", "name": "GitHub account"}}
TG = {"telegramApi": {"id": "MqKwiZpa0oSigPGM", "name": "Telegram account"}}
YT = {"youTubeOAuth2Api": {"id": "HE5xUScbPHMgviXV", "name": "YouTube account"}}
NARR_FOLDER = {"__rl": True, "mode": "id", "value": "1xNjOz0G8N_ZIQsJwfB-JRW4g9gKvjajd"}
MY_DRIVE = {"__rl": True, "mode": "list", "value": "My Drive"}
RETRY3 = dict(retryOnFail=True, maxTries=3, waitBetweenTries=5000)

playlist_code = code('pick_playlist.js').replace("PLAYLISTS[p.category] || PLAYLISTS.other", "PLAYLISTS.bible; // Bible Shorts는 항상 말씀 재생목록")

TG_MSG = ("=📖 성경 쇼츠 렌더 완료 (Bible Shorts)\n\n제목: {{ $('Parse Script JSON').first().json.title }}\n"
  "주제: {{ $('Pick Bible Topic').first().json.Topic }}\n"
  "카테고리: {{ $('Parse Script JSON').first().json.category }} · {{ $('Check Render Result').first().json.duration_sec }}초\n"
  "장면: {{ $('Build Render Job').first().json.sceneTypes }}\n"
  "AI 이미지: {{ $('Build Render Job').first().json.imagesOk }}장 (실패 {{ $('Build Render Job').first().json.imagesFailed }})\n"
  "음악: {{ $('Build Render Job').first().json.musicName }}\n"
  "렌더: {{ $('Check Render Result').first().json.render_sec }}초 · {{ $('Check Render Result').first().json.size_mb }}MB\n"
  "경고: {{ $('Check Render Result').first().json.warningsText }}\n"
  "남은 성경 주제: {{ $('Pick Bible Topic').first().json.biblePendingLeft }}개\n\n"
  "미리보기: https://drive.google.com/file/d/{{ $json.id }}/view\n\n업로드할까요?")

def gh_get(name, url):
    return dict(var=None, name=name, type='n8n-nodes-base.httpRequest', v=4.3, extra=RETRY3, cred=GH, params={
        "url": url, "authentication": "predefinedCredentialType", "nodeCredentialType": "githubApi",
        "sendHeaders": True, "headerParameters": {"parameters": [{"name": "Accept", "value": "application/octet-stream"}]},
        "options": {"response": {"response": {"responseFormat": "file"}}, "timeout": 120000}})

N = {}
def add(var, d): d['var'] = var; N[var] = d

add('dailyTrigger', dict(name='Daily Trigger', type='n8n-nodes-base.scheduleTrigger', v=1.2, trigger=True,
    params={"rule": {"interval": [{"triggerAtHour": int(sys.argv[1]) if len(sys.argv) > 1 else 18, "triggerAtMinute": 30}]}}))
add('readSheet', dict(name='Read Topic Sheet', type='n8n-nodes-base.googleSheets', v=4.5, cred=SHEETS,
    extra=dict(retryOnFail=True, maxTries=4, waitBetweenTries=5000),
    params={"documentId": SHEET_DOC, "sheetName": SHEET_TAB, "options": {}}))
add('pickTopic', dict(name='Pick Bible Topic', type='n8n-nodes-base.code', v=2, params={"jsCode": code('pick_bible_topic.js')}))
add('buildClaude', dict(name='Build Claude Request', type='n8n-nodes-base.code', v=2, params={"jsCode": code('build_claude_request.js')}))
add('claude', dict(name='Claude - Script & Motion Design', type='n8n-nodes-base.httpRequest', v=4.3, extra=RETRY3,
    cred={"anthropicApi": {"id": "AsWnrNE2knZqRLta", "name": "Anthropic account"}}, params={
    "method": "POST", "url": "https://api.anthropic.com/v1/messages", "authentication": "predefinedCredentialType",
    "nodeCredentialType": "anthropicApi", "sendHeaders": True,
    "headerParameters": {"parameters": [{"name": "anthropic-version", "value": "2023-06-01"}, {"name": "content-type", "value": "application/json"}]},
    "sendBody": True, "specifyBody": "json", "jsonBody": "={{ $json.body }}", "options": {"timeout": 180000}}))
add('parse', dict(name='Parse Script JSON', type='n8n-nodes-base.code', v=2, params={"jsCode": code('parse_script.js')}))
add('tts', dict(name='ElevenLabs TTS (timestamps)', type='n8n-nodes-base.httpRequest', v=4.3, extra=RETRY3,
    cred={"httpHeaderAuth": {"id": "tttbA9a5I55qIbLc", "name": "ElevenLabs API"}}, params={
    "method": "POST", "url": "=https://api.elevenlabs.io/v1/text-to-speech/{{ $json.subtitleLang === 'ko' ? 'srhGhMYcxqeTNVuSRvWg' : 'CwhRBWXzGAHq8TQ4Fs17' }}/with-timestamps",
    "authentication": "genericCredentialType", "genericAuthType": "httpHeaderAuth", "sendHeaders": True,
    "headerParameters": {"parameters": [{"name": "content-type", "value": "application/json"}]},
    "sendBody": True, "specifyBody": "json",
    "jsonBody": "={{ { \"text\": $json.script, \"model_id\": \"eleven_multilingual_v2\", \"voice_settings\": { \"stability\": 0.5, \"similarity_boost\": 0.75, \"speed\": 1.12 } } }}",
    "options": {"timeout": 180000}}))
add('music', dict(name='List Music Files', type='n8n-nodes-base.googleDrive', v=3, cred=DRIVE,
    extra=dict(executeOnce=True, alwaysOutputData=True, onError='continueRegularOutput'), params={
    "resource": "fileFolder", "searchMethod": "query", "queryString": "=", "returnAll": True,
    "filter": {"driveId": MY_DRIVE, "folderId": {"__rl": True, "mode": "id", "value": "1_ThaZQ29sauz4BvRejOjg-0Ug3SaiTlm"}, "whatToSearch": "files"},
    "options": {"fields": ["id", "name"]}}))
add('prepImages', dict(name='Prepare Image Jobs', type='n8n-nodes-base.code', v=2, params={"jsCode": code('prepare_image_jobs.js')}))
add('anyImages', dict(name='Any Images?', type='n8n-nodes-base.if', v=2.2, ifelse=True, params={"conditions": {
    "options": {"caseSensitive": True, "leftValue": "", "typeValidation": "loose", "version": 1},
    "conditions": [{"leftValue": "={{ $json.skip !== true }}", "operator": {"type": "boolean", "operation": "true", "singleValue": True}}],
    "combinator": "and"}, "options": {}}))
add('fal', dict(name='fal.ai Generate Image', type='n8n-nodes-base.httpRequest', v=4.3,
    extra=dict(retryOnFail=True, maxTries=2, waitBetweenTries=5000, onError='continueRegularOutput'),
    cred={"httpHeaderAuth": {"id": "zJNmrgWyP178Ecfj", "name": "Fal.ai"}}, params={
    "method": "POST", "url": "https://fal.run/fal-ai/bytedance/seedream/v4/text-to-image", "authentication": "genericCredentialType",
    "genericAuthType": "httpHeaderAuth", "sendBody": True, "specifyBody": "json", "jsonBody": "={{ $json.body }}",
    "options": {"batching": {"batch": {"batchSize": 2}}, "timeout": 180000}}))
add('renderJob', dict(name='Build Render Job', type='n8n-nodes-base.code', v=2, params={"jsCode": code('build_render_job.js')}))
add('uploadJob', dict(name='Upload Job to Drive', type='n8n-nodes-base.googleDrive', v=3, cred=DRIVE, extra=RETRY3,
    params={"name": "={{ $json.jobId }}.json", "driveId": MY_DRIVE, "folderId": NARR_FOLDER, "options": {}}))
add('shareJob', dict(name='Share Job File', type='n8n-nodes-base.googleDrive', v=3, cred=DRIVE, extra=RETRY3, params={
    "operation": "share", "fileId": {"__rl": True, "mode": "id", "value": "={{ $json.id }}"},
    "permissionsUi": {"permissionsValues": {"role": "reader", "type": "anyone"}}, "options": {}}))
add('startRender', dict(name='Start GitHub Render', type='n8n-nodes-base.httpRequest', v=4.3, cred=GH, extra=RETRY3, params={
    "method": "POST", "url": "=https://api.github.com/repos/{{ $('Build Render Job').first().json.repo }}/actions/workflows/render.yml/dispatches",
    "authentication": "predefinedCredentialType", "nodeCredentialType": "githubApi", "sendHeaders": True,
    "headerParameters": {"parameters": [{"name": "Accept", "value": "application/vnd.github+json"}, {"name": "X-GitHub-Api-Version", "value": "2022-11-28"}]},
    "sendBody": True, "specifyBody": "json",
    "jsonBody": "={{ { \"ref\": $('Build Render Job').first().json.branch, \"inputs\": { \"job_id\": $('Build Render Job').first().json.jobId, \"job_url\": 'https://drive.google.com/uc?export=download&id=' + $('Upload Job to Drive').first().json.id, \"resume_url\": $execution.resumeUrl } } }}",
    "options": {"timeout": 60000}}))
add('waitRender', dict(name='Wait for Render', type='n8n-nodes-base.wait', v=1.1, params={
    "resume": "webhook", "httpMethod": "POST", "limitWaitTime": True, "resumeAmount": 45, "resumeUnit": "minutes", "options": {}}))
add('checkResult', dict(name='Check Render Result', type='n8n-nodes-base.code', v=2, params={"jsCode": code('check_render_result.js')}))
add('dlPreview', gh_get('Download Video', "=https://api.github.com/repos/{{ $json.repo }}/releases/assets/{{ $json.asset_id }}"))
add('uploadPreview', dict(name='Upload Preview to Drive', type='n8n-nodes-base.googleDrive', v=3, cred=DRIVE, extra=RETRY3,
    params={"name": "={{ $('Check Render Result').first().json.jobId }}.mp4", "driveId": MY_DRIVE, "folderId": NARR_FOLDER, "options": {}}))
add('tgApproval', dict(name='Telegram Approval', type='n8n-nodes-base.telegram', v=1.2, cred=TG,
    params={"operation": "sendAndWait", "chatId": "6213393108", "message": TG_MSG, "options": {}}))
add('approved', dict(name='Approved?', type='n8n-nodes-base.if', v=2.2, ifelse=True, params={"conditions": {
    "options": {"caseSensitive": True, "leftValue": "", "typeValidation": "loose", "version": 1},
    "conditions": [{"leftValue": "={{ $json.data.approved }}", "operator": {"type": "boolean", "operation": "true", "singleValue": True}}],
    "combinator": "and"}, "options": {}}))
add('dlFinal', gh_get('Download Video for Upload', "=https://api.github.com/repos/{{ $('Check Render Result').first().json.repo }}/releases/assets/{{ $('Check Render Result').first().json.asset_id }}"))
add('ytUpload', dict(name='YouTube Upload', type='n8n-nodes-base.youTube', v=1, cred=YT, extra=RETRY3, params={
    "resource": "video", "operation": "upload", "title": "={{ $('Parse Script JSON').first().json.title }}", "regionCode": "CA", "categoryId": "27",
    "options": {"description": "={{ $('Parse Script JSON').first().json.description }}", "privacyStatus": "public",
                "tags": "={{ $('Parse Script JSON').first().json.hashtags.map(h => h.replace('#','')).join(',') }}"}}))
add('markUploaded', dict(name='Mark as Uploaded', type='n8n-nodes-base.googleSheets', v=4.5, cred=SHEETS,
    extra=dict(retryOnFail=True, maxTries=4, waitBetweenTries=5000), params={
    "operation": "update", "documentId": SHEET_DOC, "sheetName": SHEET_TAB,
    "columns": {"mappingMode": "defineBelow", "matchingColumns": ["Topic"], "attemptToConvertTypes": False, "convertFieldsToString": False,
        "schema": [{"id": c, "displayName": c, "required": False, "type": "string", "canBeUsedToMatch": True} for c in ["Topic", "Language", "Status", "VideoURL"]],
        "value": {"Topic": "={{ $('Parse Script JSON').first().json.topic }}", "Status": "uploaded",
                  "VideoURL": "=https://youtube.com/watch?v={{ $('YouTube Upload').first().json.uploadId }}"}},
    "options": {}}))
add('notifyDone', dict(name='Notify Upload Complete', type='n8n-nodes-base.telegram', v=1.2, cred=TG, params={
    "chatId": "6213393108", "additionalFields": {},
    "text": "=✅ 성경 쇼츠 업로드 완료\n\n제목: {{ $('Parse Script JSON').first().json.title }}\n\n링크: https://youtube.com/watch?v={{ $('YouTube Upload').first().json.uploadId }}"}))
add('findPlaylists', dict(name='Find Playlists', type='n8n-nodes-base.httpRequest', v=4.3, cred=YT,
    extra=dict(onError='continueRegularOutput'), params={
    "url": "https://www.googleapis.com/youtube/v3/playlists", "authentication": "predefinedCredentialType", "nodeCredentialType": "youTubeOAuth2Api",
    "sendQuery": True, "queryParameters": {"parameters": [{"name": "part", "value": "snippet"}, {"name": "mine", "value": "true"}, {"name": "maxResults", "value": "50"}]},
    "options": {"timeout": 30000}}))
add('pickPlaylist', dict(name='Pick Playlist', type='n8n-nodes-base.code', v=2, params={"jsCode": playlist_code}))
add('plExists', dict(name='Playlist Exists?', type='n8n-nodes-base.if', v=2.2, ifelse=True, params={"conditions": {
    "combinator": "and", "conditions": [{"id": "playlist-exists-01", "leftValue": "={{ $json.playlistId }}",
    "operator": {"operation": "notEmpty", "singleValue": True, "type": "string"}, "rightValue": ""}],
    "options": {"caseSensitive": True, "leftValue": "", "typeValidation": "loose", "version": 2}}, "options": {}}))
add('createPlaylist', dict(name='Create Playlist', type='n8n-nodes-base.httpRequest', v=4.3, cred=YT,
    extra=dict(retryOnFail=True, maxTries=2, waitBetweenTries=5000), params={
    "method": "POST", "url": "https://www.googleapis.com/youtube/v3/playlists", "authentication": "predefinedCredentialType", "nodeCredentialType": "youTubeOAuth2Api",
    "sendQuery": True, "queryParameters": {"parameters": [{"name": "part", "value": "snippet,status"}]},
    "sendBody": True, "specifyBody": "json",
    "jsonBody": "={{ { snippet: { title: $json.title, description: $json.description, defaultLanguage: 'ko' }, status: { privacyStatus: 'public' } } }}",
    "options": {"timeout": 30000}}))
add('addToPlaylist', dict(name='Add To Playlist', type='n8n-nodes-base.httpRequest', v=4.3, cred=YT, extra=RETRY3, params={
    "method": "POST", "url": "https://www.googleapis.com/youtube/v3/playlistItems", "authentication": "predefinedCredentialType", "nodeCredentialType": "youTubeOAuth2Api",
    "sendQuery": True, "queryParameters": {"parameters": [{"name": "part", "value": "snippet"}]},
    "sendBody": True, "specifyBody": "json",
    "jsonBody": "={{ { snippet: { playlistId: $json.playlistId || $json.id, resourceId: { kind: 'youtube#video', videoId: $('YouTube Upload').first().json.uploadId } } } }}",
    "options": {"timeout": 30000}}))

# ── TS 출력 ──
def ts(v):
    if isinstance(v, str):
        if len(v) > 1 and v.startswith('='):
            return 'expr(' + json.dumps(v[1:], ensure_ascii=False) + ')'
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
    body = ts(cfg)
    if d.get('cred'): body = body[:-2] + ', "credentials": ' + ts(d['cred']) + ' }'
    if d.get('trigger'):
        out.append(f"const {var} = trigger({{ type: '{d['type']}', version: {d['v']}, config: {body} }});")
    elif d.get('ifelse'):
        out.append(f"const {var} = ifElse({{ version: {d['v']}, config: {body} }});")
    else:
        out.append(f"const {var} = node({{ type: '{d['type']}', version: {d['v']}, config: {body}, output: [{{}}] }});")
    out.append("")

NOTE = ("## 📖 Bible Shorts (성경 주제 전용)\nMotion Shorts v2와 같은 파이프라인. 시트의 pending 주제 중 **성경 주제만** 하루 한 편.\n"
        "Motion Shorts v2는 성경 주제를 건너뛰므로 두 워크플로우가 같은 주제를 집지 않습니다.\n\n"
        "**바꾸는 곳**\n- 실행 시간: Daily Trigger\n- 재생목록: Pick Playlist (항상 bible 재생목록)\n- 이미지 끄기/개수: Build Claude Request 맨 위\n\n"
        "성경 주제가 다 떨어지면 Pick Bible Topic에서 멈춥니다 → Weekly Topic Generator로 보충하세요.")
out.append(f"const note = sticky({json.dumps(NOTE, ensure_ascii=False)}, [readSheet, pickTopic, buildClaude], {{ color: 6 }});")
out.append("""
export default workflow('bible-shorts', 'NextYou Global - Bible Shorts (성경 주제 전용)')
  .add(dailyTrigger)
  .to(readSheet)
  .to(pickTopic)
  .to(buildClaude)
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
  .to(approved.onTrue(dlFinal.to(ytUpload.to(markUploaded.to(notifyDone.to(findPlaylists.to(pickPlaylist.to(plExists
    .onTrue(addToPlaylist)
    .onFalse(createPlaylist.to(addToPlaylist))))))))))
  .add(note)
  .group('Topic & script', [readSheet, pickTopic, buildClaude, claude, parse], { description: 'Pick one pending bible topic, then Claude writes the sermon scenes' })
  .group('Voice & images', [tts, music, prepImages, anyImages, fal, renderJob], { description: 'ElevenLabs narration with timestamps, music, fal.ai images, render job file' })
  .group('Render on GitHub Actions', [uploadJob, shareJob, startRender, waitRender, checkResult, dlPreview, uploadPreview], { description: 'GitHub Actions renders with Remotion and calls back' })
  .group('Publish', [tgApproval, approved, dlFinal, ytUpload, markUploaded, notifyDone, findPlaylists, pickPlaylist, plExists, createPlaylist, addToPlaylist], { description: 'Telegram approval, public upload, sheet update, bible playlist' });
""")
print('\n'.join(out))
