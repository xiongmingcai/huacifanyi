/**
 * 无头冒烟测试：加载扩展 → 走「右键菜单 handler → TTS → offscreen 播放」真实链路
 * 验证点：
 *  1. 扩展可加载、background service worker 正常启动
 *  2. dispatch 真实 onClicked 处理函数（与用户右键点击同一入口）
 *  3. offscreen 文档创建、消息通路可用
 *  4. 音频真实开始播放（offscreen 回报 PLAYBACK_STATUS=playing）
 */
import puppeteer from 'puppeteer';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const extensionPath = path.join(root, '.output/chrome-mv3');
const apiKey =
  process.env.SMOKE_API_KEY ??
  readFileSync(path.join(root, '.env'), 'utf8').match(/WXT_MIMO_API_KEY=(\S+)/)?.[1] ??
  '';

const browser = await puppeteer.launch({
  headless: true,
  args: [
    '--no-sandbox',
    '--autoplay-policy=no-user-gesture-required',
    `--disable-extensions-except=${extensionPath}`,
    `--load-extension=${extensionPath}`,
  ],
});

let failed = false;
const fail = (msg) => {
  console.error('✗', msg);
  failed = true;
};

try {
  const swTarget = await browser.waitForTarget((t) => t.type() === 'service_worker', { timeout: 15000 });
  const extId = new URL(swTarget.url()).host;
  console.log('✓ 扩展已加载, id =', extId);

  const sw = await swTarget.createCDPSession();
  await sw.send('Runtime.enable');
  sw.on('Runtime.consoleAPICalled', (e) => {
    const text = e.args.map((a) => a.value ?? a.description ?? '').join(' ');
    console.log('  [SW]', text);
  });
  sw.on('Runtime.exceptionThrown', (e) => {
    console.log('  [SW 异常]', e.exceptionDetails.exception?.description ?? e.exceptionDetails.text);
    failed = true;
  });

  const evalSw = async (expression) => {
    const r = await sw.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? JSON.stringify(r.exceptionDetails));
    return r.result.value;
  };

  // 预埋状态探针
  await evalSw(`(() => {
    globalThis.__status = null;
    chrome.runtime.onMessage.addListener((m) => {
      if (m && m.type === 'PLAYBACK_STATUS') globalThis.__status = m.state;
    });
  })()`);

  // ── e2e：真实页面鼠标拖选 ──────────────────────────────
  const page = await browser.newPage();
  await page.setContent(`
    <body style="font-size:24px;padding:40px">
      <p id="target">Let me wash my face.</p>
    </body>`);
  const box = await (await page.$('#target')).boundingBox();
  // 鼠标从句首拖到句尾 = 真实划词手势
  await page.mouse.move(box.x + 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width - 2, box.y + box.height / 2, { steps: 12 });
  await page.mouse.up();

  const selected = await page.evaluate(() => window.getSelection()?.toString() ?? '');
  // Chrome 把 selectionText 的连续空白折叠成单空格并 trim，这里复刻
  const selectionText = selected.replace(/\s+/g, ' ').trim();
  if (selectionText === 'Let me wash my face.') {
    console.log('✓ 真实鼠标拖选选中文本:', JSON.stringify(selectionText));
  } else {
    fail(`拖选结果不符: ${JSON.stringify(selected)}`);
  }

  // 右键会触发页面 contextmenu 事件（原生菜单项本身无法被自动化点击）
  await page.evaluate(() => {
    window.__menu = false;
    document.addEventListener('contextmenu', () => (window.__menu = true), { once: true });
  });
  await page.mouse.click(box.x + 10, box.y + box.height / 2, { button: 'right' });
  const ctxMenu = await page.evaluate(() => window.__menu === true);
  if (ctxMenu) console.log('✓ 右键 contextmenu 事件已触发（原生菜单项点击由 dispatch 等价覆盖）');
  else fail('contextmenu 事件未触发');
  await page.close();

  // ── 用真实选区文本触发 handler（与用户右键点「朗读文本」同一入口）──────
  const canDispatch = await evalSw(`typeof chrome.contextMenus?.onClicked?.dispatch === 'function'`);
  if (canDispatch) {
    await evalSw(`chrome.contextMenus.onClicked.dispatch({ menuItemId: 'read-aloud', selectionText: ${JSON.stringify(selectionText)} }, { id: 1 })`);
    console.log('✓ 已用真实选区文本 dispatch onClicked 处理函数');
  } else {
    fail('无法 dispatch onClicked');
  }

  // 轮询播放状态（TTS 网络请求约 1~3s）
  let status = null;
  for (let i = 0; i < 20 && !failed; i++) {
    await new Promise((r) => setTimeout(r, 500));
    status = await evalSw(`globalThis.__status`);
    if (status) break;
    if (i === 6) {
      const diag = await evalSw(`(async () => ({ has: await chrome.offscreen.hasDocument(), badge: await chrome.action.getBadgeText({}) }))()`);
      console.log('  [诊断] 6s 后:', JSON.stringify(diag));
    }
  }

  if (status === 'playing') {
    console.log('✓ 音频已真实开始播放（PLAYBACK_STATUS=playing）');
  } else if (status === 'error') {
    fail('音频播放报错（PLAYBACK_STATUS=error）');
  } else {
    fail(`未收到播放状态（status=${status}），handler 或消息通路中断`);
  }

  // 二次触发：验证打断重播路径
  await evalSw(`chrome.contextMenus.onClicked.dispatch({ menuItemId: 'read-aloud', selectionText: 'Hello again.' }, { id: 1 })`);
  await new Promise((r) => setTimeout(r, 4000));
  const diag = await evalSw(`(async () => ({ has: await chrome.offscreen.hasDocument(), status: globalThis.__status }))()`);
  console.log('✓ 二次触发诊断:', JSON.stringify(diag));
  if (!diag.has) fail('offscreen 文档丢失');
} catch (err) {
  fail(err.message);
} finally {
  await browser.close();
  if (!failed) console.log('\n全部通过：右键「朗读文本」链路可在真实 Chrome 中工作');
}
