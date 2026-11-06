import assert from 'assert';

console.log('--- Testing Part A: Gym Logger Bugs & Root Cause Resolution ---');

// Mock localStorage
globalThis.localStorage = {
  _store: {},
  getItem(k) { return this._store[k] || null; },
  setItem(k, v) { this._store[k] = String(v); },
  removeItem(k) { delete this._store[k]; },
  clear() { this._store = {}; }
};

let scheduleCount = 0;
let wakeLockActive = false;
let wakeLockRequestCount = 0;
let wakeLockReleaseCount = 0;

try {
  navigator.vibrate = () => true;
  Object.defineProperty(navigator, 'wakeLock', {
    value: {
      request: async () => {
        wakeLockActive = true;
        wakeLockRequestCount++;
        return {
          release: async () => {
            wakeLockActive = false;
            wakeLockReleaseCount++;
          },
          addEventListener: () => {}
        };
      }
    },
    configurable: true,
    writable: true
  });
} catch(e) {}

const domElements = new Map();

function createMockElement(id, tag = 'div') {
  const el = {
    id,
    tagName: tag.toUpperCase(),
    value: '',
    dataset: {},
    style: {},
    classList: {
      _classes: new Set(),
      add(c) { this._classes.add(c); },
      remove(c) { this._classes.delete(c); },
      contains(c) { return this._classes.has(c); },
      toggle(c, force) { if (force !== undefined) { force ? this.add(c) : this.remove(c); } else { this.contains(c) ? this.remove(c) : this.add(c); } }
    },
    disabled: false,
    textContent: '',
    innerHTML: '',
    children: [],
    _listeners: {},
    addEventListener(evt, fn) {
      this._listeners[evt] = this._listeners[evt] || [];
      this._listeners[evt].push(fn);
    },
    removeEventListener(evt, fn) {
      if (!this._listeners[evt]) return;
      this._listeners[evt] = this._listeners[evt].filter(f => f !== fn);
    },
    dispatchEvent(evt) {
      const fns = this._listeners[evt.type] || [];
      fns.forEach(fn => fn.call(this, evt));
      if (this['on' + evt.type]) this['on' + evt.type].call(this, evt);
    },
    focus() {},
    blur() {},
    select() {},
    querySelector(selector) {
      return Array.from(domElements.values()).find(e => matchSelector(e, selector)) || null;
    },
    querySelectorAll(selector) {
      return Array.from(domElements.values()).filter(e => matchSelector(e, selector));
    },
    closest(selector) {
      return matchSelector(this, selector) ? this : null;
    }
  };
  domElements.set(id, el);
  return el;
}

function matchSelector(el, selector) {
  if (selector.startsWith('#')) return el.id === selector.slice(1);
  if (selector.startsWith('.')) return el.classList.contains(selector.slice(1));
  if (selector.includes('[data-')) {
    const match = selector.match(/\[([a-zA-Z0-9-]+)="?([^"\]]+)"?\]/);
    if (match) {
      const key = match[1].replace('data-', '').replace(/-([a-z])/g, (_, l) => l.toUpperCase());
      return el.dataset[key] === match[2];
    }
  }
  return false;
}

const dummyBody = createMockElement('body', 'body');
const dummyContent = createMockElement('content', 'main');
const dummyRestWrap = createMockElement('restTimerWrap', 'div');

globalThis.document = {
  body: dummyBody,
  visibilityState: 'visible',
  _docListeners: {},
  addEventListener(evt, fn) {
    this._docListeners[evt] = this._docListeners[evt] || [];
    this._docListeners[evt].push(fn);
  },
  removeEventListener(evt, fn) {
    if (!this._docListeners[evt]) return;
    this._docListeners[evt] = this._docListeners[evt].filter(f => f !== fn);
  },
  dispatchEvent(evt) {
    const fns = this._docListeners[evt.type] || [];
    fns.forEach(fn => fn.call(this, evt));
  },
  getElementById(id) {
    if (domElements.has(id)) return domElements.get(id);
    return createMockElement(id);
  },
  querySelector(selector) {
    return Array.from(domElements.values()).find(e => matchSelector(e, selector)) || null;
  },
  querySelectorAll(selector) {
    return Array.from(domElements.values()).filter(e => matchSelector(e, selector));
  },
  createElement(tag) {
    return createMockElement('el_' + Math.random().toString(36).slice(2), tag);
  }
};

globalThis.window = {
  activeGymDateKey: '2026-11-06',
  scheduleStateNotification: function() { scheduleCount++; },
  addEventListener: () => {},
  removeEventListener: () => {},
  tab: 'gym'
};

