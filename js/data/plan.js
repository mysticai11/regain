/* Workout plan data: active routine resolution, exercise catalog, and routine migrations */

import { profile } from "../state.js";
import { sv, dayRecord, saveDayRecord, getWorkoutSessions } from "../storage.js";
import { allDayKeys } from "../lib/format.js";
import { DEFAULT_5DAY_ROUTINE } from "./splits.js";
export * from "./splits.js";

export var CAL_TARGET_REST  = 2700;
export var CAL_TARGET_GYM   = 3000;
export var PROT_TARGET_REST = 110;
export var PROT_TARGET_GYM  = 120;
export var GAIN_LOW         = 0.135; // kg/week (0.25% of 54kg)
export var GAIN_HIGH        = 0.27;  // kg/week (0.5%  of 54kg)

export function getWeeklySchedule() {
  var prog = getActiveProgram();
  var weekdays = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  var jsDays = [1, 2, 3, 4, 5, 6, 0]; // Monday (1) to Sunday (0)
  var tdays = (profile && Array.isArray(profile.trainingDays) && profile.trainingDays.length > 0)
    ? profile.trainingDays
    : [1, 2, 4, 5, 6];
  
  var schedule = [];
  var workoutCursor = 0;
  
  for (var i = 0; i < 7; i++) {
    var dayNum = i + 1; // 1..7 (Mon=1 .. Sun=7)
    var jsDay = jsDays[i]; // 0..6
    var isTrain = tdays.includes(jsDay);
    var dayCode = weekdays[i];
    
    if (isTrain && prog.length > 0) {
      var wIdx = workoutCursor % prog.length;
      workoutCursor++;
      var session = prog[wIdx] || {};
      schedule.push({
        dayNum: dayNum,
        jsDay: jsDay,
        name: 'Day ' + dayNum,
        weekday: dayCode,
        label: session.label || ('Workout ' + (wIdx + 1)),
        isRest: false,
        workoutIndex: wIdx
      });
    } else {
      schedule.push({
        dayNum: dayNum,
        jsDay: jsDay,
        name: 'Day ' + dayNum,
        weekday: dayCode,
        label: 'Rest Day',
        isRest: true,
        workoutIndex: null
      });
    }
  }
  return schedule;
}

export function migrateWorkoutRoutineSwap() {
  if (profile) {
    if (Array.isArray(profile.trainingDays) && profile.trainingDays.join(',') === '1,2,3,5,6') {
      profile.trainingDays = [1, 2, 4, 5, 6];
      sv('rg_profile', profile);
    }
    if (profile.activeSplitData && Array.isArray(profile.activeSplitData) && profile.activeSplitData.length === 5) {
      var d2 = profile.activeSplitData[2];
      var d3 = profile.activeSplitData[3];
      if (d2 && d3 && String(d2.label).indexOf('Chest & Back B') > -1 && String(d3.label).indexOf('Arms') > -1) {
        d2.label = 'Day 5 — Chest & Back B';
        d2.dayIndex = 3;
        d2.scheduleDay = 5;
        d3.label = 'Day 4 — Arms';
        d3.dayIndex = 2;
        d3.scheduleDay = 4;
        profile.activeSplitData[2] = d3;
        profile.activeSplitData[3] = d2;
        sv('rg_profile', profile);
      }
    }
    if (!profile.migratedRemovedSkillExercises) {
      if (profile.activeSplitData && Array.isArray(profile.activeSplitData)) {
        var toRemove = { pull_ups: true, wrist_curl: true, chin_ups: true, wrist_extension: true };
        var anyRemoved = false;
        profile.activeSplitData.forEach(function(day) {
          if (!day || !Array.isArray(day.exercises)) return;
          var initialLen = day.exercises.length;
          day.exercises = day.exercises.filter(function(e) {
            return !toRemove[e.id];
          });
          if (day.exercises.length !== initialLen) anyRemoved = true;
        });
        if (anyRemoved) {
          sv('rg_profile', profile);
        }
      }
      profile.migratedRemovedSkillExercises = true;
      sv('rg_profile', profile);
    }
    migrateRearDeltAndCalves();
  }
}

