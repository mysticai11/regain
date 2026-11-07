const assert = require('assert');

// Mock browser globals
global.window = {
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
    this.onkeydown = null;
    this.listeners = {};
  }
  get innerHTML() { return this._innerHTML; }
  set innerHTML(html) {
    this._innerHTML = html;
    // Simple parser for buttons & inputs
    if (html.includes('id="dialogConfirmBtn"')) {
      const btn = new MockElement('button');
      btn.id = 'dialogConfirmBtn';
      btn.textContent = html.includes('Delete') ? 'Delete' : 'Confirm';
      this.appendChild(btn);
    }
    if (html.includes('id="dialogCancelBtn"')) {
      const btn = new MockElement('button');
      btn.id = 'dialogCancelBtn';
      btn.textContent = 'Cancel';
      this.appendChild(btn);
    }
    if (html.includes('id="dialogPromptInput"')) {
      const inp = new MockElement('input');
      inp.id = 'dialogPromptInput';
      inp.value = (html.match(/value="([^"]*)"/) || [])[1] || '';
      this.appendChild(inp);
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
  removeEventListener(event, fn) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(f => f !== fn);
    }
  }
  querySelector(sel) {
    return this.querySelectorAll(sel)[0] || null;
  }
  querySelectorAll(sel) {
    const results = [];
    const check = (node) => {
      let match = false;
      if (sel === '#dialogConfirmBtn' && node.id === 'dialogConfirmBtn') match = true;
      if (sel === '#dialogCancelBtn' && node.id === 'dialogCancelBtn') match = true;
      if (sel === '#dialogPromptInput' && node.id === 'dialogPromptInput') match = true;
      if (sel === 'button:not([disabled])' && node.tagName === 'BUTTON') match = true;
      if (match) results.push(node);
      (node.children || []).forEach(check);
    };
    check(this);
    return results;
  }
  focus() {
    global.document.activeElement = this;
  }
  select() {}
}

const mockBody = new MockElement('body');
global.document = {
  body: mockBody,
  activeElement: null,
  createElement: (tag) => new MockElement(tag),
  getElementById: (id) => null,
  addEventListener: () => {},
  removeEventListener: () => {}
};

async function run() {
  console.log('--- Testing In-App Material Dialogs ---');
  const { confirmDialog, promptDialog, alertDialog } = await import('../js/components/dialog.js');

  // 1. Confirm dialog - confirm action
  {
    const p = confirmDialog({
      title: 'Delete Item?',
      message: 'Are you sure?',
      confirmLabel: 'Delete',
      destructive: true
    });

    assert.strictEqual(mockBody.children.length, 1, 'Dialog overlay appended to body');
    const overlay = mockBody.children[0];
    const confirmBtn = overlay.querySelector('#dialogConfirmBtn');
    assert.ok(confirmBtn, 'Confirm button exists');
    assert.strictEqual(confirmBtn.textContent, 'Delete');

    confirmBtn.onclick();
    const res = await p;
    assert.strictEqual(res, true, 'confirmDialog resolves true on confirm');
    mockBody.removeChild(overlay);
  }

  // 2. Confirm dialog - cancel action
  {
    const p = confirmDialog({
      title: 'Discard Changes?',
      message: 'Unsaved data will be lost.'
    });
    const overlay = mockBody.children[0];
    const cancelBtn = overlay.querySelector('#dialogCancelBtn');
    assert.ok(cancelBtn, 'Cancel button exists');

    cancelBtn.onclick();
    const res = await p;
    assert.strictEqual(res, false, 'confirmDialog resolves false on cancel');
    mockBody.removeChild(overlay);
  }

  // 3. Prompt dialog - submit value
  {
    const p = promptDialog({
      title: 'Rename Exercise',
      message: 'Enter new name:',
      defaultValue: 'Bench Press',
      confirmLabel: 'Save'
    });
    const overlay = mockBody.children[0];
    const input = overlay.querySelector('#dialogPromptInput');
    assert.ok(input, 'Prompt input exists');
    assert.strictEqual(input.value, 'Bench Press');

    input.value = 'Incline Bench Press';
    const confirmBtn = overlay.querySelector('#dialogConfirmBtn');
    confirmBtn.onclick();
    const res = await p;
    assert.strictEqual(res, 'Incline Bench Press', 'promptDialog resolves input value');
    mockBody.removeChild(overlay);
  }

  // 4. Alert dialog - acknowledge
  {
    const p = alertDialog({
      title: 'Notice',
      message: 'Changes saved successfully.'
    });
    const overlay = mockBody.children[0];
    const confirmBtn = overlay.querySelector('#dialogConfirmBtn');
    assert.ok(confirmBtn, 'OK button exists');
    confirmBtn.onclick();
    const res = await p;
    assert.strictEqual(res, true, 'alertDialog resolves true');
    mockBody.removeChild(overlay);
  }

  console.log('--- All In-App Material Dialog Tests Passed! ---');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
