/* Test Suite: Pure Week Strip Day Circles Engine (Item 5) */

import assert from 'assert';
import { computeWeekStrip } from '../js/view/weekStrip.js';

console.log('--- Testing Week Strip Day Circles Engine (Item 5) ---');

// Monday is 2026-11-02, Today is Wednesday 2026-11-04
// Planned: Mon (0), Wed (2), Fri (4)
const dayRecords = {
  '2026-11-02': { workoutDone: true }, // Trained Monday
  '2026-11-03': {}, // Unplanned Tuesday
  '2026-11-04': {}  // Today Wednesday, not yet trained
};

const weekDays = computeWeekStrip({
  mondayKey: '2026-11-02',
  todayDateKey: '2026-11-04',
  activeSelectedKey: '2026-11-04',
  dayRecordsMap: dayRecords,
  plannedDayIndices: [0, 2, 4]
});

assert.strictEqual(weekDays.length, 7, 'Week strip computes exactly 7 days');

// Day 0: Monday 2026-11-02 (Trained) -> 'done'
assert.strictEqual(weekDays[0].dateKey, '2026-11-02');
assert.strictEqual(weekDays[0].dayLetter, 'M');
assert.strictEqual(weekDays[0].state, 'done', 'Monday is done');

// Day 1: Tuesday 2026-11-03 (Past, not planned) -> 'rest'
assert.strictEqual(weekDays[1].dateKey, '2026-11-03');
assert.strictEqual(weekDays[1].dayLetter, 'T');
assert.strictEqual(weekDays[1].state, 'rest', 'Tuesday is rest');

// Day 2: Wednesday 2026-11-04 (Today, planned, not done) -> 'planned'
assert.strictEqual(weekDays[2].dateKey, '2026-11-04');
assert.strictEqual(weekDays[2].dayLetter, 'W');
assert.strictEqual(weekDays[2].state, 'planned', 'Today is planned');
assert.strictEqual(weekDays[2].isToday, true, 'isToday is true for Wednesday');
assert.strictEqual(weekDays[2].isSelected, true, 'isSelected is true for active Wednesday');

// Day 4: Friday 2026-11-06 (Future, planned) -> 'planned'
assert.strictEqual(weekDays[4].dateKey, '2026-11-06');
assert.strictEqual(weekDays[4].dayLetter, 'F');
assert.strictEqual(weekDays[4].state, 'planned', 'Future planned day is planned');
assert.strictEqual(weekDays[4].isToday, false);

// Day 6: Sunday 2026-11-08 (Future, rest) -> 'rest'
assert.strictEqual(weekDays[6].dateKey, '2026-11-08');
assert.strictEqual(weekDays[6].dayLetter, 'S');
assert.strictEqual(weekDays[6].state, 'rest', 'Sunday is rest');

// Test Skipped state: If today is Saturday 2026-11-07 and Friday 2026-11-06 was not trained
const weekDaysSat = computeWeekStrip({
  mondayKey: '2026-11-02',
  todayDateKey: '2026-11-07',
  activeSelectedKey: '2026-11-07',
  dayRecordsMap: {
    '2026-11-02': { workoutDone: true }
  },
  plannedDayIndices: [0, 2, 4]
});

// Wed (day 2) and Fri (day 4) should be 'skipped'
assert.strictEqual(weekDaysSat[2].state, 'skipped', 'Past Wednesday without workout is skipped');
assert.strictEqual(weekDaysSat[4].state, 'skipped', 'Past Friday without workout is skipped');

// Overrides test: If Sunday is overridden to workout
const weekDaysOverride = computeWeekStrip({
  mondayKey: '2026-11-02',
  todayDateKey: '2026-11-04',
  overrides: { '2026-11-08': 'day_1' },
  plannedDayIndices: [0, 2, 4]
});
assert.strictEqual(weekDaysOverride[6].state, 'planned', 'Overridden Sunday is planned');

console.log('✓ All 5 Week Strip Day Circles engine tests passed (100%)');
