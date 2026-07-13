'use strict';

/**
 * User-facing short-break prompts — MIRA_LANGUAGE §四 (提醒 · 顶部胶囊浮出).
 * Light, an invitation, never a command; no 禁用词. Centralized here so all
 * user-visible reminder copy is auditable in one place.
 */

const SHORT_BREAK_PROMPTS = [
  '眼睛歇歇？看看远处。',
  '抬头看看窗外吧。',
  '让眼睛松一下。',
];

// 二级明确提醒 (MIRA_LANGUAGE §四) — 更明确但不指责，"咱们"同盟语气；仍是邀请，不命令。
const NAP_SUGGEST_PROMPTS = [
  '撑挺久了，这次真的歇一下吧。',
  '要不要小睡一会儿？我陪你。',
];

module.exports = { SHORT_BREAK_PROMPTS, NAP_SUGGEST_PROMPTS };
