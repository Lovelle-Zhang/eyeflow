'use strict';

/**
 * Nap ritual copy (§6.3 / MIRA_LANGUAGE §四) — zh/en, Mira voice. Pushed by the
 * nap controller so the fullscreen renderer stays a dumb painter. `wake` is the
 * brand-soul welcome-back that plays as Mira wakes.
 */

const NAP_STRINGS = {
  zh: { rest: '闭上眼，缓一缓。', wake: '欢迎回来。清楚一点了吧。', hint: '按 Esc 结束' },
  en: { rest: 'Close your eyes, and settle.', wake: 'Welcome back. Clearer now?', hint: 'Press Esc to end' },
};

function napStrings(locale) {
  return NAP_STRINGS[locale === 'en' ? 'en' : 'zh'];
}

module.exports = { napStrings };
