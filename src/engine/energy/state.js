'use strict';

/**
 * Engine state shape + constructor (ENGINE_SPEC §A2/§A3).
 * The engine's single ledger (§9.2): energy plus the two arming flags.
 */

/**
 * @param {{energyStart:number}} params
 * @returns {{energy:number, l1Armed:boolean, l2Armed:boolean}}
 */
function initialState(params) {
  return {
    energy: params.energyStart,
    l1Armed: true,
    l2Armed: true,
  };
}

module.exports = { initialState };
