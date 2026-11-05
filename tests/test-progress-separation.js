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
let contentHTML = '';
global.location = { hash: '', search: '' };
global.window = {
  localStorage: global.localStorage,
  location: global.location,
  addEventListener: () => {},
  removeEventListener: () => {},
  scrollTo: () => {}
};
global.document = {
  activeElement: null,
  addEventListener: () => {},
  removeEventListener: () => {},
  querySelector: () => null,
  querySelectorAll: () => [],
  getElementById: (id) => {
    if (id === 'content') {
      return {
        get innerHTML() { return contentHTML; },
        set innerHTML(val) { contentHTML = val; },
        addEventListener: () => {},
        classList: { add: () => {}, remove: () => {} }
      };
    }
    return {
      innerHTML: '',
      textContent: '',
      style: {},
      focus: () => {},
      addEventListener: () => {},
      classList: { add: () => {}, remove: () => {} },
      querySelector: () => null,
      querySelectorAll: () => []
    };
  },
  createElement: () => ({ className: '', style: {}, remove: () => {}, querySelector: () => ({ onclick: null }), querySelectorAll: () => [] }),
  body: { appendChild: () => {} }
};

async function run() {
  console.log('--- Testing Progress Screen Separation (Body vs Lifts) ---');

  const initialProfile = {
    targetWeight: 60,
    weightEntries: [
      { id: 'weight_1', dayKey: '2026-11-01', weight: 54.0, createdAt: '2026-11-01T08:00:00' }
    ]
  };
  global.localStorage.setItem('rg_profile', JSON.stringify(initialProfile));

  const { setProfile } = await import('../js/state.js');
  setProfile(initialProfile);

  const { renderProgressSimple } = await import('../js/screens/progress.js');

  // 1. Render Body screen
  renderProgressSimple('body');
  const bodyScreen = contentHTML;

  assert.ok(bodyScreen.includes('id="bodyProgressBtn"') && bodyScreen.includes('seg-tab-btn active'), 'Body tab button must be active');
  assert.ok(bodyScreen.includes('Consistency ·') || bodyScreen.includes('dot-grid'), 'Consistency calendar must be on Body screen');
  assert.ok(bodyScreen.includes('id="weightPlot"'), 'Weight plot must be on Body screen');
  assert.ok(bodyScreen.includes('id="progressWeight"'), 'Log weight input must be on Body screen');
  assert.ok(bodyScreen.includes('id="weightEntriesContainer"'), 'Weight entries container must be on Body screen');
  assert.ok(bodyScreen.includes('Nutrition · Last 7 days'), 'Nutrition must be on Body screen');
  // Body screen must NOT be cluttered with workout sessions
  assert.ok(!bodyScreen.includes('history-session-header'), 'Body screen must NOT contain workout history session cards');
  assert.ok(!bodyScreen.includes('id="liftSelect"'), 'Body screen must NOT contain liftSelect');

  // 2. Render Lifts screen
  renderProgressSimple('lifts');
  const liftsScreen = contentHTML;

  assert.ok(liftsScreen.includes('id="liftProgressBtn"') && liftsScreen.includes('seg-tab-btn active'), 'Lifts tab button must be active');
  assert.ok(liftsScreen.includes('id="liftSelect"'), 'Exercise picker must be on Lifts screen');
  assert.ok(liftsScreen.includes('id="liftPlot"'), 'Lift plot must be on Lifts screen');
  assert.ok(liftsScreen.includes('Weekly work · Sets last 7 days'), 'Weekly work must be on Lifts screen');
  // Lifts screen must NOT be cluttered with consistency calendar or bodyweight
  assert.ok(!liftsScreen.includes('Consistency ·'), 'Lifts screen must NOT contain consistency calendar');
  assert.ok(!liftsScreen.includes('id="weightPlot"'), 'Lifts screen must NOT contain weightPlot');
  assert.ok(!liftsScreen.includes('id="progressWeight"'), 'Lifts screen must NOT contain progressWeight input');
  assert.ok(!liftsScreen.includes('Nutrition · Last 7 days'), 'Lifts screen must NOT contain Nutrition');

  console.log('✓ Progress Screen Separation verified with 100% success!');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
