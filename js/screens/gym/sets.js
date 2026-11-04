/* Gym sets module: past session sets retrieval, PR checking, and bodyweight detection */

import { getWorkoutSessions, dayRecord, allDayKeys } from "../../storage.js";
import { getExerciseData, getActiveProgram } from "../../data/plan.js";
import { calcE1RM, getBestE1RM, getBestRepCount } from "../../lib/calc.js";
import { todayKey } from "../../lib/format.js";

export { isBodyweightExercise } from "../../data/plan.js";
import { isBodyweightExercise } from "../../data/plan.js";

export function getExercisePR(exId) {
  var ids = (typeof getEquivalentExerciseIds === 'function') ? getEquivalentExerciseIds(exId) : [exId];
  var prVal = null;
  var isBW = isBodyweightExercise(exId);
  allDayKeys().forEach(function(key){
    var r = dayRecord(key);
    var wo = r.workout || {};
    ids.forEach(function(id){
      var sets = wo[id] || [];
      sets.forEach(function(s){
        if (s && s.reps != null && s.reps !== '') {
          var w = Number(s.weight) || 0;
          var reps = Number(s.reps) || 0;
          if (reps > 0) {
            if (!prVal) {
              prVal = { weight: w, reps: reps };
            } else if (isBW && (!w || w === 0) && (!prVal.weight || prVal.weight === 0)) {
              if (reps > prVal.reps) prVal = { weight: 0, reps: reps };
            } else if (w > prVal.weight || (w === prVal.weight && reps > prVal.reps)) {
              prVal = { weight: w, reps: reps };
            }
          }
        }
      });
    });
  });
  return prVal;
}

export function getLastSessionWeightReps(exId, rec) {
  var todaySets = (rec.workout || {})[exId] || [];
  if (todaySets.length > 0) {
    var lastSet = todaySets[todaySets.length - 1];
    return { weight: lastSet.weight, reps: lastSet.reps };
  }

  var keys = allDayKeys().reverse();
  var todayK = todayKey();
  for (var i = 0; i < keys.length; i++) {
    if (keys[i] === todayK) continue;
    var r = dayRecord(keys[i]);
    var prevSets = (r.workout || {})[exId] || [];
    if (prevSets.length > 0) {
      return { weight: prevSets[0].weight, reps: prevSets[0].reps };
    }
  }
  return null;
}


export function getEquivalentExerciseIds(exId) {
  var ids = [exId];
  // Strip _b, _a, _1, _2, _machine suffixes
  var baseId = exId.replace(/_[ab\d]+$/i, '');
  if (baseId !== exId && !ids.includes(baseId)) ids.push(baseId);
  if (!ids.includes(baseId + '_b')) ids.push(baseId + '_b');
  if (!ids.includes(baseId + '_a')) ids.push(baseId + '_a');
  if (!ids.includes(baseId + '_machine')) ids.push(baseId + '_machine');

  // Explicit pairs from the 5-day and 6-day split
  var pairs = {
    'machine_row_b': 'machine_row',
    'machine_row': 'machine_row_b',
    'lat_pulldown_b': 'lat_pulldown',
    'lat_pulldown': 'lat_pulldown_b',
    'pec_deck_b': 'pec_deck',
    'pec_deck': 'pec_deck_b',
    'hamstring_curl_b': 'hamstring_curl',
    'hamstring_curl': 'hamstring_curl_b',
    'leg_extension_b': 'leg_extension',
    'leg_extension': 'leg_extension_b',
    'shoulder_press_b': 'shoulder_press_machine',
    'shoulder_press_machine': 'shoulder_press_b',
    'lateral_raise_b': 'lateral_raise_machine',
    'lateral_raise_machine': 'lateral_raise_b',
    'pull_ups': 'chin_ups',
    'chin_ups': 'pull_ups',
    'rear_delt_fly': 'rear_delt_fly_1',
    'rear_delt_fly_1': 'rear_delt_fly',
    'rear_delt_fly_rp': 'rear_delt_fly',
    'calves': 'calf_stand',
    'calves_training': 'calves'
  };
  if (pairs[exId] && !ids.includes(pairs[exId])) {
    ids.push(pairs[exId]);
  }
  if (exId === 'rear_delt_fly' && !ids.includes('rear_delt_fly_rp')) {
    ids.push('rear_delt_fly_rp');
  }
  if (exId === 'calves') {
    if (!ids.includes('calf_stand')) ids.push('calf_stand');
    if (!ids.includes('calf_press')) ids.push('calf_press');
  }

  // Also match by exercise name
  var currentName = ((getExerciseData(exId) || {}).name || '').toLowerCase().trim();
  if (currentName) {
    var lib = typeof EXERCISE_LIBRARY !== 'undefined' ? EXERCISE_LIBRARY : {};
    var allEx = Object.keys(lib);
    allEx.forEach(function(k) {
      var item = lib[k];
      if (item && item.name && item.name.toLowerCase().trim() === currentName) {
        if (!ids.includes(k)) ids.push(k);
      }
    });
  }
  return ids;
}

export function getLastSessionSets(exId, rec) {
  var equivalentIds = (typeof getEquivalentExerciseIds === 'function') ? getEquivalentExerciseIds(exId) : [exId];
  if (exId === 'calves') {
    equivalentIds = ['calves', 'calf_stand', 'calf_press'];
  }
  var keys = allDayKeys().reverse();
  var todayK = todayKey();

  // 1. Check if logged earlier today under an equivalent exercise ID
  if (rec && rec.workout) {
    for (var e = 0; e < equivalentIds.length; e++) {
      var eqId = equivalentIds[e];
      if (eqId !== exId && rec.workout[eqId] && rec.workout[eqId].length > 0) {
        var validEq = rec.workout[eqId].filter(function(s){ return s && (Number(s.reps) > 0 || Number(s.weight) > 0); });
        if (exId === 'calves') validEq = validEq.filter(function(s){ return Number(s.weight) !== 30; });
        if (validEq.length > 0) return rec.workout[eqId];
      }
    }
  }

  // 2. Search previous days in history
  for (var i = 0; i < keys.length; i++) {
    var k = keys[i];
    var r = (k === todayK && rec) ? rec : dayRecord(k);
    if (!r || !r.workout) continue;

    // Check direct ID first
    if (k !== todayK && r.workout[exId] && r.workout[exId].length > 0) {
      var directValid = r.workout[exId].filter(function(s){ return s && (Number(s.reps) > 0 || Number(s.weight) > 0); });
      if (exId === 'calves') directValid = directValid.filter(function(s){ return Number(s.weight) !== 30; });
      if (directValid.length > 0) return r.workout[exId];
    }

    // Check equivalent IDs (e.g. machine_row on Day 1 for machine_row_b on Day 5)
    for (var j = 0; j < equivalentIds.length; j++) {
      var id = equivalentIds[j];
      if (r.workout[id] && r.workout[id].length > 0) {
        if (k !== todayK || id !== exId) {
          var eqValid = r.workout[id].filter(function(s){ return s && (Number(s.reps) > 0 || Number(s.weight) > 0); });
          if (exId === 'calves') eqValid = eqValid.filter(function(s){ return Number(s.weight) !== 30; });
          if (eqValid.length > 0) return r.workout[id];
        }
      }
    }
  }
  return [];
}
