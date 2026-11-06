/* Persistence and rollover management for weekly schedule overrides and catch-up decisions */

import { ls, sv } from "./storage.js";
import { todayKey } from "./lib/format.js";
import { getWeekDays } from "./lib/schedule.js";

export var WEEK_OVERRIDES_KEY = 'rg_week_overrides';
export var CATCHUP_DECISIONS_KEY = 'rg_catchup_decisions';
export var CATCHUP_SETTINGS_KEY = 'rg_catchup_settings';
export var ACTIVE_WEEK_KEY = 'rg_active_week_key';

export var DEFAULT_CATCHUP_SETTINGS = {
  autoOffer: true,
  protectLastRestDay: true,
  maxSets: 20,
  setsPerExercise: 2
};

export function getWeekOverrides() {
  return ls(WEEK_OVERRIDES_KEY, {});
}

export function saveWeekOverrides(overrides) {
  return sv(WEEK_OVERRIDES_KEY, overrides || {});
}

export function setWeekOverride(dateStr, val) {
  var overrides = getWeekOverrides();
  if (val === undefined) {
    delete overrides[dateStr];
  } else {
    overrides[dateStr] = val;
  }
  return saveWeekOverrides(overrides);
}

export function clearWeekOverrides() {
  return saveWeekOverrides({});
}

export function getCatchupDecisions() {
  return ls(CATCHUP_DECISIONS_KEY, {});
}

export function setCatchupDecision(dateStr, decision) {
  var decisions = getCatchupDecisions();
  decisions[dateStr] = decision;
  return sv(CATCHUP_DECISIONS_KEY, decisions);
}

export function getCatchupSettings() {
  var saved = ls(CATCHUP_SETTINGS_KEY, null);
  if (!saved || typeof saved !== 'object') {
    return Object.assign({}, DEFAULT_CATCHUP_SETTINGS);
  }
  return {
    autoOffer: saved.autoOffer !== undefined ? Boolean(saved.autoOffer) : DEFAULT_CATCHUP_SETTINGS.autoOffer,
    protectLastRestDay: saved.protectLastRestDay !== undefined ? Boolean(saved.protectLastRestDay) : DEFAULT_CATCHUP_SETTINGS.protectLastRestDay,
    maxSets: saved.maxSets != null ? Number(saved.maxSets) : DEFAULT_CATCHUP_SETTINGS.maxSets,
    setsPerExercise: saved.setsPerExercise != null ? Number(saved.setsPerExercise) : DEFAULT_CATCHUP_SETTINGS.setsPerExercise
  };
}

export function saveCatchupSettings(newSettings) {
  var current = getCatchupSettings();
  var updated = Object.assign({}, current, newSettings || {});
  return sv(CATCHUP_SETTINGS_KEY, updated);
}

/**
 * Handles weekly rollover at Monday 00:00:00.
 * Automatically clears previous week's overrides and starts fresh for the new week.
 */
export function checkWeekRollover(todayInput) {
  var tKey = todayInput ? (typeof todayInput === 'string' ? todayInput.slice(0, 10) : todayKey()) : todayKey();
  var currentWeekDays = getWeekDays(tKey);
  var currentMonKey = currentWeekDays[0];

  var lastMonKey = ls(ACTIVE_WEEK_KEY, null);

  if (!lastMonKey) {
    // First run initialization
    sv(ACTIVE_WEEK_KEY, currentMonKey);
    return { rolledOver: false, currentWeek: currentMonKey };
  }

  if (lastMonKey !== currentMonKey) {
    // Monday rollover occurred: clear previous week overrides
    clearWeekOverrides();
    sv(ACTIVE_WEEK_KEY, currentMonKey);
    return {
      rolledOver: true,
      previousWeek: lastMonKey,
      currentWeek: currentMonKey
    };
  }

  return { rolledOver: false, currentWeek: currentMonKey };
}
