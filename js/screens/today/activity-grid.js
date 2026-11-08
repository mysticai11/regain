/* Activity Intelligence Grid: 2x2 grid displaying steps, active burn, weight, and weekly sets */

import { ic } from "../../lib/dom.js";
import { esc } from "../../lib/format.js";
import { saveDayRecord, dayRecord } from "../../storage.js";
import { showToast } from "../../components/toast.js";
import { promptDialog } from "../../components/dialog.js";

export function buildActivityInsightHTML(stepBurn, workoutBurn) {
  var earned = (Number(stepBurn) || 0) + (Number(workoutBurn) || 0);
  if (earned <= 100) return '';
  return '<div class="metric-card" style="margin:0 auto 16px auto;padding:8px 16px;font-size:12px;border-radius:999px;display:flex;align-items:center;justify-content:center;gap:8px;width:fit-content;max-width:100%;box-sizing:border-box">'
    + '<div style="width:20px;height:20px;border-radius:6px;background:rgba(139,92,246,0.15);color:var(--accent-primary);display:flex;align-items:center;justify-content:center;box-shadow:var(--icon-glow-violet);flex-shrink:0">'
      + ic('flame', 12)
    + '</div>'
    + '<span style="font-size:12px;font-weight:600;color:var(--accent-primary);letter-spacing:0.02em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">You earned +' + earned.toLocaleString() + ' kcal from activity today!</span>'
  + '</div>';
}

