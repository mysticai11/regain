const assert = require('assert');

// 1. Core Comparison Engine
function compareExerciseSessions(previousSession, currentSets, plannedCount) {
  var prevSets = (previousSession && previousSession.sets) 
    ? previousSession.sets.filter(function(s){ return s && !s.isWarmup && (Number(s.reps)>0 || Number(s.weight)>0); }) 
    : [];
  var currValid = (currentSets || []).map(function(s, idx){
    if (!s || s.isWarmup || (!Number(s.reps) && !Number(s.weight))) return null;
    return {
      index: idx,
      weight: Number(s.weight) || 0,
      reps: Number(s.reps) || 0,
      rir: s.rir !== '' && s.rir != null ? Number(s.rir) : null,
      isWarmup: !!s.isWarmup
    };
  });
  
  if (!previousSession || !prevSets.length) {
    return {
      hasPrevious: false,
      dateLabel: null,
      status: 'baseline',
      statusLabel: 'Baseline Session',
      statusClass: 'status-neutral',
      rows: (currentSets || []).map(function(c, i){
        return {
          setNum: i + 1,
          prevText: '—',
          currText: (c && (c.weight || c.reps)) ? (c.weight + ' kg × ' + c.reps + (c.rir === 0 ? ' (F)' : (c.rir != null ? ' (' + c.rir + ' RIR)' : ''))) : '— (Pending)',
          changeText: '—',
          changeClass: 'change-neutral',
          isCompleted: !!(c && Number(c.weight) > 0 && Number(c.reps) > 0)
        };
      }),
      summaryText: 'First recorded session for this exercise. Future workouts will compare against these numbers.'
    };
  }

  var totalRows = Math.max(plannedCount || 2, prevSets.length, currValid.length);
  var rows = [];
  var improvedCount = 0;
  var declinedCount = 0;
  var maintainedCount = 0;
  var completedComparisons = 0;

  for (var i = 0; i < totalRows; i++) {
    var p = prevSets[i] || null;
    var c = currValid[i] || null;
    
    var prevText = p ? (p.weight + ' kg × ' + p.reps + (p.rir === 0 ? ' (F)' : (p.rir != null ? ' (' + p.rir + ' RIR)' : ''))) : '—';
    var currText = c ? (c.weight + ' kg × ' + c.reps + (c.rir === 0 ? ' (F)' : (c.rir != null ? ' (' + c.rir + ' RIR)' : ''))) : '— (Pending)';
    var changeText = '—';
    var changeClass = 'change-neutral';

    if (p && c) {
      completedComparisons++;
      var loadDiff = +(c.weight - p.weight).toFixed(2);
      var repDiff = c.reps - p.reps;
      var rirDiff = (c.rir != null && p.rir != null) ? (c.rir - p.rir) : null;

      var parts = [];
      if (loadDiff !== 0) parts.push((loadDiff > 0 ? '+' : '') + loadDiff + ' kg');
      if (repDiff !== 0) parts.push((repDiff > 0 ? '+' : '') + repDiff + ' rep' + (Math.abs(repDiff) === 1 ? '' : 's'));

      if (parts.length > 0) {
        changeText = parts.join(', ');
        if (rirDiff != null && rirDiff !== 0 && loadDiff === 0) {
          changeText += ' (' + (rirDiff > 0 ? '+' : '') + rirDiff + ' RIR)';
        }
      } else {
        if (rirDiff != null && rirDiff !== 0) {
          changeText = 'Same load/reps (' + (rirDiff > 0 ? '+' : '') + rirDiff + ' RIR)';
        } else {
          changeText = 'No change';
        }
      }

      var isSetImproved = (loadDiff > 0 && repDiff >= 0) || (loadDiff >= 0 && repDiff > 0) || (loadDiff === 0 && repDiff === 0 && rirDiff != null && rirDiff > 0);
      var isSetDeclined = (loadDiff < 0 && repDiff <= 0) || (loadDiff <= 0 && repDiff < 0) || (loadDiff === 0 && repDiff === 0 && rirDiff != null && rirDiff < 0 && c.rir === 0);

      if (isSetImproved) {
        improvedCount++;
        changeClass = 'change-positive';
      } else if (isSetDeclined) {
        declinedCount++;
        changeClass = 'change-negative';
      } else {
        maintainedCount++;
        changeClass = 'change-neutral';
      }
    } else if (c && !p) {
      changeText = '+1 extra set';
      changeClass = 'change-positive';
      improvedCount++;
      completedComparisons++;
    }

    rows.push({
      setNum: i + 1,
      prevText: prevText,
      currText: currText,
      changeText: changeText,
      changeClass: changeClass,
      isCompleted: !!c
    });
  }

  var status = 'neutral';
  var statusLabel = 'In Progress';
  var statusClass = 'status-neutral';

  if (completedComparisons === 0) {
    status = 'pending';
    statusLabel = 'Awaiting Sets';
    statusClass = 'status-neutral';
  } else if (improvedCount > 0 && declinedCount === 0) {
    status = 'improved';
    statusLabel = 'Improved' + (completedComparisons < prevSets.length ? ' (' + completedComparisons + '/' + prevSets.length + ' sets)' : '');
    statusClass = 'status-positive';
  } else if (declinedCount > 0 && improvedCount === 0) {
    status = 'declined';
    statusLabel = 'Declined' + (completedComparisons < prevSets.length ? ' (' + completedComparisons + '/' + prevSets.length + ' sets)' : '');
    statusClass = 'status-negative';
  } else if (maintainedCount > 0 && improvedCount === 0 && declinedCount === 0) {
    status = 'maintained';
    statusLabel = 'Maintained' + (completedComparisons < prevSets.length ? ' (' + completedComparisons + '/' + prevSets.length + ' sets)' : '');
    statusClass = 'status-neutral';
  } else {
    status = 'inconclusive';
    statusLabel = 'Mixed / Neutral (' + improvedCount + ' up, ' + declinedCount + ' down)';
    statusClass = 'status-neutral';
  }

  return {
    hasPrevious: true,
    dayKey: previousSession.dayKey,
    dateLabel: previousSession.dateFormatted,
    status: status,
    statusLabel: statusLabel,
    statusClass: statusClass,
    completedComparisons: completedComparisons,
    totalExpected: prevSets.length,
    rows: rows
  };
}

