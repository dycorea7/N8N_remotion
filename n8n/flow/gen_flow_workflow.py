# Flow 쇼츠 워크플로우 SDK 코드 생성기: python3 gen_flow_workflow.py > flow_workflow.ts
import json, os
D = os.path.dirname(os.path.abspath(__file__))
code = lambda f: json.dumps(open(os.path.join(D, f), encoding='utf-8').read(), ensure_ascii=False)
out = r"""import { workflow, node, trigger, ifElse, expr } from '@n8n/workflow-sdk';

const DOC = { __rl: true, mode: 'id', value: '1_RFLFLkxolbaSVOw-tWf8SuBKE0FV9n6dfqUrFoOA2k' };
const TAB = { __rl: true, mode: 'name', value: 'FlowShorts' };
const GS = { googleSheetsOAuth2Api: { id: '0cZFMuAKCn5sTGLr', name: 'Google Sheets account' } };
const GD = { googleDriveOAuth2Api: { id: '1k1XeWhKkI3b2p1u', name: 'Google Drive account' } };
const TG = { telegramApi: { id: 'MqKwiZpa0oSigPGM', name: 'Telegram account' } };
const GH = { githubApi: { id: 'a2UFvOs5ceHM8VC5', name: 'GitHub account' } };
const ROWSCHEMA = [
  { id: 'row_number', displayName: 'row_number', type: 'number', canBeUsedToMatch: true, readOnly: true },
  { id: 'Topic', displayName: 'Topic', type: 'string', canBeUsedToMatch: true },
  { id: 'Language', displayName: 'Language', type: 'string', canBeUsedToMatch: true },
  { id: 'Status', displayName: 'Status', type: 'string', canBeUsedToMatch: true },
  { id: 'Folder', displayName: 'Folder', type: 'string', canBeUsedToMatch: true },
  { id: 'VideoURL', displayName: 'VideoURL', type: 'string', canBeUsedToMatch: true },
  { id: 'Note', displayName: 'Note', type: 'string', canBeUsedToMatch: true }
];

const start = trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: { name: 'Start' } });

const readSheet = node({ type: 'n8n-nodes-base.googleSheets', version: 4.5, config: { name: 'Read FlowShorts', parameters: { documentId: DOC, sheetName: TAB, options: {} }, credentials: GS }, output: [{ row_number: 3, Topic: '월급날 바로 해야 할 3가지', Language: 'Korean', Status: 'pending' }] });

const pickTopic = node({ type: 'n8n-nodes-base.code', version: 2, config: { name: 'Pick Topic', parameters: { jsCode: __PICK__ } }, output: [{ row_number: 3, Topic: '월급날 바로 해야 할 3가지', Language: 'Korean' }] });

const markMaking = node({ type: 'n8n-nodes-base.googleSheets', version: 4.5, config: { name: 'Mark Making', parameters: { operation: 'update', documentId: DOC, sheetName: TAB, columns: { mappingMode: 'defineBelow', matchingColumns: ['row_number'], schema: ROWSCHEMA, value: { row_number: expr("{{ $('Pick Topic').first().json.row_number }}"), Status: 'making' } }, options: {} }, credentials: GS, retryOnFail: true, maxTries: 3, waitBetweenTries: 5000 }, output: [{ row_number: 3 }] });

const getPrinciples = node({ type: 'n8n-nodes-base.httpRequest', version: 4.3, config: { name: 'Get Principles', parameters: { url: 'https://raw.githubusercontent.com/dycorea7/N8N_remotion/main/n8n/content_principles.md', options: { response: { response: { responseFormat: 'text' } }, timeout: 30000 } }, executeOnce: true, onError: 'continueRegularOutput', retryOnFail: true, maxTries: 2, waitBetweenTries: 3000 }, output: [{ data: '# Content Principles' }] });

const buildRequest = node({ type: 'n8n-nodes-base.code', version: 2, config: { name: 'Build Request', parameters: { jsCode: __REQ__ } }, output: [{ body: {} }] });

const claude = node({ type: 'n8n-nodes-base.httpRequest', version: 4.3, config: { name: 'Claude - Script & Flow Prompts', parameters: { method: 'POST', url: 'https://api.anthropic.com/v1/messages', authentication: 'predefinedCredentialType', nodeCredentialType: 'anthropicApi', sendHeaders: true, headerParameters: { parameters: [{ name: 'anthropic-version', value: '2023-06-01' }, { name: 'content-type', value: 'application/json' }] }, sendBody: true, specifyBody: 'json', jsonBody: expr('{{ $json.body }}'), options: { timeout: 300000 } }, credentials: { anthropicApi: { id: 'AsWnrNE2knZqRLta', name: 'Anthropic account' } }, retryOnFail: true, maxTries: 2, waitBetweenTries: 10000 }, output: [{ content: [{ type: 'text', text: '{}' }] }] });

const parseScript = node({ type: 'n8n-nodes-base.code', version: 2, config: { name: 'Parse Script', parameters: { jsCode: __PARSE__ } }, output: [{ title: '', scenes: [], ttsScript: '', subtitleLang: 'ko', row_number: 3 }] });

const tts = node({ type: 'n8n-nodes-base.httpRequest', version: 4.3, config: { name: 'ElevenLabs TTS', parameters: { method: 'POST', url: expr("https://api.elevenlabs.io/v1/text-to-speech/{{ $json.subtitleLang === 'ko' ? 'srhGhMYcxqeTNVuSRvWg' : 'CwhRBWXzGAHq8TQ4Fs17' }}/with-timestamps"), authentication: 'genericCredentialType', genericAuthType: 'httpHeaderAuth', sendHeaders: true, headerParameters: { parameters: [{ name: 'content-type', value: 'application/json' }] }, sendBody: true, specifyBody: 'json', jsonBody: expr('{{ JSON.stringify({ text: $json.ttsScript, model_id: "eleven_v3", voice_settings: { stability: 0.5, similarity_boost: 0.8 } }) }}'), options: { timeout: 300000 } }, credentials: { httpHeaderAuth: { id: 'tttbA9a5I55qIbLc', name: 'ElevenLabs API' } }, retryOnFail: true, maxTries: 3, waitBetweenTries: 5000 }, output: [{ audio_base64: '', alignment: {} }] });

const createFolder = node({ type: 'n8n-nodes-base.googleDrive', version: 3, config: { name: 'Create Folder', parameters: { resource: 'folder', operation: 'create', name: expr("{{ $now.toFormat('yyyyMMdd_HHmm') }}_{{ $('Parse Script').first().json.title.replace(/[\\\\/:*?\"<>|#]/g, '').slice(0, 40) }}"), driveId: { __rl: true, mode: 'list', value: 'My Drive' }, folderId: { __rl: true, mode: 'id', value: '1GHLpfcfKrODxBj-8lPdtITdK0In6LLtX' }, options: {} }, credentials: GD, retryOnFail: true, maxTries: 5, waitBetweenTries: 5000 }, output: [{ id: '1FolderId', name: '20261110_1930_title' }] });

const shareFolder = node({ type: 'n8n-nodes-base.googleDrive', version: 3, config: { name: 'Share Folder', parameters: { resource: 'folder', operation: 'share', folderNoRootId: { __rl: true, mode: 'id', value: expr('{{ $json.id }}') }, permissionsUi: { permissionsValues: { role: 'reader', type: 'anyone', allowFileDiscovery: false } }, options: {} }, credentials: GD, retryOnFail: true, maxTries: 5, waitBetweenTries: 5000 }, output: [{ id: 'anyoneWithLink' }] });

const kit = node({ type: 'n8n-nodes-base.code', version: 2, config: { name: 'Flow Kit', parameters: { jsCode: __KIT__ } }, output: [{ text: '' }] });

const sendKit = node({ type: 'n8n-nodes-base.telegram', version: 1.2, config: { name: 'Send Kit', parameters: { resource: 'message', operation: 'sendMessage', chatId: '6213393108', text: expr('{{ $json.text }}'), additionalFields: { appendAttribution: false, parse_mode: 'HTML', disable_web_page_preview: true } }, credentials: TG, retryOnFail: true, maxTries: 3, waitBetweenTries: 3000 }, output: [{ ok: true }] });

const markWaiting = node({ type: 'n8n-nodes-base.googleSheets', version: 4.5, config: { name: 'Mark Waiting for Clips', parameters: { operation: 'update', documentId: DOC, sheetName: TAB, columns: { mappingMode: 'defineBelow', matchingColumns: ['row_number'], schema: ROWSCHEMA, value: { row_number: expr("{{ $('Pick Topic').first().json.row_number }}"), Status: 'waiting_clips', Folder: expr("https://drive.google.com/drive/folders/{{ $('Create Folder').first().json.id }}") } }, options: {} }, credentials: GS, executeOnce: true, retryOnFail: true, maxTries: 3, waitBetweenTries: 5000 }, output: [{ row_number: 3 }] });

const waitClips = node({ type: 'n8n-nodes-base.telegram', version: 1.2, config: { name: 'Wait for Clips', parameters: { resource: 'message', operation: 'sendAndWait', chatId: '6213393108', message: expr("📁 Flow 클립을 폴더에 다 올렸으면 버튼을 눌러 주세요.\n\n{{ $('Parse Script').first().json.title }}\nhttps://drive.google.com/drive/folders/{{ $('Create Folder').first().json.id }}"), responseType: 'approval', approvalOptions: { values: { approvalType: 'double', approveLabel: '✅ 클립 다 올렸어요', disapproveLabel: '❌ 이번 편 취소' } }, options: { appendAttribution: false } }, credentials: TG, executeOnce: true }, output: [{ data: { approved: true } }] });

const clipsReady = ifElse({ version: 2.2, config: { name: 'Clips Ready?', parameters: { conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'loose' }, conditions: [{ leftValue: expr('{{ $json.data.approved }}'), operator: { type: 'boolean', operation: 'true', singleValue: true } }], combinator: 'and' } } } });

const markCancelled = node({ type: 'n8n-nodes-base.googleSheets', version: 4.5, config: { name: 'Mark Cancelled', parameters: { operation: 'update', documentId: DOC, sheetName: TAB, columns: { mappingMode: 'defineBelow', matchingColumns: ['row_number'], schema: ROWSCHEMA, value: { row_number: expr("{{ $('Pick Topic').first().json.row_number }}"), Status: 'cancelled' } }, options: {} }, credentials: GS, retryOnFail: true, maxTries: 3, waitBetweenTries: 5000 }, output: [{ row_number: 3 }] });

const listClips = node({ type: 'n8n-nodes-base.googleDrive', version: 3, config: { name: 'List Clips', parameters: { resource: 'fileFolder', operation: 'search', searchMethod: 'name', queryString: '', returnAll: true, filter: { driveId: { __rl: true, mode: 'list', value: 'My Drive' }, folderId: { __rl: true, mode: 'id', value: expr("{{ $('Create Folder').first().json.id }}") }, whatToSearch: 'files' }, options: { fields: ['id', 'name', 'mimeType'] } }, credentials: GD, executeOnce: true, alwaysOutputData: true, retryOnFail: true, maxTries: 5, waitBetweenTries: 5000 }, output: [{ id: '1ClipId', name: '01.mp4', mimeType: 'video/mp4' }] });

const listMusic = node({ type: 'n8n-nodes-base.googleDrive', version: 3, config: { name: 'List Music Files', parameters: { resource: 'fileFolder', operation: 'search', searchMethod: 'name', queryString: '', returnAll: true, filter: { driveId: { __rl: true, mode: 'list', value: 'My Drive' }, folderId: { __rl: true, mode: 'id', value: '1_ThaZQ29sauz4BvRejOjg-0Ug3SaiTlm' }, whatToSearch: 'files' }, options: { fields: ['id', 'name'] } }, credentials: GD, executeOnce: true, alwaysOutputData: true, onError: 'continueRegularOutput' }, output: [{ id: '1MusicId', name: 'hopeful_uplifting_1.mp3' }] });

const buildJob = node({ type: 'n8n-nodes-base.code', version: 2, config: { name: 'Build Render Job', parameters: { jsCode: __JOB__ } }, output: [{ jobId: 'fs_x', repo: 'dycorea7/N8N_remotion', branch: 'main', clips: 6, sceneCount: 6, missingText: '없음', musicName: '' }] });

const uploadJob = node({ type: 'n8n-nodes-base.googleDrive', version: 3, config: { name: 'Upload Job to Drive', parameters: { resource: 'file', operation: 'upload', inputDataFieldName: 'data', name: expr('{{ $json.jobId }}.json'), driveId: { __rl: true, mode: 'list', value: 'My Drive' }, folderId: { __rl: true, mode: 'id', value: '1xNjOz0G8N_ZIQsJwfB-JRW4g9gKvjajd' }, options: {} }, credentials: GD, retryOnFail: true, maxTries: 3, waitBetweenTries: 5000 }, output: [{ id: '1JobFileId' }] });

const shareJob = node({ type: 'n8n-nodes-base.googleDrive', version: 3, config: { name: 'Share Job File', parameters: { resource: 'file', operation: 'share', fileId: { __rl: true, mode: 'id', value: expr('{{ $json.id }}') }, permissionsUi: { permissionsValues: { role: 'reader', type: 'anyone', allowFileDiscovery: false } }, options: {} }, credentials: GD, retryOnFail: true, maxTries: 5, waitBetweenTries: 5000 }, output: [{ id: 'anyoneWithLink' }] });

const startRender = node({ type: 'n8n-nodes-base.httpRequest', version: 4.3, config: { name: 'Start GitHub Render', parameters: { method: 'POST', url: expr("https://api.github.com/repos/{{ $('Build Render Job').first().json.repo }}/actions/workflows/render.yml/dispatches"), authentication: 'predefinedCredentialType', nodeCredentialType: 'githubApi', sendHeaders: true, headerParameters: { parameters: [{ name: 'Accept', value: 'application/vnd.github+json' }, { name: 'X-GitHub-Api-Version', value: '2022-11-28' }] }, sendBody: true, specifyBody: 'json', jsonBody: expr("{{ { \"ref\": $('Build Render Job').first().json.branch, \"inputs\": { \"job_id\": $('Build Render Job').first().json.jobId, \"job_url\": 'https://drive.google.com/uc?export=download&id=' + $('Upload Job to Drive').first().json.id, \"resume_url\": $execution.resumeUrl } } }}"), options: { timeout: 60000 } }, credentials: GH, retryOnFail: true, maxTries: 3, waitBetweenTries: 5000 }, output: [{}] });

const waitRender = node({ type: 'n8n-nodes-base.wait', version: 1.1, config: { name: 'Wait for Render', parameters: { resume: 'webhook', httpMethod: 'POST', limitWaitTime: true, limitType: 'afterTimeInterval', resumeAmount: 45, resumeUnit: 'minutes', options: {} } }, output: [{ body: { status: 'done', asset_id: '1' } }] });

const checkResult = node({ type: 'n8n-nodes-base.code', version: 2, config: { name: 'Check Render Result', parameters: { jsCode: __CHECK__ } }, output: [{ status: 'done', asset_id: '1', repo: 'dycorea7/N8N_remotion', jobId: 'fs_x', duration_sec: 38, warningsText: '없음' }] });

const downloadPreview = node({ type: 'n8n-nodes-base.httpRequest', version: 4.3, config: { name: 'Download Video', parameters: { url: expr('https://api.github.com/repos/{{ $json.repo }}/releases/assets/{{ $json.asset_id }}'), authentication: 'predefinedCredentialType', nodeCredentialType: 'githubApi', sendHeaders: true, headerParameters: { parameters: [{ name: 'Accept', value: 'application/octet-stream' }] }, options: { response: { response: { responseFormat: 'file' } }, timeout: 120000 } }, credentials: GH, retryOnFail: true, maxTries: 3, waitBetweenTries: 5000 }, output: [{}] });

const uploadPreview = node({ type: 'n8n-nodes-base.googleDrive', version: 3, config: { name: 'Upload Preview to Drive', parameters: { resource: 'file', operation: 'upload', inputDataFieldName: 'data', name: expr("{{ $('Check Render Result').first().json.jobId }}.mp4"), driveId: { __rl: true, mode: 'list', value: 'My Drive' }, folderId: { __rl: true, mode: 'id', value: expr("{{ $('Create Folder').first().json.id }}") }, options: {} }, credentials: GD, retryOnFail: true, maxTries: 3, waitBetweenTries: 5000 }, output: [{ id: '1PreviewId' }] });

const approval = node({ type: 'n8n-nodes-base.telegram', version: 1.2, config: { name: 'Telegram Approval', parameters: { resource: 'message', operation: 'sendAndWait', chatId: '6213393108', message: expr("🎬 Flow 쇼츠 렌더 완료\n\n제목: {{ $('Parse Script').first().json.title }}\n길이: {{ $('Check Render Result').first().json.duration_sec }}초 · 클립 {{ $('Build Render Job').first().json.clips }}/{{ $('Build Render Job').first().json.sceneCount }} (빠진 장면: {{ $('Build Render Job').first().json.missingText }})\n음악: {{ $('Build Render Job').first().json.musicName }}\n경고: {{ $('Check Render Result').first().json.warningsText }}\n\n미리보기: https://drive.google.com/file/d/{{ $json.id }}/view\n\n유튜브에 올릴까요?"), responseType: 'approval', approvalOptions: { values: { approvalType: 'double', approveLabel: '✅ 업로드', disapproveLabel: '❌ 올리지 않기' } }, options: { appendAttribution: false } }, credentials: TG }, output: [{ data: { approved: true } }] });

const approved = ifElse({ version: 2.2, config: { name: 'Approved?', parameters: { conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'loose' }, conditions: [{ leftValue: expr('{{ $json.data.approved }}'), operator: { type: 'boolean', operation: 'true', singleValue: true } }], combinator: 'and' } } } });

const downloadFinal = node({ type: 'n8n-nodes-base.httpRequest', version: 4.3, config: { name: 'Download Video for Upload', parameters: { url: expr("https://api.github.com/repos/{{ $('Check Render Result').first().json.repo }}/releases/assets/{{ $('Check Render Result').first().json.asset_id }}"), authentication: 'predefinedCredentialType', nodeCredentialType: 'githubApi', sendHeaders: true, headerParameters: { parameters: [{ name: 'Accept', value: 'application/octet-stream' }] }, options: { response: { response: { responseFormat: 'file' } }, timeout: 120000 } }, credentials: GH, retryOnFail: true, maxTries: 3, waitBetweenTries: 5000 }, output: [{}] });

const youtube = node({ type: 'n8n-nodes-base.youTube', version: 1, config: { name: 'YouTube Upload', parameters: { resource: 'video', operation: 'upload', title: expr("{{ $('Parse Script').first().json.title }}"), regionCode: 'CA', categoryId: '27', options: { description: expr("{{ $('Parse Script').first().json.description }}\n\n{{ $('Parse Script').first().json.hashtags.join(' ') }}"), privacyStatus: 'public', tags: expr("{{ $('Parse Script').first().json.hashtags.map(h => h.replace('#', '')).join(',') }}") } }, credentials: { youTubeOAuth2Api: { id: 'HE5xUScbPHMgviXV', name: 'YouTube account' } }, retryOnFail: true, maxTries: 3, waitBetweenTries: 5000 }, output: [{ uploadId: 'abc123' }] });

const markUploaded = node({ type: 'n8n-nodes-base.googleSheets', version: 4.5, config: { name: 'Mark Uploaded', parameters: { operation: 'update', documentId: DOC, sheetName: TAB, columns: { mappingMode: 'defineBelow', matchingColumns: ['row_number'], schema: ROWSCHEMA, value: { row_number: expr("{{ $('Pick Topic').first().json.row_number }}"), Status: 'uploaded', VideoURL: expr("https://youtube.com/watch?v={{ $('YouTube Upload').first().json.uploadId }}") } }, options: {} }, credentials: GS, retryOnFail: true, maxTries: 4, waitBetweenTries: 5000 }, output: [{ row_number: 3 }] });

const notifyDone = node({ type: 'n8n-nodes-base.telegram', version: 1.2, config: { name: 'Notify Upload Complete', parameters: { resource: 'message', operation: 'sendMessage', chatId: '6213393108', text: expr("✅ Flow 쇼츠 업로드 완료\n\n{{ $('Parse Script').first().json.title }}\nhttps://youtube.com/watch?v={{ $('YouTube Upload').first().json.uploadId }}"), additionalFields: { appendAttribution: false } }, credentials: TG }, output: [{ ok: true }] });

const markRejected = node({ type: 'n8n-nodes-base.googleSheets', version: 4.5, config: { name: 'Mark Rejected', parameters: { operation: 'update', documentId: DOC, sheetName: TAB, columns: { mappingMode: 'defineBelow', matchingColumns: ['row_number'], schema: ROWSCHEMA, value: { row_number: expr("{{ $('Pick Topic').first().json.row_number }}"), Status: 'rejected' } }, options: {} }, credentials: GS, retryOnFail: true, maxTries: 3, waitBetweenTries: 5000 }, output: [{ row_number: 3 }] });

export default workflow('flow-shorts', 'NextYou Global - Flow Shorts (구글 Flow 수동 클립 + 자동 마무리)')
  .add(start)
  .to(readSheet)
  .to(pickTopic)
  .to(markMaking)
  .to(getPrinciples)
  .to(buildRequest)
  .to(claude)
  .to(parseScript)
  .to(tts)
  .to(createFolder)
  .to(shareFolder)
  .to(kit)
  .to(sendKit)
  .to(markWaiting)
  .to(waitClips)
  .to(clipsReady
    .onTrue(listClips.to(listMusic.to(buildJob.to(uploadJob.to(shareJob.to(startRender.to(waitRender.to(checkResult.to(downloadPreview.to(uploadPreview.to(approval.to(approved
      .onTrue(downloadFinal.to(youtube.to(markUploaded.to(notifyDone))))
      .onFalse(markRejected)))))))))))))
    .onFalse(markCancelled))
  .group('Script & voice', [readSheet, pickTopic, markMaking, getPrinciples, buildRequest, claude, parseScript, tts], { description: 'Pending topic from the FlowShorts sheet, Claude writes narration and one Google Flow prompt per scene, ElevenLabs v3 voice' })
  .group('Production kit', [createFolder, shareFolder, kit, sendKit, markWaiting, waitClips, clipsReady, markCancelled], { description: 'Drive folder for the clips, kit sent to Telegram, waits until the clips are uploaded' })
  .group('Render', [listClips, listMusic, buildJob, uploadJob, shareJob, startRender, waitRender, checkResult, downloadPreview, uploadPreview], { description: 'Clips matched to scenes by number, GitHub Actions renders voice + captions + music over them' })
  .group('Publish', [approval, approved, downloadFinal, youtube, markUploaded, notifyDone, markRejected], { description: 'Telegram preview approval, public YouTube upload, sheet update' });
"""
for k, f in [('__PICK__', 'pick_flow_topic.js'), ('__REQ__', 'build_flow_request.js'), ('__PARSE__', 'parse_flow_script.js'), ('__KIT__', 'flow_kit.js'), ('__JOB__', 'build_flow_render_job.js'), ('__CHECK__', 'check_render_result.js')]:
    out = out.replace(k, code(f))
print(out)
