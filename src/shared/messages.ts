/** 各上下文（background / offscreen / popup）之间的消息协议 */

/**
 * offscreen 播放器消息。
 * 注意：chrome.runtime.sendMessage 是 JSON 序列化，不能传 ArrayBuffer，
 * 音频以 base64 字符串传输（TTS API 原始返回即 base64，直接透传）。
 */
export type OffscreenMessage =
  | { target: 'offscreen'; type: 'PLAY'; audioBase64: string; rate: number }
  | { target: 'offscreen'; type: 'STOP' };

/** popup → background：试听当前音色 */
export type PreviewMessage = { type: 'PREVIEW_TTS'; text: string };

export function isOffscreenMessage(msg: unknown): msg is OffscreenMessage {
  return (
    typeof msg === 'object' &&
    msg !== null &&
    (msg as { target?: unknown }).target === 'offscreen'
  );
}

/** base64 → Uint8Array（offscreen 侧解码播放） */
export function base64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const bin = atob(b64);
  const bytes = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}
