const assert = require('assert');

// Mock localStorage
const store = {
  rg_profile: JSON.stringify({
    name: 'Hardgainer',
    trainingDays: [1, 2, 4, 5, 6]
  }),
  rg_workout_sessions: JSON.stringify({
    version: 3,
    sessions: {
      s1: {
        id: 's1',
        dayKey: '2026-11-01',
        programDay: 0,
        exercises: [{
          id: 'bench_press',
          name: 'Flat Bench Press',
          sets: [{ weight: 60, reps: 5 }] // e1RM ~ 70
        }]
      },
      s2: {
        id: 's2',
        dayKey: '2026-11-04',
        programDay: 0,
        exercises: [{
          id: 'bench_press',
          name: 'Flat Bench Press',
          sets: [{ weight: 65, reps: 5 }] // e1RM ~ 75.8 (+5.8)
        }]
      }
    }
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
    this.style = {};
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
  querySelector(sel) { return null; }
  querySelectorAll(sel) { return []; }
}

const elementsById = {
  liftSummaryCard: new MockElement('div'),
  liftPlot: new MockElement('div'),
  liftMeta: new MockElement('div'),
  weightPlot: new MockElement('div'),
  weightMeta: new MockElement('div'),
  weightEntriesContainer: new MockElement('div')
};

global.document = {
  body: new MockElement('body'),
  createElement: (tag) => new MockElement(tag),
  getElementById: (id) => elementsById[id] || new MockElement('div'),
  querySelector: () => null,
  querySelectorAll: () => [],
  addEventListener: () => {},
  removeEventListener: () => {}
};

async function run() {
  console.log('--- Testing Lifts Tab Summary Card & Headers (U5) ---');

  const { saveDayRecord } = await import('../js/storage.js');
  const { renderProgressSimple } = await import('../js/screens/progress.js');

  // Setup: 2 recorded sessions for bench_press
  saveDayRecord('2026-11-01', { workout: { bench_press: [{ weight: 60, reps: 5 }] }, workoutDone: true });
  saveDayRecord('2026-11-04', { workout: { bench_press: [{ weight: 65, reps: 5 }] }, workoutDone: true });
  global.window.activeProgressExerciseId = 'bench_press';

  // Render lifts tab
  renderProgressSimple('lifts');

  // 1. Verify Lift Summary Card layout and labels
  const cardHtml = elementsById.liftSummaryCard.innerHTML;
  assert.ok(cardHtml.includes('class="lift-summary-grid"'), 'Summary card uses lift-summary-grid');
  assert.ok(cardHtml.includes('BEST 1RM'), 'BEST 1RM label present');
  assert.ok(cardHtml.includes('LATEST'), 'LATEST label present');
  assert.ok(cardHtml.includes('CHANGE'), 'CHANGE label present');

  // 2. Inline unit present
  assert.ok(cardHtml.includes('class="lift-summary-unit"'), 'Unit uses lift-summary-unit class');
  assert.ok(cardHtml.includes('>kg<'), 'kg unit rendered');

  // 3. Positive change has lime color
  assert.ok(cardHtml.includes('var(--lime)'), 'Positive change colored with var(--lime)');
  assert.ok(cardHtml.includes('+'), 'Positive change has "+" prefix');

  // 4. Test zero change (equal scores) -> must show 0.0 without '+' and muted color
  saveDayRecord('2026-11-04', { workout: { bench_press: [{ weight: 60, reps: 5 }] }, workoutDone: true });
  renderProgressSimple('lifts');
  const cardHtmlZero = elementsById.liftSummaryCard.innerHTML;
  assert.ok(cardHtmlZero.includes('>0.0<'), 'Zero change rendered as 0.0 (never +0.0)');
  assert.ok(!cardHtmlZero.includes('>+0.0<'), 'Never renders +0.0');
  assert.ok(cardHtmlZero.includes('color:var(--text-secondary)'), 'Zero change is muted');

  // 5. Test empty state when < 2 sessions
  saveDayRecord('2026-11-04', { workout: {}, workoutDone: false });
  renderProgressSimple('lifts');
  const plotHtmlEmpty = elementsById.liftPlot.innerHTML;
  assert.ok(plotHtmlEmpty.includes('Log 2+ sessions to see your trend'), 'Empty state centered text present');
  assert.ok(plotHtmlEmpty.includes('padding:20px'), 'Empty state has 20px padding');

  console.log('--- All U5 Lifts Tab Summary Card & Header Tests Passed! ---');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
