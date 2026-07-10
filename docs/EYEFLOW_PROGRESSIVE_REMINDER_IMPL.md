# EyeFlow 实现清单：渐进式提醒系统（给 CC 的实现任务书）

> 本文替代上一版实现清单，是交给 Claude Code (CC) 的实现文档。
> **核心路线：在已发布代码上"叠加"，不是推倒重来。** 关键决策已定（第 0 节），
> 约 80% 是复用/改名现有能力，真正从零建的只有两块。动手前先读第 0 节。

---

## 0. 路线与已定决策（必读）

本 session 已发布（分支 `companion-recap-these-days`，装机 v0.1.5，正在真机 dogfood）
的提醒/岛/强度/复盘系统，是本规格的**地基**，不是要清掉的旧物。

### 已定决策（原为 DP1–DP4，已拍板）

- **D1 — 两套模型"叠成一套"，不替换、不并存。**
  规格的"按连续用眼时长自动升级"当**引擎**（决定 *何时 / 多强*）；线上"用户手选强度"
  (安静/轻/明确/强制爱) 当**天花板 / 风格**（决定 Mira *最多能 push 到哪*）。
  → **刚发的菜单栏四档切换、设置强度、复盘月洞察全部保留**，含义变为"允许 Mira 到多狠"。

  | 强度设置 | 升级封顶 | 行为 |
  |---|---|---|
  | 安静 quiet | L1 | 只到边缘光晕，永不打断 |
  | 轻 standard | L2 | 到 Mira 20 秒微仪式 |
  | 明确 clear | L3（软） | 到可一键跳过的软全屏建议 |
  | 强制爱 force | L3（硬） | 允许 L3 升到锁屏+倒计时那档 |

- **D2 — 强制爱保留，降为"仅 force 档才有的硬 L3"。**
  规格的"软全屏、不锁屏、不倒计时"= **默认 L3**（所有档）。现有 `break-lock.html`
  锁屏 kiosk = 只在用户**主动选强制爱**时才出现。既满足"默认不强制"，又不删已发布的
  opt-in 硬约束档。

- **D3 — 传感保留线上两级，不退回单一 180s。**
  暂停计时用现有 `PRESENT_IDLE_SECONDS`（≈300s，被动盯屏也算用眼，commit e215fd6 特意调的）；
  真离开/休息才重置计时（现有更长阈值）。**不要**用规格的单一 180s——那会把"安静读文档 3 分钟"
  误判成没在用眼。`DECISIONS.md` 记录：不做摄像头 + 这个 300s 被动盯屏取舍。

- **D4 — L1 光晕遵护眼红线**（[[eyeflow-eye-comfort-dna]]）：纯 alpha 渐变、无亮度骤变、
  6s 呼吸柔光可以，但 `prefers-reduced-motion` 下退化为静态极淡态。

### 复用映射（真正"新"的活很小）

| 规格项 | 现状 | CC 的活 |
|---|---|---|
| L1 边缘光晕 overlay | 无 | **① 新建**（唯一全新面，遵 D4） |
| 连续用眼压力引擎 | 无（现按强度+load+断点触发） | **② 新建**计时器（在场累计/idle 暂停/离开重置）→ 产出 0–3 压力级 |
| 强度→封顶重构 | 强度现直接决定行为级 | **③ 改**：强度改成给压力级封顶（见 D1 表） |
| L2 微仪式 | 岛 20 秒 look-away 自愈胶囊已在 | 复用，接到 60min/压力级 2 |
| 硬 L3 | `break-lock.html` 已在 | 复用，仅 force 档触发（D2） |
| 有效休息率(第4项) | `reminderStats.{completed,shown}` 已按天归档 | 加一句陈述，沿用同口径 |
| Session 数据(第5项) | `focus_session`/`reminder_event` 已采多数字段 | 对齐命名 + 补 2 个字段 |

**结论：新建 = ①L1 光晕 + ②压力引擎 + ③强度封顶重构；其余全是挂接现有能力。**

### Meta 建议
本规格动的是**刚发、还在 dogfood 的同一子系统**。建议**先把这几天的 dogfood 跑完**
（岛 / L2 默认 / 菜单四档的体感确认了）再叠这层，否则在未验证的改动上再架重构，两边都不好定位。
规格现在备好，不必立刻让 CC 动。

### 2026-07-10 dogfood 增补（已拍板，治本时必须纳入）

