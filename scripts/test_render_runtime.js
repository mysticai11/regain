const fs = require('fs');

const dbCode = fs.readFileSync('db.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');
const scriptCode = html.match(/<script>([\s\S]*?)<\/script>/)[1];

const dummyElements = {};
function getEl(id) {
  if (!dummyElements[id]) {
    dummyElements[id] = {
      id: id,
      innerHTML: '',
      textContent: '',
      value: '',
      style: {},
      dataset: {},
      classList: {
        add: () => {},
        remove: () => {},
        contains: () => false,
        toggle: () => {}
      },
      addEventListener: () => {},
      removeEventListener: () => {},
      appendChild: (c) => c,
      querySelector: (sel) => getEl('qs_' + sel),
      querySelectorAll: (sel) => [getEl('qsa_1'), getEl('qsa_2')],
      closest: (sel) => getEl('closest_' + sel),
      focus: () => {},
      blur: () => {}
    };
  }
  return dummyElements[id];
}

const dummyStorage = {
  data: {},
  getItem: function(k) { return this.data[k] || null; },
  setItem: function(k, v) { this.data[k] = String(v); },
  removeItem: function(k) { delete this.data[k]; }
};

const sandbox = {
  console: console,
  dummyElements: dummyElements,
  window: {
    localStorage: dummyStorage,
    addEventListener: () => {},
    Capacitor: null,
    location: { reload: () => {} }
  },
  document: {
    getElementById: getEl,
    querySelector: (sel) => getEl('qs_' + sel),
    querySelectorAll: (sel) => [getEl('qsa_1'), getEl('qsa_2')],
    createElement: (tag) => getEl('elem_' + tag),
    body: getEl('body'),
    addEventListener: () => {}
  },
  localStorage: dummyStorage,
  navigator: { userAgent: 'node', vibrate: () => {} },
  AudioContext: function() {
    return {
      createOscillator: () => ({ connect: () => {}, start: () => {}, stop: () => {}, frequency: { value: 0 } }),
      createGain: () => ({ connect: () => {}, gain: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} } }),
      destination: {},
      currentTime: 0
    };
  }
};

try {
  const runner = new Function('sandbox', 'with (sandbox) { ' + dbCode + ';\n' + scriptCode + '; return { renderTodaySimple, dayRecord, todayKey, saveDayRecord, getActiveProgram }; }');
  const app = runner(sandbox);
  console.log('App loaded into sandbox!');

  // Test rendering today simple
  app.renderTodaySimple();
  console.log('renderTodaySimple executed without error!');
  console.log('content innerHTML length:', dummyElements['content'] ? dummyElements['content'].innerHTML.length : 0);
  console.log('content preview snippet:\n', dummyElements['content'] ? dummyElements['content'].innerHTML.slice(0, 300) : 'none');

  // Test with workout done
  const todayKey = app.todayKey();
  const rec = app.dayRecord(todayKey);
  rec.workoutDone = true;
  rec.workoutSession = { label: 'Day 1 - Chest & Back A' };
  app.saveDayRecord(todayKey, rec);
  app.renderTodaySimple();
  console.log('\nrenderTodaySimple with workoutDone = true executed without error!');
  console.log('content preview snippet with workout done:\n', dummyElements['content'].innerHTML.slice(0, 300));

} catch(err) {
  console.error('Runtime error in renderTodaySimple:', err);
  process.exit(1);
}
