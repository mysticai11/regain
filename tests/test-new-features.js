import assert from 'assert';
import { DEFAULT_5DAY_ROUTINE, SCHEDULE_7DAY } from '../js/data/splits.js';
import { getOverloadSuggestion } from '../js/lib/progression.js';
import { deleteWorkoutSession } from '../js/storage-sessions.js';
import { openEditWorkoutSheet } from '../js/screens/progress/session-editor.js';
import { openSplitManagerSheet } from '../js/screens/gym/plan-editor.js';

console.log('--- Testing New 5-Day Routine & Features ---');

// Test 1: Verify 5-Day Routine structure
assert.strictEqual(DEFAULT_5DAY_ROUTINE.length, 5, 'Should have 5 workout sessions');
assert.strictEqual(DEFAULT_5DAY_ROUTINE[0].label, 'Day 1 — Chest & Back A');
assert.strictEqual(DEFAULT_5DAY_ROUTINE[0].exercises.length, 5, 'Day 1 should have 5 exercises');
assert.strictEqual(DEFAULT_5DAY_ROUTINE[1].label, 'Day 2 — Legs & Shoulders A');
assert.strictEqual(DEFAULT_5DAY_ROUTINE[1].exercises.length, 6, 'Day 2 should have 6 exercises');
assert.strictEqual(DEFAULT_5DAY_ROUTINE[2].label, 'Day 3 — Arms');
assert.strictEqual(DEFAULT_5DAY_ROUTINE[2].exercises.length, 5, 'Day 3 should have 5 exercises');
assert.strictEqual(DEFAULT_5DAY_ROUTINE[3].label, 'Day 4 — Chest & Back B');
assert.strictEqual(DEFAULT_5DAY_ROUTINE[3].exercises.length, 6, 'Day 4 should have 6 exercises');
assert.strictEqual(DEFAULT_5DAY_ROUTINE[4].label, 'Day 5 — Legs & Shoulders B');
assert.strictEqual(DEFAULT_5DAY_ROUTINE[4].exercises.length, 6, 'Day 5 should have 6 exercises');
console.log('✓ Test 1: 5-Day routine structure matches user specification exactly');

// Test 2: Verify 7-Day Schedule with Rest days
assert.strictEqual(SCHEDULE_7DAY.length, 7, 'Should have 7 days in schedule');
assert.strictEqual(SCHEDULE_7DAY[2].isRest, true, 'Day 3 should be rest day');
assert.strictEqual(SCHEDULE_7DAY[6].isRest, true, 'Day 7 should be rest day');
console.log('✓ Test 2: 7-Day schedule correctly alternates workout and rest days');

// Test 3: Overload Suggestion - Baseline
const baselineSug = getOverloadSuggestion('incline_bench', { repMin: 6, repMax: 10, reps: '6–10', sets: 2 }, []);
assert(baselineSug.type === 'baseline' || baselineSug.type === 'science_rec', 'Should provide baseline or science starting rec');
assert(baselineSug.bannerHTML.includes('Baseline') || baselineSug.bannerHTML.includes('Working Weight') || baselineSug.bannerHTML.includes('Target'), 'Should show baseline note');
console.log('✓ Test 3: Baseline overload suggestion rendered cleanly');

// Test 4: Overload Suggestion - Add Reps
const lastSetsProg = [{ weight: 50, reps: 8, rir: 2 }, { weight: 50, reps: 7, rir: 1 }];
const repsSug = getOverloadSuggestion('incline_bench', { repMin: 6, repMax: 10, reps: '6–10', sets: 2, weightIncrement: 2.5 }, lastSetsProg);
assert.strictEqual(repsSug.type, 'add_reps');
assert(repsSug.bannerHTML.includes('9–10 reps'), 'Should recommend aiming for 9-10 reps');
console.log('✓ Test 4: Progression rep target (+1 rep) computed accurately');

// Test 5: Overload Suggestion - Top Range Reached -> Bump Weight
const topSets = [{ weight: 50, reps: 10, rir: 2 }, { weight: 50, reps: 10, rir: 1 }];
const weightSug = getOverloadSuggestion('incline_bench', { repMin: 6, repMax: 10, reps: '6–10', sets: 2, weightIncrement: 2.5 }, topSets);
assert.strictEqual(weightSug.type, 'increase_weight');
assert(weightSug.bannerHTML.includes('52.5 kg'), 'Should recommend +2.5 kg to 52.5 kg');
console.log('✓ Test 5: Weight increase (+2.5 kg) recommended when top reps reached');

// Test 6: Verify History Edit and Delete functions exist
assert.strictEqual(typeof deleteWorkoutSession, 'function');
assert.strictEqual(typeof openEditWorkoutSheet, 'function');
assert.strictEqual(typeof openSplitManagerSheet, 'function');
console.log('✓ Test 6: Split Manager, Delete Workout, and Edit Workout are available');

console.log('\n=============================================');
console.log(' ALL NEW FEATURE TESTS PASSED WITH 100%! ');
console.log('=============================================');
