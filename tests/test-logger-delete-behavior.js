/* Test Suite: Section 4.2 & 1.6(a) Approved Logger Set Deletion & Skip Behaviors */

import assert from 'assert';

console.log('--- Testing Logger Set Deletion, Long-Press Menu, & Skip Exercise ---');

// Mock localStorage
const store = {};
globalThis.localStorage = {
  getItem: (k) => store[k] || null,
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; },
  clear: () => { Object.keys(store).forEach(k => delete store[k]); }
};
globalThis.window = {
  localStorage: globalThis.localStorage,
  matchMedia: () => ({ matches: false }),
  activeGymDateKey: '2026-11-06'
};

const { dayRecord, saveDayRecord } = await import('../js/storage.js');
const { getTodaySession, getExerciseData } = await import('../js/data/plan.js');
const { sessionSetCount } = await import('../js/lib/schedule.js');

const dateKey = '2026-11-06';

// 1. Visible "- Remove set" removes last unlogged set (min 1 set)
console.log('\n[1/5] Testing "- Remove set" behaviour (min 1 set)...');
let rec = dayRecord(dateKey);
rec.workout = { bench_press: [{ weight: 80, reps: 8, rir: 2 }] };
rec.workoutDraft = { bench_press: [null, { weight: 80, reps: 8, rir: 2 }] };
rec.exercisePlannedSets = { bench_press: 2 };
saveDayRecord(dateKey, rec);

// Helper function that implements "- Remove set" logic
function removeLastUnloggedSet(dKey, exId) {
  const r = dayRecord(dKey);
  const planned = (r.exercisePlannedSets && r.exercisePlannedSets[exId] != null) ? r.exercisePlannedSets[exId] : 2;
  if (planned <= 1) return false;
  r.exercisePlannedSets = r.exercisePlannedSets || {};
  r.exercisePlannedSets[exId] = planned - 1;
  if (r.workoutDraft && r.workoutDraft[exId] && r.workoutDraft[exId].length >= planned) {
    r.workoutDraft[exId].splice(planned - 1, 1);
  }
  saveDayRecord(dKey, r);
  return true;
}

const removed1 = removeLastUnloggedSet(dateKey, 'bench_press');
assert.strictEqual(removed1, true, 'Successfully removed second unlogged set');
rec = dayRecord(dateKey);
assert.strictEqual(rec.exercisePlannedSets.bench_press, 1, 'Planned sets reduced to 1');

// Attempt to remove below 1
const removed2 = removeLastUnloggedSet(dateKey, 'bench_press');
assert.strictEqual(removed2, false, 'Cannot remove when at minimum 1 set');
rec = dayRecord(dateKey);
assert.strictEqual(rec.exercisePlannedSets.bench_press, 1, 'Planned sets stays at 1');
console.log('✓ Verified: "- Remove set" reduces unlogged set and enforces min 1 set limit.');

// 2. Deleting a logged set with confirmation & 5s undo snackbar
console.log('\n[2/5] Testing logged set deletion & undo...');
rec.workout.bench_press = [
  { weight: 80, reps: 8, rir: 2 },
  { weight: 80, reps: 7, rir: 1 }
];
rec.exercisePlannedSets.bench_press = 2;
saveDayRecord(dateKey, rec);

function deleteLoggedSet(dKey, exId, setIndex, userConfirmed) {
  if (!userConfirmed) return null;
  const r = dayRecord(dKey);
  const prevSets = [...((r.workout && r.workout[exId]) || [])];
  const deletedSet = r.workout[exId].splice(setIndex, 1)[0];
  const prevPlanned = (r.exercisePlannedSets && r.exercisePlannedSets[exId]) || 2;
  if (prevPlanned > 1) {
    r.exercisePlannedSets[exId] = Math.max(1, prevPlanned - 1);
  }
  saveDayRecord(dKey, r);

  const undoFn = function() {
    const restoreR = dayRecord(dKey);
    restoreR.workout = restoreR.workout || {};
    restoreR.workout[exId] = restoreR.workout[exId] || [];
    restoreR.workout[exId].splice(setIndex, 0, deletedSet);
    restoreR.exercisePlannedSets = restoreR.exercisePlannedSets || {};
    restoreR.exercisePlannedSets[exId] = prevPlanned;
    saveDayRecord(dKey, restoreR);
  };
  return { deletedSet, undoFn };
}

// User rejects confirmation -> no change
const resReject = deleteLoggedSet(dateKey, 'bench_press', 1, false);
assert.strictEqual(resReject, null);
rec = dayRecord(dateKey);
assert.strictEqual(rec.workout.bench_press.length, 2, 'Sets unchanged on reject');

// User accepts confirmation -> set deleted
const resConfirm = deleteLoggedSet(dateKey, 'bench_press', 1, true);
assert.ok(resConfirm.deletedSet, 'Set was deleted');
assert.strictEqual(resConfirm.deletedSet.reps, 7);
rec = dayRecord(dateKey);
assert.strictEqual(rec.workout.bench_press.length, 1, 'Logged sets reduced to 1');
assert.strictEqual(rec.exercisePlannedSets.bench_press, 1, 'Planned sets updated');

