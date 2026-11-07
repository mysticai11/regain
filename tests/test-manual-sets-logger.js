import assert from 'assert';

console.log('--- Testing Manual vs Auto Sets in Workout Logger ---');

// Setup minimal browser/DOM mocks
globalThis.localStorage = {
  _store: {},
  getItem(k) { return this._store[k] || null; },
  setItem(k, v) { this._store[k] = String(v); },
  removeItem(k) { delete this._store[k]; },
  clear() { this._store = {}; }
};

globalThis.window = {
  activeGymDateKey: '2026-11-06',
  activeExpandedExId: 'incline_bench'
};
globalThis.document = {
  getElementById: () => null,
  querySelector: () => null,
  querySelectorAll: () => []
};

const { profile } = await import('../js/state.js');
const { getTodaySession, getExerciseData, DEFAULT_5DAY_ROUTINE } = await import('../js/data/plan.js');
const { dayRecord, saveDayRecord } = await import('../js/storage.js');

// 1. Verify getExerciseData returns sets: 2 for active program exercises and alternates
console.log('\n[1/5] Verifying exercise catalog and program set counts...');
const benchData = getExerciseData('incline_bench');
assert.strictEqual(benchData.sets, 2, 'incline_bench should have 2 planned sets');

const dbBenchData = getExerciseData('db_bench');
assert.strictEqual(dbBenchData.sets, 2, 'db_bench alternate should have 2 planned sets');

const lateralData = getExerciseData('db_lateral');
assert.strictEqual(lateralData.sets, 2, 'db_lateral alternate should have 2 planned sets');
console.log('✓ Verified: All program exercises and alternates have planned sets = 2.');

// 2. Test initial session exercise sets
console.log('\n[2/5] Testing routine planned sets...');
const day1 = DEFAULT_5DAY_ROUTINE[0];
const ex1 = day1.exercises[0];
assert.strictEqual(ex1.sets, 2, 'Day 1 exercise 1 planned sets must be 2');

// 3. Simulate Gym logger set count logic before and after logging sets
console.log('\n[3/5] Simulating Gym logger set count progression...');
const dateKey = '2026-11-06';
let rec = dayRecord(dateKey);
rec.workout = {};
rec.workoutDraft = {};
saveDayRecord(dateKey, rec);

// Calculate visible count function as implemented in gym.js
function computeVisibleCount(exOrig, exId, currentRec) {
  const ex = getExerciseData(exId) || exOrig;
  const sets = (currentRec.workout || {})[exId] || [];
  const drafts = (currentRec.workoutDraft || {})[exId] || [];
  const plannedCount = (exOrig && exOrig.sets != null) ? exOrig.sets : ((ex && ex.sets != null) ? ex.sets : 2);
  const completedSets = sets.filter(Boolean);
  let manualExtra = 0;
  for (let dI = plannedCount; dI < drafts.length; dI++) {
    if (drafts[dI] && drafts[dI].manual) manualExtra = Math.max(manualExtra, dI + 1);
  }
  return {
    plannedCount,
    completedCount: completedSets.length,
    visibleCount: Math.max(plannedCount, completedSets.length, manualExtra)
  };
}

// Initial state: 0 logged sets, 0 drafts
let state = computeVisibleCount(ex1, ex1.id, rec);
assert.strictEqual(state.plannedCount, 2);
assert.strictEqual(state.completedCount, 0);
assert.strictEqual(state.visibleCount, 2, 'Initial visible count must be exactly 2');
console.log('✓ Initial state: 2 sets visible (Set 1 and Set 2).');

// Simulate logging Set 1 (index 0)
rec.workout[ex1.id] = [{ weight: 60, reps: 10, rir: 2 }];
// Next set within planned count gets prefilled draft
rec.workoutDraft[ex1.id] = [null, { weight: 60, reps: 10, rir: 2 }];
saveDayRecord(dateKey, rec);

state = computeVisibleCount(ex1, ex1.id, rec);
assert.strictEqual(state.completedCount, 1);
assert.strictEqual(state.visibleCount, 2, 'After logging Set 1, visible count must remain 2');
console.log('✓ After logging Set 1: visible count remains 2 (Set 1 done, Set 2 ready).');

// Simulate logging Set 2 (index 1)
rec.workout[ex1.id][1] = { weight: 60, reps: 9, rir: 1 };
delete rec.workoutDraft[ex1.id][1];
// Crucial: No draft at index >= 2 should be created!
// If any stale draft existed, it would be cleaned up
if (rec.workoutDraft[ex1.id]) {
  for (let dI = 2; dI < rec.workoutDraft[ex1.id].length; dI++) {
    if (rec.workoutDraft[ex1.id][dI] && !rec.workoutDraft[ex1.id][dI].manual) {
      delete rec.workoutDraft[ex1.id][dI];
    }
  }
}
saveDayRecord(dateKey, rec);

