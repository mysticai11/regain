/* Test Suite: Pure Weekly Stat Tiles Engine (Task R2-2) */

import assert from 'assert';
import { computeWeeklyStatTiles } from '../js/view/weeklyStats.js';

console.log('--- Testing Weekly Stat Tiles View-Model Engine (Task R2-2) ---');

// Mock data: 2 weeks of entries
const entries = [
  { dayKey: '2026-10-21', weight: 54.0 },
  { dayKey: '2026-10-28', weight: 54.4 },
  { dayKey: '2026-11-04', weight: 54.8 }
];

const records = [
  { key: '2026-10-29', kcal: 2800, protein: 155 },
  { key: '2026-10-30', kcal: 2750, protein: 150 },
  { key: '2026-10-31', kcal: 2900, protein: 160 },
  { key: '2026-11-01', kcal: 2600, protein: 145 },
  { key: '2026-11-02', kcal: 2850, protein: 155 },
  { key: '2026-11-03', kcal: 2700, protein: 150 },
  { key: '2026-11-04', kcal: 2800, protein: 150 }
];

const workoutSessions = [
  {
    dayKey: '2026-11-02',
    exercises: [
      { id: 'bench_press', sets: [{ weight: 45, reps: 6 }, { weight: 45, reps: 6 }] },
      { id: 'incline_db_press', sets: [{ weight: 20, reps: 8 }] }
    ]
  },
  {
    dayKey: '2026-11-04',
    exercises: [
      { id: 'squat', sets: [{ weight: 70, reps: 5 }, { weight: 70, reps: 5 }] }
    ]
  }
];

const tiles = computeWeeklyStatTiles({
  entries: entries,
  records: records,
  workoutSessions: workoutSessions,
  profile: {
    targetWeight: 60,
    calTargetGym: 2750,
    protTargetGym: 150,
    trainingDays: [1, 3, 5] // 3 days/week
  },
  todayDateKey: '2026-11-04'
});

assert.strictEqual(tiles.length, 6, 'Generates exactly 6 weekly stat tiles');

// 1. Weight tile
const tWeight = tiles.find(t => t.id === 'weight');
assert.strictEqual(tWeight.value, '54.8', 'Weight 7d avg is 54.8');
assert.strictEqual(tWeight.unit, 'kg');
assert.ok(tWeight.sparklinePoints.length >= 3, 'Weight sparkline contains points');

// 2. Rate tile
const tRate = tiles.find(t => t.id === 'rate');
assert.ok(Number(tRate.value) > 0, 'Gaining weight (+kg/wk)');
assert.strictEqual(tRate.trend, 'up', 'Trend is upward');

// 3. Calories tile
const tCal = tiles.find(t => t.id === 'calories');
assert.ok(Number(tCal.value.replace(/,/g, '')) >= 2700, 'Calories 7d avg computed');
assert.strictEqual(tCal.sparklinePoints.length, 7, '7-day calorie sparkline points');

// 4. Protein tile
const tProt = tiles.find(t => t.id === 'protein');
assert.ok(Number(tProt.value) >= 150, 'Protein 7d avg computed');
assert.strictEqual(tProt.sparklinePoints.length, 7, '7-day protein sparkline points');

// 5. Workouts tile
const tWorkouts = tiles.find(t => t.id === 'workouts');
assert.strictEqual(tWorkouts.value, '2 / 3', '2 completed of 3 planned workouts');

// 6. Sets tile
const tSets = tiles.find(t => t.id === 'sets');
assert.strictEqual(tSets.value, '5', '5 completed sets in past 7 days (3 + 2)');
assert.strictEqual(tSets.sparklinePoints.length, 6, '6-week sets volume sparkline points');

console.log('✓ All 6 Weekly Stat Tiles view-model tests passed (100%)');
