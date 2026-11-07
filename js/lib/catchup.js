/* Pure catch-up detection, schedule sliding, volume distribution, and session validation */
import { scheduledSessionFor, canonicalSessionName, canonicalSessionLabel, getWeekDays, isTrainingDay } from "./schedule.js";
import { getPrimaryMuscle, isCompoundLift, planFullBodyMode, FULL_BODY_THRESHOLD } from "./catchup-fullbody.js";
export * from "./catchup-fullbody.js";

/** Detects whether a training day was missed in current week (Mon to today-1) */
export function detectMissedDay(todayDateInput, options) {
  var opts = options || {};
  var todayKeyStr = typeof todayDateInput === 'string' ? todayDateInput.slice(0, 10) : todayDateInput;
  var weekDays = getWeekDays(todayKeyStr);
  var todayIdx = weekDays.indexOf(todayKeyStr);
  if (todayIdx <= 0) return { missed: false, date: null, session: null, allMissed: [] };

  var records = opts.records || {}, weekOverrides = opts.weekOverrides || {}, decisions = opts.decisions || {};
  var prog = opts.prog, trainingDays = opts.trainingDays, allMissed = [];

  for (var i = 0; i < todayIdx; i++) {
    var pastDate = weekDays[i];
    var decision = decisions[pastDate];
    if (decision === 'skipped' || decision === 'slid' || decision === 'merged' || decision === 'spread' || decision === 'completed') continue;

    var scheduled = scheduledSessionFor(pastDate, { prog: prog, trainingDays: trainingDays, weekOverrides: weekOverrides, rec: records[pastDate] });
    if (scheduled.isRest || !scheduled.session) continue;

    var rec = records[pastDate], isDone = false;
    if (rec) {
      if (rec.workoutDone) isDone = true;
      else if (rec.workout && typeof rec.workout === 'object') {
        isDone = Object.keys(rec.workout).some(function(id) { return Array.isArray(rec.workout[id]) && rec.workout[id].some(Boolean); });
      }
    }

    if (!isDone) {
      var tName = canonicalSessionName(scheduled.session), tIdx = scheduled.workoutIndex;
      var completedLater = weekDays.some(function(otherDate, oIdx) {
        if (oIdx <= i) return false;
        var oRec = records[otherDate];
        if (!oRec) return false;
        var oDone = oRec.workoutDone || (oRec.workout && typeof oRec.workout === 'object' && Object.keys(oRec.workout).some(function(id) { return Array.isArray(oRec.workout[id]) && oRec.workout[id].some(Boolean); }));
        if (!oDone) return false;
        if (oRec.selectedWorkout != null && tIdx != null && oRec.selectedWorkout === tIdx) return true;
        if (oRec.workoutMeta) {
          if (oRec.workoutMeta.workoutIndex != null && tIdx != null && oRec.workoutMeta.workoutIndex === tIdx) return true;
          if (oRec.workoutMeta.sessionLabel && canonicalSessionName({ label: oRec.workoutMeta.sessionLabel }) === tName) return true;
        }
        var oSched = scheduledSessionFor(otherDate, { prog: prog, trainingDays: trainingDays, weekOverrides: weekOverrides, rec: oRec });
        return !!(oSched && oSched.session && (canonicalSessionName(oSched.session) === tName || (tIdx != null && oSched.workoutIndex === tIdx)));
      });
      if (completedLater) isDone = true;
    }

    if (!isDone) allMissed.push({ date: pastDate, session: scheduled.session, workoutIndex: scheduled.workoutIndex, label: scheduled.label });
  }

  if (allMissed.length === 0) return { missed: false, date: null, session: null, allMissed: [] };
  var latest = allMissed[allMissed.length - 1];
  return { missed: true, date: latest.date, session: latest.session, workoutIndex: latest.workoutIndex, label: latest.label, allMissed: allMissed };
}

