/* Workout sessions storage: structured session log, schema migrations, and session CRUD */

import { ls, sv, dayRecord, saveDayRecord, SQLiteStorage } from "./storage.js";
import { showToast } from "./components/toast.js";
import { getExerciseData, getActiveProgram } from "./data/plan.js";

export var WORKOUT_SESSIONS_KEY = 'rg_workout_sessions';
export var WORKOUT_SESSIONS_VERSION = 3;

export function workoutSessionId(dayKey, programDayIndex) {
  var suffix = programDayIndex == null ? 'all' : String(programDayIndex);
  return 'workout_session_' + String(dayKey || '').replace(/[^0-9A-Za-z_-]/g, '_') + '_' + suffix;
}

export function getSessionMeta(rec, programDayIndex) {
  if (!rec) return {};
  rec.workoutMetaBySession=rec.workoutMetaBySession||{};
  return rec.workoutMetaBySession[String(programDayIndex)]||(rec.workoutMetaBySession[String(programDayIndex)]={});
}

export function workoutHasSets(workout) {
  return workout && Object.keys(workout).some(function(id) {
    return Array.isArray(workout[id]) && workout[id].some(function(set) {
      return set && (Number(set.weight) > 0 || Number(set.reps) > 0);
    });
  });
}

export function programDayIdentity(sequence, programLength) {
  var length = Math.max(1, Number(programLength) || (getActiveProgram() || []).length || 1);
  var position = Math.max(0, Number(sequence) || 0);
  var dayIndex = position % length;
  var week = Math.floor(position / length) + 1;
  var programDay = (getActiveProgram() || [])[dayIndex] || {};
  return {
    week: week,
    day: dayIndex + 1,
    index: dayIndex,
    label: programDay.label || ('Day ' + (dayIndex + 1))
  };
}

export function workoutExerciseMatch(exercise, planned) {
  if (!exercise || !planned) return 0;
  if (exercise.id === planned.id) return 3;
  var actual = String(exercise.muscle || '').toLowerCase().split(',');
  var target = String(planned.muscle || '').toLowerCase().split(',');
  return actual.some(function(muscle) {
    return target.some(function(candidate) { return muscle.trim() && muscle.trim() === candidate.trim(); });
  }) ? 1 : 0;
}

export function groupWorkoutExercises(workout) {
  var program = getActiveProgram() || [];
  var groups = program.map(function(day, index) {
    return {index:index, label:day.label, exercises:[], score:0};
  });
  Object.keys(workout || {}).forEach(function(id) {
    var exercise = getExerciseData(id) || {id:id, name:id, muscle:''};
    var best = -1;
    var bestScore = -1;
    groups.forEach(function(group, index) {
      var score = (program[index].exercises || []).reduce(function(total, planned) {
        return Math.max(total, workoutExerciseMatch(exercise, planned));
      }, 0);
      if (score > bestScore) { bestScore = score; best = index; }
    });
    if (best >= 0) {
      groups[best].score += Math.max(0, bestScore);
      groups[best].exercises.push({id:id, sets:workout[id] || []});
    }
  });
  return groups.filter(function(group) { return group.exercises.length; });
}

export function workoutSessionStore() {
  var stored = ls(WORKOUT_SESSIONS_KEY, null);
  if (!stored || stored.version !== WORKOUT_SESSIONS_VERSION || !stored.sessions) {
    return {version:WORKOUT_SESSIONS_VERSION, sessions:{}, migrated:false};
  }
  return stored;
}

export function saveWorkoutSession(session) {
  if (!session || !session.id) return false;
  var store = workoutSessionStore();
  store.sessions[session.id] = session;
  var res = sv(WORKOUT_SESSIONS_KEY, store);
  if (typeof window !== 'undefined' && typeof window.scheduleStateNotification === 'function') {
    window.scheduleStateNotification();
  }
  return res;
}

export function getWorkoutSession(dayKey, programDayIndex) {
  var store = workoutSessionStore();
  var exact = store.sessions[workoutSessionId(dayKey, programDayIndex)];
  if (exact) return exact;
  return store.sessions[workoutSessionId(dayKey, 'all')] || null;
}

export function getWorkoutSessions() {
  var store = workoutSessionStore();
  var changed=false;
  var sessions=Object.keys(store.sessions).map(function(id) {
    var session=store.sessions[id];
    if(session.dayKey && session.programDay!=null) {
      var liveGroups=groupWorkoutExercises(dayRecord(session.dayKey).workout);
      var liveGroup=liveGroups.find(function(group){return group.index===Number(session.programDay);});
      if(liveGroup) {
        var liveRec=dayRecord(session.dayKey);
        var liveMeta=(liveRec.workoutMetaBySession||{})[String(session.programDay)]||liveRec.workoutMeta||{};
        var liveExercises=JSON.stringify(liveGroup.exercises);
        if(JSON.stringify(session.exercises||[])!==liveExercises) {
          session.exercises=liveGroup.exercises;
          changed=true;
        }
        if(session.completed !== !!(liveMeta.completedAt || liveRec.workoutDone)) {
          session.completed=!!(liveMeta.completedAt || liveRec.workoutDone);
          changed=true;
        }
        var liveDuration=liveMeta.duration_sec!=null ? Number(liveMeta.duration_sec) : (liveMeta.durationMinutes!=null ? Number(liveMeta.durationMinutes)*60 : null);
        if(liveDuration!=null && Number(session.duration_sec)!==liveDuration) {
          session.duration_sec=liveDuration;
          changed=true;
        }
      }
    }
    if(session.duration_sec==null && session.durationMinutes!=null) {
      session.duration_sec=Number(session.durationMinutes)*60;
      changed=true;
    }
    if(session.duration_sec==null && session.dayKey && session.programDay!=null) {
      var rec=dayRecord(session.dayKey), meta=getSessionMeta(rec, session.programDay);
      if(meta.duration_sec!=null || meta.durationMinutes!=null) {
        session.duration_sec=meta.duration_sec || Number(meta.durationMinutes)*60;
        changed=true;
      }
    }
    return session;
  });
  if(changed) sv(WORKOUT_SESSIONS_KEY,store);
  return sessions.sort(function(a,b) {
    return String(a.dayKey || '').localeCompare(String(b.dayKey || ''));
  });
}

