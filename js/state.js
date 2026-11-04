/* App state: central single source of truth for profile, active tab, timers, and view keys */

export var profile = null;
export var tab = 'today';
export var charts = {};
export var workoutTimer = { interval: null };
export var restTimer = { interval: null, endAt: 0, remaining: 0 };
export var foodPanel = 'meals';
export var confirmLoggingAccurate = false;
export var activeGymDateKey = null;
export var activeExpandedExId = null;

export function getProfile() {
  return profile;
}

export function setProfile(p) {
  profile = p;
  if (typeof window !== 'undefined') window.profile = p;
}

export function getTab() {
  return tab;
}

export function setTab(t) {
  tab = t;
  if (typeof window !== 'undefined') window.tab = t;
}

export function getActiveGymDateKey() {
  return activeGymDateKey;
}

export function setActiveGymDateKey(k) {
  activeGymDateKey = k;
  if (typeof window !== 'undefined') window.activeGymDateKey = k;
}

export function getActiveExpandedExId() {
  return activeExpandedExId;
}

export function setActiveExpandedExId(id) {
  activeExpandedExId = id;
  if (typeof window !== 'undefined') window.activeExpandedExId = id;
}

if (typeof window !== 'undefined') {
  window.profile = profile;
  window.tab = tab;
  window.charts = charts;
  window.workoutTimer = workoutTimer;
  window.restTimer = restTimer;
  window.foodPanel = foodPanel;
}

