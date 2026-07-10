# L1–L4 提醒机制审计（2026-07-10）

> 背景：dogfood 中观察到两个真实症状——
> ① 经常过了休息时间，L3 的绿胶囊提醒没有出现（该提醒时缺席）；
> ② 2026-07-09 有几次提醒连续不断地跳（不该提醒时狂轰）。
> 本文是全链路只读审计的结论：完整状态机、两个症状的病根排序、止血与治本方案。
> 行号基于审计当日代码（分支 `companion-recap-these-days`）。

---

## 一、完整状态机（现状实况，非文档理想态）

系统分**两进程、三本账、两个各自为政的冷却钟**：

```
┌─ 渲染端 index.html（每秒 tick + 每次 activity 事件 → render()）─────────────┐
│                                                                              │
│  currentIntervention(load) —— 每帧从易变输入重算 level（无记忆、无迟滞）:      │
│    force 档? ── 逃逸期→L1 / 未计时→L1 / ≥目标→L4 / ≥72%→L2 / 其余→L1        │
│    └ shouldHoldMiraSilence()? → L1   ←←← ①无条件静默闸,排在断点判断之前       │
│        · 前台是"深度工作app" 且 elapsed≥55%目标 → 静默                        │
│        · 今日 ignored≥2 且 elapsed≥65%目标 → 静默                            │
│        · highWorkStreak≥3(今天高负荷+前两天高负荷) → 静默                     │
│      └ quiet档 | 深度工作开关? → L1                                          │
│        └ clear & ≥目标+10min → L3                                            │
│          clear & load≥74 → L3                                                │
│          naturalBreak(仅auto模式,idle∈[8,45]s窗口) → L2  ←②≥目标时也先命中    │
│          ≥目标 → clear?L3:L2   ← 正常断点分支                                │
│          load≥48 | ≥72%目标 → standard?L1:L2                                 │
│                                                                              │
│  maybeRecordReminder → 账本A: state.pendingReminder                          │
│    闸: level≥2 → shouldSurface → defer闸 → snooze闸 → 4/8min记录冷却          │
│    pending 超12min 自动记 "ignored"（喂回静默闸 ignored 计数 → 自投毒）        │
│                                                                              │
│  renderCompanion → publishCompanionState（每秒≥1次 IPC）                     │
└──────────────────────────────────────────────────────────────────────────────┘
                                    ↓ state:publish
┌─ 主进程 main.js  applyInterventionBehavior（每次 publish 都跑）───────────────┐
│  账本B: lastInterventionLevel / lastReminderAt / breakRestSurfaced           │
│                                                                              │
│  quietedByUser(defer|snooze)? → 全静音（含 L3 断点!）                         │
│  hasReminderOpening(isRunning|opening|naturalBreak|pending)? 否→return       │
│      ←③ auto模式 isRunning=false,若 pending 没记上,断点时整个协调器不跑       │
│  l3BreakPoint = level≥3 && breakDue                                          │
│  发射条件: escalated(level比上一帧高,绕过冷却)                                │
│           | breakBypass(breakDue 且本轮未发过;!breakDue 时闩锁复位)           │
│           | 距上次 > 冷却(有pending=12min / L3=6min / 其他=8min)              │
│  发射时: 先记账(lastReminderAt=now, breakRestSurfaced=true)再投递 ←④吞胶囊    │
│    → startIslandMicroRest: islandRestActive 时直接 return ←⑤                 │
│                            shown.ok=false(break-lock在屏等)也 return ←⑤      │
│    → notify(): 自身零节流 ←⑥                                                 │
└──────────────────────────────────────────────────────────────────────────────┘
                                    ↓ 20s后
│  island 计时结束 → getSystemIdleTime 判定 completed/ignored                   │
│  → reminder:resolve 回渲染端销账（id 必须严格匹配,否则等12min超时→ignored）    │
```

- **升级**：无真正的状态机——`level` 每帧重算，"升级"只是重算结果变了。主进程靠
  `escalated`（本帧 > 上一帧）这个**边沿触发**识别升级，且升级**绕过共享冷却立即发射**。
