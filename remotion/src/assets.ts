import { staticFile } from 'remotion';

/** http(s) URL은 그대로, 그 외(예: job/abc/voice.mp3)는 public 폴더의 파일로 */
export const resolveSrc = (src?: string) => (!src ? undefined : /^https?:\/\//.test(src) ? src : staticFile(src));
