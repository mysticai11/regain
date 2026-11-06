import assert from 'assert';

console.log('--- Testing Part C: Epley e1RM, PR Rules, Targets, and Rest Timer Defaults ---');

// Mock localStorage & DOM
const store = {};
global.localStorage = {
  getItem: (k) => store[k] || null,
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; },
  clear: () => { Object.keys(store).forEach(k => delete store[k]); },
  get length() { return Object.keys(store).length; },
  key: (i) => Object.keys(store)[i] || null
};
global.window = { localStorage: global.localStorage };

const { calcE1RM, checkExercisePR, isIsolationLift, getTargetsForDate } = await import('../js/lib/calc.js');
const { setProfile } = await import('../js/state.js');
const { saveDayRecord } = await import('../js/storage.js');
const { serializeAllStores, parseAndValidateBackup } = await import('../js/storage-backup.js');

// 1. Epley Formula & >12 Rep Exclusion
console.log('[1/5] Epley formula & >12 reps exclusion');
assert.strictEqual(calcE1RM(100, 1), 100, '1 rep equals weight');
assert.strictEqual(calcE1RM(100, 5), 116.67, '100kg x 5 = 116.67 e1RM');
assert.strictEqual(calcE1RM(100, 10), 133.33, '100kg x 10 = 133.33 e1RM');
assert.strictEqual(calcE1RM(100, 12), 140.00, '100kg x 12 = 140.00 e1RM');
assert.strictEqual(calcE1RM(100, 13), null, 'Sets > 12 reps return null for e1RM');
assert.strictEqual(calcE1RM(50, 15), null, '15 reps returns null');
assert.strictEqual(calcE1RM(0, 10), 0, '0 weight returns 0');

// 2. Isolation Identification
console.log('[2/5] Isolation vs Compound lift detection');
assert.strictEqual(isIsolationLift('bench', { isCompound: true }), false, 'Bench is compound');
assert.strictEqual(isIsolationLift('ez_bar_curl', { type: 'isolation' }), true, 'EZ-Bar Curl is isolation');
assert.strictEqual(isIsolationLift('lateral_raise_machine', {}), true, 'Lateral raise inferred as isolation');
assert.strictEqual(isIsolationLift('squat', {}), false, 'Squat is compound');

// 3. PR Calculation: Compound vs Isolation Rules
console.log('[3/5] PR rules: Compound e1RM improvement >= 0.5kg, Isolation weight/rep increase at same load');

// Baseline day
saveDayRecord('2026-11-01', {
  workout: {
    bench: [{ weight: 80, reps: 5 }], // e1RM: 80 * (1 + 5/30) = 93.33
    ez_bar_curl: [{ weight: 25, reps: 8 }] // Isolation baseline: 25kg x 8 reps
  }
});

// Test First-ever log (no history)
const baselineTest = checkExercisePR('overhead_press', 50, 5, '2026-11-02');
assert.strictEqual(baselineTest.isPR, false, 'First-ever log is baseline, not PR');

// Test Compound PR:
// Same performance -> not a PR
const compEqual = checkExercisePR('bench', 80, 5, '2026-11-02');
assert.strictEqual(compEqual.isPR, false, 'Equal performance is not a PR');

// Negligible increase (< 0.5kg e1RM) -> not a PR
// 80kg x 5 reps = 93.33 e1RM. 80.25kg x 5 = 93.62 (+0.29kg) -> not a PR
const compTiny = checkExercisePR('bench', 80.25, 5, '2026-11-02');
assert.strictEqual(compTiny.isPR, false, 'Increase < 0.5kg e1RM is not a PR');

// Meaningful increase (>= 0.5kg e1RM) -> PR!
// 82.5kg x 5 reps = 96.25 e1RM (+2.92kg)
const compPR = checkExercisePR('bench', 82.5, 5, '2026-11-02');
assert.strictEqual(compPR.isPR, true, 'Increase >= 0.5kg e1RM is a valid PR');
assert.strictEqual(compPR.type, 'e1rm');

// >12 reps on compound -> not a PR
const compHighReps = checkExercisePR('bench', 75, 14, '2026-11-02');
assert.strictEqual(compHighReps.isPR, false, '> 12 reps excluded from compound PRs');

// Test Isolation PR:
// Baseline was 25kg x 8 reps
// Same weight, more reps (25kg x 9) -> PR!
const isoRepPR = checkExercisePR('ez_bar_curl', 25, 9, '2026-11-02');
assert.strictEqual(isoRepPR.isPR, true, 'Rep increase at same load is a valid isolation PR');
assert.strictEqual(isoRepPR.type, 'reps');

// Same weight, same reps (25kg x 8) -> not a PR
const isoEqual = checkExercisePR('ez_bar_curl', 25, 8, '2026-11-02');
assert.strictEqual(isoEqual.isPR, false, 'Equal reps at same load is not a PR');

// Higher weight (27.5kg x 7) -> PR!
const isoWeightPR = checkExercisePR('ez_bar_curl', 27.5, 7, '2026-11-02');
assert.strictEqual(isoWeightPR.isPR, true, 'Weight increase with >=6 reps is a valid isolation PR');
assert.strictEqual(isoWeightPR.type, 'weight');

// Lower weight with slightly higher reps giving higher math e1RM -> NOT a PR for isolation
// e.g. 20kg x 12 = 28 e1RM vs 25kg x 8 = 31.67 e1RM, but even if math were higher:
const isoDropWeight = checkExercisePR('ez_bar_curl', 22.5, 8, '2026-11-02');
assert.strictEqual(isoDropWeight.isPR, false, 'Lower weight is not a PR');

// 4. Target Resolution (Settings vs Hardcoded)
console.log('[4/5] Target resolution strictly from profile settings');
setProfile({
  trainingDays: [1, 2, 4, 5, 6], // Mon, Tue, Thu, Fri, Sat
  calTargetGym: 3100,
  calTargetRest: 2600,
  protTargetGym: 165,
  protTargetRest: 145,
  goal: 'loss' // Even with goal loss, saved targets must be respected
});

// Monday (training day)
const monTargets = getTargetsForDate('2026-11-02');
assert.strictEqual(monTargets.kcal, 3100, 'Uses profile.calTargetGym on training day');
assert.strictEqual(monTargets.protein, 165, 'Uses profile.protTargetGym on training day');

// Wednesday (rest day)
const wedTargets = getTargetsForDate('2026-11-04');
assert.strictEqual(wedTargets.kcal, 2600, 'Uses profile.calTargetRest on rest day');
assert.strictEqual(wedTargets.protein, 145, 'Uses profile.protTargetRest on rest day');

// 5. Naming in Backup
console.log('[5/5] Backup export metadata has app = "regain"');
const backupPayload = await serializeAllStores();
assert.strictEqual(backupPayload.app, 'regain', 'App name in backup is regain');

console.log('=============================================');
console.log(' ALL PART C UNIT TESTS PASSED WITH 100%! ');
console.log('=============================================');
