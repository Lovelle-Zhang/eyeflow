# EyeFlow

EyeFlow 是一个面向长期屏幕工作者的低打扰恢复系统。它通过 Mira 记录当下用眼状态、寻找自然断点，并用温和的方式带你完成眨眼、远眺和短休息。

EyeFlow 不是提醒你休息，而是帮你用最低打扰完成恢复。

当前版本正在推进公开 macOS 发布：核心体验已经可以在 macOS 桌面运行，公开发布前需要通过签名、公证和上线 preflight。

## 产品原则

- App 叫 EyeFlow，机器人叫 Mira。
- 目标是给眼睛和身体减负，用低打扰的方式把恢复自然放进工作节奏。
- Mira 不抢控制权，提醒要有边界。
- `强制爱` 是用户明确开启的 L4 模式：到恢复断点进入全屏恢复，倒计时结束前不显示返回按钮。
- 浏览器页面只用于预览；真正的全屏恢复以打包后的桌面 App 为准。

## 当前能力

- 每天第一次打开，由 Mira 引导用户给当前眼睛状态打分。
- 根据初始状态调整第一轮恢复断点、休息长度和打扰边界。
- 今日页面展示当前用眼负荷、专注会话、节奏来源和轻量记录入口。
- Mira 桌面头像可拖动、可展开、可通过菜单找回。
- 支持安静、标准、强制爱三种提醒边界。
- 强制爱恢复页支持 Mira 陪伴、步骤流和不同恢复方式。
- 设置里支持开机自动启动、版本信息和重置今日数据。

## 开发

```bash
npm install
npm start
```

如果 Electron 下载慢：

```bash
npm run install:mirror
```

## 打包

```bash
npm run build:mac
```

生成 ZIP：

```bash
npm run build:zip
```

只打 DMG：

```bash
npm run build:dmg
```

成品包冒烟测试：

```bash
npm run smoke:app
```

正式上线前检查：

```bash
npm run launch:preflight
```

当前发布产物约定：

- App bundle: `dist/mac/EyeFlow.app`
- DMG installer: `dist/EyeFlow-0.1.0-x64.dmg`
- ZIP archive: `dist/EyeFlow-0.1.0-x64.zip`

如果 electron-builder 的 DMG helper 下载失败，可以使用文档里的 `hdiutil` 备用流程生成 private-alpha DMG。

## 重要文档

- [产品记忆](docs/EYEFLOW_PRODUCT_MEMORY.md)
- [2026-06-04 变更记录](docs/CHANGELOG_2026-06-04.md)
- [发布检查表](docs/RELEASE_CHECKLIST.md)
- [公开上线检查表](docs/LAUNCH_CHECKLIST.md)
- [签名与公证](docs/CODESIGN_NOTARIZE.md)
- [隐私说明](docs/PRIVACY.md)
- [测试版安装说明](docs/BETA_INSTALL_GUIDE.md)
- [下载页文案](docs/DOWNLOAD_PAGE_COPY.md)
- [测试反馈表](docs/TESTER_FEEDBACK_FORM.md)

## Alpha 注意事项

- 当前 App 未签名，分享给他人安装时 macOS 可能会提示安全警告。
- 还没有自动更新、崩溃上报和用户反馈后台。
- 进入正式外测前，需要做一次完整端到端审计。
