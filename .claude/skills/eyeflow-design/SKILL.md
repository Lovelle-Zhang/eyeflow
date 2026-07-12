---
name: eyeflow-design
description: EyeFlow 的网页设计与排版哲学（2026-07 落地页重塑中确立并验证）。凡是本仓库里涉及网页/落地页的视觉工作——布局、配色、字体、行距、CSS 样式、界面 mock、截屏呈现、动效过渡、明暗主题、响应式排版——都必须先读本技能再动手，即使用户没提"设计体系"四个字。用户说"优化页面""调排版""加个演示""换个颜色""做张卡"时同样适用。App 内 UI 遵循 eyeflow-design-system.css，本技能管的是 web 面（landing、宣传物料、分享卡网页版）。
---

# EyeFlow 网页设计哲学

活的范例是 `landing/index.html`（单文件，token 全在 `:root`）。本技能是它背后的"为什么"；改页面前先看它现状，别凭记忆重写。

## 一、Anthropic 式象牙纸体系

页面的声音是**纸和墨**：象牙纸底、暖墨文字、发丝线分隔、大留白。装饰性的东西（噪点纹理、渐变底、彩色圆点）一律不要——留白与发丝线自己会说话。

已验证的色板（勿凭感觉另调）：

```css
--ink: #141413;  --ink-soft: #3d3d3a;
--muted: #5f5e57;                 /* 正文灰,5.6:1 */
--muted-soft: #6d6b62;            /* 13px 小字的 AA 底线(≥4.5:1 on wash),再浅就读不清 */
--line: rgba(20,20,19,0.11);  --line-soft: rgba(20,20,19,0.06);
--wash: #F0EEE6;   /* 页底 */  --panel: #FAF9F5;  --panel-strong: #FCFBF8;
--mira: #1f7a5e;  --mira-strong: #1a6b52;   /* 夜晚版: #4fc99c / #62d3aa */
```

**绿色纪律**：Mira 绿只属于 Mira 本人——她的名字下划线、她的界面元素、全页唯一实心绿按钮（Act 4）。页面级 UI（CTA、导航按钮）用墨色胶囊（`--ink` 底 + `--panel` 字 + `border-radius: 999px`），悬停只做一档明度回弹。别让绿蔓延成第二主色。

**字体**：标题层衬线、正文层无衬线，两层分工即页面的编辑气质。

```css
--font-display: Georgia, "Songti SC", STSong, "Noto Serif SC", "Noto Serif CJK SC", "Times New Roman", serif;
```

零外链字体是硬约束（gh-pages 静态站，且护眼——无字体闪变）。app mock 内部保持无衬线（它们镜像真实 app），页面叙事声音才用衬线——这个分工别打破。

## 二、CJK 排版纪律

中文不是拉丁文的变体，规则要反着来（详见记忆 cjk-typography-lesson）：

- **字重轻**：宋体没有细体和中间字重，衬线标题一律 400；别用 500/600 让浏览器伪造。拉丁 Georgia 同理走 400，负字距最多 -0.01em（衬线不吃负字距）。
- **零字距**：中文正文 `letter-spacing: 0`；只有全大写 eyebrow 例外（0.16em）。
- **行高松**：正文 1.85、lede 1.8、衬线中文标题 1.45–1.5（拉丁标题 1.15–1.35）。语言差异一律走 `html[lang]` 覆盖，别写死在组件里。
- **绝不劈词**：长句超栏宽时，断点必须落在标点，不能落进词中间（"屏幕工/作伙伴"是事故）。机制是 `.cl` 子句 span：≥600px `white-space: nowrap`（断行只发生在子句之间）；≤560px 视上下文 `display: block`（子句各占一行）。修排版先标子句，别调字号硬挤。
- **按语种分治断行**：中文手工断行是诗性的（hero 四行两联、句间 0.45em 呼吸）；英文逐段硬断行会掉孤行（"a little."事故），要 `display: inline` + `text-wrap: balance` 自然摊行。同一份 HTML，两套断行策略，用 `html[lang]` 区分。
- **窄屏竖排 vs 宽屏流动**：短句竖排（copy-line 各占一行）是手机的节奏；到了宽栏，结语类段落要回归一句流动的话（`copy-line` 转 `inline-block`——换行仍只落在子句边界）。三行短句悬在宽栏中央 = 没着落。