/** B1 Hard session limits validator */
export function validateSessionLimits(session, options) {
  var opts = options || {};
  var maxExercises = opts.maxExercises != null ? Number(opts.maxExercises) : 7;
  var maxSets = opts.maxSets != null ? Number(opts.maxSets) : 20;
  var maxAddedEx = opts.maxAddedExercises != null ? Number(opts.maxAddedExercises) : 2;
  var maxAddedSets = opts.maxAddedSets != null ? Number(opts.maxAddedSets) : 4;

  if (!session || !Array.isArray(session.exercises)) return { valid: true, session: session, dropped: [] };
  var exercises = session.exercises.map(function(e) { return Object.assign({}, e); }), dropped = [];
  var addedCount = 0, addedSets = 0;
  exercises = exercises.filter(function(ex) {
    if (ex.isCatchup || ex.source === 'catchup') {
      var s = ex.sets != null ? Number(ex.sets) : 2;
      if (addedCount >= maxAddedEx || addedSets + s > maxAddedSets) {
        dropped.push({ id: ex.id, name: ex.name, reason: 'Exceeded max added catch-up limit per day' });
        return false;
      }
      addedCount++; addedSets += s;
    }
    return true;
  });

  // 2. Enforce max exercises per session by dropping lowest-priority (isolation first)
  if (exercises.length > maxExercises) {
    var sortedToDrop = exercises.slice().sort(function(a, b) {
      var aC = isCompoundLift(a) ? 1 : 0, bC = isCompoundLift(b) ? 1 : 0;
      return aC !== bC ? (aC - bC) : ((a.sets || 2) - (b.sets || 2));
    });
    while (exercises.length > maxExercises && sortedToDrop.length > 0) {
      var targetDrop = sortedToDrop.shift();
      var idx = exercises.findIndex(function(e) { return e.id === targetDrop.id; });
      if (idx >= 0) {
        dropped.push({ id: targetDrop.id, name: targetDrop.name, reason: 'Session exceeded ' + maxExercises + ' exercises' });
        exercises.splice(idx, 1);
      }
    }
  }

  // 3. Enforce max sets ceiling
  var totalSets = exercises.reduce(function(tot, e) { return tot + (e.sets || 2); }, 0);
  if (totalSets > maxSets) {
    for (var i = exercises.length - 1; i >= 0 && totalSets > maxSets; i--) {
      var ex = exercises[i];
      if (!isCompoundLift(ex) && ex.sets > 2) {
        var cut = Math.min(ex.sets - 2, totalSets - maxSets);
        ex.sets -= cut; totalSets -= cut;
      }
    }
    for (var j = exercises.length - 1; j >= 0 && totalSets > maxSets; j--) {
      var ex2 = exercises[j];
      if (ex2.sets > 1) {
        var cut2 = Math.min(ex2.sets - 1, totalSets - maxSets);
        ex2.sets -= cut2; totalSets -= cut2;
      }
    }
  }

  var validatedSession = Object.assign({}, session, {
    exercises: exercises,
    totalSets: totalSets
  });

  return {
    valid: true,
    session: validatedSession,
    dropped: dropped,
    totalSets: totalSets
  };
}

