/** offscreen 播放器：整个扩展唯一的音频播放点（MV3 SW 不能播音频） */
import { browser } from 'wxt/browser';
import { isOffscreenMessage, base64ToBytes } from '../../shared/messages';

let current: HTMLAudioElement | null = null;
let currentUrl: string | null = null;

function stop(): void {
  if (current) {
    current.pause();
    current = null;
  }
  if (currentUrl) {
    URL.revokeObjectURL(currentUrl);
    currentUrl = null;
  }
}

function play(audioBase64: string, rate: number): void {
  stop();
  const blob = new Blob([base64ToBytes(audioBase64)], { type: 'audio/mpeg' });
  currentUrl = URL.createObjectURL(blob);
  current = new Audio(currentUrl);
  current.playbackRate = rate;
  current.addEventListener('playing', () => reportStatus('playing'));
  current.addEventListener('ended', () => {
    stop();
    reportStatus('ended');
  });
  current.addEventListener('error', () => {
    stop();
    reportStatus('error');
  });
  current.play().catch((err) => {
    console.error('[huacifanyi] 播放失败:', err);
    stop();
    reportStatus('error');
  });
}

/** 广播播放状态（popup / 冒烟测试可监听） */
function reportStatus(state: 'playing' | 'ended' | 'error'): void {
  void browser.runtime.sendMessage({ type: 'PLAYBACK_STATUS', state }).catch(() => {});
}

browser.runtime.onMessage.addListener((msg) => {
  if (!isOffscreenMessage(msg)) return;
  if (msg.type === 'PLAY') play(msg.audioBase64, msg.rate);
  else stop();
});

console.log('[huacifanyi] offscreen 播放器就绪');
