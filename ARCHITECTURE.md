# 划词朗读翻译 Chrome 插件 — 开发架构与技术选型

> 目标：鼠标划词 → 右键菜单「朗读文本」→ 用自然语音朗读所选文本（MiMo TTS）；
> 扩展支持「翻译并朗读」，面向「把英语当语言学」的场景（译文追求地道口语，朗读追求真人感）。

---

## 1. 产品定义

### 1.1 核心交互（MVP）— 用户期望用法

1. 用户在任意网页**鼠标选中**需要朗读的句子 / 词 / 段落；
2. **鼠标右键**，Chrome 弹出右键菜单，其中含本插件的菜单项「**朗读文本**」；
3. 点击菜单项，立即听到所选文本的语音朗读；
4. 朗读中再次触发 → 停止旧朗读、开始新朗读；点击扩展图标可停止朗读。

右键菜单（`chrome.contextMenus`，挂在 `contexts: ["selection"]` 上）：

| 菜单项 | 行为 | 期次 |
|---|---|---|
| 朗读文本 | TTS 朗读选中的原文 | **MVP** |
| 翻译并朗读 | 翻译选中文本 → 显示译文（通知/浮层）→ 朗读译文 | M3 |
| 朗读译文 | 用上次翻译结果朗读 | M3 |

### 1.2 分期功能

| 期 | 功能 |
|---|---|
| M0 | WXT + TS + React 脚手架，加载进 Chrome |
| M1 | 右键菜单「朗读文本」+ TTS 朗读链路（核心闭环） |
| M2 | 音频缓存、语速/音色设置、播放停止控制 |
| M3 | 「翻译并朗读」：MiMo 翻译 + 译文展示 + 朗读译文 |
| M4 | Options 页完善、生词本、快捷键（如 Alt+R 朗读选区） |
| M5 | （可选）划词自动浮层：选区旁显示译文 + 播放按钮 |

---

## 2. 总体架构

```
┌──────────────────────────────────────────────────────────────┐
│  Chrome Extension (Manifest V3)                              │
│                                                              │
│  ┌────────────────────┐      ┌────────────────────────────┐  │
│  │ Background SW      │      │ Offscreen Document         │  │
│  │ (唯一网络出口)       │ msg  │ (唯一音频播放器)            │  │
│  │                    │◄────►│                            │  │
│  │ · 右键菜单注册/响应  │      │ · Audio 元素播放 WAV/MP3   │  │
│  │ · TTS API 调用      │      │ · 语速 playbackRate 控制   │  │
│  │ · 翻译 API 调用      │      │ · 停止/重播                │  │
│  │ · 音频缓存          │      └────────────────────────────┘  │
│  │ · 请求去重          │                                      │
│  └─────────┬──────────┘      ┌────────────────────────────┐  │
│            │                 │ Content Script (M5 起)     │  │
│            │                 │ · 选区浮层（译文展示）        │  │
│            │                 └────────────────────────────┘  │
│  ┌─────────┴──────────┐                                      │
│  │ Popup / Options    │        api.xiaomimimo.com            │
│  │ · 音色/语速/风格设置 │ ──►   · chat (翻译) / tts (朗读)     │
│  │ · API Key 配置     │                                      │
│  └────────────────────┘                                      │
└──────────────────────────────────────────────────────────────┘
```

**关键原则：**

1. **API 调用只发生在 Background Service Worker** —— API Key 不暴露给页面侧；
2. **音频播放只发生在 Offscreen Document** —— MV3 的 Service Worker 无法操作 `Audio` 元素，
   官方推荐用 `chrome.offscreen`（`reasons: ["AUDIO_PLAYBACK"]`）承载播放；比注入 content script
   播放更可靠（不受 `chrome://`、PDF、Chrome 应用商店等受限页面影响）；
3. 右键菜单的选中文本由 `chrome.contextMenus.onClicked` 的 `info.selectionText` 提供，
   **MVP 阶段甚至可以不注入 content script**。

---

## 3. 技术选型

