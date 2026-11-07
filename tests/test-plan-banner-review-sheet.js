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
  removeEventListener: () => {}
};

class MockElement {
  constructor(tag) {
    this.tagName = (tag || 'div').toUpperCase();
    this.classList = {
      _classes: new Set(),
      add: (c) => this.classList._classes.add(c),
      remove: (c) => this.classList._classes.delete(c),
      contains: (c) => this.classList._classes.has(c)
    };
    this.style = {};
    this.children = [];
    this.parentNode = null;
    this.attributes = {};
    this.value = '';
    this.textContent = '';
    this._innerHTML = '';
    this.onclick = null;
    this.listeners = {};
  }
  get innerHTML() { return this._innerHTML; }
  set innerHTML(html) {
    this._innerHTML = html;
    if (html.includes('id="dialogConfirmBtn"')) {
      const btn = new MockElement('button');
      btn.id = 'dialogConfirmBtn';
      this.appendChild(btn);
    }
    if (html.includes('id="closePlanReviewBtn"')) {
      const btn = new MockElement('button');
      btn.id = 'closePlanReviewBtn';
      this.appendChild(btn);
    }
    if (html.includes('id="resetWeekPlanBtn"')) {
      const btn = new MockElement('button');
      btn.id = 'resetWeekPlanBtn';
      btn.textContent = 'Reset plan';
      this.appendChild(btn);
    }
  }
  setAttribute(k, v) { this.attributes[k] = String(v); }
  getAttribute(k) { return this.attributes[k] || null; }
  appendChild(child) {
    this.children.push(child);
    child.parentNode = this;
    return child;
  }
  removeChild(child) {
    const idx = this.children.indexOf(child);
    if (idx !== -1) {
      this.children.splice(idx, 1);
      child.parentNode = null;
    }
    return child;
  }
  remove() {
    if (this.parentNode) this.parentNode.removeChild(this);
  }
  addEventListener(event, fn) {
    this.listeners[event] = this.listeners[event] || [];
    this.listeners[event].push(fn);
  }
  removeEventListener(event, fn) {}
  querySelector(sel) {
    return this.querySelectorAll(sel)[0] || null;
  }
  querySelectorAll(sel) {
    const results = [];
    const check = (node) => {
      let match = false;
      if (sel === '#resetWeekPlanBtn' && node.id === 'resetWeekPlanBtn') match = true;
      if (sel === '#closePlanReviewBtn' && node.id === 'closePlanReviewBtn') match = true;
      if (sel === '#dialogConfirmBtn' && node.id === 'dialogConfirmBtn') match = true;
      if (match) results.push(node);
      (node.children || []).forEach(check);
    };
    check(this);
    return results;
  }
}

const mockBody = new MockElement('body');
global.document = {
  body: mockBody,
  createElement: (tag) => new MockElement(tag),
  getElementById: (id) => null,
  addEventListener: () => {},
  removeEventListener: () => {}
};

async function run() {
  console.log('--- Testing Plan Banner Review Bottom Sheet (U2) ---');

  const { saveWeekOverrides, setCatchupDecision, getWeekOverrides, getCatchupDecisions } = await import('../js/storage-catchup.js');
  const { openThisWeeksPlanSheet } = await import('../js/screens/today/review-plan-sheet.js');
  const { saveDayRecord, dayRecord } = await import('../js/storage.js');

  const mondayDate = '2026-11-02';
  const tuesdayDate = '2026-11-03';

  // Setup: Simulated applied slide decision
  setCatchupDecision(mondayDate, 'slid');
  saveWeekOverrides({ [tuesdayDate]: 0 });
  saveDayRecord(tuesdayDate, { isMerged: true, catchupFrom: mondayDate });

  assert.strictEqual(getCatchupDecisions()[mondayDate], 'slid');
  assert.strictEqual(getWeekOverrides()[tuesdayDate], 0);

  let refreshed = false;
  openThisWeeksPlanSheet({
    currentDateKey: tuesdayDate,
    refreshCallback: () => { refreshed = true; }
  });

  // Check that the sheet was appended
  assert.strictEqual(mockBody.children.length, 1, 'Review sheet attached');
  const sheetOverlay = mockBody.children[0];
  assert.ok(sheetOverlay.innerHTML.includes("This week's plan"), 'Title is "This week\'s plan"');
  assert.ok(sheetOverlay.innerHTML.includes('Reset plan'), 'Contains Reset plan button');

  // Test reset confirmation with mock
  const resetBtn = sheetOverlay.querySelector('#resetWeekPlanBtn');
  assert.ok(resetBtn, 'Reset button found');

  // Trigger reset click
  const resetPromise = resetBtn.onclick();

  // Find the in-app confirmation dialog
  const dialogOverlay = mockBody.children.find(c => c.innerHTML.includes('Reset this week'));
  assert.ok(dialogOverlay, 'Confirm dialog overlay created with expected title');
  const confirmBtn = dialogOverlay.querySelector('#dialogConfirmBtn');
  assert.ok(confirmBtn, 'Dialog confirm button found');
  confirmBtn.onclick();
  await resetPromise;

  // Verify plan was reset
  assert.strictEqual(Object.keys(getWeekOverrides()).length, 0, 'Overrides cleared');
  assert.strictEqual(getCatchupDecisions()[mondayDate], undefined, 'Decision removed');
  assert.strictEqual(dayRecord(tuesdayDate).isMerged, undefined, 'isMerged removed from day record');
  assert.strictEqual(refreshed, true, 'refreshCallback executed');

  console.log('--- U2 Plan Banner Review Bottom Sheet Tests Passed! ---');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
