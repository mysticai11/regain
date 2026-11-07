/* Calculations: e1RM formulas, volume aggregation, calorie & protein targets, and linear regression */

import { profile } from "../state.js";
import { dayRecord, ls, sv } from "../storage.js";
import { getActiveProgram, getExerciseData, isBodyweightExercise, CAL_TARGET_REST, CAL_TARGET_GYM, PROT_TARGET_REST, PROT_TARGET_GYM } from "../data/plan.js";
import { DEFAULT_MEAL_PLAN } from "../data/foods.js";
import { getAllKnownExercises } from "../data/exercises.js";
import { dateKey, todayKey, addDays, allDayKeys } from "./format.js";
export * from "./progression.js";

export function getWeeklyVolume() {
  var prog = getActiveProgram();
  var v = { 'Quads / Glutes': 0, 'Hamstrings': 0, 'Chest': 0, 'Back': 0, 'Shoulders': 0, 'Biceps': 0, 'Triceps': 0, 'Forearms': 0, 'Calves': 0 };
  prog.forEach(function(sess){
    sess.exercises.forEach(function(ex){
      var m = String(ex.muscle || '').toLowerCase().split(',').map(function(mu){ return mu.trim(); });
      m.forEach(function(mu){
        var mapped = mu==='quads'?'Quads / Glutes':mu==='glutes'?'Quads / Glutes':mu==='hamstrings'?'Hamstrings':mu==='chest'?'Chest':mu==='back'?'Back':mu==='shoulders'?'Shoulders':mu==='biceps'?'Biceps':mu==='triceps'?'Triceps':mu==='forearms'?'Forearms':mu==='calves'?'Calves':'';
        if(mapped && v[mapped] != null) v[mapped] += (ex.sets || 2);
      });
    });
  });
  return Object.keys(v).map(function(k){ return {muscle:k, sets:v[k]}; });
}

export function getLoggedWeeklyVolume() {
  var totals = { 'Quads / Glutes': 0, Hamstrings: 0, Chest: 0, Back: 0, Shoulders: 0, Biceps: 0, Triceps: 0, Forearms: 0, Calves: 0 };
  var cutoff = Date.now() - 7 * 86400000;
  allDayKeys().forEach(function(key) {
    if (new Date(key + 'T23:59:59').getTime() < cutoff) return;
    var workout = dayRecord(key).workout || {};
    Object.keys(workout).forEach(function(id) {
      var ex = getExerciseData(id);
      if (!ex) return;
      var count = workout[id].filter(Boolean).length;
      var seen = {};
      String(ex.muscle || '').toLowerCase().split(',').forEach(function(mu) {
        var t = mu.trim();
        var mapped = (t==='quads'||t==='glutes')?'Quads / Glutes':(t==='forearms'?'Forearms':t.replace(/^./,function(c){return c.toUpperCase();}));
        if (!seen[mapped] && totals[mapped] != null) {
          seen[mapped] = true;
          totals[mapped] += count;
        }
      });
    });
  });
  return Object.keys(totals).map(function(muscle){ return {muscle:muscle, sets:totals[muscle]}; });
}

export function getTargetsForDate(dateStr) {
  if (!profile) return { kcal: CAL_TARGET_REST, protein: PROT_TARGET_REST, carbs: 415, fat: 100 };
  var d = new Date(dateStr + 'T00:00:00');
  var tdays = profile.trainingDays || [1, 2, 4, 5, 6];
  var isTrain = tdays.includes(d.getDay());
  try {
    var rec = dayRecord(dateStr);
    if (rec && rec.selectedWorkout !== undefined) {
      isTrain = rec.selectedWorkout !== null;
    }
  } catch(e) {}
  var restCal = Number(profile.calTargetRest) || CAL_TARGET_REST;
  var gymCal = Number(profile.calTargetGym) || CAL_TARGET_GYM;
  var restProt = Number(profile.protTargetRest) || PROT_TARGET_REST;
  var gymProt = Number(profile.protTargetGym) || PROT_TARGET_GYM;
  return {
    kcal: isTrain ? gymCal : restCal,
    protein: isTrain ? gymProt : restProt,
    carbs: isTrain ? 475 : 415,
    fat: isTrain ? 110 : 100
  };
}

export function getWeeklyAvocadosCount() {
  if(!profile) return 0;
  var dayNum = currentDayNum();
  var weekNum = Math.ceil(dayNum/7);
  var startDayOfThisWeek = (weekNum - 1) * 7 + 1;
  var endDayOfThisWeek = weekNum * 7;
  var count = 0;
  var start = new Date(profile.startDate);
  for (var i = startDayOfThisWeek; i <= endDayOfThisWeek; i++) {
    var d = addDays(start, i - 1);
    var key = dateKey(d);
    var rec = dayRecord(key);
    count += (rec.avocados || 0);
  }
  return count;
}

