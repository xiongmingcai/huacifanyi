import { defineBackground } from 'wxt/utils/define-background';
import { registerContextMenu } from '../background/context-menu';
import { registerPreview } from '../background/preview';

export default defineBackground(() => {
  registerContextMenu();
  registerPreview();
  console.log('[huacifanyi] background 已启动');
});
