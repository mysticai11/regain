/* Gym screen helpers: schedule date resolution, workout week, and session metadata */

import { profile } from "../../state.js";
import { dayRecord, saveDayRecord, getWorkoutSessions, getWorkoutSession, workoutSessionId } from "../../storage.js";
import { getActiveProgram, getWeeklySchedule } from "../../data/plan.js";
import { todayKey, dateKey, daysBetween, allDayKeys, esc } from "../../lib/format.js";
import { showToast } from "../../components/toast.js";
import { openGymDateDaySheet } from "./session-sheet.js";
import { openSplitManagerSheet } from "./plan-editor.js";
import { getWeeklyVolume } from "../../lib/calc.js";
import { getOverloadSuggestion } from "../../lib/progression.js";

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
  wireOverloadToggleEvents(document);
}

export function buildOverloadAdviceBadgeHTML(ex, lastSets) {
  if (!ex || !ex.id) return '';
  var advice = getOverloadSuggestion(ex.id, ex, lastSets || [], ex.name || '');
  if (!advice) return '';

  var label = 'Overload Advice';
  if (advice.type === 'increase_weight') {
    label = '↑ Increase Weight';
  } else if (advice.type === 'add_reps') {
    label = '+ Add Reps';
  } else if (advice.type === 'science_rec') {
    label = advice.suggestedWeight ? ('Target: ~' + advice.suggestedWeight + ' kg') : 'Target Advice';
  } else if (advice.type === 'baseline') {
    label = 'Target: Baseline';
  }

  var safeId = esc(ex.id);
  return '<div class="overload-hint-wrap">'
    + '<button type="button" class="overload-chip-btn" data-toggle-overload="' + safeId + '" aria-expanded="false" aria-controls="overload-rationale-' + safeId + '">'
    + '<span>' + esc(label) + '</span>'
    + '<span class="overload-arrow">▾</span>'
    + '</button>'
    + '<div id="overload-rationale-' + safeId + '" class="overload-rationale" style="display:none">'
    + (advice.bannerHTML || '')
    + '</div>'
    + '</div>';
}

export function wireOverloadToggleEvents(container) {
  var root = container || (typeof document !== 'undefined' ? document : null);
  if (!root || typeof root.querySelectorAll !== 'function') return;
  var btns = root.querySelectorAll('[data-toggle-overload]');
  btns.forEach(function(btn) {
    btn.onclick = function(e) {
      if (e && e.preventDefault) e.preventDefault();
      var id = btn.dataset.toggleOverload;
      var el = (typeof document !== 'undefined' && document.getElementById('overload-rationale-' + id));
      if (!el) return;
      var isHidden = el.style.display === 'none' || !el.style.display;
      el.style.display = isHidden ? 'block' : 'none';
      btn.classList.toggle('is-open', isHidden);
      btn.setAttribute('aria-expanded', isHidden ? 'true' : 'false');
    };
  });
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
