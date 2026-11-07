import assert from 'assert';

console.log('--- Testing Weekly Volume Deduplication for Compound Muscle Groups ---');

// Mock localStorage
globalThis.localStorage = {
  _store: {},
  getItem(k) { return this._store[k] || null; },
  setItem(k, v) { this._store[k] = String(v); this[k] = String(v); },
  removeItem(k) { delete this._store[k]; delete this[k]; },
  clear() { this._store = {}; }
};

const { todayKey } = await import('../js/lib/format.js');
const today = todayKey();

// Log 3 leg press sets for today (leg_press has muscle: 'quads,glutes')
const dayRec = {
  workoutDone: true,
  workout: {
    leg_press: [
      { weight: 120, reps: 10 },
      { weight: 140, reps: 8 },
      { weight: 160, reps: 6 }
    ]
  }
};
globalThis.localStorage.setItem('rg_day_' + today, JSON.stringify(dayRec));

const { getLoggedWeeklyVolume } = await import('../js/lib/calc.js');

const vol = getLoggedWeeklyVolume();
const quadsGlutes = vol.find(v => v.muscle === 'Quads / Glutes');

assert.ok(quadsGlutes, 'Quads / Glutes entry must exist');
assert.strictEqual(quadsGlutes.sets, 3, '3 sets of leg press must count as 3 sets for Quads / Glutes, NOT 6');

console.log('✓ Volume counting deduplication test passed: 3 logged leg press sets correctly counted as 3 sets for Quads / Glutes');
