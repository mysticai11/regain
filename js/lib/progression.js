/* Progression math: plate calculator, scientific working weights, and progressive overload */

import { profile } from "../state.js";
import { dayRecord } from "../storage.js";
import { getExerciseData } from "../data/plan.js";
import { calcE1RM, getBestE1RM } from "./calc.js";
import { esc, allDayKeys } from "./format.js";
import { isBodyweightExercise } from "../screens/gym/sets.js";
export * from "./progression-compare.js";
export * from "./sports-science.js";

export function getPlateBreakdown(targetWeightKg, barWeightKg) {
  barWeightKg = barWeightKg || 20;
  if (!targetWeightKg || targetWeightKg <= barWeightKg) {
    return { perSide: [], barWeight: barWeightKg, totalWeight: targetWeightKg, sideWeight: 0 };
  }
  var sideWeight = (targetWeightKg - barWeightKg) / 2;
  var availablePlates = [25, 20, 15, 10, 5, 2.5, 1.25];
  var sidePlates = [];
  var rem = sideWeight;
  availablePlates.forEach(function(plate) {
    while (rem >= plate - 0.01) {
      sidePlates.push(plate);
      rem = +(rem - plate).toFixed(2);
    }
  });
  return {
    perSide: sidePlates,
    barWeight: barWeightKg,
    sideWeight: +sideWeight.toFixed(2),
    totalWeight: targetWeightKg,
    remainder: rem
  };
}