## 三、对齐的三类规矩（手机端）

单列布局只有一条视觉主轴，三类元素各守各的：

1. **窗口卡**（app 界面 mock）与文案共享**左缘**——证据是正文的下一段，视线不左右跳。
2. **漂浮物**（提醒岛、Mira 气泡）**居中**——它们是胶囊/气泡，居中悬置才像真实桌面上的状态。
3. **仪式段**（hero、歇一下、收尾）**居中**——仪式时刻配得上正中。

桌面端左右交替排布；这个交替在单列里没有意义，所以手机统一"words first, proof after"。

## 四、截屏渲染规范

- 产品界面不放位图截图，用**活体 CSS mock**（cqi 单位随容器缩放）。理由：像素永远清晰、随主题换肤、动效是真的在工作。
- mock 的颜色**逐字取自 app 的 design-system token**（夜晚值抄 `eyeflow-design-system.css` 的 `data-theme="dark"` 块），不许拍脑袋调。mock 是产品事实的呈现，失真 = 说谎。
- app 界面 mock 套 **macOS 窗口镀边**：`.screen-card.is-window`，奶油 chrome 条 + 三颗**中性灰圆点**——不用红黄绿（高饱和噪点违反护眼 DNA，且圆点要在明暗两版下都可读：`rgba(128,127,120,0.4)` 通吃）。
- 分享卡是纸卡不是窗口，不套 chrome。
- mock 里看着能点的控件，要么做成真的（真 `button` + `aria-pressed`），要么明确是装饰（`aria-hidden`）。一个功能只留一个控件，页面级开关和 mock 内开关二选一——重复 = 混乱。

## 五、护眼过渡纪律（血泪教训）

EyeFlow 的 DNA：任何亮度跳变都是伤害。

- **过渡只走原生可插值属性**：`background-color / color / border-color / box-shadow`，0.5–0.6s。
- **禁用 `@property` 注册色插值、禁渐变背景过渡**——部分浏览器/合成路径不插值，整块直切 = 闪烁（07-10 实测翻车）。需要过渡的面，底色用纯色；渐变只给永不切换的面。
- 主题切换是**交叉淡入**，所有会变的元素都要进过渡选择器清单（换了标签名记得更新选择器——`span`→`button` 漏网也是那次事故的一半）。
- **初始状态直接落位**：按本地时间/系统判定的初始主题不播假淡入（`.no-fade` 类，双 rAF 后移除）。
- `prefers-reduced-motion`：全局动画杀掉后过渡自然瞬切，但要检查每个循环动画有显式的静止回退帧。

## 六、可访问性底线

- 小字（13px 级）对比度 ≥ 4.5:1（`--muted-soft` 已定在线上，别调浅）。
- 交互控件用真 `button`（键盘 + `aria-pressed`），触点 ≥ 32px。
- **语言切换入口在任何断点都不许藏**——默认语言跟系统走，另一半访客必须有出口。
- 双语文案走 `data-en` / `data-en-label` 机制；JS 动态改文案时要同步更新 `dataset.en/zh` 快照，否则切语言会回跳。

## 七、验证与交付

改完必须过这一遍，缺一步都算没验证：

1. 本地起服务（`.claude/launch.json` 的 `landing` 配置），**桌面（≥1280）+ 手机（375）两个视口**都看。
2. **中 / EN 两个语言**都切一遍（断行策略不同，只验一种 = 验一半）。
3. `document.documentElement.scrollWidth <= innerWidth` 无横向溢出；控制台零报错。
4. 注意：预览面板后台不渲染帧，动画/过渡采样会冻在起点——读计算样式验终值，动效手感让用户亲眼看。
5. 文案是锁定的（docs/POSITIONING.md + docs/MIRA_LANGUAGE.md，英文版对照表 docs/LANDING_EN_COPY.md）——设计工作**不动文案一个字**；发现口径矛盾（如"统一白天版"vs 夜晚演示）提给用户拍板，别自作主张改。
6. 部署 = 改 gh-pages 再 push（worktree 流程），部署时核对 favicon.svg 与 shots/ 资产是否同步；等 Pages `built` 后 curl 验线上标记。