背景：`docs/REMINDER_AUDIT_2026-07-10.md`（L3 缺席 + 连跳的全链路审计）与止血分支
`reminder-l3-stopgap` 的后续发现。三件事随压力引擎一起做，不单独提前：

1. **Y · micro / full 休息正式分层**：岛 20s look-away = **micro**（时长固定、只**降压**、
   不清零轮次）；breakTarget 完整休息（overlay / break-lock）= **full**（**清零**轮次/压力）。
   两层直接映射到压力引擎的降压/清零语义。落地时给设置页"休息时长"补一句
   「只管完整休息」的说明（已拍板：现在不动文案）。

   **1a · micro→full 升级入口（已拍板设计，随 Y 实现）**：岛保持 20 秒轻仪式不变
   （**不**跟 breakTarget，守住 ambient 定位、否掉过 Z 方案）；但岛 look-away **完成后**
   提供一个轻量升级入口——「再歇够 N 秒？」（N = 用户设置的 breakTarget）：
   - **点击** → 顺势进入完整休息（overlay，走 breakTarget、清零轮次，= full 结账）；
   - **不点** → 按 micro 结账（20s 记账、降压不清零），不打扰。

   设计动机：用户设置的休息时长目前在日常断点流程里**没有兑现场所**（岛接住了一切，
   breakTarget 只在手动 overlay / L4 生效）；这个入口让设置每天都有登场机会，
   同时就是 micro→full 之间的桥——和压力引擎的降压/清零语义**同构**（不点=降压、
   点=清零），不需要额外状态。Mira 语气按语言宪法写：**邀请，不强迫**
   （参考句式方向：「刚才歇得不错。要不要再多歇 N 秒？」——落地时过宪法自检清单）。
2. **recovery_event 时长口径统一成"实际时长"**：现状四种口径并存——手动 overlay 与
   系统休眠记 `breakTarget` **目标值**、自动离屏记实际 `idleSeconds`、force 中断记 0、
   岛 micro 记实际 20s（2026-07-10 X 号对齐后）。治本时全部统一为实际发生时长，
   金句/复盘同步换算（"one metric → one function" 纪律）。
3. **岛 completed/ignored 判定语义修正**：现在用 `getSystemIdleTime` 猜"是否照做"，
   猜错记 `ignored`，而 ignored 计数喂给静默闸（ignored≥2 → 断点前全静默）——
   一环错账污染提醒引擎。压力引擎里重定义：传感不确定时**不记负面账**，
   ignored 只在用户显式跳过时记。
4. （工程遗留）`island:show` IPC 无生产调用方且绕过 `surfaceReminderChannels()`
   单出口——收权或删除（main.js 处已有 ⚠️ 注释）。

### 病例记录 · dogfood 2026-07-08 ~ 07-10（场景表测试用例来源，已拍板：不再单点修）

> 每条 = 复现条件 → 期望行为。新引擎的场景表测试必须覆盖全部病例并全绿。
> 旧引擎后续怪象继续追加到这里，不单独修。