export function workoutDayKeys() {
  var keys = {};
  Object.keys(localStorage).forEach(function(key) {
    if (key.indexOf('rg_day_') === 0) keys[key.slice(7)] = true;
  });
  Object.keys(SQLiteStorage.cache || {}).forEach(function(key) {
    if (key.indexOf('rg_day_') === 0) keys[key.slice(7)] = true;
  });
  return Object.keys(keys);
}

export function saveWorkoutSessionFromDay(dayKey, rec, sequence) {
  var store=workoutSessionStore(), changed=false;
  Object.keys(store.sessions).forEach(function(id){
    if(store.sessions[id] && store.sessions[id].dayKey===dayKey) {
      delete store.sessions[id];
      changed=true;
    }
  });
  if (!rec || !workoutHasSets(rec.workout)) {
    if(changed) sv(WORKOUT_SESSIONS_KEY,store);
    return null;
  }
  var groups = groupWorkoutExercises(rec.workout);
  var programLength=(getActiveProgram() || []).length;
  var saved=[];
  groups.forEach(function(group, groupIndex) {
    var identity = programDayIdentity(sequence + groupIndex, programLength);
    var groupMeta=(rec.workoutMetaBySession||{})[String(group.index)]||rec.workoutMeta||{};
    var session = {
      id: workoutSessionId(dayKey, group.index),
      dayKey: dayKey,
      week: identity.week,
      day: group.index + 1,
      programDay: group.index,
      programLabel: group.label || identity.label,
      exerciseGroups: [group],
      exercises: group.exercises,
      completed: !!(groupMeta.completedAt || rec.workoutDone),
      completedAt: groupMeta.completedAt || null,
      startedAt: groupMeta.startedAt || null,
      durationMinutes: groupMeta.durationMinutes || null,
      duration_sec: groupMeta.duration_sec || (groupMeta.durationMinutes ? groupMeta.durationMinutes * 60 : null),
      updatedAt: new Date().toISOString()
    };
    saveWorkoutSession(session);
    saved.push(session);
  });
  return saved;
}

export function migrateWorkoutSessions() {
  var store = workoutSessionStore();
  if (store.migrated) return;
  var records = [];
  workoutDayKeys().sort().forEach(function(key) {
    var rec = dayRecord(key);
    if (workoutHasSets(rec.workout)) records.push({key:key, rec:rec});
  });
  records.forEach(function(item, index) {
    saveWorkoutSessionFromDay(item.key, item.rec, index * ((getActiveProgram() || []).length || 1));
  });
  store = workoutSessionStore();
  store.migrated = true;
  sv(WORKOUT_SESSIONS_KEY, store);
}

export function deleteWorkoutSession(sessionId) {
  var store = workoutSessionStore();
  var session = store.sessions[sessionId];
  if (!session) {
    showToast('Session not found', 'warn');
    return;
  }
  var label = session.programLabel || session.sessionLabel || 'Workout';
  var dateStr = session.dayKey || 'recorded date';
  if (!confirm('Are you sure you want to delete "' + label + '" on ' + dateStr + '?\n\nThis will remove all logged sets for this workout.')) {
    return;
  }

  delete store.sessions[sessionId];
  sv(WORKOUT_SESSIONS_KEY, store);

  if (session.dayKey) {
    var rec = dayRecord(session.dayKey);
    if (session.exercises && Array.isArray(session.exercises)) {
      session.exercises.forEach(function(ex) {
        if (rec.workout && rec.workout[ex.id]) {
          delete rec.workout[ex.id];
        }
      });
    }
    if (rec.workoutMetaBySession && rec.workoutMetaBySession[String(session.programDay)]) {
      delete rec.workoutMetaBySession[String(session.programDay)];
    }
    var hasRemaining = Object.keys(rec.workout || {}).some(function(k){
      return (rec.workout[k] || []).some(Boolean);
    });
    if (!hasRemaining) {
      rec.workoutDone = false;
      rec.workout = {};
    }
    saveDayRecord(session.dayKey, rec);
  }

  showToast('Workout deleted successfully', 'ok');
  var activeNav = document.querySelector('.nav-btn.active');
  if (activeNav && activeNav.id === 'navHistory') renderHistory();
  else renderProgressSimple('lifts');
}
