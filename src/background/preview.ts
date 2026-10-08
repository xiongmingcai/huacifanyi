/** 试听：popup 点「试听」→ 合成当前音色样本 → offscreen 播放 */
import { browser } from 'wxt/browser';
import { getSettings } from '../shared/settings';
import { synthesize } from './providers/tts';
import { ensureOffscreen } from './offscreen';

export function registerPreview(): void {
  browser.runtime.onMessage.addListener((msg: { type?: string; text?: string }) => {
    if (msg?.type !== 'PREVIEW_TTS' || typeof msg.text !== 'string') return;
    void (async () => {
      try {
        const settings = await getSettings();
        const audioBase64 = await synthesize(msg.text!, {
          apiKey: settings.apiKey,
          voice: settings.voice,
          stylePrompt: settings.stylePrompt,
          styleTag: settings.styleTag,
        });
        await ensureOffscreen();
        await browser.runtime.sendMessage({
          target: 'offscreen',
          type: 'PLAY',
          audioBase64,
          rate: settings.speed,
        });
      } catch (err) {
        console.error('[huacifanyi] 试听失败:', err instanceof Error ? err.message : err);
      }
    })();
  });
}