// 2. Core Progression Recommendation Engine
function generateProgressionRecommendation(previousSession, currentCompletedSets, config, historySessions) {
  var isCurrentComplete = currentCompletedSets && currentCompletedSets.length >= (config.sets || 2);
  var setsToEvaluate = isCurrentComplete ? currentCompletedSets : (previousSession ? previousSession.sets : []);
  
  if (!setsToEvaluate || !setsToEvaluate.length) {
    return {
      category: 'baseline',
      badge: 'Baseline Session',
      badgeClass: 'rec-badge-baseline',
      headline: 'Start with comfortable working weight',
      targets: 'Aim for ' + config.repMin + '–' + config.repMax + ' reps with 1–3 RIR.',
      reason: 'No previous working sets recorded yet for this exercise.',
      actionType: 'baseline',
      suggestedWeight: null,
      repMin: config.repMin,
      repMax: config.repMax
    };
  }

  var validSets = setsToEvaluate.filter(function(s){ return s && !s.isWarmup && Number(s.reps) > 0 && Number(s.weight) > 0; });
  if (!validSets.length) {
    return {
      category: 'review_adjust',
      badge: 'Review Sets',
      badgeClass: 'rec-badge-review',
      headline: 'Log working sets to generate targets',
      targets: 'Enter valid weight and reps for all prescribed sets.',
      reason: 'Incomplete or missing set data in the recorded session.',
      actionType: 'review'
    };
  }

  var repMin = config.repMin || 6;
  var repMax = config.repMax || 10;
  var inc = config.weightIncrement || 2.5;
  var maxWeight = validSets.reduce(function(m, s){ return Math.max(m, Number(s.weight)); }, 0);
  var allSetsHitMaxReps = validSets.every(function(s){ return Number(s.reps) >= repMax; });
  var anyFailedSet = validSets.some(function(s){ return s.rir === 0; });
  var hasRirLogged = validSets.some(function(s){ return s.rir != null; });
  var subMinSets = validSets.filter(function(s){ return Number(s.reps) < repMin; });

  // Check 1: Review or Adjust for repeated drops (2+ sessions with sub-minimum reps)
  var consecutiveDrops = 0;
  if (subMinSets.length > 0) {
    consecutiveDrops = 1;
    if (historySessions && historySessions.length > 0) {
      var prev2 = historySessions[0];
      if (prev2 && prev2.sets && prev2.sets.some(function(s){ return Number(s.reps) < repMin; })) {
        consecutiveDrops = 2;
      }
    }
  }

  if (consecutiveDrops >= 2) {
    var deloadWeight = Math.max(inc, Math.round(((maxWeight * 0.9) / inc)) * inc);
    return {
      category: 'review_adjust',
      badge: 'Review Load / Deload',
      badgeClass: 'rec-badge-review',
      headline: 'Consider reducing weight to ' + deloadWeight + ' kg',
      targets: 'Drop to ' + deloadWeight + ' kg (−10%) to reset and build back within ' + repMin + '–' + repMax + ' reps with clean form.',
      reason: 'Reps dropped below ' + repMin + ' across 2 consecutive sessions. A slight reset prevents fatigue stalling.',
      actionType: 'deload',
      suggestedWeight: deloadWeight
    };
  }

  // Check 2: Double Progression - INCREASE WEIGHT
  if (allSetsHitMaxReps) {
    if (anyFailedSet && (config.targetRirMin || 1) >= 1) {
      return {
        category: 'maintain_weight',
        badge: 'Maintain Weight',
        badgeClass: 'rec-badge-maintain',
        headline: 'Maintain ' + maxWeight + ' kg (Form Consolidation)',
        targets: 'Repeat ' + maxWeight + ' kg for ' + repMax + ' reps, but with 1–2 reps in reserve without hitting failure.',
        reason: 'Reached ' + repMax + ' reps, but one or more sets hit true failure (0 RIR). Consolidate effort before adding load.',
        actionType: 'consolidate',
        suggestedWeight: maxWeight
      };
    }

    var nextWeight = +(maxWeight + inc).toFixed(2);
    var rirExplanation = hasRirLogged ? 'with target effort (1–3 RIR)' : '(evaluated by reps; RIR not recorded)';
    return {
      category: 'increase_weight',
      badge: 'Increase Weight',
      badgeClass: 'rec-badge-increase',
      headline: 'Try ' + nextWeight + ' kg next session (+ ' + inc + ' kg)',
      targets: 'Advance to ' + nextWeight + ' kg. Reset target to ' + repMin + '–' + repMax + ' reps with 1–3 RIR.',
      reason: 'All working sets reached ' + repMax + ' reps ' + rirExplanation + '. Double progression threshold achieved!',
      actionType: 'increase',
      suggestedWeight: nextWeight,
      targetReps: repMin + '–' + repMax
    };
  }

  // Check 3: Add Reps (Within prescribed range, working toward repMax)
  if (validSets.every(function(s){ return Number(s.reps) >= repMin; })) {
    var targetsList = validSets.map(function(s, idx){
      var currentR = Number(s.reps);
      var targetR = currentR < repMax ? (currentR + 1) : repMax;
      return 'Set ' + (idx + 1) + ': ' + targetR + ' reps @ ' + s.weight + ' kg';
    });

    var rirNote = hasRirLogged ? ' maintaining 1–3 RIR' : ' with controlled form';
    return {
      category: 'add_reps',
      badge: 'Add Reps',
      badgeClass: 'rec-badge-add',
      headline: 'Keep ' + maxWeight + ' kg, aim for +1 rep per set',
      targets: targetsList.join(' · ') + rirNote + '.',
      reason: 'Working sets are within the ' + repMin + '–' + repMax + ' range but have not all hit the ' + repMax + '-rep ceiling yet.',
      actionType: 'add_reps',
      suggestedWeight: maxWeight
    };
  }

  // Check 4: Maintain weight
  return {
    category: 'maintain_weight',
    badge: 'Maintain Weight',
    badgeClass: 'rec-badge-maintain',
    headline: 'Maintain ' + maxWeight + ' kg',
    targets: 'Target ' + repMin + '–' + repMax + ' reps on all sets at ' + maxWeight + ' kg.',
    reason: 'Working to achieve clean ' + repMin + '-rep baseline across all working sets before progressing.',
    actionType: 'maintain',
    suggestedWeight: maxWeight
  };
}