| # | 病例 | 复现条件（尽可能精确） | 期望行为 |
|---|---|---|---|
| C1 | 静默闸吃掉断点（L3 缺席） | clear 档；前台是名单内 app（当时含 Chrome）过 55% 目标 / 今日 ignored≥2 过 65% / 连续三天高负荷过 85% | 断点提醒永不被共情静默吞掉；静默只影响风格 |
| C2 | 切 app 狂跳 | 静默闸使 level 随前台 app 在 1↔3 抖动；每次上跳=edge 立发胶囊+横幅 | 单调压力下无边沿重发；同级意图不重复投递 |
| C3 | 热身双跳（账本失同步） | 冷却路径先投递了驻留未满的 level；~2s 后驻留满 escalated 再开火 | 已投递级即稳定级；任何 60s 窗口≤1 次打扰面 |
| C4 | 岛歇完记零 | 岛 20s look-away completed → 只销 reminder 账 | micro 完成 = +实际时长入歇眼 + 降压结算 |
| C5 | 岛完成后灰卡/菜单栏挂死 | 岛 completed 只销 pending，elapsed 仍≥target → rest-due 卡+tray"休息"+闩锁全挂 | micro/full 结算走单一出口，派生态随压力状态自动回落 |
| C6 | **待命态误触发（矛盾病例，疑似又一处账本失同步）** | 真机实锤：19:36:53 岛 completed→closeBreakRound（elapsed 归 0）；**5 秒后**新 pending 被记录。链路：main 的 `activeSeconds` 不随轮次复位 + 用户恰在 look-away 后的 idle 8–45s 窗口 → `isNaturalBreak` 命中 → 5s 重录；用户随后转入待命（"我在旁边/先不计时/00:00"），灰卡挂到 12min 超时又记一次 ignored | 压力刚被结算（清零/降压）后，同一信号不得立刻再生成断点意图；待命态（无压力累积）不存在断点意图；pending 卡必须随意图消失 |
| C7 | 歇眼一天仅 1 分钟 | ①部分完成发生在无记账的旧构建；②6 次 look-away 5 次被 `getSystemIdleTime` 判 ignored（看远处但手碰键鼠）→ 不记账且喂静默闸 | 判定语义：不确定不记负面账；ignored 只在显式跳过时记（增补 3） |
| C8 | 通知说错星期（信任） | `modeMemoryLine` 引用历史 `signal.lastAt` 的周几；lastAt 由 12min 自动 ignore 写入（可被 C7 污染）；横幅脱离上下文被读成"今天是周三" | 事实纪律（MIRA_LANGUAGE.md）：可验证事实实时算或不说；引擎产出的文案上下文只含实时字段 |
| C9 | 结算后整晚机枪（07-10 晚，已从 leveldb 复盘定案） | **实录**：20:26–22:42 两小时 10 轮胶囊（pending 创建/销账对：20:38✓→20:42 新→20:51✓→20:55 新→20:56✓→21:15→21:26✓→21:30→21:33✓→21:57✗→22:01→22:09✓→22:15→22:22✓→22:26→22:34✓→22:38→22:42✓；最短间隔 4min）。机制 = C6 病根放大：closeBreakRound 结算后 main `activeSeconds` 棘轮不复位（人持续在屏）→ 每次停手 8–45s 再命中 isNaturalBreak → 记录冷却(4–8min)一到就重录重发。19:53 的冷却止血仅把复发间隔从 26–45s 拉到 4min，未断根 | **结算后压力必须真实回落**：settle 之后、压力重新累积满阈值之前，不得产生任何新的 breakDue 意图（≥15min 静默窗由降压量自然保证，非人为冷却） |

---

## 0b. 治本工程规格 v1（2026-07-10 · P0 待确认）

> 硬条件（已拍板）：①触发逻辑=可独立执行的纯函数模块（单调压力引擎）；
> ②投递/记账/轮次=单一出口；③场景表行为测试先行、病例全绿；④分阶段确认。

### 模块与边界

**新模块 `eyeflow-reminder-engine.js`**（纯函数，`window.EyeFlowReminderEngine`，
与 eyeflow-metrics 同风格，smoke 可 vm 直接执行）。三个函数，无内部
`Date.now()/Math.random()`——时间与随机全部参数注入：

1. **`pressureStep(prev, obs)` — 单调压力引擎**
   输入：上一压力状态 + 一帧观测 `{ nowMs, presentDeltaSeconds, idleSeconds, awaySeconds }`。
   输出：新压力状态 `{ pressure0to3 所需的累计在场秒数、最近结算时刻 … }`。
   语义：压力**只随在场用眼时间上升**（D3：present-idle≈300s 内都算在场）；
   真离开 ≥ 现有 NATURAL_AWAY 阈值 → 视作 full 结算（清零）。**无任何抖动输入**
   （前台 app、load、8–45s idle 窗一概不进引擎）——C2/C3/C6 从结构上不可能。
2. **`intentFor(pressureState, settings)` — 意图查表**
   压力级(0–3) × 强度封顶（D1 表：quiet→L1 / standard→L2 / clear→软L3 / force→硬L3）
   → `{ level, surface: none|glow|bubble|island-micro|soft-full|hard-full, breakDue }`。
   纯查表、**水平信号**（level-triggered）：没有 escalated/驻留/breakBypass 这些
   边沿概念，消费方只比对「新意图 vs 已投递意图」。
3. **`settleRest(pressureState, rest)` — 结算唯一入口**
   `rest = { kind: "micro"|"full", seconds }`：micro 降压固定量、不清零；full 清零。
   `closeBreakRound` 只负责渲染端账本（breaks/pending/冷却），压力结算一律经此函数。

