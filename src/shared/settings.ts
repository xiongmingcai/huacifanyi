import { storage } from '#imports';

/** 用户设置，存 chrome.storage.sync */
export interface Settings {
  /** MiMo API Key（构建时从 .env 注入，可在此覆盖） */
  apiKey: string;
  /** TTS 音色 */
  voice: string;
  /** 语速 0.5–2.0 */
  speed: number;
  /** TTS 风格指令（自然语言控制，放 user 消息；为空则省略该消息） */
  stylePrompt: string;
  /** 音频风格标签（如「温柔」，拼到合成文本开头 (温柔)…，为空则不加） */
  styleTag: string;
}

/** 官方推荐写法：具体、场景化、1-4 句 */
export const DEFAULT_STYLE_PROMPT =
  '用自然轻松的日常对话口吻朗读，语速适中，发音清晰，像朋友在跟你聊天。';

const FALLBACK: Settings = {
  apiKey: import.meta.env.WXT_MIMO_API_KEY ?? '',
  voice: 'Chloe',
  speed: 1.0,
  stylePrompt: DEFAULT_STYLE_PROMPT,
  styleTag: '',
};

export const settings = storage.defineItem<Settings>('sync:settings', {
  fallback: FALLBACK,
  version: 1,
});

export async function getSettings(): Promise<Settings> {
  // 与 fallback 合并，兼容旧版本存储里缺少新增字段
  return { ...FALLBACK, ...(await settings.getValue()) };
}
