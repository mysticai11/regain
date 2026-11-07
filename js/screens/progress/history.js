/* Progress history: workout history bars, session PR badges, weight entries, and weekly digests */

import { profile } from "../../state.js";
import { getWorkoutSessions, dayRecord, saveDayRecord, sv } from "../../storage.js";
import { getExerciseData, isBodyweightExercise, getActiveProgram } from "../../data/plan.js";
import { calcE1RM, getTargetsForDate, getLoggedWeeklyVolume, getWeeklyVolume } from "../../lib/calc.js";
import { esc, todayKey } from "../../lib/format.js";
import { showToast } from "../../components/toast.js";
import { triggerHaptic } from "../../lib/dom.js";
import { getWorkoutForDate } from "../gym/helpers.js";

export function getResumeWorkoutCardHTML() {
  var todayRec = dayRecord(todayKey());
  if (!todayRec || todayRec.workoutDone || !todayRec.workout) return '';
  var todaySets = 0;
  Object.keys(todayRec.workout).forEach(function(id) {
    todaySets += (todayRec.workout[id] || []).filter(Boolean).length;
  });
  if (todaySets === 0) return '';

  var sched = getWorkoutForDate(todayKey());
  var prog = getActiveProgram();
  var session = (todayRec.selectedWorkout != null && prog && prog[todayRec.selectedWorkout])
    || (sched && sched.workoutIndex != null && prog && prog[sched.workoutIndex])
    || (todayRec.workoutSession)
    || (prog && prog[0]);
  var tName = (session && session.label) || 'Workout';
  var cleanTName = tName.replace(/^Day\s*\d+\s*[·•—–-]\s*/gi, '').trim() || tName;
  var totalPlanned = (session && session.exercises || []).reduce(function(tot, ex) {
    return tot + (ex.sets || 0);
  }, 0);
  var progressStr = totalPlanned > 0
    ? (todaySets + '/' + totalPlanned + ' sets')
    : (todaySets + (todaySets === 1 ? ' set' : ' sets'));

  return '<div style="background:#1C1C1F;border-radius:12px;padding:12px 16px;margin-bottom:16px;min-height:64px;display:flex;justify-content:space-between;align-items:center">'
    + '<div><div style="font-size:11px;font-weight:600;color:#8A8A8E;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:2px">In progress</div>'
    + '<div style="font-size:17px;font-weight:600;color:#F5F5F4">' + esc(cleanTName) + ' · ' + progressStr + '</div></div>'
    + '<button type="button" class="btn-text-action" id="resumeSessionBtn" onclick="if(window.renderApp){window.setTab?window.setTab(\'gym\'):(window.tab=\'gym\');window.renderApp();}" style="color:#F5F5F4;font-size:15px;font-weight:600;background:none;border:none;padding:0;cursor:pointer">Resume</button>'
    + '</div>';
}

