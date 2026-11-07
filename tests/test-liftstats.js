/* Test Suite: Lift Statistics View-Model (Item 3) */

import assert from 'assert';
import { computeLiftViewModel } from '../js/view/liftStats.js';

console.log('--- Testing Lift Statistics View-Model (Item 3) ---');

const nowMs = new Date('2026-11-08T12:00:00Z').getTime();
const dayMs = 86400000;

// 1. PR Detection Test:
// Session 1: 50 kg x 8 reps -> e1RM = 50 * (1 + 8/30) = 63.33 kg (PR: true)
// Session 2: 55 kg x 8 reps -> e1RM = 55 * (1 + 8/30) = 69.67 kg (PR: true - higher)
// Session 3: 52.5 kg x 8 reps -> e1RM = 66.5 kg (PR: false - lower)
// Session 4: 55 kg x 8 reps -> e1RM = 69.67 kg (PR: false - tie, strict > required)
const sessionsPrTest = [
  {
    dateKey: '2026-10-01',
    timestampMs: nowMs - 38 * dayMs,
    workout: {
      bench: [{ weight: 50, reps: 8, completed: true }]
    }
  },
  {
    dateKey: '2026-10-08',
    timestampMs: nowMs - 31 * dayMs,
    workout: {
      bench: [{ weight: 55, reps: 8, completed: true }]
    }
  },
  {
    dateKey: '2026-10-15',
    timestampMs: nowMs - 24 * dayMs,
    workout: {
      bench: [{ weight: 52.5, reps: 8, completed: true }]
    }
  },
  {
    dateKey: '2026-10-22',
    timestampMs: nowMs - 17 * dayMs,
    workout: {
      bench: [{ weight: 55, reps: 8, completed: true }]
    }
  }
];

const vmPr = computeLiftViewModel({
  exerciseId: 'bench',
  sessions: sessionsPrTest,
  metric: 'e1rm',
  range: 'all',
  nowMs: nowMs
});

assert.strictEqual(vmPr.recentSessions.length, 4, '4 sessions recorded');
// In recentSessions (newest first):
// index 0: 2026-10-22 (Session 4, tied -> false)
// index 1: 2026-10-15 (Session 3, lower -> false)
// index 2: 2026-10-08 (Session 2, higher -> true)
// index 3: 2026-10-01 (Session 1, first -> true)
assert.strictEqual(vmPr.recentSessions[3].isPR, true, 'First session is baseline PR');
assert.strictEqual(vmPr.recentSessions[2].isPR, true, 'Second session higher -> PR is true');
assert.strictEqual(vmPr.recentSessions[1].isPR, false, 'Third session lower -> PR is false');
assert.strictEqual(vmPr.recentSessions[0].isPR, false, 'Fourth session ties -> PR is false (strict >)');
console.log('✓ Test 1: PR detection (first PR, higher PR, lower non-PR, tie non-PR) passed');

// 2. Metric Switching: e1rm vs topSet vs volume
const vmE1 = computeLiftViewModel({
  exerciseId: 'bench',
  sessions: sessionsPrTest,
  metric: 'e1rm',
  range: 'all',
  nowMs: nowMs
});
assert.strictEqual(vmE1.chartPoints[0].v, +(50 * (1 + 8 / 30)).toFixed(2), 'e1rm metric correctly mapped');

const vmTop = computeLiftViewModel({
  exerciseId: 'bench',
  sessions: sessionsPrTest,
  metric: 'topSet',
  range: 'all',
  nowMs: nowMs
});
assert.strictEqual(vmTop.chartPoints[0].v, 50, 'topSet metric correctly mapped to weight');

const vmVol = computeLiftViewModel({
  exerciseId: 'bench',
  sessions: sessionsPrTest,
  metric: 'volume',
  range: 'all',
  nowMs: nowMs
});
assert.strictEqual(vmVol.chartPoints[0].v, 50 * 8, 'volume metric correctly mapped to weight * reps');
console.log('✓ Test 2: Metric switching correctly maps values');

// 3. Range Filtering: '4w' (28 days) excludes sessions older than 28 days
const vm4w = computeLiftViewModel({
  exerciseId: 'bench',
  sessions: sessionsPrTest,
  metric: 'e1rm',
  range: '4w',
  nowMs: nowMs
});
// 38 days ago and 31 days ago must be excluded; 24 days and 17 days included
assert.strictEqual(vm4w.chartPoints.length, 2, '4w filter includes only sessions within last 28 days');
assert.strictEqual(vm4w.chartPoints[0].label, '2026-10-15', 'Oldest in 4w range is 2026-10-15');
assert.strictEqual(vm4w.chartPoints[1].label, '2026-10-22', 'Newest in 4w range is 2026-10-22');
console.log('✓ Test 3: Range filtering excludes older points cleanly');

// 4. Personal Bests remain all-time even in '4w' range
assert.ok(vm4w.personalBests.heaviest, 'Heaviest PB present');
assert.strictEqual(vm4w.personalBests.heaviest.weight, 55, 'All-time heaviest weight is 55 kg');
assert.strictEqual(vm4w.personalBests.bestE1RM.value, +(55 * (1 + 8 / 30)).toFixed(2), 'All-time best 1RM preserved in 4w view');
assert.strictEqual(vm4w.personalBests.bestVolume.value, 55 * 8, 'All-time best volume preserved in 4w view');
console.log('✓ Test 4: Personal bests are strictly all-time regardless of range');

// 5. Zero completed sets / empty sessions
const emptyVm = computeLiftViewModel({
  exerciseId: 'squat',
  sessions: [{ workout: { bench: [{ weight: 60, reps: 8 }] } }],
  nowMs: nowMs
});
assert.deepStrictEqual(emptyVm.personalBests, { heaviest: null, bestE1RM: null, bestVolume: null }, 'Empty returns null PBs');
assert.strictEqual(emptyVm.chartPoints.length, 0, 'Empty returns 0 chart points');
assert.strictEqual(emptyVm.recentSessions.length, 0, 'Empty returns 0 recent sessions');
console.log('✓ Test 5: Empty sessions handled gracefully without errors');

console.log('\n=============================================');
console.log(' ALL LIFT STATS VIEW-MODEL TESTS PASSED (100%) ');
console.log('=============================================\n');
