'use strict';

/**
 * Persistence logic for the "today only" ledger (§7) — pure. Decides whether a
 * persisted record can be resumed (same day, well-formed) or should reset to a
 * fresh day. The actual file read/write is a thin impure adapter (records-store).
 */

const { emptyRecord } = require('./today');

function isValidRecord(raw) {
  return (
    !!raw &&
    typeof raw === 'object' &&
    typeof raw.dateKey === 'string' &&
    Number.isFinite(raw.eyeUseMs) &&
    Number.isFinite(raw.shortBreaks) &&
    Number.isFinite(raw.naps)
  );
}

/**
 * Resume the persisted record if it's valid and from today; otherwise start
 * fresh for today.
 * @param {string} dateKey today's local date key
 * @param {*} raw parsed persisted value (or null / garbage)
 * @returns {{dateKey:string, eyeUseMs:number, shortBreaks:number, naps:number}}
 */
function hydrate(dateKey, raw) {
  if (isValidRecord(raw) && raw.dateKey === dateKey) {
    return {
      dateKey,
      eyeUseMs: raw.eyeUseMs,
      shortBreaks: raw.shortBreaks,
      naps: raw.naps,
    };
  }
  return emptyRecord(dateKey);
}

module.exports = { hydrate, isValidRecord };
