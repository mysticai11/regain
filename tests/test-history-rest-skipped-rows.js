const assert = require('assert');

// Mock localStorage
const store = {
  rg_profile: JSON.stringify({ name: 'Tester', trainingDays: [1, 2, 4, 5, 6] }),
  rg_sessions: JSON.stringify([]),
  rg_day_2026_11_02: JSON.stringify({ meals: { egg: true }, workout: {} })
};

global.localStorage = {
  getItem: (k) => store[k] || null,
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; },
  clear: () => { Object.keys(store).forEach(k => delete store[k]); }
};

global.window = {
  localStorage: global.localStorage,
  activeGymDateKey: null,
  activeTodaySelectedDateKey: null,
  setTab: function(t) { global.window.currentTab = t; },
  renderTab: function() {},
  renderApp: function() {},
  addEventListener: () => {},
  removeEventListener: () => {}
};

var createdElements = {};
global.document = {
  body: null,
  getElementById: function(id) { return createdElements[id] || null; },
  querySelector: function(sel) { return null; },
  querySelectorAll: function(sel) { return []; },
  createElement: function(tag) {
    var _rawHTML = '';
    var el = {
      tagName: tag,
      className: '',
      id: '',
      style: {},
      get innerHTML() { return _rawHTML; },
      set innerHTML(html) {
        _rawHTML = html;
        var idMatches = html.matchAll(/id="([^"]+)"/g);
        for (var m of idMatches) {
          var child = global.document.createElement('div');
          child.id = m[1];
          this.appendChild(child);
        }
      },
      children: [],
      dataset: {},
      _handlers: {},
      querySelector: function(sel) {
        if (sel.startsWith('#')) {
          var id = sel.slice(1);
          if (this.id === id) return this;
          return this._findChild(function(c) { return c.id === id; });
        }
        return null;
      },
      querySelectorAll: function(sel) {
        var results = [];
        this._collect(function(c) {
          if (sel === '[data-inspect-day]' && c.dataset && c.dataset.inspectDay) return true;
          if (sel === '[data-jump-day]' && c.dataset && c.dataset.jumpDay) return true;
          if (sel === '[data-toggle-digest]' && c.dataset && c.dataset.toggleDigest) return true;
          return false;
        }, results);
        return results;
      },
      _findChild: function(fn) {
        for (var i = 0; i < this.children.length; i++) {
          if (fn(this.children[i])) return this.children[i];
          var f = this.children[i]._findChild ? this.children[i]._findChild(fn) : null;
          if (f) return f;
        }
        return null;
      },
      _collect: function(fn, acc) {
        for (var i = 0; i < this.children.length; i++) {
          if (fn(this.children[i])) acc.push(this.children[i]);
          if (this.children[i]._collect) this.children[i]._collect(fn, acc);
        }
      },
      appendChild: function(c) {
        this.children.push(c);
        c.parentNode = this;
        if (c.id) createdElements[c.id] = c;
        return c;
      },
      removeChild: function(c) {
        var idx = this.children.indexOf(c);
        if (idx !== -1) this.children.splice(idx, 1);
        if (c.id) delete createdElements[c.id];
      },
      remove: function() {
        if (this.parentNode) this.parentNode.removeChild(this);
      },
      addEventListener: function(evt, handler) { this._handlers[evt] = handler; },
      click: function() {
        if (typeof this.onclick === 'function') this.onclick({ stopPropagation: function(){} });
        else if (this._handlers['click']) this._handlers['click']({ stopPropagation: function(){} });
      }
    };
    return el;
  }
};
global.document.body = global.document.createElement('body');

async function run() {
  console.log('--- Testing U7: History Rest/Skipped Day Rows & Day Detail Sheet ---');

  const { buildWeeklyDigestHTML } = await import('../js/screens/progress/digests.js');
  const { openDayDetailSheet } = await import('../js/screens/progress/day-detail-sheet.js');

  // 1. Verify buildWeeklyDigestHTML() output structure
  const weeklyDigestHTML = buildWeeklyDigestHTML();

  // A. Check that week card title shows date range with muted subtitle
  assert.ok(weeklyDigestHTML.includes(' - ') || weeklyDigestHTML.includes(' – '), 'Week card title must show date range');
  assert.ok(!weeklyDigestHTML.includes('Week 1 · 0 sessions'), 'Week card title must NOT show Week 1 as title prefix');
  assert.ok(weeklyDigestHTML.includes('sessions · ') || weeklyDigestHTML.includes('session · '), 'Week card must have sessions and sets subtitle');

  // B. Check rest/skipped rows have 56dp height and svg chevron
  assert.ok(weeklyDigestHTML.includes('min-height:56px') || weeklyDigestHTML.includes('height:56px'), 'Rest/skipped row must have 56dp height');
  assert.ok(weeklyDigestHTML.includes('viewBox="0 0 24 24"'), 'Rest/skipped row must use SVG chevron');
  assert.ok(!weeklyDigestHTML.includes('>›<') && !weeklyDigestHTML.includes('style="font-size:15px">›</span>'), 'Rest/skipped row must NOT use text chevron ›');
  assert.ok(weeklyDigestHTML.includes('data-inspect-day='), 'Rest/skipped row must have data-inspect-day attribute');
  console.log('✓ Weekly digest HTML successfully renders date range title, 56dp rows, and SVG chevron');

  // 2. Test openDayDetailSheet
  openDayDetailSheet('2026-11-02');
  var overlay = global.document.getElementById('dayDetailOverlay');
  assert.ok(overlay, 'Sheet overlay must be created in document.body');
  assert.ok(overlay.innerHTML.includes('Mon 2 Nov') || overlay.innerHTML.includes('2 Nov'), 'Sheet must display date title');
  assert.ok(overlay.innerHTML.includes('Rest') || overlay.innerHTML.includes('Skipped'), 'Sheet must display status chip');
  assert.ok(overlay.innerHTML.includes('Nutrition'), 'Sheet must include nutrition section');
  assert.ok(overlay.innerHTML.includes('Log workout late'), 'Sheet must provide "Log workout late" button');
  assert.ok(overlay.innerHTML.includes('Open in Today'), 'Sheet must provide "Open in Today" button');
  console.log('✓ openDayDetailSheet creates bottom sheet with title, status, nutrition and actions');

  // 3. Test sheet button interactions
  var lateBtn = overlay.querySelector('#sheetLateLogBtn');
  assert.ok(lateBtn, 'Late log button exists');
  lateBtn.click();
  assert.strictEqual(global.window.activeGymDateKey, '2026-11-02', 'Clicking late log sets activeGymDateKey');
  assert.strictEqual(global.window.currentTab, 'gym', 'Clicking late log navigates to gym tab');

  openDayDetailSheet('2026-11-02');
  var overlay2 = global.document.getElementById('dayDetailOverlay');
  var todayBtn = overlay2.querySelector('#sheetOpenTodayBtn');
  assert.ok(todayBtn, 'Open in Today button exists');
  todayBtn.click();
  assert.strictEqual(global.window.activeTodaySelectedDateKey, '2026-11-02', 'Clicking Open in Today sets activeTodaySelectedDateKey');
  assert.strictEqual(global.window.currentTab, 'today', 'Clicking Open in Today navigates to today tab');

  console.log('✓ Late log and Open in Today action buttons execute expected navigations');
  console.log('✓ All U7 History Rest/Skipped Day Rows tests passed successfully!');
}

run();
