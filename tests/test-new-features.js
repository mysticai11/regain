const fs = require('fs');
const assert = require('assert');

const dbCode = fs.readFileSync('db.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');
const scriptCode = html.match(/<script>([\s\S]*?)<\/script>/)[1];

const dummyStorage = {
  data: {},
  getItem: function(k) { return this.data[k] || null; },
  setItem: function(k, v) { this.data[k] = String(v); },
  removeItem: function(k) { delete this.data[k]; }
};

const dummyDoc = {
  getElementById: function() { return { innerHTML: '', addEventListener: function(){}, onclick: null }; },
  querySelector: function() { return null; },
  querySelectorAll: function() { return []; },
  createElement: function() { return { style: {}, appendChild: function(){}, addEventListener: function(){}, remove: function(){}, querySelector: function(){ return {}; }, querySelectorAll: function(){ return []; } }; },
  body: { appendChild: function(){} },
  addEventListener: function() {}
};

const sandbox = {
  console: console,
  window: { localStorage: dummyStorage, addEventListener: function(){}, Capacitor: null },
  document: dummyDoc,
  localStorage: dummyStorage,
  navigator: { userAgent: 'node' }
};

const runner = new Function('sandbox', 'with (sandbox) { ' + dbCode + ';\n' + scriptCode + '; return { DEFAULT_5DAY_ROUTINE, SCHEDULE_7DAY, getActiveProgram, getExerciseData, getOverloadSuggestion, deleteWorkoutSession, openEditWorkoutSheet, openSplitManagerSheet }; }');

const funcs = runner(sandbox);

console.log('--- Testing New 5-Day Routine & Features ---');

// Test 1: Verify 5-Day Routine structure
assert.strictEqual(funcs.DEFAULT_5DAY_ROUTINE.length, 5, 'Should have 5 workout sessions');
assert.strictEqual(funcs.DEFAULT_5DAY_ROUTINE[0].label, 'Day 1 — Chest & Back A');
assert.strictEqual(funcs.DEFAULT_5DAY_ROUTINE[0].exercises.length, 7, 'Day 1 should have 7 exercises');
assert.strictEqual(funcs.DEFAULT_5DAY_ROUTINE[1].label, 'Day 2 — Legs & Shoulders A');
assert.strictEqual(funcs.DEFAULT_5DAY_ROUTINE[1].exercises.length, 6, 'Day 2 should have 6 exercises');
assert.strictEqual(funcs.DEFAULT_5DAY_ROUTINE[2].label, 'Day 4 — Chest & Back B');
assert.strictEqual(funcs.DEFAULT_5DAY_ROUTINE[2].exercises.length, 8, 'Day 4 should have 8 exercises');
assert.strictEqual(funcs.DEFAULT_5DAY_ROUTINE[3].label, 'Day 5 — Arms');
assert.strictEqual(funcs.DEFAULT_5DAY_ROUTINE[3].exercises.length, 5, 'Day 5 should have 5 exercises');
assert.strictEqual(funcs.DEFAULT_5DAY_ROUTINE[4].label, 'Day 6 — Legs & Shoulders B');
assert.strictEqual(funcs.DEFAULT_5DAY_ROUTINE[4].exercises.length, 7, 'Day 6 should have 7 exercises');
console.log('✓ Test 1: 5-Day routine structure matches user specification exactly');

// Test 2: Verify 7-Day Schedule with Rest days
assert.strictEqual(funcs.SCHEDULE_7DAY.length, 7, 'Should have 7 days in schedule');
assert.strictEqual(funcs.SCHEDULE_7DAY[2].isRest, true, 'Day 3 should be rest day');
assert.strictEqual(funcs.SCHEDULE_7DAY[6].isRest, true, 'Day 7 should be rest day');
console.log('✓ Test 2: 7-Day schedule correctly alternates workout and rest days');

// Test 3: Overload Suggestion - Baseline
const baselineSug = funcs.getOverloadSuggestion('incline_bench', { repMin: 6, repMax: 10, reps: '6–10', sets: 2 }, []);
assert.strictEqual(baselineSug.type, 'baseline');
assert(baselineSug.bannerHTML.includes('Baseline Session'), 'Should show baseline note');
console.log('✓ Test 3: Baseline overload suggestion rendered cleanly');

// Test 4: Overload Suggestion - Add Reps
const lastSetsProg = [{ weight: 50, reps: 8, rir: 2 }, { weight: 50, reps: 7, rir: 1 }];
const repsSug = funcs.getOverloadSuggestion('incline_bench', { repMin: 6, repMax: 10, reps: '6–10', sets: 2, weightIncrement: 2.5 }, lastSetsProg);
assert.strictEqual(repsSug.type, 'add_reps');
assert(repsSug.bannerHTML.includes('9–10 reps'), 'Should recommend aiming for 9-10 reps');
console.log('✓ Test 4: Progression rep target (+1 rep) computed accurately');

// Test 5: Overload Suggestion - Top Range Reached -> Bump Weight
const topSets = [{ weight: 50, reps: 10, rir: 2 }, { weight: 50, reps: 10, rir: 1 }];
const weightSug = funcs.getOverloadSuggestion('incline_bench', { repMin: 6, repMax: 10, reps: '6–10', sets: 2, weightIncrement: 2.5 }, topSets);
assert.strictEqual(weightSug.type, 'increase_weight');
assert(weightSug.bannerHTML.includes('52.5 kg'), 'Should recommend +2.5 kg to 52.5 kg');
console.log('✓ Test 5: Weight increase (+2.5 kg) recommended when top reps reached');

// Test 6: Verify History Edit and Delete functions exist
assert.strictEqual(typeof funcs.deleteWorkoutSession, 'function');
assert.strictEqual(typeof funcs.openEditWorkoutSheet, 'function');
assert.strictEqual(typeof funcs.openSplitManagerSheet, 'function');
console.log('✓ Test 6: Split Manager, Delete Workout, and Edit Workout are available');

console.log('\n=============================================');
console.log(' ALL NEW FEATURE TESTS PASSED WITH 100%! ');
console.log('=============================================');