export function getDayTotals(key) {
  var rec = dayRecord(key);
  rec.meals = rec.meals || {};
  rec.extra = rec.extra || {};
  var plan = (profile && profile.mealPlan) || DEFAULT_MEAL_PLAN;
  var t = {kcal:0, protein:0, carbs:0, fat:0};
  Object.keys(plan).forEach(function(gKey){
    var group = plan[gKey];
    (group.items||[]).forEach(function(item){
      if(rec.meals[item.id]){
        t.kcal += item.kcal;
        t.protein += item.protein;
        t.carbs += item.carbs;
        t.fat += item.fat;
      }
    });
  });
  if(rec.avocados) {
    t.kcal += rec.avocados * 240;
    t.protein += rec.avocados * 3;
    t.carbs += rec.avocados * 13;
    t.fat += rec.avocados * 22;
  }
  (Array.isArray(rec.extra) ? rec.extra : []).forEach(function(e){
    t.kcal += e.kcal * (e.servings || 1);
    t.protein += e.protein * (e.servings || 1);
    t.carbs += e.carbs * (e.servings || 1);
    t.fat += e.fat * (e.servings || 1);
  });
  return {kcal:Math.round(t.kcal), protein:+t.protein.toFixed(1), carbs:+t.carbs.toFixed(1), fat:+t.fat.toFixed(1)};
}

export function computeStreak() {
  if(!profile) return 0;
  var streak = 0;
  var d = addDays(new Date(),-1); d.setHours(0,0,0,0);
  var start = new Date(profile.startDate); start.setHours(0,0,0,0);
  while(d >= start) {
    var key = dateKey(d); var rec = dayRecord(key);
    var ct = getTargetsForDate(key).kcal;
    if(getDayTotals(key).kcal >= ct*0.9 || rec.shielded) { streak++; d = addDays(d,-1); }
    else break;
  }
  return streak;
}

export function yesterdayMissed() {
  if(!profile) return false;
  var d = addDays(new Date(),-1); d.setHours(0,0,0,0);
  var start = new Date(profile.startDate); start.setHours(0,0,0,0);
  if(d < start) return false;
  var key = dateKey(d); var rec = dayRecord(key);
  var ct = getTargetsForDate(key).kcal;
  return getDayTotals(key).kcal < ct*0.9 && !rec.shielded;
}

// ── Workout session type & PR calculations ────────────────────────────────────

export function getEquivalentExerciseIds(exId) {
  var ids = [exId];
  var baseId = exId.replace(/_[ab\d]+$/i, '');
  if (baseId !== exId && !ids.includes(baseId)) ids.push(baseId);
  [baseId + '_b', baseId + '_a', baseId + '_machine'].forEach(function(s){ if(!ids.includes(s)) ids.push(s); });
  var pairs = {
    machine_row_b: 'machine_row', machine_row: 'machine_row_b',
    lat_pulldown_b: 'lat_pulldown', lat_pulldown: 'lat_pulldown_b',
    pec_deck_b: 'pec_deck', pec_deck: 'pec_deck_b',
    hamstring_curl_b: 'hamstring_curl', hamstring_curl: 'hamstring_curl_b',
    leg_extension_b: 'leg_extension', leg_extension: 'leg_extension_b',
    shoulder_press_b: 'shoulder_press_machine', shoulder_press_machine: 'shoulder_press_b',
    lateral_raise_b: 'lateral_raise_machine', lateral_raise_machine: 'lateral_raise_b',
    pull_ups: 'chin_ups', chin_ups: 'pull_ups',
    rear_delt_fly: 'rear_delt_fly_1', rear_delt_fly_1: 'rear_delt_fly', rear_delt_fly_rp: 'rear_delt_fly',
    calves: 'calf_stand', calves_training: 'calves'
  };
  if (pairs[exId] && !ids.includes(pairs[exId])) ids.push(pairs[exId]);
  if (exId === 'rear_delt_fly' && !ids.includes('rear_delt_fly_rp')) ids.push('rear_delt_fly_rp');
  if (exId === 'calves') {
    if (!ids.includes('calf_stand')) ids.push('calf_stand');
    if (!ids.includes('calf_press')) ids.push('calf_press');
  }
  var currentName = ((getExerciseData(exId) || {}).name || '').toLowerCase().trim();
  if (currentName) {
    getAllKnownExercises().forEach(function(item) {
      if (item && item.name && item.name.toLowerCase().trim() === currentName && !ids.includes(item.id)) ids.push(item.id);
    });
  }
  return ids;
}