- **降级/重置**：没有显式重置——elapsed 清零/暂停让分支自然掉回去；
  `breakRestSurfaced` 闩锁靠"看到一帧 !breakDue"复位。

关键代码位置：

| 环节 | 位置 |
|---|---|
| `currentIntervention(load)` | index.html ~14242 |
| `shouldHoldMiraSilence(load)` | index.html ~14076 |
| `shouldSurfaceReminder / maybeRecordReminder / closePendingReminder` | index.html ~11955 / ~11971 / ~11920 |
| `renderCompanion → publishCompanionState`（breakDue 定义） | index.html ~16430 / ~16453 |
| `applyInterventionBehavior`（协调器） | main.js ~2668 |
| `startIslandMicroRest / showNotchIsland / notify` | main.js ~2783 / ~3082 / ~2355 |
| `isDeepWorkApp` 名单 | main.js ~2904 |

## 二、症状 1「该提醒时缺席」——断点清单（按可能性排序）

**★ 病根 1：`shouldHoldMiraSilence` 的深度工作静默，对开发者几乎必然命中。**
深度工作 app 名单包含 **Cursor、VS Code、Terminal、iTerm2、Warp、Chrome、Arc、Safari、Figma**
——对本机用户，前台 app ~95% 时间都在名单里。elapsed 一过 55% 目标 → 静默闸命中 →
level 强制 = 1 → 断点分支根本执行不到 → 无 pending、无胶囊、无通知，哪怕超时 30 分钟。
且这条**不看** `deepWorkMiraOnlyToggle` 开关（默认 false）——另一处深度工作分支正确查了
开关，这条没查，违反设置项承诺。

**★ 病根 1b（同族）：ignored≥2 自投毒回路。**
岛的 20 秒 look-away 结束用「键鼠是否停下」判定，继续打字就记 `ignored`；pending 满
12 分钟没人理也记 `ignored`。今日攒满 2 次后，每轮过 65% 目标就全静默——越忙的日子
越到后面越没提醒。保护机制吃掉了核心承诺。

**★ 病根 1c（同族）：`highWorkStreak≥3`。**
今天高负荷（load≥48 或 elapsed≥85% 目标）+ 前两天也高负荷（重度用户基本恒真）→ 静默。
连续用三天，第三天 Mira 就哑。

**病根 2：先记账后投递，胶囊被吞。**（main.js 发射分支）
先置 `lastReminderAt=now`、`breakRestSurfaced=true`，再调 `startIslandMicroRest`。若此刻
`islandRestActive=true`（上一个 look-away 在跑）或 `shown.ok=false`（break-lock 在屏/窗口
异常）→ 静默 return，但"本轮已发射"的闩锁已消耗；超时期间 breakDue 恒真 → 闩锁不复位 →
只能等冷却重试，而有 pending 时冷却是 **12 分钟**。

**病根 3：auto 模式的大门漏洞。**
自动计时时 `isRunning=false`；到点那刻用户还在打字（无 naturalBreak、无 opening），若渲染端
因 4 分钟记录冷却还没记上 pending → `hasReminderOpening=false` → 协调器整个 return，
`l3BreakPoint` 没机会算。

**病根 4：naturalBreak 分支遮蔽 L3。**（currentIntervention 分支顺序）
auto 模式、已过目标、恰好停手 8–45 秒 → 返回 level 2 而非 3 → `l3BreakPoint=false` →
Mira 在屏时只出气泡、不出胶囊——EYEFLOW_INTENSITY_LEVELS.md 里记过的老 bug
（"显示 L3 行为 L2"）换个入口复活。

**病根 5：defer/snooze 全静音无 L3 豁免。**
「忙完再说」后若一直没出现 idle≥8s 的 opening，defer 持续挂着（随 state 持久化），主进程
对一切（含断点 L3）静音。

## 三、症状 2「连续狂跳」——路径分析

