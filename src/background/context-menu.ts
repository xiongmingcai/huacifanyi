/** 右键菜单：朗读文本 */
import { browser } from 'wxt/browser';
import { getSettings } from '../shared/settings';
import { synthesize } from './providers/tts';
import { ensureOffscreen } from './offscreen';

export const MENU_READ_ALOUD = 'read-aloud';

const MAX_TEXT_LENGTH = 5000;

export function registerContextMenu(): void {
  browser.runtime.onInstalled.addListener(() => {
    // onInstalled 在安装/更新时都会触发，先清空避免重复 id 报错
    browser.contextMenus.removeAll(() => {
      browser.contextMenus.create({
        id: MENU_READ_ALOUD,
        title: '朗读文本',
        contexts: ['selection'],
      });
    });
  });

  browser.contextMenus.onClicked.addListener((info, tab) => {
    void handleReadAloud(info, tab?.id);
  });
}

/** 只依赖用到的字段，避免 wxt/browser 与 @types/chrome 的类型冲突 */
interface MenuClickInfo {
  menuItemId: string | number;
  selectionText?: string;
}

async function handleReadAloud(
  info: MenuClickInfo,
  tabId: number | undefined,
): Promise<void> {
  if (info.menuItemId !== MENU_READ_ALOUD) return;
  const text = (info.selectionText ?? '').trim().slice(0, MAX_TEXT_LENGTH);
  if (!text) return;

  try {
    const settings = await getSettings();
    // 相同文本并发去重
    const audioBase64 = await dedupe(
      `${text}|${settings.voice}|${settings.stylePrompt}|${settings.styleTag}`,
      () =>
        synthesize(text, {
          apiKey: settings.apiKey,
          voice: settings.voice,
          stylePrompt: settings.stylePrompt,
          styleTag: settings.styleTag,
        }),
    );
    await ensureOffscreen();
    await browser.runtime.sendMessage({
      target: 'offscreen',
      type: 'PLAY',
      audioBase64,
      rate: settings.speed,
    });
    void tabId;
    await clearErrorBadge();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[huacifanyi] 朗读失败:', message);
    await showErrorBadge();
  }
}

const inflight = new Map<string, Promise<string>>();

function dedupe(key: string, fn: () => Promise<string>): Promise<string> {
  const existing = inflight.get(key);
  if (existing) return existing;
  const p = fn().finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}

async function showErrorBadge(): Promise<void> {
  await chrome.action.setBadgeText({ text: '!' });
  await chrome.action.setBadgeBackgroundColor({ color: '#d93025' });
}

async function clearErrorBadge(): Promise<void> {
  await chrome.action.setBadgeText({ text: '' });
}
