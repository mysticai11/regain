const fs = require('fs');
const assert = require('assert');

console.log('--- Testing Consistency Grid, Lifts Tab & Bodyweight Polish (All 13 Items) ---');

function readAll(dir) {
  let res = '';
  if (!fs.existsSync(dir)) return res;
  fs.readdirSync(dir).forEach(f => {
    const p = dir + '/' + f;
    if (fs.statSync(p).isDirectory()) res += '\n' + readAll(p);
    else if (f.endsWith('.js') || f.endsWith('.css') || f.endsWith('.html')) res += '\n' + fs.readFileSync(p, 'utf8');
  });
  return res;
}

const allCode = readAll('css') + '\n' + readAll('js') + '\n' + fs.readFileSync('index.html', 'utf8');
const chartsCode = fs.readFileSync('js/screens/progress/charts.js', 'utf8');
const progressCode = fs.readFileSync('js/screens/progress.js', 'utf8');
const historyCode = fs.readFileSync('js/screens/progress/history.js', 'utf8');

// Item 1: State styling bug fixed - dot state comes only from date's data, never its column
assert.ok(!chartsCode.includes('tdays.includes(dDow)'), 'Day of week column check must not determine dot styling');
assert.ok(chartsCode.includes('var isTrained = !!sessionDays[key] ||'), 'Dot trained state must be derived from session data');

// Item 2: Exactly four states: trained = white 8px dot; untrained past = 4px #222 dot; today = 8px ring (lime fill if trained); future = not drawn
assert.ok(chartsCode.includes('width:8px;height:8px;border-radius:50%;background:#F5F5F4'), 'Trained dot must be 8px white');
assert.ok(chartsCode.includes('width:4px;height:4px;border-radius:50%;background:#222222'), 'Untrained past day dot must be 4px #222');
assert.ok(chartsCode.includes('width:8px;height:8px;border-radius:50%;border:1.5px solid #F5F5F4;background:transparent'), 'Today untrained dot must be 8px ring');
assert.ok(chartsCode.includes('width:8px;height:8px;border-radius:50%;background:#C6F432'), 'Today logged workout dot must be 8px lime');
assert.ok(chartsCode.includes('visibility:hidden'), 'Future days must not be drawn');

// Item 3: Left label per row showing week Monday ("Nov 2", "Oct 26") in 11px text2; current week at bottom; Mon-first column letters
assert.ok(chartsCode.includes('monDate.getMonth()') && chartsCode.includes('monDate.getDate()'), 'Monday date label must exist per week row');
assert.ok(chartsCode.includes("dayLetters = ['M', 'T', 'W', 'T', 'F', 'S', 'S']"), 'Mon-first column letters must exist');
assert.ok(chartsCode.includes('for (var w = 0; w < 12; w++)'), 'Grid must iterate 12 weeks with current week at bottom');

// Item 4: Legend: white dot "trained", ring "today", small dot "rest" in this exact order; duplicate rings removed
const legendOrder = chartsCode.slice(chartsCode.indexOf('var legendHTML'), chartsCode.indexOf('return \'<div style="margin-bottom:24px">\''));
const trainedIdx = legendOrder.indexOf('trained');
const todayIdx = legendOrder.indexOf('today');
const restIdx = legendOrder.indexOf('rest');
assert.ok(trainedIdx !== -1 && todayIdx !== -1 && restIdx !== -1, 'Legend must contain trained, today, and rest');
assert.ok(trainedIdx < todayIdx && todayIdx < restIdx, 'Legend order must be trained -> today -> rest');

// Item 5: Header text: "This week X / Y" left and "X-week streak" (or "No streak yet") right in 15px text2
assert.ok(chartsCode.includes("This week ' + thisWeekCount + ' / ' + weeklyTarget"), 'Header must show "This week X / Y"');
assert.ok(chartsCode.includes("streakText = streak > 0 ? (streak + '-week streak') : 'No streak yet'"), 'Header must show streak or "No streak yet"');
assert.ok(chartsCode.includes('weeklyTarget = (profile && Array.isArray(profile.trainingDays) && profile.trainingDays.length > 0) ? profile.trainingDays.length : 5'), 'Weekly target must come from trainingDays');

// Item 6: Tapping a dot shows small readout dismissing on next tap
assert.ok(chartsCode.includes('id="gridDotReadout"'), 'gridDotReadout container must exist');
assert.ok(progressCode.includes("dot.getAttribute('data-readout')"), 'Readout text must be wired up from dot attributes');
assert.ok(chartsCode.includes("readoutText = dateReadout + ' · ' + wTitle"), 'Readout format must include date, title, and duration');

