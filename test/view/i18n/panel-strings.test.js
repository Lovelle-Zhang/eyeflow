'use strict';

// §4 i18n helpers: locale validation + first-run system-language mapping.

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { isLocale, systemLocale, LOCALES } = require('../../../src/view/i18n/panel-strings');

test('isLocale accepts our locales, rejects the rest', () => {
  for (const l of LOCALES) assert.ok(isLocale(l));
  assert.ok(!isLocale('fr'));
  assert.ok(!isLocale(null));
  assert.ok(!isLocale(2));
});

test('systemLocale: Chinese systems → zh, everyone else (incl. unknown) → en', () => {
  assert.equal(systemLocale('zh-CN'), 'zh');
  assert.equal(systemLocale('zh-Hant-TW'), 'zh');
  assert.equal(systemLocale('ZH'), 'zh');
  assert.equal(systemLocale('en-US'), 'en');
  assert.equal(systemLocale('fr'), 'en');
  assert.equal(systemLocale(''), 'en');
  assert.equal(systemLocale(undefined), 'en');
});
