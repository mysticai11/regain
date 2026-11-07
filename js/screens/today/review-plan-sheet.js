/* Bottom sheet displaying applied catch-up weekly schedule and plan reset option */

import { getCatchupDecisions, getWeekOverrides, saveWeekOverrides, CATCHUP_DECISIONS_KEY } from "../../storage-catchup.js";
import { getWeekDays, scheduledSessionFor, canonicalSessionName, sessionSetCount } from "../../lib/schedule.js";
import { getActiveProgram } from "../../data/plan.js";
import { dayRecord, saveDayRecord, sv } from "../../storage.js";
import { todayKey, esc } from "../../lib/format.js";
import { showToast } from "../../components/toast.js";
import { confirmDialog } from "../../components/dialog.js";
import { closeSheet, enableSheetSwipeDismiss } from "../../components/sheet.js";
import { triggerHaptic } from "../../lib/dom.js";

export function openThisWeeksPlanSheet(options) {
  options = options || {};
  var tKey = options.currentDateKey || todayKey();
  var refreshCallback = options.refreshCallback;
  var weekDays = getWeekDays(tKey);
  var decisions = getCatchupDecisions();
  var overrides = getWeekOverrides();
  var prog = getActiveProgram();

  var appliedDate = weekDays.find(function(d) {
    return decisions[d] === 'spread' || decisions[d] === 'slid' || decisions[d] === 'merged';
  });
  if (!appliedDate) {
    showToast('No active catch-up plan', 'warn');
    return;
  }
  var appliedDec = decisions[appliedDate];
  var missedObj = new Date(appliedDate + 'T00:00:00');
  var missedDayName = missedObj.toLocaleDateString('en-GB', { weekday: 'short' });

  var rowsHTML = weekDays.map(function(d) {
    var dObj = new Date(d + 'T00:00:00');
    var dayShort = dObj.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
    var isToday = d === tKey;
    var rec = dayRecord(d);
    var sched = scheduledSessionFor(d, { prog: prog, weekOverrides: overrides });

    var badgeHTML = '';
    var noteHTML = '';
    var metaSummary = '';
    var workoutTitle = 'Rest Day';

    if (appliedDec === 'merged' && (rec.isMerged || (rec.workoutSession && rec.workoutSession.isMerged))) {
      badgeHTML = '<span style="font-size:11px;font-weight:600;color:var(--bg);background:var(--lime);border-radius:9999px;padding:2px 8px;margin-left:6px">Merged</span>';
      noteHTML = '<div style="font-size:11px;color:var(--lime);margin-top:2px">+ exercises merged from ' + esc(missedDayName) + '</div>';
    } else if (d === appliedDate && (appliedDec === 'slid' || appliedDec === 'merged')) {
      badgeHTML = '<span style="font-size:11px;font-weight:600;color:var(--text-secondary);background:var(--surface-raised);border-radius:9999px;padding:2px 8px;margin-left:6px">Missed</span>';
    }

    if (!sched.isRest && sched.session) {
      workoutTitle = canonicalSessionName(sched.session);
      var exCount = (sched.session.exercises || []).length;
      var setCount = sessionSetCount(sched.session, rec);
      metaSummary = exCount + ' ex · ' + setCount + ' sets';
    } else {
      workoutTitle = 'Rest';
      metaSummary = 'Recovery';
    }

    var cardBorder = isToday ? '1px solid var(--lime)' : '1px solid var(--hairline)';

    return '<div class="plan-preview-day-card" style="background:var(--surface-raised);border:' + cardBorder + ';border-radius:12px;padding:12px 14px;display:flex;justify-content:space-between;align-items:center">'
      + '<div style="flex:1;min-width:0">'
        + '<div style="display:flex;align-items:center;flex-wrap:wrap;gap:4px">'
          + '<span style="font-size:11px;font-weight:600;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.08em">' + esc(dayShort) + '</span>'
          + badgeHTML
        + '</div>'
        + '<div style="font-size:15px;font-weight:600;color:var(--text);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(workoutTitle) + '</div>'
        + noteHTML
      + '</div>'
      + '<div style="flex:none;font-size:var(--fs-13);color:var(--text-secondary);text-align:right;margin-left:8px">' + esc(metaSummary) + '</div>'
    + '</div>';
  }).join('');

  var overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.id = 'reviewPlanOverlay';
  overlay.style.zIndex = '300';

  overlay.innerHTML = '<div class="sheet" style="background:#141416;border:none;border-radius:20px 20px 0 0;padding:20px 20px calc(24px + var(--safe-b));max-width:480px;width:100%">'
    + '<div class="sheet-handle"></div>'
    + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">'
      + '<div style="font-size:28px;font-weight:600;color:var(--text);line-height:1.15">This week\'s plan</div>'
      + '<button type="button" class="btn-text-action" id="closePlanReviewBtn" style="font-size:15px;color:var(--text-secondary);font-weight:600;background:none;border:none;cursor:pointer;padding:4px 8px">Close</button>'
    + '</div>'
    + '<div style="display:flex;flex-direction:column;gap:8px;max-height:55vh;overflow-y:auto;margin-bottom:16px">'
      + rowsHTML
    + '</div>'
    + '<button type="button" class="btn-text-action" id="resetWeekPlanBtn" style="width:100%;min-height:48px;border-radius:12px;background:none;border:1px solid rgba(255, 77, 79, 0.4);color:#FF4D4F;font-size:15px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center">'
      + 'Reset plan'
    + '</button>'
  + '</div>';

  document.body.appendChild(overlay);
  enableSheetSwipeDismiss(overlay);

  var closeBtn = overlay.querySelector('#closePlanReviewBtn');
  if (closeBtn) closeBtn.onclick = function() { triggerHaptic(); closeSheet(overlay); };
  overlay.onclick = function(e) { if (e.target === overlay) closeSheet(overlay); };

  var resetBtn = overlay.querySelector('#resetWeekPlanBtn');
  if (resetBtn) {
    resetBtn.onclick = async function() {
      triggerHaptic();
      var ok = await confirmDialog({
        title: "Reset this week's plan?",
        message: "Your schedule will return to normal. Workouts you already logged will not be changed, but the missed-workout prompt will return if that day is still in this week.",
        confirmLabel: "Reset plan",
        cancelLabel: "Keep plan",
        destructive: true
      });
      if (ok) {
        saveWeekOverrides({});
        var curDecisions = getCatchupDecisions();
        delete curDecisions[appliedDate];
        sv(CATCHUP_DECISIONS_KEY, curDecisions);
        weekDays.forEach(function(d) {
          var r = dayRecord(d);
          if (r && (r.isMerged || r.catchupFrom)) {
            delete r.isMerged;
            delete r.catchupFrom;
            saveDayRecord(d, r, { silent: true });
          }
        });
        closeSheet(overlay);
        if (typeof refreshCallback === 'function') refreshCallback();
        showToast('Plan reset', 'ok');
      }
    };
  }
}