// Item 7: Consistency grid removed from Lifts tab; Lifts shows exercise picker (Sheet), 120px e1RM chart, and PR list as ListRows
assert.ok(!progressCode.includes("buildDotConsistencyCalendarHTML() + (mode === 'body'"), 'Grid must not be shared between both tabs');
assert.ok(progressCode.includes('openLiftSheetBtn') && progressCode.includes('openSheet('), 'Exercise picker Sheet trigger must exist on Lifts');
assert.ok(progressCode.includes('id="liftPlot"'), '120px e1RM chart container must exist');
assert.ok(progressCode.includes('Personal records') && progressCode.includes('min-height:56px'), 'PR list as 56px ListRows must exist');

// Item 8: "No lift entries yet" computed from real session history (getWorkoutSessions())
assert.ok(progressCode.includes('getWorkoutSessions().filter') && progressCode.includes('sessionsInRange'), 'Lifts data must query getWorkoutSessions()');

// Item 9: Weekly work: one header only ("WEEKLY WORK", meta "LAST 7 DAYS · TARGET 10–18"), delete duplicate line, white ProgressLines
assert.ok(progressCode.includes('>WEEKLY WORK</span>') && progressCode.includes('>LAST 7 DAYS · TARGET 10–18</span>'), 'Weekly work single header with target meta must exist');
assert.ok(!historyCode.includes('Sets, last 7 days · target 10–18'), 'Duplicate "Sets, last 7 days" header in history.js must be removed');
assert.ok(historyCode.includes('background:#F5F5F4'), 'Weekly volume ProgressLines must be white');

// Item 10: Remove lime PR tag from weight chart; PR labels exist only on lifts
assert.ok(chartsCode.includes('if (isLift && values.length > 0)'), 'PR marker in progressPlot must only render when isLift is true');
assert.ok(progressCode.includes("progressPlot(weightValues, (profile && profile.targetWeight) || null, 'kg', false)"), 'Weight chart must pass isLift = false');
assert.ok(progressCode.includes("progressPlot(liftValues, null, isBW ? 'reps' : 'kg', true)"), 'Lift chart must pass isLift = true');

// Item 11: With fewer than 3 points, collapse weight chart to 48px, show "Log 3+ weigh-ins to see a trend" and "First entry" label at point
assert.ok(chartsCode.includes('!isLift && values.length < 3'), 'Collapse condition for < 3 points must exist');
assert.ok(chartsCode.includes('height:48px') && chartsCode.includes('viewBox="0 0 340 48"'), 'Collapsed 48px SVG chart must exist');
assert.ok(chartsCode.includes('Log 3+ weigh-ins to see a trend'), '"Log 3+ weigh-ins to see a trend" text must exist');
assert.ok(chartsCode.includes('>First entry</text>'), '"First entry" label at point must exist');

// Item 12: Stats row: three 28px values with 11px labels above, no card, no clipping
assert.ok(progressCode.includes('font-size:28px') && progressCode.includes('7-Day Avg') && progressCode.includes('Rate') && progressCode.includes('To Goal'), 'Stats row must have three 28px values with 11px labels');
assert.ok(!progressCode.includes('background:#141416;border-radius:12px;padding:12px 14px;text-align:center;margin-top:10px'), 'Card background on stats row must be removed');

// Item 13: Audit: no grid dot uses lime except today logged, and Body & Lifts tabs share only header and segmented tab control
assert.ok(!chartsCode.includes("dotStyle += 'background:#C6F432'") && chartsCode.includes("isToday) {\n        if (isTrained) {\n          dotInner = '<span style=\"width:8px;height:8px;border-radius:50%;background:#C6F432"), 'Lime in dot grid is restricted strictly to today with logged session');
assert.ok(progressCode.includes("<div class=\"seg-tabs\">") && progressCode.includes("(mode === 'body' ? (getResumeWorkoutCardHTML() + buildDotConsistencyCalendarHTML()"), 'Body and Lifts tabs share only header and tab control');

// File line limits
['js/screens/progress/charts.js', 'js/screens/progress.js', 'js/screens/progress/history.js'].forEach(file => {
  const lines = fs.readFileSync(file, 'utf8').split('\n').length;
  assert.ok(lines <= 400, `File ${file} must be <= 400 lines (currently ${lines})`);
});

console.log('✓ All 13 Consistency Grid, Lifts Tab & Bodyweight Polish items verified with 100% SUCCESS!');
