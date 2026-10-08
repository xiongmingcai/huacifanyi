/** MiMo TTS 预置音色（官方列表） */
export type VoiceLang = 'zh' | 'en' | 'default';

export interface VoiceInfo {
  /** Voice ID，传给 TTS 的 voice 字段 */
  id: string;
  /** 展示名 */
  name: string;
  lang: VoiceLang;
  gender: '女' | '男' | '';
  /** 试听文本 */
  sample: string;
}

const ZH_SAMPLE = '你好，很高兴认识你。';
const EN_SAMPLE = 'Hi, this is how I sound. Nice to meet you!';

export const VOICES: VoiceInfo[] = [
  { id: 'mimo_default', name: 'MiMo-默认', lang: 'default', gender: '', sample: ZH_SAMPLE },
  { id: '冰糖', name: '冰糖', lang: 'zh', gender: '女', sample: ZH_SAMPLE },
  { id: '茉莉', name: '茉莉', lang: 'zh', gender: '女', sample: ZH_SAMPLE },
  { id: '苏打', name: '苏打', lang: 'zh', gender: '男', sample: ZH_SAMPLE },
  { id: '白桦', name: '白桦', lang: 'zh', gender: '男', sample: ZH_SAMPLE },
  { id: 'Mia', name: 'Mia', lang: 'en', gender: '女', sample: EN_SAMPLE },
  { id: 'Chloe', name: 'Chloe', lang: 'en', gender: '女', sample: EN_SAMPLE },
  { id: 'Milo', name: 'Milo', lang: 'en', gender: '男', sample: EN_SAMPLE },
  { id: 'Dean', name: 'Dean', lang: 'en', gender: '男', sample: EN_SAMPLE },
];

export const DEFAULT_VOICE = 'Chloe';

export function findVoice(id: string): VoiceInfo | undefined {
  return VOICES.find((v) => v.id === id);
}
