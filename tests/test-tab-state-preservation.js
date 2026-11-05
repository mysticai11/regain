/* Test Suite: Tab State Preservation (Item 5) */

import assert from 'assert';

console.log('--- Testing Tab State Preservation ---');

const store = {};
global.localStorage = {
  get length() { return Object.keys(store).length; },
  key: (i) => Object.keys(store)[i] || null,
  getItem: (k) => store[k] || null,
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; },
  clear: () => { Object.keys(store).forEach(k => delete store[k]); }
};

let contentScrollTop = 0;
global.document = {
  getElementById: (id) => {
    if (id === 'content') {
      return {
        get scrollTop() { return contentScrollTop; },
        set scrollTop(v) { contentScrollTop = v; },
        innerHTML: '',
        classList: { remove: () => {}, add: () => {} }
      };
    }
    return null;
  },
  querySelectorAll: () => []
};

global.window = {
  localStorage: global.localStorage,
  tab: 'today',
  scrollByTab: { today: 0, progress: 0, gym: 0 }
};

const {
  tab, setTab, scrollByTab, workoutTimer, restTimer,
  getActiveExpandedExId, setActiveExpandedExId
} = await import('../js/state.js');

const { sv, ls, dayRecord, saveDayRecord } = await import('../js/storage.js');

// 1. Test scrollByTab preservation
setTab('today');
contentScrollTop = 250;
setTab('gym');
assert.strictEqual(scrollByTab.today, 250, 'Recorded scroll position for Today tab before switch');

contentScrollTop = 500;
setTab('progress');
assert.strictEqual(scrollByTab.gym, 500, 'Recorded scroll position for Gym tab before switch');

// 2. Test activeExpandedExId preservation
setActiveExpandedExId('lat_pulldown');
setTab('today');
setTab('gym');
assert.strictEqual(getActiveExpandedExId(), 'lat_pulldown', 'Accordion expanded state preserved across tab switches');

// 3. Test Timer state preserved across tab switch
workoutTimer.startedAt = Date.now() - 60000;
workoutTimer.activeDayKey = '2026-11-05';
let timerTicks = 0;
workoutTimer.interval = setInterval(() => { timerTicks++; }, 100);

setTab('today');
setTab('progress');
setTab('gym');

assert.ok(workoutTimer.interval !== null, 'Workout timer interval is NOT cleared on tab switches');
assert.strictEqual(workoutTimer.activeDayKey, '2026-11-05', 'Workout timer activeDayKey intact');
clearInterval(workoutTimer.interval);
workoutTimer.interval = null;

// 4. Test Logger draft inputs preservation
const testKey = '2026-11-05';
const draftDay = {
  workoutDraft: {
    bench_press: [{ weight: 82.5, reps: 6, rir: 1 }]
  }
};
saveDayRecord(testKey, draftDay);

const readDraft = dayRecord(testKey);
assert.strictEqual(readDraft.workoutDraft.bench_press[0].weight, 82.5, 'Unsaved weight preserved');
assert.strictEqual(readDraft.workoutDraft.bench_press[0].reps, 6, 'Unsaved reps preserved');

console.log('✓ All Tab State Preservation tests passed successfully!');