| 层 | 选型 | 理由 |
|---|---|---|
| 扩展规范 | **Manifest V3** | Chrome Web Store 新扩展强制要求 |
| 语言 | **TypeScript（strict）** | 消息协议、API 响应结构需要类型保障 |
| 构建框架 | **WXT** | 现代 MV3 框架：HMR、manifest 热更新、React 模板、对 background/offscreen 多入口支持好 |
| UI | **React 18 + Tailwind CSS** | Popup / Options 复用组件；M5 浮层用 Shadow DOM + Tailwind `important` 双保险隔离 |
| 右键菜单 | **`chrome.contextMenus`**（Background 注册） | 用户期望的触发方式；`contexts: ["selection"]` 只在划词后出现 |
| 朗读引擎 | **MiMo `mimo-v2.5-tts`** | 已验证可用：`voice: "Chloe"`，支持风格指令，返回 base64 WAV |
| 音频播放 | **Offscreen Document + `Audio` 元素** | MV3 播放音频的标准方案；`playbackRate` 调语速 |
| 翻译引擎 | **MiMo `mimo-v2.5` / `mimo-v2.5-pro`** | 同一 API Key/网关；LLM 译文口语自然。抽象 `TranslationProvider` 预留 DeepL/Google 兜底 |
| 配置存储 | **`chrome.storage.sync`** | API Key、音色、语速、风格指令等小配置 |
| 大数据存储 | **IndexedDB**（`idb` 封装） | 音频缓存、生词本 |
| 代码质量 | ESLint + Prettier + `tsc --noEmit` | — |
| 测试 | Vitest（纯逻辑）+ `fixtures/` 手工验收 | 日常口语中英对照样例做回归 |

### 3.1 为什么不选的方案

- **`speechSynthesis` 离线 TTS**：音色机械，达不到真人感；仅作断网降级备选；
- **content script 内播放音频**：受限页面（PDF、chrome://）注入失败；留给 M5 浮层场景做补充；
- **Web Speech / 免费翻译 API 机翻**：与「地道口语」目标冲突；保留为 Provider 兜底；
- **自建后端代理**：个人使用阶段不必要；上架商用前必须加（见 §7）。

---

## 4. 模块设计

```
src/
├── background/
│   ├── index.ts            # 入口：安装时注册右键菜单、消息路由
│   ├── context-menu.ts     # 菜单项定义与点击响应
│   ├── providers/
│   │   ├── translator.ts   # TranslationProvider 接口 + MiMo 实现
│   │   └── tts.ts          # TtsProvider 接口 + MiMo 实现
│   └── cache.ts            # IndexedDB 音频缓存
├── offscreen/
│   ├── index.html
│   └── player.ts           # Audio 播放、playbackRate、停止/重播
├── popup/                  # 停止朗读、快捷设置
├── options/                # API Key、音色试听、语速、风格、缓存管理
├── content/                # M5：选区浮层（译文展示）
└── shared/                 # 消息类型、设置 schema、常量
```

### 4.1 Background（Service Worker）

- `onInstalled`：`chrome.contextMenus.create({ id: 'read-aloud', title: '朗读文本', contexts: ['selection'] })`；
- `contextMenus.onClicked`：
  1. `info.selectionText`（Chrome 会折叠多余空白，直接可用）；长度 1–5000 字符校验；
  2. 查音频缓存 → 未命中调 TTS（`messages = [{user: 风格指令}, {assistant: 文本}]`，
     解析 `choices[0].message.audio.data` base64 → `Uint8Array`）→ 写缓存；
  3. `chrome.runtime.sendMessage({ target: 'offscreen', type: 'PLAY', audio, rate })`；
- **SW 生命周期**：异步消息 `return true` + `sendResponse`；TTS 请求期间防 SW 被杀（可选 keep-alive）；
- **请求去重**：相同文本并发只发一次网络请求。

### 4.2 Offscreen Player

- `chrome.offscreen.createDocument({ url: 'offscreen.html', reasons: ['AUDIO_PLAYBACK'] })`
  （幂等：创建前先判断 `hasDocument`）；
- 收到 `PLAY`：停止当前 `Audio` → `new Blob([audio])` → `URL.createObjectURL` → 播放，
  `playbackRate = 设置的语速`；
- 收到 `STOP` / 新的 `PLAY`：立即停止并释放旧 Blob URL；
- 播放结束/失败：回报 Background，失败时 toast 到 Popup。

### 4.3 设置（chrome.storage.sync）