export function migrateRearDeltAndCalves() {
  if (typeof profile !== 'undefined' && profile) {
    if (profile.activeSplitData && Array.isArray(profile.activeSplitData)) {
      var splitChanged = false;
      profile.activeSplitData.forEach(function(day) {
        if (!day || !Array.isArray(day.exercises)) return;
        var newExs = [];
        var hadRdf = false;
        day.exercises.forEach(function(e) {
          if (e.id === 'rear_delt_fly_1') {
            hadRdf = true;
            newExs.push({
              id: 'rear_delt_fly',
              name: 'Rear Delt Fly',
              muscle: 'shoulders',
              sets: 2,
              reps: '15',
              rir: '1–2',
              rest: 90,
              cue: 'Rear delts',
              weightIncrement: 2.5,
              type: 'isolation',
              setTags: [null, 'rest-pause (15+5+5, 0 RIR)']
            });
            splitChanged = true;
          } else if (e.id === 'rear_delt_fly_rp') {
            if (!hadRdf) {
              newExs.push({
                id: 'rear_delt_fly',
                name: 'Rear Delt Fly',
                muscle: 'shoulders',
                sets: 2,
                reps: '15',
                rir: '1–2',
                rest: 90,
                cue: 'Rear delts',
                weightIncrement: 2.5,
                type: 'isolation',
                setTags: [null, 'rest-pause (15+5+5, 0 RIR)']
              });
            }
            splitChanged = true;
          } else if (e.id === 'calves_training' || (e.name && /calves.*home/i.test(e.name))) {
            newExs.push({
              id: 'calves',
              name: 'Calves',
              muscle: 'calves',
              sets: 2,
              reps: '12–20',
              rir: '1–2',
              rest: 60,
              cue: 'Calves',
              weightIncrement: 2.5,
              type: 'isolation'
            });
            splitChanged = true;
          } else {
            newExs.push(e);
          }
        });
        day.exercises = newExs;
      });
      if (splitChanged) sv('rg_profile', profile);
    }

    if (profile.exerciseNotes) {
      if (profile.exerciseNotes['calves_training']) {
        profile.exerciseNotes['calves'] = profile.exerciseNotes['calves'] || profile.exerciseNotes['calves_training'];
        delete profile.exerciseNotes['calves_training'];
      }
      if (profile.exerciseNotes['calves']) {
        profile.exerciseNotes['calves'] = profile.exerciseNotes['calves'].replace(/\bhome\b/gi, '').trim();
      }
      sv('rg_profile', profile);
    }
  }

  // Migrate day records (history)
  if (typeof allDayKeys === 'function') {
    allDayKeys().forEach(function(key) {
      var rec = dayRecord(key);
      var changed = false;
      if (rec && rec.workout) {
        var s1 = rec.workout['rear_delt_fly_1'] || [];
        var s2 = rec.workout['rear_delt_fly_rp'] || [];
        if (s1.length > 0 || s2.length > 0) {
          var merged = [];
          if (s1[0]) merged[0] = s1[0];
          if (s2[0]) merged[1] = s2[0];
          rec.workout['rear_delt_fly'] = (rec.workout['rear_delt_fly'] || []).concat(merged).filter(Boolean);
          delete rec.workout['rear_delt_fly_1'];
          delete rec.workout['rear_delt_fly_rp'];
          changed = true;
        }
        if (rec.workout['calves_training']) {
          rec.workout['calves'] = (rec.workout['calves'] || []).concat(rec.workout['calves_training']).filter(Boolean);
          delete rec.workout['calves_training'];
          changed = true;
        }
      }
      if (rec && rec.workoutDraft) {
        if (rec.workoutDraft['rear_delt_fly_1'] || rec.workoutDraft['rear_delt_fly_rp']) {
          rec.workoutDraft['rear_delt_fly'] = rec.workoutDraft['rear_delt_fly_1'] || rec.workoutDraft['rear_delt_fly_rp'];
          delete rec.workoutDraft['rear_delt_fly_1'];
          delete rec.workoutDraft['rear_delt_fly_rp'];
          changed = true;
        }
        if (rec.workoutDraft['calves_training']) {
          rec.workoutDraft['calves'] = rec.workoutDraft['calves_training'];
          delete rec.workoutDraft['calves_training'];
          changed = true;
        }
      }
      if (changed) saveDayRecord(key, rec);
    });
  }

  // Migrate workout sessions store
  if (typeof workoutSessionStore === 'function') {
    var store = workoutSessionStore();
    if (store && store.sessions) {
      var storeChanged = false;
      Object.keys(store.sessions).forEach(function(sId) {
        var sess = store.sessions[sId];
        if (sess && Array.isArray(sess.exercises)) {
          var newExs = [];
          var rdfEx = null;
          sess.exercises.forEach(function(exItem) {
            if (exItem.id === 'rear_delt_fly_1' || exItem.id === 'rear_delt_fly_rp') {
              if (!rdfEx) {
                rdfEx = { id: 'rear_delt_fly', sets: [] };
                newExs.push(rdfEx);
              }
              rdfEx.sets = rdfEx.sets.concat(exItem.sets || []);
              storeChanged = true;
            } else if (exItem.id === 'calves_training') {
              exItem.id = 'calves';
              newExs.push(exItem);
              storeChanged = true;
            } else {
              newExs.push(exItem);
            }
          });
          sess.exercises = newExs;
        }
      });
      if (storeChanged) sv(WORKOUT_SESSIONS_KEY, store);
    }
  }
}

