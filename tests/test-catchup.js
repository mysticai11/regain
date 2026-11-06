/* Comprehensive Test Suite: Catch-Up Engine & Schedule Engine (Part B) */
import assert from 'assert';

console.log('--- Testing Missed-Day Catch-Up Pure Functions & Schedules (Part B) ---');

// Mock localStorage and window
const store = {};
globalThis.localStorage = {
  getItem: (k) => store[k] || null,
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; },
  clear: () => { Object.keys(store).forEach(k => delete store[k]); }
};
globalThis.window = { localStorage: globalThis.localStorage };

const { DEFAULT_5DAY_ROUTINE } = await import('../js/data/splits.js');
const {
  detectMissedDay,
  planSlide,
  planSpreadAcrossWeek,
  validateSessionLimits,
  buildMergedSession,
  FULL_BODY_THRESHOLD
} = await import('../js/lib/catchup.js');
const { scheduledSessionFor, sessionSetCount, getWeekDays } = await import('../js/lib/schedule.js');
const { checkWeekRollover, setWeekOverride, clearWeekOverrides, getWeekOverrides } = await import('../js/storage-catchup.js');

const trainingDays = [1, 2, 4, 5, 6]; // Mon, Tue, Thu, Fri, Sat
const prog = DEFAULT_5DAY_ROUTINE;

// Standard test week: Mon 2026-11-02 to Sun 2026-11-08
// Mon 11-02: D1 Chest & Back A (10 sets)
// Tue 11-03: D2 Legs & Shoulders A (13 sets)
// Wed 11-04: REST
// Thu 11-05: D3 Arms (10 sets)
// Fri 11-06: D4 Chest & Back B (12 sets)
// Sat 11-07: D5 Legs & Shoulders B (13 sets)
// Sun 11-08: REST

// ── B6.1: Miss Mon only on Tue ───────────────────────────────────────────
console.log('\n[1/12] Scenario 1: Miss Mon only on Tue (spread across week)...');
const resScen1 = planSpreadAcrossWeek('2026-11-03', {
  prog, trainingDays,
  records: {
    '2026-11-02': { workoutDone: false, workout: {} }
  }
});
assert.strictEqual(resScen1.valid, true, 'Spread plan should be valid');
assert.strictEqual(resScen1.mode, 'spread', '1 missed day must use spread mode, not full-body');
assert.ok(resScen1.totalRedistributedSets <= resScen1.totalMissedSets, 'Redistributed sets must not exceed missed sets');
assert.ok(resScen1.preview.length > 0, 'Preview lines must be generated');
console.log('✓ Scenario 1 passed: Mon volume spread across remaining days (Tue, Thu, Fri, Sat).');

// ── B6.2: Miss Mon only on Thu ───────────────────────────────────────────
console.log('\n[2/12] Scenario 2: Miss Mon only on Thu (spread across Thu, Fri, Sat)...');
const resScen2 = planSpreadAcrossWeek('2026-11-05', {
  prog, trainingDays,
  records: {
    '2026-11-02': { workoutDone: false, workout: {} },
    '2026-11-03': { workoutDone: true }
  }
});
assert.strictEqual(resScen2.valid, true);
assert.strictEqual(resScen2.mode, 'spread', '1 missed day on Thu still uses spread mode');
assert.ok(resScen2.remainingDays.length === 3, 'Remaining training days on Thu should be 3 (Thu, Fri, Sat)');
console.log('✓ Scenario 2 passed: Missed Mon spread over Thu, Fri, Sat.');

// ── B6.3: Miss Mon+Tue on Thu (3 days left -> full-body mode) ─────────────
console.log('\n[3/12] Scenario 3: Miss Mon+Tue on Thu (3 days left -> Full-Body Mode)...');
const resScen3 = planSpreadAcrossWeek('2026-11-05', {
  prog, trainingDays,
  records: {
    '2026-11-02': { workoutDone: false },
    '2026-11-03': { workoutDone: false }
  }
});
assert.strictEqual(resScen3.valid, true);
assert.strictEqual(resScen3.mode, 'full_body', '2 missed days with 3 training days remaining must switch to full_body mode');
assert.strictEqual(resScen3.isFullBody, true, 'isFullBody flag must be true');
assert.strictEqual(resScen3.selectedDays.length, 2, 'Full-body mode must select exactly 2 sessions');
assert.strictEqual(resScen3.selectedDays[0], '2026-11-05', 'First session on Thu');
assert.strictEqual(resScen3.selectedDays[1], '2026-11-07', 'Second session on Sat (1 day gap)');
assert.strictEqual(resScen3.assignments['2026-11-06'], 'rest', 'Fri between them becomes rest');
console.log('✓ Scenario 3 passed: 2 missed days on Thu switches to 2 Full-Body sessions (Thu & Sat).');

