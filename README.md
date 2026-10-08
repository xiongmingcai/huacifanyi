# 划词朗读翻译（huacifanyi）

Chrome 浏览器插件：**选中文本 → 右键 →「朗读文本」**，即刻听到自然语音朗读。基于 [MiMo TTS](https://mimo.mi.com)（`mimo-v2.5-tts`）真人感音色，支持中英文、多音色、风格控制与语速调节。

> 把英语当语言学：日常口语句子选中即读，跟读、磨耳朵两相宜。

## ✨ 功能

- 🖱️ **划词朗读**：选中任意网页文本，右键菜单一键朗读
- 🗣️ **9 种预置音色**：Mia / Chloe / Milo / Dean（英文）、冰糖 / 茉莉 / 苏打 / 白桦（中文）
- 🎨 **风格控制**：内置「日常口语 / 英语学习跟读 / 温柔治愈」等风格指令模板，支持 `(温柔)` 式风格标签
- ⏩ **语速调节**：0.5x – 2.0x
- 🔁 **打断重播**：新朗读自动打断上一句
- 🔒 **隐私最小化**：仅在你触发朗读时将所选文本发送至 MiMo API，不做其他采集

## 📦 安装（3 步）

> Chrome 不允许拖拽安装扩展（安全限制），需「加载已解压的扩展程序」。

1. **下载**：到 [Releases](../../releases) 页下载最新的 `huacifanyi-v*-chrome.zip`，**解压**得到 `chrome-mv3` 文件夹
2. **加载**：Chrome 地址栏打开 `chrome://extensions` → 右上角开启 **「开发者模式」** → 点 **「加载已解压的扩展程序」** → 选择解压出来的文件夹
3. **配置 Key**：点工具栏扩展图标 → 在 **「API Key」** 栏填入你自己的 MiMo API Key（下节说明如何获取）→ 点 **「试听」** 确认有声

## 🔑 获取 MiMo API Key

1. 打开 [MiMo 开放平台](https://mimo.mi.com) 注册/登录
2. 在控制台创建 API Key
3. 粘贴到扩展弹层的「API Key」栏即可（`mimo-v2.5-pro` / `mimo-v2.5-tts` 通用同一个 Key）

## 🚀 使用

1. 在任意网页**选中**一句话（中英文皆可）
2. 在选中区域上**右键** → 点 **「朗读文本」**
3. 听到朗读；点扩展图标可「停止朗读」或调整音色/语速/风格

## 🗣️ 预置音色

| 音色 | Voice ID | 语言 | 性别 |
|---|---|---|---|
| MiMo-默认 | `mimo_default` | 集群默认 | — |
| 冰糖 | `冰糖` | 中文 | 女 |
| 茉莉 | `茉莉` | 中文 | 女 |
| 苏打 | `苏打` | 中文 | 男 |
| 白桦 | `白桦` | 中文 | 男 |
| Mia | `Mia` | 英文 | 女 |
| Chloe | `Chloe` | 英文 | 女 |
| Milo | `Milo` | 英文 | 男 |
| Dean | `Dean` | 英文 | 男 |

## 🎨 风格指令怎么写

弹层「朗读风格指令」会作为自然语言控制传给 TTS（1-4 句、具体、避免"普通的""混响"等词），内置模板举例：

> 发音清晰饱满，语速稍慢，句尾自然收束，像英语老师做示范朗读，方便学习者听清每一个单词。

「风格标签」栏填 `温柔` / `活泼` / `磁性` 等词会拼成 `(温柔)…` 放在文本开头做精细控制。详见 [MiMo 官方文档](https://mimo.mi.com/docs/zh-CN/quick-start/usage-guide/audio/speech-synthesis-v2.5)。

## 🛠️ 本地开发

```bash
npm install
cp .env.example .env   # 可选：填入自己的 Key 作为开发默认值（.env 不入库）
npm run dev            # 开发模式（热更新）
npm run build          # 产物在 .output/chrome-mv3
npm run compile        # 类型检查
npm run smoke          # 无头 Chrome 端到端冒烟测试（划词→右键→朗读全链路）
```

技术栈：[WXT](https://wxt.dev) + TypeScript + React，Manifest V3；架构设计见 [ARCHITECTURE.md](./ARCHITECTURE.md)。

## 🔐 隐私

- 仅当你右键触发「朗读文本」（或点「试听」）时，所选文本才会被发送至 `api.xiaomimimo.com` 进行语音合成
- API Key 仅存储在浏览器 `chrome.storage.sync`，直接从你的浏览器发往 MiMo，不经过任何第三方服务器
- 无统计埋点、无遥测

## 📄 License

[MIT](./LICENSE)
