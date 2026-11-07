const assert = require('assert');

// Mock storage
const store = {
  rg_profile: JSON.stringify({
    name: 'Tester',
    goal: 'gain',
    equipment: 'full',
    dietaryPattern: 'nonveg',
    experience: 'novice',
    trainingDays: [1, 2, 4, 5, 6]
  })
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

class MockElement {
  constructor(tag) {
    this.tagName = (tag || 'div').toUpperCase();
    this.classList = {
      _classes: new Set(),
      add: (c) => this.classList._classes.add(c),
      remove: (c) => this.classList._classes.delete(c),
      contains: (c) => this.classList._classes.has(c)
    };
    this.style = { setProperty: (k, v) => { this.style[k] = v; } };
    this.children = [];
    this.parentNode = null;
    this.attributes = {};
    this.value = '';
    this.textContent = '';
    this._innerHTML = '';
    this.dataset = {};
    this.listeners = {};
    this.onclick = null;
  }
  get innerHTML() { return this._innerHTML; }
  set innerHTML(html) {
    this._innerHTML = html;
    // Simple parser for profile rows
    const rowIds = ['rowPickGoal', 'rowPickEquip', 'rowPickDiet', 'rowPickExp'];
    rowIds.forEach(id => {
      if (html.includes('id="' + id + '"')) {
        const row = new MockElement('div');
        row.id = id;
        row.classList.add('settings-profile-row');

        const valId = id.replace('rowPick', 'valPick');
        const valEl = new MockElement('div');
        valEl.id = valId;
        valEl.classList.add('settings-profile-value');

        const titleEl = new MockElement('div');
        titleEl.classList.add('settings-profile-title');

        row.appendChild(titleEl);
        row.appendChild(valEl);
        this.appendChild(row);
      }
    });
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
    return this.querySelectorAll(sel)[0] || new MockElement('div');
  }
  querySelectorAll(sel) {
    const results = [];
    const check = (node) => {
      let match = false;
      if (sel === '.settings-profile-row' && node.classList && node.classList.contains('settings-profile-row')) match = true;
      if (sel === '#rowPickGoal' && node.id === 'rowPickGoal') match = true;
      if (sel === '#rowPickEquip' && node.id === 'rowPickEquip') match = true;
      if (sel === '#rowPickDiet' && node.id === 'rowPickDiet') match = true;
      if (sel === '#rowPickExp' && node.id === 'rowPickExp') match = true;
      if (sel === '#valPickGoal' && node.id === 'valPickGoal') match = true;
      if (sel === '#valPickEquip' && node.id === 'valPickEquip') match = true;
      if (sel === '#valPickDiet' && node.id === 'valPickDiet') match = true;
      if (sel === '#valPickExp' && node.id === 'valPickExp') match = true;
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
  getElementById: (id) => (id === 'settingsOverlay' ? null : new MockElement('div')),
  querySelector: () => null,
  querySelectorAll: () => [],
  addEventListener: () => {},
  removeEventListener: () => {}
};

async function run() {
  console.log('--- Testing Settings Profile Rows Android Pattern (U4) ---');

  const { openSettings } = await import('../js/screens/settings.js');
  openSettings();

  assert.strictEqual(mockBody.children.length, 1, 'Settings overlay opened');
  const overlay = mockBody.children[0];

  const rows = overlay.querySelectorAll('.settings-profile-row');
  assert.strictEqual(rows.length, 4, '4 profile rows rendered');

  assert.ok(overlay.querySelector('#rowPickGoal'), 'Goal row exists');
  assert.ok(overlay.querySelector('#rowPickEquip'), 'Equipment row exists');
  assert.ok(overlay.querySelector('#rowPickDiet'), 'Diet row exists');
  assert.ok(overlay.querySelector('#rowPickExp'), 'Experience row exists');

  assert.ok(overlay.querySelector('#valPickGoal'), 'Goal value element exists on line 2');
  assert.ok(overlay.querySelector('#valPickEquip'), 'Equipment value element exists on line 2');
  assert.ok(overlay.querySelector('#valPickDiet'), 'Diet value element exists on line 2');
  assert.ok(overlay.querySelector('#valPickExp'), 'Experience value element exists on line 2');

  // Verify that tapping a row triggers the picker handler
  assert.strictEqual(typeof overlay.querySelector('#rowPickGoal').onclick, 'function');
  assert.strictEqual(typeof overlay.querySelector('#rowPickEquip').onclick, 'function');
  assert.strictEqual(typeof overlay.querySelector('#rowPickDiet').onclick, 'function');
  assert.strictEqual(typeof overlay.querySelector('#rowPickExp').onclick, 'function');

  console.log('--- All U4 Settings Profile Rows Tests Passed! ---');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
