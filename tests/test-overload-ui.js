// Test progressive overload advice badge in gym logger (Task R2-4)

import assert from 'node:assert';
import { buildOverloadAdviceBadgeHTML, wireOverloadToggleEvents } from '../js/screens/gym/helpers.js';

console.log('--- Testing Progressive Overload Advice Badge (Task R2-4) ---');

// 1. All target sets hit max reps -> Increase Weight suggestion
const exTop = { id: 'bench_press', name: 'Barbell Bench Press', sets: 2, repMin: 6, repMax: 10, weightIncrement: 2.5 };
const lastSetsTop = [{ weight: 60, reps: 10 }, { weight: 60, reps: 10 }];
const htmlTop = buildOverloadAdviceBadgeHTML(exTop, lastSetsTop);

assert.ok(htmlTop.includes('data-toggle-overload="bench_press"'), 'Badge includes data-toggle-overload attribute');
assert.ok(htmlTop.includes('Increase Weight'), 'Badge labels Increase Weight when top range reached');
assert.ok(htmlTop.includes('id="overload-rationale-bench_press"'), 'Includes rationale container with matched id');
assert.ok(htmlTop.includes('display:none'), 'Rationale is hidden by default');
assert.ok(htmlTop.includes('aria-expanded="false"'), 'aria-expanded is initially false');

// 2. Under max reps -> Add Reps suggestion
const exMid = { id: 'overhead_press', name: 'Overhead Press', sets: 2, repMin: 6, repMax: 10 };
const lastSetsMid = [{ weight: 40, reps: 7 }, { weight: 40, reps: 6 }];
const htmlMid = buildOverloadAdviceBadgeHTML(exMid, lastSetsMid);

assert.ok(htmlMid.includes('data-toggle-overload="overhead_press"'), 'Badge includes data-toggle-overload attribute');
assert.ok(htmlMid.includes('Add Reps'), 'Badge labels Add Reps when below top of range');
assert.ok(htmlMid.includes('id="overload-rationale-overhead_press"'), 'Includes rationale container');

// 3. Baseline / No prior sets logged
const exNew = { id: 'new_curl', name: 'Bicep Curl', reps: '8-12', sets: 2 };
const htmlNew = buildOverloadAdviceBadgeHTML(exNew, []);
assert.ok(htmlNew.includes('Target: Baseline') || htmlNew.includes('Target'), 'Badge provides target advice for new exercise');

// 4. Edge cases
assert.strictEqual(buildOverloadAdviceBadgeHTML(null), '', 'Null exercise returns empty string');
assert.strictEqual(buildOverloadAdviceBadgeHTML({}), '', 'Exercise without id returns empty string');

// 5. Interactive toggle simulation
let btnListeners = [];
let rationaleStyle = { display: 'none' };
let btnClasses = new Set();
let btnAttrs = { 'aria-expanded': 'false' };

const mockBtn = {
  dataset: { toggleOverload: 'mock_squat' },
  classList: {
    toggle: (cls, force) => {
      if (force === true) btnClasses.add(cls);
      else if (force === false) btnClasses.delete(cls);
      else if (btnClasses.has(cls)) btnClasses.delete(cls);
      else btnClasses.add(cls);
    },
    contains: (cls) => btnClasses.has(cls)
  },
  setAttribute: (k, v) => { btnAttrs[k] = String(v); },
  getAttribute: (k) => btnAttrs[k]
};

const mockRationale = {
  id: 'overload-rationale-mock_squat',
  style: rationaleStyle
};

// Mock DOM container
globalThis.document = globalThis.document || {};
const prevGetElementById = globalThis.document.getElementById;
globalThis.document.getElementById = (id) => {
  if (id === 'overload-rationale-mock_squat') return mockRationale;
  return null;
};

const mockContainer = {
  querySelectorAll: (sel) => {
    if (sel === '[data-toggle-overload]') return [mockBtn];
    return [];
  }
};

wireOverloadToggleEvents(mockContainer);

// Trigger first click: reveal rationale
assert.strictEqual(typeof mockBtn.onclick, 'function', 'Click handler wired to toggle button');
mockBtn.onclick({ preventDefault: () => {} });

assert.strictEqual(mockRationale.style.display, 'block', 'First click reveals rationale');
assert.strictEqual(mockBtn.classList.contains('is-open'), true, 'First click adds is-open class');
assert.strictEqual(mockBtn.getAttribute('aria-expanded'), 'true', 'First click sets aria-expanded to true');

// Trigger second click: collapse rationale
mockBtn.onclick({ preventDefault: () => {} });

assert.strictEqual(mockRationale.style.display, 'none', 'Second click hides rationale');
assert.strictEqual(mockBtn.classList.contains('is-open'), false, 'Second click removes is-open class');
assert.strictEqual(mockBtn.getAttribute('aria-expanded'), 'false', 'Second click sets aria-expanded to false');

// Restore mock
if (prevGetElementById) globalThis.document.getElementById = prevGetElementById;

console.log('✓ All Progressive Overload Advice Badge tests passed (100%)');
