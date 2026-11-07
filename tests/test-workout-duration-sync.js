import assert from 'assert';

console.log('--- Testing Workout Duration Synchronization across Today, Logger, and History ---');

// Mock localStorage
globalThis.localStorage = {
  _store: {},
  getItem(k) { return this._store[k] || null; },
  setItem(k, v) { this._store[k] = String(v); },
  removeItem(k) { delete this._store[k]; },
  clear() { this._store = {}; }
};

const { todayKey } = await import('../js/lib/format.js');
const today = todayKey();

globalThis.localStorage.setItem('rg_profile', JSON.stringify({
  name: 'Tester',
  programSplit: '5day',
  trainingDays: [0, 1, 2, 3, 4],
  currentWeight: 54.0,
  targetWeight: 60.0
}));

// Session with 2700 seconds (45 min)
const dayRec = {
  workoutDone: true,
  selectedWorkout: 0,
  workoutMeta: {
    duration_sec: 2700
  },
  workout: {
    bench: [{ weight: 60, reps: 8 }]
  }
};
globalThis.localStorage.setItem('rg_day_' + today, JSON.stringify(dayRec));

const sessionData = {
  version: 3,
  sessions: {
    'sess_1': {
      id: 'sess_1',
      dayKey: today,
      duration_sec: 2700,
      completed: true,
      exercises: [
        { id: 'bench', sets: [{ weight: 60, reps: 8 }] }
      ]
    }
  }
};
globalThis.localStorage.setItem('rg_workout_sessions', JSON.stringify(sessionData));

globalThis.window = {
  activeTodaySelectedDateKey: today,
  addEventListener: () => {},
  removeEventListener: () => {}
};

const dummyContent = { innerHTML: '', addEventListener: () => {} };
globalThis.document = {
  body: { classList: { add: () => {}, remove: () => {} }, appendChild: () => {}, addEventListener: () => {} },
  addEventListener: () => {},
  removeEventListener: () => {},
  getElementById: (id) => (id === 'content' ? dummyContent : { style: {}, classList: { add: () => {}, remove: () => {} } }),
  querySelector: () => null,
  querySelectorAll: () => []
};

const { renderTodaySimple } = await import('../js/screens/today.js');
const { workoutHistoryHTML } = await import('../js/screens/progress/history.js');

renderTodaySimple();
const todayHTML = dummyContent.innerHTML;
const historyHTML = workoutHistoryHTML();

// Both must display 45 min
assert.ok(todayHTML.includes('45 min'), 'Today screen must show 45 min, not 35 min');
assert.ok(historyHTML.includes('45 min'), 'History screen must show 45 min');

console.log('✓ Duration synchronization test passed: Today and History both correctly resolve 45 min from 2700 duration_sec');
