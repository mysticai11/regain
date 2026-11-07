const assert = require('assert');

// Mock storage
const store = {
  rg_profile: JSON.stringify({ name: 'Tester', onboarded: true, trainingDays: [1, 2, 4, 5, 6] })
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
      contains: (c) => this.classList._classes.has(c),
      toggle: (c, force) => {
        if (force !== undefined) {
          if (force) this.classList._classes.add(c);
          else this.classList._classes.delete(c);
        } else {
          if (this.classList._classes.has(c)) this.classList._classes.delete(c);
          else this.classList._classes.add(c);
        }
      }
    };
    this.style = {
      setProperty: (k, v) => { this.style[k] = v; }
    };
    this.children = [];
    this.parentNode = null;
    this.attributes = {};
    this.value = '';
    this.textContent = '';
    this._innerHTML = '';
    this.dataset = {};
    this.listeners = {};
  }
  get innerHTML() { return this._innerHTML; }
  set innerHTML(html) {
    this._innerHTML = html;
    // Parse day toggles
    const regex = /<button[^>]*class="([^"]*)"[^>]*data-day="(\d+)"[^>]*aria-label="([^"]*)"[^>]*aria-pressed="([^"]*)"[^>]*>([A-Z])<\/button>/g;
    let match;
    while ((match = regex.exec(html)) !== null) {
      const btn = new MockElement('button');
      match[1].split(' ').filter(Boolean).forEach(c => btn.classList.add(c));
      btn.dataset.day = match[2];
      btn.setAttribute('aria-label', match[3]);
      btn.setAttribute('aria-pressed', match[4]);
      btn.textContent = match[5];
      this.appendChild(btn);
    }
    if (html.includes('id="trainingDaysSubtitle"')) {
      const sub = new MockElement('div');
      sub.id = 'trainingDaysSubtitle';
      const subMatch = html.match(/id="trainingDaysSubtitle"[^>]*>([^<]+)<\/div>/);
      sub.textContent = subMatch ? subMatch[1] : '';
      this.appendChild(sub);
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
    return this.querySelectorAll(sel)[0] || new MockElement('div');
  }
  querySelectorAll(sel) {
    const results = [];
    const check = (node) => {
      let match = false;
      if (sel === '.day-toggle' && node.classList && node.classList.contains('day-toggle')) match = true;
      if (sel === '#trainingDaysSubtitle' && node.id === 'trainingDaysSubtitle') match = true;
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
  console.log('--- Testing Settings Circular Training Day Buttons (U3) ---');

  const { getProfile, setProfile } = await import('../js/state.js');
  const { openSettings } = await import('../js/screens/settings.js');
  const { saveCatchupSettings } = await import('../js/storage-catchup.js');

  // Set initial training days: Mon(1), Tue(2), Thu(4), Fri(5), Sat(6)
  setProfile({ name: 'Tester', trainingDays: [1, 2, 4, 5, 6] });
  saveCatchupSettings({ protectLastRestDay: true });

  openSettings();

  assert.strictEqual(mockBody.children.length, 1, 'Settings overlay opened');
  const overlay = mockBody.children[0];

  const buttons = overlay.querySelectorAll('.day-toggle');
  assert.strictEqual(buttons.length, 7, '7 circular day buttons rendered');

  // Verify letters: M T W T F S S
  const letters = buttons.map(b => b.textContent);
  assert.deepStrictEqual(letters, ['M', 'T', 'W', 'T', 'F', 'S', 'S'], 'Order is Monday to Sunday (M, T, W, T, F, S, S)');

  // Verify full day labels for accessibility
  const ariaLabels = buttons.map(b => b.getAttribute('aria-label'));
  assert.deepStrictEqual(ariaLabels, ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'], 'Full accessibility labels');

  // Verify initial subtitle
  const subtitle = overlay.querySelector('#trainingDaysSubtitle');
  assert.ok(subtitle, 'Subtitle element exists');
  assert.strictEqual(subtitle.textContent, '5 days a week · Mon, Tue, Thu, Fri, Sat', 'Subtitle matches initial 5 days');

  // 1. Toggle Wednesday (day 3, currently unselected -> now 6 days)
  const wedBtn = buttons[2]; // Wednesday is index 2
  assert.strictEqual(wedBtn.dataset.day, '3');
  assert.strictEqual(wedBtn.classList.contains('active'), false);
  wedBtn.listeners['click'][0]();

  assert.strictEqual(wedBtn.classList.contains('active'), true);
  assert.strictEqual(wedBtn.getAttribute('aria-pressed'), 'true');
  assert.strictEqual(subtitle.textContent, '6 days a week · Mon, Tue, Wed, Thu, Fri, Sat');
  assert.strictEqual(getProfile().trainingDays.length, 6);

  // 2. Try to toggle Sunday (day 0, 7th day) while Protect Rest Day is ON -> should be blocked!
  const sunBtn = buttons[6]; // Sunday is index 6
  assert.strictEqual(sunBtn.dataset.day, '0');
  sunBtn.listeners['click'][0]();

  // Sunday must NOT be added because at least 1 rest day must be protected!
  assert.strictEqual(sunBtn.classList.contains('active'), false);
  assert.strictEqual(getProfile().trainingDays.length, 6, 'Still 6 days, 7th day blocked by protectRestDay');

  // 3. Toggle off Wednesday
  wedBtn.listeners['click'][0]();
  assert.strictEqual(wedBtn.classList.contains('active'), false);
  assert.strictEqual(getProfile().trainingDays.length, 5);
  assert.strictEqual(subtitle.textContent, '5 days a week · Mon, Tue, Thu, Fri, Sat');

  console.log('--- All U3 Circular Training Day Button Tests Passed! ---');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
