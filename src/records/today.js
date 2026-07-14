'use strict';

/**
 * "Today only" ledger (CHARTER §7, first piece — option 甲). A pure reducer that
 * accumulates active eye-use time and counts rests for the current day, and
 * resets when the day changes. No week/month, no analysis (§2). One ledger (§9.2).
 *
 * The impure layer (energy-service) supplies dtMs, an active flag, the day key,
 * and rest events; it owns persistence/day-clock.
 */

/** @param {string} dateKey local date, e.g. "2026-07-14" */
function emptyRecord(dateKey) {
  return { dateKey, eyeUseMs: 0, shortBreaks: 0, naps: 0 };
}

/**
 * Advance the ledger for one tick. Resets first if the day rolled over.
 * @param {object} rec
 * @param {{ dtMs:number, active:boolean, dateKey:string }} input
 */
function recordTick(rec, { dtMs, active, dateKey }) {
  const base = rec.dateKey === dateKey ? rec : emptyRecord(dateKey);
  if (!active || !(dtMs > 0)) return base;
  return { ...base, eyeUseMs: base.eyeUseMs + dtMs };
}

/** Count a completed rest. @param {'short'|'nap'} kind */
function recordRest(rec, kind) {
  return kind === 'nap'
    ? { ...rec, naps: rec.naps + 1 }
    : { ...rec, shortBreaks: rec.shortBreaks + 1 };
}

/**
 * Format eye-use ms for the panel. Drops the hour when under an hour.
 * @returns {{ h:number, m:number, text:string }}
 */
function formatEyeUse(ms) {
  const totalMin = Math.floor(Math.max(0, ms) / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return { h, m, text: h > 0 ? `${h}h ${m}m` : `${m}m` };
}

module.exports = { emptyRecord, recordTick, recordRest, formatEyeUse };