/** Pure schedule slide algorithm */
export function planSlide(todayDateInput, missedDateInput, options) {
  var opts = options || {};
  var todayStr = typeof todayDateInput === 'string' ? todayDateInput.slice(0, 10) : todayDateInput;
  var missedStr = typeof missedDateInput === 'string' ? missedDateInput.slice(0, 10) : missedDateInput;
  var weekDays = getWeekDays(todayStr);
  var todayIdx = weekDays.indexOf(todayStr);

  var protectLastRestDay = opts.protectLastRestDay !== false;
  var existingOverrides = opts.weekOverrides || {};
  var prog = opts.prog, trainingDays = opts.trainingDays;
  var remainingDates = weekDays.slice(todayIdx);

  var currentSchedule = remainingDates.map(function (d) {
    var res = scheduledSessionFor(d, { prog: prog, trainingDays: trainingDays, weekOverrides: existingOverrides });
    return { date: d, isRest: res.isRest, workoutIndex: res.workoutIndex, session: res.session };
  });

  var missedRes = scheduledSessionFor(missedStr, { prog: prog, trainingDays: trainingDays, weekOverrides: existingOverrides });
  if (missedRes.isRest || missedRes.workoutIndex == null) return { valid: false, reason: "Missed date was already a rest day", assignments: {} };

  var pendingWorkouts = [missedRes.workoutIndex];
  currentSchedule.forEach(function (slot) {
    if (!slot.isRest && slot.workoutIndex != null && !pendingWorkouts.includes(slot.workoutIndex)) pendingWorkouts.push(slot.workoutIndex);
  });

  var restSlots = currentSchedule.filter(function (s) { return s.isRest; });
  if (restSlots.length === 0) return { valid: false, reason: "No rest day left this week", assignments: {} };

  var sundaySlot = currentSchedule.find(function (s) { return new Date(s.date + 'T00:00:00').getDay() === 0; });
  if (protectLastRestDay && restSlots.length === 1 && sundaySlot && restSlots[0].date === sundaySlot.date) {
    if (pendingWorkouts.length > (currentSchedule.length - restSlots.length)) {
      return { valid: false, reason: "Sunday rest day is protected; no mid-week rest day left to absorb", assignments: {} };
    }
  }

  var assignments = {}, newOverrides = Object.assign({}, existingOverrides), wCursor = 0, absorbedRestDate = null;
  for (var i = 0; i < currentSchedule.length; i++) {
    var slot = currentSchedule[i];
    if (wCursor < pendingWorkouts.length) {
      var wIdx = pendingWorkouts[wCursor];
      assignments[slot.date] = wIdx;
      newOverrides[slot.date] = wIdx;
      if (slot.isRest && !absorbedRestDate) absorbedRestDate = slot.date;
      wCursor++;
    } else {
      assignments[slot.date] = 'rest';
      newOverrides[slot.date] = 'rest';
    }
  }
  assignments[missedStr] = 'rest';
  newOverrides[missedStr] = 'rest';

  return { valid: true, absorbedRestDate: absorbedRestDate, assignments: assignments, newWeekOverrides: newOverrides };
}