### 既有代码的去向

| 现状 | 去向 |
|---|---|
| `currentIntervention` 千行分支 | 变**翻译层**：引擎意图 → 文案/displayLevel（文案上下文只含实时字段，C8） |
| `shouldHoldMiraSilence` 三闸 | **删**。共情（deepWork 开关/defer/snooze）降级为投递风格修饰：只改 surface 选择，永不改 breakDue 意图（C1） |
| `maybeRecordReminder` 多闸 | pending 账本只作 UI 卡片状态、由意图驱动；卡片随意图消失（C5/C6） |
| main `applyInterventionBehavior` 的 escalated/驻留/breakBypass/重试 | **删**（单调信号不需要防抖）；保留：意图比对 + `surfaceReminderChannels` 单出口 + 统一 60s 地板（C3/C9 的兜底断言） |
| `closeBreakRound` | 扩展：调 `settleRest`；仍是轮次/账本唯一出口 |
| 岛 completed/ignored 判定 | 重定义（增补 3）：不确定不记负面账（C7） |
| `island:show` IPC | 删除（增补 4） |
| 强度四档 UI / 菜单 / 复盘 | 不动（D1：语义变封顶） |

### 测试（先行，P1 产物）

`scripts/smoke-reminder-engine.js`：vm 执行引擎模块，**场景表驱动**——每行 =
时间线脚本（tick 序列 + 休息事件 + 设置）→ 断言意图序列。病例 C1–C9 全部入表，
另加正向基线（standard 60min 升 L2、force 到点硬 L3、真离开清零等）。
先写表、先红、引擎实现后全绿，才进 P3 接线。

### 阶段闸（每关给用户看）

- **P0** 本规格确认 ✅（2026-07-10 批准，照此执行不改）
- **P1** 场景表 v1 确认（用例行 = 病例 + 基线，含期望意图序列）←（当前）
- **P2** 引擎模块 + smoke 全绿（不接线，旧引擎照跑）
- **P3** 接线：渲染端翻译层 + main 简化 + 旧闸清退，全 smoke + codex 复审
- **P4** 装机 dogfood 验证，病例逐条对照销案

## 0c. P1 场景表 v1（2026-07-10 · 待逐行确认）

### 参数（引擎命名常量；⚠️ 标注 = 本表新提出、需拍板）

| 常量 | 值 | 来源 |
|---|---|---|
| `T_L1` | 40min 连续用眼 → 压力级 1 | §1（可配置） |
| `T_L2` | 60min → 压力级 2 | §1 |
| `T_L3` | 90min → 压力级 3（且 `skipCount ≥ 2`） | §1 |
| `PRESENT_IDLE` | idle < 300s = 在场，照常累积（被动盯屏算用眼，D3） | e215fd6 |
| `AWAY_FULL` | ⚠️ 连续 idle ≥ 300s = 真离开 → **full 结算**（清零 + 记自然离屏账）。把 D3 的"暂停"与"重置"合并为一条规则：既然 ≥5min 缺席已按现有语义记为休息（今日账本实录 300–376s 自然离屏事件），暂停态没有存在必要 | 提案 |
| `MICRO_RELIEF` | ⚠️ micro 完成 = 累积用眼时间 −15min（不清零、不清 skipCount） | 提案 |
| `FULL_RESET` | full 完成 = 累积归零 + `skipCount` 归零 | §1 |
| `SKIP` | 仅**显式跳过** micro 记 `skipCount += 1`；传感不确定（`micro_uncertain`）不记任何账 | 增补 3 / C7 |
| 封顶表 | quiet→cap L1(glow) · standard→cap L2(island-micro) · clear→cap L3(soft-full) · force→cap L3(hard-full) | D1 |
| 地板 | 投递层统一 60s min-interval（跨 surface 计数），breakDue 首枪走闩锁豁免 | 已落地 |

### 输入 DSL

`present(Nm)` 连续在场 N 分钟（含 idle<300s 的停顿）· `idle(Ns)` 短停 ·
`away(Nm)` 连续离开 ≥300s · `micro✓(20s)` micro 完成结算 · `micro✗` 显式跳过 ·
`micro?` 传感不确定 · `full✓` 完整休息结算 · `@查询` 该时刻调 `intentFor` 断言输出。
期望 intent 写作 `L{level}/{surface}/due={bool}`（level 为封顶后的行为级）。