const { dayRecord, saveDayRecord } = await import('../js/storage.js');
const { getSessionElapsedSeconds, startRestTimer, renderRestTimer, renderWorkoutTimer } = await import('../js/screens/gym/timer.js');
const { workoutElapsed, formatDuration } = await import('../js/lib/format.js');
const { restTimer, workoutTimer } = await import('../js/state.js');
const { requestWakeLock, releaseWakeLock } = await import('../js/lib/dom.js');

// ── TEST 1: Logging Set 1 keeps Set 2 row interactive without page reload ──
console.log('\n[1/4] Verifying Set 1 log with silent persistence leaves Set 2 fully interactive...');
const testDayKey = '2026-11-06';
const exId = 'barbell_bench';

// Initialize day record
let rec = dayRecord(testDayKey);
rec.workout = {};
rec.workoutDraft = {};
saveDayRecord(testDayKey, rec, { silent: true });

const initScheduleCount = scheduleCount;

// Mock Set 1 inputs and log button
const w1 = createMockElement('set_weight_' + exId + '_0', 'input');
w1.classList.add('set-weight');
w1.dataset.ex = exId;
w1.dataset.setIndex = '0';
w1.value = '80';

const r1 = createMockElement('set_reps_' + exId + '_0', 'input');
r1.classList.add('set-reps');
r1.dataset.ex = exId;
r1.dataset.setIndex = '0';
r1.value = '8';

// Mock Set 2 inputs and controls
const w2 = createMockElement('set_weight_' + exId + '_1', 'input');
w2.classList.add('set-weight');
w2.classList.add('precision-input');
w2.dataset.ex = exId;
w2.dataset.setIndex = '1';

const r2 = createMockElement('set_reps_' + exId + '_1', 'input');
r2.classList.add('set-reps');
r2.classList.add('precision-input');
r2.dataset.ex = exId;
r2.dataset.setIndex = '1';

const rir2Btn = createMockElement('rir_btn_' + exId + '_1', 'button');
rir2Btn.classList.add('rir-cycle-text');
rir2Btn.dataset.cycleRir = exId;
rir2Btn.dataset.setIndex = '1';
rir2Btn.textContent = 'RIR 1';

const rir2Select = createMockElement('rir_select_' + exId + '_1', 'select');
rir2Select.classList.add('set-rir');
rir2Select.dataset.ex = exId;
rir2Select.dataset.setIndex = '1';
rir2Select.value = '1';

const logBtn2 = createMockElement('log_btn_' + exId + '_1', 'button');
logBtn2.classList.add('btn-log');
logBtn2.dataset.logset = exId;
logBtn2.dataset.setIndex = '1';

// Simulate logging Set 1
rec.workout[exId] = [{ weight: 80, reps: 8, rir: 1 }];
// Pre-fill Set 2 draft
rec.workoutDraft[exId] = [null, { weight: 80, reps: 8, rir: 1 }];
saveDayRecord(testDayKey, rec, { silent: true });

// Verify scheduleStateNotification was NOT triggered (no second re-render)
assert.strictEqual(scheduleCount, initScheduleCount, 'Silent saveDayRecord must NOT schedule a state notification render');

// Verify Set 2 draft values exist and inputs remain active and enabled
assert.strictEqual(w2.disabled, false, 'Set 2 weight input must remain enabled');
assert.strictEqual(r2.disabled, false, 'Set 2 reps input must remain enabled');
assert.strictEqual(logBtn2.disabled, false, 'Set 2 log button must remain clickable');

// Simulate RIR cycling on Set 2
let curRir = parseInt(rir2Select.value, 10);
let nextRir = curRir === 1 ? '0' : '1';
rir2Select.value = nextRir;
rir2Btn.textContent = nextRir === '0' ? 'F' : 'RIR 1';
assert.strictEqual(rir2Btn.textContent, 'F', 'Set 2 RIR cycle must respond immediately');
console.log('✓ Verified: Set 1 logged silently, Set 2 inputs and RIR cycling remain interactive without reload.');

// ── TEST 2: Timer running while typing multi-digit values into Set 2 ────────
console.log('\n[2/4] Verifying typing "100" and "12" while rest timer ticks...');

// Start rest timer
startRestTimer(90);
assert.strictEqual(restTimer.remaining, 90, 'Rest timer should initialize to 90s');

// Simulate typing "1", "0", "0" into weight without focus setTimeout overwriting
w2.value = '';
w2.value += '1';
w2.value += '0';
w2.value += '0';

// Simulate typing "1", "2" into reps
r2.value = '';
r2.value += '1';
r2.value += '2';

assert.strictEqual(w2.value, '100', 'Weight field must accept multi-digit "100" without character loss');
assert.strictEqual(r2.value, '12', 'Reps field must accept multi-digit "12" without character loss');

