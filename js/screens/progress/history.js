/* Progress history: workout history bars, session PR badges, weight entries, and weekly digests */

import { getWorkoutSessions, dayRecord, saveDayRecord } from "../../storage.js";
import { getExerciseData, isBodyweightExercise } from "../../data/plan.js";
import { calcE1RM, getTargetsForDate, getLoggedWeeklyVolume, getWeeklyVolume } from "../../lib/calc.js";
import { esc, todayKey } from "../../lib/format.js";
import { showToast } from "../../components/toast.js";

export function workoutHistoryHTML() {
  var todayRec = dayRecord(todayKey());
  var todayInProgressHTML = '';
  var todaySets = 0;
  if (todayRec && !todayRec.workoutDone && todayRec.workout) {
    Object.keys(todayRec.workout).forEach(function(id) {
      todaySets += (todayRec.workout[id] || []).filter(Boolean).length;
    });
    if (todaySets > 0) {
      var tName = (todayRec.workoutSession && todayRec.workoutSession.label) || 'Active Workout';
      var cleanTName = tName.replace(/^Day\s*\d+\s*[—–-]\s*/i, '');
      todayInProgressHTML = '<div class="list-row" style="background:#141416;border-radius:12px;padding:12px 16px;margin-bottom:24px;min-height:64px;display:flex;justify-content:space-between;align-items:center">'
        + '<div><div style="font-size:11px;font-weight:600;color:#C6F432;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:2px">In progress</div>'
        + '<div style="font-size:17px;font-weight:600;color:#F5F5F4">' + esc(cleanTName) + ' · ' + todaySets + (todaySets === 1 ? ' set' : ' sets') + '</div></div>'
        + '<button type="button" class="btn-text-action" id="resumeSessionBtn" onclick="if(window.renderApp){window.setTab?window.setTab(\'gym\'):(window.tab=\'gym\');window.renderApp();}" style="color:#C6F432;font-size:15px;font-weight:600;background:none;border:none;padding:0;cursor:pointer">Resume</button>'
        + '</div>';
    }
  }

  var sessions = getWorkoutSessions().filter(function(session) {
    if (session.dayKey === todayKey() && todayRec && !todayRec.workoutDone) return false;
    return (session.exercises || []).some(function(exercise) {
      return (exercise.sets || []).some(Boolean);
    });
  }).reverse();
  if (!sessions.length && !todayInProgressHTML) return '<div class="t-micro" style="padding:16px 0;color:var(--text-secondary)">No completed workouts yet.</div>';

  return '<div style="display:flex;flex-direction:column">' + todayInProgressHTML + sessions.map(function(session, sIdx) {
    var exercises = session.exercises || [];
    var totalSets = exercises.reduce(function(count, ex) {
      return count + (ex.sets || []).filter(Boolean).length;
    }, 0);
    var dObj = session.dayKey ? new Date(session.dayKey + 'T00:00:00') : new Date();
    var dayNames = ['SUN','MON','TUE','WED','THU','FRI','SAT'];
    var monthNames = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
    var dateLabel = dayNames[dObj.getDay()] + ' ' + dObj.getDate() + ' ' + monthNames[dObj.getMonth()];

    var storedMeta = session.dayKey ? (dayRecord(session.dayKey).workoutMetaBySession || {}) : {};
    var matchingMeta = storedMeta[String(session.programDay)] || Object.keys(storedMeta).map(function(k){ return storedMeta[k]; }).find(function(m){ return m && (m.duration_sec != null || m.durationMinutes != null); });
    var durationSec = session.duration_sec != null ? Number(session.duration_sec) : (matchingMeta && (matchingMeta.duration_sec != null ? Number(matchingMeta.duration_sec) : Number(matchingMeta.durationMinutes)*60));
    var durStr = durationSec ? (Math.round(durationSec / 60) + ' min') : '';

    var rawTitle = session.programLabel || session.sessionLabel || 'Workout';
    var cleanTitle = rawTitle.replace(/^Day\s*\d+\s*[·•—–-]\s*/gi, '').replace(/^Day\s*\d+\s*[·•—–-]\s*/gi, '').trim();
    if (!cleanTitle) cleanTitle = rawTitle;

    var words = cleanTitle.trim().split(/\s+/);
    var balancedTitle = words.length > 1 ? (words.slice(0, -1).join(' ') + '\u00A0' + words[words.length - 1]) : cleanTitle;

    var statsText = (durStr ? durStr + ' · ' : '') + totalSets + (totalSets === 1 ? ' set' : ' sets');

    var exRows = exercises.map(function(exItem) {
      var exData = getExerciseData(exItem.id) || { name: exItem.id };
      var sets = (exItem.sets || []).filter(Boolean);
      var isBW = isBodyweightExercise(exItem.id, exData.name);

      var isPrInSession = false;
      var priorSets = [];
      for (var p = sIdx + 1; p < sessions.length; p++) {
        var pEx = (sessions[p].exercises || []).find(function(e){ return e.id === exItem.id; });
        if (pEx && pEx.sets && pEx.sets.length) {
          pEx.sets.filter(Boolean).forEach(function(s){ priorSets.push(s); });
        }
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

      var setLines = sets.map(function(s) {
        var wDisp = isBW ? ((!s.weight || Number(s.weight) === 0) ? 'BW' : ('BW+' + s.weight)) : s.weight;
        return wDisp + ' × ' + s.reps + (s.rir != null ? (' · RIR ' + s.rir) : '');
      }).join(', ');

      return '<div style="padding:10px 0;border-bottom:1px solid #222">'
        + '<div style="display:flex;justify-content:space-between;align-items:baseline">'
          + '<span style="font-size:17px;font-weight:600;color:#F5F5F4">' + esc(exData.name) + '</span>'
          + (isPrInSession ? '<span style="display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:600;color:#C6F432;letter-spacing:0.08em;text-transform:uppercase"><span style="width:5px;height:5px;border-radius:50%;background:#C6F432;display:inline-block"></span>PR</span>' : '')
        + '</div>'
        + '<div style="font-size:15px;color:#8A8A8E;font-variant-numeric:tabular-nums;margin-top:4px">' + esc(setLines) + '</div>'
        + '</div>';
    }).join('');

    var chevronSVG = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>';

    return '<details class="history-session-details" style="margin-bottom:24px">'
      + '<summary class="history-session-header" style="height:64px;min-height:64px;background:#141416;border-radius:12px;padding:10px 16px;display:flex;align-items:center;justify-content:space-between;cursor:pointer;list-style:none;user-select:none;box-sizing:border-box">'
        + '<div style="flex:1;min-width:0;padding-right:12px">'
          + '<div style="font-size:11px;font-weight:600;color:#8A8A8E;text-transform:uppercase;letter-spacing:0.08em;line-height:1.2;margin-bottom:2px">' + esc(dateLabel) + '</div>'
          + '<div style="font-size:17px;font-weight:600;color:#F5F5F4;line-height:1.25;text-wrap:balance;overflow-wrap:break-word">' + esc(balancedTitle) + '</div>'
        + '</div>'
        + '<div style="display:flex;align-items:center;gap:8px;flex-shrink:0">'
          + '<span style="font-size:15px;color:#8A8A8E;font-variant-numeric:tabular-nums;white-space:nowrap">' + esc(statsText) + '</span>'
          + '<span class="history-chevron" style="display:inline-flex;align-items:center;color:#8A8A8E;transition:transform 0.2s ease">' + chevronSVG + '</span>'
          + '<button type="button" class="btn-ghost history-menu-btn" data-edit-workout-session="' + esc(session.id) + '" onclick="event.stopPropagation();event.preventDefault();openEditWorkoutSheet(\'' + esc(session.id) + '\');" style="background:none;border:none;font-size:17px;line-height:1;padding:4px 6px;color:#8A8A8E;cursor:pointer" aria-label="Session options">···</button>'
        + '</div>'
      + '</summary>'
      + '<div style="padding:4px 0 0">' + exRows + '</div>'
      + '</details>';
  }).join('') + '</div>';
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
  var value=prompt('Bodyweight in kg',entry.weight);
  if(value===null) return;
  var weight=parseFloat(value);
  if(!weight||weight<20||weight>300){showToast('Enter a valid weight','warn');return;}
  entry.weight=weight;
  sv('rg_profile',profile);
  if(entry.dayKey){var rec=dayRecord(entry.dayKey);rec.weight=weight;saveDayRecord(entry.dayKey,rec);}
  renderProgressSimple();
}

export function deleteWeightEntry(id) {
  if(!confirm('Delete this weight entry?')) return;
  var entries = (profile && profile.weightEntries) || [], target = entries.find(function(e){return e.id===id;});
  profile.weightEntries=entries.filter(function(e){return e.id!==id;});
  if(target&&target.dayKey) {
    var sameDay=profile.weightEntries.filter(function(e){return e.dayKey===target.dayKey;}).sort(function(a,b){return String(a.createdAt).localeCompare(String(b.createdAt));});
    var rec=dayRecord(target.dayKey);
    rec.weight=sameDay.length?sameDay[sameDay.length-1].weight:null;
    saveDayRecord(target.dayKey,rec);
  }
  sv('rg_profile',profile);
  renderProgressSimple();
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
  var dailyTarget = getTargetsForDate(todayKey());
  var target = dailyTarget.kcal;
  var proteinTarget = dailyTarget.protein;
  var recent = records.slice(-7), days = recent.filter(function(r){ return r.kcal > 0; });
  var kcal = days.length ? Math.round(days.reduce(function(sum,r){ return sum + r.kcal; }, 0) / days.length) : 0;
  var protein = days.length ? Math.round(days.reduce(function(sum,r){ return sum + r.protein; }, 0) / days.length) : 0;
  var kcalPct = Math.min(100, Math.round(kcal / Math.max(1, target) * 100));
  var protPct = Math.min(100, Math.round(protein / Math.max(1, proteinTarget) * 100));

  return '<div style="margin-top:8px">'
    + '<div class="list-row">'
      + '<span>Avg calories</span>'
      + '<span class="tabnum">' + kcal.toLocaleString() + ' / ' + target.toLocaleString() + '</span>'
    + '</div>'
    + '<div class="prog-line" style="margin-bottom:14px"><div class="prog-line-fill" style="width:' + kcalPct + '%"></div></div>'
    + '<div class="list-row">'
      + '<span>Avg protein</span>'
      + '<span class="tabnum">' + protein + ' g / ' + proteinTarget + ' g</span>'
    + '</div>'
    + '<div class="prog-line"><div class="prog-line-fill" style="width:' + protPct + '%"></div></div>'
    + '</div>';
}

export function buildWeeklyDigestHTML() {
  var keys = allDayKeys();
  var records = keys.map(function(k){
    var r = dayRecord(k); var t = getDayTotals(k);
    var hasWorkout = (r.workoutDone || (r.workout && Object.keys(r.workout).length > 0));
    return {key:k,weight:r.weight,kcal:t.kcal,workoutDone:hasWorkout};
  });
  
  // Get records from the past 7 days (the current week)
  var last7 = records.slice(-7);
  if (last7.length === 0) return '';
  
  var sumKcal = 0, countKcal = 0;
  var sumW = 0, countW = 0;
  var firstW = null, lastW = null;
  var gymDaysDone = 0, gymDaysScheduled = 0;
  
  last7.forEach(function(r){
    if (r.kcal > 0) {
      sumKcal += r.kcal;
      countKcal++;
    }
    if (r.weight != null) {
      if (firstW === null) firstW = r.weight;
      lastW = r.weight;
    }
    
    var d = new Date(r.key + 'T00:00:00');
    var isTrain = (profile.trainingDays || [1,3,5]).includes(d.getDay());
    if (isTrain) {
      gymDaysScheduled++;
      if (r.workoutDone) gymDaysDone++;
    }
  });
  
  var avgK = countKcal ? Math.round(sumKcal / countKcal) : 0;
  var deltaW = (firstW != null && lastW != null) ? (lastW - firstW) : null;
  
  var digestStr = '';
  digestStr += avgK ? 'avg ' + avgK + ' kcal' : 'no kcal';
  if (deltaW != null) {
    digestStr += ', ' + (deltaW >= 0 ? '+' : '') + deltaW.toFixed(2) + 'kg';
  } else {
    digestStr += ', -- kg';
  }
  digestStr += ', ' + gymDaysDone + '/' + gymDaysScheduled + ' gym';
  
  return '<div style="background:var(--surface-raised); border:1px solid var(--border); border-radius:10px; padding:12px 14px; margin-top:16px; margin-bottom:12px; display:flex; justify-content:space-between; align-items:center">'
    +'<div><span class="eyebrow" style="margin:0">Weekly Digest</span><div style="font-weight:600;font-size:15px;color:var(--text-secondary);margin-top:2px">Closing the loop</div></div>'
    +'<div class="tabnum" style="font-size:11px;color:var(--text);text-align:right">' + digestStr + '</div>'
    +'</div>';
}


// ─── Native Web Audio Synthesizer & Wake Lock ───
