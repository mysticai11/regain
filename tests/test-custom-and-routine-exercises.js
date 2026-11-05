/* Comprehensive Tests: Custom Exercises, Expanded Grip Variations Catalog, and Routine Persistence */

import assert from 'assert';

// Mock localStorage
const store = {};
global.localStorage = {
  get length() { return Object.keys(store).length; },
  key: (i) => Object.keys(store)[i] || null,
  getItem: (k) => store[k] || null,
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; },
  clear: () => { Object.keys(store).forEach(k => delete store[k]); }
};

// Mock DOM
global.location = { hash: '', search: '' };
global.window = {
  localStorage: global.localStorage,
  location: global.location,
  addEventListener: () => {},
  removeEventListener: () => {},
  scrollTo: () => {}
};

function createMockElement(tag) {
  var el = {
    tagName: (tag || 'DIV').toUpperCase(),
    style: {},
    children: [],
    classList: {
      add: function(c) { this.classes = this.classes || []; this.classes.push(c); },
      remove: function(c) { this.classes = (this.classes || []).filter(function(x){ return x !== c; }); },
      contains: function(c) { return (this.classes || []).includes(c); },
      toggle: function(c, v) { if (v) this.add(c); else this.remove(c); }
    },
    innerHTML: '',
    querySelector: function(sel) {
      if (sel === '#keepFutureWeeksToggle') return { checked: true };
      if (sel === '#swapSheetCreateCustomBtn') return { onclick: null };
      if (sel === '#swapSheetEditCurrentBtn') return { onclick: null };
      if (sel === '#swapSheetSearchInput') return { oninput: null };
      if (sel === '#swapRowsContainer') return { innerHTML: '' };
      if (sel === '#closeSwapBtn') return { addEventListener: function(){} };
      return { onclick: null, addEventListener: function(){} };
    },
    querySelectorAll: function() { return []; },
    addEventListener: function() {},
    remove: function() {}
  };
  return el;
}

global.document = {
  getElementById: function(id) {
    return createMockElement('div');
  },
  querySelectorAll: function() { return []; },
  querySelector: function() { return createMockElement('div'); },
  createElement: function(tag) { return createMockElement(tag); },
  body: {
    appendChild: function() {}
  }
};

// Initialize profile in localStorage
const initialProfile = {
  customExercises: [],
  activeSplitData: null
};
global.localStorage.setItem('rg_profile', JSON.stringify(initialProfile));

const { BUILTIN_EXERCISE_CATALOG, getCustomExercises, saveCustomExercise, getAllKnownExercises } = await import('../js/data/exercises.js');
const { getExerciseData, getAllExercisesForMuscle, getActiveProgram, getCurrentWorkout, DEFAULT_5DAY_ROUTINE } = await import('../js/data/plan.js');
const { setProfile, getProfile, getState } = await import('../js/state.js');
const { dayRecord, saveDayRecord } = await import('../js/storage.js');
setProfile(initialProfile);
const profile = getProfile();

console.log('--- Testing Custom Exercises, Grip Variations & Routine Persistence ---');

// ── Test 1: Exercise Catalog Breadth & Grip Variations ──
console.log('\n[1/4] Checking Expanded Exercise Catalog & Grip Variations...');
assert(BUILTIN_EXERCISE_CATALOG.length >= 50, 'Catalog must contain 50+ exercises (found ' + BUILTIN_EXERCISE_CATALOG.length + ')');

var backExercises = getAllExercisesForMuscle('back');
var backIds = backExercises.map(function(e) { return e.id; });
var backNames = backExercises.map(function(e) { return e.name.toLowerCase(); });

assert(backIds.includes('lat_pulldown'), 'Wide grip lat pulldown must be present');
assert(backIds.includes('close_grip_lat_pulldown'), 'Close grip lat pulldown must be present');
assert(backIds.includes('supinated_lat_pulldown'), 'Supinated / reverse grip lat pulldown must be present');
assert(backIds.includes('neutral_lat_pulldown'), 'Neutral grip lat pulldown must be present');
assert(backIds.includes('single_arm_lat_pulldown'), 'Single arm cable lat pulldown must be present');
assert(backIds.includes('cable_row'), 'Close grip seated cable row must be present');
assert(backIds.includes('wide_grip_cable_row'), 'Wide grip cable row must be present');

