/* Pure catch-up detection, schedule sliding, and session merging algorithms */
import { scheduledSessionFor, canonicalSessionName, canonicalSessionLabel, getWeekDays } from "./schedule.js";

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
    if (decision === 'skipped' || decision === 'slid' || decision === 'merged' || decision === 'completed') continue;

    var scheduled = scheduledSessionFor(pastDate, { prog: prog, trainingDays: trainingDays, weekOverrides: weekOverrides, rec: records[pastDate] });
    if (scheduled.isRest || !scheduled.session) continue;

    var rec = records[pastDate], isDone = false;
    if (rec) {
      if (rec.workoutDone) {
        isDone = true;
      } else if (rec.workout && typeof rec.workout === 'object') {
        var completedSetsCount = 0;
        Object.keys(rec.workout).forEach(function (exId) {
          var sets = rec.workout[exId];
          if (Array.isArray(sets)) completedSetsCount += sets.filter(Boolean).length;
        });
        if (completedSetsCount > 0) isDone = true;
      }
    }

    if (!isDone) {
      allMissed.push({ date: pastDate, session: scheduled.session, workoutIndex: scheduled.workoutIndex, label: scheduled.label });
    }
  }

  if (allMissed.length === 0) return { missed: false, date: null, session: null, allMissed: [] };
  var latest = allMissed[allMissed.length - 1];
  return { missed: true, date: latest.date, session: latest.session, workoutIndex: latest.workoutIndex, label: latest.label, allMissed: allMissed };
}

/**
 * Pure schedule slide algorithm:
 * Shifts remaining workouts right by 1 day, absorbing the nearest rest day.
 * Mid-week rest (e.g. Wednesday) absorbed first, otherwise Sunday rest if allowed.
 */
export function planSlide(todayDateInput, missedDateInput, options) {
  var opts = options || {};
  var todayStr = typeof todayDateInput === 'string' ? todayDateInput.slice(0, 10) : todayDateInput;
  var missedStr = typeof missedDateInput === 'string' ? missedDateInput.slice(0, 10) : missedDateInput;
  var weekDays = getWeekDays(todayStr);
  var todayIdx = weekDays.indexOf(todayStr);

  var protectLastRestDay = opts.protectLastRestDay !== false; // default true
  var existingOverrides = opts.weekOverrides || {};
  var prog = opts.prog;
  var trainingDays = opts.trainingDays;

  // Find remaining days from today to end of week (Sunday)
  var remainingDates = weekDays.slice(todayIdx);

  // Map each remaining date to its current scheduled status
  var currentSchedule = remainingDates.map(function (d) {
    var res = scheduledSessionFor(d, {
      prog: prog,
      trainingDays: trainingDays,
      weekOverrides: existingOverrides
    });
    return {
      date: d,
      isRest: res.isRest,
      workoutIndex: res.workoutIndex,
      session: res.session
    };
  });

  // Find the missed session
  var missedRes = scheduledSessionFor(missedStr, {
    prog: prog,
    trainingDays: trainingDays,
    weekOverrides: existingOverrides
  });
  if (missedRes.isRest || missedRes.workoutIndex == null) {
    return { valid: false, reason: "Missed date was already a rest day", assignments: {} };
  }

  // Workouts that need to be scheduled: the missed workout followed by the remaining planned workouts
  var pendingWorkouts = [missedRes.workoutIndex];
  currentSchedule.forEach(function (slot) {
    if (!slot.isRest && slot.workoutIndex != null && pendingWorkouts.indexOf(slot.workoutIndex) === -1) {
      pendingWorkouts.push(slot.workoutIndex);
    }
  });

  // Check available rest days to absorb in remaining schedule
  // Mid-week rest days (not Sunday) are preferred
  var restSlots = currentSchedule.filter(function (slot) { return slot.isRest; });
  if (restSlots.length === 0) {
    return { valid: false, reason: "No rest day left this week", assignments: {} };
  }

  var sundaySlot = currentSchedule.find(function (s) {
    return new Date(s.date + 'T00:00:00').getDay() === 0;
  });

  // If the only available rest slot is Sunday and protectLastRestDay is ON
  if (protectLastRestDay && restSlots.length === 1 && sundaySlot && restSlots[0].date === sundaySlot.date) {
    // If pendingWorkouts exceeds non-rest slots, sliding would push onto Sunday
    var nonRestSlotsCount = currentSchedule.length - restSlots.length;
    if (pendingWorkouts.length > nonRestSlotsCount) {
      return {
        valid: false,
        reason: "Sunday rest day is protected; no mid-week rest day left to absorb",
        assignments: {}
      };
    }
  }

  // Assign workouts to remaining slots in order
  var assignments = {};
  var newOverrides = Object.assign({}, existingOverrides);
  var wCursor = 0;
  var absorbedRestDate = null;

  for (var i = 0; i < currentSchedule.length; i++) {
    var slot = currentSchedule[i];
    if (wCursor < pendingWorkouts.length) {
      var wIdx = pendingWorkouts[wCursor];
      assignments[slot.date] = wIdx;
      newOverrides[slot.date] = wIdx;
      if (slot.isRest && !absorbedRestDate) {
        absorbedRestDate = slot.date;
      }
      wCursor++;
    } else {
      // Any remaining slot becomes rest
      assignments[slot.date] = 'rest';
      newOverrides[slot.date] = 'rest';
    }
  }

  // Mark missed date as skipped or rest in overrides so it's not double-scheduled
  assignments[missedStr] = 'rest';
  newOverrides[missedStr] = 'rest';

  return {
    valid: true,
    absorbedRestDate: absorbedRestDate,
    assignments: assignments,
    newWeekOverrides: newOverrides
  };
}

