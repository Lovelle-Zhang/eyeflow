# 设计稿存档

## panel-redesign.html / .png — 菜单栏面板改版（目标 v1.1.0，尚未上线）

同一个菜单栏面板的两种状态设计稿：

- **① 未展开**：气色卡（86% · Eyes feeling fresh）→ 数据（screen / breaks）→ 强度 **Gentle / Strong** → **Rest now** / **Take a nap** 两个动作 → 底部 **⚙ Settings** 一行 + **Quit** 弱化小字（Settings 与 Quit 收成一个底部小组）。
- **② 点 Settings → 就地展开**（手风琴式，不弹窗、不换页）：展开 **Nap length 1/3/5 min**、**Open at login**、**Language 中/英**、**About**（版本 + Apple 公证 + 官网/评分）。

### 关键设计决定
- **强度 `reminderTier`（Gentle/Strong = 轻量/加强）只放面板**，是"当下想调"的控制；设置里不重复。
- **设置只放真机真实持久化项**（守「不堆旋钮」§6.4）：`napMs` / `openAtLogin` / `locale`。`reminderTier` 在面板；`onboardingDone` 是内部 flag 不露出。
- 设置齿轮从**右上角**挪到**底部一行带文字**，比孤零齿轮好认好点。
- Mira 光核守 hue-157 暗哑绿、低电量掉饱和，不用亮色。

### 真机数据依据（对过源码，勿凭印象改）
- 强度两档：`src/core/view/reminder/tier.js` → `['light','strong']`（label 轻量/加强，默认 light）。
- 小睡时长：`src/core/view/nap/nap.js` → `NAP_DURATION_OPTIONS_MS=[60000,180000,300000]`（**1/3/5 分钟**，默认 3min）。**注意：官宣视频里的"20 min"是宣传夸张，非真机。**
- 语言：`panel-strings.js` → zh/en，默认跟随系统。
- 设置项集合：`src/core/settings.js` `hydrateSettings`。

### 落地
面板是**原生 AppKit Swift**（eyeflow-tauri `native/Panel.swift`）画的 → 改版改 swift，在同一 Panel.swift 里做「就地展开」的高度动画。发布后再做（当前 App Store 审核 / PH 发布冻结期不动）。

版本号 v1.1.0 是稿子里的占位；实际发版由构建配置决定。
