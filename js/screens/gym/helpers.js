/* Gym screen helpers: schedule date resolution, workout week, and session metadata */

import { profile } from "../../state.js";
import { dayRecord, saveDayRecord, getWorkoutSessions, getWorkoutSession, workoutSessionId } from "../../storage.js";
import { getActiveProgram, getWeeklySchedule } from "../../data/plan.js";
import { todayKey, dateKey, daysBetween, allDayKeys, esc } from "../../lib/format.js";
import { showToast } from "../../components/toast.js";
import { openGymDateDaySheet } from "./session-sheet.js";
import { openSplitManagerSheet } from "./plan-editor.js";
import { getWeeklyVolume } from "../../lib/calc.js";

function triggerRenderGym() {
  if (typeof window !== 'undefined') {
    window.activeExpandedExId = null;
    if (typeof window.renderGym === 'function') window.renderGym();
    if (typeof window.renderTodaySimple === 'function') window.renderTodaySimple();
    if (typeof window.renderTab === 'function') window.renderTab();
  }
}

export { getWorkoutForDate, getWorkoutWeek, getCompletedWorkoutCount, getNextProgramWorkout } from "../../data/plan.js";

export function getActiveWorkoutSession(dayKey, programDayIndex) {
  var prog = getActiveProgram();
  var session = getWorkoutSession(dayKey, programDayIndex);
  if (session) return session;
  return {
    id: workoutSessionId(dayKey, programDayIndex),
    dayKey: dayKey,
    programDay: programDayIndex,
    programLabel: (prog[programDayIndex] || {}).label || 'Workout',
    exercises: [],
    status: 'not_started'
  };
}

export { getSessionMeta } from "../../storage-sessions.js";

export function chooseWorkoutForDate(dayKey) {
  var prog = getActiveProgram();
  var rec = dayRecord(dayKey), overlay = document.createElement('div'); overlay.className = 'overlay';
  overlay.innerHTML = '<div class="sheet"><div class="sheet-handle"></div><div class="sheet-title">Choose workout</div>'
    + prog.map(function(s, i) { return '<button class="btn workout-choice" data-workout="' + i + '" style="text-align:left;margin-top:8px">' + esc(s.label) + '</button>'; }).join('')
    + '<button class="btn" id="cancelWorkoutChoice" style="margin-top:12px">Cancel</button></div>';
  document.body.appendChild(overlay);
  overlay.querySelector('#cancelWorkoutChoice').onclick = function() { overlay.remove(); };
  overlay.querySelectorAll('.workout-choice').forEach(function(btn) {
    btn.onclick = function() {
      rec.selectedWorkout = parseInt(btn.dataset.workout, 10);
      saveDayRecord(dayKey, rec);
      overlay.remove();
      triggerRenderGym();
    };
  });
}

export function attachCommonGymHeaderEvents() {
  var dateSelBtn = document.getElementById('gymDateSelectBtn');
  if (dateSelBtn) dateSelBtn.onclick = openGymDateDaySheet;
  var dateResetBtn = document.getElementById('gymDateResetBtn');
  if (dateResetBtn) {
    dateResetBtn.onclick = function() {
      delete window.activeGymDateKey;
      triggerRenderGym();
      showToast('Jumped to today', 'ok');
    };
  }
  var manageBtn = document.getElementById('manageSplitTopBtn');
  if (manageBtn) manageBtn.onclick = openSplitManagerSheet;
}

export function buildVolumeTable() {
  var vData = getWeeklyVolume();
  return '<div style="display:flex;flex-direction:column;gap:8px">'
    + vData.map(function(v) {
      var pct = Math.min(100, Math.round((v.sets / 20) * 100));
      var inRange = v.sets >= 10 && v.sets <= 20;
      return '<div style="padding:10px 0;border-bottom:1px solid var(--hairline)">'
        + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">'
          + '<span style="font-size:15px;font-weight:600;color:var(--text)">' + esc(v.muscle) + '</span>'
          + '<span class="tabnum" style="font-size:11px;color:' + (inRange ? 'var(--text)' : 'var(--text-secondary)') + '">' + v.sets + ' / 10–20 sets</span>'
        + '</div>'
        + '<div class="prog-line"><div class="prog-line-fill' + (inRange ? ' lime' : '') + '" style="width:' + pct + '%"></div></div>'
        + '</div>';
    }).join('')
    + '</div>';
}
