/* Progression comparison: session-over-session deltas and exercise stats comparison */

import { calcE1RM } from "./calc.js";
import { isBodyweightExercise } from "../screens/gym/sets.js";

export function compareExerciseSessions(previousSession, currentSets, plannedCount) {
  var prevSets = (previousSession && previousSession.sets)
    ? previousSession.sets.filter(function(s){ return s && !s.isWarmup && (Number(s.reps) > 0 || Number(s.weight) > 0); })
    : [];
  var currValid = (currentSets || []).map(function(s, idx){
    if (!s || s.isWarmup || (!Number(s.reps) && !Number(s.weight))) return null;
    return {
      index: idx,
      weight: Number(s.weight) || 0,
      reps: Number(s.reps) || 0,
      rir: (s.rir !== '' && s.rir != null) ? Number(s.rir) : null,
      isWarmup: !!s.isWarmup
    };
  });

  if (!previousSession || !prevSets.length) {
    var totalBaselineRows = Math.max(plannedCount || 2, currValid.length);
    var baselineRows = [];
    for (var bi = 0; bi < totalBaselineRows; bi++) {
      var bc = currValid[bi] || null;
      var bcValid = bc && (Number(bc.weight) > 0 || Number(bc.reps) > 0);
      var bct = bcValid ? (bc.weight + ' kg × ' + bc.reps + (bc.rir === 0 ? ' (F)' : (bc.rir != null ? ' (' + bc.rir + ' RIR)' : ''))) : '<span class="curr-pending">pending…</span>';
      baselineRows.push({
        setNum: bi + 1,
        prevText: '—',
        currText: bct,
        changeText: '—',
        changeClass: 'change-neutral',
        isCompleted: !!(bc && Number(bc.weight) > 0 && Number(bc.reps) > 0)
      });
    }
    return {
      hasPrevious: false,
      dateLabel: null,
      status: 'baseline',
      statusLabel: 'Baseline Session',
      statusClass: 'badge-baseline',
      rows: baselineRows,
      summaryText: 'First recorded session for this exercise. Future workouts will compare against today\'s numbers.'
    };
  }

  var totalRows = Math.max(plannedCount || 2, prevSets.length, currValid.length);
  var rows = [];
  var improvedCount = 0;
  var declinedCount = 0;
  var maintainedCount = 0;
  var completedComparisons = 0;

  for (var i = 0; i < totalRows; i++) {
    var p = prevSets[i] || null;
    var c = currValid[i] || null;

    var prevText = p ? (p.weight + ' kg × ' + p.reps + (p.rir === 0 ? ' (F)' : (p.rir != null ? ' (' + p.rir + ' RIR)' : ''))) : '—';
    var currText = c ? (c.weight + ' kg × ' + c.reps + (c.rir === 0 ? ' (F)' : (c.rir != null ? ' (' + c.rir + ' RIR)' : ''))) : '<span class="curr-pending">pending…</span>';
    var changeText = '—';
    var changeClass = 'change-neutral';

    if (p && c) {
      completedComparisons++;
      var loadDiff = +(c.weight - p.weight).toFixed(2);
      var repDiff = c.reps - p.reps;
      var rirDiff = (c.rir != null && p.rir != null) ? (c.rir - p.rir) : null;

      var parts = [];
      if (loadDiff !== 0) parts.push((loadDiff > 0 ? '+' : '') + loadDiff + ' kg');
      if (repDiff !== 0) parts.push((repDiff > 0 ? '+' : '') + repDiff + ' rep' + (Math.abs(repDiff) === 1 ? '' : 's'));

      if (parts.length > 0) {
        changeText = parts.join(', ');
        if (rirDiff != null && rirDiff !== 0 && loadDiff === 0) {
          changeText += ' (' + (rirDiff > 0 ? '+' : '') + rirDiff + ' RIR)';
        }
      } else {
        if (rirDiff != null && rirDiff !== 0) {
          changeText = 'Same (' + (rirDiff > 0 ? '+' : '') + rirDiff + ' RIR)';
        } else {
          changeText = 'No change';
        }
      }

      var isSetImproved = (loadDiff > 0 && repDiff >= 0) || (loadDiff >= 0 && repDiff > 0) || (loadDiff === 0 && repDiff === 0 && rirDiff != null && rirDiff > 0);
      var isSetDeclined = (loadDiff < 0 && repDiff <= 0) || (loadDiff <= 0 && repDiff < 0) || (loadDiff === 0 && repDiff === 0 && rirDiff != null && rirDiff < 0 && c.rir === 0);

      if (isSetImproved) {
        improvedCount++;
        changeClass = 'change-positive';
      } else if (isSetDeclined) {
        declinedCount++;
        changeClass = 'change-negative';
      } else {
        maintainedCount++;
        changeClass = 'change-neutral';
      }
    } else if (c && !p) {
      changeText = '+1 extra set';
      changeClass = 'change-positive';
      improvedCount++;
      completedComparisons++;
    }

    rows.push({
      setNum: i + 1,
      prevText: prevText,
      currText: currText,
      changeText: changeText,
      changeClass: changeClass,
      isCompleted: !!c
    });
  }

  var status = 'neutral';
  var statusLabel = 'In Progress';
  var statusClass = 'badge-maintained';

  if (completedComparisons === 0) {
    status = 'pending';
    statusLabel = 'Awaiting sets';
    statusClass = 'badge-maintained';
  } else if (improvedCount > 0 && declinedCount === 0) {
    status = 'improved';
    statusLabel = '↑ Improved' + (completedComparisons < prevSets.length ? ' (' + completedComparisons + '/' + prevSets.length + ')' : '');
    statusClass = 'badge-improved';
  } else if (declinedCount > 0 && improvedCount === 0) {
    status = 'declined';
    statusLabel = '↓ Declined' + (completedComparisons < prevSets.length ? ' (' + completedComparisons + '/' + prevSets.length + ')' : '');
    statusClass = 'badge-declined';
  } else if (maintainedCount > 0 && improvedCount === 0 && declinedCount === 0) {
    status = 'maintained';
    statusLabel = '→ Maintained' + (completedComparisons < prevSets.length ? ' (' + completedComparisons + '/' + prevSets.length + ')' : '');
    statusClass = 'badge-maintained';
  } else {
    status = 'inconclusive';
    statusLabel = 'Mixed (' + improvedCount + ' up, ' + declinedCount + ' down)';
    statusClass = 'badge-inconclusive';
  }

  return {
    hasPrevious: true,
    dayKey: previousSession.dayKey,
    dateLabel: previousSession.dateFormatted,
    status: status,
    statusLabel: statusLabel,
    statusClass: statusClass,
    completedComparisons: completedComparisons,
    totalExpected: prevSets.length,
    rows: rows
  };
}
