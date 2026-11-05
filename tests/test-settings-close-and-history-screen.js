/* Test Suite: Settings 1-Click Close & Dedicated History Screen Verification */

import assert from 'assert';

console.log('--- Testing Settings 1-Click Close & Dedicated History Screen ---');

// Mock localStorage
const store = {};
global.localStorage = {
  get length() { return Object.keys(store).length; },
  key: (i) => Object.keys(store)[i] || null,
  getItem: (k) => store[k] || null,
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; },
  clear: () => { Object.keys(store).forEach(k => delete store[k]); }
};

let contentHTML = '';
const createdElements = [];

function createMockElement(tag) {
  var el = {
    tagName: (tag || 'DIV').toUpperCase(),
    id: '',
    className: '',
    style: {
      setProperty: () => {},
      transition: '',
      opacity: '',
      transform: ''
    },
    value: '',
    children: [],
    listeners: {},
    classList: {
      classes: [],
      add: function(c) { this.classes = this.classes || []; if (!this.classes.includes(c)) this.classes.push(c); },
      remove: function(c) { this.classes = (this.classes || []).filter(function(x){ return x !== c; }); },
      contains: function(c) { return (this.classes || []).includes(c); },
      toggle: function(c, v) { if (v) this.add(c); else this.remove(c); }
    },
    innerHTML: '',
    addEventListener: function(type, handler) {
      this.listeners[type] = this.listeners[type] || [];
      this.listeners[type].push(handler);
    },
    dispatchEvent: function(event) {
      var list = this.listeners[event.type] || [];
      list.forEach(h => h(event));
    },
    click: function() {
      if (this.onclick) this.onclick({ preventDefault: ()=>{}, stopPropagation: ()=>{} });
      if (this.listeners['click']) {
        this.listeners['click'].forEach(h => h({ preventDefault: ()=>{}, stopPropagation: ()=>{} }));
      }
    },
    querySelector: function(sel) {
      this._cachedQueries = this._cachedQueries || {};
      if (this._cachedQueries[sel]) return this._cachedQueries[sel];
      var child = createMockElement(sel.startsWith('#') ? 'button' : 'div');
      if (sel.startsWith('#')) child.id = sel.slice(1);
      this._cachedQueries[sel] = child;
      return child;
    },
    querySelectorAll: function() { return []; },
    remove: function() {
      var idx = createdElements.indexOf(this);
      if (idx !== -1) createdElements.splice(idx, 1);
    }
  };
  createdElements.push(el);
  return el;
}

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
  querySelector: function(sel) {
    if (sel === '#settingsOverlay' || sel === '.overlay') {
      return createdElements.find(e => e.id === 'settingsOverlay' || (e.className && e.className.includes('overlay'))) || null;
    }
    return null;
  },
  querySelectorAll: function() { return []; },
  getElementById: function(id) {
    if (id === 'content') {
      return {
        get innerHTML() { return contentHTML; },
        set innerHTML(val) { contentHTML = val; },
        addEventListener: () => {},
        querySelector: () => null,
        querySelectorAll: () => [],
        classList: { add: () => {}, remove: () => {} }
      };
    }
    if (id === 'settingsOverlay') {
      return createdElements.find(e => e.id === 'settingsOverlay') || null;
    }
    return createMockElement('div');
  },
  createElement: function(tag) { return createMockElement(tag); },
  body: {
    appendChild: function(el) {}
  }
};

const initialProfile = {
  calTargetRest: 2700,
  calTargetGym: 3000,
  protTargetRest: 120,
  protTargetGym: 140,
  targetWeight: 60,
  trainingDays: [1, 2, 4, 5, 6],
  weightEntries: []
};
global.localStorage.setItem('rg_profile', JSON.stringify(initialProfile));

const { setProfile } = await import('../js/state.js');
setProfile(initialProfile);

// ── Test 1: Settings 1-Click Close & Duplicate Overlay Prevention ──
console.log('\n[1/2] Testing Settings 1-Click Close & Duplicate Prevention...');
const { openSettings } = await import('../js/screens/settings.js');

// Call openSettings twice in rapid succession (simulating button tap + bubbling)
openSettings();
openSettings();

const settingsOverlays = createdElements.filter(e => e.id === 'settingsOverlay');
assert.strictEqual(settingsOverlays.length, 1, 'Only ONE settings overlay must ever exist in DOM (no duplicate stacked overlays)');

