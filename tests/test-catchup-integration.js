/* Test Suite: End-to-End Catch-Up Integration Simulation (Part B) */

import assert from 'assert';

console.log('--- Testing Catch-Up End-to-End Integration Flow ---');

// Mock localStorage and window
const store = {};
globalThis.localStorage = {
  getItem: (k) => store[k] || null,
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; },
  clear: () => { Object.keys(store).forEach(k => delete store[k]); }
};
globalThis.window = {
  localStorage: globalThis.localStorage,
  activeGymDateKey: null
};

const { DEFAULT_5DAY_ROUTINE } = await import('../js/data/splits.js');
const { scheduledSessionFor, sessionSetCount } = await import('../js/lib/schedule.js');
const { detectMissedDay, buildMergedSession, planSlide } = await import('../js/lib/catchup.js');
const {
  getWeekOverrides,
  saveWeekOverrides,
  getCatchupDecisions,
  setCatchupDecision,
  getCatchupSettings,
  checkWeekRollover
} = await import('../js/storage-catchup.js');
const { dayRecord, saveDayRecord, sv, ls, allDayKeys } = await import('../js/storage.js');
const { getLoggedWeeklyVolume } = await import('../js/lib/calc.js');

// 1. Setup profile and standard schedule
const trainingDays = [1, 2, 4, 5, 6];
const prog = DEFAULT_5DAY_ROUTINE;

// Simulate dates in week:
// Mon 2026-11-02: D1 Chest & Back A (Completed)
// Tue 2026-11-03: D2 Legs & Shoulders A (Completed)
// Wed 2026-11-04: REST
// Thu 2026-11-05: D3 Arms (MISSED!)
// Fri 2026-11-06: D4 Chest & Back B (Today)

console.log('\n[1/4] Simulating completed Mon & Tue, missed Thu...');
checkWeekRollover('2026-11-06'); // Initializes active week to 2026-11-02
saveDayRecord('2026-11-02', { workoutDone: true, workout: { bench: [{ weight: 80, reps: 8 }] } });
saveDayRecord('2026-11-03', { workoutDone: true, workout: { squat: [{ weight: 100, reps: 8 }] } });
saveDayRecord('2026-11-04', { workoutDone: false }); // Wed rest
saveDayRecord('2026-11-05', { workoutDone: false, workout: {} }); // Thu Arms missed

// 2. Open app on Friday 2026-11-06 -> Detect Missed Day
console.log('\n[2/4] Opening app on Friday 2026-11-06: Detecting missed Thu...');
const records = {
  '2026-11-02': dayRecord('2026-11-02'),
  '2026-11-03': dayRecord('2026-11-03'),
  '2026-11-04': dayRecord('2026-11-04'),
  '2026-11-05': dayRecord('2026-11-05')
};

const detection = detectMissedDay('2026-11-06', {
  prog,
  trainingDays,
  weekOverrides: getWeekOverrides(),
  decisions: getCatchupDecisions(),
  records
});

assert.strictEqual(detection.missed, true, 'Must detect missed day');
assert.strictEqual(detection.date, '2026-11-05', 'Must detect Thursday as missed');
assert.strictEqual(detection.workoutIndex, 2, 'Thursday must be Day 3 Arms (index 2)');
console.log(`✓ Detected missed workout: ${detection.label} on ${detection.date}`);

// 3. User accepts "Merge into today" on Friday
console.log('\n[3/4] User accepts "Merge into today" on Friday...');
const friSched = scheduledSessionFor('2026-11-06', { prog, trainingDays });
const missedSched = scheduledSessionFor('2026-11-05', { prog, trainingDays });

const mergeRes = buildMergedSession(friSched.session, missedSched.session, {}, {}, {
  maxSets: 20,
  setsPerAddedExercise: 2
});

assert(mergeRes.totalSets <= 20, 'Merged session must respect 20 sets cap');
assert(mergeRes.addedExercises.length >= 1, 'Must add key exercises from Arms');

// Commit merge to weekOverrides and day record
const currentOverrides = getWeekOverrides();
currentOverrides['2026-11-06'] = mergeRes.mergedSession;
saveWeekOverrides(currentOverrides);
setCatchupDecision('2026-11-05', 'merged');

const friRec = dayRecord('2026-11-06');
friRec.isMerged = true;
saveDayRecord('2026-11-06', friRec);

// Verify scheduledSessionFor on Friday now returns the merged session
const resolvedFri = scheduledSessionFor('2026-11-06', {
  prog,
  trainingDays,
  weekOverrides: getWeekOverrides()
});

assert.strictEqual(resolvedFri.source, 'override', 'Friday session must come from override');
assert.strictEqual(resolvedFri.session.isMerged, true, 'Resolved session must be flagged as merged');
assert.ok(sessionSetCount(resolvedFri.session) >= 14 && sessionSetCount(resolvedFri.session) <= 20, 'Resolved session must respect limits (14-20 sets)');
assert.ok(resolvedFri.session.exercises.length <= 7, 'Resolved session must not exceed 7 exercises');
console.log('✓ Friday schedule successfully resolved to merged workout snapshot.');

// 4. User completes the merged workout on Friday in Gym
console.log('\n[4/4] User logs sets and completes Friday merged workout...');
const loggedWorkout = {};
resolvedFri.session.exercises.forEach(ex => {
  loggedWorkout[ex.id] = Array.from({ length: ex.sets || 2 }, (_, i) => ({
    weight: 50,
    reps: 10,
    rir: 1
  }));
});

friRec.workout = loggedWorkout;
friRec.workoutDone = true;
saveDayRecord('2026-11-06', friRec);

// Verify detection now finds no more missed days (Thu was merged and decided)
const reDetection = detectMissedDay('2026-11-06', {
  prog,
  trainingDays,
  weekOverrides: getWeekOverrides(),
  decisions: getCatchupDecisions(),
  records: {
    '2026-11-02': dayRecord('2026-11-02'),
    '2026-11-03': dayRecord('2026-11-03'),
    '2026-11-04': dayRecord('2026-11-04'),
    '2026-11-05': dayRecord('2026-11-05')
  }
});
assert.strictEqual(reDetection.missed, false, 'No missed day should be detected after decision');

// Verify weekly rollover on next Monday resets overrides
console.log('\nVerifying Monday rollover...');
const rolloverResult = checkWeekRollover('2026-11-09'); // Next Monday
assert.strictEqual(rolloverResult.rolledOver, true, 'Next Monday must trigger rollover');
const overridesAfterMonday = getWeekOverrides();
assert.deepStrictEqual(overridesAfterMonday, {}, 'Overrides must be reset to empty on Monday');

console.log('✓ Rollover successfully cleared week overrides.');

console.log('\n=============================================');
console.log(' ALL INTEGRATION SIMULATION TESTS PASSED (100%) ');
console.log('=============================================');