export function workoutHistoryHTML() {
  var todayRec = dayRecord(todayKey());
  var sessions = getWorkoutSessions().filter(function(session) {
    if (session.dayKey === todayKey() && todayRec && !todayRec.workoutDone) return false;
    return (session.exercises || []).some(function(exercise) {
      return (exercise.sets || []).some(Boolean);
    });
  }).reverse();

  if (!sessions.length) return '<div class="t-micro" style="padding:16px 0;color:var(--text-secondary)">No completed workouts yet.</div>';

  // Group sessions into calendar weeks (Mon-Sun)
  var weekGroups = {};
  var weekOrder = [];
  sessions.forEach(function(session) {
    var d = session.dayKey ? new Date(session.dayKey + 'T00:00:00') : new Date();
    var dow = d.getDay();
    var diff = (dow === 0) ? 6 : dow - 1;
    var mon = new Date(d.getFullYear(), d.getMonth(), d.getDate() - diff);
    var wk = mon.getFullYear() + '-' + String(mon.getMonth()+1).padStart(2,'0') + '-' + String(mon.getDate()).padStart(2,'0');
    if (!weekGroups[wk]) { weekGroups[wk] = { weekStart: mon, sessions: [] }; weekOrder.push(wk); }
    weekGroups[wk].sessions.push(session);
  });

  var dayNames = ['SUN','MON','TUE','WED','THU','FRI','SAT'];
  var monthNames = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];

  var html = '<div>';

  weekOrder.forEach(function(wk, wkIdx) {
    var group = weekGroups[wk];
    var totalSetsInWeek = group.sessions.reduce(function(acc, s) {
      return acc + (s.exercises || []).reduce(function(a, ex) { return a + (ex.sets || []).filter(Boolean).length; }, 0);
    }, 0);
    var weekNum = wkIdx + 1;

    html += '<div style="font-size:11px;font-weight:600;color:#8A8A8E;text-transform:uppercase;letter-spacing:0.08em;margin:' + (wkIdx === 0 ? '4' : '24') + 'px 0 12px">WEEK ' + weekNum + ' · ' + group.sessions.length + (group.sessions.length === 1 ? ' SESSION' : ' SESSIONS') + ' · ' + totalSetsInWeek + ' SETS</div>';

    group.sessions.forEach(function(session, sIdx) {
      var allSessionIdx = sessions.indexOf(session);
      var exercises = session.exercises || [];
      var totalSets = exercises.reduce(function(count, ex) {
        return count + (ex.sets || []).filter(Boolean).length;
      }, 0);
      var totalVol = exercises.reduce(function(acc, ex) {
        return acc + (ex.sets || []).reduce(function(v, s) {
          return v + ((Number(s && s.weight) || 0) * (Number(s && s.reps) || 0));
        }, 0);
      }, 0);
      var dObj = session.dayKey ? new Date(session.dayKey + 'T00:00:00') : new Date();
      var dayLabel = dayNames[dObj.getDay()];
      var monLabel = monthNames[dObj.getMonth()];

      var storedMeta = session.dayKey ? (dayRecord(session.dayKey).workoutMetaBySession || {}) : {};
      var matchingMeta = storedMeta[String(session.programDay)] || Object.keys(storedMeta).map(function(k){ return storedMeta[k]; }).find(function(m){ return m && (m.duration_sec != null || m.durationMinutes != null); });
      var durationSec = session.duration_sec != null ? Number(session.duration_sec) : (matchingMeta && (matchingMeta.duration_sec != null ? Number(matchingMeta.duration_sec) : Number(matchingMeta.durationMinutes)*60));
      var durMin = (durationSec && !isNaN(durationSec)) ? Math.round(durationSec / 60) : null;
      var rawTitle = session.programLabel || session.sessionLabel || 'Workout';
      var cleanTitle = rawTitle.replace(/^Day\s*\d+\s*[·•—–-]\s*/gi, '').trim() || rawTitle;
      var baseStats = [totalSets + (totalSets === 1 ? ' set' : ' sets')];
      if (totalVol > 0) baseStats.push(Math.round(totalVol).toLocaleString() + ' kg');
      var baseStatsText = baseStats.join(' · ');
      var durText = (durMin && durMin > 0) ? (Math.min(durMin, 180) + ' min') : '';

      var exRows = exercises.map(function(exItem, exIdx) {
        var exData = getExerciseData(exItem.id) || { name: exItem.id };
        var sets = (exItem.sets || []).filter(Boolean), isBW = isBodyweightExercise(exItem.id, exData.name);

        var prevExSets = null;
        for (var pIdx = allSessionIdx + 1; pIdx < sessions.length; pIdx++) {
          var pe = (sessions[pIdx].exercises || []).find(function(e) { return e.id === exItem.id; });
          if (pe && (pe.sets || []).some(Boolean)) { prevExSets = (pe.sets || []).filter(Boolean); break; }
        }

        var progressTagHTML = '';
        if (prevExSets && prevExSets.length > 0 && sets.length > 0) {
          if (isBW) {
            var curBestR = sets.reduce(function(m, s) { return Math.max(m, Number(s.reps) || 0); }, 0);
            var prevBestR = prevExSets.reduce(function(m, s) { return Math.max(m, Number(s.reps) || 0); }, 0);
            var dR = curBestR - prevBestR;
            if (dR > 0) progressTagHTML = '<span style="display:inline-flex;align-items:center;padding:2px 6px;border-radius:6px;background:rgba(198,244,50,0.12);color:var(--lime);font-size:11px;font-weight:600;font-variant-numeric:tabular-nums">+' + dR + (dR === 1 ? ' rep' : ' reps') + '</span>';
          } else {
            var curTopW = sets.reduce(function(m, s) { return Math.max(m, Number(s.weight) || 0); }, 0);
            var prevTopW = prevExSets.reduce(function(m, s) { return Math.max(m, Number(s.weight) || 0); }, 0);
            var dW = curTopW - prevTopW;
            if (dW > 0) {
              progressTagHTML = '<span style="display:inline-flex;align-items:center;padding:2px 6px;border-radius:6px;background:rgba(198,244,50,0.12);color:var(--lime);font-size:11px;font-weight:600;font-variant-numeric:tabular-nums">+' + (dW % 1 === 0 ? dW : dW.toFixed(1)) + ' kg</span>';
            } else if (dW === 0 && curTopW > 0) {
              var curTopR = sets.filter(function(s) { return Number(s.weight) === curTopW; }).reduce(function(m, s) { return Math.max(m, Number(s.reps) || 0); }, 0);
              var prevTopR = prevExSets.filter(function(s) { return Number(s.weight) === prevTopW; }).reduce(function(m, s) { return Math.max(m, Number(s.reps) || 0); }, 0);
              var dTopR = curTopR - prevTopR;
              if (dTopR > 0) progressTagHTML = '<span style="display:inline-flex;align-items:center;padding:2px 6px;border-radius:6px;background:rgba(198,244,50,0.12);color:var(--lime);font-size:11px;font-weight:600;font-variant-numeric:tabular-nums">+' + dTopR + (dTopR === 1 ? ' rep' : ' reps') + '</span>';
            }
          }
        }

        var isPrInSession = false, priorSets = [];
        for (var p = sIdx + 1; p < group.sessions.length; p++) {
          var pEx = (group.sessions[p].exercises || []).find(function(e){ return e.id === exItem.id; });
          if (pEx && pEx.sets) pEx.sets.filter(Boolean).forEach(function(s){ priorSets.push(s); });
        }
        for (var pw = wkIdx + 1; pw < weekOrder.length; pw++) {
          weekGroups[weekOrder[pw]].sessions.forEach(function(ps) {
            var pEx = (ps.exercises || []).find(function(e){ return e.id === exItem.id; });
            if (pEx && pEx.sets) pEx.sets.filter(Boolean).forEach(function(s){ priorSets.push(s); });
          });
        }
        if (priorSets.length > 0) {
          if (isBW) {
            var maxReps = sets.reduce(function(m, s){ return Math.max(m, Number(s.reps) || 0); }, 0);
            var prevBestReps = priorSets.reduce(function(m, s){ return Math.max(m, Number(s.reps) || 0); }, 0);
            if (prevBestReps > 0 && maxReps > prevBestReps) isPrInSession = true;
          } else {
            var maxE1 = sets.reduce(function(m, s){ return Math.max(m, calcE1RM(s.weight, s.reps)); }, 0);
            var prevBestE1 = priorSets.reduce(function(m, s){ return Math.max(m, calcE1RM(s.weight, s.reps)); }, 0);
            if (prevBestE1 > 0 && maxE1 > prevBestE1 + 0.1) isPrInSession = true;
          }
        }

        var exVol = sets.reduce(function(acc, s) { return acc + ((Number(s.weight) || 0) * (Number(s.reps) || 0)); }, 0);
        var volStr = exVol > 0 ? (' · ' + (exVol % 1 === 0 ? exVol : parseFloat(exVol.toFixed(1))) + ' kg') : '';
        var summaryText = sets.length + (sets.length === 1 ? ' set' : ' sets') + volStr;
        var tableHeaderHTML = '<div class="history-set-table-head" style="display:grid;grid-template-columns:36px 1fr 1fr 48px;align-items:center;padding-bottom:4px;margin-bottom:2px;font-size:11px;font-weight:600;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.08em">'
          + '<span>Set</span><span style="text-align:right">kg</span><span style="text-align:right">Reps</span><span style="text-align:right">RIR</span></div>';
        var setRowsHTML = sets.map(function(s, sIdx2) {
          var wNum = Number(s.weight) || 0;
          var wClean = wNum % 1 === 0 ? String(wNum) : String(parseFloat(wNum.toFixed(2)));
          var wDisp = isBW ? ((!s.weight || wNum === 0) ? 'BW' : ('BW + ' + wClean)) : wClean;
          var rVal = Number(s.reps) || 0;
          var rirVal = (s.rir === 0 || s.rir === '0') ? 'F' : ((s.rir != null && s.rir !== '') ? (Number(s.rir) >= 4 ? '+' : String(s.rir)) : null);
          var rirCell = rirVal != null
            ? ('<span class="hist-rir-badge" style="display:inline-flex;align-items:center;justify-content:center;padding:2px 6px;min-width:18px;border-radius:4px;background:var(--surface-raised);font-size:11px;font-weight:600;color:' + (rirVal === 'F' ? 'var(--lime)' : 'var(--text-secondary)') + '">' + esc(rirVal) + '</span>')
            : '<span style="color:var(--text-tertiary);font-size:15px;line-height:1">–</span>';
          return '<div class="history-set-row" data-quick-edit-set="1" data-session-id="' + esc(session.id) + '" data-ex-id="' + esc(exItem.id) + '" data-ex-name="' + esc(exData.name) + '" data-set-idx="' + sIdx2 + '" data-weight="' + (s.weight || 0) + '" data-reps="' + (s.reps || 0) + '" data-rir="' + (s.rir == null ? '' : s.rir) + '" style="display:grid;grid-template-columns:36px 1fr 1fr 48px;align-items:center;min-height:40px;height:42px;cursor:pointer">'
            + '<span style="font-size:15px;color:var(--text-secondary);font-variant-numeric:tabular-nums">' + (sIdx2 + 1) + '</span>'
            + '<span style="font-size:15px;font-weight:600;color:var(--text);font-variant-numeric:tabular-nums;text-align:right">' + esc(wDisp) + '</span>'
            + '<span style="font-size:15px;font-weight:600;color:var(--text);font-variant-numeric:tabular-nums;text-align:right">' + rVal + '</span>'
            + '<div style="display:flex;justify-content:flex-end;align-items:center">' + rirCell + '</div></div>';
        }).join('');
        var isLast = exIdx === exercises.length - 1;
        return '<div style="padding:14px 0;' + (isLast ? '' : 'border-bottom:1px solid var(--hairline)') + '">'
          + '<div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px;margin-bottom:8px">'
            + '<div style="display:flex;align-items:center;gap:8px;min-width:0;flex:1 1 auto;overflow:hidden">'
              + '<span style="font-size:15px;font-weight:600;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(exData.name) + '</span>'
              + progressTagHTML
              + (isPrInSession ? '<span style="display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:600;color:#C6F432;letter-spacing:0.08em;text-transform:uppercase;flex-shrink:0"><span style="width:5px;height:5px;border-radius:50%;background:#C6F432;display:inline-block"></span>PR</span>' : '')
            + '</div>'
            + '<span style="font-size:11px;color:var(--text-secondary);white-space:nowrap;flex-shrink:0">' + esc(summaryText) + '</span>'
          + '</div>'
          + tableHeaderHTML + '<div class="history-set-rows-wrap">' + setRowsHTML + '</div></div>';
      }).join('');

      var chevronSVG = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>';
      var isFirstInWeek = (sIdx === 0 && wkIdx === 0);

      html += '<details class="history-session-details" ' + (isFirstInWeek ? 'open' : '') + ' style="margin-bottom:12px;background:#141416;border-radius:16px;overflow:hidden">'
        + '<summary class="history-session-header" style="min-height:64px;height:auto;padding:10px 12px;display:flex;align-items:center;cursor:pointer;list-style:none;user-select:none;box-sizing:border-box;gap:10px">'
          + '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;flex-shrink:0;width:44px;text-align:center">'
            + '<div style="font-size:11px;font-weight:600;color:#8A8A8E;line-height:1.1;letter-spacing:0.04em;text-transform:uppercase">' + esc(dayLabel) + '</div>'
            + '<div style="font-size:28px;font-weight:600;color:#F5F5F4;line-height:1;font-variant-numeric:tabular-nums;margin:1px 0">' + String(dObj.getDate()) + '</div>'
            + '<div style="font-size:11px;font-weight:600;color:#8A8A8E;line-height:1.1;letter-spacing:0.04em;text-transform:uppercase">' + esc(monLabel) + '</div>'
          + '</div>'
          + '<div style="flex:1;min-width:0;overflow:hidden">'
            + '<div style="font-size:17px;font-weight:600;color:#F5F5F4;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(cleanTitle) + '</div>'
            + '<div class="history-card-subline" style="font-size:15px;color:#8A8A8E;margin-top:2px;font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden;text-overflow:ellipsis"><span>' + esc(baseStatsText) + '</span>' + (durText ? '<span class="hist-dur-part"> · ' + esc(durText) + '</span>' : '') + '</div>'
          + '</div>'
          + '<div style="display:flex;align-items:center;flex-shrink:0">'
            + '<span class="history-chevron" style="display:inline-flex;align-items:center;justify-content:center;width:44px;min-height:48px;color:#8A8A8E;transition:transform 0.2s ease">' + chevronSVG + '</span>'
            + '<button type="button" class="btn-ghost history-menu-btn" data-session-menu="' + esc(session.id) + '" style="background:none;border:none;font-size:17px;line-height:1;padding:0;color:#8A8A8E;cursor:pointer;width:44px;min-height:48px;display:inline-flex;align-items:center;justify-content:center" aria-label="Session options">···</button>'
          + '</div>'
        + '</summary>'
        + '<div class="history-session-body" style="padding:0 16px 12px;border-top:1px solid #1C1C1F">' + exRows + '</div>'
        + '</details>';
    });
  });

  html += '</div>';
  return html;
}

