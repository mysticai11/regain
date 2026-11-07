/* Test Suite: Weight Save Debounce & Deduplication */

import assert from 'assert';

console.log('--- Testing Weight Save Debounce & Deduplication ---');

// Mock localStorage
const store = {};
global.localStorage = {
  getItem: (k) => store[k] || null,
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; },
  clear: () => { Object.keys(store).forEach(k => delete store[k]); }
};

// Mock DOM
let lastToast = null;
global.location = { hash: '', search: '' };
global.window = {
  location: global.location,
  localStorage: global.localStorage,
  addEventListener: () => {},
  removeEventListener: () => {},
  scrollTo: () => {}
};

const domElements = {};
global.document = {
  activeElement: null,
  addEventListener: () => {},
  removeEventListener: () => {},
  querySelector: () => null,
  querySelectorAll: () => [],
  getElementById: (id) => {
    if (!domElements[id]) domElements[id] = { innerHTML: '', value: '', style: {}, focus: () => {}, addEventListener: () => {}, querySelector: () => null, querySelectorAll: () => [] };
    return domElements[id];
  },
  createElement: () => ({ className: '', style: {}, remove: () => {}, querySelector: () => ({ onclick: null }), querySelectorAll: () => [], addEventListener: () => {} }),
  body: { appendChild: () => {} }
};

async function run() {
  const { setProfile, getState } = await import('../js/state.js');
  const { dayRecord, saveDayRecord, sv } = await import('../js/storage.js');
  const { todayKey } = await import('../js/lib/format.js');

  const initialProfile = {
    onboardingComplete: true,
    targetWeight: 60,
    weightEntries: []
  };
  global.localStorage.setItem('rg_profile', JSON.stringify(initialProfile));
  setProfile(initialProfile);

  const { renderProgressSimple } = await import('../js/screens/progress.js');
  const toastModule = await import('../js/components/toast.js');

  // Setup DOM elements for progress screen
  domElements['content'] = { innerHTML: '', style: {} };
  domElements['bodyProgressBtn'] = { onclick: null };
  domElements['liftProgressBtn'] = { onclick: null };
  domElements['historyProgressBtn'] = { onclick: null };

  renderProgressSimple('body');

  const pInput = document.getElementById('progressWeight');
  const saveBtn = document.getElementById('saveProgressWeight');

  assert.ok(pInput, 'progressWeight input must exist');
  assert.ok(saveBtn, 'saveProgressWeight button must exist');
  assert.strictEqual(typeof saveBtn.onclick, 'function', 'Save button must have onclick handler');

  // 1. First save: 55.4 kg
  pInput.value = '55.4';
  saveBtn.onclick();

  let curProfile = getState().profile;
  assert.strictEqual(curProfile.weightEntries.length, 1, 'First save should record 1 entry');
  assert.strictEqual(curProfile.weightEntries[0].weight, 55.4);
  assert.strictEqual(dayRecord(todayKey()).weight, 55.4);

  // 2. Immediate second click with identical weight within same minute (duplicate)
  // Should debounce/dedupe, ignore the save, and show 'Already logged'
  saveBtn.onclick();

  curProfile = getState().profile;
  assert.strictEqual(curProfile.weightEntries.length, 1, 'Duplicate save within same minute must NOT add a second entry');

  // 3. Different weight within same minute should be allowed (e.g. user corrected 55.4 to 55.6)
  pInput.value = '55.6';
  saveBtn.onclick();

  curProfile = getState().profile;
  assert.strictEqual(curProfile.weightEntries.length, 2, 'Different weight should be allowed');
  assert.strictEqual(curProfile.weightEntries[1].weight, 55.6);
  assert.strictEqual(dayRecord(todayKey()).weight, 55.6);

  console.log('✓ Weight Save Deduplication and Minute Debounce Verified 100%!');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
