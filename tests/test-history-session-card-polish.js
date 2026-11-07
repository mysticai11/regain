const assert = require('assert');

// Mock localStorage with multi-exercise workout sessions
const store = {
  rg_profile: JSON.stringify({ name: 'Tester', trainingDays: [1, 2, 4, 5, 6] }),
  rg_workout_sessions: JSON.stringify({
    version: 3,
    sessions: {
      sess_1: {
        id: 'sess_1',
        dayKey: '2026-11-04',
        label: 'Full-Body Workout Day with a Very Long Descriptive Name That Might Need Two Lines',
        exercises: [
          {
            id: 'bench_press',
            name: 'Flat Barbell Bench Press',
            sets: [
              { weight: 80, reps: 8, rir: 2 },
              { weight: 80, reps: 8, rir: 1 }
            ]
          },
          {
            id: 'lat_pulldown',
            name: 'Lat Pulldown',
            sets: [
              { weight: 60, reps: 10, rir: 2 },
              { weight: 60, reps: 10, rir: 1 }
            ]
          },
          {
            id: 'squat',
            name: 'Barbell Back Squat',
            sets: [
              { weight: 100, reps: 6, rir: 2 }
            ]
          }
        ]
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
  localStorage: global.localStorage
};

global.document = {
  querySelector: () => null,
  querySelectorAll: () => []
};

async function run() {
  console.log('--- Testing U8: History Session Card Polish ---');

  const { workoutHistoryHTML } = await import('../js/screens/progress/history.js');

  const html = workoutHistoryHTML();

  // 1. Verify numbered exercises
  assert.ok(html.includes('class="history-ex-num"'), 'Must contain history-ex-num prefix for exercises');
  assert.ok(html.includes('>1</span>'), 'First exercise must have number 1');
  assert.ok(html.includes('>2</span>'), 'Second exercise must have number 2');
  assert.ok(html.includes('>3</span>'), 'Third exercise must have number 3');
  assert.ok(html.includes('width:24px') || html.includes('min-width:24px'), 'history-ex-num must have 24px fixed width');
  assert.ok(html.includes('font-variant-numeric:tabular-nums'), 'history-ex-num must use tabular numerals');
  console.log('✓ Numbered exercise prefixes (1, 2, 3...) verified with fixed 24px width and tabular nums');

  // 2. Verify 2-line title wrapping on session header
  assert.ok(html.includes('class="history-session-title"'), 'Must contain history-session-title container');
  assert.ok(html.includes('-webkit-line-clamp:2'), 'Title must clamp to 2 lines');
  assert.ok(html.includes('-webkit-box-orient:vertical'), 'Title must use vertical box orient');
  assert.ok(html.includes('gap:8px'), 'Horizontal gap must be reduced to 8px');
  console.log('✓ Collapsed session header title wraps to 2 lines before truncating');

  // 3. Verify touch targets and date block preserved
  assert.ok(html.includes('class="history-chevron"'), 'Chevron preserved');
  assert.ok(html.includes('data-session-menu='), 'Menu button preserved');
  assert.ok(html.includes('width:44px'), '44dp tap target preserved');

  // 4. Verify set table layout untouched (SET | KG | REPS | RIR)
  assert.ok(html.includes('class="history-set-table-head"'), 'history-set-table-head preserved');
  assert.ok(html.includes('<span>Set</span>'), 'Set header cell preserved');
  assert.ok(html.includes('>kg</span>'), 'kg header cell preserved');
  assert.ok(html.includes('>Reps</span>'), 'Reps header cell preserved');
  assert.ok(html.includes('>RIR</span>'), 'RIR header cell preserved');
  console.log('✓ Set table layout (SET | KG | REPS | RIR) strictly untouched and verified');

  console.log('✓ All U8 History Session Card Polish tests passed successfully!');
}

run();
