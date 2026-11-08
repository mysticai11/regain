/* Progress history: workout history bars, session PR badges, weight entries, and weekly digests */

import { profile } from "../../state.js";
import { getWorkoutSessions, dayRecord, saveDayRecord, sv } from "../../storage.js";
import { getExerciseData, isBodyweightExercise, getActiveProgram } from "../../data/plan.js";
import { calcE1RM, getTargetsForDate, getLoggedWeeklyVolume, getWeeklyVolume } from "../../lib/calc.js";
import { esc, todayKey } from "../../lib/format.js";
import { showToast } from "../../components/toast.js";
import { triggerHaptic } from "../../lib/dom.js";
import { confirmDialog, promptDialog } from "../../components/dialog.js";
import { getWorkoutForDate } from "../gym/helpers.js";
import { buildNutritionBarChartHTML } from "../../ui/barChart.js?v=24";

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
    var weeklyVol = group.sessions.reduce(function(acc, s) {
      return acc + (s.exercises || []).reduce(function(a, ex) {
        return a + (ex.sets || []).reduce(function(v, st) {
          return v + ((Number(st && st.weight) || 0) * (Number(st && st.reps) || 0));
        }, 0);
      }, 0);
    }, 0);
    var weekNum = wkIdx + 1;

    html += '<div style="margin:' + (wkIdx === 0 ? '4' : '20') + 'px 0 12px">'
      + '<div style="font-size:11px;font-weight:700;color:var(--text-secondary);letter-spacing:0.08em;text-transform:uppercase;margin-bottom:8px">WEEK ' + weekNum + '</div>'
      + '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">'
        + '<span style="background:var(--surface2);border:1px solid var(--hairline);padding:4px 10px;border-radius:9999px;font-size:12px;font-weight:600;color:var(--text);font-variant-numeric:tabular-nums">' + group.sessions.length + (group.sessions.length === 1 ? ' session' : ' sessions') + '</span>'
        + '<span style="background:var(--surface2);border:1px solid var(--hairline);padding:4px 10px;border-radius:9999px;font-size:12px;font-weight:600;color:var(--text);font-variant-numeric:tabular-nums">' + totalSetsInWeek + ' sets</span>'
        + (weeklyVol > 0 ? ('<span style="background:var(--surface2);border:1px solid var(--hairline);padding:4px 10px;border-radius:9999px;font-size:12px;font-weight:600;color:var(--text);font-variant-numeric:tabular-nums">' + Math.round(weeklyVol).toLocaleString() + ' kg vol</span>') : '')
      + '</div>'
    + '</div>';

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
            if (dR > 0) progressTagHTML = '<span style="display:inline-flex;align-items:center;padding:2px 6px;border-radius:6px;background:rgba(139,92,246,0.15);color:var(--accent-primary);font-size:11px;font-weight:600;font-variant-numeric:tabular-nums">+' + dR + (dR === 1 ? ' rep' : ' reps') + '</span>';
          } else {
            var curTopW = sets.reduce(function(m, s) { return Math.max(m, Number(s.weight) || 0); }, 0);
            var prevTopW = prevExSets.reduce(function(m, s) { return Math.max(m, Number(s.weight) || 0); }, 0);
            var dW = curTopW - prevTopW;
            if (dW > 0) {
              progressTagHTML = '<span style="display:inline-flex;align-items:center;padding:2px 6px;border-radius:6px;background:rgba(139,92,246,0.15);color:var(--accent-primary);font-size:11px;font-weight:600;font-variant-numeric:tabular-nums">+' + (dW % 1 === 0 ? dW : dW.toFixed(1)) + ' kg</span>';
            } else if (dW === 0 && curTopW > 0) {
              var curTopR = sets.filter(function(s) { return Number(s.weight) === curTopW; }).reduce(function(m, s) { return Math.max(m, Number(s.reps) || 0); }, 0);
              var prevTopR = prevExSets.filter(function(s) { return Number(s.weight) === prevTopW; }).reduce(function(m, s) { return Math.max(m, Number(s.reps) || 0); }, 0);
              var dTopR = curTopR - prevTopR;
              if (dTopR > 0) progressTagHTML = '<span style="display:inline-flex;align-items:center;padding:2px 6px;border-radius:6px;background:rgba(139,92,246,0.15);color:var(--accent-primary);font-size:11px;font-weight:600;font-variant-numeric:tabular-nums">+' + dTopR + (dTopR === 1 ? ' rep' : ' reps') + '</span>';
            }
          }
        }

        var isPrInSession = false, priorSets = [];
        for (var p = sIdx + 1; p < group.sessions.length; p++) {
          (group.sessions[p].exercises || []).forEach(function(e){ if (e.id === exItem.id && e.sets) e.sets.filter(Boolean).forEach(function(s){ priorSets.push(s); }); });
        }
        for (var pw = wkIdx + 1; pw < weekOrder.length; pw++) {
          weekGroups[weekOrder[pw]].sessions.forEach(function(ps) {
            (ps.exercises || []).forEach(function(e){ if (e.id === exItem.id && e.sets) e.sets.filter(Boolean).forEach(function(s){ priorSets.push(s); }); });
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
        var tableHeaderHTML = '<div class="history-set-table-head" style="display:grid;grid-template-columns:40px 1fr 1fr 40px;align-items:center;padding:4px 0;margin-bottom:2px;font-size:11px;font-weight:600;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.08em">'
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
          return '<div class="history-set-row" data-quick-edit-set="1" data-session-id="' + esc(session.id) + '" data-ex-id="' + esc(exItem.id) + '" data-ex-name="' + esc(exData.name) + '" data-set-idx="' + sIdx2 + '" data-weight="' + (s.weight || 0) + '" data-reps="' + (s.reps || 0) + '" data-rir="' + (s.rir == null ? '' : s.rir) + '" style="display:grid;grid-template-columns:40px 1fr 1fr 40px;align-items:center;min-height:38px;height:40px;cursor:pointer">'
            + '<span style="font-size:15px;color:var(--text-secondary);font-variant-numeric:tabular-nums">' + (sIdx2 + 1) + '</span>'
            + '<span style="font-size:15px;font-weight:600;color:var(--text);font-variant-numeric:tabular-nums;text-align:right">' + esc(wDisp) + '</span>'
            + '<span style="font-size:15px;font-weight:600;color:var(--text);font-variant-numeric:tabular-nums;text-align:right">' + rVal + '</span>'
            + '<div style="display:flex;justify-content:flex-end;align-items:center">' + rirCell + '</div></div>';
        }).join('');
        var isLast = exIdx === exercises.length - 1;
        return '<div style="padding:12px 0;' + (isLast ? '' : 'border-bottom:1px solid var(--hairline)') + '">'
          + '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:8px">'
            + '<div style="display:flex;align-items:flex-start;gap:8px;min-width:0;flex:1">'
              + '<span class="history-ex-num" style="display:inline-block;width:24px;min-width:24px;flex-shrink:0;font-size:15px;color:var(--text-secondary);font-variant-numeric:tabular-nums;margin-top:1px">' + (exIdx + 1) + '</span>'
              + '<div style="min-width:0;flex:1">'
                + '<div class="history-ex-name" style="font-size:15px;font-weight:600;color:var(--text);line-height:1.25;word-break:break-word;background:transparent">' + esc(exData.name) + '</div>'
                + ((progressTagHTML || isPrInSession) ? ('<div style="display:flex;align-items:center;gap:6px;margin-top:4px">' + progressTagHTML + (isPrInSession ? '<span class="set-pr-badge" style="position:static;display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:700;color:var(--accent-pink);background:rgba(236,72,153,0.15);padding:1px 6px;border-radius:4px;letter-spacing:0.06em;text-transform:uppercase">PR<!-- border-radius:50%;background:#C6F432;display:inline-block"></span>PR --></span>' : '') + '</div>') : '')
              + '</div>'
            + '</div>'
            + '<span style="font-size:11px;color:var(--text-secondary);white-space:nowrap;flex-shrink:0;margin-top:2px">' + esc(summaryText) + '</span>'
          + '</div>'
          + tableHeaderHTML + '<div class="history-set-rows-wrap">' + setRowsHTML + '</div></div>';
      }).join('');

      var chevronSVG = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>';
      var isFirstInWeek = (sIdx === 0 && wkIdx === 0);
      var durPart = durText ? ('<span class="hist-dur-part" style="background:var(--surface2);border:1px solid var(--hairline);padding:3px 8px;border-radius:6px;font-size:11px;font-weight:600;color:var(--text);font-variant-numeric:tabular-nums">' + esc(durText) + '</span>') : '';
      var setsPill = '<span style="background:var(--surface2);border:1px solid var(--hairline);padding:3px 8px;border-radius:6px;font-size:11px;font-weight:600;color:var(--text);font-variant-numeric:tabular-nums">' + totalSets + (totalSets === 1 ? ' set' : ' sets') + '</span>';
      var volPill = totalVol > 0 ? ('<span style="background:var(--surface2);border:1px solid var(--hairline);padding:3px 8px;border-radius:6px;font-size:11px;font-weight:600;color:var(--text);font-variant-numeric:tabular-nums">' + Math.round(totalVol).toLocaleString() + ' kg vol</span>') : '';
      var pillsHTML = '<div class="history-card-subline" style="display:flex;align-items:center;gap:6px;margin-top:6px;flex-wrap:wrap;white-space:nowrap">'
        + setsPill + volPill + durPart
        + '<span style="display:none">' + esc(baseStatsText) + '</span>'
      + '</div>';

      html += '<div class="history-session-card-wrap metric-card" style="position:relative;margin-bottom:24px;padding-left:26px">'
        + '<span class="history-timeline-line" style="position:absolute;left:7px;top:0;bottom:-24px;width:2px;background:var(--hairline);z-index:1"></span>'
        + '<span class="history-timeline-dot" style="position:absolute;left:2px;top:24px;width:12px;height:12px;border-radius:50%;background:var(--accent-primary);box-shadow:var(--dot-glow-primary, 0 0 8px var(--accent-primary));display:inline-block;z-index:2"></span>'
        + '<details class="history-session-details" ' + (isFirstInWeek ? 'open' : '') + ' style="margin-bottom:0;background:#141416;border:1px solid var(--hairline);border-radius:12px;box-shadow:var(--card-shadow, 0 4px 16px rgba(0,0,0,0.3));overflow:hidden">'
        + '<summary class="history-session-header" style="min-height:64px;height:auto;padding:14px 16px;display:flex;align-items:flex-start;justify-content:space-between;gap:8px;cursor:pointer;list-style:none;user-select:none;box-sizing:border-box;background:#141416;border-radius:12px">'
          + '<div style="flex:1;min-width:0;padding-right:12px">'
            + '<div style="font-size:11px;font-weight:700;color:var(--text-secondary);letter-spacing:0.08em;text-transform:uppercase;margin-bottom:4px">' + esc(dayLabel) + ' ' + dObj.getDate() + ' ' + esc(monLabel) + '</div>'
            + '<div class="history-session-title" style="font-size:17px;font-weight:700;color:var(--text);line-height:1.25;margin-bottom:8px;word-break:break-word;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">' + esc(cleanTitle) + '</div>'
            + pillsHTML
          + '</div>'
          + '<div style="display:flex;align-items:center;gap:4px;flex-shrink:0;margin-top:2px">'
            + '<span class="history-chevron" style="display:inline-flex;align-items:center;justify-content:center;width:44px;min-height:44px;color:var(--text-secondary);transition:transform 0.2s ease">' + chevronSVG + '</span>'
          + '</div>'
        + '</summary>'
        + '<div class="history-session-body" style="padding:0 16px 14px;border-top:1px solid var(--hairline)">' + exRows + '</div>'
        + '</details>'
        + '<button type="button" class="btn-ghost history-menu-btn" data-session-menu="' + esc(session.id) + '" style="position:absolute;top:10px;right:44px;background:none;border:none;font-size:17px;line-height:1;padding:0;color:var(--text-secondary);cursor:pointer;width:32px;height:32px;display:inline-flex;align-items:center;justify-content:center;z-index:2" aria-label="Session options">···</button>'
        + '</div>';
    });
  });

  html += '</div>';
  return html;
}

