/* Test Suite: Backup & Restore (Item 1) */

import assert from 'assert';

console.log('--- Testing Backup & Restore (Round-trip, Validation, Atomic Rollback) ---');

const store = {};
global.localStorage = {
  get length() { return Object.keys(store).length; },
  key: (i) => Object.keys(store)[i] || null,
  getItem: (k) => store[k] || null,
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; },
  clear: () => { Object.keys(store).forEach(k => delete store[k]); }
};

global.window = {
  localStorage: global.localStorage,
  Capacitor: {
    isPluginAvailable: () => false
  }
};
global.document = {
  createElement: (tag) => ({
    tagName: tag.toUpperCase(),
    click: () => {},
    remove: () => {},
    setAttribute: () => {},
    style: {}
  }),
  body: {
    appendChild: () => {},
    removeChild: () => {}
  }
};

const {
  sv, ls, dayRecord, saveDayRecord, SQLiteStorage,
  WORKOUT_SESSIONS_KEY, WORKOUT_SESSIONS_VERSION
} = await import('../js/storage.js');

const {
  serializeAllStores, parseAndValidateBackup, applyRestore
} = await import('../js/storage-backup.js');

// 1. Populate initial state with profile, weights, days, workouts
const initialProfile = {
  goal: 'build_muscle',
  targetWeight: 75,
  weightEntries: [
    { id: 'w1', dayKey: '2026-11-01', weight: 74.5 },
    { id: 'w2', dayKey: '2026-11-02', weight: 74.7 }
  ],
  customExercises: [{ id: 'ce1', name: 'Grip Curl', bodyPart: 'arms' }],
  customStaples: [{ id: 'cs1', name: 'Greek Yogurt 200g', kcal: 130, protein: 20 }]
};
sv('rg_profile', initialProfile);

const day1 = {
  weight: 74.5,
  foodLog: [
    { name: 'Oatmeal', kcal: 350, protein: 12 },
    { name: 'Chicken Breast', kcal: 300, protein: 55 }
  ],
  meals: [
    { name: 'Meal 1', items: [{ name: 'Whey shake', kcal: 120, protein: 25 }] }
  ],
  workout: {
    bench_press: [{ weight: 80, reps: 8, completed: true }]
  },
  workoutDone: true
};
saveDayRecord('2026-11-01', day1);

// 2. Test serializeAllStores
const backup = await serializeAllStores();
assert.strictEqual(backup.app, 'forge', 'App identifier should be forge');
assert.strictEqual(backup.schemaVersion, 1, 'Schema version should be 1');
assert.ok(backup.exportedAt, 'exportedAt timestamp present');
assert.deepStrictEqual(backup.data.profile.weightEntries, initialProfile.weightEntries, 'Profile weight entries serialized');
assert.ok(backup.data.days['2026-11-01'], 'Day record serialized');

// 3. Test parseAndValidateBackup
const jsonText = JSON.stringify(backup);
const validated = parseAndValidateBackup(jsonText);
assert.ok(validated && validated.valid, 'Backup parsing should be valid');
assert.strictEqual(validated.schemaVersion, 1, 'Validated schema version matches');
assert.strictEqual(validated.counts.food, 3, 'Counts 2 foodLog items + 1 meal item = 3 food entries');
assert.strictEqual(validated.counts.weights, 2, 'Counts 2 weight entries');
assert.strictEqual(validated.counts.workouts, 1, 'Counts 1 workout session');

// 4. Test Round-trip: wipe and replace restore
// Wipe local data
localStorage.clear();
SQLiteStorage.cache = {};
assert.strictEqual(ls('rg_profile', null), null, 'Store should be wiped');

// Apply restore in 'replace' mode
const restoreRes = await applyRestore(validated.payload, 'replace');
assert.ok(restoreRes.success, 'Restore in replace mode succeeded');

// Verify deep-equal restoration
const restoredProfile = ls('rg_profile', null);
assert.deepStrictEqual(restoredProfile.weightEntries, initialProfile.weightEntries, 'Restored weight entries match original');
const restoredDay1 = dayRecord('2026-11-01');
assert.strictEqual(restoredDay1.foodLog.length, 2, 'Restored foodLog has 2 items');
assert.strictEqual(restoredDay1.workoutDone, true, 'Restored day workoutDone is true');
assert.deepStrictEqual(restoredDay1.workout.bench_press, day1.workout.bench_press, 'Restored sets match');

// 5. Test Merge mode: add new item to current, merge incoming, both should persist
const incomingNewBackup = {
  app: 'forge',
  schemaVersion: 1,
  data: {
    profile: {
      weightEntries: [
        { id: 'w3', dayKey: '2026-11-03', weight: 75.0 }
      ]
    },
    days: {
      '2026-11-03': {
        weight: 75.0,
        foodLog: [{ name: 'Rice & Beef', kcal: 600, protein: 45 }]
      }
    }
  }
};
await applyRestore(incomingNewBackup.data, 'merge');
const mergedProfile = ls('rg_profile', null);
const entryIds = (mergedProfile.weightEntries || []).map(e => e.id).sort();
assert.deepStrictEqual(entryIds, ['w1', 'w2', 'w3'], 'All weight entries merged by id without duplicate');
assert.ok(dayRecord('2026-11-01').foodLog.length === 2, 'Day 1 preserved in merge');
assert.ok(dayRecord('2026-11-03').foodLog.length === 1, 'Day 3 added in merge');

// 6. Test Atomic Rollback on failure
let rollbackTriggered = false;
try {
  const badPayload = {
    get profile() { throw new Error('Simulated failure during restore'); }
  };
  await applyRestore(badPayload, 'replace');
} catch (e) {
  rollbackTriggered = true;
}
assert.ok(rollbackTriggered, 'Error caught during restore');
// Verify snapshot rollback restored existing profile
const afterRollbackProfile = ls('rg_profile', null);
assert.ok(afterRollbackProfile && afterRollbackProfile.weightEntries.length === 3, 'Data rolled back safely to snapshot');

console.log('✓ All Backup & Restore tests passed successfully!');

