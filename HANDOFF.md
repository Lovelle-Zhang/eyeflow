# EyeFlow Handoff

## 项目目标

EyeFlow 是承载 Mira 的 macOS 桌面应用。Mira 是用户记住和产生关系的主角：安静待在桌面一角，不抢控制权，不监视内容，只在合适的时候帮用户记得休息。EyeFlow 不是医学诊断工具，产品气质应轻、安静、有善意。

## 当前架构

项目是 Electron 桌面应用。`main.js` 负责主窗口、Mira 悬浮窗、Mira 气泡窗、强制爱全屏窗、托盘、菜单、系统生命周期、活动检测、通知、语音和 IPC。`preload.js` 暴露安全桥。`index.html` 是主工作台。`companion.html` 是悬浮 Mira 头像。`companion-panel.html` 是 Mira 气泡。`break-lock.html` 是强制爱全屏恢复页。应用通过 electron-builder 打包，本地安装到 `/Applications/EyeFlow.app`。

## 已完成功能

- 首次打开先让用户认识 Mira：卖陪伴感，而不是解释工具配置。
- 首日开始后 5 分钟内有一次轻量 aha 气泡，让用户感到 Mira 真的在旁边。
- 状态信号分区：0-47 舒适区，48-73 状态中段，74-100 状态偏高。
- 自动记录和手动专注分离；手动专注从 `00:00` 重新开始。
- 日切、锁屏、睡眠、关机、退出时清理或结算计时，避免隔天继续计时。
- L1/L2/L3/L4 提醒等级；L4 `强制爱` 为用户主动开启。
- 强制爱全屏恢复页，带更慢的语音引导和短恢复 cue；倒计时结束后切到明确完成态，聚焦 `回到 EyeFlow`，使用薄荷焦点样式。
- 恢复动作库：远眺、慢眨眼、闭眼、慢呼吸、掌心遮光、下颌、肩颈、颈侧、肩胛和轻柔眼周骨缘，不按压眼球。
- Mira 悬浮头像：hover 展开、点击收起、拖动移动、离开后延迟自动收起。
- Mira 在 focus、blink、rest 等状态有轻动画；支持减少动态效果。
- Mira 粉色/rest 状态点击头像会打开 EyeFlow，并把主界面聚焦到 `休息` 操作，同时显示休息指引 toast。
- Mira 可见性守护：找回、显示、生命周期恢复、显示器变化和定时监测会把 Mira 拉回可见工作区。
- 忙碌友好提醒：现在休息、5 分钟后、忙完再说。
- 设置页新增 `桌面就绪` 面板，直接展示辅助功能权限、开机启动、当前版本和通知通道，并可打开权限设置、切换开机启动、刷新桌面状态。
- 设置页新增 `反馈与诊断` 卡片，可复制结构化本地诊断反馈模板，包含版本、平台、权限、启动项、通知支持、提醒方式、恢复方式、当前状态信号、最近本地窗口/渲染/语音诊断摘要和用户问题；不会自动上传。
- 高级通知设置里有 `测试通知`，系统通知不可用时会禁用开关并说明会回退到 Mira 状态/轻提示音。
- 私测打包流程：本地 `.app`、DMG/ZIP 构建、GitHub 推送；桌面 QA 必须使用 EyeFlow 成品包，不使用 `npm start` 的 Electron 开发壳。可运行 `npm run smoke:app` 对 `dist/mac/EyeFlow.app` 做自动冒烟测试。
- 成品包 QA 辅助开关：`EYEFLOW_DEBUG_CAPTURE=1` 保存 Electron 内部渲染截图，`EYEFLOW_DEBUG_VIEW=rhythmView` 自动打开设置页截图，`EYEFLOW_DEBUG_ONBOARDING=1` 自动显示首次认识 Mira 的引导用于视觉 QA，`EYEFLOW_DEBUG_COPY_FEEDBACK=1` 自动复制反馈与诊断模板并记录 probe，`EYEFLOW_DEBUG_REST_CLICK=1` 自动验证粉色 Mira 点击休息指引路径，`EYEFLOW_DEBUG_FORCE_PREVIEW=1` 自动触发静音 15 秒强制爱预览、等待 `回到 EyeFlow`、返回设置页并截图；该开关现在不写入用户设置，并会 probe `voicePreserved`。`npm run smoke:app` 已把成品包截图校验流程自动化，并把粉色 Mira 点击后的 `休息` 指引纳入必过截图。

## 待完成功能

- 闭眼/呼吸音频引导还可以继续增强，例如更自然的分段停顿、提示音和用户可选音色。
- Mira 动画还可以继续更细腻，但要保持安静、少提醒。
- 系统级活动检测稳定性继续打磨，尤其是长时间使用、睡眠唤醒和多桌面空间。
- 设置页继续做减法，观察 `桌面就绪` 面板是否足够清楚，避免高级设置膨胀。
- 提醒策略个性化，根据用户反馈调整下一轮节奏。
- 主界面视觉质感继续升级，减少普通 dashboard 感。
- 正式分发：签名、公证、自动更新、崩溃日志。当前已补 `launch:preflight`、隐私说明、公开 release notes、签名/公证指南和干净 release staging；真正阻断剩 Apple Developer Developer ID 签名与 Gatekeeper。

## 关键文件

- `main.js`
- `preload.js`
- `index.html`
- `companion.html`
- `companion-panel.html`
- `break-lock.html`
- `assets/icon.icns`
- `docs/EYEFLOW_PRODUCT_MEMORY.md`
- `docs/CHANGELOG_2026-06-05.md`
- `docs/RELEASE_CHECKLIST.md`

## 已知 Bug

- macOS `screencapture` 在当前环境可能只截到壁纸和菜单栏，即使 EyeFlow 窗口已渲染；成品视觉验证优先用 Electron `capturePage()` 内部截图。
- `npm run smoke:app` 已验证成品包可稳定截图主界面、设置页、粉色 Mira 点击后的休息指引、Mira、Mira 气泡、强制爱全屏、完成态和返回设置页；如果后续改 Mira 休息入口或强制爱时序，优先跑这个脚本。
- Browser 自动化对桌面悬浮窗/hover 状态验证不稳定，Mira 交互更依赖成品 app 和内部截图。
- 未签名应用在 macOS 上可能有权限、启动和分发摩擦。
- 强制爱全屏与菜单栏、Dock、多桌面空间的边界仍需长期测试。
- 活动检测和睡眠/唤醒边界还需要更多真实使用场景验证。

## 下一步建议

优先继续做成品桌面 QA：Mira 拖动、hover 展开/收起节奏、找回 Mira、日切、睡眠恢复、强制爱全屏和语音。随后打磨设置页和权限体验，再集中做签名、公证、自动更新、发布说明和用户反馈闭环。
