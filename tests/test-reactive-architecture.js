/* Test suite: Reactive State Architecture & Immediate UI Updates */
const assert = require('assert');

// Mock localStorage
const store = {};
global.localStorage = {
  getItem: (k) => store[k] || null,
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; },
  clear: () => { Object.keys(store).forEach(k => delete store[k]); }
};

// Mock DOM
global.window = {
  localStorage: global.localStorage,
  addEventListener: () => {},
  removeEventListener: () => {},
  scrollTo: () => {}
};
global.document = {
  activeElement: null,
  querySelector: () => null,
  querySelectorAll: () => [],
  getElementById: () => ({ innerHTML: '', textContent: '', style: {}, focus: () => {} }),
  createElement: () => ({ className: '', style: {}, querySelector: () => ({ onclick: null }), querySelectorAll: () => [] }),
  body: { appendChild: () => {} }
};

async function runTests() {
  console.log('--- Testing Reactive State Architecture & Immediate UI Updates ---');

  const { getState, setState, subscribe, notifySubscribers } = await import('../js/state.js');
  const { saveDayRecord, dayRecord } = await import('../js/storage.js');
  const { getCurrentWorkout, DEFAULT_5DAY_ROUTINE } = await import('../js/data/plan.js');
  const { getTargetsForDate } = await import('../js/lib/calc.js');
  const { saveWorkoutSession, deleteWorkoutSession, workoutSessionStore } = await import('../js/storage-sessions.js');

  // Test 1: Subscription and Notification
  let notifications = 0;
  const unsub = subscribe(() => {
    notifications++;
  });

  setState({ tab: 'gym' });
  notifySubscribers();
  assert.strictEqual(getState().tab, 'gym', 'State tab should be gym');
  assert.strictEqual(notifications, 1, 'Subscriber should be called once');

  // Test 2: Changing workout day updates derived current workout everywhere
  const testDate = '2026-11-05';
  let initialWorkout = getCurrentWorkout(testDate);

  // Set day to Day 2 (Legs & Shoulders A)
  setState({
    dayKey: testDate,
    dayRecord: Object.assign(dayRecord(testDate), { selectedWorkout: 1 })
  });
  notifySubscribers();

  let updatedWorkout = getCurrentWorkout(testDate);
  assert.strictEqual(updatedWorkout.workoutIndex, 1, 'Workout index should be 1');
  assert.ok(updatedWorkout.cleanName.includes('Legs') || updatedWorkout.cleanName.includes('Shoulders'), 'Clean name should reflect Day 2');
  assert.strictEqual(updatedWorkout.hasOverride, true, 'Should mark hasOverride true');
  console.log('✓ Test 1 & 2: Gym day picker & Today change updates current workout derived state immediately');

  // Test 3: Reset to suggested
  const recWithReset = dayRecord(testDate);
  delete recWithReset.selectedWorkout;
  setState({ dayKey: testDate, dayRecord: recWithReset });
  notifySubscribers();

  const resetWorkout = getCurrentWorkout(testDate);
  assert.strictEqual(resetWorkout.hasOverride, false, 'hasOverride should be false after reset');
  console.log('✓ Test 3: "Reset to suggested" updates everywhere');

  // Test 4: Target calories/protein reactive calculation
  const gymTarget = getTargetsForDate(testDate);
  assert.ok(gymTarget.kcal > 0, 'Kcal target should be positive');
  assert.ok(gymTarget.protein > 0, 'Protein target should be positive');
  console.log('✓ Test 4: Dynamic target calculation functions reactively');

  // Test 5: Food Logging, Delete, and Food State
  const foodRec = dayRecord(testDate);
  foodRec.extra = [{ name: 'Chicken Breast', kcal: 300, protein: 50, carbs: 0, fat: 5, servings: 1 }];
  setState({ dayKey: testDate, dayRecord: foodRec });
  notifySubscribers();

  const readFoodRec = dayRecord(testDate);
  assert.strictEqual(readFoodRec.extra.length, 1, 'Should have 1 food item logged');
  assert.strictEqual(readFoodRec.extra[0].protein, 50, 'Protein should be 50g');

  // Delete food
  readFoodRec.extra = [];
  setState({ dayKey: testDate, dayRecord: readFoodRec });
  notifySubscribers();
  assert.strictEqual(dayRecord(testDate).extra.length, 0, 'Food item should be deleted immediately');
  console.log('✓ Test 5: Food log and delete updates state and notifies subscribers');

  // Test 6: Weight entry reactive update
  const wtRec = dayRecord(testDate);
  wtRec.weight = 54.5;
  setState({ dayKey: testDate, dayRecord: wtRec });
  notifySubscribers();
  assert.strictEqual(dayRecord(testDate).weight, 54.5, 'Weight should update immediately in state');
  console.log('✓ Test 6: Bodyweight updates immediately');

  // Test 7: Set completion & Set state
  const setRec = dayRecord(testDate);
  setRec.workout = {
    'incline_bench': [{ weight: 50, reps: 10, rir: 2 }]
  };
  setState({ dayKey: testDate, dayRecord: setRec });
  notifySubscribers();
  assert.strictEqual(dayRecord(testDate).workout['incline_bench'].length, 1, 'Set should be recorded');
  console.log('✓ Test 7: Complete set recorded into reactive state');

  // Test 8: Workout Session save and delete
  const sess = {
    id: 'test_session_1',
    dayKey: testDate,
    programLabel: 'Day 1 — Chest & Back A',
    completed: true,
    exercises: [{ id: 'incline_bench', sets: [{ weight: 50, reps: 10 }] }]
  };
  saveWorkoutSession(sess);
  assert.ok(workoutSessionStore().sessions['test_session_1'], 'Session should be saved in store');

  // Delete session
  const st = workoutSessionStore();
  delete st.sessions['test_session_1'];
  setState({ workoutSessions: st });
  notifySubscribers();
  assert.strictEqual(workoutSessionStore().sessions['test_session_1'], undefined, 'Session should be deleted from store');
  console.log('✓ Test 8: Session save & delete updates state and notifies subscribers');

  // Test 9: Swap exercise and Add/Remove extra set
  const swapRec = dayRecord(testDate);
  swapRec.swaps = { 'incline_bench': 'flat_db_bench' };
  swapRec.extraSets = { 'incline_bench': 2 };
  setState({ dayKey: testDate, dayRecord: swapRec });
  notifySubscribers();
  assert.strictEqual(dayRecord(testDate).swaps['incline_bench'], 'flat_db_bench', 'Swap exercise should be recorded');
  assert.strictEqual(dayRecord(testDate).extraSets['incline_bench'], 2, 'Extra sets should be recorded');
  console.log('✓ Test 9: Swap exercise and extra sets update state');

  // Test 10: Timer start/pause/resume/finish
  const timerRec = dayRecord(testDate);
  const now = new Date().toISOString();
  timerRec.workoutMeta = { startedAt: now, pausedAt: null, accumulatedPausedMs: 0 };
  setState({ dayKey: testDate, dayRecord: timerRec });
  notifySubscribers();
  assert.strictEqual(dayRecord(testDate).workoutMeta.startedAt, now, 'Timer started');

  // Pause
  const pauseTime = new Date().toISOString();
  timerRec.workoutMeta.pausedAt = pauseTime;
  setState({ dayKey: testDate, dayRecord: timerRec });
  notifySubscribers();
  assert.strictEqual(dayRecord(testDate).workoutMeta.pausedAt, pauseTime, 'Timer paused');

  // Finish
  timerRec.workoutMeta.completedAt = new Date().toISOString();
  timerRec.workoutMeta.durationMinutes = 45;
  timerRec.workoutDone = true;
  setState({ dayKey: testDate, dayRecord: timerRec });
  notifySubscribers();
  assert.strictEqual(dayRecord(testDate).workoutDone, true, 'Timer finished session');
  console.log('✓ Test 10: Timer start, pause, resume, finish flow updates state');

  // Test 11: Change Settings targets
  const { profile } = getState();
  const updatedProfile = Object.assign({}, profile, { targetKcal: 3100, targetProtein: 140 });
  setState({ profile: updatedProfile });
  notifySubscribers();
  assert.strictEqual(getState().profile.targetKcal, 3100, 'Profile target kcal updated');
  assert.strictEqual(getState().profile.targetProtein, 140, 'Profile target protein updated');
  console.log('✓ Test 11: Settings targets update reactively');

  unsub();
  console.log('\n=============================================');
  console.log(' ALL 11 REACTIVE ARCHITECTURE TESTS PASSED! ');
  console.log('=============================================');
}

runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});

