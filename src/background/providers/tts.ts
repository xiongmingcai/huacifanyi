/** MiMo TTS Provider：文本 → 音频（base64，API 原样返回，避免重复编解码） */

const TTS_ENDPOINT = 'https://api.xiaomimimo.com/v1/chat/completions';

export interface TtsOptions {
  apiKey: string;
  voice: string;
  /** 自然语言风格指令（user 消息，可选） */
  stylePrompt: string;
  /** 音频风格标签（拼到文本开头，如 (温柔)…，可选） */
  styleTag: string;
}

export async function synthesize(text: string, opts: TtsOptions): Promise<string> {
  if (!opts.apiKey) throw new Error('未配置 API Key，请在扩展设置中填写');

  // 按文档：风格标签放 assistant 文本开头，如 (温柔)……
  const content = opts.styleTag ? `(${opts.styleTag})${text}` : text;

  // user 消息为可选参数，为空时省略（文档：合成目标文本必须放 assistant 消息）
  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];
  if (opts.stylePrompt.trim()) {
    messages.push({ role: 'user', content: opts.stylePrompt.trim() });
  }
  messages.push({ role: 'assistant', content });

  const res = await fetch(TTS_ENDPOINT, {
    method: 'POST',
    headers: {
      'api-key': opts.apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'mimo-v2.5-tts',
      messages,
      audio: { format: 'mp3', voice: opts.voice },
    }),
  });
  if (!res.ok) {
    throw new Error(`TTS 请求失败（${res.status}）`);
  }
  const json = await res.json();
  const b64: string | undefined = json?.choices?.[0]?.message?.audio?.data;
  if (!b64) {
    const msg = json?.error?.message ?? 'TTS 返回中没有音频数据';
    throw new Error(msg);
  }
  return b64;
}