// ------------------- TEST SUITE -------------------
console.log('--- Running Tests for Feature A (Comparison) ---');

// Test 1: Baseline Session (no previous data)
var t1 = compareExerciseSessions(null, [{weight: 35, reps: 8, rir: 2}], 2);
assert.strictEqual(t1.hasPrevious, false);
assert.strictEqual(t1.status, 'baseline');
console.log('✓ Test 1 Passed: Correct baseline state on first session');

// Test 2: Improved Session (+1 rep on each set)
var prevSession = {
  dayKey: '2026-10-20',
  dateFormatted: 'Oct 20',
  sets: [{weight: 35, reps: 8, rir: 2}, {weight: 35, reps: 8, rir: 2}]
};
var currSets = [{weight: 35, reps: 9, rir: 2}, {weight: 35, reps: 8, rir: 2}];
var t2 = compareExerciseSessions(prevSession, currSets, 2);
assert.strictEqual(t2.hasPrevious, true);
assert.strictEqual(t2.status, 'improved');
assert.strictEqual(t2.rows[0].changeText, '+1 rep');
assert.strictEqual(t2.rows[1].changeText, 'No change');
console.log('✓ Test 2 Passed: Correct set-by-set delta and overall "Improved" status');

// Test 3: Declined Session (loss of reps)
var currSetsDeclined = [{weight: 35, reps: 7, rir: 1}, {weight: 35, reps: 6, rir: 0}];
var t3 = compareExerciseSessions(prevSession, currSetsDeclined, 2);
assert.strictEqual(t3.status, 'declined');
assert.strictEqual(t3.rows[0].changeText, '-1 rep (-1 RIR)');
console.log('✓ Test 3 Passed: Correct detection of "Declined" session with RIR decrease');