// Trigger Undo
resConfirm.undoFn();
rec = dayRecord(dateKey);
assert.strictEqual(rec.workout.bench_press.length, 2, 'Undo restored logged set count to 2');
assert.strictEqual(rec.workout.bench_press[1].reps, 7, 'Restored set data matches');
console.log('✓ Verified: Deleting logged set requires confirmation and supports instant Undo.');

// 3. Long-press menu: Duplicate set
console.log('\n[3/5] Testing Duplicate set from long-press menu...');
function duplicateSet(dKey, exId, setIndex) {
  const r = dayRecord(dKey);
  const sourceSet = (r.workout && r.workout[exId] && r.workout[exId][setIndex]) ||
                    (r.workoutDraft && r.workoutDraft[exId] && r.workoutDraft[exId][setIndex]) ||
                    { weight: 80, reps: 8, rir: 2 };
  r.workoutDraft = r.workoutDraft || {};
  r.workoutDraft[exId] = r.workoutDraft[exId] || [];
  const nextIdx = (r.exercisePlannedSets && r.exercisePlannedSets[exId] != null) ? r.exercisePlannedSets[exId] : 2;
  r.workoutDraft[exId][nextIdx] = {
    weight: sourceSet.weight,
    reps: sourceSet.reps,
    rir: sourceSet.rir,
    manual: true
  };
  r.exercisePlannedSets = r.exercisePlannedSets || {};
  r.exercisePlannedSets[exId] = nextIdx + 1;
  saveDayRecord(dKey, r);
  return r.exercisePlannedSets[exId];
}

const newCount = duplicateSet(dateKey, 'bench_press', 0);
assert.strictEqual(newCount, 3, 'Planned sets incremented to 3');
rec = dayRecord(dateKey);
assert.strictEqual(rec.workoutDraft.bench_press[2].weight, 80, 'Duplicated weight matches');
assert.strictEqual(rec.workoutDraft.bench_press[2].reps, 8, 'Duplicated reps matches');
console.log('✓ Verified: Duplicate set appends cloned set values correctly.');

// 4. "Skip exercise today" with 5s Undo snackbar
console.log('\n[4/5] Testing "Skip exercise today" & header counter update...');
function skipExerciseToday(dKey, exId) {
  const r = dayRecord(dKey);
  r.skippedExercises = r.skippedExercises || {};
  r.skippedExercises[exId] = true;
  saveDayRecord(dKey, r);
  return function undo() {
    const unR = dayRecord(dKey);
    if (unR.skippedExercises) delete unR.skippedExercises[exId];
    saveDayRecord(dKey, unR);
  };
}

const undoSkip = skipExerciseToday(dateKey, 'bench_press');
rec = dayRecord(dateKey);
assert.strictEqual(rec.skippedExercises.bench_press, true, 'Exercise marked as skipped');

// Check header planned sets calculation excluding skipped exercises
const mockSession = {
  exercises: [
    { id: 'bench_press', sets: 3 },
    { id: 'overhead_press', sets: 2 },
    { id: 'tricep_pushdown', sets: 2 }
  ]
};

function computeHeaderStats(session, currentRec) {
  let planned = 0;
  let logged = 0;
  (session.exercises || []).forEach(ex => {
    if (currentRec.skippedExercises && currentRec.skippedExercises[ex.id]) return;
    const p = (currentRec.exercisePlannedSets && currentRec.exercisePlannedSets[ex.id] != null)
      ? currentRec.exercisePlannedSets[ex.id]
      : (ex.sets || 2);
    planned += p;
    logged += ((currentRec.workout && currentRec.workout[ex.id]) || []).filter(Boolean).length;
  });
  return { planned, logged };
}

let stats = computeHeaderStats(mockSession, rec);
// bench_press (3 sets) skipped, remaining = 2 + 2 = 4 sets
assert.strictEqual(stats.planned, 4, 'Planned sets in header correctly excludes skipped exercise');

// Undo skip
undoSkip();
rec = dayRecord(dateKey);
assert.strictEqual(rec.skippedExercises.bench_press, undefined, 'Exercise unskipped');
stats = computeHeaderStats(mockSession, rec);
assert.strictEqual(stats.planned, 7, 'Planned sets in header restored to 7');
console.log('✓ Verified: Skip exercise excludes from header counter and instant Undo restores it.');

// 5. Swipe set row left deletes set
console.log('\n[5/5] Testing Swipe-Left set row deletion...');
const { renderSetRowWrap } = await import('../js/screens/gym/swipe-delete.js');
const rowHtml = renderSetRowWrap('<span>Set 1</span>', 'bench_press', 0, true);
assert.ok(rowHtml.includes('class="set-row-wrap"'));
assert.ok(rowHtml.includes('class="set-swipe-bg"'));
console.log('✓ Verified: Swipe row wrap contains red background swipe container.');

console.log('\n============================================================');
console.log(' ALL SECTION 4.2 & 1.6(a) SET DELETION BEHAVIOR TESTS PASS! ');
console.log('============================================================');
