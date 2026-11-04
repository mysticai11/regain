const fs = require('fs');
const assert = require('assert');

const html = fs.readFileSync('index.html', 'utf8');

console.log('--- Testing Gym Precision UI & Data Edits ---');

// 1. Verify Rear Delt Fly merged
assert.ok(html.includes("id:'rear_delt_fly', name:'Rear Delt Fly'"), 'Rear delt fly should be merged into rear_delt_fly');
assert.ok(html.includes("rest-pause (15+5+5, 0 RIR)"), 'Rear delt fly set 2 tag should exist');
assert.ok(html.includes('migrateRearDeltAndCalves'), 'History migration function should exist');

// 2. Verify Calves renamed to Calves without Home
assert.ok(html.includes("id:'calves', name:'Calves'"), 'Calves exercise should be id: calves, name: Calves');
assert.ok(!html.includes("name:'Calves (Home training)'"), 'Old Calves (Home training) should not exist in default routine');

// 3. Numbering and position label
assert.ok(html.includes("(exIndex + 1) + ' / ' + totalExCount"), 'Position numbering "1 / 6" label should exist');
assert.ok(html.includes("gym-ex-collapsed-row"), 'Collapsed exercise row class should exist');

// 4. Accordion structure & auto-advance
assert.ok(html.includes("data-expand-ex"), 'Collapsed row expand click hook should exist');
assert.ok(html.includes("window.activeExpandedExId"), 'Accordion state should track expanded exercise');
assert.ok(html.includes("curSetsDone >= exPlannedSets"), 'Auto-advance check should exist');

// 5. Header format: WED 4 NOV · WEEK 1, no week strip, no per-exercise column headers
assert.ok(html.includes("headerDateStr + ' · WEEK ' + workoutWeek"), 'Header format WED 4 NOV · WEEK 1 should exist');
const renderGymCode = html.slice(html.indexOf('function renderGym()'), html.indexOf('function renderWorkoutTimer'));
assert.ok(!renderGymCode.includes("set-row-headers"), 'Old column headers (# KG REPS EFFORT LOG) should not be rendered in renderGym');
assert.ok(!renderGymCode.includes("gym-sched-cell"), 'Week strip should not be rendered in renderGym');

// 6. Precision set row: 1 [40 kg] [12] RIR 1 ○, tap-to-cycle RIR, 24px complete circle
assert.ok(html.includes("set-row-precision"), 'set-row-precision class should exist');
assert.ok(html.includes("precision-circle"), '24px complete circle should exist');
assert.ok(html.includes("data-cycle-rir"), 'Tap-to-cycle RIR hook should exist');
assert.ok(html.includes("nextTxt = '3+'"), 'RIR cycle text 3+ should exist');
assert.ok(html.includes("nextTxt = 'RIR 2'"), 'RIR cycle text RIR 2 should exist');
assert.ok(html.includes("nextTxt = 'RIR 1'"), 'RIR cycle text RIR 1 should exist');
assert.ok(html.includes("nextTxt = 'F'"), 'RIR cycle text F should exist');

// 7. Inputs #1C1C1F, swap SVG icon, Cues collapsed row, + Add set text action, Start / Keep logging text actions
assert.ok(html.includes("precision-input"), 'Precision input class with #1C1C1F should exist');
assert.ok(html.includes("swap-btn"), 'Swap exercise button should exist');
assert.ok(html.includes("cue-toggle"), 'Collapsed cues toggle should exist');
assert.ok(html.includes(">+ Add set</button>"), 'White text action for + Add set should exist');
assert.ok(html.includes(">Start</button>"), 'Text action Start button should exist');
assert.ok(html.includes(">Keep logging</span>"), 'Plain text Keep logging should exist');

// 8. Placeholders are muted text, not real-looking values
assert.ok(html.includes("placeholderW = isBW ? 'BW' : 'kg'"), 'Placeholder weight should be muted text kg');
assert.ok(html.includes("placeholderR = 'reps'"), 'Placeholder reps should be muted text reps');

console.log('✓ All Gym Precision UI assertions passed with 100% success!');
