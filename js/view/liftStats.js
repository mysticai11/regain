/* View-Model: Lift Statistics, Personal Bests & Volume Calculations (Item 3) */

import { calcE1RM } from "../lib/calc.js";

/**
 * Computes pure view-model data for the Lifts tab.
 * Pure function: NO DOM, NO storage, NO Date.now().
 *
 * @param {Object} config
 * @param {string} config.exerciseId Target exercise ID
 * @param {Array} config.sessions Array of workout sessions or day records
 * @param {'e1rm'|'topSet'|'volume'} [config.metric='e1rm']
 * @param {'4w'|'12w'|'all'} [config.range='all']
 * @param {number} config.nowMs Reference timestamp for range filtering (mandatory)
 * @returns {Object} { personalBests, chartPoints, recentSessions, summary }
 */
export function computeLiftViewModel({
  exerciseId,
  sessions = [],
  metric = 'e1rm',
  range = 'all',
  nowMs
} = {}) {
  if (!nowMs || typeof nowMs !== 'number') {
    throw new Error('computeLiftViewModel requires reference nowMs timestamp');
  }

  if (!exerciseId || !Array.isArray(sessions) || sessions.length === 0) {
    return {
      personalBests: { heaviest: null, bestE1RM: null, bestVolume: null },
      chartPoints: [],
      recentSessions: [],
      summary: { best: 0, latest: 0, change: 0 }
    };
  }

  // 1. Process all sessions containing valid completed sets for exerciseId
  var processed = [];

  for (var i = 0; i < sessions.length; i++) {
    var s = sessions[i];
    if (!s) continue;

    var dateKey = s.dateKey || s.dayKey || (s.createdAt ? String(s.createdAt).slice(0, 10) : '');
    var sessionTime = s.timestampMs || (s.createdAt ? new Date(s.createdAt).getTime() : 0);
    if (!sessionTime && dateKey) {
      sessionTime = new Date(dateKey + 'T12:00:00').getTime();
    }

    var rawSets = [];
    if (Array.isArray(s.exercises)) {
      var found = s.exercises.find(function(ex) { return ex.id === exerciseId; });
      if (found && Array.isArray(found.sets)) rawSets = found.sets;
    } else if (s.workout && Array.isArray(s.workout[exerciseId])) {
      rawSets = s.workout[exerciseId];
    } else if (s.exerciseId === exerciseId && Array.isArray(s.sets)) {
      rawSets = s.sets;
    }

    var completed = [];
    for (var k = 0; k < rawSets.length; k++) {
      var st = rawSets[k];
      if (st && st.completed !== false && Number(st.weight) > 0 && Number(st.reps) > 0) {
        completed.push({
          weight: Number(st.weight),
          reps: Number(st.reps)
        });
      }
    }

    if (completed.length === 0) continue;

    // Top set: highest weight, tiebreak by reps
    var top = completed[0];
    var volume = 0;
    for (var c = 0; c < completed.length; c++) {
      var cur = completed[c];
      volume += cur.weight * cur.reps;
      if (c > 0) {
        if (cur.weight > top.weight || (cur.weight === top.weight && cur.reps > top.reps)) {
          top = cur;
        }
      }
    }

    var e1rm = calcE1RM(top.weight, top.reps);
    if (!e1rm || e1rm <= 0) e1rm = top.weight;

    processed.push({
      dateKey: dateKey,
      t: sessionTime,
      topSet: { weight: top.weight, reps: top.reps },
      volume: volume,
      e1rm: e1rm,
      allSets: completed
    });
  }

  if (processed.length === 0) {
    return {
      personalBests: { heaviest: null, bestE1RM: null, bestVolume: null },
      chartPoints: [],
      recentSessions: [],
      summary: { best: 0, latest: 0, change: 0 }
    };
  }

  // Sort chronological ascending
  processed.sort(function(a, b) { return a.t - b.t; });

  // 2. PR Detection (strict > all previous sessions)
  var maxPriorE1 = 0;
  for (var p = 0; p < processed.length; p++) {
    var sess = processed[p];
    if (sess.e1rm > maxPriorE1) {
      sess.isPR = true;
      maxPriorE1 = sess.e1rm;
    } else {
      sess.isPR = false;
    }
  }

  // 3. Personal Bests (All-Time)
  var heaviest = null;
  var bestE1RM = null;
  var bestVolume = null;

  for (var b = 0; b < processed.length; b++) {
    var item = processed[b];

    // Check heaviest set in this session
    for (var stIdx = 0; stIdx < item.allSets.length; stIdx++) {
      var setObj = item.allSets[stIdx];
      if (!heaviest || setObj.weight > heaviest.weight || (setObj.weight === heaviest.weight && setObj.reps > heaviest.reps)) {
        heaviest = { weight: setObj.weight, reps: setObj.reps, dateKey: item.dateKey };
      }
    }

    // Best 1RM
    if (!bestE1RM || item.e1rm > bestE1RM.value) {
      bestE1RM = { value: item.e1rm, dateKey: item.dateKey, set: item.topSet };
    }

    // Best Volume
    if (!bestVolume || item.volume > bestVolume.value) {
      bestVolume = { value: item.volume, dateKey: item.dateKey };
    }
  }

  // 4. Range Filtering for Chart & Summary
  var cutoff = 0;
  var dayMs = 86400000;
  if (range === '4w') {
    cutoff = nowMs - 28 * dayMs;
  } else if (range === '12w') {
    cutoff = nowMs - 84 * dayMs;
  }

  var filtered = processed.filter(function(sess) {
    return sess.t >= cutoff;
  });

  var chartPoints = [];
  for (var f = 0; f < filtered.length; f++) {
    var fSess = filtered[f];
    var val = fSess.e1rm;
    if (metric === 'topSet') val = fSess.topSet.weight;
    else if (metric === 'volume') val = fSess.volume;

    chartPoints.push({
      t: fSess.t,
      v: val,
      label: fSess.dateKey
    });
  }

  // 5. Summary metrics
  var summary = { best: 0, latest: 0, change: 0 };
  if (chartPoints.length > 0) {
    var latestVal = chartPoints[chartPoints.length - 1].v;
    var bestVal = chartPoints[0].v;
    for (var cp = 1; cp < chartPoints.length; cp++) {
      if (chartPoints[cp].v > bestVal) bestVal = chartPoints[cp].v;
    }
    var firstVal = chartPoints[0].v;
    summary = {
      latest: latestVal,
      best: bestVal,
      change: +(latestVal - firstVal).toFixed(1)
    };
  }

  // 6. Recent Sessions Feed (Newest first)
  var recentSessions = processed.slice().reverse().map(function(s) {
    return {
      dateKey: s.dateKey,
      topSet: s.topSet,
      volume: s.volume,
      e1rm: s.e1rm,
      isPR: s.isPR
    };
  });

  return {
    personalBests: {
      heaviest: heaviest,
      bestE1RM: bestE1RM,
      bestVolume: bestVolume
    },
    chartPoints: chartPoints,
    recentSessions: recentSessions,
    summary: summary
  };
}
