/* Test Suite: Pure Schedule Functions & Weekday Mapping (Part A) */

import assert from 'assert';

console.log('--- Testing Schedule, Numbering, and Set Counts (Part A) ---');

// Mock storage
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
  scheduledSessionFor,
  sessionSetCount,
  canonicalSessionLabel,
  canonicalSessionName,
  validateTrainingDays,
  getWeekDays,
  isTrainingDay
} = await import('../js/lib/schedule.js');

// 1. Verify Day Numbering & Canonical Labels
console.log('\n[1/4] Verifying Day Numbering & Labels...');
assert.strictEqual(DEFAULT_5DAY_ROUTINE.length, 5, 'Split must have 5 days');
assert.strictEqual(DEFAULT_5DAY_ROUTINE[0].label, 'Day 1 — Chest & Back A');
assert.strictEqual(DEFAULT_5DAY_ROUTINE[1].label, 'Day 2 — Legs & Shoulders A');
assert.strictEqual(DEFAULT_5DAY_ROUTINE[2].label, 'Day 3 — Arms');
assert.strictEqual(DEFAULT_5DAY_ROUTINE[3].label, 'Day 4 — Chest & Back B');
assert.strictEqual(DEFAULT_5DAY_ROUTINE[4].label, 'Day 5 — Legs & Shoulders B');
console.log('✓ Verified: Split sessions are numbered 1..5 in exact order.');

// 2. Verify sessionSetCount for all sessions
console.log('\n[2/4] Verifying sessionSetCount for each workout...');
const expectedSets = [10, 13, 10, 12, 13];
DEFAULT_5DAY_ROUTINE.forEach((sess, idx) => {
  const sets = sessionSetCount(sess);
  assert.strictEqual(sets, expectedSets[idx], `${sess.label} must have ${expectedSets[idx]} sets (got ${sets})`);
});
console.log('✓ Verified: sessionSetCount matches ground truth (10, 13, 10, 12, 13 sets).');

// 3. Verify scheduledSessionFor for every weekday in standard week (Mon 2026-11-02 to Sun 2026-11-08)
console.log('\n[3/4] Verifying scheduledSessionFor for every weekday (Mon-Sun)...');
const weekdaysTest = [
  { date: '2026-11-02', day: 'Mon', isRest: false, workoutIdx: 0, label: 'Day 1 — Chest & Back A', sets: 10 },
  { date: '2026-11-03', day: 'Tue', isRest: false, workoutIdx: 1, label: 'Day 2 — Legs & Shoulders A', sets: 13 },
  { date: '2026-11-04', day: 'Wed', isRest: true,  workoutIdx: null, label: 'Rest Day', sets: 0 },
  { date: '2026-11-05', day: 'Thu', isRest: false, workoutIdx: 2, label: 'Day 3 — Arms', sets: 10 },
  { date: '2026-11-06', day: 'Fri', isRest: false, workoutIdx: 3, label: 'Day 4 — Chest & Back B', sets: 12 },
  { date: '2026-11-07', day: 'Sat', isRest: false, workoutIdx: 4, label: 'Day 5 — Legs & Shoulders B', sets: 13 },
  { date: '2026-11-08', day: 'Sun', isRest: true,  workoutIdx: null, label: 'Rest Day', sets: 0 }
];

const standardOpts = {
  trainingDays: [1, 2, 4, 5, 6],
  prog: DEFAULT_5DAY_ROUTINE,
  weekOverrides: {}
};

weekdaysTest.forEach(t => {
  const res = scheduledSessionFor(t.date, standardOpts);
  assert.strictEqual(res.isRest, t.isRest, `${t.day} (${t.date}) isRest expected ${t.isRest}`);
  assert.strictEqual(res.workoutIndex, t.workoutIdx, `${t.day} workoutIndex expected ${t.workoutIdx}`);
  if (!t.isRest) {
    assert.strictEqual(res.label, t.label, `${t.day} label expected ${t.label}`);
    assert.strictEqual(sessionSetCount(res.session), t.sets, `${t.day} set count expected ${t.sets}`);
  }
});
console.log('✓ Verified: scheduledSessionFor accurately maps Mon=D1, Tue=D2, Wed=Rest, Thu=D3, Fri=D4, Sat=D5, Sun=Rest.');

// 4. Verify Schedule Validation & Overrides
console.log('\n[4/4] Verifying Validation Warning & Overrides...');
// When training days is [4, 6] (2 days) vs 5 sessions
const mismatchVal = validateTrainingDays(DEFAULT_5DAY_ROUTINE, [4, 6]);
assert.strictEqual(mismatchVal.valid, false, 'Should be invalid when 5 sessions vs 2 training days');
assert.strictEqual(mismatchVal.message, '5 sessions, 2 training days');

// When training days is [1, 2, 4, 5, 6] (5 days) vs 5 sessions
const matchVal = validateTrainingDays(DEFAULT_5DAY_ROUTINE, [1, 2, 4, 5, 6]);
assert.strictEqual(matchVal.valid, true, 'Should be valid when training days equals session count');

// Test Week Override takes precedence
const overrideOpts = {
  trainingDays: [1, 2, 4, 5, 6],
  prog: DEFAULT_5DAY_ROUTINE,
  weekOverrides: {
    '2026-11-04': 1, // Wed (normal rest) overridden to D2
    '2026-11-05': 'rest' // Thu (normal training) overridden to rest
  }
};

const wedOverridden = scheduledSessionFor('2026-11-04', overrideOpts);
assert.strictEqual(wedOverridden.isRest, false, 'Wed should be workout under override');
assert.strictEqual(wedOverridden.workoutIndex, 1, 'Wed workoutIndex should be 1 (D2)');
assert.strictEqual(wedOverridden.source, 'override');

const thuOverridden = scheduledSessionFor('2026-11-05', overrideOpts);
assert.strictEqual(thuOverridden.isRest, true, 'Thu should be rest under override');
assert.strictEqual(thuOverridden.source, 'override');

console.log('✓ Verified: Validation catches mismatches and weekOverrides are strictly respected.');

console.log('\n=============================================');
console.log(' ALL SCHEDULE & SET COUNT TESTS PASSED (100%) ');
console.log('=============================================');
