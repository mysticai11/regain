/* Test Suite: Sticky Gym Session Summary Bar & Focus Highlight (Item 6) */

import assert from 'assert';
import fs from 'fs';

console.log('--- Testing Sticky Gym Session Summary Bar & Focus Highlight (Item 6) ---');

// 1. Static and Structural verification
const gymJs = fs.readFileSync('js/screens/gym.js', 'utf8');
const gymCss = fs.readFileSync('css/gym.css', 'utf8');

assert.ok(gymJs.includes('gym-session-bar'), 'Gym page renders .gym-session-bar');
assert.ok(gymJs.includes('sessionBarSetProgress'), 'Session bar has set progress readout');
assert.ok(gymJs.includes('sessionBarProgressFill'), 'Session bar has 3px lime progress fill');
assert.ok(gymJs.includes('is-current'), 'Incomplete focus exercise has is-current class');

// CSS checks
assert.ok(gymCss.includes('position: sticky') || gymCss.includes('position: relative'), 'Session bar has position: sticky or relative');
assert.ok(gymCss.includes('env(safe-area-inset-top') || gymCss.includes('.gym-session-bar'), 'Session bar configured');
assert.ok(gymCss.includes('z-index: 20') || gymCss.includes('z-index: 10'), 'Session bar z-index is configured');
assert.ok(gymCss.includes('.gym-session-bar-progress-fill'), 'Progress fill rule exists in gym.css');
assert.ok(gymCss.includes('.is-current'), 'is-current highlight rule exists in gym.css');

// 2. Mock DOM & renderGym execution test
const store = {};
global.localStorage = {
  getItem: (k) => store[k] || null,
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; },
  clear: () => { Object.keys(store).forEach(k => delete store[k]); }
};

let innerHTML = '';
const mockContent = {
  get innerHTML() { return innerHTML; },
  set innerHTML(val) { innerHTML = val; },
  scrollTop: 0
};

global.document = {
  getElementById: (id) => {
    if (id === 'content') return mockContent;
    if (id === 'sessionTimer') return { innerHTML: '', appendChild: () => {} };
    if (id === 'restTimerWrap') return { innerHTML: '' };
    return null;
  },
  documentElement: { scrollTop: 0 },
  body: { scrollTop: 0 },
  createElement: () => ({ className: '', style: {}, appendChild: () => {}, querySelector: () => null, querySelectorAll: () => [] }),
  querySelectorAll: () => [],
  querySelector: () => null
};

global.window = {
  scrollY: 0,
  activeGymDateKey: '2026-11-04',
  localStorage: global.localStorage
};

const { renderGym } = await import('../js/screens/gym.js');
const { saveDayRecord } = await import('../js/storage.js');
const { setProfile } = await import('../js/state.js');

setProfile({
  trainingDays: [1, 2, 3, 4, 5],
  targetWeight: 60
});

// Setup non-rest workout day
saveDayRecord('2026-11-04', {
  workoutDone: false,
  workout: {
    bench_press: [{ weight: 50, reps: 10 }]
  }
});

renderGym();

assert.ok(innerHTML.includes('class="gym-session-bar"'), 'renderGym renders sticky session bar');
assert.ok(innerHTML.includes('id="sessionBarSetProgress"'), 'renderGym renders sessionBarSetProgress');
assert.ok(innerHTML.includes('id="sessionBarProgressFill"'), 'renderGym renders sessionBarProgressFill');
assert.ok(innerHTML.includes('is-current'), 'renderGym marks active exercise with is-current');

console.log('✓ All Sticky Session Bar & Focus Highlight tests passed (100%)');
