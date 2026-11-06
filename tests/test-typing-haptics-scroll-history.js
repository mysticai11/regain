import assert from 'assert';

console.log('--- Testing Typing, Haptics Mute, Food Scroll, and Weekly History Jump ---');

// Mock DOM & storage
globalThis.localStorage = {
  _store: {},
  getItem(k) { return this._store[k] || null; },
  setItem(k, v) { this._store[k] = String(v); },
  removeItem(k) { delete this._store[k]; },
  clear() { this._store = {}; }
};

let scheduleCount = 0;
globalThis.window = {
  activeGymDateKey: '2026-11-06',
  scheduleStateNotification: function() { scheduleCount++; },
  addEventListener: () => {},
  removeEventListener: () => {},
  tab: 'gym'
};

const dummyBody = { classList: { add: () => {}, remove: () => {} }, appendChild: () => {}, addEventListener: () => {} };
const dummyContent = { innerHTML: '', scrollTop: 450, addEventListener: () => {} };
const dummyApp = { innerHTML: '', addEventListener: () => {} };

globalThis.document = {
  body: dummyBody,
  addEventListener: () => {},
  removeEventListener: () => {},
  getElementById: function(id) {
    if (id === 'content') return dummyContent;
    if (id === 'app') return dummyApp;
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
  querySelector: function() { return null; },
  querySelectorAll: function() { return []; },
  createElement: function() {
    return {
      style: {},
      classList: { add: () => {}, remove: () => {} },
      appendChild: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      querySelector: () => null,
      querySelectorAll: () => []
    };
  }
};

// 1. Test Silent saveDayRecord does not trigger scheduleStateNotification
console.log('\n[1/4] Testing silent saveDayRecord for input drafts...');
const { saveDayRecord, dayRecord } = await import('../js/storage.js');
const { subscribe } = await import('../js/state.js');

scheduleCount = 0;
subscribe(function() {
  scheduleCount++;
});

saveDayRecord('2026-11-06', { test: 1, workout: { bench_press: [{ weight: 80, reps: 8 }] } }, { silent: true });
// Give any microtask or tick a moment
await new Promise(resolve => setTimeout(resolve, 20));
assert.strictEqual(scheduleCount, 0, 'Silent saveDayRecord with active workout sets must NOT trigger state subscribers');

saveDayRecord('2026-11-06', { test: 2 });
await new Promise(resolve => setTimeout(resolve, 20));
assert.ok(scheduleCount >= 1, 'Standard saveDayRecord notifies state subscribers');
console.log('✓ Verified: Draft input typing with silent: true prevents unwanted re-renderings.');

// 2. Test Haptics Mute option
console.log('\n[2/4] Testing haptics mute behavior...');
const { triggerHaptic } = await import('../js/lib/dom.js');
let vibrateCalled = false;
globalThis.window.Capacitor = {
  isPluginAvailable: (name) => name === 'Haptics',
  Plugins: {
    Haptics: {
      vibrate: function() { vibrateCalled = true; }
    }
  }
};

const { profile, setProfile } = await import('../js/state.js');
setProfile({ hapticsMuted: false });
globalThis.window.profile = { hapticsMuted: false };

// When haptics active
globalThis.window.profile.hapticsMuted = false;
vibrateCalled = false;
triggerHaptic();
assert.strictEqual(vibrateCalled, true, 'Haptic should trigger when not muted');

// When haptics muted
globalThis.window.profile.hapticsMuted = true;
vibrateCalled = false;
triggerHaptic();
assert.strictEqual(vibrateCalled, false, 'Haptic must NOT trigger when profile.hapticsMuted is true');
console.log('✓ Verified: Haptics respect profile.hapticsMuted setting.');

// 3. Test Scroll Preservation in renderTodaySimple
console.log('\n[3/4] Testing scroll position preservation on Today screen...');
const { renderTodaySimple, addFoodToDay } = await import('../js/screens/today.js');

dummyContent.scrollTop = 320;
renderTodaySimple();
assert.strictEqual(dummyContent.scrollTop, 320, 'renderTodaySimple must preserve scrollTop across re-renders');

// Simulate adding food
addFoodToDay('2026-11-06', { name: 'Banana', kcal: 105, protein: 1, carbs: 27, fat: 0.3 }, 1);
assert.strictEqual(dummyContent.scrollTop, 320, 'addFoodToDay must preserve scrollTop instead of jumping to top');
console.log('✓ Verified: Logging foods preserves content.scrollTop (no jumping to top).');

// 4. Test Weekly History [data-jump-day] Navigation
console.log('\n[4/4] Testing weekly history jump to day...');
const { wireHistoryScreenEvents } = await import('../js/screens/progress/digests.js');

let targetDateJumped = null;
let setTabCalledWith = null;
globalThis.window.setTab = function(t) { setTabCalledWith = t; };

const jumpBtn = {
  dataset: { jumpDay: '2026-10-24' },
  onclick: null
};

const mockContainer = {
  querySelector: () => null,
  querySelectorAll: function(sel) {
    if (sel === '[data-jump-day]') return [jumpBtn];
    return [];
  }
};

wireHistoryScreenEvents(mockContainer);
assert.ok(typeof jumpBtn.onclick === 'function', 'Jump button onclick must be wired');

jumpBtn.onclick({ stopPropagation: () => {} });
assert.strictEqual(globalThis.window.activeTodaySelectedDateKey, '2026-10-24', 'Selected day must be set on window');
assert.strictEqual(setTabCalledWith, 'today', 'Must invoke window.setTab("today") to render the day view');
console.log('✓ Verified: Clicking historical day properly opens and navigates to the Today dashboard.');

console.log('\n======================================================');
console.log(' ALL 4 BUG FIX TESTS PASSED WITH 100% SUCCESS! ');
console.log('======================================================');