const activeOverlay = settingsOverlays[0];
assert.ok(activeOverlay, 'Active settings overlay must be present');

// Trigger close via closeSettingsBtn on single click
const closeBtn = activeOverlay.querySelector('#closeSettingsBtn');
assert.ok(closeBtn, 'Close button must exist on overlay');

// Call closeBtn click
closeBtn.click();

// Fast-forward animation timer
await new Promise(resolve => setTimeout(resolve, 250));

const remainingOverlays = createdElements.filter(e => e.id === 'settingsOverlay');
assert.strictEqual(remainingOverlays.length, 0, 'Settings overlay must be completely removed on exactly ONE click');
console.log('✓ Settings 1-Click Close verified: exactly 1 overlay created and cleanly closed on 1 click.');

// ── Test 2: Progress Screen Clean Separation (Body vs Lifts vs History) ──
console.log('\n[2/2] Testing Dedicated History Screen & Body Screen Clarity...');
const { renderProgressSimple } = await import('../js/screens/progress.js');

// 1. Body Screen
renderProgressSimple('body');
assert.ok(contentHTML.includes('id="bodyProgressBtn"') && contentHTML.includes('seg-tab-btn active'), 'Body tab button must be active');
assert.ok(contentHTML.includes('id="weightPlot"'), 'Weight plot must be on Body screen');
assert.ok(contentHTML.includes('id="progressWeight"'), 'Log weight input must be on Body screen');
assert.ok(contentHTML.includes('id="weightEntriesContainer"'), 'Weight entries container must be on Body screen');
assert.ok(contentHTML.includes('Nutrition · Last 7 days'), 'Nutrition last 7 days must be on Body screen');

// Body screen must NOT contain consistency calendar or history banner
assert.ok(!contentHTML.includes('Consistency ·'), 'Body screen must NOT contain consistency calendar dots');
assert.ok(!contentHTML.includes('openHistoryArchiveBtn'), 'Body screen must NOT contain openHistoryArchiveBtn');
assert.ok(!contentHTML.includes('Weekly & Monthly History'), 'Body screen must NOT contain Weekly & Monthly History banner');

// 2. Lifts Screen
renderProgressSimple('lifts');
assert.ok(contentHTML.includes('id="liftProgressBtn"') && contentHTML.includes('seg-tab-btn active'), 'Lifts tab button must be active');
assert.ok(contentHTML.includes('id="liftSelect"'), 'Exercise picker must be on Lifts screen');
assert.ok(contentHTML.includes('id="liftPlot"'), 'Lift PR plot must be on Lifts screen');
assert.ok(contentHTML.includes('Weekly work · Sets last 7 days'), 'Weekly work sets chart must be on Lifts screen');
assert.ok(!contentHTML.includes('id="weightPlot"'), 'Lifts screen must NOT contain weightPlot');
assert.ok(!contentHTML.includes('Consistency ·'), 'Lifts screen must NOT contain consistency calendar');

// 3. Dedicated History Screen
renderProgressSimple('history');
assert.ok(contentHTML.includes('id="historyProgressBtn"') && contentHTML.includes('seg-tab-btn active'), 'History tab button must be active');
assert.ok(contentHTML.includes('Consistency ·') || contentHTML.includes('dot-grid'), 'Consistency calendar must be on History screen');
assert.ok(contentHTML.includes('id="historyTabWeeksBtn"'), 'Past Weeks sub-tab must be on History screen');
assert.ok(contentHTML.includes('id="historyTabMonthsBtn"'), 'Past Months sub-tab must be on History screen');
assert.ok(contentHTML.includes('id="historyDigestListContainer"'), 'Digest list container must be on History screen');
assert.ok(!contentHTML.includes('id="weightPlot"'), 'History screen must NOT contain weightPlot');
assert.ok(!contentHTML.includes('id="liftSelect"'), 'History screen must NOT contain liftSelect');

console.log('✓ Dedicated History Screen verified: Body screen is 100% clean, and History screen cleanly houses all weekly/monthly data.');

console.log('\n======================================================');
console.log(' ALL SETTINGS CLOSE & HISTORY SCREEN TESTS PASSED! ');
console.log('======================================================\n');