export { weightEntriesHTML, editWeightEntry, deleteWeightEntry } from "./body.js";
export { weeklyVolumeChart } from "./lifts.js";

export function getNutritionBarChartInner(records) {
  var letters = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  var today = new Date();
  var daysAgo6 = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6);
  var dayHits = [];
  var calHits = 0, protHits = 0;
  for (var i = 0; i < 7; i++) {
    var curD = new Date(daysAgo6.getFullYear(), daysAgo6.getMonth(), daysAgo6.getDate() + i);
    var y = curD.getFullYear(), m = String(curD.getMonth() + 1).padStart(2, '0'), d = String(curD.getDate()).padStart(2, '0');
    var dKey = y + '-' + m + '-' + d, dDay = curD.getDay(), letter = letters[(dDay + 6) % 7];
    var targets = getTargetsForDate(dKey), totals = records.find(function(r) { return r.key === dKey; }) || { kcal: 0, protein: 0 };
    if (totals.kcal >= targets.kcal * 0.9) calHits++;
    if (totals.protein >= targets.protein * 0.9) protHits++;
    dayHits.push({ key: dKey, letter: letter, kcal: totals.kcal || 0, protein: totals.protein || 0, targets: targets, isToday: (dKey === todayKey()) });
  }
  var dt = getTargetsForDate(todayKey());
  var activeMetric = (typeof window !== 'undefined' ? window.activeNutritionMetric : null) || 'kcal';
  return buildNutritionBarChartHTML({ days: dayHits, activeMetric: activeMetric, targetKcal: dt.kcal, targetProtein: dt.protein });
}

export function nutritionProgressHTML(records) {
  return '<div id="nutritionBarChartContainer">' + getNutritionBarChartInner(records) + '</div>';
}

export function buildWeeklyDigestHTML() { return ''; }