/**
 * Pure session merge algorithm:
 * Takes today's planned session and the missed session.
 * Adds 1-2 key exercises from missed session into today's workout.
 * Respects caps: max 20 sets (or custom), max 10 sets/muscle, <= 80 min.
 * Prioritizes compounds, target deficit, and first exercise.
 */
export function buildMergedSession(todayPlan, missedPlan, weeklyProgress, targets, options) {
  var opts = options || {};
  var maxSets = opts.maxSets != null ? opts.maxSets : 20;
  var maxMuscleSets = opts.maxMuscleSets != null ? opts.maxMuscleSets : 10;
  var maxDuration = opts.maxDurationMin != null ? opts.maxDurationMin : 80;
  var setsPerAdded = opts.setsPerAddedExercise != null ? opts.setsPerAddedExercise : 2;
  var maxAdded = opts.maxAddedExercises != null ? opts.maxAddedExercises : 2;
  var progress = weeklyProgress || {};
  var muscleTargets = targets || {};

  var tSession = todayPlan || { label: 'Workout', exercises: [] };
  var mSession = missedPlan || { label: 'Missed Workout', exercises: [] };

  var baseExercises = (tSession.exercises || []).map(function (ex) {
    return Object.assign({}, ex);
  });

  // Calculate current sets per muscle in today's workout
  var muscleSets = {};
  var currentTotalSets = 0;

  baseExercises.forEach(function (ex) {
    var s = ex.sets != null ? Number(ex.sets) : 2;
    currentTotalSets += s;
    var muscles = (ex.muscle || ex.primaryMuscle || 'other').split(',').map(function (m) { return m.trim().toLowerCase(); });
    muscles.forEach(function (m) {
      muscleSets[m] = (muscleSets[m] || 0) + s;
    });
  });

  // Score candidate exercises from missed session
  var candidates = [];
  var dropped = [];

  (mSession.exercises || []).forEach(function (ex, idx) {
    var primaryM = ((ex.muscle || ex.primaryMuscle || 'other').split(',')[0] || 'other').trim().toLowerCase();
    var currentMCount = muscleSets[primaryM] || 0;

    // Check muscle cap
    if (currentMCount + setsPerAdded > maxMuscleSets) {
      dropped.push({
        id: ex.id,
        name: ex.name,
        muscle: primaryM,
        reason: 'Daily muscle cap of ' + maxMuscleSets + ' sets reached for ' + primaryM
      });
      return;
    }

    // Scoring
    var isCompound = ex.type === 'compound' || ex.isCompound === true;
    var score = isCompound ? 50 : 15;

    // Deficit bonus from weekly targets
    var target = muscleTargets[primaryM] != null
      ? muscleTargets[primaryM]
      : (primaryM === 'chest' || primaryM === 'back' || primaryM === 'quads' || primaryM === 'hamstrings' || primaryM === 'shoulders' || primaryM === 'biceps' || primaryM === 'triceps' ? 10 : 0);
    var logged = progress[primaryM] || 0;
    var deficit = Math.max(0, target - logged);
    score += deficit * 5;

    // First exercise bonus
    if (idx === 0) score += 20;
    score += (mSession.exercises.length - idx);

    // Compound bonus over isolation
    if (isCompound) score += 10;

    candidates.push({
      ex: ex,
      score: score,
      primaryMuscle: primaryM,
      isCompound: isCompound
    });
  });

  // Sort candidates by score descending
  candidates.sort(function (a, b) {
    return b.score - a.score;
  });

  var addedList = [];
  var addedMuscles = {};
  var mergedExercises = baseExercises.slice();

  function tryAddCandidate(item) {
    if (addedList.length >= maxAdded) return false;
    var ex = item.ex;
    var primaryM = item.primaryMuscle;

    var nextTotal = currentTotalSets + setsPerAdded;
    var nextDuration = nextTotal * 3.5;
    if (nextTotal > maxSets || nextDuration > maxDuration) {
      dropped.push({
        id: ex.id,
        name: ex.name,
        muscle: primaryM,
        reason: 'Session cap of ' + maxSets + ' sets / ' + maxDuration + ' min reached'
      });
      return false;
    }

    var addedEx = Object.assign({}, ex, {
      sets: setsPerAdded,
      isCatchup: true,
      source: 'catchup'
    });

    var inserted = false;
    for (var k = mergedExercises.length - 1; k >= 0; k--) {
      var existM = (mergedExercises[k].muscle || '').toLowerCase();
      if (existM.indexOf(primaryM) > -1) {
        mergedExercises.splice(k + 1, 0, addedEx);
        inserted = true;
        break;
      }
    }
    if (!inserted) {
      mergedExercises.push(addedEx);
    }

    currentTotalSets = nextTotal;
    muscleSets[primaryM] = (muscleSets[primaryM] || 0) + setsPerAdded;
    addedMuscles[primaryM] = true;
    addedList.push(addedEx);
    return true;
  }

  // Pass 1: Select top candidate per distinct muscle group
  var processed = {};
  for (var c = 0; c < candidates.length; c++) {
    var cand = candidates[c];
    if (addedList.length >= maxAdded) break;
    if (!addedMuscles[cand.primaryMuscle]) {
      if (tryAddCandidate(cand)) {
        processed[cand.ex.id] = true;
      }
    }
  }

  // Pass 2: If slots remain, select remaining highest scoring candidates
  for (var c2 = 0; c2 < candidates.length; c2++) {
    var cand2 = candidates[c2];
    if (addedList.length >= maxAdded) break;
    if (!processed[cand2.ex.id]) {
      if (tryAddCandidate(cand2)) {
        processed[cand2.ex.id] = true;
      }
    }
  }

  // Collect dropped candidates
  for (var d = 0; d < candidates.length; d++) {
    var notAdded = candidates[d];
    if (!processed[notAdded.ex.id]) {
      dropped.push({
        id: notAdded.ex.id,
        name: notAdded.ex.name,
        muscle: notAdded.primaryMuscle,
        reason: 'Dropped to stay under ' + maxSets + ' sets / ' + maxAdded + ' added exercises'
      });
    }
  }

  var droppedNames = dropped.map(function (d) { return d.name; });
  var droppedReason = droppedNames.length > 0
    ? 'Dropped ' + droppedNames.join(', ') + ' to stay under ' + maxSets + ' sets'
    : '';

  var mergedCleanName = canonicalSessionName(tSession);

  return {
    mergedSession: {
      label: canonicalSessionLabel(tSession) + ' + Catch-up',
      cleanName: mergedCleanName + ' + Catch-up',
      programDay: tSession.dayIndex != null ? tSession.dayIndex : 0,
      exercises: mergedExercises,
      isMerged: true,
      catchupDate: mSession.date || null
    },
    addedExercises: addedList,
    droppedExercises: dropped,
    droppedReason: droppedReason,
    totalSets: currentTotalSets,
    estimatedDuration: Math.round(currentTotalSets * 3.5)
  };
}
