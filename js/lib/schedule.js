/* Pure schedule and calendar resolution functions */

import { profile } from "../state.js";
import { getActiveProgram } from "../data/plan.js";
import { dayRecord, ls } from "../storage.js";
import { dateKey, todayKey } from "./format.js";

export function canonicalSessionName(session) {
  if (!session) return '';
  var raw = session.label || session.name || 'Workout';
  return raw.replace(/^Day\s*\d+\s*[—–·•\-]\s*/i, '').trim() || raw;
}

export function canonicalSessionLabel(session, index) {
  if (!session) return '';
  var num = index != null ? (index + 1) : (session.dayIndex != null ? (session.dayIndex + 1) : 1);
  var name = canonicalSessionName(session);
  return 'Day ' + num + ' — ' + name;
}

export function sessionSetCount(session, rec) {
  if (!session || !Array.isArray(session.exercises)) return 0;
  return session.exercises.reduce(function (total, ex) {
    if (rec && rec.exercisePlannedSets && rec.exercisePlannedSets[ex.id] != null) {
      return total + Number(rec.exercisePlannedSets[ex.id]);
    }
    var s = ex && ex.sets != null ? Number(ex.sets) : 2;
    return total + (isNaN(s) || s < 1 ? 2 : s);
  }, 0);
}

export function getWeekDays(dateInput) {
  var d = typeof dateInput === 'string'
    ? new Date(dateInput.slice(0, 10) + 'T00:00:00')
    : new Date(dateInput);
  var jsDay = d.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  var diffToMon = jsDay === 0 ? -6 : 1 - jsDay;
  var mon = new Date(d);
  mon.setDate(d.getDate() + diffToMon);

  var week = [];
  for (var i = 0; i < 7; i++) {
    var cur = new Date(mon);
    cur.setDate(mon.getDate() + i);
    week.push(dateKey(cur));
  }
  return week;
}

export function isTrainingDay(dateInput, trainingDays) {
  var tdays = Array.isArray(trainingDays) ? trainingDays : [1, 2, 4, 5, 6];
  var d = typeof dateInput === 'string'
    ? new Date(dateInput.slice(0, 10) + 'T00:00:00')
    : new Date(dateInput);
  return tdays.includes(d.getDay());
}

export function validateTrainingDays(prog, trainingDays) {
  var p = Array.isArray(prog) ? prog : (getActiveProgram() || []);
  var t = Array.isArray(trainingDays)
    ? trainingDays
    : ((profile && Array.isArray(profile.trainingDays)) ? profile.trainingDays : [1, 2, 4, 5, 6]);
  var valid = p.length === t.length && p.length > 0;
  return {
    valid: valid,
    sessionCount: p.length,
    trainingDayCount: t.length,
    message: p.length + ' sessions, ' + t.length + ' training days'
  };
}

export function getWeekOverridesStore() {
  return ls('rg_week_overrides', {});
}

export function scheduledSessionFor(dateInput, options) {
  var opts = options || {};
  var dateStr = typeof dateInput === 'string' ? dateInput.slice(0, 10) : dateKey(dateInput);
  var prog = opts.prog || getActiveProgram();
  if (!Array.isArray(prog) || prog.length === 0) {
    return { isRest: true, workoutIndex: null, session: null, label: 'Rest Day', cleanName: 'Rest Day', source: 'empty_plan' };
  }

  // 1. Week Overrides check
  var overrides = opts.weekOverrides !== undefined ? opts.weekOverrides : getWeekOverridesStore();
  if (overrides && overrides[dateStr] !== undefined) {
    var ov = overrides[dateStr];
    if (ov === 'rest' || ov === null) {
      return { isRest: true, workoutIndex: null, session: null, label: 'Rest Day', cleanName: 'Scheduled Rest Day', source: 'override' };
    }
    var ovIdx = typeof ov === 'number' ? ov : parseInt(ov, 10);
    if (!isNaN(ovIdx) && prog[ovIdx]) {
      return {
        isRest: false,
        workoutIndex: ovIdx,
        session: prog[ovIdx],
        label: canonicalSessionLabel(prog[ovIdx], ovIdx),
        cleanName: canonicalSessionName(prog[ovIdx]),
        source: 'override'
      };
    }
    // If ov is a session object directly (e.g. merged session)
    if (typeof ov === 'object' && ov !== null && Array.isArray(ov.exercises)) {
      return {
        isRest: false,
        workoutIndex: ov.programDay != null ? ov.programDay : 0,
        session: ov,
        label: ov.label || 'Merged Session',
        cleanName: canonicalSessionName(ov),
        source: 'override'
      };
    }
  }

  // 2. Day Record manual choice (selectedWorkout)
  if (!opts.ignoreDayRecord) {
    var rec = opts.rec !== undefined ? opts.rec : (typeof dayRecord === 'function' ? dayRecord(dateStr) : null);
    if (rec && rec.selectedWorkout !== undefined) {
      if (rec.selectedWorkout === null) {
        return { isRest: true, workoutIndex: null, session: null, label: 'Rest Day', cleanName: 'Scheduled Rest Day', source: 'manual' };
      }
      var sIdx = Math.min(Math.max(0, rec.selectedWorkout), prog.length - 1);
      return {
        isRest: false,
        workoutIndex: sIdx,
        session: prog[sIdx] || prog[0],
        label: canonicalSessionLabel(prog[sIdx] || prog[0], sIdx),
        cleanName: canonicalSessionName(prog[sIdx] || prog[0]),
        source: 'manual'
      };
    }
  }

  // 3. Base schedule calculation
  var dObj = new Date(dateStr + 'T00:00:00');
  var jsDay = dObj.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  var rawTdays = opts.trainingDays || ((profile && Array.isArray(profile.trainingDays) && profile.trainingDays.length > 0) ? profile.trainingDays : [1, 2, 4, 5, 6]);

  // Order weekdays Monday-first: [1, 2, 3, 4, 5, 6, 0]
  var tdays = rawTdays.slice().sort(function (a, b) {
    var aOrder = a === 0 ? 7 : a;
    var bOrder = b === 0 ? 7 : b;
    return aOrder - bOrder;
  });

  var trainIdx = tdays.indexOf(jsDay);
  if (trainIdx >= 0 && trainIdx < prog.length) {
    var sess = prog[trainIdx];
    return {
      isRest: false,
      workoutIndex: trainIdx,
      session: sess,
      label: canonicalSessionLabel(sess, trainIdx),
      cleanName: canonicalSessionName(sess),
      source: 'schedule'
    };
  }

  return {
    isRest: true,
    workoutIndex: null,
    session: null,
    label: 'Rest Day',
    cleanName: 'Scheduled Rest Day',
    source: 'schedule'
  };
}
