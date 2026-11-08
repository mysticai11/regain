/* Evidence-based Sports Science and Autoregulation Engine */

export function calculateDynamicMacros(currentWeight, targetKcal, goal, targetWeight) {
  var w = Number(currentWeight) || 70;
  var kcal = Number(targetKcal) || 2500;
  var protein = Math.round(w * 2.2);
  var fat = Math.round(w * 0.8);
  var remainingKcal = Math.max(0, kcal - (protein * 4) - (fat * 9));
  var carbs = Math.round(remainingKcal / 4);

  return {
    kcal: kcal,
    protein: protein,
    fat: fat,
    carbs: carbs,
    safeSurplusMax: 500,
    safeDeficitMax: 750
  };
}

export function calculateWeightEMA(weightLogs, alpha) {
  var a = alpha != null ? Number(alpha) : 0.3;
  if (!weightLogs || !weightLogs.length) return { currentEMA: 0, series: [] };
  
  var values = weightLogs.map(function(item) {
    if (typeof item === 'number') return item;
    return Number(item && (item.weight != null ? item.weight : (item.val != null ? item.val : item.value))) || 0;
  }).filter(function(v) { return v > 0; });

  if (!values.length) return { currentEMA: 0, series: [] };

  var ema = values[0];
  var series = [ema];
  for (var i = 1; i < values.length; i++) {
    ema = (a * values[i]) + ((1 - a) * ema);
    series.push(Math.round(ema * 100) / 100);
  }
  var current = Math.round(ema * 100) / 100;
  return {
    currentEMA: current,
    series: series,
    valueOf: function() { return current; }
  };
}

export function checkMuscleVolumeLandmarks(muscleVolumeList) {
  var list = muscleVolumeList || [];
  var warnings = [];
  list.forEach(function(item) {
    var muscle = item.muscle || item.name || '';
    var sets = Number(item.sets != null ? item.sets : (item.count || 0));
    if (sets > 25) {
      warnings.push({
        muscle: muscle,
        sets: sets,
        level: 'junk',
        warning: true,
        message: 'Junk volume detected. ' + muscle + ' recovery maxed out.'
      });
    } else if (sets > 20) {
      warnings.push({
        muscle: muscle,
        sets: sets,
        level: 'mrv',
        warning: false,
        message: muscle + ' approaching Maximum Recoverable Volume (MRV).'
      });
    }
  });
  return warnings;
}

export function calculateScientificProgression(lastSets, targetRepRange, targetRIR, options) {
  options = options || {};
  if (!lastSets || !lastSets.length) {
    return { action: 'maintain', weight: 0, badge: 'Target: Baseline', reason: 'No prior sets logged. Establish initial baseline.' };
  }
  var repRangeStr = String(targetRepRange || '8–12');
  var parts = repRangeStr.split(/[–\-]/);
  var minReps = parseInt(parts[0], 10) || 8;
  var maxReps = parts.length > 1 ? (parseInt(parts[1], 10) || 12) : minReps;
  var tRIR = targetRIR != null ? Number(targetRIR) : 2;

  var validSets = lastSets.filter(function(s) {
    return s && Number(s.weight) > 0 && Number(s.reps) > 0;
  });
  if (!validSets.length) {
    return { action: 'maintain', weight: 0, badge: 'Target: Baseline', reason: 'Establish baseline.' };
  }

  var baseWeight = Number(validSets[0].weight);
  var isLowerCompound = Boolean(options.isLowerCompound || options.isCompoundLower);
  var weightIncrement = isLowerCompound ? 5.0 : 2.5;

  var repsFirst = Number(validSets[0].reps);
  var repsLast = Number(validSets[validSets.length - 1].reps);
  var fatigueDrop = (repsFirst > 0) ? ((repsFirst - repsLast) / repsFirst) : 0;
  var fatigueWarning = fatigueDrop > 0.30 ? 'Fatigue drop >30% detected. Consider resting longer between sets or deloading.' : null;

  if (options.consecutiveMisses >= 2 || (options.missCount >= 2)) {
    var deloadWeight = Math.round((baseWeight * 0.90) * 4) / 4;
    return {
      action: 'deload',
      weight: Math.max(2.5, deloadWeight),
      badge: 'Deload -10%',
      targetReps: minReps + '–' + maxReps,
      reason: 'Failed target rep minimum for 2 consecutive sessions. 10% deload recommended to facilitate recovery.',
      fatigueWarning: fatigueWarning
    };
  }

  var firstRIR = validSets[0].rir != null ? Number(validSets[0].rir) : null;
  if (firstRIR === 0) {
    return {
      action: 'add_reps',
      weight: baseWeight,
      targetReps: Math.min(maxReps, repsFirst + 1),
      badge: '+ Add Reps',
      reason: 'Hit 0 RIR (failure) on set 1. Maintain weight and build rep capacity before adding load.',
      fatigueWarning: fatigueWarning
    };
  }

  var allHitMax = validSets.every(function(s) {
    var r = Number(s.reps);
    var rir = s.rir != null ? Number(s.rir) : 2;
    return r >= maxReps && rir <= (tRIR + 1);
  });

  if (allHitMax) {
    var nextWeight = baseWeight + weightIncrement;
    return {
      action: 'increase_weight',
      weight: nextWeight,
      badge: '↑ Target: ' + nextWeight + 'kg (You hit the top of the range!)',
      targetReps: minReps + '–' + maxReps,
      reason: 'Double progression achieved! Top of range reached on all sets.',
      fatigueWarning: fatigueWarning
    };
  }

  return {
    action: 'add_reps',
    weight: baseWeight,
    targetReps: Math.min(maxReps, Math.max.apply(null, validSets.map(function(s){ return Number(s.reps); })) + 1),
    badge: '+ Add Reps',
    reason: 'Aim for +1 rep per set within ' + minReps + '–' + maxReps + ' range.',
    fatigueWarning: fatigueWarning
  };
}