/** B2 & B3: Preferred Volume Redistribution Strategy */
export function planSpreadAcrossWeek(todayDateInput, options) {
  var opts = options || {};
  var todayKeyStr = typeof todayDateInput === 'string' ? todayDateInput.slice(0, 10) : todayDateInput;
  var weekDays = getWeekDays(todayKeyStr);
  var todayIdx = weekDays.indexOf(todayKeyStr);
  var prog = opts.prog || [];
  var trainingDays = Array.isArray(opts.trainingDays) ? opts.trainingDays : [1, 2, 4, 5, 6];
  var weekOverrides = opts.weekOverrides || {};
  var records = opts.records || {};
  var decisions = opts.decisions || {};
  var protectLastRestDay = opts.protectLastRestDay !== false;

  var detection = detectMissedDay(todayKeyStr, {
    prog: prog,
    trainingDays: trainingDays,
    weekOverrides: weekOverrides,
    records: records,
    decisions: decisions
  });

  if (!detection.missed || !detection.allMissed || detection.allMissed.length === 0) {
    return { needed: false, valid: false, reason: "No missed workouts detected", assignments: {} };
  }

  var allMissed = detection.allMissed;
  var remainingDays = weekDays.slice(todayIdx).filter(function(d) {
    var jsDay = new Date(d + 'T00:00:00').getDay();
    if (protectLastRestDay && jsDay === 0) return false;
    return isTrainingDay(d, trainingDays);
  });

  // B4: Full-Body Mode triggered if 2+ missed days AND remaining training days are 3 or 4 (or <= 2)
  var isFullBodyTrigger = (allMissed.length >= 2) && (remainingDays.length <= 4);
  if (isFullBodyTrigger) {
    return planFullBodyMode(todayKeyStr, allMissed, remainingDays, prog, opts);
  }

  // 1. Calculate missed sets per muscle group
  var missedMuscleSets = {}, missedMuscleExs = {}, totalMissed = 0;
  allMissed.forEach(function(m) {
    (m.session.exercises || []).forEach(function(ex) {
      var mGroup = getPrimaryMuscle(ex);
      var sets = ex.sets != null ? Number(ex.sets) : 2;
      missedMuscleSets[mGroup] = (missedMuscleSets[mGroup] || 0) + sets;
      totalMissed += sets;
      missedMuscleExs[mGroup] = missedMuscleExs[mGroup] || [];
      if (!missedMuscleExs[mGroup].some(function(e) { return e.id === ex.id; })) {
        missedMuscleExs[mGroup].push(ex);
      }
    });
  });

  // 2. Clone scheduled sessions for remaining days
  var workingSessions = {};
  remainingDays.forEach(function(d) {
    var sched = scheduledSessionFor(d, { prog: prog, trainingDays: trainingDays, weekOverrides: weekOverrides });
    var baseSess = sched.session ? JSON.parse(JSON.stringify(sched.session)) : { label: 'Workout', exercises: [] };
    baseSess.programDay = sched.workoutIndex != null ? sched.workoutIndex : 0;
    workingSessions[d] = baseSess;
  });

  // 3. Redistribute sets round-robin across remaining sessions
  var dayAddedSummary = {}, totalRedistributed = 0;
  remainingDays.forEach(function(d) { dayAddedSummary[d] = { sets: 0, exercises: [], muscleSets: {} }; });

  var musclesList = Object.keys(missedMuscleSets).sort(function(a, b) {
    var pOrder = { chest: 1, back: 2, quads: 3, hamstrings: 4, shoulders: 5, biceps: 6, triceps: 7, calves: 8 };
    return (pOrder[a] || 99) - (pOrder[b] || 99);
  });

  musclesList.forEach(function(mGroup) {
    var remSets = missedMuscleSets[mGroup];
    var candidateDays = remainingDays.filter(function(d) {
      return (workingSessions[d].exercises || []).some(function(ex) {
        return getPrimaryMuscle(ex) === mGroup;
      });
    });

    if (candidateDays.length > 0) {
      var rIdx = 0;
      while (remSets > 0 && rIdx < candidateDays.length * 3) {
        var dayDate = candidateDays[rIdx % candidateDays.length];
        var sess = workingSessions[dayDate];
        var dayAdded = dayAddedSummary[dayDate].sets;
        var daySetCount = sess.exercises.reduce(function(acc, e) { return acc + (e.sets || 2); }, 0);
        var maxDayAdd = (allMissed.length === 1) ? 2 : 4;

        if (dayAdded < maxDayAdd && daySetCount < 20) {
          var matchingExs = sess.exercises.filter(function(ex) { return getPrimaryMuscle(ex) === mGroup; });
          matchingExs.sort(function(a, b) { return (a.sets || 2) - (b.sets || 2); });
          var targetEx = matchingExs[0];
          if (targetEx && (targetEx.sets || 2) < 4) {
            targetEx.sets = (targetEx.sets || 2) + 1;
            targetEx.isCatchup = true;
            targetEx.catchupSets = (targetEx.catchupSets || 0) + 1;
            dayAddedSummary[dayDate].sets++;
            dayAddedSummary[dayDate].muscleSets[mGroup] = (dayAddedSummary[dayDate].muscleSets[mGroup] || 0) + 1;
            remSets--;
            totalRedistributed++;
          }
        }
        rIdx++;
      }
    } else {
      // Add a single compound exercise if no remaining session trains this muscle
      var bestDay = null;
      for (var b = 0; b < remainingDays.length; b++) {
        var cd = remainingDays[b];
        var cSess = workingSessions[cd];
        var maxDayAdd = (allMissed.length === 1) ? 2 : 4;
        if (cSess.exercises.length < 7 && dayAddedSummary[cd].sets + 2 <= maxDayAdd && dayAddedSummary[cd].exercises.length < 1) {
          bestDay = cd;
          break;
        }
      }
      if (bestDay) {
        var pool = missedMuscleExs[mGroup] || [];
        pool.sort(function(a, b) { return (isCompoundLift(b) ? 1 : 0) - (isCompoundLift(a) ? 1 : 0); });
        var chosenEx = pool[0];
        if (chosenEx) {
          var addedSets = Math.min(2, remSets);
          var exToAdd = Object.assign({}, chosenEx, { sets: addedSets, isCatchup: true, source: 'catchup', catchupSets: addedSets });
          workingSessions[bestDay].exercises.push(exToAdd);
          dayAddedSummary[bestDay].sets += addedSets;
          dayAddedSummary[bestDay].exercises.push(chosenEx.name);
          dayAddedSummary[bestDay].muscleSets[mGroup] = (dayAddedSummary[bestDay].muscleSets[mGroup] || 0) + addedSets;
          remSets -= addedSets;
          totalRedistributed += addedSets;
        }
      }
    }
  });

  // 4. Validate all generated sessions against B1 limits
  var assignments = {}, preview = [];
  remainingDays.forEach(function(d) {
    var rawSess = workingSessions[d];
    var summary = dayAddedSummary[d];
    var val = validateSessionLimits(rawSess, { maxExercises: 7, maxSets: 20 });
    var sess = val.session;
    var dObj = new Date(d + 'T00:00:00');
    var weekday = dObj.toLocaleDateString('en-GB', { weekday: 'short' });
    var sessName = canonicalSessionName(sess);
    var details = [];
    Object.keys(summary.muscleSets).forEach(function(m) {
      details.push('+' + summary.muscleSets[m] + ' ' + m + ' set' + (summary.muscleSets[m] > 1 ? 's' : ''));
    });
    if (summary.exercises.length > 0) {
      summary.exercises.forEach(function(eName) { details.push('+' + eName); });
    }
    if (details.length > 0) {
      preview.push(weekday + ': ' + sessName + ' (' + details.join(', ') + ')');
      sess.isMerged = true;
      sess.cleanName = sessName + ' + Catch-up';
      sess.label = canonicalSessionLabel(sess) + ' + Catch-up';
      assignments[d] = sess;
    }
  });

  return {
    mode: 'spread',
    valid: preview.length > 0,
    totalMissedSets: totalMissed,
    totalRedistributedSets: Math.min(totalMissed, totalRedistributed),
    assignments: assignments,
    preview: preview,
    remainingDays: remainingDays
  };
}