export function getScienceBasedWorkingWeight(exId, exName, exConfig) {
  var id = (exId || '').toLowerCase();
  var name = (exName || '').toLowerCase();
  var isBW = isBodyweightExercise(exId, exName);
  if (isBW) return null;
  if (/calf|calves/i.test(id) || /calf|calves/i.test(name)) return null;

  var userWeight = (profile && profile.weight) || 75;
  var keys = allDayKeys().reverse();

  function findLoggedWeight(matchIds) {
    for (var i = 0; i < keys.length; i++) {
      var r = dayRecord(keys[i]);
      if (!r || !r.workout) continue;
      for (var j = 0; j < matchIds.length; j++) {
        var sets = (r.workout[matchIds[j]] || []).filter(function(s){ return s && Number(s.weight) > 0; });
        if (sets.length > 0) {
          var maxW = Math.max.apply(null, sets.map(function(s){ return Number(s.weight); }));
          return { weight: maxW, id: matchIds[j] };
        }
      }
    }
    return null;
  }

  var inc = (exConfig && exConfig.weightIncrement) || 2.5;
  function roundToInc(w) {
    return Math.max(inc, +(Math.round(w / inc) * inc).toFixed(1));
  }

  // 1. CHEST & PRESSING CORRELATIONS
  if (/bench|chest_press|incline/i.test(id) || /bench|chest press|incline/i.test(name)) {
    var foundBench = findLoggedWeight(['bench', 'incline_bench', 'chest_press_machine', 'incline_db_press']);
    if (foundBench) {
      var baseWeight = foundBench.weight;
      var isDb = /db|dumbbell/i.test(id) || /db|dumbbell/i.test(name);
      var factor = 1.0;
      if (/incline_db/i.test(id) || /incline dumbbell/i.test(name)) factor = 0.38;
      else if (/incline/i.test(id) || /incline/i.test(name)) factor = 0.82;
      else if (/close_grip/i.test(id) || /close-grip/i.test(name)) factor = 0.88;
      else if (/chest_press/i.test(id) || /machine/i.test(name)) factor = 0.95;
      else if (isDb) factor = 0.40;

      if (/db|dumbbell/i.test(foundBench.id)) baseWeight = (baseWeight * 2) / 0.8;

      var recW = roundToInc(baseWeight * factor);
      return { weight: recW, source: 'correlated_lift', refLiftName: (getExerciseData(foundBench.id)||{}).name || 'Bench Press', refWeight: foundBench.weight, userWeight: userWeight };
    }
    var isDumbbell = /db|dumbbell/i.test(id) || /db|dumbbell/i.test(name);
    var defW = isDumbbell ? roundToInc(userWeight * 0.20) : roundToInc(userWeight * 0.60);
    return { weight: defW, source: 'bodyweight_ratio', userWeight: userWeight };
  }

  // 2. BACK & PULLING CORRELATIONS
  if (/row|lat_pull|pulldown/i.test(id) || /row|pulldown|pull-down/i.test(name)) {
    var foundPull = findLoggedWeight(['lat_pulldown', 'lat_pulldown_b', 'machine_row', 'machine_row_b', 'barbell_row']);
    if (foundPull) {
      var baseW = foundPull.weight;
      var f = 1.0;
      if (/single_arm/i.test(id)) f = 0.45;
      else if (/machine_row/i.test(id) && /lat_pulldown/i.test(foundPull.id)) f = 0.95;
      else if (/lat_pulldown/i.test(id) && /machine_row/i.test(foundPull.id)) f = 1.05;
      var rW = roundToInc(baseW * f);
      return { weight: rW, source: 'correlated_lift', refLiftName: (getExerciseData(foundPull.id)||{}).name || 'Pulling Lift', refWeight: foundPull.weight, userWeight: userWeight };
    }
    var defPull = roundToInc(userWeight * 0.55);
    return { weight: defPull, source: 'bodyweight_ratio', userWeight: userWeight };
  }

  // 3. LEGS CORRELATIONS
  if (/leg_press|romanian|rdl|leg_ext|hamstring|squat/i.test(id) || /leg press|deadlift|rdl|extension|curl/i.test(name)) {
    var foundLeg = findLoggedWeight(['leg_press', 'romanian_deadlift', 'rdl', 'leg_extension', 'hamstring_curl']);
    if (foundLeg) {
      var baseL = foundLeg.weight;
      var factorL = 1.0;
      if (/leg_press/i.test(id) && !/leg_press/i.test(foundLeg.id)) factorL = 2.0;
      else if ((/leg_ext|extension/i.test(id)) && /leg_press/i.test(foundLeg.id)) factorL = 0.32;
      else if ((/hamstring|curl/i.test(id)) && /leg_press/i.test(foundLeg.id)) factorL = 0.28;
      else if (/romanian|rdl/i.test(id) && /leg_press/i.test(foundLeg.id)) factorL = 0.55;
      var recL = roundToInc(baseL * factorL);
      return { weight: recL, source: 'correlated_lift', refLiftName: (getExerciseData(foundLeg.id)||{}).name || 'Leg Lift', refWeight: foundLeg.weight, userWeight: userWeight };
    }
    var defLeg = /leg_press/i.test(id) ? roundToInc(userWeight * 1.3) : roundToInc(userWeight * 0.45);
    return { weight: defLeg, source: 'bodyweight_ratio', userWeight: userWeight };
  }

  // 4. SHOULDERS
  if (/shoulder|overhead|lateral/i.test(id) || /shoulder|overhead|lateral/i.test(name)) {
    if (/lateral/i.test(id) || /lateral/i.test(name)) {
      return { weight: roundToInc(Math.max(5, userWeight * 0.09)), source: 'bodyweight_ratio', userWeight: userWeight };
    }
    return { weight: roundToInc(userWeight * 0.40), source: 'bodyweight_ratio', userWeight: userWeight };
  }

  // 5. ARMS (BICEPS / TRICEPS)
  if (/curl|tricep|bicep/i.test(id) || /curl|tricep|bicep/i.test(name)) {
    return { weight: roundToInc(userWeight * 0.25), source: 'bodyweight_ratio', userWeight: userWeight };
  }

  return { weight: roundToInc(userWeight * 0.40), source: 'bodyweight_ratio', userWeight: userWeight };
}

