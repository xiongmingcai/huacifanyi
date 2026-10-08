import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: '划词朗读翻译',
    description: '选中文本，右键一键朗读；支持翻译并朗读（MiMo TTS）',
    permissions: ['contextMenus', 'storage', 'offscreen'],
    host_permissions: ['https://api.xiaomimimo.com/*'],
  },
});