export function isIsolationLift(exId, exData) {
  var ex = exData || ((typeof getExerciseData === 'function') ? getExerciseData(exId) : null);
  if (ex) {
    if (ex.type === 'isolation' || ex.isCompound === false) return true;
    if (ex.type === 'compound' || ex.isCompound === true) return false;
  }
  var id = (exId || '').toLowerCase(), name = (ex && ex.name ? ex.name : '').toLowerCase();
  return /curl|fly|flye|raise|pushdown|extension|pec_deck|calves|shrug|wrist/i.test(id) ||
         /curl|fly|flye|raise|pushdown|extension|pec deck|calves|shrug|wrist/i.test(name);
}

/**
 * Epley formula: e1RM = w * (1 + r / 30).
 * Exclude sets > 12 reps from e1RM (returns null).
 */
export function calcE1RM(w, r) {
  w = Number(w) || 0; r = Number(r) || 0;
  if (w <= 0 || r <= 0) return 0;
  if (r > 12) return null;
  return r === 1 ? w : +(w * (1 + r / 30)).toFixed(2);
}

export function getBestE1RM(exId, excludeDayKey) {
  var ids = getEquivalentExerciseIds(exId);
  var best = 0;
  allDayKeys().forEach(function(key){
    if (excludeDayKey && key === excludeDayKey) return;
    var rec = dayRecord(key);
    var wo = rec.workout || {};
    ids.forEach(function(id){
      var sets = wo[id] || [];
      sets.forEach(function(s){
        if (s && s.weight && s.reps && Number(s.reps) <= 12) {
          var e = calcE1RM(s.weight, s.reps);
          if (e && e > best) best = e;
        }
      });
    });
  });
  return best > 0 ? best : null;
}

export function getBestRepCount(exId, excludeDayKey) {
  var ids = getEquivalentExerciseIds(exId);
  var best = 0;
  allDayKeys().forEach(function(key){
    if (excludeDayKey && key === excludeDayKey) return;
    var rec = dayRecord(key);
    var wo = rec.workout || {};
    ids.forEach(function(id){
      var sets = wo[id] || [];
      sets.forEach(function(s){
        if (s && s.reps && Number(s.reps) <= 12) {
          var r = Number(s.reps) || 0;
          if (r > best) best = r;
        }
      });
    });
  });
  return best > 0 ? best : null;
}

export function checkExercisePR(exId, weight, reps, currentDayKey) {
  var w = Number(weight) || 0;
  var r = Number(reps) || 0;
  if (r <= 0 || r > 12) return { isPR: false, reason: 'Reps must be between 1 and 12' };

  var exData = (typeof getExerciseData === 'function') ? getExerciseData(exId) : null;
  var isBW = isBodyweightExercise(exId, exData ? exData.name : '');
  var isIso = isIsolationLift(exId, exData);

  var ids = getEquivalentExerciseIds(exId);
  var priorSets = [];
  allDayKeys().forEach(function(key) {
    if (currentDayKey && key === currentDayKey) return;
    var rec = dayRecord(key);
    var wo = (rec && rec.workout) || {};
    ids.forEach(function(id) {
      var sets = wo[id] || [];
      sets.forEach(function(s) {
        if (s && !s.isWarmup && (Number(s.reps) > 0 || Number(s.weight) > 0)) {
          if (Number(s.reps) <= 12) priorSets.push({ weight: Number(s.weight) || 0, reps: Number(s.reps) || 0 });
        }
      });
    });
  });

  if (priorSets.length === 0) return { isPR: false, reason: 'baseline' };

  if (isBW && w === 0) {
    var maxReps = Math.max.apply(null, priorSets.map(function(s){ return s.reps; }));
    if (r > maxReps) return { isPR: true, type: 'reps', prev: maxReps, current: r };
    return { isPR: false };
  }

  if (isIso) {
    var maxW = Math.max.apply(null, priorSets.map(function(s){ return s.weight; }));
    if (w > maxW && r >= 6) return { isPR: true, type: 'weight', prev: maxW, current: w };
    var sameW = priorSets.filter(function(s){ return Math.abs(s.weight - w) < 0.1; });
    if (sameW.length > 0) {
      var maxR = Math.max.apply(null, sameW.map(function(s){ return s.reps; }));
      if (r > maxR) return { isPR: true, type: 'reps', prev: maxR, current: r };
    }
    return { isPR: false };
  }

  var currentE1 = calcE1RM(w, r);
  if (!currentE1) return { isPR: false };
  var priorE1s = priorSets.map(function(s){ return calcE1RM(s.weight, s.reps); }).filter(Boolean);
  if (!priorE1s.length) return { isPR: false, reason: 'baseline' };
  var bestPriorE1 = Math.max.apply(null, priorE1s);
  if (currentE1 >= bestPriorE1 + 0.5) {
    return { isPR: true, type: 'e1rm', prev: bestPriorE1, current: currentE1 };
  }
  return { isPR: false };
}

