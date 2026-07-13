# 精力引擎规格 v0（已签字 · 2026-07-13）

> 本文件是精力引擎的实现依据，从属于 CHARTER（尤其 §5 与 §5.4）。
> CHARTER 变，本文件随之修订；两者冲突以 CHARTER 为准。
> 落地顺序 §10 第 4 步：规格（本文件）→ 纯函数 → 测试先行 → 实现。
> 命名豁免：引擎内部标识符不受 MIRA_LANGUAGE 禁用词表约束（该表只管用户可见文案）。

---

## A. 引擎边界与纯函数契约

- **A1（锁定 §9.3/§9.4）** 引擎是纯函数：不碰 UI、不碰定时器、不碰 I/O、不含随机。
  调用方（driver）负责读系统信号、按节拍喂 tick、把输出事件映射到胶囊表现。
- **A2 核心函数**
  ```
  step(state, input, params) → { state, events }
  ```
  纯：同样的 (state, input, params) 永远得到同样的结果；不改写入参（返回新 state）。
  - **state**（引擎唯一的一本账，§9.2）
    ```
    { energy: number,     // 0–100 连续量（§5.4.1）
      l1Armed: boolean,   // 一级提醒是否已上膛
      l2Armed: boolean }  // 二级提醒是否已上膛
    ```
  - **input**（三选一）
    - `{ kind: 'tick', dtMs, idleSec }` — 时间流逝 dtMs 毫秒，当前系统闲置 idleSec 秒
    - `{ kind: 'shortBreak' }` — 一次真实完成的 20 秒短歇（回充一小格）
    - `{ kind: 'nap' }` — 一次完成的完整休息（回满）
  - **events** — 数组，元素 ∈ `'remind_short'` | `'remind_nap'`。无事件则为 `[]`。
    （胶囊气色是 energy 的纯函数，归第 5 步 §8.3，不在本引擎。）
- **A3（锁定）** 初始状态：`{ energy: 100, l1Armed: true, l2Armed: true }`（见 `state.js` 的 `initialState`）。

---

## B. step 的求值顺序

每次 `step` 严格按此顺序（保证纯、可测、无歧义）：

1. **应用输入到 energy**（见 C），再夹到 `[MIN, MAX]`。
2. **求提醒事件并更新上膛位**（见 D），基于第 1 步得到的 energy。
3. 返回 `{ state, events }`。

---

## C. energy 更新（§5.3 + §5.4）

夹取：任何更新后 `energy` 恒被夹在 `[MIN=0, MAX=100]`（§5.4.1/§5.4.4，地板 0 不为负）。

### C1 `tick` — 由 idleSec 分三段带
设 `mins = dtMs / 60000`：

| 带 | 条件 | energy 变化 |
|---|---|---|
| ACTIVE 活跃 | `idleSec < IDLE_GRACE` | `energy -= R_d · mins` |
| PAUSED 暂停 | `IDLE_GRACE ≤ idleSec < AWAY` | 不变（锁定 §5.4.2：暂停、不回充） |
| AWAY 离开 | `idleSec ≥ AWAY` | `energy += R_a · mins` |

（跨过 AWAY 线之后才回充，锁定 §5.3/§5.4.2。）

### C2 `shortBreak`
`energy += ΔS`（回充一小格；夹到 MAX）。
> 触发约定（D2，已签）：driver 在 20 秒短歇期间观察 idleSec，只有用户**真的看开/离屏**
> （该窗口内为 idle）才发 `shortBreak`；埋头打字穿过提醒则不发。于是"认真歇 = 健康循环，
> 从不真歇 = energy 继续掉、自然升级到二级"。引擎本身只负责 `+ΔS`，不判断是否真歇。

### C3 `nap`
`energy = MAX`（完整休息回满，锁定 §5.4.3）。

---

## D. 提醒：只看电量，边沿触发 + 重新上膛（§5.2）

只看 energy 与两条线 `X`（一级）、`Y`（二级），`Y < X`。用"上膛位"实现边沿：一条线只在
**上膛**时才会触发一次，触发后落膛，须回到恢复线以上才重新上膛（§5.2 天然安静窗口）。

第 2 步严格按以下算法（先 L1 后 L2；已签 D3：二者的重新上膛线都是 `X`）：

