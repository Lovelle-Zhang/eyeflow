'use strict';

/**
 * Tray (right-click) menu labels — §4 zh/en. Built per the current locale each
 * time the menu opens, so it matches the panel's language. The 开发者 submenu is
 * dev-only test triggers.
 */

const TRAY_STRINGS = {
  zh: {
    open: '打开 EyeFlow',
    dev: '开发者',
    ff: '快进 1 分钟',
    remind: '测试一级提醒',
    remindNap: '测试二级提醒',
    napRitual: '小睡仪式 12s',
    replayOnboarding: '重放引导',
    reset: '重置精力',
    quit: '退出 EyeFlow',
  },
  en: {
    open: 'Open EyeFlow',
    dev: 'Developer',
    ff: 'Fast-forward 1 min',
    remind: 'Test level-1 reminder',
    remindNap: 'Test level-2 reminder',
    napRitual: 'Nap ritual · 12s',
    replayOnboarding: 'Replay onboarding',
    reset: 'Reset energy',
    quit: 'Quit EyeFlow',
  },
};

function trayStrings(locale) {
  return TRAY_STRINGS[locale === 'en' ? 'en' : 'zh'];
}

module.exports = { trayStrings };