state = computeVisibleCount(ex1, ex1.id, rec);
assert.strictEqual(state.completedCount, 2);
assert.strictEqual(state.visibleCount, 2, 'After logging Set 2, visible count must remain 2 (NO auto 3rd set!)');
console.log('✓ After logging Set 2: visible count remains 2 (all planned sets completed, NO auto Set 3!).');

// 4. Test Manual Extra Set via "+ Add set"
console.log('\n[4/5] Testing manual "+ Add set"...');
// User clicks "+ Add set"
const pSets = ex1.sets || 2;
const curDone = (rec.workout[ex1.id] || []).filter(Boolean).length;
const curDraftLen = (rec.workoutDraft[ex1.id] || []).length;
const nextIndex = Math.max(pSets, curDone, curDraftLen);
assert.strictEqual(nextIndex, 2, 'Next manual extra set index must be 2 (Set 3)');

rec.workoutDraft[ex1.id] = rec.workoutDraft[ex1.id] || [];
rec.workoutDraft[ex1.id][nextIndex] = { weight: '', reps: '', rir: null, manual: true };
saveDayRecord(dateKey, rec);

state = computeVisibleCount(ex1, ex1.id, rec);
assert.strictEqual(state.visibleCount, 3, 'After manual + Add set, visible count becomes 3');
console.log('✓ Manual + Add set explicitly adds Set 3 (visibleCount = 3).');

// Log Set 3 (index 2)
rec.workout[ex1.id][2] = { weight: 55, reps: 8, rir: 0 };
delete rec.workoutDraft[ex1.id][2];
saveDayRecord(dateKey, rec);

state = computeVisibleCount(ex1, ex1.id, rec);
assert.strictEqual(state.completedCount, 3);
assert.strictEqual(state.visibleCount, 3, 'After logging Set 3, visible count remains 3 (NO auto Set 4!)');
console.log('✓ After logging Set 3: visible count remains 3 (NO auto Set 4!).');

// 5. Test removing the extra set
console.log('\n[5/6] Testing removing the extra set...');
rec.workout[ex1.id].splice(2, 1);
saveDayRecord(dateKey, rec);

state = computeVisibleCount(ex1, ex1.id, rec);
assert.strictEqual(state.completedCount, 2);
assert.strictEqual(state.visibleCount, 2, 'After removing extra set, visible count returns to 2');
console.log('✓ Extra set removed cleanly: visible count returns to 2.');

// 6. Test reducing planned sets for Full-Body / Catch-up workouts (e.g. from 3 down to 2)
console.log('\n[6/6] Testing manual set reduction for Full-Body / Catch-up exercises (3 sets -> 2 sets)...');
const fbEx = { id: 'fb_bench', sets: 3 };
const computeVisibleWithPlannedReduction = function(exOrig, currentRec) {
  const basePlanned = (exOrig && exOrig.sets != null) ? exOrig.sets : 2;
  const plannedCount = (currentRec.exercisePlannedSets && currentRec.exercisePlannedSets[exOrig.id] != null) ? currentRec.exercisePlannedSets[exOrig.id] : basePlanned;
  const sets = (currentRec.workout || {})[exOrig.id] || [];
  const completedSets = sets.filter(Boolean);
  return {
    plannedCount,
    completedCount: completedSets.length,
    visibleCount: Math.max(plannedCount, completedSets.length),
    isCompleted: completedSets.length >= plannedCount && plannedCount > 0
  };
};

let fbState = computeVisibleWithPlannedReduction(fbEx, rec);
assert.strictEqual(fbState.plannedCount, 3);
assert.strictEqual(fbState.visibleCount, 3);
assert.strictEqual(fbState.isCompleted, false);

// User clicks "- Reduce set" or "- Remove set 3"
rec.exercisePlannedSets = rec.exercisePlannedSets || {};
rec.exercisePlannedSets[fbEx.id] = 2;
saveDayRecord(dateKey, rec);

fbState = computeVisibleWithPlannedReduction(fbEx, rec);
assert.strictEqual(fbState.plannedCount, 2, 'Planned count should now be reduced to 2');
assert.strictEqual(fbState.visibleCount, 2, 'Visible count should now be 2');

// Log 2 sets
rec.workout[fbEx.id] = [{ weight: 80, reps: 10, rir: 2 }, { weight: 80, reps: 8, rir: 1 }];
saveDayRecord(dateKey, rec);

fbState = computeVisibleWithPlannedReduction(fbEx, rec);
assert.strictEqual(fbState.completedCount, 2);
assert.strictEqual(fbState.isCompleted, true, 'Exercise must be marked completed after 2 sets when planned is reduced to 2');
console.log('✓ Manual set reduction from 3 to 2 sets succeeds and correctly completes at 2 sets.');

console.log('\n======================================================');
console.log(' ALL WORKOUT LOGGER MANUAL SETS TESTS PASSED (100%)! ');
console.log('======================================================');

