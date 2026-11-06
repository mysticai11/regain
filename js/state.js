/* App state: central single source of truth for profile, active tab, timers, day records, and reactive subscriptions */

import { ls, sv, dayRecord, saveDayRecord, workoutSessionStore, WORKOUT_SESSIONS_KEY } from "./storage.js";
import { todayKey } from "./lib/format.js";

export var profile = null;
export var tab = 'today';
export var charts = {};
export var workoutTimer = { interval: null, startedAt: null, pausedAt: null, accumulatedPausedMs: 0, activeDayKey: null };
export var restTimer = { interval: null, endAt: 0, remaining: 0 };
export var foodPanel = 'meals';
export var confirmLoggingAccurate = false;
export var activeGymDateKey = null;
export var activeTodaySelectedDateKey = null;
export var activeExpandedExId = null;
export var scrollByTab = { today: 0, progress: 0, gym: 0 };
export var activeProgressSubTab = 'body';

var subscribers = new Set();
var isPendingNotification = false;

export function getState() {
  var curDateKey = todayKey();
  var gymDate = activeGymDateKey || curDateKey;
  var todayDate = activeTodaySelectedDateKey || curDateKey;
  return {
    profile: profile,
    tab: tab,
    activeGymDateKey: gymDate,
    activeTodaySelectedDateKey: todayDate,
    activeExpandedExId: activeExpandedExId,
    workoutTimer: workoutTimer,
    restTimer: restTimer,
    foodPanel: foodPanel,
    todayRecord: dayRecord(curDateKey),
    activeGymRecord: dayRecord(gymDate),
    activeTodayRecord: dayRecord(todayDate),
    workoutSessions: workoutSessionStore(),
    meals: ls('rg_meals', null),
    recentFoods: ls('rg_recent_foods', [])
  };
}

export function subscribe(fn) {
  if (typeof fn === 'function') {
    subscribers.add(fn);
    return function unsubscribe() {
      subscribers.delete(fn);
    };
  }
  return function() {};
}

export function notifySubscribers() {
  var currentState = getState();
  subscribers.forEach(function(fn) {
    try {
      fn(currentState);
    } catch(err) {
      console.error('State subscriber notification error:', err);
    }
  });
}

export function scheduleNotification() {
  if (isPendingNotification) return;
  isPendingNotification = true;
  var run = function() {
    isPendingNotification = false;
    notifySubscribers();
  };
  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(run);
  } else if (typeof Promise === 'function') {
    Promise.resolve().then(run);
  } else {
    setTimeout(run, 0);
  }
}

export function setState(patch) {
  if (!patch || typeof patch !== 'object') return getState();

  if (patch.profile !== undefined) {
    setProfile(patch.profile);
    sv('rg_profile', profile);
  }

  if (patch.tab !== undefined) {
    tab = patch.tab;
    if (typeof window !== 'undefined') window.tab = tab;
  }

  if (patch.activeGymDateKey !== undefined) {
    activeGymDateKey = patch.activeGymDateKey;
    if (typeof window !== 'undefined') window.activeGymDateKey = activeGymDateKey;
  }

  if (patch.activeTodaySelectedDateKey !== undefined) {
    activeTodaySelectedDateKey = patch.activeTodaySelectedDateKey;
    if (typeof window !== 'undefined') window.activeTodaySelectedDateKey = activeTodaySelectedDateKey;
  }

  if (patch.activeExpandedExId !== undefined) {
    activeExpandedExId = patch.activeExpandedExId;
    if (typeof window !== 'undefined') window.activeExpandedExId = activeExpandedExId;
  }

  if (patch.dayKey && patch.dayRecord) {
    saveDayRecord(patch.dayKey, patch.dayRecord);
  }

  if (patch.days && typeof patch.days === 'object') {
    Object.keys(patch.days).forEach(function(k) {
      if (patch.days[k]) saveDayRecord(k, patch.days[k]);
    });
  }

  if (patch.workoutSessions !== undefined) {
    sv(WORKOUT_SESSIONS_KEY, patch.workoutSessions);
  }

  if (patch.recentFoods !== undefined) {
    sv('rg_recent_foods', patch.recentFoods);
  }

  if (patch.meals !== undefined) {
    sv('rg_meals', patch.meals);
  }

  if (patch.workoutTimer !== undefined) {
    Object.assign(workoutTimer, patch.workoutTimer);
  }

  if (patch.restTimer !== undefined) {
    Object.assign(restTimer, patch.restTimer);
  }

  scheduleNotification();
  return getState();
}