// ── Linear regression + 95% CI ────────────────────────────────────────────────
export function linReg(ys) {
  var n = ys.length;
  if(n < 3) return null;
  var xs = ys.map(function(_,i){return i;});
  var sx=0,sy=0,sxy=0,sx2=0;
  for(var i=0;i<n;i++){sx+=xs[i];sy+=ys[i];sxy+=xs[i]*ys[i];sx2+=xs[i]*xs[i];}
  var denom = n*sx2 - sx*sx;
  if(!denom) return null;
  var slope = (n*sxy - sx*sy)/denom;
  var inter = (sy - slope*sx)/n;
  var pred  = xs.map(function(x){return slope*x+inter;});
  var sse   = ys.reduce(function(a,y,i){return a+Math.pow(y-pred[i],2);},0);
  var ssx   = sx2 - sx*sx/n;
  var se    = ssx>0 ? Math.sqrt(sse/((n-2)*ssx)) : 0;
  var t     = n>=8 ? 2.0 : n>=6 ? 2.2 : 2.57;
  return {slope:slope, inter:inter, ci:t*se, n:n};
}

// ── Macro calculations from food + servings ───────────────────────────────────
export function foodMacros(food, servings) {
  servings = Number(servings) || 1;
  var f = (food && food.serving_g) ? (Number(food.serving_g) * servings) / 100 : servings;
  return {
    kcal:    Math.round((Number(food && food.kcal) || 0) * f),
    protein: +(((Number(food && food.protein) || 0) * f).toFixed(1)),
    carbs:   +(((Number(food && food.carbs) || 0) * f).toFixed(1)),
    fat:     +(((Number(food && food.fat) || 0) * f).toFixed(1)),
  };
}

// ── Recent foods ──────────────────────────────────────────────────────────────
export function addRecent(name, kcal, protein, carbs, fat) {
  var r = ls('rg_recent_foods', []);
  var ex = r.find(function(x){return x.name.toLowerCase()===name.toLowerCase();});
  if(ex){ ex.count++; ex.kcal=kcal; ex.protein=protein; ex.carbs=carbs; ex.fat=fat; }
  else r.push({name:name,kcal:kcal,protein:protein,carbs:carbs,fat:fat,count:1});
  r.sort(function(a,b){return b.count-a.count;});
  sv('rg_recent_foods', r.slice(0,10));
}

// ── Day status ────────────────────────────────────────────────────────────────
export function dayStatus(kcal, target) {
  if(!kcal) return 'none';
  var r = kcal/target;
  if(r<0.9) return 'under';
  if(r>1.15) return 'aggressive';
  return 'target';
}

export function getTopRepRange(rangeStr) {
  var parts = String(rangeStr).split('–');
  if (parts.length === 2) return parseInt(parts[1], 10);
  var parts2 = String(rangeStr).split('-');
  if (parts2.length === 2) return parseInt(parts2[1], 10);
  return parseInt(rangeStr, 10) || 12;
}

export function getBottomRepRange(rangeStr) {
  var match=String(rangeStr).match(/\d+/);
  return match ? parseInt(match[0],10) : 1;
}

export function progressionGuide(lastSets, repRange) {
  if(!lastSets.length) return 'Start with a comfortable load in the '+repRange+' rep range.';
  var low=getBottomRepRange(repRange), high=getTopRepRange(repRange);
  var allTop=lastSets.every(function(set){return Number(set.reps)>=high;});
  var guide=lastSets.map(function(set){
    var weight=Number(set.weight), reps=Number(set.reps);
    if(allTop) {
      var next=Math.max(weight+2.5,Math.round((weight*1.025)*4)/4);
      return weight+' kg × '+reps+' → try '+next+' kg × '+low+'–'+high;
    }
    return weight+' kg × '+reps+' → aim '+weight+' kg × '+Math.min(high,reps+1)+'–'+high;
  });
  return (allTop?'Beat last week by adding a little load: ':'Beat last week by adding a rep: ')+guide.join(' · ');
}


// ─── Barbell Plate Breakdown Calculator ───