### 用例行（B=基线 · C=病例；每行 = 给定输入序列 → 期望输出）

| # | 来源 | 设置 | 给定输入序列 | 期望 intent / 结算输出 |
|---|---|---|---|---|
| B1 | 该提醒必提醒 | clear | present(40m) @查询；present(→60m) @查询；micro✗ ×2；present(→90m) @查询 | @40m `L1/glow/due=false`；@60m `L2/island-micro/due=true`；@90m（skipCount=2）`L3/soft-full/due=true` |
| B2 | micro 降压不清零 | standard | present(60m) @查询；micro✓(20s)；@查询；present(+15m) @查询 | @60m `L2/island-micro/due=true`；micro 后累积 60−15=45min → `L1/glow/due=false`；+15m（累积 60m）→ 再次 `L2/island-micro/due=true` |
| B3 | full 清零 | clear | present(70m)；full✓；@查询；present(+39m) @查询；present(+1m) @查询 | full 后累积=0、skipCount=0 → `L0/none/due=false`；+39m 仍 `L0/none`；+40m → `L1/glow/due=false` |
| B4 | 封顶语义 | 全四档 | 同一序列 present(95m) + micro✗×2，分别在 quiet/standard/clear/force 下 @95m 查询 | quiet→`L1/glow`（永不高于）；standard→`L2/island-micro`（90m+skip2 也不升）；clear→`L3/soft-full`；force→`L3/hard-full` |
| B5 | 离开即清 | 任意 | present(50m)；away(5m)；@查询；present(+10m) @查询 | away 触发 full 结算（+自然离屏账 300s）→ `L0/none`；+10m 仍 `L0/none`（10<40） |
| B6 | 被动盯屏算用眼 | standard | 40 分钟由「敲键 30s + idle(240s)」循环组成（idle 全部 <300s）@40m 查询 | 累积 = 40min（idle<300s 全计入）→ `L1/glow/due=false` |
| C1 | 静默闸缺席 | clear | 与 B1 完全相同的序列；期间"前台=深度工作 app / 当日 ignored 统计 / 三天高负荷"以任何形式存在 | 与 B1 期望**逐点相同**——结构断言：`pressureStep/intentFor` 的输入 schema 不含前台 app、load、当日统计字段，共情只能改 surface 风格、永不改 due |
| C2 | 切 app 狂跳 | clear | present(61m)，期间前台 app 每 10s 切换（噪声不构成 obs 字段）@40m @60m @61m 查询 | 三点分别 `L1/glow` `L2/island-micro` `L2/island-micro`——intent 只在阈值处变化一次；投递层断言：61 分钟内打扰面投递 ≤2 次（40m 与 60m 各一） |
| C3 | 热身双跳 | clear | present(60m) @T 查询并投递；T+2s 再查询 | 两次查询返回**同一意图**（水平信号无边沿）；投递层断言：同意图不重复投递，60s 地板兜底 |
| C4 | 岛记零 | standard | present(60m)；micro✓(20s) | settle 输出 = `{recoverySeconds:+20(实际), pressure:−15min, skipCount:不变}`；歇眼账 +20s |
| C5 | 灰卡挂死 | standard | present(60m)；micro✓(20s)；@查询 | settle 后 intent = `L1/glow/due=false` → 断点卡/tray"休息"等派生 UI 必须随 due=false 消失（接线层断言） |
| C6 | 待命态误触发 | standard | present(60m)；micro✓(20s)；idle(30s)（look-away 余波，<300s 属在场）@查询 | 累积 = 45min + 30s → `L1/glow/due=false`——不存在任何用陈旧 activeSeconds 再生成 due 的路径 |
| C7 | 判定语义 | standard | present(60m)；micro?（传感不确定）@查询；随后 micro✗；再 micro✗；present(→90m+) @查询（clear 档重跑） | micro? → **零记账**（不降压、不记 skip、不记 ignored）→ intent 仍 `L2/due=true`；两次显式 ✗ 后 skipCount=2；clear 档 @90m → `L3/soft-full` |
| C8 | 事实纪律 | 任意 | 任意序列 @查询 | 结构断言：`intentFor` 输出的文案上下文只含 `{level, surface, bucket(now), minutes(实时累积)}`——无历史日期/星期字段 |
| C9 | 结算后机枪 | standard | present(60m)；micro✓(20s)；此后持续 present，每 4min 查询 ×4 | 四次查询 = 累积 45→49→53→57min，全部 `L1/glow/due=false`；直到累积回满 60m 才再次 `L2/due=true`——结算后 15 分钟静默由降压量自然保证，无人为冷却 |

