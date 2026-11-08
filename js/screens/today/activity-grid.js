/* Activity Intelligence Grid: 2x2 grid displaying steps, active burn, weight, and weekly sets */

import { renderSparklineSVG } from "../../ui/sparkline.js";
import { ic } from "../../lib/dom.js";
import { esc } from "../../lib/format.js";
import { saveDayRecord, dayRecord } from "../../storage.js";
import { showToast } from "../../components/toast.js";

export function buildActivityInsightHTML(stepBurn, workoutBurn) {
  var earned = (Number(stepBurn) || 0) + (Number(workoutBurn) || 0);
  if (earned <= 100) return '';
  return '<div class="metric-card" style="margin-bottom:16px;padding:12px 16px;display:flex;align-items:center;gap:10px">'
    + '<span style="color:var(--accent-primary);display:inline-flex">' + ic('flame', 18) + '</span>'
    + '<span style="font-size:var(--fs-caption);font-weight:600;color:var(--accent-primary);letter-spacing:0.02em">You earned +' + earned.toLocaleString() + ' kcal from activity today!</span>'
  + '</div>';
}

export function buildActivityGridHTML(data) {
  var d = data || {};
  var steps = Number(d.steps) || 0;
  var totalBurn = d.totalBurn || { bmr: 1800, stepBurn: 0, workoutBurn: 0, totalBurn: 1800 };
  var currentW = d.currentWeightKg != null ? Number(d.currentWeightKg) : null;
  var avgW = d.weightAvg != null ? Number(d.weightAvg) : null;
  var weeklySets = Number(d.weeklySets) || 0;
  var stepHistory = Array.isArray(d.stepHistory) && d.stepHistory.length > 0 ? d.stepHistory : [steps * 0.8, steps * 0.9, steps];

  var stepSparkline = renderSparklineSVG(stepHistory, { width: 48, height: 16, stroke: 'var(--accent-secondary)', gradient: true });

  var activeBurnKcal = (totalBurn.stepBurn || 0) + (totalBurn.workoutBurn || 0);
  var burnDisplay = activeBurnKcal > 0 ? activeBurnKcal.toLocaleString() + ' kcal' : totalBurn.totalBurn.toLocaleString() + ' kcal';
  var burnSubtext = activeBurnKcal > 0 ? 'BMR (' + totalBurn.bmr + ') + Act' : 'BMR + Activity';

  var weightDisplay = currentW != null ? currentW.toFixed(1) + ' kg' : '--';
  var weightSubtext = avgW != null ? ('7d avg: ' + avgW.toFixed(1) + ' kg') : 'Trend stable';

  return '<div class="activity-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:24px">'
    /* Card 1: Steps */
    + '<div class="metric-card" id="activityCardSteps" style="padding:14px 16px;cursor:pointer">'
      + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">'
        + '<span style="font-size:var(--fs-caption);font-weight:600;letter-spacing:0.06em;color:var(--text-secondary);text-transform:uppercase">STEPS</span>'
        + '<button type="button" id="editTodayStepsBtn" class="btn-text-action" style="font-size:var(--fs-caption);color:var(--accent-primary);background:none;border:none;padding:0;cursor:pointer;font-weight:600">Edit</button>'
      + '</div>'
      + '<div style="font-size:var(--fs-28);font-weight:700;color:var(--text);line-height:1.1;font-variant-numeric:tabular-nums;margin-bottom:6px">'
        + steps.toLocaleString()
      + '</div>'
      + '<div style="display:flex;align-items:center;justify-content:space-between">'
        + '<span style="font-size:var(--fs-caption);color:var(--text-secondary)">Goal: 10,000</span>'
        + stepSparkline
      + '</div>'
    + '</div>'

    /* Card 2: Active Burn */
    + '<div class="metric-card" style="padding:14px 16px">'
      + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">'
        + '<span style="font-size:var(--fs-caption);font-weight:600;letter-spacing:0.06em;color:var(--accent-secondary);text-transform:uppercase">ACTIVE BURN</span>'
        + '<span style="color:var(--accent-secondary);display:inline-flex">' + ic('flame', 14) + '</span>'
      + '</div>'
      + '<div style="font-size:var(--fs-28);font-weight:700;color:var(--text);line-height:1.1;font-variant-numeric:tabular-nums;margin-bottom:6px">'
        + burnDisplay
      + '</div>'
      + '<div style="font-size:var(--fs-caption);color:var(--text-secondary)">' + esc(burnSubtext) + '</div>'
    + '</div>'

    /* Card 3: Weight */
    + '<div class="metric-card" style="padding:14px 16px">'
      + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">'
        + '<span style="font-size:var(--fs-caption);font-weight:600;letter-spacing:0.06em;color:var(--text-secondary);text-transform:uppercase">BODYWEIGHT</span>'
        + '<span style="color:var(--text-secondary);display:inline-flex">' + ic('trend_up', 14) + '</span>'
      + '</div>'
      + '<div style="font-size:var(--fs-28);font-weight:700;color:var(--text);line-height:1.1;font-variant-numeric:tabular-nums;margin-bottom:6px">'
        + esc(weightDisplay)
      + '</div>'
      + '<div style="font-size:var(--fs-caption);color:var(--text-secondary)">' + esc(weightSubtext) + '</div>'
    + '</div>'

    /* Card 4: Workouts / Weekly Sets */
    + '<div class="metric-card" style="padding:14px 16px">'
      + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">'
        + '<span style="font-size:var(--fs-caption);font-weight:600;letter-spacing:0.06em;color:var(--text-secondary);text-transform:uppercase">WEEKLY SETS</span>'
        + '<span style="color:var(--text-secondary);display:inline-flex">' + ic('chart', 14) + '</span>'
      + '</div>'
      + '<div style="font-size:var(--fs-28);font-weight:700;color:var(--text);line-height:1.1;font-variant-numeric:tabular-nums;margin-bottom:6px">'
        + weeklySets + (weeklySets === 1 ? ' set' : ' sets')
      + '</div>'
      + '<div style="font-size:var(--fs-caption);color:var(--text-secondary)">Completed this week</div>'
    + '</div>'
  + '</div>';
}

export function bindActivityGridEvents(container, opts) {
  if (!container) return;
  var options = opts || {};
  var dateKey = options.dateKey;
  var rec = options.rec || dayRecord(dateKey);
  var onUpdate = options.onUpdate;

  var editBtn = (typeof container.querySelector === 'function')
    ? container.querySelector('#editTodayStepsBtn')
    : ((typeof document !== 'undefined' && typeof document.getElementById === 'function') ? document.getElementById('editTodayStepsBtn') : null);

  var handleEdit = function(e) {
    if (e) e.stopPropagation();
    var cur = (rec && rec.steps != null) ? rec.steps : '';
    var input = prompt('Enter total steps for today:', cur);
    if (input == null) return;
    var parsed = parseInt(String(input).replace(/[^0-9]/g, ''), 10);
    if (isNaN(parsed) || parsed < 0) {
      showToast('Please enter a valid step count', 'warn');
      return;
    }
    rec.steps = parsed;
    saveDayRecord(dateKey, rec);
    showToast('Steps updated: ' + parsed.toLocaleString(), 'ok');
    if (typeof onUpdate === 'function') onUpdate();
  };

  if (editBtn) editBtn.onclick = handleEdit;
}
