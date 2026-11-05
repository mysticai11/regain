/* Gym session sheet: choose workout day, workout override, and celebration modal */

import { profile, activeGymDateKey, setActiveGymDateKey } from "../../state.js";
import { dayRecord, saveDayRecord, getWorkoutSessions, sv, WORKOUT_SESSIONS_KEY } from "../../storage.js";
import { getWeeklySchedule, getActiveProgram } from "../../data/plan.js";
import { todayKey, dateKey, addDays, esc } from "../../lib/format.js";
import { playSound, triggerHaptic } from "../../lib/dom.js";
import { showToast } from "../../components/toast.js";

export function showWorkoutCelebrationModal(session, rec) {
  var exercises = session.exercises || [];
  var totalSets = 0;
  var totalTonnage = 0;
  exercises.forEach(function(ex) {
    var sets = ((rec.workout || {})[ex.id] || []).filter(Boolean);
    totalSets += sets.length;
    sets.forEach(function(s) {
      totalTonnage += (Number(s.weight) || 0) * (Number(s.reps) || 0);
    });
  });

  var durationMin = session.durationMinutes || (session.duration_sec ? Math.round(session.duration_sec / 60) : 40);

  playSound('workout_complete');
  triggerHaptic();

  var overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.innerHTML = '<div class="sheet">'
    + '<div class="sheet-handle"></div>'
    + '<div class="celebration-box">'
      + '<div class="t-title" style="margin-bottom:8px">PR Established</div>'
      + '<div class="sheet-title" style="margin-bottom:4px">Workout Completed!</div>'
      + '<div style="font-size:15px;color:var(--text-muted)">' + esc(session.label || 'Workout') + ' finished with intense effort.</div>'
      + '<div class="celebration-stats">'
        + '<div class="celebration-stat-card"><div class="celebration-stat-val">' + totalTonnage.toLocaleString() + '</div><div class="celebration-stat-lbl">kg Volume</div></div>'
        + '<div class="celebration-stat-card"><div class="celebration-stat-val">' + totalSets + '</div><div class="celebration-stat-lbl">Sets Logged</div></div>'
        + '<div class="celebration-stat-card"><div class="celebration-stat-val">' + durationMin + 'm</div><div class="celebration-stat-lbl">Duration</div></div>'
      + '</div>'
      + '<button class="btn btn-primary" id="closeCelebrationBtn" style="width:100%;margin-top:10px">Save & View Summary</button>'
    + '</div>'
    + '</div>';
  document.body.appendChild(overlay);
  overlay.querySelector('#closeCelebrationBtn').onclick = function() {
    overlay.remove();
    tab = 'progress';
    renderApp();
  };
}

export function chooseWorkoutForDate(dayKey) {
  var prog = getActiveProgram();
  var rec=dayRecord(dayKey), overlay=document.createElement('div'); overlay.className='overlay';
  overlay.innerHTML='<div class="sheet"><div class="sheet-handle"></div><div class="sheet-title">Choose workout</div>'
    +prog.map(function(s,i){return '<button class="btn workout-choice" data-workout="'+i+'" style="text-align:left;margin-top:8px">'+esc(s.label)+'</button>';}).join('')
    +'<button class="btn" id="cancelWorkoutChoice" style="margin-top:12px">Cancel</button></div>';
  document.body.appendChild(overlay);
  overlay.querySelector('#cancelWorkoutChoice').onclick=function(){overlay.remove();};
  overlay.querySelectorAll('.workout-choice').forEach(function(btn){btn.onclick=function(){rec.selectedWorkout=parseInt(btn.dataset.workout,10);saveDayRecord(dayKey,rec);overlay.remove();renderGym();};});
}

// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// GYM TAB
// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════

