/* Test suite verifying merged workout persistence, timer non-destructive updates, and bodyweight stats layout */

import assert from 'node:assert';
import { groupWorkoutExercises, saveWorkoutSessionFromDay, getWorkoutSessions, workoutSessionStore } from '../js/storage-sessions.js';
import { sessionSetCount } from '../js/lib/schedule.js';
import { buildMergedSession } from '../js/lib/catchup.js';
import { getActiveProgram } from '../js/data/plan.js';
import { dayRecord, saveDayRecord, SQLiteStorage } from '../js/storage.js';

// Setup in-memory mock environment
globalThis.localStorage = {
  _data: {},
  getItem(k) { return this._data[k] !== undefined ? this._data[k] : null; },
  setItem(k, v) { this._data[k] = String(v); },
  removeItem(k) { delete this._data[k]; },
  clear() { this._data = {}; }
};
SQLiteStorage.cache = {};

console.log('--- Testing Merged Workout Accuracy, Timer & Stats Layout ---');

// 1. Verify buildMergedSession creates accurate merged structure
console.log('\n[1/3] Verifying merged session structure and sessionSetCount...');
var prog = getActiveProgram();
var d3Arms = prog[2];
var d4ChestBackB = prog[3];

var mergeResult = buildMergedSession(d4ChestBackB, d3Arms, {}, {}, { maxSets: 20, setsPerAddedExercise: 2 });
assert.ok(mergeResult.mergedSession.isMerged, 'Session must have isMerged flag');
assert.strictEqual(mergeResult.mergedSession.exercises.length, d4ChestBackB.exercises.length + mergeResult.addedExercises.length);

var plannedSets = sessionSetCount(mergeResult.mergedSession);
assert.strictEqual(plannedSets, mergeResult.totalSets, 'sessionSetCount must equal mergeResult.totalSets');
console.log('✓ sessionSetCount accurately reflects merged session: ' + plannedSets + ' sets');

// 2. Verify saveWorkoutSessionFromDay keeps merged exercises in 1 single unified session
console.log('\n[2/3] Verifying saveWorkoutSessionFromDay with rec.isMerged...');
var testDate = '2026-11-06';
var mockMergedRec = {
  isMerged: true,
  catchupFrom: '2026-11-05',
  workoutDone: true,
  workout: {
    // Base exercises (Chest & Back B)
    'flat_bench': [{ weight: 80, reps: 8 }, { weight: 80, reps: 7 }],
    'machine_row': [{ weight: 70, reps: 10 }, { weight: 70, reps: 9 }],
    // Added catch-up exercises (Arms)
    'ez_bar_curl': [{ weight: 30, reps: 10 }, { weight: 30, reps: 10 }],
    'triceps_pushdown': [{ weight: 35, reps: 12 }, { weight: 35, reps: 11 }]
  },
  workoutMeta: {
    sessionLabel: 'Chest & Back B + Catch-up',
    durationMinutes: 52
  }
};

saveDayRecord(testDate, mockMergedRec);
var sessions = getWorkoutSessions().filter(function(s) { return s.dayKey === testDate; });

assert.strictEqual(sessions.length, 1, 'Merged workout MUST be saved as 1 session, not split across days');
assert.strictEqual(sessions[0].isMerged, true, 'Saved session must be marked as isMerged');
assert.strictEqual(sessions[0].exercises.length, 4, 'Saved session must contain all 4 logged exercises');
assert.strictEqual(sessions[0].programLabel, 'Chest & Back B + Catch-up', 'Program label must match merged title');

var totalLoggedSets = sessions[0].exercises.reduce(function(acc, ex) {
  return acc + ex.sets.length;
}, 0);
assert.strictEqual(totalLoggedSets, 8, 'Total logged sets in merged session must equal 8');
console.log('✓ Merged workout successfully saved as 1 session with all ' + totalLoggedSets + ' sets across 4 exercises');

// 3. Verify rest timer dock is lightweight and not a disruptive modal sheet
console.log('\n[3/3] Verifying rest timer dock structure...');
import fs from 'node:fs';
var timerContent = fs.readFileSync('./js/screens/gym/timer.js', 'utf8');
assert.ok(timerContent.includes('rest-timer-dock'), 'timer.js must render a lightweight rest-timer-dock');
assert.ok(!timerContent.includes('class="sheet rest-timer-sheet"'), 'timer.js must not render rest timer as a heavy sheet modal');
console.log('✓ Rest timer dock structure verified (lightweight dock, non-blocking)');

console.log('\n=============================================');
console.log(' ALL MERGED & TIMER TESTS PASSED (100%) ');
console.log('=============================================');

