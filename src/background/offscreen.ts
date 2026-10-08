/** 确保 offscreen 播放文档存在（MV3 的 SW 无法播放音频，需 offscreen 承载） */

export async function ensureOffscreen(): Promise<void> {
  const offscreen = chrome.offscreen;
  if (await offscreen.hasDocument()) return;
  await offscreen.createDocument({
    url: 'offscreen.html',
    reasons: [chrome.offscreen.Reason.AUDIO_PLAYBACK],
    justification: '播放划词文本的 TTS 朗读音频',
  });
}