> 通过标准：P2 的 `smoke-reminder-engine.js` 以本表为唯一事实源逐行执行；
> 行有增删改必须回到本表先改再改测试。

## 1. 渐进式提醒系统（本次核心）

**分级逻辑（= 压力引擎 × 强度封顶）**
- **Level 0（正常使用）**：无任何打扰，仅后台记录连续用眼时长。
- **Level 1（连续用眼 40min，可配置）**：全屏透明 click-through overlay
  (`transparent: true`, `ignoreMouseEvents: true`, `alwaysOnTop: 'screen-saver'`)，
  屏幕四边缘泛起柔和雾化光晕（CSS `radial-gradient` + `blur`），呼吸式渐入，约 6s/周期，
  色彩取现有 design token 暖色端。**遵 D4 护眼红线。**
- **Level 2（连续用眼 60min）**：Mira 出现，给一条 20 秒微仪式引导（第 3 项，复用岛胶囊）。
- **Level 3（连续用眼 90min 且 Level 2 被忽略 ≥2 次）**：
  - **默认（明确档及以下）**：更明显的软全屏建议，**永远可一键跳过，不锁屏、不倒计时**。
  - **强制爱档**：升级为现有 `break-lock.html` 锁屏+倒计时（D2）。
- 每级都受**强度封顶**（D1 表）：到顶即不再升级。
- 用户休息或离开后，所有层级渐出，计时重置。设置保留「经典模式」(纯通知) 作为 fallback。

**现状**：分级/触达在 `main.js` `applyInterventionBehavior` + 渲染端 `currentIntervention`。
全屏面 = `break-lock.html`（现强制爱 kiosk）。无 L1 光晕，无连续用眼计时器。

**要做**
1. **压力引擎**：新建连续用眼计时器（复用现有 idle 采样，D3 两级阈值），产出 0–3 压力级。
2. **强度封顶重构**：`currentIntervention` 改为"压力级 ∩ 强度封顶"→ 实际行为级（D1 表）。
   保留菜单四档 + 设置强度（含义变封顶）。
3. **L1 光晕 overlay**：新 html + main 窗口（transparent/click-through/screen-saver，D4）。
4. **L2**：压力级 2 且封顶允许 → 触发岛微仪式（第 3 项）。
5. **L3**：压力级 3 且 L2 被忽略 ≥2 → 软全屏；仅 force 封顶时走 break-lock 硬版。
6. 渐出 + 计时重置的统一收敛点；经典模式 fallback 开关进设置。

**文件**：`main.js`（引擎/overlay 窗/封顶逻辑）、新 `overlay.html`（L1 光晕）、
`break-lock.html`（软/硬两态）、`index.html`（`currentIntervention` 封顶 + 经典模式开关）、
`preload.js`（新 IPC）、`companion.html`/`island.html`（L2）。

**验收**：连续在场 40/60/90min 分别触达 L1/L2/L3（受强度封顶）；安静档永不超过 L1；
强制爱档 L3 才走锁屏；任一层级一键跳过或离开即渐出+重置；idle 超阈值暂停计时；
reduced-motion 下 L1 退成静态极淡；经典模式只走通知；菜单四档仍可切且语义为封顶。

---

## 2. 在屏判定

**规格**：`getSystemIdleTime()`，idle > 阈值即暂停用眼计时，回活跃后续计。不引入摄像头，写进 `DECISIONS.md`。

**现状**：已有 `getSystemIdleTime` + `PRESENT_IDLE_SECONDS`（≈300s）+ 更长的"真离开"阈值。无 `DECISIONS.md`。

**要做**：① 压力引擎复用现有两级阈值（D3：暂停≈300s / 重置=真离开），**不新引 180s**。
② **新建 `DECISIONS.md`**，记录：不做摄像头（隐私成本 > 精度收益）+ 300s 被动盯屏取舍 + 不采集 app/URL/内容。

**文件**：`main.js`、新 `DECISIONS.md`。
**验收**：离开 > 暂停阈值后回来续计；真离开/休息才重置；`DECISIONS.md` 含上述三条决策。

---

## 3. 休息引导微仪式（挂在 Level 2）