export function weightEntriesHTML(entries) {
  if (!entries || !entries.length) return '<div style="padding:16px 0;font-size:15px;color:#8A8A8E;text-align:center">No weight entries logged yet</div>';
  var rows = entries.slice().reverse().map(function(e) {
    var d = new Date(e.createdAt || (e.dayKey + 'T12:00:00'));
    var dateLabel = !isNaN(d.getTime()) ? d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) : (e.dayKey || '');
    var timeLabel = (e.createdAt && e.createdAt.includes('T')) ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
    var dateDisplay = dateLabel + (timeLabel ? ' · ' + timeLabel : '');
    var wNum = Number(e.weight);
    var wStr = !isNaN(wNum) ? wNum.toFixed(1) : String(e.weight);
    return '<div class="list-row" style="display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid #222222">'
      + '<div><div class="tabnum" style="font-size:17px;font-weight:600;color:#F5F5F4;line-height:1.2">' + wStr + ' <span style="font-size:15px;color:#8A8A8E;font-weight:400">kg</span></div>'
      + '<div style="font-size:11px;color:#8A8A8E;letter-spacing:0.04em;text-transform:uppercase;margin-top:2px">' + esc(dateDisplay) + '</div></div>'
      + '<div style="display:flex;align-items:center;gap:16px">'
        + '<button type="button" class="btn-text-action" data-edit-weight="' + esc(e.id) + '" style="color:#8A8A8E;font-size:15px;background:none;border:none;padding:8px 0;cursor:pointer">Edit</button>'
        + '<button type="button" class="btn-text-action" data-delete-weight="' + esc(e.id) + '" style="color:#FF4D4F;font-size:15px;background:none;border:none;padding:8px 0;cursor:pointer">Delete</button>'
      + '</div></div>';
  }).join('');
  return '<div style="margin-top:24px"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">'
    + '<span class="t-label">Weight logs</span><span class="t-micro tabnum" style="color:var(--text-secondary)">' + entries.length + (entries.length === 1 ? ' entry' : ' entries') + '</span></div>'
    + '<div style="max-height:360px;overflow-y:auto;padding-right:2px">' + rows + '</div></div>';
}