```ts
interface Settings {
  apiKey: string;          // MiMo API Key
  voice: string;           // 默认 'Chloe'
  speed: number;           // 0.5–2.0，默认 1.0
  stylePrompt: string;     // TTS 风格指令，默认自然口语
  autoTranslate: boolean;  // 「翻译并朗读」是否自动播放译文
}
```

---

## 5. 关键时序：右键「朗读文本」

```
用户划词 ─► 右键 ─► Chrome 显示菜单「朗读文本」─► 点击
   ─► background: info.selectionText
   ─► 音频缓存命中? ─► 是 ─────────────────────────┐
                       │ 否                        │
                       ▼                           │
                  MiMo TTS API                     │
                  base64 WAV → ArrayBuffer → 缓存   │
                       └──────────┬────────────────┘
                                  ▼
                  offscreen: Blob → Audio.play(rate)
                  （再次触发即打断重播）
```

---

## 6. 数据与缓存

| 数据 | 存储 | Key | 说明 |
|---|---|---|---|
| 设置 | `chrome.storage.sync` | — | apiKey、voice、speed、stylePrompt |
| 音频缓存 | IndexedDB | `hash(text + voice + style)` | TTL 30 天或 50MB LRU 淘汰 |
| 生词本 | IndexedDB | 自增 id | 原文/译文/来源 URL/时间，导出 JSON/CSV |

---

## 7. 安全与隐私（重要）

1. **API Key 只存 `chrome.storage.sync`，只在 Background 读取**；用 `.env` + `.gitignore`，
   仓库只提交 `.env.example`；
2. 本次对话中 Key 已明文出现，建议开发完成后**到 MiMo 控制台轮换**；
3. `host_permissions` 仅 `https://api.xiaomimimo.com/*`，最小权限；
4. 选中文本仅在触发朗读/翻译时上传，不做其他采集；Options 页写明隐私说明；
5. **上架商用前必须自建后端代理**（Key 存服务端），直连方案上架等同公开 Key。

---

## 8. 目录结构

```
huacifanyi/
├── ARCHITECTURE.md
├── .env.example            # MIMO_API_KEY=...
├── wxt.config.ts
├── tsconfig.json
├── package.json
├── fixtures/
│   └── daily-speech.md     # 验收样例：日常口语中英对照
└── src/                    # 见 §4
```

---

## 9. 开发里程碑

| 里程碑 | 内容 | 验收标准 |
|---|---|---|
| M0 | WXT+TS+React 脚手架 | `npm run dev` 热更新，扩展加载进 Chrome |
| M1 | 右键「朗读文本」+ TTS + offscreen 播放 | **任意网页划词→右键→听到朗读**；再次触发可打断 |
| M2 | 音频缓存 + Popup（音色/语速/停止） | 重复朗读零延迟；设置持久化生效 |
| M3 | 「翻译并朗读」菜单 + 译文通知 | `fixtures/` 译文口语自然；朗读译文可听 |
| M4 | Options 页、生词本、快捷键 Alt+R | Key 不出现在 content script；数据可导出 |
| M5 | （可选）划词浮层 | 选区旁显示译文与播放按钮，Shadow DOM 不被页面样式干扰 |

---

## 10. 已验证的技术事实（2026-10-08）

- `POST https://api.xiaomimimo.com/v1/chat/completions`，header `api-key: <key>`；
- TTS：`model: mimo-v2.5-tts`，`audio: {format: "wav", voice: "Chloe"}` →
  `choices[0].message.audio.data`（base64 WAV，短句约 240KB）；
- 翻译：`model: mimo-v2.5` / `mimo-v2.5-pro` 可用（推理模型，输出含 `reasoning_content`，
  prompt 需约束「直接输出译文」）；
- `audio.format: "mp3"` **可用**（已验证，短句约 18KB，比 WAV 小一个数量级，扩展默认用 mp3）；
- 预置音色（官方列表，`src/shared/voices.ts`）：`mimo_default`、冰糖/茉莉/苏打/白桦（中文）、
  Mia/Chloe/Milo/Dean（英文）；中文音色「冰糖」已实测可用；
- WXT 只暴露 `VITE_` / `WXT_` 前缀的环境变量（`.env` 中的 `WXT_MIMO_API_KEY` 经 `import.meta.env` 注入）；
- `chrome.runtime.sendMessage` 为 JSON 序列化，消息中音频必须传 base64 字符串（不能传 ArrayBuffer）；
- 未知/待定：TTS 是否支持流式。