export function getOverloadSuggestion(exId, exConfig, lastSets, exName) {
  var repMax = exConfig.repMax || 10;
  var repMin = exConfig.repMin || 6;
  var targetSets = exConfig.sets || 2;
  var increment = exConfig.weightIncrement || 2.5;
  var isBW = typeof isBodyweightExercise === 'function' ? isBodyweightExercise(exId, exName) : false;

  // Case 1: We have previous working sets (from this or equivalent exercise earlier in week)
  if (lastSets && lastSets.length) {
    var validSets = lastSets.filter(function(s){
      return s && (isBW ? Number(s.reps) > 0 : (Number(s.weight) > 0 && Number(s.reps) > 0));
    });

    if (validSets.length) {
      if (isBW) {
        var lastRepsBW = validSets.map(function(s){ return Number(s.reps); });
        var maxRepsBW = Math.max.apply(null, lastRepsBW);
        var addedWeight = Math.max.apply(null, validSets.map(function(s){ return Number(s.weight) || 0; }));
        if (addedWeight > 0) {
          return {
            type: 'add_reps',
            bannerHTML: '<div class="overload-banner overload-reps"><div class="overload-text"><strong>Repeating Lift (Earlier in Week):</strong> Last logged at <strong>BW+' + addedWeight + ' kg × ' + maxRepsBW + ' reps</strong>. Aim for ' + (maxRepsBW + 1) + '–' + (maxRepsBW + 2) + ' reps!</div></div>'
          };
        }
        var nextRepTarget = Math.max(repMin, maxRepsBW + 1);
        return {
          type: 'add_reps',
          bannerHTML: '<div class="overload-banner overload-reps"><div class="overload-text"><strong>Repeating Lift (Earlier in Week):</strong> Last logged <strong>' + lastRepsBW.join(', ') + ' reps (BW)</strong>. Aim for <strong>' + nextRepTarget + ' reps</strong> at Bodyweight!</div></div>'
        };
      }

      var lastWeight = Math.max.apply(null, validSets.map(function(s){ return Number(s.weight); }));
      var lastReps = validSets.map(function(s){ return Number(s.reps); });
      var allAtTop = validSets.length >= targetSets && validSets.slice(0, targetSets).every(function(s){ return Number(s.reps) >= repMax; });

      if (allAtTop) {
        var nextWeight = +(lastWeight + increment).toFixed(2);
        return {
          type: 'increase_weight',
          bannerHTML: '<div class="overload-banner overload-up"><div class="overload-text"><strong>Top range reached (' + lastWeight + ' kg × ' + repMax + ')!</strong> Increase to <strong>' + nextWeight + ' kg</strong> (+' + increment + ' kg) for ' + repMin + '–' + (repMin + 2) + ' reps.</div></div>'
        };
      }

      var maxReps = Math.max.apply(null, lastReps);
      var targetReps = Math.min(repMax, maxReps + 1);
      return {
        type: 'add_reps',
        bannerHTML: '<div class="overload-banner overload-reps"><div class="overload-text"><strong>Repeating Lift (Earlier in Week):</strong> Target <strong>' + targetReps + '–' + repMax + ' reps</strong> at <strong>' + lastWeight + ' kg</strong> (Last: ' + lastReps.join(', ') + ' reps).</div></div>'
      };
    }
  }

  // Case 2: No prior sets logged yet — generate science-based working weight recommendation
  if (typeof getScienceBasedWorkingWeight === 'function') {
    var scienceRec = getScienceBasedWorkingWeight(exId, exName, exConfig);
    if (scienceRec && scienceRec.weight) {
      if (scienceRec.source === 'correlated_lift') {
        return {
          type: 'science_rec',
          suggestedWeight: scienceRec.weight,
          bannerHTML: '<div class="overload-banner overload-reps"><div class="overload-text"><strong>Science-Based Target:</strong> Based on your ' + esc(scienceRec.refLiftName) + ' (' + scienceRec.refWeight + ' kg), recommended starting weight is <strong>' + scienceRec.weight + ' kg</strong> for ' + esc(exConfig.reps) + ' reps.</div></div>'
        };
      } else {
        return {
          type: 'science_rec',
          suggestedWeight: scienceRec.weight,
          bannerHTML: '<div class="overload-banner overload-baseline"><div class="overload-text"><strong>Recommended Working Weight:</strong> Start at <strong>~' + scienceRec.weight + ' kg</strong> (based on ' + scienceRec.userWeight + ' kg bodyweight) for ' + esc(exConfig.reps) + ' reps (1–2 RIR).</div></div>'
        };
      }
    }
  }

  return {
    type: 'baseline',
    bannerHTML: '<div class="overload-banner overload-baseline"><div class="overload-text">Baseline Session: Establish working weight for ' + esc(exConfig.reps) + ' reps with 1–2 RIR in reserve.</div></div>'
  };
}

