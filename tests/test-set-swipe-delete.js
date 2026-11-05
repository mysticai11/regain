/* Test Suite: Swipe-Left to Delete a Set (Item 2) */

import assert from 'assert';

console.log('--- Testing Swipe-Left to Delete a Set ---');

const store = {};
global.localStorage = {
  get length() { return Object.keys(store).length; },
  key: (i) => Object.keys(store)[i] || null,
  getItem: (k) => store[k] || null,
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; },
  clear: () => { Object.keys(store).forEach(k => delete store[k]); }
};
global.window = {
  localStorage: global.localStorage,
  matchMedia: () => ({ matches: false })
};

const { renderSetRowWrap } = await import('../js/screens/gym/swipe-delete.js');
const { sv, ls, dayRecord, saveDayRecord } = await import('../js/storage.js');

// 1. Verify renderSetRowWrap markup
const html = renderSetRowWrap('<span class="content">Set 1</span>', 'bench_press', 0, false);
assert.ok(html.includes('class="set-row-wrap"'), 'Contains set-row-wrap');
assert.ok(html.includes('class="set-swipe-bg"'), 'Contains set-swipe-bg red container');
assert.ok(html.includes('set-trash-icon'), 'Contains set-trash-icon SVG');
assert.ok(html.includes('class="set-row set-row-precision'), 'Contains set-row with touch-action:pan-y');
assert.ok(html.includes('touch-action:pan-y'), 'touch-action pan-y set on row');

// 2. Test Only-Set Reset Behavior vs Multi-Set Delete Behavior
const key = '2026-11-05';
const initialDay = {
  workout: {
    bench_press: [
      { weight: 80, reps: 8, rir: 1 },
      { weight: 80, reps: 7, rir: 0 }
    ],
    bicep_curl: [
      { weight: 15, reps: 12, rir: 1 }
    ]
  },
  workoutDraft: {
    bench_press: [
      { weight: 80, reps: 8, rir: 1 },
      { weight: 80, reps: 7, rir: 0 }
    ],
    bicep_curl: [
      { weight: 15, reps: 12, rir: 1 }
    ]
  }
};
saveDayRecord(key, initialDay);

// Simulate deleting set index 1 of bench_press (total 2 sets -> should delete)
let rec = dayRecord(key);
let removedDraft = rec.workoutDraft.bench_press.splice(1, 1)[0];
let removedSet = rec.workout.bench_press.splice(1, 1)[0];
saveDayRecord(key, rec);

let updatedRec = dayRecord(key);
assert.strictEqual(updatedRec.workout.bench_press.length, 1, 'Bench press sets reduced to 1');
assert.strictEqual(updatedRec.workout.bench_press[0].reps, 8, 'Remaining set is index 0');

// Test Undo restore
let restoreRec = dayRecord(key);
restoreRec.workout.bench_press.splice(1, 0, removedSet);
restoreRec.workoutDraft.bench_press.splice(1, 0, removedDraft);
saveDayRecord(key, restoreRec);
let restoredRec = dayRecord(key);
assert.strictEqual(restoredRec.workout.bench_press.length, 2, 'Undo restored set count to 2');
assert.strictEqual(restoredRec.workout.bench_press[1].reps, 7, 'Restored set values matched');

// Simulate swipe on bicep_curl (total 1 set -> should reset to empty instead of delete)
let singleExRec = dayRecord(key);
delete singleExRec.workout.bicep_curl;
singleExRec.workoutDraft.bicep_curl = [{ weight: '', reps: '', rir: null }];
saveDayRecord(key, singleExRec);

let resetRec = dayRecord(key);
assert.strictEqual(resetRec.workout.bicep_curl, undefined, 'Logged set cleared on only set');
assert.strictEqual(resetRec.workoutDraft.bicep_curl.length, 1, 'Draft preserved with 1 empty set');
assert.strictEqual(resetRec.workoutDraft.bicep_curl[0].weight, '', 'Draft weight empty');

console.log('✓ All Swipe-Left to Delete tests passed successfully!');
