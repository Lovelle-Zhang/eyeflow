# EyeFlow Public Beta Intake

## Use Case

Use this when inviting testers to the signed and notarized public beta build.

## Tester Profiles

Tag every tester before sending the build:

- `heavy-mac-worker`: works on a Mac most of the day.
- `designer-developer`: sensitive to UI polish and workflow interruption.
- `office-worker`: uses documents, meetings, chat, and browser-heavy workflows.
- `eye-strain-sensitive`: already notices dry eyes, fatigue, headache, or blur.
- `non-technical-mac-user`: useful for testing install trust and first-open clarity.

## Invite Message

```text
我在做 EyeFlow，一个让 Mira 安静陪你工作的 macOS 小应用。Mira 会待在桌面一角，不抢控制权，只在合适的时候轻轻提醒你休息。

想请你帮我做一次 10 分钟 public beta 测试：

1. 安装 EyeFlow。
2. 第一次打开后，看看能不能理解 Mira 是谁。
3. 点开始后等几分钟，看第一次轻提醒有没有“她在旁边”的感觉。
4. 看 Mira 是否出现、能不能拖动、展开和收起。
5. 开始一次专注，再点一次“休息”。
6. 到设置里试一次“强制爱预览”，确认全屏恢复能顺利回到 EyeFlow。
7. 点“复制诊断反馈”，确认能复制一段反馈文字。

请特别告诉我 5 件事：

1. 安装有没有卡住？
2. 第一次打开能不能理解 Mira 是谁？
3. Mira 是舒服、可爱，还是提醒太多？
4. 第一次轻提醒有没有让你感觉 Mira 在陪你？
5. 你还会不会想继续用？为什么？

说明：EyeFlow 不是医疗诊断工具，不读取文档内容、键盘输入、摄像头或麦克风。当前测试包如果还未完成 Apple 公证，macOS 第一次打开可能需要手动允许；安装说明里有步骤。

下载：
[放 DMG 链接]

安装说明：
[放安装说明链接]
```

## 10-Minute Test Script

Ask each tester to do this in order:

1. Install from DMG.
2. Launch EyeFlow from Applications.
3. Confirm whether the first-open message makes Mira understandable.
4. Start the first focus round.
5. Wait for the first lightweight Mira moment.
6. Drag Mira once.
7. Open and close Mira panel.
8. Click one ordinary rest.
9. Open Settings.
10. Run one `强制爱` preview.
11. Copy diagnostic feedback from Settings.

## Required Tester Reply

```text
Tester profile:
Mac model / macOS:
Install result:
First-open clarity, 1-5:
Mira comfort, 1-5:
Rest clarity, 1-5:
Would keep installed for one week? yes/no:
Most confusing moment:
Most valuable moment:
Bug or screenshot:
Copied diagnostics:
```

## Beta Cohort Rules

Start with 6 testers:

- 2 `heavy-mac-worker`
- 1 `designer-developer`
- 1 `office-worker`
- 1 `eye-strain-sensitive`
- 1 `non-technical-mac-user`

Widen only if:

- 5/6 install without help.
- 5/6 understand the first action within 30 seconds.
- 4/6 complete one rest flow.
- 4/6 say Mira feels helpful or comfortable.
- 3/6 say they would keep EyeFlow installed for one week.

Do not widen if:

- More than 2 testers fail install.
- More than 2 testers distrust the macOS warning.
- More than 2 testers describe Mira as distracting.
- More than 2 testers cannot explain what EyeFlow does after first open.