// ── B6.4: Miss Mon+Tue on Wed (3 days left -> full-body mode) ─────────────
console.log('\n[4/12] Scenario 4: Miss Mon+Tue on Wed (3 days left -> Full-Body Mode)...');
const resScen4 = planSpreadAcrossWeek('2026-11-04', {
  prog, trainingDays,
  records: {
    '2026-11-02': { workoutDone: false },
    '2026-11-03': { workoutDone: false }
  }
});
assert.strictEqual(resScen4.valid, true);
assert.strictEqual(resScen4.mode, 'full_body', 'Wed with 2 missed days and Thu, Fri, Sat remaining must switch to full_body');
assert.strictEqual(resScen4.selectedDays[0], '2026-11-05');
assert.strictEqual(resScen4.selectedDays[1], '2026-11-07');
console.log('✓ Scenario 4 passed: Wed detection switches Thu-Sat to Full-Body Mode.');

// ── B6.5: Miss Thu+Fri on Sat (1 day left) ────────────────────────────────
console.log('\n[5/12] Scenario 5: Miss Thu+Fri on Sat (1 day left -> 1 Full-Body session)...');
const resScen5 = planSpreadAcrossWeek('2026-11-07', {
  prog, trainingDays,
  records: {
    '2026-11-02': { workoutDone: true },
    '2026-11-03': { workoutDone: true },
    '2026-11-05': { workoutDone: false },
    '2026-11-06': { workoutDone: false }
  }
});
assert.strictEqual(resScen5.valid, true);
assert.strictEqual(resScen5.mode, 'full_body');
assert.strictEqual(resScen5.selectedDays.length, 1, 'When only 1 day remains, schedule exactly 1 full-body session');
assert.strictEqual(resScen5.selectedDays[0], '2026-11-07');
console.log('✓ Scenario 5 passed: Only 1 day remaining produces 1 Full-Body session.');

// ── B6.6: Miss 3 days (Mon, Tue, Thu) on Fri (2 days left) ────────────────
console.log('\n[6/12] Scenario 6: Miss 3 days on Fri (2 days left -> 2 Full-Body sessions)...');
const resScen6 = planSpreadAcrossWeek('2026-11-06', {
  prog, trainingDays,
  records: {
    '2026-11-02': { workoutDone: false },
    '2026-11-03': { workoutDone: false },
    '2026-11-05': { workoutDone: false }
  }
});
assert.strictEqual(resScen6.valid, true);
assert.strictEqual(resScen6.mode, 'full_body');
assert.strictEqual(resScen6.selectedDays.length, 2, '2 days remaining (Fri, Sat) produces 2 Full-Body sessions');
console.log('✓ Scenario 6 passed: 3 missed days with 2 days left produces 2 Full-Body sessions.');

// ── B6.7: Sunday protected rest day ───────────────────────────────────────
console.log('\n[7/12] Scenario 7: Sunday protected rest day...');
const sundayKey = '2026-11-08';
assert.strictEqual(new Date(sundayKey + 'T00:00:00').getDay(), 0, 'Should be Sunday');
// Verify planSpreadAcrossWeek never schedules work on Sunday when protectLastRestDay is true
const resSun = planSpreadAcrossWeek('2026-11-06', {
  prog, trainingDays, protectLastRestDay: true,
  records: { '2026-11-05': { workoutDone: false } }
});
assert.strictEqual(resSun.assignments[sundayKey], undefined, 'Sunday must never have work scheduled when protected');
console.log('✓ Scenario 7 passed: Sunday protected as rest day.');

