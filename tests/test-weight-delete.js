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
  createElement: () => ({ className: '', style: {}, remove: () => {}, querySelector: () => ({ onclick: null }), querySelectorAll: () => [] }),
  body: { appendChild: () => {} }
};

async function run() {
  console.log('--- Testing Weight Log Deletion and Management ---');

  // Initialize profile in localStorage
  const initialProfile = {
    targetWeight: 60,
    weightEntries: [
      { id: 'weight_1001', dayKey: '2026-11-01', weight: 54.0, createdAt: '2026-11-01T08:00:00' },
      { id: 'weight_1002', dayKey: '2026-11-02', weight: 85.0, createdAt: '2026-11-02T08:00:00' }, // WRONG weight log!
      { id: 'weight_1003', dayKey: '2026-11-03', weight: 54.5, createdAt: '2026-11-03T08:00:00' }
    ]
  };
  global.localStorage.setItem('rg_profile', JSON.stringify(initialProfile));

  const { getState, setProfile } = await import('../js/state.js');
  const { dayRecord, saveDayRecord } = await import('../js/storage.js');
  const { weightEntriesHTML, deleteWeightEntry } = await import('../js/screens/progress/history.js');
  const { getRollingWeightValues, progressPlot } = await import('../js/screens/progress/charts.js');

  setProfile(initialProfile);
  const profile = getState().profile;

  const rec2 = dayRecord('2026-11-02');
  rec2.weight = 85.0;
  saveDayRecord('2026-11-02', rec2);

  // 1. Verify initial state
  assert.strictEqual(profile.weightEntries.length, 3, 'Initial entries must be 3');
  assert.strictEqual(dayRecord('2026-11-02').weight, 85.0, 'Day record must have 85.0');

  // 2. Test weightEntriesHTML contains Delete option for the wrong entry
  const html = weightEntriesHTML(profile.weightEntries);
  assert.ok(html.includes('data-delete-weight="weight_1002"'), 'Must have delete button for weight_1002');
  assert.ok(html.includes('85.0 <span'), 'Must show 85.0 kg');
  assert.ok(html.includes('Delete</button>'), 'Delete button label must exist');

  // 3. Test progressPlot and chart point groups have data-id
  const rollingValues = getRollingWeightValues(profile.weightEntries);
  assert.strictEqual(rollingValues[1].id, 'weight_1002', 'Point item must have id');
  const chartHtml = progressPlot(rollingValues, 60, 'kg', false);
  assert.ok(chartHtml.includes('data-id="weight_1002"'), 'Chart point group must have data-id for weight_1002');

  // 4. Test deleteWeightEntry
  global.confirm = () => true;
  deleteWeightEntry('weight_1002');

  // Verify wrong entry was deleted
  assert.strictEqual(profile.weightEntries.length, 2, 'Entries should now be 2');
  assert.ok(!profile.weightEntries.some(e => e.id === 'weight_1002'), 'weight_1002 must be removed');
  assert.strictEqual(dayRecord('2026-11-02').weight, null, 'dayRecord(2026-11-02).weight must be cleared');

  // 5. Test legacy entry deletion
  saveDayRecord('2026-10-31', { weight: 53.8 });
  assert.strictEqual(dayRecord('2026-10-31').weight, 53.8, 'Legacy weight must exist');

  deleteWeightEntry('legacy_2026-10-31');
  assert.strictEqual(dayRecord('2026-10-31').weight, null, 'Legacy weight must be cleared from dayRecord');

  console.log('✓ All Weight Log Deletion tests passed with 100% success!');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
