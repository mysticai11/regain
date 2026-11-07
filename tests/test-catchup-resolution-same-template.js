import assert from 'assert';
import { detectMissedDay } from '../js/lib/catchup.js';
import { DEFAULT_5DAY_ROUTINE } from '../js/data/plan.js';

console.log('--- Testing Catch-Up Miss Resolution by Template ID/Label within Week ---');

// Ground truth split:
// Mon (2026-11-02): D1 Chest & Back A
// Tue (2026-11-03): D2 Legs & Shoulders A
// Wed (2026-11-04): REST
// Thu (2026-11-05): D3 Arms
// Fri (2026-11-06): D4 Chest & Back B
// Sat (2026-11-07): D5 Legs & Shoulders B
// Sun (2026-11-08): REST

const prog = DEFAULT_5DAY_ROUTINE;
const trainingDays = [1, 2, 4, 5, 6];

// Scenario:
// Tuesday (2026-11-03) Legs & Shoulders A was scheduled but missed (no log on Tuesday).
// On Friday (2026-11-06), the user chose Legs & Shoulders A and logged it as completed.
// On Saturday (2026-11-07), Tuesday's miss should be considered RESOLVED because that same template was logged later in the same week!

const records = {
  '2026-11-02': { workoutDone: true }, // Mon done
  '2026-11-03': { workoutDone: false }, // Tue missed
  '2026-11-04': { workoutDone: false }, // Wed rest
  '2026-11-05': { workoutDone: true }, // Thu done
  // Fri: user logged Legs & Shoulders A (the template from Tue, workoutIndex 1 / label "Day 2 — Legs & Shoulders A")
  '2026-11-06': {
    workoutDone: true,
    workoutMeta: { sessionLabel: 'Day 2 — Legs & Shoulders A' },
    selectedWorkout: 1, // workoutIndex 1 = Legs & Shoulders A
    workout: {
      'squat': [{ weight: 100, reps: 6, rir: 2 }]
    }
  }
};

const result = detectMissedDay('2026-11-07', {
  prog,
  trainingDays,
  records,
  weekOverrides: {},
  decisions: {}
});

console.log('Detection result for Saturday 2026-11-07:', result);

assert.strictEqual(
  result.missed,
  false,
  'Missed Tuesday Legs & Shoulders A should resolve because it was logged on Friday in the same week!'
);

console.log('✓ Verified: Missed session resolved when template was completed later in the same week.');
