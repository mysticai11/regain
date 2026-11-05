import assert from 'assert';

console.log('--- Testing Monthly Consistency Calendar (Rest Days & Logged Days) and Lift PR Graph ---');

// Mock localStorage
const store = {};
global.localStorage = {
  getItem: (k) => store[k] || null,
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; },
  clear: () => { Object.keys(store).forEach(k => delete store[k]); }
};

// Mock DOM
let contentHTML = '';
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
  querySelector: () => null,
  querySelectorAll: () => [],
  getElementById: (id) => ({
    get innerHTML() { return contentHTML; },
    set innerHTML(val) { contentHTML = val; },
    addEventListener: () => {},
    classList: { add: () => {}, remove: () => {} },
    style: {},
    querySelector: () => null,
    querySelectorAll: () => []
  }),
  createElement: () => ({ className: '', style: {}, remove: () => {}, querySelector: () => ({ onclick: null }), querySelectorAll: () => [] }),
  body: { appendChild: () => {} }
};

async function run() {
  const { setProfile } = await import('../js/state.js');
  const { saveDayRecord, saveWorkoutSession } = await import('../js/storage.js');
  const { buildDotConsistencyCalendarHTML, getLiftHistory, progressPlot } = await import('../js/screens/progress/charts.js');

  // Setup profile with training days Mon, Wed, Fri (1, 3, 5)
  const profile = {
    trainingDays: [1, 3, 5],
    targetWeight: 60
  };
  setProfile(profile);
  global.localStorage.setItem('rg_profile', JSON.stringify(profile));

  // 1. Test Monthly Consistency Calendar
  // Add a logged workout for a known date (e.g. Nov 2, 2026 which is a Monday = 1)
  saveDayRecord('2026-11-02', {
    workoutDone: true,
    workout: {
      bench_press: [{ weight: 40, reps: 8 }]
    }
  });

  const calendarHTML = buildDotConsistencyCalendarHTML();

  // Assert Legend contains logged, rest, and skipped
  assert.ok(calendarHTML.includes('background:#C6F432') && calendarHTML.includes('logged'), 'Legend must show logged in green (#C6F432)');
  assert.ok(calendarHTML.includes('background:#55555A') && calendarHTML.includes('rest'), 'Legend must show rest in solid gray (#55555A)');
  assert.ok(calendarHTML.includes('border:1px solid #55555A') && calendarHTML.includes('skipped'), 'Legend must show skipped as outline ring');

  // Assert dots include rest day styling
  assert.ok(calendarHTML.includes('title="2026-11-02 (Logged)"'), 'Nov 2 must be labeled Logged');
  assert.ok(calendarHTML.includes('(Rest)'), 'Rest days must have Rest title');
  assert.ok(calendarHTML.includes('background:#55555A'), 'Rest days must have color #55555A');

  console.log('✓ Monthly Progress Calendar: Logged is green, rest days have color #55555A, skipped are rings');

  // 2. Test Lift / PR History Extraction
  // Add workout session for bench press on Nov 4, 2026 with higher weight
  saveWorkoutSession({
    id: 'workout_session_2026_11_04_0',
    dayKey: '2026-11-04',
    exercises: [
      {
        id: 'bench_press',
        name: 'Barbell Bench Press',
        sets: [
          { weight: 42.5, reps: 6 },
          { weight: 45, reps: 5 } // 45 * (1 + 5/30) = 52.5 kg e1RM -> New PR!
        ]
      }
    ]
  });

  const history = getLiftHistory('bench_press');
  assert.strictEqual(history.length, 2, 'Must have 2 bench press sessions');
  
  // Session 1: 40 kg x 8 reps -> e1RM = 40 * (1 + 8/30) = 50.7 kg
  assert.strictEqual(history[0].dateKey, '2026-11-02');
  assert.strictEqual(history[0].weight, 40);
  assert.strictEqual(history[0].reps, 8);
  assert.strictEqual(history[0].setDesc, '40 kg × 8 reps');
  assert.strictEqual(history[0].value, 50.7);
  assert.strictEqual(history[0].isPR, true);
  assert.strictEqual(history[0].isPeak, false);

  // Session 2: 45 kg x 5 reps -> e1RM = 45 * (1 + 5/30) = 52.5 kg
  assert.strictEqual(history[1].dateKey, '2026-11-04');
  assert.strictEqual(history[1].weight, 45);
  assert.strictEqual(history[1].reps, 5);
  assert.strictEqual(history[1].setDesc, '45 kg × 5 reps');
  assert.strictEqual(history[1].value, 52.5);
  assert.strictEqual(history[1].isPR, true);
  assert.strictEqual(history[1].isPeak, true, 'Session 2 must be peak all-time PR');

  console.log('✓ Lift History Extraction: Accurate weights, reps, set descriptions, and PR flags');

  // 3. Test Progress Plot for Lifts
  const plotHTML = progressPlot(history, null, 'kg', true);
  assert.ok(plotHTML.includes('PR:'), 'Plot header must show PR');
  assert.ok(plotHTML.includes('52.5 kg'), 'Plot header must show peak PR 52.5 kg');
  assert.ok(plotHTML.includes('45 kg × 5 reps'), 'Plot must show exact best set performed');
  assert.ok(plotHTML.includes('data-set-desc="45 kg × 5 reps"'), 'Point must have data-set-desc for interactive readout');
  assert.ok(plotHTML.includes('>PR</text>'), 'Peak point must render PR badge text in SVG');

  console.log('✓ Lift PR Graph: Crystal clear PR readout, best set breakdown, and interactive point data');
  console.log('=============================================');
  console.log(' ALL MONTHLY & LIFT PR TESTS PASSED 100%! ');
  console.log('=============================================');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});

