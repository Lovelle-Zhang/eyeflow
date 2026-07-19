'use strict';

/**
 * Panel i18n (§4) — one definition of every menubar-panel string in zh + en.
 * The panel renderer is a plain <script> (no module system, CSP 'self'), so i18n
 * lives here in main: buildPanelPayload formats per the persisted locale and
 * pushes ready strings. Default is zh; the user switches it in the panel settings.
 * State keys (bright/steady/dimmed/faded) match energy-color's energyStateKey.
 */

const STRINGS = {
  zh: {
    today: '今天',
    screenTime: '今日用眼',
    napLength: '完整休息时长',
    reminderStyle: '提醒档位',
    restNow: '现在歇一下',
    shortBreakSub: '短歇 · 20 秒',
    takeNap: '小睡一会儿',
    quit: '退出 EyeFlow',
    settings: '设置',
    language: '语言',
    launchAtLogin: '开机自启',
    loginOpt: { on: '开', off: '关' },
    energy: (n) => `精力 ${n}%`,
    restsCount: (n) => `${n} 次`,
    restsLabel: (s, k) => `歇息（短歇 ${s} · 小睡 ${k}）`,
    napSub: (m) => `完整 · ${m} 分钟`,
    napOpt: (m) => `${m} 分钟`,
    tier: { light: '轻量', strong: '加强' },
    state: { bright: '神采奕奕', steady: '常态', dimmed: '有点淡了', faded: '蔫了' },
  },
  en: {
    today: 'Today',
    screenTime: 'Screen time',
    napLength: 'Nap length',
    reminderStyle: 'Reminder style',
    restNow: 'Rest now',
    shortBreakSub: 'Short break · 20s',
    takeNap: 'Take a nap',
    quit: 'Quit EyeFlow',
    settings: 'Settings',
    language: 'Language',
    launchAtLogin: 'Launch at login',
    loginOpt: { on: 'On', off: 'Off' },
    energy: (n) => `Energy ${n}%`,
    restsCount: (n) => `${n}×`,
    restsLabel: (s, k) => `Rests (breaks ${s} · naps ${k})`,
    napSub: (m) => `Full · ${m} min`,
    napOpt: (m) => `${m} min`,
    tier: { light: 'Light', strong: 'Strong' },
    state: { bright: 'Bright', steady: 'Steady', dimmed: 'Dimmed', faded: 'Faded' },
  },
};

const LOCALES = Object.freeze(['zh', 'en']);
const DEFAULT_LOCALE = 'zh';

// language switch — each option shown in its own script, the same in both locales
const LANGUAGE_OPTIONS = Object.freeze([
  { locale: 'zh', label: '中文' },
  { locale: 'en', label: 'English' },
]);

function isLocale(x) {
  return LOCALES.includes(x);
}

/**
 * Map a system locale string (e.g. app.getLocale() → 'zh-CN' / 'en-US' / 'fr') to
 * one of our locales: Chinese systems → zh, everyone else (incl. unknown) → en.
 * Used only as the first-run default; a manual choice persists and always wins.
 * @param {*} sys
 * @returns {'zh'|'en'}
 */
function systemLocale(sys) {
  return typeof sys === 'string' && sys.toLowerCase().startsWith('zh') ? 'zh' : 'en';
}

function panelStrings(locale) {
  return STRINGS[isLocale(locale) ? locale : DEFAULT_LOCALE];
}

module.exports = { panelStrings, LOCALES, DEFAULT_LOCALE, LANGUAGE_OPTIONS, isLocale, systemLocale };