// Test 4: Inconclusive / Mixed Session (+1 rep on set 1, but -2 reps on set 2)
var currSetsMixed = [{weight: 35, reps: 9, rir: 2}, {weight: 35, reps: 6, rir: 1}];
var t4 = compareExerciseSessions(prevSession, currSetsMixed, 2);
assert.strictEqual(t4.status, 'inconclusive');
console.log('✓ Test 4 Passed: Inconclusive/Mixed status when performance is divergent');

// Test 5: Active In-Progress Session (Set 1 logged, Set 2 pending)
var currSetsInProgress = [{weight: 35, reps: 9, rir: 2}];
var t5 = compareExerciseSessions(prevSession, currSetsInProgress, 2);
assert.strictEqual(t5.completedComparisons, 1);
assert.strictEqual(t5.rows[1].currText, '— (Pending)');
assert.strictEqual(t5.rows[1].changeText, '—');
assert.strictEqual(t5.status, 'improved'); // 1 of 2 sets logged
console.log('✓ Test 5 Passed: Active in-progress comparison distinguishes pending sets cleanly');

// Test 6: Warmup Sets are excluded
var prevWithWarmup = {
  dayKey: '2026-10-20',
  dateFormatted: 'Oct 20',
  sets: [{weight: 20, reps: 10, isWarmup: true}, {weight: 35, reps: 8, rir: 2}]
};
var t6 = compareExerciseSessions(prevWithWarmup, [{weight: 35, reps: 8, rir: 2}], 1);
assert.strictEqual(t6.rows[0].prevText.startsWith('35 kg'), true);
console.log('✓ Test 6 Passed: Warmup sets excluded from working set comparison');

console.log('\n--- Running Tests for Feature B (Progression Engine) ---');

var config6_10 = { repMin: 6, repMax: 10, targetRirMin: 1, targetRirMax: 3, weightIncrement: 2.5 };

