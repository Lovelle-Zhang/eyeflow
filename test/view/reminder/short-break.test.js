'use strict';

// RED-first: the 20s short-break countdown is pure math (CHARTER §6.1/§6.3).
// The window + animation are impure shells around this; this is what we test.

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { shortBreakFrame, SHORT_BREAK_MS } = require('../../../src/view/reminder/short-break');
const { SHORT_BREAK_PROMPTS, NAP_SUGGEST_PROMPTS } = require('../../../src/view/reminder/copy');

test('default duration is 20 seconds (§6.3, fixed, not user-tunable)', () => {
  assert.equal(SHORT_BREAK_MS, 20000);
});

test('at start: full 20s, progress line full, not done', () => {
  const f = shortBreakFrame(0);
  assert.equal(f.remainingSec, 20);
  assert.equal(f.remainingFraction, 1);
  assert.equal(f.elapsedFraction, 0);
  assert.equal(f.done, false);
});

test('at halfway: 10s left, line half (shrinks with countdown, §8.4)', () => {
  const f = shortBreakFrame(10000);
  assert.equal(f.remainingSec, 10);
  assert.equal(f.remainingFraction, 0.5);
  assert.equal(f.done, false);
});

test('remaining seconds ceil so the last whole second still shows', () => {
  assert.equal(shortBreakFrame(19999).remainingSec, 1);
});

test('at full duration: 0s, line empty, done', () => {
  const f = shortBreakFrame(20000);
  assert.equal(f.remainingSec, 0);
  assert.equal(f.remainingFraction, 0);
  assert.equal(f.done, true);
});

test('past the end clamps (no negative, stays done)', () => {
  const f = shortBreakFrame(31000);
  assert.equal(f.remainingSec, 0);
  assert.equal(f.remainingFraction, 0);
  assert.equal(f.done, true);
});

test('honors a custom duration', () => {
  const f = shortBreakFrame(30000, 60000);
  assert.equal(f.remainingSec, 30);
  assert.equal(f.remainingFraction, 0.5);
});

test('both short-break and nap prompts comply with MIRA_LANGUAGE (§三 禁用词)', () => {
  const banned = /detected|score|warning|失败|效率|达标|监测|完成度|症状|诊断|介入|触发|会话|超时|分心|专注度/i;
  assert.ok(SHORT_BREAK_PROMPTS.length >= 1);
  assert.ok(NAP_SUGGEST_PROMPTS.length >= 1);
  for (const line of [...SHORT_BREAK_PROMPTS, ...NAP_SUGGEST_PROMPTS]) {
    assert.ok(line.trim().length > 0, 'non-empty');
    assert.doesNotMatch(line, banned, `banned word in: ${line}`);
  }
});
