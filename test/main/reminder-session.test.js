'use strict';

// The reminder-session choreography extracted from the controller (§9.1 budget).
// We test the deterministic, timer-free surface: the 'reminder:show' payload it
// builds, prompt rotation, and the earned/reset/stop contract the controller
// relies on. Timer-driven completion (20s countdown → tuck) is left to manual
// verification — it depends on real hrtime and cannot be faked cleanly here.

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { createReminderSession } = require('../../src/main/reminder-session');
const { reminderCopy } = require('../../src/view/reminder/copy');

function harness() {
  const sent = [];
  const interactive = [];
  const session = createReminderSession({
    send: (channel, payload) => sent.push({ channel, payload }),
    presenter: { setInteractive: (v) => interactive.push(v) },
    getEnergy: () => 66,
    idleSec: () => 0,
    getLocale: () => 'zh',
    tuck: () => {},
  });
  return { session, sent, interactive, show: () => sent.find((s) => s.channel === 'reminder:show') };
}

test('short session shows the localized short-break prompt, not interactive', () => {
  const h = harness();
  h.session.run('short', 66);
  const p = h.show().payload;
  assert.equal(p.kind, 'short');
  assert.equal(p.text, reminderCopy('zh').short[0]);
  assert.equal(p.durationSec, 20);
  assert.deepEqual(h.interactive, []); // short break never makes the overlay clickable
  h.session.stop(); // clear the countdown interval so it can't dangle
});

test('nap session shows the nap prompt + button and is interactive', () => {
  const h = harness();
  h.session.run('nap', 66);
  const p = h.show().payload;
  assert.equal(p.kind, 'nap');
  assert.equal(p.text, reminderCopy('zh').nap[0]);
  assert.equal(p.napLabel, reminderCopy('zh').napButton);
  assert.deepEqual(h.interactive, [true]); // the "小睡" suggestion is clickable
  h.session.stop(); // clear the dwell timeout
});

test('prompts rotate across sessions of the same kind', () => {
  const h = harness();
  const copy = reminderCopy('zh');
  h.session.run('short', 66);
  h.session.stop();
  h.session.run('short', 66);
  h.session.stop();
  const shows = h.sent.filter((s) => s.channel === 'reminder:show');
  assert.equal(shows[0].payload.text, copy.short[0]);
  assert.equal(shows[1].payload.text, copy.short[1 % copy.short.length]);
});

test('earned starts false; reset keeps it false; stop is safe with no timer', () => {
  const h = harness();
  assert.equal(h.session.earned, false);
  h.session.reset();
  assert.equal(h.session.earned, false);
  assert.doesNotThrow(() => h.session.stop());
});
