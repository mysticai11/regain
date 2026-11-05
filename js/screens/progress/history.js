/* Progress history: workout history bars, session PR badges, weight entries, and weekly digests */

import { getWorkoutSessions, dayRecord, saveDayRecord } from "../../storage.js";
import { getExerciseData, isBodyweightExercise, getActiveProgram } from "../../data/plan.js";
import { calcE1RM, getTargetsForDate, getLoggedWeeklyVolume, getWeeklyVolume } from "../../lib/calc.js";
import { esc, todayKey } from "../../lib/format.js";
import { showToast } from "../../components/toast.js";
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

  return '<div style="background:#141416;border-radius:12px;padding:12px 16px;margin-bottom:16px;min-height:64px;display:flex;justify-content:space-between;align-items:center">'
    + '<div><div style="font-size:11px;font-weight:600;color:#C6F432;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:2px">In progress</div>'
    + '<div style="font-size:17px;font-weight:600;color:#F5F5F4">' + esc(cleanTName) + ' · ' + progressStr + '</div></div>'
    + '<button type="button" class="btn-text-action" id="resumeSessionBtn" onclick="if(window.renderApp){window.setTab?window.setTab(\'gym\'):(window.tab=\'gym\');window.renderApp();}" style="color:#C6F432;font-size:15px;font-weight:600;background:none;border:none;padding:0;cursor:pointer">Resume</button>'
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

  var html = '<div>' + todayInProgressHTML;

  weekOrder.forEach(function(wk, wkIdx) {
    var group = weekGroups[wk];
    var totalSetsInWeek = group.sessions.reduce(function(acc, s) {
      return acc + (s.exercises || []).reduce(function(a, ex) { return a + (ex.sets || []).filter(Boolean).length; }, 0);
    }, 0);
    var weekNum = wkIdx + 1;

    html += '<div style="font-size:11px;font-weight:600;color:#8A8A8E;text-transform:uppercase;letter-spacing:0.08em;margin:' + (wkIdx === 0 ? '4' : '24') + 'px 0 4px">WEEK ' + weekNum + ' · ' + group.sessions.length + (group.sessions.length === 1 ? ' SESSION' : ' SESSIONS') + ' · ' + totalSetsInWeek + ' SETS</div>'
      + '<div style="font-size:11px;color:#55555A;letter-spacing:0.04em;text-transform:uppercase;margin-bottom:12px">RIR: F = failure · 1 · 2 · 3 · + = 4 or more</div>';

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
      var durStr = '-';
      if (durMin && durMin > 0) {
        if (durMin > 180) durMin = 180;
        durStr = durMin + ' min';
      }

      var rawTitle = session.programLabel || session.sessionLabel || 'Workout';
      var cleanTitle = rawTitle.replace(/^Day\s*\d+\s*[·•—–-]\s*/gi, '').trim();
      if (!cleanTitle) cleanTitle = rawTitle;

      var volStr = totalVol > 0 ? (' · ' + Math.round(totalVol).toLocaleString() + ' kg') : '';
      var statsText = durStr + ' · ' + totalSets + (totalSets === 1 ? ' set' : ' sets') + volStr;

      var exRows = exercises.map(function(exItem, exIdx) {
        var exData = getExerciseData(exItem.id) || { name: exItem.id };
        var sets = (exItem.sets || []).filter(Boolean);
        var isBW = isBodyweightExercise(exItem.id, exData.name);

        // Find immediately prior session in history that had this exercise with logged sets
        var prevExSets = null;
        for (var pIdx = allSessionIdx + 1; pIdx < sessions.length; pIdx++) {
          var pe = (sessions[pIdx].exercises || []).find(function(e) { return e.id === exItem.id; });
          if (pe && (pe.sets || []).some(Boolean)) {
            prevExSets = (pe.sets || []).filter(Boolean);
            break;
          }
        }

        var progressTagHTML = '';
        if (prevExSets && prevExSets.length > 0 && sets.length > 0) {
          if (isBW) {
            var curBestR = sets.reduce(function(m, s) { return Math.max(m, Number(s.reps) || 0); }, 0);
            var prevBestR = prevExSets.reduce(function(m, s) { return Math.max(m, Number(s.reps) || 0); }, 0);
            var dR = curBestR - prevBestR;
            if (dR > 0) progressTagHTML = '<span style="display:inline-flex;align-items:center;padding:2px 6px;border-radius:6px;background:rgba(198,244,50,0.12);color:#C6F432;font-size:11px;font-weight:600;font-variant-numeric:tabular-nums">+' + dR + (dR === 1 ? ' rep' : ' reps') + '</span>';
          } else {
            var curTopW = sets.reduce(function(m, s) { return Math.max(m, Number(s.weight) || 0); }, 0);
            var prevTopW = prevExSets.reduce(function(m, s) { return Math.max(m, Number(s.weight) || 0); }, 0);
            var dW = curTopW - prevTopW;
            if (dW > 0) {
              progressTagHTML = '<span style="display:inline-flex;align-items:center;padding:2px 6px;border-radius:6px;background:rgba(198,244,50,0.12);color:#C6F432;font-size:11px;font-weight:600;font-variant-numeric:tabular-nums">+' + (dW % 1 === 0 ? dW : dW.toFixed(1)) + ' kg</span>';
            } else if (dW === 0 && curTopW > 0) {
              var curTopR = sets.filter(function(s) { return Number(s.weight) === curTopW; }).reduce(function(m, s) { return Math.max(m, Number(s.reps) || 0); }, 0);
              var prevTopR = prevExSets.filter(function(s) { return Number(s.weight) === prevTopW; }).reduce(function(m, s) { return Math.max(m, Number(s.reps) || 0); }, 0);
              var dTopR = curTopR - prevTopR;
              if (dTopR > 0) progressTagHTML = '<span style="display:inline-flex;align-items:center;padding:2px 6px;border-radius:6px;background:rgba(198,244,50,0.12);color:#C6F432;font-size:11px;font-weight:600;font-variant-numeric:tabular-nums">+' + dTopR + (dTopR === 1 ? ' rep' : ' reps') + '</span>';
            }
          }
        }

        var isPrInSession = false;
        var priorSets = [];
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

        var chips = sets.map(function(s) {
          var wDisp = isBW ? ((!s.weight || Number(s.weight) === 0) ? 'BW' : ('BW+' + s.weight)) : s.weight;
          var chipText = wDisp + '×' + s.reps;
          var rir = s.rir;
          var rirVal = (rir === 0 || rir === '0') ? 'F' : ((rir != null && rir !== '') ? (Number(rir) >= 4 ? '+' : String(rir)) : '');
          var dotColor = (rir === 0 || rir === '0') ? '#C6F432' : ((rir != null && rir !== '') ? '#8A8A8E' : '#55555A');
          var dot = '<span style="width:4px;height:4px;border-radius:50%;background:' + dotColor + ';display:inline-block;margin-left:4px;flex-shrink:0;vertical-align:middle"></span>';
          var rirBadge = rirVal ? '<span style="font-size:11px;color:' + (rirVal === 'F' ? '#C6F432' : '#8A8A8E') + ';margin-left:3px">' + rirVal + '</span>' : '';
          return '<span style="display:inline-flex;align-items:center;background:#1C1C1F;border-radius:8px;padding:3px 8px;font-size:11px;font-weight:600;color:#F5F5F4;font-variant-numeric:tabular-nums;white-space:nowrap">' + esc(chipText) + dot + rirBadge + '</span>';
        }).join('');

        var isLast = exIdx === exercises.length - 1;
        return '<div style="padding:10px 0;' + (isLast ? '' : 'border-bottom:1px solid #1C1C1F') + '">'
          + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">'
            + '<div style="display:flex;align-items:center;gap:8px">'
              + '<span style="font-size:15px;font-weight:600;color:#F5F5F4">' + esc(exData.name) + '</span>'
              + progressTagHTML
            + '</div>'
            + (isPrInSession ? '<span style="display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:600;color:#C6F432;letter-spacing:0.08em;text-transform:uppercase"><span style="width:5px;height:5px;border-radius:50%;background:#C6F432;display:inline-block"></span>PR</span>' : '')
          + '</div>'
          + '<div style="display:flex;flex-wrap:wrap;gap:4px">' + chips + '</div>'
          + '</div>';
      }).join('');

      var chevronSVG = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>';
      var isFirstInWeek = (sIdx === 0 && wkIdx === 0);

      html += '<details class="history-session-details" ' + (isFirstInWeek ? 'open' : '') + ' style="margin-bottom:12px;background:#141416;border-radius:16px;overflow:hidden">'
        + '<summary class="history-session-header" style="min-height:72px;height:auto;padding:12px 16px;display:flex;align-items:center;justify-content:space-between;cursor:pointer;list-style:none;user-select:none;box-sizing:border-box;gap:12px">'
          + '<div style="display:flex;flex-direction:column;align-items:center;flex-shrink:0;min-width:36px">'
            + '<div style="font-size:11px;font-weight:600;color:#8A8A8E;line-height:1.1;letter-spacing:0.04em">' + esc(dayLabel) + ' ' + esc(monLabel) + '</div>'
            + '<div style="font-size:28px;font-weight:600;color:#F5F5F4;line-height:1;font-variant-numeric:tabular-nums">' + String(dObj.getDate()) + '</div>'
          + '</div>'
          + '<div style="flex:1;min-width:0">'
            + '<div style="font-size:17px;font-weight:600;color:#F5F5F4;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(cleanTitle) + '</div>'
            + '<div style="font-size:15px;color:#8A8A8E;margin-top:2px;font-variant-numeric:tabular-nums">' + esc(statsText) + '</div>'
          + '</div>'
          + '<div style="display:flex;align-items:center;gap:4px;flex-shrink:0">'
            + '<span class="history-chevron" style="display:inline-flex;align-items:center;color:#8A8A8E;transition:transform 0.2s ease">' + chevronSVG + '</span>'
            + '<button type="button" class="btn-ghost history-menu-btn" data-edit-workout-session="' + esc(session.id) + '" onclick="event.stopPropagation();event.preventDefault();openEditWorkoutSheet(\'' + esc(session.id) + '\');" style="background:none;border:none;font-size:17px;line-height:1;padding:4px 6px;color:#8A8A8E;cursor:pointer;min-width:44px;text-align:center" aria-label="Session options">···</button>'
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
  return entries.slice().reverse().slice(0,8).map(function(e){
    var label=new Date(e.createdAt||e.dayKey+'T12:00:00').toLocaleString([],{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});
    return '<div class="weight-entry-row"><span>'+label+' · <b>'+e.weight+' kg</b></span><span><button class="btn-ghost" data-edit-weight="'+esc(e.id)+'">Edit</button><button class="btn-ghost" data-delete-weight="'+esc(e.id)+'">Delete</button></span></div>';
  }).join('');
}

export function editWeightEntry(id) {
  var entries = (profile && Array.isArray(profile.weightEntries)) ? profile.weightEntries : [];
  var entry=entries.find(function(e){return e.id===id;}); if(!entry) return;
  var value=prompt('Bodyweight in kg',entry.weight); if(value===null) return;
  var weight=parseFloat(value); if(!weight||weight<20||weight>300){showToast('Enter a valid weight','warn');return;}
  entry.weight=weight; sv('rg_profile',profile);
  if(entry.dayKey){var rec=dayRecord(entry.dayKey);rec.weight=weight;saveDayRecord(entry.dayKey,rec);}
  renderProgressSimple();
}

export function deleteWeightEntry(id) {
  if(!confirm('Delete this weight entry?')) return;
  var entries = (profile && profile.weightEntries) || [], target = entries.find(function(e){return e.id===id;});
  profile.weightEntries=entries.filter(function(e){return e.id!==id;});
  if(target&&target.dayKey) {
    var sameDay=profile.weightEntries.filter(function(e){return e.dayKey===target.dayKey;}).sort(function(a,b){return String(a.createdAt).localeCompare(String(b.createdAt));});
    var rec=dayRecord(target.dayKey); rec.weight=sameDay.length?sameDay[sameDay.length-1].weight:null; saveDayRecord(target.dayKey,rec);
  }
  sv('rg_profile',profile); renderProgressSimple();
}

export function weeklyVolumeChart() {
  var logged = getLoggedWeeklyVolume(), planned = getWeeklyVolume(), plannedByMuscle = {};
  planned.forEach(function(v){ plannedByMuscle[v.muscle] = v.sets; });
  var targetFloor = 10;
  
  var rows = logged.map(function(v) {
    var target = plannedByMuscle[v.muscle] || targetFloor;
    var pct = Math.min(100, Math.round(v.sets / target * 100));
    return '<div style="margin-bottom:14px">'
      + '<div class="list-row" style="padding:4px 0">'
        + '<span>' + esc(v.muscle) + '</span>'
        + '<span class="tabnum">' + v.sets + ' / ' + target + '</span>'
      + '</div>'
      + '<div class="prog-line"><div class="prog-line-fill' + (v.sets >= target ? ' lime' : '') + '" style="width:' + pct + '%"></div></div>'
      + '</div>';
  }).join('');

  return '<div style="margin-top:8px">'
    + '<div class="t-micro" style="margin-bottom:12px">Sets, last 7 days · target 10–18</div>'
    + rows
    + '</div>';
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
      ? '<span style="width:8px;height:8px;border-radius:50%;background:#C6F432;display:inline-block"></span>'
      : '<span style="width:8px;height:8px;border-radius:50%;border:1px solid #55555A;background:transparent;box-sizing:border-box;display:inline-block"></span>';

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

  return '<div style="background:#141416;border-radius:12px;padding:14px 16px;margin-top:8px">'
    + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">'
      + '<span style="font-size:11px;font-weight:600;color:#8A8A8E;letter-spacing:0.08em;text-transform:uppercase">7-Day Hit Rate</span>'
      + '<span class="tabnum" style="font-size:11px;color:#8A8A8E">' + calHits + '/7 kcal · ' + protHits + '/7 protein</span>'
    + '</div>'
    + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;padding:0 4px">' + dotCells + '</div>'
    + '<div style="border-top:1px solid #1C1C1F;padding-top:12px">'
      + '<div class="list-row">'
        + '<span>Avg calories</span>'
        + '<span class="tabnum">' + kcal.toLocaleString() + ' / ' + target.toLocaleString() + '</span>'
      + '</div>'
      + '<div class="prog-line" style="margin-bottom:14px"><div class="prog-line-fill' + (kcalPct >= 90 ? ' lime' : '') + '" style="width:' + kcalPct + '%"></div></div>'
      + '<div class="list-row">'
        + '<span>Avg protein</span>'
        + '<span class="tabnum">' + protein + ' g / ' + proteinTarget + ' g</span>'
      + '</div>'
      + '<div class="prog-line"><div class="prog-line-fill' + (protPct >= 90 ? ' lime' : '') + '" style="width:' + protPct + '%"></div></div>'
    + '</div>'
    + '</div>';
}

export function buildWeeklyDigestHTML() { return ''; }


// ─── Native Web Audio Synthesizer & Wake Lock ───