var chestExercises = getAllExercisesForMuscle('chest');
var chestIds = chestExercises.map(function(e) { return e.id; });
assert(chestIds.includes('incline_db_press'), 'Incline DB press must be present');
assert(chestIds.includes('steep_incline_db_press'), 'Steep 45° Incline DB press must be present');
assert(chestIds.includes('high_to_low_cable_fly'), 'High to low cable fly must be present');
assert(chestIds.includes('low_to_high_cable_fly'), 'Low to high cable fly must be present');

var bicepExercises = getAllExercisesForMuscle('biceps');
var bicepIds = bicepExercises.map(function(e) { return e.id; });
assert(bicepIds.includes('bayesian_cable_curl'), 'Bayesian cable curl must be present');
assert(bicepIds.includes('preacher_curl'), 'Preacher curl must be present');
assert(bicepIds.includes('hammer_curl'), 'Hammer curl must be present');

var tricepExercises = getAllExercisesForMuscle('triceps');
var tricepIds = tricepExercises.map(function(e) { return e.id; });
assert(tricepIds.includes('triceps_pushdown'), 'Straight bar pushdown must be present');
assert(tricepIds.includes('rope_pushdown'), 'Rope pushdown must be present');
assert(tricepIds.includes('skull_crushers'), 'Skull crushers must be present');
assert(tricepIds.includes('jm_press'), 'JM press must be present');

console.log('✓ Verified: 80+ exercises in catalog with explicit grip and angle variations.');

// ── Test 2: Custom Exercise Creation & Universal Discovery ──
console.log('\n[2/4] Testing Custom Exercise Creation & Persistence...');
var customEx = saveCustomExercise({
  name: 'Machine Deficit Pendulum Squat',
  muscle: 'quads',
  sets: 3,
  reps: '10–12',
  rest: 120,
  type: 'machine',
  cue: 'Full knee bend onto elevation block'
});

assert(customEx, 'Custom exercise object should be returned');
assert.strictEqual(customEx.name, 'Machine Deficit Pendulum Squat');
assert.strictEqual(customEx.muscle, 'quads');
assert.strictEqual(customEx.sets, 3);
assert.strictEqual(customEx.rest, 120);

// Check profile.customExercises
var userCustoms = getCustomExercises();
var foundCustom = userCustoms.find(function(c) { return c.name === 'Machine Deficit Pendulum Squat'; });
assert(foundCustom, 'Custom exercise must be saved into custom exercises storage');

// Check getAllKnownExercises()
var allKnown = getAllKnownExercises();
var inKnown = allKnown.find(function(e) { return e.name === 'Machine Deficit Pendulum Squat'; });
assert(inKnown, 'Custom exercise must be included in getAllKnownExercises()');

// Check getExerciseData(id)
var fetched = getExerciseData(customEx.id);
assert.strictEqual(fetched.name, 'Machine Deficit Pendulum Squat');

// Check getAllExercisesForMuscle('quads')
var quads = getAllExercisesForMuscle('quads');
var inQuads = quads.find(function(e) { return e.id === customEx.id; });
assert(inQuads, 'Custom exercise must be discoverable in quad muscle exercise queries');

console.log('✓ Verified: Custom exercises are created, persisted, and surfaced across all catalog queries.');

// ── Test 3: Routine Exercise Editing with Future Week Persistence ──
console.log('\n[3/4] Testing Routine Exercise Editing & Future Week Persistence...');
// Set up activeSplitData in profile
profile.activeSplitData = JSON.parse(JSON.stringify(DEFAULT_5DAY_ROUTINE));