// Test 7: Double Progression - INCREASE WEIGHT when all sets hit 10 reps @ 2 RIR
var setsAtTop = [{weight: 30, reps: 10, rir: 2}, {weight: 30, reps: 10, rir: 2}];
var p1 = generateProgressionRecommendation({ sets: setsAtTop }, setsAtTop, config6_10, []);
assert.strictEqual(p1.category, 'increase_weight');
assert.strictEqual(p1.suggestedWeight, 32.5);
assert.strictEqual(p1.headline.includes('32.5 kg'), true);
console.log('✓ Test 7 Passed: Increase weight (+2.5 kg) recommended when top reps achieved within target RIR');

// Test 8: Failure Disqualification - Hit 10 reps but Set 2 was at 0 RIR (Failure)
var setsAtTopWithFailure = [{weight: 30, reps: 10, rir: 2}, {weight: 30, reps: 10, rir: 0}];
var p2 = generateProgressionRecommendation({ sets: setsAtTopWithFailure }, setsAtTopWithFailure, config6_10, []);
assert.strictEqual(p2.category, 'maintain_weight');
assert.strictEqual(p2.suggestedWeight, 30);
assert.strictEqual(p2.reason.includes('hit true failure'), true);
console.log('✓ Test 8 Passed: Weight increase disqualified when set taken to true failure contrary to effort target');

// Test 9: Add Reps - Inside rep range (8 reps, 7 reps)
var setsInProgress = [{weight: 40, reps: 8, rir: 2}, {weight: 40, reps: 7, rir: 2}];
var p3 = generateProgressionRecommendation({ sets: setsInProgress }, setsInProgress, config6_10, []);
assert.strictEqual(p3.category, 'add_reps');
assert.strictEqual(p3.suggestedWeight, 40);
assert.strictEqual(p3.targets.includes('Set 1: 9 reps @ 40 kg'), true);
assert.strictEqual(p3.targets.includes('Set 2: 8 reps @ 40 kg'), true);
console.log('✓ Test 9 Passed: Add reps recommended targeting +1 rep per set within rep range');

// Test 10: Review or Deload - 2 consecutive sessions below 6 reps
var setsBelowMin1 = [{weight: 50, reps: 5, rir: 1}, {weight: 50, reps: 4, rir: 0}];
var historySessionBelowMin = [{ sets: [{weight: 50, reps: 5, rir: 0}, {weight: 50, reps: 4, rir: 0}] }];
var p4 = generateProgressionRecommendation({ sets: setsBelowMin1 }, setsBelowMin1, config6_10, historySessionBelowMin);
assert.strictEqual(p4.category, 'review_adjust');
assert.strictEqual(p4.actionType, 'deload');
assert.strictEqual(p4.suggestedWeight, 45); // 50 * 0.9 = 45 kg
console.log('✓ Test 10 Passed: Flagged for review / deload (-10%) on 2 consecutive sub-minimum sessions');

// Test 11: Missing RIR Fallback Policy
var setsNoRir = [{weight: 30, reps: 10, rir: null}, {weight: 30, reps: 10, rir: null}];
var p5 = generateProgressionRecommendation({ sets: setsNoRir }, setsNoRir, config6_10, []);
assert.strictEqual(p5.category, 'increase_weight');
assert.strictEqual(p5.reason.includes('RIR not recorded'), true);
console.log('✓ Test 11 Passed: Missing RIR explicitly documented in progression reason');

// Test 12: Custom Equipment Increment (e.g. Dumbbell 2.0 kg increment, Lateral raise 10-15 reps)
var configDb = { repMin: 10, repMax: 15, targetRirMin: 0, targetRirMax: 2, weightIncrement: 2.0 };
var setsDb = [{weight: 12, reps: 15, rir: 1}, {weight: 12, reps: 15, rir: 1}];
var p6 = generateProgressionRecommendation({ sets: setsDb }, setsDb, configDb, []);
assert.strictEqual(p6.category, 'increase_weight');
assert.strictEqual(p6.suggestedWeight, 14.0); // 12 + 2.0 = 14 kg
assert.strictEqual(p6.targetReps, '10–15');
console.log('✓ Test 12 Passed: Custom rep ranges (10–15) and equipment increments (2.0 kg) respected');

console.log('\nAll 12 progression & comparison engine tests passed with 100% assertions satisfied!');
