/* Test Suite: Pure Catch-Up Logic (Detection, Sliding, Merging) (Part B) */

import assert from 'assert';

console.log('--- Testing Missed-Day Catch-Up Pure Functions (Part B) ---');

// Mock localStorage and window
const store = {};
globalThis.localStorage = {
  getItem: (k) => store[k] || null,
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; },
  clear: () => { Object.keys(store).forEach(k => delete store[k]); }
};
globalThis.window = {
  localStorage: globalThis.localStorage
};

const { DEFAULT_5DAY_ROUTINE } = await import('../js/data/splits.js');
const {
  detectMissedDay,
  planSlide,
  buildMergedSession
} = await import('../js/lib/catchup.js');
const { sessionSetCount } = await import('../js/lib/schedule.js');

const trainingDays = [1, 2, 4, 5, 6];
const prog = DEFAULT_5DAY_ROUTINE;

// Standard week: Mon 2026-11-02 to Sun 2026-11-08
// Mon 11-02: D1 Chest & Back A (10 sets)
// Tue 11-03: D2 Legs & Shoulders A (13 sets)
// Wed 11-04: REST
// Thu 11-05: D3 Arms (10 sets)
// Fri 11-06: D4 Chest & Back B (12 sets)
// Sat 11-07: D5 Legs & Shoulders B (13 sets)
// Sun 11-08: REST

// ==========================================
// 1. detectMissedDay Tests
// ==========================================
console.log('\n[1/5] Testing detectMissedDay...');

// Test 1a: No missed days when all past days completed
const res1a = detectMissedDay('2026-11-05', {
  prog, trainingDays,
  records: {
    '2026-11-02': { workoutDone: true },
    '2026-11-03': { workoutDone: true }
  }
});
assert.strictEqual(res1a.missed, false, 'Should have no missed days');

// Test 1b: Thu 11-05 detect missed Tue 11-03
const res1b = detectMissedDay('2026-11-05', {
  prog, trainingDays,
  records: {
    '2026-11-02': { workoutDone: true },
    '2026-11-03': { workoutDone: false, workout: {} }
  }
});
assert.strictEqual(res1b.missed, true, 'Should detect missed Tue');
assert.strictEqual(res1b.date, '2026-11-03', 'Missed date should be 2026-11-03');

// Test 1c: Wed 11-04 is rest, should NOT be marked missed
const res1c = detectMissedDay('2026-11-05', {
  prog, trainingDays,
  records: {
    '2026-11-02': { workoutDone: true },
    '2026-11-03': { workoutDone: true }
  }
});
assert.strictEqual(res1c.missed, false, 'Wednesday rest day must not be missed');

// Test 1d: Ignores future days and returns most recent first if multiple
const res1d = detectMissedDay('2026-11-06', { // Friday
  prog, trainingDays,
  records: {
    '2026-11-02': { workoutDone: true },
    '2026-11-03': { workoutDone: false }, // Missed Tue
    '2026-11-05': { workoutDone: false }  // Missed Thu
  }
});
assert.strictEqual(res1d.missed, true);
assert.strictEqual(res1d.date, '2026-11-05', 'Should return most recent missed day (Thu) first');
assert.strictEqual(res1d.allMissed.length, 2, 'Should track both missed days in allMissed');

// Test 1e: Monday today has no past days in week
const res1e = detectMissedDay('2026-11-02', { prog, trainingDays });
assert.strictEqual(res1e.missed, false, 'Monday has no past days');

console.log('✓ detectMissedDay tests passed.');

// ==========================================
// 2. planSlide Tests
// ==========================================
console.log('\n[2/5] Testing planSlide...');

// Test 2a: Absorb mid-week rest (Tue missed -> today Wed absorbs rest)
const slideWed = planSlide('2026-11-04', '2026-11-03', {
  prog, trainingDays, protectLastRestDay: true
});
assert.strictEqual(slideWed.valid, true, 'Slide should be valid absorbing Wed rest');
assert.strictEqual(slideWed.absorbedRestDate, '2026-11-04', 'Should absorb Wed rest');
assert.strictEqual(slideWed.assignments['2026-11-04'], 1, 'Wed should now have D2 (workoutIndex 1)');

// Test 2b: Fri today, missed Thu (D3) with Sunday rest protection ON
const slideFriProtected = planSlide('2026-11-06', '2026-11-05', {
  prog, trainingDays, protectLastRestDay: true
});
assert.strictEqual(slideFriProtected.valid, false, 'Should refuse slide when Sunday is protected');
assert(slideFriProtected.reason.includes('Sunday rest day is protected'), 'Reason should mention Sunday rest protection');