```
events = []
// L1（一级）
if (energy >= X) {
  l1Armed = true                       // 回到 ≥X → 重新上膛
} else if (l1Armed) {
  events.push('remind_short')          // 掉破 X 且上膛 → 触发一次
  l1Armed = false
}
// L2（二级）
if (energy >= X) {
  l2Armed = true                       // D3：回到 ≥X（真正恢复出琥珀区）才重新上膛
} else if (energy < Y && l2Armed) {
  events.push('remind_nap')            // 掉破 Y 且上膛 → 触发一次
  l2Armed = false
}
```

由此推得（作为验收行为，写进测试）：

- **D-a** 满电起步、持续用眼：energy 掉破 X → 恰好一次 `remind_short`；继续掉、掉破 Y → 恰好一次 `remind_nap`。
- **D-b** 触发后不再连发：只要 energy 一直 `< X`，同一条线不会二次触发（安静窗口）。
- **D-c** 认真短歇（手感 B，ΔS=44）把 energy 抬回 ≥X → L1 重新上膛；再次用眼掉破 X → 再来一次 `remind_short`。约 20 分钟节律。
- **D-d** 从不真歇（无 `shortBreak`）→ energy 一路掉破 Y → `remind_nap`；`nap` 回满 → 两线都重新上膛。
- **D-e** 单个 tick 若 dt 极大、一步同时掉破 X 和 Y：`remind_short` 与 `remind_nap` 同一次都吐。
- **D-f** energy 恰等于 X 记为"绿/安全"（`>= X` 走重新上膛支，不触发）；只有严格 `< X` / `< Y` 才触发。
- **D-g** 地板：energy 到 0 后停在 0，不再有新事件（L2 已落膛），直到回充。

---

## E. 默认参数集（§9.7 全可调，签定起始值，集中在 `params.js`）

| 参数 | 键名 | 含义 | 默认 | 手感 |
|---|---|---|---|---|
| MAX / MIN | `energyMax` / `energyMin` | 电量上下限 | 100 / 0 | — |
| 起始 | `energyStart` | 初始电量 | 100 | 满电登场 |
| R_d | `drainPerMin` | 活跃放电速率（点/分） | 100/45 ≈ 2.222 | 连续用眼 ~45 分见底 |
| R_a | `rechargePerMin` | 离开自然回充速率（点/分） | 100/15 ≈ 6.667 | 离屏 ~15 分回满 |
| ΔS | `shortBreakGain` | 短歇回充量（点） | 44 | 认真短歇 → 约 20 分再提醒（手感 B） |
| IDLE_GRACE | `idleGraceSec` | 活跃→暂停阈值（秒） | 30 | 打字间隙不误判 |
| AWAY | `awaySec` | 暂停→回充阈值（秒） | 300 | §5.3 的"5 分钟" |
| X | `lineX` | 一级线 | 50 | 满电 ~22 分首次轻提醒 |
| Y | `lineY` | 二级线 | 20 | 跳过短歇后再 ~13 分升级建议小睡 |

约束：`0 ≤ Y < X ≤ MAX`；速率与增益均 > 0；阈值秒数 > 0。

---

## F. 模块结构（§9.1 从第一天分模块，单一职责）

```
src/engine/energy/
  params.js       # DEFAULT_PARAMS（§9.7 唯一集中处）
  state.js        # 状态形状 + initialState(params)
  step.js         # energy 更新（tick/shortBreak/nap，纯）— 对应 C
  reminders.js    # 跨线 + 上膛（纯）— 对应 D
  index.js        # 组合 step()，导出公开 API + DEFAULT_PARAMS + initialState
test/engine/energy/
  step.test.js       # C：放电/暂停/回充/夹取
  reminders.test.js  # D：触发/安静窗口/重新上膛/同 tick 双触发/地板
  scenario.test.js   # D-a..D-g 端到端节律（喂多 tick）
```

---

## G. 非目标（本步不做）

- 不接系统信号（powerMonitor 取 idleSec 是 driver 的活，属第 6 步）。
- 不做 UI、不做胶囊气色映射（第 5 步）。
- 不做个性化放电速率（§5.3 明令 v1 不碰）。
- 不做记录/持久化（第 7 步）。