export function editWeightEntry(id) {
  var entries = (profile && Array.isArray(profile.weightEntries)) ? profile.weightEntries : [];
  var entry = entries.find(function(e){ return String(e.id) === String(id); });
  var curW = entry ? entry.weight : null;
  var dKey = (entry && entry.dayKey) || (typeof id === 'string' && id.startsWith('legacy_') ? id.replace('legacy_', '') : null);
  if (!curW && dKey) curW = (dayRecord(dKey) || {}).weight;
  if (curW == null) return;
  var val = prompt('Bodyweight in kg', curW); if (val === null) return;
  var w = parseFloat(val); if (!w || isNaN(w) || w < 20 || w > 300) { showToast('Enter a valid weight', 'warn'); return; }
  if (entry) { entry.weight = w; }
  else if (dKey) { profile.weightEntries = profile.weightEntries || []; profile.weightEntries.push({ id: id, dayKey: dKey, weight: w, createdAt: dKey + 'T12:00:00' }); }
  if (dKey) { var rec = dayRecord(dKey); rec.weight = w; saveDayRecord(dKey, rec); }
  sv('rg_profile', profile); triggerHaptic(); showToast('Weight updated', 'ok');
  if (typeof window.renderProgressSimple === 'function') window.renderProgressSimple();
}

