# 提醒子系统 · 有界修复清单（2026-07-13）

来源：codex 复审 gpt-5.6-sol/ultra 对心脏 8 commit（原始报告 `scratchpad/codex-review-out.txt`）。
本清单只含**回退 fc2f724（视频在场功能）后仍存在的真问题**——即压力引擎治本本身的接线欠账。
视频功能引进的那半（C1 跑逃自杀 / 岛假完成 / 断言掉线追溯 / defer 被撤 / pmset 缓存 / 持有者不明）已随 revert `6be28f3` 消除。

**纪律**：这张表是"做完"的边界。修完这 10 条 = 提醒子系统收口。表外不扩（科学默认/参数化/首启弹窗等新功能，收口后再谈）。

---

## A. 行为 bug（用户可感，必修）

- [ ] **FB1 · 单源被破：两条旧提醒出口绕过引擎**（原 High）
  `index.html:11265/11294`（`nudgeRest`：quiet 档、`elapsed≥focusTarget` 弹 rest toast）+ `index.html:13351/13377`（`maybeNudgeAtNaturalBreak`：非 quiet、`activeSeconds/isNaturalBreak` 播 beep + 显"到恢复断点了"）。二者按 `focusTarget/activeSeconds` 走、绕过引擎与 main 统一出口。
  触发 A：quiet、focusTarget=25min、引擎 L0/due=false → 仍每 3min 弹 toast。触发 B：自动模式 25min 后 idle=8s → 仍 beep。
  **完成线**：这两条出口的"该不该提醒"判断删除或收进引擎；`breakDue`/提醒行为端到端唯一来源 = 引擎意图。〔优先级 1〕

- [ ] **FB2 · micro-uncertain 非零记账 + 同帧重生 pending**（原 High，C6 复活）
  `index.html:10360/12061/12100`。岛 ignored → 引擎压力不变（对），但 UI 把 A 记 `ignored/skippedRest=true`，render 见 due 仍真 → 立即建 pending=B、`shown++`；灰卡复活 + 负面反馈账污染。
  **完成线**：micro-uncertain 在 UI 层也真零记账；due 仍真时不得同帧重生新 pending（复用/沉默既有卡）。

- [ ] **FB3 · 生命周期清零无视时长 + 假记 breakTarget 休息**（原 High）
  `main.js:3117/3355`、`index.html:10916/10938`。lock/suspend/quit 到达即 full 清零（绕过 AWAY_FULL=300），并用配置的 breakTarget 冒充实际休息时长。eye=59m → 锁屏 10s 再解 → eye=0、记 120s completed；与"重启<5min 续压"直接冲突。
  **完成线**：短时锁屏/挂起不清满压力；只有真达到离开阈值才 full；记账用实际时长、不用 breakTarget 冒充。

- [ ] **FB4 · 手动 1s 补帧用缓存 idle，掩盖 main 活动流中断**（原 High）
  `index.html:11250/11875`。手动计时的 1s tick 用旧 idle 并刷新 `lastObsAtMs` → 若 main activity 流断、人离开>300s，renderer ticker 仍每秒用 idle=0 累积、gap≈1s → 输出 L2/due，正确应 away。
  **完成线**：补帧不得用陈旧 idle 续压；main 流中断要能被 gap 护栏识别为无观测。〔与 FB5 一并处理〕

- [ ] **FB5 · gap 护栏把"无观测≥300s"冒充"连续 idle≥300s"，读 idle 前就清零**（原 High）
  `index.html:11851/11880`。eye=3590 → renderer 卡死/重启 301s、其间用户一直在别的应用用屏 → 首帧直接 `createState()` 清零 → 临界提醒延后近 60min。
  **完成线**：无观测缺帧≠确定离开；清零前应校验真实离开信号（或保守续压而非清零，遵"拿不准往保护眼睛错"）。〔FB4/FB5 = gap 护栏语义的一体两面〕

- [ ] **FB6 · REMIND_REFRESH 重投同意图 + 吞掉"5分钟后"**（原 Medium）
  `main.js:64/2807`、`index.html:11812`。10min 刷新允许同 intent 重复投递；用户点"5分钟后"却被旧 key 的 10min 门挡到 t+10。
  **完成线**："5分钟后"defer 被真实尊重；同意图重投节奏与 defer 承诺不打架。

- [ ] **FB7 · D3 计数桶与显示桶时间源不同，边界仍说错**（原 Medium）
  `index.html:14139/14178`、`engine:113`。modeSignalKey 用 `timeBucket(now)` 计数、显示用 `intent.context.bucket`(来自 lastObsAtMs)。10:59:58 观测→11:00:01 render → 计"中午"却显"以往上午"。
  **完成线**：计数桶与显示桶同一时间源（都取 now，或都取 lastObsAtMs 并保证新鲜）。

- [ ] **FB8 · away 自然离屏漏记账**（原 Low）
  `index.html:11891/10297/12172`。`pressureStep.settled` 被宿主无条件丢弃，声称接管记账的 `maybeAutoCompleteBreak` 又受 session/暂停/半目标/cooldown 闸限制 → manual-paused、压力 50min→idle 到 300 → 引擎已清零但不记 break/recovery_event。
  **完成线**：away-full 结算与歇眼记账走同一权威路径，不靠"同帧巧合"，无漏记。

## B. 守卫/装机安全（非用户可感，但是安全网）

- [ ] **FG1 · build-manifest 守卫忽略 `!排除项`**（原 Medium）
  `scripts/smoke-build-manifest.js:57`。正向包含后再加 `!x` 排除 → 守卫仍判"已打包"（假绿）→ 包内缺失 → 静默 L0 fallback。
  **完成线**：守卫把"被 `!` 排除掉的运行时引用资源"也算红。

- [ ] **FG2 · 本地安装主路径不 gate 新 smoke，installed smoke 不读 engine**（原 Medium）
  `scripts/refresh-local-app.js:27`、`scripts/smoke-installed-app.js:98`。从 build.files 删 engine → `refresh:local` 仍能 build/install/打印 verified → 装机版全 L0。
  **完成线**：refresh:local 跑 `verify`（含 manifest/intent 守卫）；installed smoke 断言 asar 内含 engine 并能产出非 L0。

---

## C. 已回退 / 显式搁置（不在本次范围，别忘）

- **视频/被动观看在场信号**：fc2f724 已回退（C1 跑逃阈值 45min < L2 断点 60min，自我否定）。视频漏保护回到已知的"5min 清零"老状态。**重做时的正确姿势**：跑逃阈值 > L3(90min)、island 完成判定也要 viewing-aware、断言持有者校验、cap 与 isWorking/defer 的交互。收口后再做。
- **岛微歇用 raw idle≥14 当"看远了"证据**（原 High，pre-existing）：视频触发已随回退消除；根仍在，重做 presence 时一并处理。
- **科学默认 + 个人设置 / 引擎参数化 / 首启弹窗 / POSITIONING 调和**：新功能，收口后再谈。

## codex 明确背书的干净面（不用动）
纯引擎算术 / idle===300 边界 / away 单次结算 / micro·full·micro-skip·micro-uncertain 引擎侧算术 / 标准档 60min 真 micro 后降 45min、15min 内不再生 breakDue / 当前 build.files 无实际漏包。