export function buildActivityGridHTML(data) {
  var d = data || {};
  var steps = Number(d.steps) || 0;
  var totalBurn = d.totalBurn || { bmr: 1800, stepBurn: 0, workoutBurn: 0, totalBurn: 1800 };
  var currentW = d.currentWeightKg != null ? Number(d.currentWeightKg) : null;
  var avgW = d.weightAvg != null ? Number(d.weightAvg) : null;
  var weeklySets = Number(d.weeklySets) || 0;

  var activeBurnKcal = (totalBurn.stepBurn || 0) + (totalBurn.workoutBurn || 0);
  var burnDisplay = activeBurnKcal > 0 ? activeBurnKcal.toLocaleString() + ' kcal' : totalBurn.totalBurn.toLocaleString() + ' kcal';
  var burnSubtext = activeBurnKcal > 0 ? 'Steps & Workouts' : 'Daily Energy Burn';

  var weightDisplay = currentW != null ? currentW.toFixed(1) + ' kg' : '--';
  var weightSubtext = avgW != null ? ('7d avg: ' + avgW.toFixed(1) + ' kg') : 'Trend stable';

  return '<div class="activity-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:16px 0;margin-bottom:24px">'
    /* Card 1: Steps */
    + '<div class="metric-card" id="activityCardSteps" style="padding:16px;cursor:pointer;min-width:0;box-sizing:border-box">'
      + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">'
        + '<div style="width:32px;height:32px;border-radius:10px;background:rgba(139,92,246,0.15);color:var(--accent-primary);display:flex;align-items:center;justify-content:center;box-shadow:var(--icon-glow-violet);flex-shrink:0">'
          + ic('bolt', 16)
        + '</div>'
        + '<button type="button" id="editTodayStepsBtn" class="pill-toggle" style="font-size:11px;color:var(--accent-primary);background:rgba(139,92,246,0.12);border:1px solid rgba(139,92,246,0.25);border-radius:9999px;padding:3px 8px;cursor:pointer;font-weight:600;letter-spacing:0.04em">Edit</button>'
      + '</div>'
      + '<div style="font-size:var(--fs-caption);font-weight:600;letter-spacing:0.08em;color:var(--text-secondary);text-transform:uppercase;margin-bottom:4px">STEPS</div>'
      + '<div style="font-size:var(--fs-28);font-weight:700;color:var(--text);line-height:1.1;font-variant-numeric:tabular-nums;margin-bottom:6px">'
        + steps.toLocaleString()
      + '</div>'
      + '<div style="display:flex;align-items:center;justify-content:space-between;margin-top:2px">'
        + '<span style="font-size:var(--fs-caption);color:var(--text-secondary)">Goal: 10,000</span>'
        + '<span style="font-size:11px;font-weight:700;color:var(--accent-primary);display:inline-flex;align-items:center;gap:3px;background:rgba(139,92,246,0.12);padding:2px 8px;border-radius:6px">↑ 10k goal</span>'
      + '</div>'
    + '</div>'

    /* Card 2: Active Burn */
    + '<div class="metric-card" style="padding:16px;min-width:0;box-sizing:border-box">'
      + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">'
        + '<div style="width:32px;height:32px;border-radius:10px;background:rgba(56,189,248,0.15);color:var(--accent-secondary);display:flex;align-items:center;justify-content:center;box-shadow:var(--icon-glow-blue);flex-shrink:0">'
          + ic('flame', 16)
        + '</div>'
      + '</div>'
      + '<div style="font-size:var(--fs-caption);font-weight:600;letter-spacing:0.08em;color:var(--accent-secondary);text-transform:uppercase;margin-bottom:4px">ACTIVE BURN</div>'
      + '<div style="font-size:24px;white-space:nowrap;font-weight:700;color:var(--text);line-height:1.1;font-variant-numeric:tabular-nums;margin-bottom:6px">'
        + burnDisplay
      + '</div>'
      + '<div style="font-size:var(--fs-caption);color:var(--text-secondary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(burnSubtext) + '</div>'
    + '</div>'

    /* Card 3: Weight */
    + '<div class="metric-card" id="activityCardWeight" style="padding:16px;cursor:pointer;min-width:0;box-sizing:border-box">'
      + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">'
        + '<div style="width:32px;height:32px;border-radius:10px;background:rgba(139,92,246,0.15);color:var(--accent-primary);display:flex;align-items:center;justify-content:center;box-shadow:var(--icon-glow-violet);flex-shrink:0">'
          + ic('trend_up', 16)
        + '</div>'
        + '<span class="pill-toggle" style="font-size:11px;color:var(--accent-primary);background:rgba(139,92,246,0.12);border:1px solid rgba(139,92,246,0.25);border-radius:9999px;padding:3px 8px;font-weight:600;letter-spacing:0.04em">Log</span>'
      + '</div>'
      + '<div style="font-size:var(--fs-caption);font-weight:600;letter-spacing:0.08em;color:var(--text-secondary);text-transform:uppercase;margin-bottom:4px">BODYWEIGHT</div>'
      + '<div style="font-size:var(--fs-28);font-weight:700;color:var(--text);line-height:1.1;font-variant-numeric:tabular-nums;margin-bottom:6px">'
        + esc(weightDisplay)
      + '</div>'
      + '<div style="display:flex;align-items:center;justify-content:space-between;margin-top:2px">'
        + '<span style="font-size:var(--fs-caption);color:var(--text-secondary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(weightSubtext) + '</span>'
        + '<span style="font-size:11px;font-weight:700;color:var(--accent-primary);display:inline-flex;align-items:center;gap:2px;background:rgba(139,92,246,0.12);padding:2px 8px;border-radius:6px">↑ +0.2 kg/wk</span>'
      + '</div>'
    + '</div>'

    /* Card 4: Workouts / Weekly Sets */
    + '<div class="metric-card" style="padding:16px;min-width:0;box-sizing:border-box">'
      + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">'
        + '<div style="width:32px;height:32px;border-radius:10px;background:rgba(139,92,246,0.15);color:var(--accent-primary);display:flex;align-items:center;justify-content:center;box-shadow:var(--icon-glow-violet);flex-shrink:0">'
          + ic('chart', 16)
        + '</div>'
      + '</div>'
      + '<div style="font-size:var(--fs-caption);font-weight:600;letter-spacing:0.08em;color:var(--text-secondary);text-transform:uppercase;margin-bottom:4px">WEEKLY SETS</div>'
      + '<div style="font-size:var(--fs-28);font-weight:700;color:var(--text);line-height:1.1;font-variant-numeric:tabular-nums;margin-bottom:6px">'
        + weeklySets + (weeklySets === 1 ? ' set' : ' sets')
      + '</div>'
      + '<div style="font-size:var(--fs-caption);color:var(--text-secondary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">Completed this week</div>'
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
    promptDialog({
      title: 'Log Today\'s Steps',
      message: 'Enter your total step count for today:',
      defaultValue: cur,
      inputType: 'number',
      placeholder: 'e.g. 10000',
      confirmLabel: 'Save',
      cancelLabel: 'Cancel'
    }).then(function(input) {
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
    });
  };

  if (editBtn) editBtn.onclick = handleEdit;

  var weightCard = (typeof container.querySelector === 'function')
    ? container.querySelector('#activityCardWeight')
    : ((typeof document !== 'undefined' && typeof document.getElementById === 'function') ? document.getElementById('activityCardWeight') : null);
  if (weightCard && typeof options.onOpenWeightModal === 'function') {
    weightCard.onclick = function() { options.onOpenWeightModal(); };
  }
}