export function openGymDateDaySheet() {
  var overlay = document.createElement('div');
  overlay.className = 'overlay';

  var curKey = window.activeGymDateKey || todayKey();
  var selectedDateStr = curKey;
  var weeklySched = getWeeklySchedule();
  var prog = getActiveProgram();

  function formatDisplayDate(k) {
    var dObj = new Date(k + 'T00:00:00');
    return dObj.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  }

  function getAutoSuggestedForDate(k) {
    var dObj = new Date(k + 'T00:00:00');
    var d = dObj.getDay();
    var dayNum = d === 0 ? 7 : d;
    var matched = weeklySched.find(function(s){ return s.dayNum === dayNum; });
    return (matched && !matched.isRest) ? matched.workoutIndex : null;
  }

  function renderSheetContent() {
    var rec = dayRecord(selectedDateStr);
    var autoSuggestedWIdx = getAutoSuggestedForDate(selectedDateStr);
    var currentSelection = (rec && rec.selectedWorkout !== undefined) ? rec.selectedWorkout : autoSuggestedWIdx;

    var rows = prog.map(function(s, idx) {
      var rawLabel = s.label.replace(/^Day\s*\d+\s*[·•—–-]\s*Day\s*\d+\s*[·•—–-]\s*/gi, '').replace(/^Day\s*\d+\s*[·•—–-]\s*/gi, '').trim();
      var cleanLabel = 'Day ' + (idx + 1) + ' · ' + (rawLabel || s.label);
      var isSuggested = (autoSuggestedWIdx === idx);
      var isSelected = (currentSelection === idx);
      return '<div class="list-row" data-choose-session-widx="' + idx + '" style="display:flex;align-items:center;justify-content:space-between;padding:14px 0;border-bottom:1px solid #222;cursor:pointer">'
        + '<span style="font-size:17px;font-weight:500;color:' + (isSelected ? '#F5F5F4' : '#8A8A8E') + '">' + esc(cleanLabel) + '</span>'
        + '<div style="display:flex;align-items:center;gap:8px">'
          + (isSuggested ? '<span style="font-size:11px;font-weight:600;color:#8A8A8E;text-transform:uppercase;letter-spacing:0.08em">Suggested</span>' : '')
          + (isSelected ? '<span style="color:#F5F5F4;font-size:17px;font-weight:700">✓</span>' : '')
        + '</div>'
        + '</div>';
    }).join('');

    var isRestSuggested = (autoSuggestedWIdx === null);
    var isRestSelected = (currentSelection === null);
    var restRow = '<div class="list-row" data-choose-session-widx="rest" style="display:flex;align-items:center;justify-content:space-between;padding:14px 0;border-bottom:1px solid #222;cursor:pointer">'
      + '<span style="font-size:17px;font-weight:500;color:' + (isRestSelected ? '#F5F5F4' : '#8A8A8E') + '">Rest day</span>'
      + '<div style="display:flex;align-items:center;gap:8px">'
        + (isRestSuggested ? '<span style="font-size:11px;font-weight:600;color:#8A8A8E;text-transform:uppercase;letter-spacing:0.08em">Suggested</span>' : '')
        + (isRestSelected ? '<span style="color:#F5F5F4;font-size:17px;font-weight:700">✓</span>' : '')
      + '</div>'
      + '</div>';

    overlay.innerHTML = '<div class="sheet" style="background:#141416;border:none;border-radius:20px 20px 0 0;padding:20px 20px calc(24px + var(--safe-b));max-width:480px;width:100%">'
      + '<div class="sheet-handle"></div>'
      + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">'
        + '<div style="font-size:28px;font-weight:600;color:#F5F5F4;line-height:1.15">Session Date & Day</div>'
        + '<button type="button" class="btn-text-action" id="closeGymDateSheetBtn" style="font-size:15px;color:#8A8A8E;background:none;border:none;padding:0;cursor:pointer">Close</button>'
      + '</div>'

      + '<div style="margin-bottom:20px">'
        + '<label class="eyebrow">Date</label>'
        + '<div style="position:relative">'
          + '<input type="date" id="gymInputDate" value="' + selectedDateStr + '" style="opacity:0;position:absolute;inset:0;width:100%;height:100%;cursor:pointer;z-index:2">'
          + '<div id="gymDateDisplay" style="background:#1C1C1F;border-radius:12px;height:48px;display:flex;align-items:center;padding:0 16px;font-size:17px;font-weight:500;color:#F5F5F4">'
            + esc(formatDisplayDate(selectedDateStr))
          + '</div>'
        + '</div>'
        + '<div style="display:flex;gap:16px;margin-top:10px;align-items:center">'
          + '<button type="button" class="btn-text-action" id="chipTodayBtn" style="color:#F5F5F4;font-size:15px;background:none;border:none;padding:0;cursor:pointer">Today</button>'
          + '<span style="color:#55555A">·</span>'
          + '<button type="button" class="btn-text-action" id="chipYesterdayBtn" style="color:#8A8A8E;font-size:15px;background:none;border:none;padding:0;cursor:pointer">Yesterday</button>'
          + '<span style="color:#55555A">·</span>'
          + '<button type="button" class="btn-text-action" id="chip2DaysAgoBtn" style="color:#8A8A8E;font-size:15px;background:none;border:none;padding:0;cursor:pointer">2 days ago</button>'
        + '</div>'
      + '</div>'

      + '<div>'
        + '<label class="eyebrow" style="margin-bottom:8px">Workout</label>'
        + '<div id="sessionPlanRows" style="max-height:42vh;overflow-y:auto">'
          + rows + restRow
        + '</div>'
      + '</div>'
      + '</div>';

    overlay.querySelector('#closeGymDateSheetBtn').onclick = function() { overlay.remove(); };
    overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };

    var dInput = overlay.querySelector('#gymInputDate');
    dInput.onchange = function() {
      if (dInput.value) {
        selectedDateStr = dInput.value;
        renderSheetContent();
      }
    };

    overlay.querySelector('#chipTodayBtn').onclick = function() {
      selectedDateStr = todayKey();
      renderSheetContent();
    };
    overlay.querySelector('#chipYesterdayBtn').onclick = function() {
      var yest = new Date(); yest.setDate(yest.getDate() - 1);
      selectedDateStr = dateKey(yest);
      renderSheetContent();
    };
    overlay.querySelector('#chip2DaysAgoBtn').onclick = function() {
      var twoDays = new Date(); twoDays.setDate(twoDays.getDate() - 2);
      selectedDateStr = dateKey(twoDays);
      renderSheetContent();
    };

    overlay.querySelectorAll('[data-choose-session-widx]').forEach(function(row) {
      row.onclick = function() {
        var val = row.dataset.chooseSessionWidx;
        var chosenWIdx = val === 'rest' ? null : parseInt(val, 10);
        var targetRec = dayRecord(selectedDateStr);
        targetRec.selectedWorkout = chosenWIdx;

        var dObj = new Date(selectedDateStr + 'T00:00:00');
        var d = dObj.getDay();
        targetRec.selectedDayNumber = d === 0 ? 7 : d;

        if (selectedDateStr !== curKey) {
          var srcRec = dayRecord(curKey);
          var hasSets = srcRec.workout && Object.keys(srcRec.workout).some(function(k){ return (srcRec.workout[k]||[]).some(Boolean); });
          if (hasSets || srcRec.workoutDone) {
            targetRec.workout = srcRec.workout;
            targetRec.workoutDone = srcRec.workoutDone;
            targetRec.duration_sec = srcRec.duration_sec;
            targetRec.durationMinutes = srcRec.durationMinutes;

            var store = workoutSessionStore();
            Object.keys(store.sessions).forEach(function(sId){
              if (store.sessions[sId].dayKey === curKey) {
                store.sessions[sId].dayKey = selectedDateStr;
              }
            });
            sv(WORKOUT_SESSIONS_KEY, store);

            srcRec.workout = {};
            srcRec.workoutDone = false;
            saveDayRecord(curKey, srcRec);
            showToast('Moved logged workout to ' + selectedDateStr, 'ok');
          } else {
            showToast('Switched to ' + selectedDateStr, 'ok');
          }
        } else {
          showToast('Workout updated for ' + formatDisplayDate(selectedDateStr), 'ok');
        }

        saveDayRecord(selectedDateStr, targetRec);
        window.activeGymDateKey = selectedDateStr;
        window.activeTodaySelectedDateKey = selectedDateStr;
        overlay.remove();
        renderGym();
      };
    });
  }

  document.body.appendChild(overlay);
  renderSheetContent();
}