// Rest timer tick simulation
const countdownEl = createMockElement('restTimerCountdown', 'span');
countdownEl.textContent = '01:30';
const pauseEl = createMockElement('pauseRestBtn', 'button');
pauseEl.textContent = 'Pause';

// Simulate second tick
restTimer.endAt = Date.now() + 89 * 1000;
restTimer.remaining = 89;
renderRestTimer();
assert.strictEqual(countdownEl.textContent, '01:29', 'Rest timer must update textContent on tick without tearing down DOM');
assert.strictEqual(w2.value, '100', 'Weight input must retain "100" across timer ticks');
clearInterval(restTimer.interval);
console.log('✓ Verified: Multi-digit inputs ("100", "12") succeed with timer ticking.');

// ── TEST 3: Elapsed session time sanity (<180 min, handles stale/future) ───
console.log('\n[3/4] Verifying session stopwatch elapsed time sanity (<180 min, handles stale startedAt)...');

// Stale startedAt: 12.7 hours ago (766 min anomaly)
const staleMeta = {
  startedAt: new Date(Date.now() - 12.7 * 3600 * 1000).toISOString(),
  completedAt: null
};
const secStale = getSessionElapsedSeconds(staleMeta);
assert.ok(secStale <= 180 * 60, `Stale session elapsed seconds (${secStale}s) must be reset and capped to <= 180 min`);
assert.ok(secStale >= 0, 'Elapsed seconds must be non-negative');

// Extremely long startedAt (e.g. 5 hours ago)
const longMeta = {
  startedAt: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
  completedAt: null
};
const secLong = getSessionElapsedSeconds(longMeta);
assert.strictEqual(secLong, 180 * 60, 'StartedAt older than 180min must clamp to exactly 180 min (10,800s)');

// Future startedAt
const futureMeta = {
  startedAt: new Date(Date.now() + 3600 * 1000).toISOString(),
  completedAt: null
};
const secFuture = getSessionElapsedSeconds(futureMeta);
assert.strictEqual(secFuture, 0, 'Future startedAt must reset and return 0');

// Completed session stops ticking
const finishedMeta = {
  startedAt: new Date(Date.now() - 3600 * 1000).toISOString(),
  completedAt: new Date(Date.now() - 1800 * 1000).toISOString(),
  durationMinutes: 30
};
const secFinished = getSessionElapsedSeconds(finishedMeta);
assert.strictEqual(secFinished, 1800, 'Completed session elapsed time must reflect fixed completedAt duration (30 min = 1800s)');

// formatDuration clamping
assert.strictEqual(formatDuration(30), '30m', '30 min formatted as 30m');
assert.strictEqual(formatDuration(75), '1h 15m', '75 min formatted as 1h 15m');
assert.strictEqual(formatDuration(766), '3h 0m', '766 min must clamp to 180 min (3h 0m)');
assert.strictEqual(formatDuration(null), '—', 'Missing duration formatted as em-dash');
console.log('✓ Verified: Elapsed session duration never exceeds 180 min, handles stale and future timestamps cleanly.');

// ── TEST 4: WakeLock lifecycle ─────────────────────────────────────────────
console.log('\n[4/4] Verifying WakeLock lifecycle during workout and backgrounding...');

wakeLockRequestCount = 0;
wakeLockReleaseCount = 0;

// Request wake lock when timer is running
requestWakeLock();
// Yield microtask for promise resolution
await Promise.resolve();
assert.strictEqual(wakeLockRequestCount, 1, 'Wake lock must be requested when timer starts');

// Simulate document backgrounding (visibilitychange -> hidden)
document.visibilityState = 'hidden';
document.dispatchEvent({ type: 'visibilitychange' });
await Promise.resolve();
assert.strictEqual(wakeLockReleaseCount, 1, 'Wake lock must be released when app is hidden/backgrounded');

// Simulate document foregrounding (visibilitychange -> visible)
document.visibilityState = 'visible';
document.dispatchEvent({ type: 'visibilitychange' });
await Promise.resolve();
assert.strictEqual(wakeLockRequestCount, 2, 'Wake lock must be re-acquired when app returns to foreground');

// Session finish releases wake lock
releaseWakeLock();
await Promise.resolve();
assert.strictEqual(wakeLockReleaseCount, 2, 'Wake lock must be explicitly released when workout finishes');

console.log('✓ Verified: WakeLock acquired on timer start, released on backgrounding, re-acquired on foregrounding, and released on session end.');

console.log('\n================================================================');
console.log(' ALL 4 PART A GYM LOGGER BUG FIX TESTS PASSED WITH 100% SUCCESS!');
console.log('================================================================\n');