export function deleteWeightEntry(id) {
  if (!confirm('Delete this weight entry?')) return;
  var entries = (profile && profile.weightEntries) || [];
  var target = entries.find(function(e){ return String(e.id) === String(id); });
  profile.weightEntries = entries.filter(function(e){ return String(e.id) !== String(id); });
  var dKey = (target && target.dayKey) || (typeof id === 'string' && id.startsWith('legacy_') ? id.replace('legacy_', '') : null);
  if (dKey) {
    var sameDay = profile.weightEntries.filter(function(e){ return e.dayKey === dKey; }).sort(function(a,b){ return String(a.createdAt).localeCompare(String(b.createdAt)); });
    var rec = dayRecord(dKey); rec.weight = sameDay.length ? sameDay[sameDay.length - 1].weight : null; saveDayRecord(dKey, rec);
  }
  sv('rg_profile', profile); triggerHaptic(); showToast('Weight log deleted', 'ok');
  if (typeof window.renderProgressSimple === 'function') window.renderProgressSimple();
}

export function weeklyVolumeChart() {
  var logged = getLoggedWeeklyVolume(), planned = getWeeklyVolume(), plannedByMuscle = {};
  planned.forEach(function(v){ plannedByMuscle[v.muscle] = v.sets; });
  var targetFloor = 10;
  var items = logged.map(function(v) {
    var target = plannedByMuscle[v.muscle] || targetFloor;
    return { muscle: v.muscle, sets: v.sets, target: target, pct: Math.min(100, Math.round(v.sets / target * 100)), isDone: v.sets >= target };
  });
  items.sort(function(a, b) { return a.isDone !== b.isDone ? (a.isDone ? 1 : -1) : (a.sets / a.target) - (b.sets / b.target); });
  var rows = items.map(function(v, i) {
    return '<div style="padding:12px 16px;' + (i > 0 ? 'border-top:1px solid var(--hairline);' : '') + '">'
      + '<div style="display:flex;justify-content:space-between;align-items:center;font-size:15px;font-weight:600;margin-bottom:6px">'
        + '<span style="color:var(--text);letter-spacing:0.02em">' + esc(v.muscle) + '</span>'
        + '<span class="tabnum" style="color:' + (v.isDone ? 'var(--lime)' : 'var(--text-secondary)') + '">' + v.sets + ' / ' + v.target + '</span>'
      + '</div>'
      + '<div style="height:6px;background:var(--hairline);border-radius:9999px;overflow:hidden">'
        + '<div style="height:100%;border-radius:9999px;background:' + (v.isDone ? 'var(--lime)' : 'var(--text-secondary)') + ';width:' + v.pct + '%"></div>'
      + '</div>'
      + '</div>';
  }).join('');
  return '<div style="background:var(--surface);border:1px solid var(--hairline);border-radius:16px;overflow:hidden">' + rows + '</div>';
}