**★ 主路径：`escalated` 边沿触发 × level 抖动。**
level 每帧从前台 app、load、idle 窗口这些高频抖动输入重算；每次向上翻转都绕过冷却立即
发射（本意是给 L2→L3 升级用）。典型：在 Chrome（静默闸→L1）↔ 切到 Slack/Finder 回消息
（闸松开，已超时→L3）↔ 切回——**每次切出 = 1→3 = escalated = 立刻胶囊+横幅**。
load 在 48/74 阈值附近抖动、highWorkStreak 随 load 进出 → 同样 1↔3 翻转。

**副路径：breakDue 抖动 × 闩锁复位。**
auto 模式 naturalBreak 判定窗口是 idle∈[8,45] 秒：停手 8 秒→breakDue=true→发胶囊；
idle 过 45 秒→false→闩锁复位；碰一下鼠标再停 8 秒→true→breakBypass 再发一发。
节奏 ~30 秒一发，体感"不断跳"。

**放大器**：`notify()` 自身零节流，每次发射都出系统横幅；翻转期间 text-pill 调用会覆写
正在倒计时的 rest 胶囊（同一窗口、重置隐藏定时器），视觉更乱。

## 四、测试覆盖：行为测试 = 0

`scripts/smoke-intensity-matrix.js` 是**纯源码字符串断言**（assertIncludes/assertMatches
对文件文本做匹配）——验证"代码长这样"，不验证"代码这样跑"。`currentIntervention` /
`applyInterventionBehavior` 埋在 index.html IIFE 和 main.js 里，没有任何脚本执行过它们。
**`shouldHoldMiraSilence` 在测试和 EYEFLOW_INTENSITY_LEVELS.md 里都完全没被提及**——
canonical 文档"Failure Cases To Check First"列了 5 条排查项，恰好漏掉头号杀手。
触发/升级/重置全链条零行为覆盖，这是两个 bug 活到 dogfood 的直接原因。

## 五、病根总判

两个症状是**同一个架构病的两面**：level 每帧从易变信号（前台 app / load / idle 窗）重算，
主进程用边沿触发（escalated、闩锁复位）消费这个抖动信号，无迟滞、无防抖；外加三条无条件
静默闸横在断点承诺前面。信号抖到"静默侧"就是缺席，抖动本身就是狂跳。
（对应已知脆弱模式：单状态多路径、双异步源、tick 驱动。）

## 六、修复方案

### 第一步 · 止血（本次执行，每条单独 commit）

1. `shouldHoldMiraSilence` 加硬规则：**breakDue 时永不静默**（放闸最前）；深度工作静默必须
   `deepWorkMiraOnlyToggle` 开启才生效；Chrome/Safari/Arc 移出深度工作名单。
2. 发射改**事务式**：先投递、确认 `shown.ok` 再消耗闩锁/冷却，失败有界重试。
3. `escalated` 加 10–15 秒驻留（更高 level 稳定驻留才算升级）；`notify()` 加 ≥60s 自节流。
4. naturalBreak 分支挪到 ≥目标分支之后，消除 L2 遮蔽 L3。

不碰静默闸之外的共情逻辑。改完 rebuild 真机验证两个症状。

### 第二步 · 治本（止血验证后）= 已拍板的渐进式方案（任务书 2eaf770，D1）

单调的连续用眼**压力引擎**取代每帧重算的 level 作为触发源——压力只随在场用眼时间上升、
真休息才复位，结构上不存在抖动，边沿触发天然安全；用户四档降级为**封顶/风格**语义。
治本时必须：触发逻辑抽成可独立执行的纯函数模块 + 场景表驱动的行为测试，
并把本次两个症状写成固定测试用例。

### 对「简化成两层」的判断

简化本身就是狂跳一族的修复（引擎单调 ⇒ 无抖动）；但静默闸一族与层数正交，须单独止血。
应砍的是**触发状态机**（收敛成一个单调压力变量），不是用户可见档位（保留为封顶语义，
已发布 UI 不动）。
