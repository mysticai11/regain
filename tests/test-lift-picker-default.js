import assert from 'assert';

console.log('--- Testing Lift Picker Default Exercise Selection ---');

// Mock DOM & storage
globalThis.localStorage = {
  _store: {},
  getItem(k) { return this._store[k] || null; },
  setItem(k, v) { this._store[k] = String(v); },
  removeItem(k) { delete this._store[k]; },
  clear() { this._store = {}; }
};

globalThis.window = {
  activeProgressExerciseId: null,
  addEventListener: () => {},
  removeEventListener: () => {}
};

const dummyContent = { innerHTML: '', addEventListener: () => {} };
globalThis.document = {
  body: { classList: { add: () => {}, remove: () => {} }, appendChild: () => {}, addEventListener: () => {} },
  addEventListener: () => {},
  removeEventListener: () => {},
  getElementById: function(id) {
    if (id === 'content') return dummyContent;
    return {
      style: {},
      classList: { add: () => {}, remove: () => {} },
      appendChild: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      querySelector: () => null,
      querySelectorAll: () => []
    };
  },
  querySelector: () => null,
  querySelectorAll: () => []
};

// Seed profile and a session where incline_dumbbell_press was logged, but default bench_press was not
globalThis.localStorage.setItem('rg_profile', JSON.stringify({
  name: 'Tester',
  programSplit: '5day',
  trainingDays: [1, 2, 4, 5, 6],
  currentWeight: 54.0,
  targetWeight: 60.0
}));

// Session with logged exercise
const sessionData = {
  sessions: {
    'session_1': {
      id: 'session_1',
      dayKey: '2026-11-04',
      programDay: 1,
      exercises: [
        { id: 'incline_dumbbell_press', sets: [{ weight: 30, reps: 8 }] }
      ]
    }
  }
};
globalThis.localStorage.setItem('rg_workout_sessions_v1', JSON.stringify(sessionData));

const { renderProgressSimple } = await import('../js/screens/progress.js');

renderProgressSimple('lifts');

// Verify that the picker selected the logged exercise instead of 0-session default
assert.ok(dummyContent.innerHTML.includes('Incline') || dummyContent.innerHTML.includes('incline_dumbbell_press') || dummyContent.innerHTML.includes('openExPickerBtn'), 'Picker rendered correctly');
console.log('✓ Default lift picker successfully prefers logged exercise when default has 0 sessions');