export function nutritionProgressHTML(records) {
  var letters = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  var today = new Date();
  var daysAgo6 = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6);

  var dayHits = [];
  var calHits = 0;
  var protHits = 0;

  for (var i = 0; i < 7; i++) {
    var curD = new Date(daysAgo6.getFullYear(), daysAgo6.getMonth(), daysAgo6.getDate() + i);
    var dKey = curD.toISOString().slice(0, 10);
    var dDay = curD.getDay();
    var letter = letters[(dDay + 6) % 7];
    var targets = getTargetsForDate(dKey);
    var totals = records.find(function(r) { return r.key === dKey; }) || { kcal: 0, protein: 0 };

    var calHit = (totals.kcal >= targets.kcal * 0.9);
    var protHit = (totals.protein >= targets.protein * 0.9);
    if (calHit) calHits++;
    if (protHit) protHits++;

    dayHits.push({
      key: dKey,
      letter: letter,
      calHit: calHit,
      protHit: protHit,
      isToday: (dKey === todayKey())
    });
  }

  var dotCells = dayHits.map(function(dh) {
    var calDot = dh.calHit
      ? '<span style="width:8px;height:8px;border-radius:50%;background:#C6F432;display:inline-block"></span>'
      : '<span style="width:8px;height:8px;border-radius:50%;border:1px solid #55555A;background:transparent;box-sizing:border-box;display:inline-block"></span>';
    var protDot = dh.protHit
      ? '<span style="width:8px;height:8px;border-radius:2px;background:#F5F5F4;display:inline-block"></span>'
      : '<span style="width:8px;height:8px;border-radius:2px;border:1px solid #55555A;background:transparent;box-sizing:border-box;display:inline-block"></span>';

    return '<div style="display:flex;flex-direction:column;align-items:center;gap:6px;flex:1">'
      + '<span style="font-size:11px;font-weight:600;color:' + (dh.isToday ? '#F5F5F4' : '#8A8A8E') + '">' + dh.letter + '</span>'
      + calDot
      + protDot
      + '</div>';
  }).join('');

  var recent = records.slice(-7), days = recent.filter(function(r){ return r.kcal > 0; });
  var target = 0, proteinTarget = 0;
  if (days.length) {
    var totalTargetKcal = 0, totalTargetProt = 0;
    days.forEach(function(r) {
      var dt = getTargetsForDate(r.key || todayKey());
      totalTargetKcal += dt.kcal;
      totalTargetProt += dt.protein;
    });
    target = Math.round(totalTargetKcal / days.length);
    proteinTarget = Math.round(totalTargetProt / days.length);
  } else {
    var dt = getTargetsForDate(todayKey());
    target = dt.kcal;
    proteinTarget = dt.protein;
  }
  var kcal = days.length ? Math.round(days.reduce(function(sum,r){ return sum + r.kcal; }, 0) / days.length) : 0;
  var protein = days.length ? Math.round(days.reduce(function(sum,r){ return sum + r.protein; }, 0) / days.length) : 0;
  var kcalPct = Math.min(100, Math.round(kcal / Math.max(1, target) * 100));
  var protPct = Math.min(100, Math.round(protein / Math.max(1, proteinTarget) * 100));

  return '<div style="margin-top:8px">'
    + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">'
      + '<span style="font-size:11px;font-weight:600;color:#8A8A8E;letter-spacing:0.08em;text-transform:uppercase">7-Day Hit Rate</span>'
      + '<span class="tabnum" style="font-size:11px;color:#8A8A8E">' + calHits + '/7 kcal · ' + protHits + '/7 protein</span>'
    + '</div>'
    + '<div style="display:flex;align-items:center;gap:12px;font-size:11px;color:#8A8A8E;margin-bottom:10px">'
      + '<span style="display:inline-flex;align-items:center;gap:6px"><span style="width:8px;height:8px;border-radius:50%;background:#C6F432;display:inline-block"></span> kcal</span>'
      + '<span style="display:inline-flex;align-items:center;gap:6px"><span style="width:8px;height:8px;border-radius:2px;background:#F5F5F4;display:inline-block"></span> protein</span>'
    + '</div>'
    + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;padding:0 4px">' + dotCells + '</div>'
    + '<div style="border-top:1px solid #1C1C1F;padding-top:12px">'
      + '<div class="list-row" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">'
        + '<span style="font-size:15px;color:#F5F5F4">Avg calories</span>'
        + '<span class="tabnum" style="font-size:15px;color:#8A8A8E"><span id="progAvgKcalNum" data-value="' + kcal + '">' + kcal.toLocaleString() + '</span> / ' + target.toLocaleString() + ' kcal</span>'
      + '</div>'
      + '<div class="prog-line" style="height:6px;border-radius:3px;background:#222;margin-bottom:12px;overflow:hidden"><div class="prog-line-fill" style="transform:scaleX(' + (kcalPct / 100) + ');height:100%;border-radius:3px;background:#F5F5F4"></div></div>'
      + '<div class="list-row" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">'
        + '<span style="font-size:15px;color:#F5F5F4">Avg protein</span>'
        + '<span class="tabnum" style="font-size:15px;color:#8A8A8E"><span id="progAvgProtNum" data-value="' + protein + '">' + protein + '</span> g / ' + proteinTarget + ' g</span>'
      + '</div>'
      + '<div class="prog-line" style="height:6px;border-radius:3px;background:#222;overflow:hidden"><div class="prog-line-fill" style="transform:scaleX(' + (protPct / 100) + ');height:100%;border-radius:3px;background:#F5F5F4"></div></div>'
    + '</div>'
    + '</div>';
}

export function buildWeeklyDigestHTML() { return ''; }