**规格**：文案库 5–8 条随机轮换（20-20-20、眨眼 20 次、深呼吸、远眺）；守护者语气（不是教练）；
新增方向参考「先离开屏幕 30 秒，也是一种继续前进的方式」；每条 20 秒内可完成。

**现状**：岛 20 秒 look-away 自愈胶囊已在；`lightReminderLine` / Mira 文案族可扩；
Mira 语气锚点：第一人称、"我守着/我在/看着节奏"、不催。

**要做**：文案库扩到 5–8 条（含那句方向参考），日期/序号 seed 确定性轮换；挂到压力级 2；
复用岛的完成/忽略/延后销账闭环。**别另造 20 秒计时器**——用岛现成的。

**文件**：`eyeflow-core.js`（文案）、`main.js`(L2 触发)、`island.html`/`companion.html`。
**验收**：L2 触达随机出一条守护者语气引导；不重样轮换；reduced-motion 友好；20 秒内可完成。

---

## 4. 「这几天」页新增：有效休息率

**规格**：定义 = 实际执行的休息 / 提醒次数；温和陈述、不评分不警示：「这几天，10 次提醒里你休息了 7 次」。

**现状**：`reminderStats.{completed,shown}` 已按天归档；`profileWindowStats` 聚合周/月；
复盘页刚做了"月=趋势"洞察（`eyeflow-rhythm.js`）。

**要做**：加一句"有效休息率"陈述，口径 = `completed/shown`，**沿用现有 reminderStats，别另造口径**
（一指标一函数，[[eyeflow-fragility-patterns]]）。放"这几天"概览区，温和不评分；
与月洞察并存（洞察当标题、这句当证据之一）。

**文件**：`index.html`（这几天页）、复用 `eyeflow-metrics.js`。
**验收**：周/月概览出现"N 次提醒里休息了 M 次"；数不够时诚实留白（不编）。

---

## 5. 数据层预埋（本版本不做 UI）

**规格 Session 结构**
```
Session {
  start_time, end_time, duration,
  idle_gaps,              // 期间的空闲段
  prompt_level_reached,   // 本段触达的最高提醒等级
  break_prompted,         // 是否触发提醒
  break_completed,        // 休息 / 忽略 / 延后
  recovery_latency        // 提醒发出到实际离屏的秒数
}
```
为将来周报的「最长连续用眼时段」「Recovery Latency」留数据。**不采集** active app / URL / 内容分类。

**现状**：`focus_session` 已有 start/ended、duration、loadAtStart/End、endedBy、interruptedByBreak；
`reminder_event` 已有 `responseLatencySeconds`(= recovery_latency)、userResponse(= break_completed)。
**多数字段已在采集。**

**要做**：对齐命名到上面 Session 口径，补缺字段：`idle_gaps`（本段空闲段）、
`prompt_level_reached`（依赖第 1 项的压力级）。保持"不采集 app/URL/内容"（记进 `DECISIONS.md`）。本版不做 UI。

**文件**：`index.html`(事件写入)、`main.js`(压力级信号)、`DECISIONS.md`。
**验收**：每个连续用眼段落地一条含上述字段的记录；无任何 app/URL/内容字段。

---

## 优先级 / 明确不做 / 发版

**优先级**：`1 > 3 > 4 > 2 > 5`。第 1 项完成后值得单独发一条 GitHub Release 更新说明。

**明确不做**：应用分类/心流矩阵、精力漂移分析、摄像头检测、月报、注意力图谱、商业化分层。
（注：本 session 已做的复盘"月=趋势洞察"是叙事洞察、非数据月报，与"不做月报"不冲突。）

**商业化**：留存与提醒响应数据将用于后续商业化决策（仅本地，采集边界见 `DECISIONS.md`）。

---

## CC 起步顺序（建议）
1. 先补 `DECISIONS.md`（摄像头 + 300s + 不采集内容）——它约束后面所有采集。
2. ②压力引擎 + ③强度封顶重构（不动 UI，先跑通"压力级 ∩ 封顶 → 行为级"）。
3. ①L1 光晕 overlay（遵 D4）。
4. 挂 L2（复用岛）、L3 软/硬两态（复用 break-lock）。
5. 第 4 项有效休息率一句、第 5 项补两个字段。
6. 全程：动到分级/提醒/强制爱/Mira 视觉 → 按 CLAUDE.md 约定 codex 只读复审。
