const assert = require('assert');
const fs = require('fs');
const path = require('path');

// Mock localStorage
const store = {
  rg_profile: JSON.stringify({ name: 'Tester', trainingDays: [1, 2, 4, 5, 6] })
};
global.localStorage = {
  getItem: (k) => store[k] || null,
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; },
  clear: () => { Object.keys(store).forEach(k => delete store[k]); }
};

global.window = {
  localStorage: global.localStorage,
  addEventListener: () => {},
  removeEventListener: () => {}
};

global.document = {
  body: { appendChild: () => {} },
  createElement: () => ({ setAttribute: () => {}, querySelector: () => null, querySelectorAll: () => [] }),
  getElementById: () => null,
  querySelector: () => null,
  querySelectorAll: () => [],
  addEventListener: () => {},
  removeEventListener: () => {}
};

async function run() {
  console.log('--- Testing History Segmented Control (U6) ---');

  const { buildHistoryScreenHTML } = await import('../js/screens/progress/digests.js');

  // 1. Test HTML generation for 'weeks' tab
  const htmlWeeks = buildHistoryScreenHTML('weeks');
  assert.ok(htmlWeeks.includes('class="seg"') || htmlWeeks.includes('class="history-segmented-control"'), 'Uses segmented control container');
  assert.ok(htmlWeeks.includes('id="historyTabWeeksBtn">Past Weeks</button>'), 'Weeks button present');
  assert.ok(htmlWeeks.includes('aria-selected="true"') || htmlWeeks.includes('active'), 'Active state indicated');

  // 2. Test HTML generation for 'months' tab
  const htmlMonths = buildHistoryScreenHTML('months');
  assert.ok(htmlMonths.includes('id="historyTabWeeksBtn">Past Weeks</button>'), 'Weeks button present');
  assert.ok(htmlMonths.includes('id="historyTabMonthsBtn">Past Months</button>'), 'Months button present');

  // 3. Verify CSS properties in css/progress.css
  const cssContent = fs.readFileSync(path.join(__dirname, '../css/progress.css'), 'utf8');
  assert.ok(cssContent.includes('.history-segmented-control'), '.history-segmented-control defined');
  assert.ok(cssContent.includes('height: 44px'), 'Container has 44px height');
  assert.ok(cssContent.includes('padding: 4px'), 'Container has 4px inner padding');
  assert.ok(cssContent.includes('.history-segment-btn'), '.history-segment-btn defined');
  assert.ok(cssContent.includes('line-height: 1'), 'Line height 1 for optical centering');
  assert.ok(cssContent.includes('200ms cubic-bezier(0.2, 0, 0, 1)'), '200ms smooth transition');

  console.log('--- All U6 History Segmented Control Tests Passed! ---');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