export function preserveUiStateDuringRender(renderFn) {
  if (typeof renderFn !== 'function') return;
  var activeElementId = (typeof document !== 'undefined' && document.activeElement) ? document.activeElement.id : null;
  var selectionStart = null;
  var selectionEnd = null;
  if (document.activeElement && 'selectionStart' in document.activeElement) {
    try {
      selectionStart = document.activeElement.selectionStart;
      selectionEnd = document.activeElement.selectionEnd;
    } catch(e) {}
  }
  var content = typeof document !== 'undefined' ? document.getElementById('content') : null;
  var scrollY = (typeof window !== 'undefined' && (window.scrollY || window.pageYOffset || (document.documentElement ? document.documentElement.scrollTop : 0) || (document.body ? document.body.scrollTop : 0))) || (content ? content.scrollTop : 0);
  var hasOpenOverlay = (typeof document !== 'undefined') ? !!document.querySelector('.overlay') : false;

  if (tab === 'gym') snapshotGymDrafts();

  renderFn();

  if (scrollY != null && scrollY > 0) {
    if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') window.scrollTo(0, scrollY);
    if (content) content.scrollTop = scrollY;
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(function() {
        if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') window.scrollTo(0, scrollY);
      });
    }
  }
  if (activeElementId && !hasOpenOverlay && typeof document !== 'undefined') {
    var el = document.getElementById(activeElementId);
    if (el) {
      el.focus();
      if (selectionStart != null && selectionEnd != null && el.setSelectionRange) {
        try { el.setSelectionRange(selectionStart, selectionEnd); } catch(e) {}
      }
    }
  }
}

export function snapshotGymDrafts() {
  if (typeof document === 'undefined') return;
  var key = activeGymDateKey || (typeof window !== 'undefined' && window.activeGymDateKey) || todayKey();
  var rec = dayRecord(key);
  var dirty = false;
  document.querySelectorAll('.set-row-precision').forEach(function(row) {
    var exId = row.dataset.exId;
    var sIdx = parseInt(row.dataset.setIndex, 10);
    if (!exId || isNaN(sIdx)) return;
    var wInput = row.querySelector('.set-weight');
    var rInput = row.querySelector('.set-reps');
    var rirSelect = row.querySelector('.set-rir');
    if (wInput || rInput) {
      rec.workoutDraft = rec.workoutDraft || {};
      rec.workoutDraft[exId] = rec.workoutDraft[exId] || [];
      var wVal = wInput ? (wInput.value.trim() === '' ? '' : parseFloat(wInput.value) || 0) : '';
      var rVal = rInput ? (rInput.value.trim() === '' ? '' : parseInt(rInput.value, 10) || '') : '';
      var rirVal = rirSelect ? (rirSelect.value === '' ? null : parseInt(rirSelect.value, 10)) : null;
      if (wVal !== '' || rVal !== '') {
        rec.workoutDraft[exId][sIdx] = { weight: wVal, reps: rVal, rir: rirVal };
        dirty = true;
      }
    }
  });
  if (dirty) saveDayRecord(key, rec);
}

export function getProfile() {
  return profile;
}

export function setProfile(p) {
  if (p && Array.isArray(p.customStaples)) {
    var seenStaple = {};
    p.customStaples = p.customStaples.filter(function(s) {
      var sid = (s.id || '') + '::' + (s.name || '');
      if (seenStaple[sid]) return false;
      seenStaple[sid] = true;
      return true;
    });
  }
  profile = p;
  if (typeof window !== 'undefined') window.profile = p;
}

export function getTab() {
  return tab;
}

export function setTab(t) {
  var content = typeof document !== 'undefined' ? document.getElementById('content') : null;
  if (content && tab) {
    scrollByTab[tab] = content.scrollTop;
  }
  if (tab === 'gym') {
    snapshotGymDrafts();
  }
  tab = t;
  if (typeof window !== 'undefined') {
    window.tab = t;
    window.scrollByTab = scrollByTab;
  }
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
  window.getState = getState;
  window.setState = setState;
  window.subscribe = subscribe;
  window.scheduleStateNotification = scheduleNotification;

  if (typeof window.addEventListener === 'function') {
    window.addEventListener('storage', function(e) {
      if (e.key && e.key.indexOf('rg_') === 0) {
        if (e.key === 'rg_profile') {
          profile = ls('rg_profile', profile);
          if (typeof window !== 'undefined') window.profile = profile;
        }
        scheduleNotification();
      }
    });
  }
}