// Test 2c: Fri today, missed Thu (D3) with Sunday rest protection OFF (absorb Sunday rest)
const slideFriUnprotected = planSlide('2026-11-06', '2026-11-05', {
  prog, trainingDays, protectLastRestDay: false
});
assert.strictEqual(slideFriUnprotected.valid, true, 'Should allow absorbing Sunday rest when protectLastRestDay is false');
assert.strictEqual(slideFriUnprotected.assignments['2026-11-06'], 2, 'Fri becomes D3 Arms');
assert.strictEqual(slideFriUnprotected.assignments['2026-11-07'], 3, 'Sat becomes D4 Chest & Back B');
assert.strictEqual(slideFriUnprotected.assignments['2026-11-08'], 4, 'Sun absorbs D5 Legs & Shoulders B');

console.log('✓ planSlide tests passed.');

// ==========================================
// 3. buildMergedSession Tests (Caps & Rules)
// ==========================================
console.log('\n[3/5] Testing buildMergedSession caps and rules...');

const d4Plan = prog[3]; // D4 Chest & Back B (12 sets)
const d3Plan = prog[2]; // D3 Arms (10 sets)

const mergeRes = buildMergedSession(d4Plan, d3Plan, {}, {}, {
  maxSets: 20,
  maxMuscleSets: 10,
  setsPerAddedExercise: 2,
  maxAddedExercises: 2
});

assert(mergeRes.totalSets <= 20, `Total sets ${mergeRes.totalSets} must not exceed 20`);
assert(mergeRes.estimatedDuration <= 80, `Estimated duration ${mergeRes.estimatedDuration} must not exceed 80`);
assert.strictEqual(mergeRes.addedExercises.length, 2, 'Should add exactly 2 exercises');
assert(mergeRes.droppedExercises.length > 0, 'Dropped exercises should be populated');
assert(mergeRes.droppedReason.includes('Dropped'), 'Dropped reason string should be formatted');
assert(mergeRes.addedExercises.every(ex => ex.isCatchup && ex.source === 'catchup'), 'All added exercises tagged with catchup');

console.log('✓ buildMergedSession caps and rules passed.');

// ==========================================
// 4. Fixture Test 1: Miss Thu (D3 Arms) -> Fri (D4 Chest & Back B)
// ==========================================
console.log('\n[4/5] Fixture 1: Miss Thu (D3 Arms) into Fri (D4 Chest & Back B)...');

const fix1 = buildMergedSession(d4Plan, d3Plan, { biceps: 0, triceps: 2 }, { biceps: 10, triceps: 10 }, {
  maxSets: 20,
  setsPerAddedExercise: 2,
  maxAddedExercises: 2
});

console.log('Merged session total sets:', fix1.totalSets);
console.log('Added exercises:', fix1.addedExercises.map(e => `${e.name} (${e.sets} sets)`));
console.log('Dropped exercises reason:', fix1.droppedReason);

assert.strictEqual(fix1.totalSets, 16, 'Base 12 sets + 2 added exercises (2 sets each) = 16 sets');
// Both biceps and triceps should be added from D3 Arms
const addedIds1 = fix1.addedExercises.map(e => e.id);
assert(addedIds1.includes('overhead_triceps_ext') || addedIds1.includes('ez_bar_curl'), 'Should include key arm exercises');
assert(fix1.droppedReason.includes('Dropped'), 'Should show dropped exercises');

console.log('✓ Fixture 1 passed.');

// ==========================================
// 5. Fixture Test 2: Miss Fri (D4 Chest & Back B) -> Sat (D5 Legs & Shoulders B)
// ==========================================
console.log('\n[5/5] Fixture 2: Miss Fri (D4 Chest & Back B) into Sat (D5 Legs & Shoulders B)...');

const d5Plan = prog[4]; // D5 Legs & Shoulders B (13 sets)
const fix2 = buildMergedSession(d5Plan, d4Plan, { chest: 0, back: 0 }, { chest: 10, back: 10 }, {
  maxSets: 20,
  setsPerAddedExercise: 2,
  maxAddedExercises: 2
});

console.log('Merged session total sets:', fix2.totalSets);
console.log('Added exercises:', fix2.addedExercises.map(e => `${e.name} (${e.sets} sets)`));
console.log('Dropped exercises reason:', fix2.droppedReason);

assert(fix2.totalSets <= 20, 'Total sets must not exceed 20');
assert.strictEqual(fix2.totalSets, 17, 'Base 13 sets + 2 added exercises (2 sets each) = 17 sets');
const addedIds2 = fix2.addedExercises.map(e => e.id);
assert(addedIds2.includes('bench'), 'Should prioritize compound Flat Bench Press');
assert(addedIds2.includes('machine_row_b'), 'Should prioritize compound Machine Row');
assert(fix2.droppedReason.includes('Dropped'), 'Should state dropped exercises');

console.log('✓ Fixture 2 passed.');

console.log('\n=============================================');
console.log(' ALL CATCH-UP TESTS PASSED WITH 100%! ');
console.log('=============================================');