// ── B6.8: Week rollover clears overrides ──────────────────────────────────
console.log('\n[8/12] Scenario 8: Week rollover resets overrides on Monday...');
const { sv } = await import('../js/storage.js');
const { ACTIVE_WEEK_KEY } = await import('../js/storage-catchup.js');
sv(ACTIVE_WEEK_KEY, '2026-11-02'); // Previous week Monday
setWeekOverride('2026-11-06', { label: 'Test Merged', exercises: [] });
assert.ok(getWeekOverrides()['2026-11-06'], 'Override saved');
// Rollover to next Monday: 2026-11-09
const rollRes = checkWeekRollover('2026-11-09');
assert.strictEqual(rollRes.rolledOver, true, 'Monday must trigger rollover');
assert.strictEqual(Object.keys(getWeekOverrides()).length, 0, 'Overrides must be cleared on Monday rollover');
console.log('✓ Scenario 8 passed: Monday rollover clears week overrides.');

// ── B6.9: Override then reset to suggested ────────────────────────────────
console.log('\n[9/12] Scenario 9: Override then reset to suggested schedule...');
const testDate = '2026-11-06'; // Friday = D4 Chest & Back B
setWeekOverride(testDate, 0); // Override to D1
const ovRes = scheduledSessionFor(testDate, { prog, trainingDays });
assert.strictEqual(ovRes.workoutIndex, 0, 'Should return overridden workout');
clearWeekOverrides();
const resetRes = scheduledSessionFor(testDate, { prog, trainingDays });
assert.strictEqual(resetRes.workoutIndex, 3, 'Reset must return standard Friday D4 session');
console.log('✓ Scenario 9 passed: Clearing overrides reverts to canonical schedule.');

// ── B6.10: Hard session limits (validateSessionLimits) ─────────────────────
console.log('\n[10/12] Scenario 10: Hard session limits enforcement...');
const oversizeSession = {
  exercises: [
    { id: 'e1', name: 'Compound 1', type: 'compound', sets: 4 },
    { id: 'e2', name: 'Compound 2', type: 'compound', sets: 4 },
    { id: 'e3', name: 'Compound 3', type: 'compound', sets: 4 },
    { id: 'e4', name: 'Compound 4', type: 'compound', sets: 4 },
    { id: 'e5', name: 'Compound 5', type: 'compound', sets: 3 },
    { id: 'e6', name: 'Iso 1', type: 'isolation', sets: 3 },
    { id: 'e7', name: 'Iso 2', type: 'isolation', sets: 3 },
    { id: 'e8', name: 'Iso 3', type: 'isolation', sets: 3 }, // 8th exercise!
    { id: 'e9', name: 'Iso 4', type: 'isolation', sets: 3 }  // 9th exercise!
  ]
};
const valRes = validateSessionLimits(oversizeSession, { maxExercises: 7, maxSets: 20 });
assert.ok(valRes.session.exercises.length <= 7, `Exercise count (${valRes.session.exercises.length}) must be <= 7`);
assert.ok(valRes.totalSets <= 20, `Total sets (${valRes.totalSets}) must be <= 20`);
assert.ok(valRes.dropped.length >= 2, 'At least 2 lowest-priority exercises must be dropped');
console.log('✓ Scenario 10 passed: Hard limits strictly enforced (<=7 exercises, <=20 sets).');

// ── B6.11: Sum of redistributed sets <= missed sets ───────────────────────
console.log('\n[11/12] Scenario 11: Sum of redistributed sets never exceeds missed sets...');
const resScen11 = planSpreadAcrossWeek('2026-11-03', {
  prog, trainingDays,
  records: { '2026-11-02': { workoutDone: false } }
});
assert.ok(resScen11.totalRedistributedSets <= resScen11.totalMissedSets,
  `Redistributed (${resScen11.totalRedistributedSets}) must be <= missed (${resScen11.totalMissedSets})`);
console.log('✓ Scenario 11 passed: Redistributed sets <= missed sets.');

// ── B6.12: Determinism (identical input gives identical output) ───────────
console.log('\n[12/12] Scenario 12: Determinism check...');
const runA = JSON.stringify(planSpreadAcrossWeek('2026-11-03', { prog, trainingDays, records: { '2026-11-02': { workoutDone: false } } }));
const runB = JSON.stringify(planSpreadAcrossWeek('2026-11-03', { prog, trainingDays, records: { '2026-11-02': { workoutDone: false } } }));
assert.strictEqual(runA, runB, 'Identical input must produce strictly identical plan');
console.log('✓ Scenario 12 passed: Schedule resolution is 100% deterministic.');

console.log('\n================================================================');
console.log(' ALL 12 PART B CATCH-UP & SCHEDULE TESTS PASSED WITH 100%! ');
console.log('================================================================\n');
