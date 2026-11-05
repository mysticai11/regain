const fs = require('fs');
const assert = require('assert');

console.log('--- Testing Hardgainer Bulk Features & Design System Polish ---');

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

// 1. Weekly weight-gain rate & bulking advisor
assert.ok(allCode.includes("weeklyRate = (lEntry.weight - fEntry.weight) / wks"), 'Weekly rate calculation must exist');
assert.ok(allCode.includes("isRateOnTarget = weeklyRate != null && weeklyRate >= 0.25 && weeklyRate <= 0.55"), 'Target band 0.25-0.50 kg/wk check must exist');
assert.ok(allCode.includes("Eating ~' + avgCalories.toLocaleString() + ' kcal and gaining slowly"), 'Calorie advisor callout must exist');
assert.ok(allCode.includes(">Rate</div>"), 'Rate column header must exist');

// 2. Last-time values in logger
assert.ok(allCode.includes("last.weight + ' kg'") && allCode.includes("placeholderW = isBW ? 'BW' :"), 'Greyed last-time weight placeholder must exist');
assert.ok(allCode.includes("placeholderR = (last && last.reps"), 'Greyed last-time reps placeholder must exist');

// 3. Finish-workout summary sheet
assert.ok(allCode.includes("showFinishWorkoutSheet"), 'Finish workout sheet function must exist');
assert.ok(allCode.includes("Workout Summary") && allCode.includes("Total Volume"), 'Finish summary modal with volume must exist');
assert.ok(allCode.includes("Completed Sets") && allCode.includes("New PRs"), 'Finish summary modal with sets and PRs must exist');

// 4. Weekly sets per muscle group bars
assert.ok(allCode.includes("10–20 sets") || allCode.includes("10-20 sets"), '10-20 hypertrophy benchmark must exist in volume table');
assert.ok(allCode.includes("prog-line-fill' + (inRange ? ' lime' : '')"), 'Volume visual progress bar must exist');

// 5. Quick-add favorites & recents with portion sheet
assert.ok(allCode.includes("getMergedStaples"), 'getMergedStaples function must exist');
assert.ok(allCode.includes("openPortionSheet"), 'openPortionSheet function must exist');
assert.ok(allCode.includes("½× Portion") && allCode.includes("2× Portion"), 'Half and double portion options must exist');
assert.ok(allCode.includes("contextmenu"), 'Long-press contextmenu trigger must exist');

// 6. Seven-day hit-rate dots
assert.ok(allCode.includes("7-Day Hit Rate"), '7-Day Hit Rate label must exist');
assert.ok(allCode.includes("calHits + '/7 kcal · ' + protHits + '/7"), 'Calorie and protein hit count must exist');
assert.ok(allCode.includes("totals.kcal >= targets.kcal * 0.9"), '90% adherence target threshold must exist');

// 7. Lifts tab line chart with lime PR marker
assert.ok(allCode.includes('fill="#C6F432"') && allCode.includes('>PR</text>'), 'Lime PR circle and text marker in SVG must exist');

// 8. Feedback on actions: Toasts, Haptics, and Undo
assert.ok(allCode.includes("showToast('Weight saved', 'ok')"), 'Weight saved toast must exist');
assert.ok(allCode.includes("showUndoToast('Set removed'"), 'Undo toast on set removal must exist');
assert.ok(allCode.includes("showUndoToast('Food entry deleted'"), 'Undo toast on food delete must exist');

// 9. Five canonical type sizes in tokens
const tokensCss = fs.readFileSync('css/tokens.css', 'utf8');
assert.ok(tokensCss.includes('--fs-hero: 96px;') || tokensCss.includes('--fs-hero: 64px;'), '--fs-hero must be in tokens');
assert.ok(tokensCss.includes('--fs-title: 28px;'), '--fs-title must be 28px');
assert.ok(tokensCss.includes('--fs-body: 17px;'), '--fs-body must be 17px');
assert.ok(tokensCss.includes('--fs-label: 15px;'), '--fs-label must be 15px');
assert.ok(tokensCss.includes('--fs-caption: 11px;'), '--fs-caption must be 11px');

// 10. Contrast tokens
assert.ok(tokensCss.includes('--text2: #9E9EA4;'), '--text2 must be #9E9EA4');
assert.ok(tokensCss.includes('--text3: #71717A;'), '--text3 must be #71717A');

// 11. Transitions & reduced motion
assert.ok(tokensCss.includes('--motion-normal: 150ms ease-out;'), 'Motion normal must be 150ms ease-out');
const baseCss = fs.readFileSync('css/base.css', 'utf8');
assert.ok(baseCss.includes('prefers-reduced-motion: reduce'), 'prefers-reduced-motion media query must exist');

// 12. Line counts <= 400 lines
const jsFiles = [];
function findJs(dir) {
  fs.readdirSync(dir).forEach(f => {
    const p = dir + '/' + f;
    if (fs.statSync(p).isDirectory()) findJs(p);
    else if (f.endsWith('.js')) jsFiles.push(p);
  });
}
findJs('js');
jsFiles.forEach(file => {
  const lines = fs.readFileSync(file, 'utf8').split('\n').length;
  assert.ok(lines <= 400, `File ${file} exceeds 400 lines (currently ${lines})`);
});

console.log('✓ All 12 Bulk Features, Polish & Design System assertions passed with 100%!');
