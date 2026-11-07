/* Day detail bottom sheet for rest and skipped days in History */

import { dayRecord } from "../../storage.js";
import { getWeightHistory } from "./charts.js";
import { scheduledSessionFor } from "../../lib/schedule.js";
import { getDayTotals, getTargetsForDate } from "../../lib/calc.js";
import { todayKey, esc } from "../../lib/format.js";
import { closeSheet, enableSheetSwipeDismiss } from "../../components/sheet.js";
import { triggerHaptic } from "../../lib/dom.js";
import { profile, setTab } from "../../state.js";

function formatSheetDate(dateStr) {
  var d = new Date(dateStr + 'T00:00:00');
  var weekday = d.toLocaleDateString('en-GB', { weekday: 'short' });
  var day = d.getDate();
  var month = d.toLocaleDateString('en-GB', { month: 'short' });
  return weekday + ' ' + day + ' ' + month;
}

export function openDayDetailSheet(dateKey) {
  if (!dateKey) return;
  var existing = document.getElementById('dayDetailOverlay');
  if (existing && typeof existing.remove === 'function') existing.remove();

  var curDateKey = dateKey.slice(0, 10);
  var dayObj = new Date(curDateKey + 'T00:00:00');
  var dateTitle = formatSheetDate(curDateKey);
  var tKey = todayKey();

  var profileTrainingDays = (profile && profile.trainingDays) || [1, 2, 3, 5, 6];
  var isSched = profileTrainingDays.includes(dayObj.getDay());
  var isSkipped = isSched && curDateKey <= tKey;

  var statusChipHTML = isSkipped
    ? '<span style="display:inline-flex;align-items:center;padding:4px 10px;border-radius:9999px;font-size:11px;font-weight:600;background:rgba(255,77,79,0.15);color:#FF4D4F;text-transform:uppercase;letter-spacing:0.04em">Skipped</span>'
    : '<span style="display:inline-flex;align-items:center;padding:4px 10px;border-radius:9999px;font-size:11px;font-weight:600;background:var(--surface-raised);color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.04em">Rest</span>';

  var sched = scheduledSessionFor(curDateKey);
  var plannedHTML = '';
  if (!sched.isRest && sched.session) {
    var pName = sched.cleanName || sched.label || 'Workout';
    plannedHTML = '<div style="margin-top:12px;padding:12px 14px;background:var(--surface-raised);border-radius:12px;border:1px solid var(--hairline)">'
      + '<div style="font-size:11px;font-weight:600;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.04em">Planned workout</div>'
      + '<div style="font-size:15px;font-weight:600;color:var(--text);margin-top:2px">' + esc(pName) + '</div>'
      + '</div>';
  }

  var totals = getDayTotals(curDateKey);
  var targets = getTargetsForDate(curDateKey);
  var nutritionHTML = '';
  if (totals.kcal > 0 || totals.protein > 0) {
    nutritionHTML = '<div style="margin-top:10px;padding:12px 14px;background:var(--surface-raised);border-radius:12px;border:1px solid var(--hairline)">'
      + '<div style="font-size:11px;font-weight:600;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.04em;margin-bottom:8px">Nutrition vs Targets</div>'
      + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">'
        + '<div><span style="font-size:11px;color:var(--text-secondary)">Calories</span><div style="font-size:15px;font-weight:600;color:var(--text);font-variant-numeric:tabular-nums">' + totals.kcal + ' / ' + targets.kcal + ' <span style="font-size:11px;font-weight:400;color:var(--text-secondary)">kcal</span></div></div>'
        + '<div><span style="font-size:11px;color:var(--text-secondary)">Protein</span><div style="font-size:15px;font-weight:600;color:var(--text);font-variant-numeric:tabular-nums">' + Math.round(totals.protein) + ' / ' + Math.round(targets.protein) + ' <span style="font-size:11px;font-weight:400;color:var(--text-secondary)">g</span></div></div>'
      + '</div>'
      + '</div>';
  } else {
    nutritionHTML = '<div style="margin-top:10px;padding:12px 14px;background:var(--surface-raised);border-radius:12px;border:1px solid var(--hairline);display:flex;justify-content:space-between;align-items:center">'
      + '<span style="font-size:11px;font-weight:600;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.04em">Nutrition</span>'
      + '<span style="font-size:11px;color:var(--text-secondary)">Nothing logged</span>'
      + '</div>';
  }

  var rec = dayRecord(curDateKey);
  var weightEntries = getWeightHistory ? getWeightHistory() : [];
  var matchW = weightEntries.find(function(e) {
    var k = e.dayKey || (e.createdAt && e.createdAt.slice(0, 10));
    return k === curDateKey;
  });
  var loggedWeight = (rec && rec.weight != null) ? rec.weight : (matchW ? matchW.weight : null);
  var weightHTML = '';
  if (loggedWeight != null) {
    weightHTML = '<div style="margin-top:10px;padding:12px 14px;background:var(--surface-raised);border-radius:12px;border:1px solid var(--hairline);display:flex;justify-content:space-between;align-items:center">'
      + '<span style="font-size:11px;font-weight:600;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.04em">Bodyweight</span>'
      + '<span style="font-size:15px;font-weight:600;color:var(--text);font-variant-numeric:tabular-nums">' + Number(loggedWeight).toFixed(1) + ' <span style="font-size:11px;font-weight:400;color:var(--text-secondary)">kg</span></span>'
      + '</div>';
  }

  var overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.id = 'dayDetailOverlay';
  overlay.style.zIndex = '320';

  overlay.innerHTML = '<div class="sheet" style="background:#141416;border:none;border-radius:24px 24px 0 0;padding:20px 20px calc(24px + var(--safe-b));max-width:480px;width:100%">'
    + '<div class="sheet-handle"></div>'
    + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">'
      + '<div style="display:flex;align-items:center;gap:10px">'
        + '<div style="font-size:28px;font-weight:600;color:var(--text);line-height:1.15">' + esc(dateTitle) + '</div>'
        + statusChipHTML
      + '</div>'
      + '<button type="button" class="btn-text-action" id="closeDayDetailBtn" style="font-size:15px;color:var(--text-secondary);font-weight:600;background:none;border:none;cursor:pointer;padding:4px 8px">Close</button>'
    + '</div>'
    + plannedHTML
    + nutritionHTML
    + weightHTML
    + '<div style="margin-top:20px;display:flex;flex-direction:column;gap:10px">'
      + '<button type="button" class="btn-text-action" id="sheetLateLogBtn" style="width:100%;min-height:48px;border-radius:12px;background:var(--lime);color:var(--bg);font-size:15px;font-weight:600;cursor:pointer;border:none;display:flex;align-items:center;justify-content:center">Log workout late</button>'
      + '<button type="button" class="btn-text-action" id="sheetOpenTodayBtn" style="width:100%;min-height:48px;border-radius:12px;background:var(--surface-raised);color:var(--text);border:1px solid var(--hairline);font-size:15px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center">Open in Today</button>'
    + '</div>'
    + '</div>';

  document.body.appendChild(overlay);
  enableSheetSwipeDismiss(overlay);

  var closeBtn = overlay.querySelector('#closeDayDetailBtn');
  if (closeBtn) closeBtn.onclick = function() { triggerHaptic(); closeSheet(overlay); };

  function cleanupModals() {
    closeSheet(overlay);
    var archive = document.getElementById('historyArchiveOverlay');
    if (archive && typeof archive.remove === 'function') archive.remove();
  }

  var lateBtn = overlay.querySelector('#sheetLateLogBtn');
  if (lateBtn) {
    lateBtn.onclick = function() {
      triggerHaptic();
      cleanupModals();
      window.activeGymDateKey = curDateKey;
      if (typeof setTab === 'function') setTab('gym');
      if (typeof window !== 'undefined' && typeof window.setTab === 'function') window.setTab('gym');
      if (typeof window !== 'undefined' && typeof window.renderTab === 'function') window.renderTab();
      else if (typeof window !== 'undefined' && typeof window.renderApp === 'function') window.renderApp();
    };
  }

  var todayBtn = overlay.querySelector('#sheetOpenTodayBtn');
  if (todayBtn) {
    todayBtn.onclick = function() {
      triggerHaptic();
      cleanupModals();
      window.activeTodaySelectedDateKey = curDateKey;
      if (typeof setTab === 'function') setTab('today');
      if (typeof window !== 'undefined' && typeof window.setTab === 'function') window.setTab('today');
      if (typeof window !== 'undefined' && typeof window.renderTab === 'function') window.renderTab();
      else if (typeof window !== 'undefined' && typeof window.renderApp === 'function') window.renderApp();
    };
  }

  overlay.onclick = function(e) { if (e.target === overlay) { triggerHaptic(); closeSheet(overlay); } };
}
