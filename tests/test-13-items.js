const fs = require('fs');
const assert = require('assert');

let html = fs.readFileSync('index.html', 'utf8');
if (fs.existsSync('css')) {
  fs.readdirSync('css').forEach(f => {
    html += '\n' + fs.readFileSync('css/' + f, 'utf8');
  });
}
function readAllJs(dir) {
  let res = '';
  if (!fs.existsSync(dir)) return res;
  fs.readdirSync(dir).forEach(f => {
    const p = dir + '/' + f;
    if (fs.statSync(p).isDirectory()) res += '\n' + readAllJs(p);
    else if (f.endsWith('.js')) res += '\n' + fs.readFileSync(p, 'utf8');
  });
  return res;
}
html += readAllJs('js');

console.log('--- Verifying All 13 User Items ---');

// Item 1: ONE sheet style for Swap, Plan editor, Session Date & Day, Settings, Add food, Rest timer
assert.ok(html.includes('.sheet {') && (html.includes('background: #141416') || html.includes('background: var(--surface)')) && (html.includes('border-radius: 20px 20px 0 0') || html.includes('border-radius: var(--r-surface) var(--r-surface) 0 0')), 'Sheet style must use #141416 and 20px top radius');
assert.ok(html.includes('.sheet-handle'), 'Drag handle must exist');
assert.ok(html.includes('Close</button>'), 'Close text action in sheets must exist');
assert.ok(!html.includes('#0b1220') && !html.includes('#121d2d') && !html.includes('#18263a'), 'Old navy colors must be removed');

// Item 2: Inputs & Selects #1C1C1F, no border, 12px radius, 48px high, 11px uppercase label
assert.ok((html.includes('background: #1C1C1F') || html.includes('background: var(--surface-raised)')) && (html.includes('height: 48px') || html.includes('height: var(--tap-min)')), 'Inputs and selects must be #1C1C1F, 48px high, 12px radius');
assert.ok(html.includes("2,700 kcal") || html.includes(".toLocaleString() + ' kcal'"), 'Thousands separator for kcal must exist');

// Item 3: Remove outlined buttons. White 15px text actions. Chosen option = white check (✓)
assert.ok(html.includes('Edit plan</button>'), 'Edit plan must be a text action');
assert.ok(html.includes('Reset default</button>'), 'Reset default must be a text action');
assert.ok(html.includes('✓</span>'), 'White check on chosen option must exist');

// Item 4: Training-day toggles: 7 equal cells, On = #F5F5F4 with dark text, off = #1C1C1F with #55555A
assert.ok(html.includes('.day-toggle.active { background: #F5F5F4 !important; color: #0B0B0C') && html.includes('.day-toggle { background: #1C1C1F !important; border: none !important; color: #55555A'), 'Training day toggle styling must match spec');

// Item 5: Plan editor: 2-line header, single ... menu for day and exercise
assert.ok(html.includes('openActionMenuSheet'), 'Action menu sheet for single ... menu must exist');
assert.ok(html.includes('dayMenuBtn') || html.includes('data-day-menu'), 'Day menu button must exist');
assert.ok(html.includes('data-ex-menu'), 'Exercise menu button must exist');

// Item 6: Session sheet: tappable list with Suggested and Rest day, native date input Wed 4 Nov
assert.ok(html.includes('openGymDateDaySheet'), 'openGymDateDaySheet must exist');
assert.ok(html.includes('Suggested') && html.includes('Rest day'), 'Session sheet must show Suggested and Rest day');
assert.ok(html.includes('Today') && html.includes('Yesterday') && html.includes('2 days ago'), 'Text segments for quick dates must exist');

// Item 7: Swap sheet: plain rows, name left, muscles in text2 with ", " spacing and sentence case
assert.ok(html.includes('openSwapSheet'), 'openSwapSheet must exist');
assert.ok(html.includes("split(', ')") || html.includes("join(', ')"), 'Muscles must have ", " spacing');

// Item 8: Settings: SectionLabels TARGETS, TRAINING DAYS, PLAN, PROFILE, ADVANCED
assert.ok(html.includes('>Targets</span>') && html.includes('>Training days</span>') && html.includes('>Plan</span>') && html.includes('>Profile</span>') && html.includes('>Advanced</span>'), 'SectionLabels must exist in Settings');
assert.ok(html.includes("' shield'") && html.includes('Buy · 100 XP'), 'Streak shields row must show shield and Buy · 100 XP text action');

// Item 9: Weight chart: no preserveAspectRatio="none", 120px high, 6px round dots, 20px inset, dotted goal line with 60 label
assert.ok(!html.includes('preserveAspectRatio="none"'), 'preserveAspectRatio="none" must be removed');
assert.ok(html.includes('viewBox="0 0 340 120"') && html.includes('height:120px'), 'Weight chart must be 120px high');
assert.ok(html.includes('r="3"'), '6px round dots (radius 3) must exist');
assert.ok(html.includes('stroke-dasharray="3 3"') && html.includes('>60</text>') || html.includes('Math.round(goalNum)'), 'Dotted goal line with label must exist');

// Item 10: Dot grid: light every day with logged session via getWorkoutSessions(), Mon-first column letters (M, T, W, T, F, S, S)
assert.ok(html.includes("dayLetters = ['M', 'T', 'W', 'T', 'F', 'S', 'S']") || html.includes("['M', 'T', 'W', 'T', 'F', 'S', 'S']"), 'Mon-first column letters must exist above dot grid');
assert.ok(html.includes('sessionDays[key]'), 'Dot grid must check sessionDays from getWorkoutSessions()');

// Item 11: PR label: only when beating previous best, hide on first-ever logs
assert.ok(html.includes('priorSets.length > 0') && html.includes('isPrInSession = false') && html.includes('maxReps > prevBestReps'), 'PR label must be hidden on first-ever logs and only show when beating previous best');

// Item 12: Gym sets: planned set count, muted placeholders for empty sets, collapsed exercise names wrap to 2 lines
assert.ok(html.includes('visibleCount = Math.max(plannedCount, completedSets.length, manualExtra)'), 'Visible count must show planned count');
assert.ok(html.includes('-webkit-line-clamp:2'), 'Collapsed exercise names must wrap to 2 lines');

// Item 13: Log weight placeholder: #55555A, not blue
assert.ok(html.includes('#progressWeight::placeholder') && html.includes('#55555A'), 'Log weight placeholder must be #55555A');

console.log('✓ All 13 items verified successfully with 100% pass!');