export function getActiveProgram() {
  if (typeof profile !== 'undefined' && profile && profile.activeSplitData && Array.isArray(profile.activeSplitData) && profile.activeSplitData.length > 0) {
    return profile.activeSplitData;
  }
  return DEFAULT_5DAY_ROUTINE;
}

export var IRON_LOG_PROGRAM = DEFAULT_5DAY_ROUTINE;

export var ALTERNATES = [
  {id:'pull_ups', name:'Pull-ups', muscle:'back,biceps', sets:2, reps:'failure', rir:'0', rest:120, cue:'Bodyweight skill practice', weightIncrement:2.5, type:'compound', bodyweight:true},
  {id:'chin_ups', name:'Chin-ups', muscle:'back,biceps', sets:2, reps:'failure', rir:'0', rest:120, cue:'Bodyweight skill practice', weightIncrement:2.5, type:'compound', bodyweight:true},
  {id:'wrist_curl', name:'Wrist Curl', muscle:'forearms', sets:2, reps:'12–20', rir:'1–2', rest:60, cue:'Forearms flexors', weightIncrement:1.25, type:'isolation'},
  {id:'wrist_extension', name:'Wrist Extension', muscle:'forearms', sets:2, reps:'12–20', rir:'1–2', rest:60, cue:'Forearms extensors', weightIncrement:1.25, type:'isolation'},
  {id:'hack_squat', name:'Hack squat', muscle:'quads,glutes', sets:4, reps:'10–12', rir:'1–2', rest:150, cue:'2.5 min rest'},
  {id:'bulgarian_split', name:'Bulgarian split squat', muscle:'quads,glutes', sets:3, reps:'10–12', rir:'1–2', rest:90, cue:'90s rest'},
  {id:'db_bench', name:'Dumbbell bench press', muscle:'chest,triceps', sets:4, reps:'8–10', rir:'1–2', rest:150, cue:'2.5 min rest'},
  {id:'machine_chest', name:'Seated chest press machine', muscle:'chest', sets:2, reps:'6–10', rir:'1–2', rest:150, cue:'Chest'},
  {id:'db_row', name:'Dumbbell row', muscle:'back,biceps', sets:4, reps:'10–12', rir:'1–2', rest:120, cue:'2 min rest'},
  {id:'pullup', name:'Pull-up / Assisted pull-up', muscle:'back,biceps', sets:3, reps:'8–12', rir:'1–2', rest:120, cue:'2 min rest'},
  {id:'db_shoulder', name:'Dumbbell shoulder press', muscle:'shoulders', sets:3, reps:'10–12', rir:'1–2', rest:120, cue:'2 min rest'},
  {id:'db_curl', name:'Dumbbell bicep curl', muscle:'biceps', sets:3, reps:'12–15', rir:'1–2', rest:90, cue:'90s rest'},
  {id:'db_lateral', name:'Dumbbell lateral raise', muscle:'shoulders', sets:3, reps:'15–20', rir:'1–2', rest:60, cue:'60s rest'},
];

export function getExerciseData(id) {
  var allProg = getActiveProgram();
  var allEx = ALTERNATES.slice();
  allProg.forEach(function(s){ allEx = allEx.concat(s.exercises); });
  if (typeof DEFAULT_5DAY_ROUTINE !== 'undefined') {
    DEFAULT_5DAY_ROUTINE.forEach(function(s){ allEx = allEx.concat(s.exercises); });
  }
  var match = allEx.find(function(e){ return e.id === id; });
  if (match) return match;
  return { id: id, name: id.replace(/_/g, ' '), muscle: '' };
}