/** Pure session merge algorithm (single-day preview) */
export function buildMergedSession(todayPlan, missedPlan, weeklyProgress, targets, options) {
  var opts = options || {}, maxSets = opts.maxSets != null ? opts.maxSets : 20, maxAdded = opts.maxAddedExercises != null ? opts.maxAddedExercises : 2, setsPerAdded = opts.setsPerAddedExercise != null ? opts.setsPerAddedExercise : 2;
  var tSession = todayPlan || { label: 'Workout', exercises: [] }, mSession = missedPlan || { label: 'Missed Workout', exercises: [] };
  var mergedExercises = (tSession.exercises || []).map(function(e) { return Object.assign({}, e); }), addedList = [], dropped = [];
  var currentSets = mergedExercises.reduce(function(tot, e) { return tot + (e.sets || 2); }, 0);

  (mSession.exercises || []).forEach(function(ex) {
    if (addedList.length >= maxAdded || currentSets + setsPerAdded > maxSets) {
      dropped.push({ id: ex.id, name: ex.name, reason: 'Exceeded session limits' });
      return;
    }
    var addedEx = Object.assign({}, ex, { sets: setsPerAdded, isCatchup: true, source: 'catchup' });
    mergedExercises.push(addedEx);
    addedList.push(addedEx);
    currentSets += setsPerAdded;
  });

  var val = validateSessionLimits({ exercises: mergedExercises }, { maxExercises: 7, maxSets: maxSets });

  return {
    mergedSession: {
      label: canonicalSessionLabel(tSession) + ' + Catch-up',
      cleanName: canonicalSessionName(tSession) + ' + Catch-up',
      programDay: tSession.dayIndex != null ? tSession.dayIndex : 0,
      exercises: val.session.exercises,
      isMerged: true,
      catchupDate: mSession.date || null
    },
    addedExercises: addedList,
    droppedExercises: dropped.concat(val.dropped),
    droppedReason: dropped.length ? 'Dropped ' + dropped.map(function(d){ return d.name; }).join(', ') + ' to stay under limits' : '',
    totalSets: val.totalSets,
    estimatedDuration: Math.round(val.totalSets * 3.5)
  };
}