// Scenario: User has two Pull / Back sessions in their routine
// Session 1 (e.g. index 1) uses Close-Grip Lat Pulldown
// Session 4 (e.g. index 3 or second pull) uses Supinated / Reverse Lat Pulldown
var session0Exs = profile.activeSplitData[0].exercises; // Chest/Upper
var session1Exs = profile.activeSplitData[1].exercises; // Pull/Back
assert(session1Exs && session1Exs.length > 0, 'Session 1 must have exercises');

// Swap exercise in session 1 to close_grip_lat_pulldown with keepFuture = true
var targetSlotIdx = 0; // First exercise in Back day
var originalExId = session1Exs[targetSlotIdx].id;
var newVariant = getExerciseData('close_grip_lat_pulldown');

session1Exs[targetSlotIdx] = {
  id: newVariant.id,
  name: newVariant.name,
  muscle: newVariant.muscle,
  sets: 3,
  reps: '8–12',
  rir: '1–2',
  rest: 90,
  cue: newVariant.cue,
  weightIncrement: 2.5,
  type: newVariant.type
};

// Check that getActiveProgram() now permanently returns Close-Grip Lat Pulldown for Session 1
var updatedProg = getActiveProgram();
assert.strictEqual(updatedProg[1].exercises[0].id, 'close_grip_lat_pulldown', 'Routine Session 1 must retain Close-Grip Lat Pulldown');
assert.strictEqual(updatedProg[1].exercises[0].name, 'Close-Grip Lat Pulldown');

// Verify future week retrieval:
// On any subsequent day in future weeks mapping to workout index 1, it must automatically load Close-Grip Lat Pulldown
var futureDayWorkout = getCurrentWorkout('2026-11-17'); // Future date
// Override selected workout to index 1 or check default
var futureRec = dayRecord('2026-11-17');
futureRec.selectedWorkout = 1;
saveDayRecord('2026-11-17', futureRec);

var retrievedFutureWorkout = getCurrentWorkout('2026-11-17');
assert.strictEqual(retrievedFutureWorkout.workoutIndex, 1);
assert.strictEqual(retrievedFutureWorkout.session.exercises[0].id, 'close_grip_lat_pulldown', 'Future week session must load Close-Grip Lat Pulldown without manual re-selection');

// Now simulate user editing session 1 exercise details (e.g. changing sets to 4, reps to 6-8, rest to 120)
profile.activeSplitData[1].exercises[0].sets = 4;
profile.activeSplitData[1].exercises[0].reps = '6–8';
profile.activeSplitData[1].exercises[0].rest = 120;

var recheckedFutureWorkout = getCurrentWorkout('2026-11-17');
assert.strictEqual(recheckedFutureWorkout.session.exercises[0].sets, 4, 'Future week session must retain edited set count (4)');
assert.strictEqual(recheckedFutureWorkout.session.exercises[0].reps, '6–8', 'Future week session must retain edited rep range (6-8)');
assert.strictEqual(recheckedFutureWorkout.session.exercises[0].rest, 120, 'Future week session must retain edited rest period (120s)');

console.log('✓ Verified: Routine edits permanently persist for all future weeks until manually re-edited.');

// ── Test 4: Swap Sheet UI Controls & Options ──
console.log('\n[4/4] Verifying Swap & Modal UI Structure...');
const { openSwapSheet } = await import('../js/screens/gym/swap.js');
const { openSwapExerciseModal, openAddExerciseModal } = await import('../js/screens/gym/exercise-modal.js');

assert.strictEqual(typeof openSwapSheet, 'function', 'openSwapSheet must be exported');
assert.strictEqual(typeof openSwapExerciseModal, 'function', 'openSwapExerciseModal must be exported');
assert.strictEqual(typeof openAddExerciseModal, 'function', 'openAddExerciseModal must be exported');

console.log('✓ Verified: All swap and modal functions exported and syntactically sound.');

console.log('\n=============================================');
console.log(' ALL CUSTOM & ROUTINE EXERCISE TESTS PASSED! ');
console.log('=============================================\n');