export function generateProgressionRecommendation(previousSession, currentCompletedSets, config, historySessions) {
  var isCurrentComplete = currentCompletedSets && currentCompletedSets.length >= (config.sets || 2);
  var setsToEvaluate = isCurrentComplete ? currentCompletedSets : (previousSession ? previousSession.sets : []);

  var repMin = config.repMin || 6;
  var repMax = config.repMax || 10;
  var inc = config.weightIncrement || 2.5;

  if (!setsToEvaluate || !setsToEvaluate.length) {
    return {
      category: 'baseline',
      badge: 'Baseline Session',
      badgeClass: 'rec-badge-baseline',
      headline: 'Start with a comfortable working weight',
      targets: 'Aim for ' + repMin + '–' + repMax + ' reps with 1–3 reps in reserve.',
      reason: 'No previous working sets recorded yet for this exercise.',
      actionType: 'baseline',
      suggestedWeight: null
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
      actionType: 'review',
      suggestedWeight: null
    };
  }

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
      badge: 'Deload & Reset',
      badgeClass: 'rec-badge-review',
      headline: 'Consider reducing weight to ' + deloadWeight + ' kg (-10%)',
      targets: 'Use ' + deloadWeight + ' kg to recover and rebuild back into ' + repMin + '–' + repMax + ' reps with pristine form.',
      reason: 'Reps fell below ' + repMin + ' for 2 consecutive sessions. A slight reset prevents fatigue accumulation and stalls.',
      actionType: 'deload',
      suggestedWeight: deloadWeight
    };
  }

  // Check 2: Double Progression - INCREASE WEIGHT
  if (allSetsHitMaxReps) {
    if (anyFailedSet && (config.targetRirMin || 1) >= 1) {
      return {
        category: 'maintain_weight',
        badge: 'Consolidate Effort',
        badgeClass: 'rec-badge-maintain',
        headline: 'Repeat ' + maxWeight + ' kg (Form Consolidation)',
        targets: 'Hit ' + repMax + ' reps on all sets with 1–2 reps in reserve without hitting failure.',
        reason: 'Reached ' + repMax + ' reps ceiling, but one or more sets hit true failure (0 RIR). Consolidate clean execution before adding load.',
        actionType: 'consolidate',
        suggestedWeight: maxWeight
      };
    }

    var nextWeight = +(maxWeight + inc).toFixed(2);
    var rirExplanation = hasRirLogged ? 'with target effort (1–3 RIR)' : '(evaluated by reps; RIR not recorded)';
    return {
      category: 'increase_weight',
      badge: '↑ Increase Weight',
      badgeClass: 'rec-badge-increase',
      headline: 'Advance to ' + nextWeight + ' kg next session (+' + inc + ' kg)',
      targets: 'Try ' + nextWeight + ' kg. Reset target to ' + repMin + '–' + repMax + ' reps with 1–3 RIR.',
      reason: 'All working sets reached ' + repMax + ' reps ' + rirExplanation + '. Double progression threshold achieved!',
      actionType: 'increase',
      suggestedWeight: nextWeight
    };
  }

  // Check 3: Add Reps (Within prescribed range, working toward repMax)
  if (validSets.every(function(s){ return Number(s.reps) >= repMin; })) {
    var targetsList = validSets.slice(0, config.sets || 2).map(function(s, idx){
      var currentR = Number(s.reps);
      var targetR = currentR < repMax ? (currentR + 1) : repMax;
      return 'Set ' + (idx + 1) + ': ' + targetR + ' reps @ ' + s.weight + ' kg';
    });

    var rirNote = hasRirLogged ? ' maintaining 1–3 RIR' : ' with controlled tempo';
    return {
      category: 'add_reps',
      badge: '+ Add Reps',
      badgeClass: 'rec-badge-add',
      headline: 'Keep ' + maxWeight + ' kg — aim for +1 rep per set',
      targets: targetsList.join(' · ') + rirNote + '.',
      reason: 'Working sets are within the ' + repMin + '–' + repMax + ' range but have not yet all reached ' + repMax + ' reps.',
      actionType: 'add_reps',
      suggestedWeight: maxWeight
    };
  }

  // Check 4: Maintain weight
  return {
    category: 'maintain_weight',
    badge: '→ Maintain',
    badgeClass: 'rec-badge-maintain',
    headline: 'Maintain ' + maxWeight + ' kg this session',
    targets: 'Target ' + repMin + '–' + repMax + ' reps on all sets at ' + maxWeight + ' kg.',
    reason: 'Working to achieve clean ' + repMin + '-rep baseline across all working sets before progressing.',
    actionType: 'maintain',
    suggestedWeight: maxWeight
  };
}
