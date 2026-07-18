'use strict';

/**
 * User-facing reminder prompts — MIRA_LANGUAGE §四 (提醒 · 顶部胶囊浮出). Light, an
 * invitation, never a command; no 禁用词. zh is the source of truth the §禁用词
 * test audits; en is the Mira-voiced equivalent. All reminder copy lives here so
 * it stays auditable in one place. The controller picks per the current locale.
 */

const PROMPTS = {
  zh: {
    short: ['眼睛歇歇，看看远处', '抬头看看窗外吧', '让眼睛松一下'],
    // 二级明确提醒 — 更明确但不指责，"咱们"同盟语气；仍是邀请，不命令。
    nap: ['撑挺久了，这次真的歇一下吧', '要不要小睡一会儿，我陪你'],
    napButton: '小睡一会儿',
  },
  en: {
    short: ['Rest your eyes — look far', 'Look up, out the window', 'Let your eyes relax'],
    nap: ["You've held on a while — let's really rest now", "How about a short nap? I'll stay with you"],
    napButton: 'Take a nap',
  },
};

// zh named exports kept for the MIRA_LANGUAGE §禁用词 test (audits the source copy).
const SHORT_BREAK_PROMPTS = PROMPTS.zh.short;
const NAP_SUGGEST_PROMPTS = PROMPTS.zh.nap;

function reminderCopy(locale) {
  return PROMPTS[locale === 'en' ? 'en' : 'zh'];
}

module.exports = { SHORT_BREAK_PROMPTS, NAP_SUGGEST_PROMPTS, reminderCopy };
