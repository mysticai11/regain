/* Gym sets module: past session sets retrieval, PR checking, and bodyweight detection */

import { getWorkoutSessions, dayRecord, allDayKeys } from "../../storage.js";
import { getExerciseData, getActiveProgram } from "../../data/plan.js";
import { calcE1RM, getBestE1RM, getBestRepCount, getEquivalentExerciseIds } from "../../lib/calc.js";
import { todayKey } from "../../lib/format.js";

export { isBodyweightExercise } from "../../data/plan.js";
export { getEquivalentExerciseIds };
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
