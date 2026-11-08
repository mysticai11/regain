/* Workout override sheet for selecting alternative workout routine or rest day */

import { dayRecord, saveDayRecord } from "../../storage.js";
import { getActiveProgram, getWeeklySchedule } from "../../data/plan.js";
import { esc } from "../../lib/format.js";
import { showToast } from "../../components/toast.js";

function triggerRenderScreens() {
  if (typeof window !== 'undefined') {
    if (typeof window.renderTodaySimple === 'function') window.renderTodaySimple();
    if (typeof window.renderGym === 'function') window.renderGym();
    if (typeof window.renderTab === 'function') window.renderTab();
  }
}

export function openWorkoutOverrideSheet(dKey) {
  var overlay = document.createElement('div');
  overlay.className = 'overlay';
  var dObj = new Date(dKey + 'T00:00:00');
  var formatted = dObj.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  var title = 'Choose workout for ' + formatted;

  var prog = getActiveProgram();
  var d = dObj.getDay();
  var dayNum = d === 0 ? 7 : d;
  var weeklySched = getWeeklySchedule();
  var matchedSched = weeklySched.find(function(s){ return s.dayNum === dayNum; });
  var suggestedWorkoutIdx = (matchedSched && !matchedSched.isRest) ? matchedSched.workoutIndex : null;

  var targetRec = dayRecord(dKey);
  var hasOverride = targetRec && targetRec.selectedWorkout !== undefined;
  var currentSelection = hasOverride ? targetRec.selectedWorkout : suggestedWorkoutIdx;

  var workoutRows = prog.map(function(s, idx) {
    var cleanLabel = (s.label || '').replace(/^Day\s*\d+\s*[·•—-]\s*/i, '').trim();
    if (/^Day\s*\d+$/i.test(cleanLabel)) cleanLabel = '';
    var labelText = cleanLabel ? ('Day ' + (idx + 1) + ' · ' + esc(cleanLabel)) : ('Day ' + (idx + 1));
    var isSuggested = (suggestedWorkoutIdx === idx);
    var isSelected = (currentSelection === idx);
    return '<div class="list-row" data-choose-plan-idx="' + idx + '" style="height:56px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--hairline);cursor:pointer;padding:0">'
      + '<span style="font-size:17px;font-weight:600;color:' + (isSelected ? 'var(--text)' : 'var(--text-secondary)') + '">' + labelText + '</span>'
      + '<div style="display:flex;align-items:center;gap:8px">'
        + (isSuggested ? '<span style="font-size:11px;font-weight:600;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.08em">Suggested</span>' : '')
        + (isSelected ? '<span style="color:var(--text);font-weight:700">✓</span>' : '')
      + '</div>'
      + '</div>';
  }).join('');

  var isRestSuggested = (suggestedWorkoutIdx === null);
  var isRestSelected = (currentSelection === null);
  var restRow = '<div class="list-row" data-choose-plan-idx="rest" style="height:56px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--hairline);cursor:pointer;padding:0">'
    + '<span style="font-size:17px;font-weight:600;color:' + (isRestSelected ? 'var(--text)' : 'var(--text-secondary)') + '">Rest day</span>'
    + '<div style="display:flex;align-items:center;gap:8px">'
      + (isRestSuggested ? '<span style="font-size:11px;font-weight:600;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.08em">Suggested</span>' : '')
      + (isRestSelected ? '<span style="color:var(--text);font-weight:700">✓</span>' : '')
    + '</div>'
    + '</div>';

  var resetActionHTML = hasOverride
    ? '<button type="button" class="btn-text-action" id="sheetResetBtn" style="color:var(--text-secondary);font-size:15px;background:none;border:none;padding:16px 0 0;cursor:pointer;text-align:left">Reset to suggested</button>'
    : '';

  overlay.innerHTML = '<div class="sheet" style="background:var(--surface);border-radius:20px 20px 0 0;padding:20px 20px calc(24px + var(--safe-b));max-width:480px;width:100%">'
    + '<div class="sheet-handle"></div>'
    + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">'
      + '<div style="font-size:28px;font-weight:600;color:var(--text);line-height:1.15">' + esc(title) + '</div>'
      + '<button type="button" class="btn-text-action" id="closeOverrideSheetBtn" style="font-size:15px;color:var(--text-secondary);background:none;border:none;padding:0;cursor:pointer">Close</button>'
    + '</div>'
    + '<div>' + workoutRows + restRow + '</div>'
    + resetActionHTML
    + '</div>';

  document.body.appendChild(overlay);

  overlay.querySelector('#closeOverrideSheetBtn').onclick = function() { overlay.remove(); };
  overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };

  overlay.querySelectorAll('[data-choose-plan-idx]').forEach(function(row) {
    row.onclick = function() {
      var val = row.dataset.choosePlanIdx;
      targetRec = dayRecord(dKey);
      if (val === 'rest') {
        targetRec.selectedWorkout = null;
      } else {
        targetRec.selectedWorkout = parseInt(val, 10);
        if (targetRec.workoutDone) {
          targetRec.workoutDone = false;
        }
      }
      saveDayRecord(dKey, targetRec);
      if (typeof window !== 'undefined') window.activeExpandedExId = null;
      overlay.remove();
      triggerRenderScreens();
      showToast('Workout updated for ' + formatted, 'ok');
    };
  });

  var rBtn = overlay.querySelector('#sheetResetBtn');
  if (rBtn) {
    rBtn.onclick = function() {
      targetRec = dayRecord(dKey);
      delete targetRec.selectedWorkout;
      saveDayRecord(dKey, targetRec);
      if (typeof window !== 'undefined') window.activeExpandedExId = null;
      overlay.remove();
      triggerRenderScreens();
      showToast('Reset to suggested workout', 'ok');
    };
  }
}

