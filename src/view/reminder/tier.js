'use strict';

/**
 * Reminder presentation tier (CHARTER §6.1/§6.4) — pure constants.
 *
 * WHICH reminder level fires (一级/二级) is the system's call, from energy alone
 * (§5.2). HOW it's presented is this user-chosen tier, orthogonal to the level:
 *   - light  = 顶端岛 (small top capsule, click-through, self-tucks)
 *   - strong = 居中大胶囊 + 轻微暖背景 (centered, more prominent, still not a takeover)
 */

const REMINDER_TIERS = Object.freeze(['light', 'strong']);
const DEFAULT_REMINDER_TIER = 'light';

// labels for the panel's 2-seg control (§6.4)
const REMINDER_TIER_OPTIONS = Object.freeze([
  { tier: 'light', label: '轻量' },
  { tier: 'strong', label: '加强' },
]);

/**
 * @param {*} t
 * @returns {boolean} whether t is a known tier
 */
function isReminderTier(t) {
  return REMINDER_TIERS.includes(t);
}

module.exports = { REMINDER_TIERS, DEFAULT_REMINDER_TIER, REMINDER_TIER_OPTIONS, isReminderTier };
