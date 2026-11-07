import assert from 'assert';

console.log('--- Testing Gym Screen Rest Day Rendering ---');

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

globalThis.localStorage.setItem('rg_profile', JSON.stringify({
  name: 'Tester',
  programSplit: '5day',
  trainingDays: [1, 2, 4, 5, 6], // Sunday (0) is a rest day
  currentWeight: 54.0,
  targetWeight: 60.0
}));

// Set today as rest day
const dayRec = {
  workoutDone: false,
  selectedWorkout: null // rest day
};
globalThis.localStorage.setItem('rg_day_' + today, JSON.stringify(dayRec));

const dummyContent = { innerHTML: '', addEventListener: () => {}, scrollTop: 0 };
globalThis.document = {
  body: { classList: { add: () => {}, remove: () => {} }, appendChild: () => {}, addEventListener: () => {} },
  addEventListener: () => {},
  removeEventListener: () => {},
  getElementById: (id) => (id === 'content' ? dummyContent : { style: {}, classList: { add: () => {}, remove: () => {} }, onclick: null }),
  querySelector: () => null,
  querySelectorAll: () => []
};

globalThis.window = {
  activeGymDateKey: today,
  scrollTo: () => {},
  addEventListener: () => {},
  removeEventListener: () => {}
};

const { renderGym } = await import('../js/screens/gym.js');

// Must execute without any ReferenceError: buildVolumeTable is not defined
assert.doesNotThrow(() => {
  renderGym();
}, 'renderGym on rest day must not throw');

assert.ok(dummyContent.innerHTML.includes('Rest Day'), 'Content must contain Rest Day banner');
assert.ok(dummyContent.innerHTML.includes('Weekly volume targets'), 'Content must contain Weekly volume targets');
assert.ok(dummyContent.innerHTML.includes('prog-line'), 'Volume table must render progress bars');

console.log('✓ Gym Rest Day render test passed successfully without errors');
