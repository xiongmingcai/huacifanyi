import { useEffect, useState } from 'react';
import { browser } from 'wxt/browser';
import { settings, type Settings, DEFAULT_STYLE_PROMPT } from '../../shared/settings';
import { VOICES, findVoice, type VoiceLang } from '../../shared/voices';
import { STYLE_PRESETS, STYLE_TAG_SUGGESTIONS } from '../../shared/style-presets';

const LANG_LABEL: Record<VoiceLang, string> = {
  default: '默认',
  zh: '中文',
  en: '英文',
};

const LANG_ORDER: VoiceLang[] = ['default', 'en', 'zh'];

export function App() {
  const [form, setForm] = useState<Settings | null>(null);
  const [saved, setSaved] = useState(false);
  const [previewState, setPreviewState] = useState<'idle' | 'loading'>('idle');

  useEffect(() => {
    void settings.getValue().then(setForm);
  }, []);

  async function update(patch: Partial<Settings>) {
    if (!form) return;
    const next = { ...form, ...patch };
    setForm(next);
    await settings.setValue(next);
    setSaved(true);
    setTimeout(() => setSaved(false), 1200);
  }

  async function stopReading() {
    await browser.runtime.sendMessage({ target: 'offscreen', type: 'STOP' });
    await chrome.action.setBadgeText({ text: '' });
    setPreviewState('idle');
  }

  async function preview() {
    if (!form) return;
    setPreviewState('loading');
    try {
      const voice = findVoice(form.voice);
      const text = voice?.sample ?? 'Hi, this is how I sound. Nice to meet you!';
      await browser.runtime.sendMessage({ type: 'PREVIEW_TTS', text });
    } finally {
      // 合成约 1s，之后由 offscreen 播放；简单延时复位按钮状态
      setTimeout(() => setPreviewState('idle'), 1500);
    }
  }

  if (!form) return <div className="popup">加载中…</div>;

  // 存量自定义值不在预置列表时保留为额外选项，避免静默改动
  const customVoice = form.voice && !findVoice(form.voice) ? form.voice : null;

  return (
    <div className="popup">
      <h1>划词朗读翻译</h1>
      <p className="hint">选中文本 → 右键 →「朗读文本」即可朗读</p>

      <label>
        音色
        <select value={form.voice} onChange={(e) => void update({ voice: e.target.value })}>
          {customVoice && <option value={customVoice}>{customVoice}（自定义）</option>}
          {LANG_ORDER.map((lang) => {
            const group = VOICES.filter((v) => v.lang === lang);
            if (group.length === 0) return null;
            return (
              <optgroup key={lang} label={LANG_LABEL[lang]}>
                {group.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                    {v.gender ? `（${v.gender}）` : ''}
                  </option>
                ))}
              </optgroup>
            );
          })}
        </select>
      </label>

      <div className="row">
        <button onClick={() => void preview()} disabled={previewState === 'loading'}>
          {previewState === 'loading' ? '合成中…' : '试听'}
        </button>
        <button onClick={() => void stopReading()}>停止朗读</button>
        {saved && <span className="saved">已保存</span>}
      </div>

      <label>
        语速 <span className="value">{form.speed.toFixed(2)}x</span>
        <input
          type="range"
          min={0.5}
          max={2}
          step={0.05}
          value={form.speed}
          onChange={(e) => void update({ speed: Number(e.target.value) })}
        />
      </label>

      <label>
        风格指令模板
        <select
          value=""
          onChange={(e) => {
            const preset = STYLE_PRESETS.find((p) => p.name === e.target.value);
            if (preset) void update({ stylePrompt: preset.prompt });
          }}
        >
          <option value="" disabled>
            选择模板填入下方…
          </option>
          {STYLE_PRESETS.map((p) => (
            <option key={p.name} value={p.name}>
              {p.name}
            </option>
          ))}
        </select>
      </label>

      <label>
        朗读风格指令 <span className="value">（自然语言，1-4 句，留空则不传）</span>
        <textarea
          rows={3}
          value={form.stylePrompt}
          onChange={(e) => void update({ stylePrompt: e.target.value })}
          placeholder={DEFAULT_STYLE_PROMPT}
        />
      </label>

      <label>
        风格标签 <span className="value">（可选，如「温柔」，会拼成 (温柔)…）</span>
        <input
          type="text"
          list="style-tags"
          value={form.styleTag}
          onChange={(e) => void update({ styleTag: e.target.value })}
          placeholder="留空不加标签"
        />
        <datalist id="style-tags">
          {STYLE_TAG_SUGGESTIONS.map((t) => (
            <option key={t} value={t} />
          ))}
        </datalist>
      </label>

      <label>
        API Key
        <input
          type="password"
          value={form.apiKey}
          onChange={(e) => void update({ apiKey: e.target.value })}
          placeholder="sk-..."
        />
      </label>
    </div>
  );
}