export function getAllExercisesForMuscle(muscleStr) {
  var allProg = getActiveProgram();
  var allEx = ALTERNATES.slice();
  allProg.forEach(function(s){ allEx = allEx.concat(s.exercises); });
  var seen = {}; var out = [];
  var targetM = (muscleStr || '').toLowerCase().trim();
  allEx.forEach(function(e){
    var eMuscles = String(e.muscle || '').toLowerCase().split(',').map(function(m){ return m.trim(); });
    var match = eMuscles.includes(targetM) || (targetM.includes(',') && eMuscles.some(function(m){ return targetM.includes(m); }));
    if(!seen[e.id] && match) {
      seen[e.id] = true; out.push(e);
    }
  });
  return out;
}

export function isBodyweightExercise(id, name) {
  var ex = (typeof getExerciseData === 'function' ? getExerciseData(id) : null) || {};
  if (ex.bodyweight === true || ex.isBW === true || ex.type === 'bodyweight') return true;
  var n = ((name || ex.name || id) + '').toLowerCase();
  if (id === 'pull_ups' || id === 'chin_ups' || id === 'pullup' || id === 'chinup' || id === 'dips') return true;
  if (/pull[\s-]?ups?/i.test(n) || /chin[\s-]?ups?/i.test(n) || /\bdips?\b/i.test(n) || /push[\s-]?ups?/i.test(n) || /bodyweight/i.test(n)) {
    if (!/assisted/i.test(n) && !/pulldown/i.test(n) && !/machine/i.test(n) && !/cable/i.test(n)) {
      return true;
    }
  }
  return false;
}

export function getWorkoutForDate(dayKey, rec) {
  var prog = getActiveProgram();
  var d = new Date(dayKey + 'T00:00:00').getDay();
  var dayNum = d === 0 ? 7 : d;
  var weeklySched = getWeeklySchedule();
  var matched = weeklySched.find(function(s){ return s.dayNum === dayNum; });
  var defaultIndex = (matched && !matched.isRest) ? matched.workoutIndex : null;

  var index = rec && rec.selectedWorkout !== undefined ? rec.selectedWorkout : defaultIndex;
  if (index === null) {
    return { index: null, isRest: true, session: null };
  }
  var safeIndex = index == null ? 0 : Math.min(Math.max(0, index), prog.length - 1);
  return { index: safeIndex, isRest: false, session: prog[safeIndex] || prog[0] };
}

export function getCurrentWorkout(dayKey) {
  var k = dayKey || (typeof window !== 'undefined' && window.activeGymDateKey) || todayKey();
  var rec = dayRecord(k);
  var prog = getActiveProgram();
  var d = new Date(k + 'T00:00:00').getDay();
  var dayNum = d === 0 ? 7 : d;
  var weeklySched = getWeeklySchedule();
  var matched = weeklySched.find(function(s){ return s.dayNum === dayNum; });
  var defaultIndex = (matched && !matched.isRest) ? matched.workoutIndex : null;

  var index = (rec && rec.selectedWorkout !== undefined) ? rec.selectedWorkout : defaultIndex;
  var isRest = index === null;
  var session = null;
  if (!isRest) {
    var safeIdx = Math.min(Math.max(0, index), prog.length - 1);
    session = prog[safeIdx] || prog[0];
  }
  var rawName = isRest ? 'Rest Day' : (session ? (session.label.replace(/^Day\s*\d+\s*[—–-]\s*/i, '') || session.label) : 'Workout');
  return {
    dayKey: k,
    workoutIndex: isRest ? null : index,
    isRest: isRest,
    session: session,
    cleanName: rawName,
    hasOverride: rec && rec.selectedWorkout !== undefined,
    isSuggestedRest: defaultIndex === null,
    suggestedIndex: defaultIndex
  };
}

export function getCompletedWorkoutCount() {
  var sessions=getWorkoutSessions(), seen={};
  var sessionDays={};
  sessions.forEach(function(s){sessionDays[s.dayKey]=true;if(s.completed) seen[s.id]=true;});
  allDayKeys().forEach(function(key){var r=dayRecord(key);if(r.workoutDone&&!sessionDays[key]) seen['legacy_'+key]=true;});
  return Object.keys(seen).length;
}

export function getWorkoutWeek(dayKey) {
  var prog = getActiveProgram();
  var length = Math.max(1, prog.length);
  var completed = getCompletedWorkoutCount();
  return Math.floor(completed / length) + 1;
}

export function getNextProgramWorkout() {
  var prog = getActiveProgram();
  var count = getCompletedWorkoutCount(), len = Math.max(1, prog.length);
  var index = count % len;
  return { index: index, week: Math.floor(count / len) + 1, day: index + 1, session: prog[index] || prog[0] };
}

// Volume table calculation dynamically based on active program
