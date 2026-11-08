/* Catch-up resolution card and merge preview sheet for Today screen */

import { detectMissedDay, planSlide, planSpreadAcrossWeek, buildMergedSession } from "../../lib/catchup.js";
import { getWeekOverrides, saveWeekOverrides, getCatchupDecisions, setCatchupDecision, getCatchupSettings } from "../../storage-catchup.js";
import { scheduledSessionFor, canonicalSessionName, canonicalSessionLabel } from "../../lib/schedule.js";
import { getActiveProgram, getWeeklySchedule } from "../../data/plan.js";
import { dayRecord, saveDayRecord, allDayKeys } from "../../storage.js";
import { todayKey, esc } from "../../lib/format.js";
import { triggerHaptic } from "../../lib/dom.js";
import { showToast, showUndoToast } from "../../components/toast.js";
import { confirmDialog } from "../../components/dialog.js";
import { openThisWeeksPlanSheet } from "./review-plan-sheet.js";
import { setTab, profile } from "../../state.js";

export function buildCatchupCardHTML(currentDateKey) {
  var tKey = currentDateKey || todayKey();
  var settings = getCatchupSettings();
  if (!settings.autoOffer) return '';

  var prog = getActiveProgram(), overrides = getWeekOverrides(), decisions = getCatchupDecisions();
  var records = {};
  allDayKeys().forEach(function (k) { records[k] = dayRecord(k); });

  var userTrainingDays = (profile && Array.isArray(profile.trainingDays) && profile.trainingDays.length > 0)
    ? profile.trainingDays
    : (prog && prog.length === 3 ? [1, 3, 5] : (prog && prog.length === 2 ? [1, 4] : (prog && prog.length === 4 ? [1, 2, 4, 5] : [1, 2, 4, 5, 6])));

  var detection = detectMissedDay(tKey, { prog: prog, trainingDays: userTrainingDays, weekOverrides: overrides, decisions: decisions, records: records });
  if (!detection.missed || !detection.date || !detection.session) return '';

  var missedDate = detection.date, missedSession = detection.session, missedName = canonicalSessionName(missedSession);
  var dObj = new Date(missedDate + 'T00:00:00');
  var missedDayFormatted = dObj.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });

  var spreadPlan = planSpreadAcrossWeek(tKey, {
    prog: prog, trainingDays: userTrainingDays, weekOverrides: overrides, records: records, decisions: decisions,
    protectLastRestDay: settings.protectLastRestDay
  });

  var slidePlan = planSlide(tKey, missedDate, { prog: prog, trainingDays: userTrainingDays, weekOverrides: overrides, protectLastRestDay: settings.protectLastRestDay });

  if (!spreadPlan.valid && !slidePlan.valid) {
    return '<div class="catchup-card" style="background:#141416;border:1px solid #222222;border-radius:20px;padding:16px;margin-bottom:20px">'
      + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">'
      + '<span style="font-size:11px;font-weight:600;color:#8A8A8E;text-transform:uppercase;letter-spacing:0.08em">Missed ' + esc(missedDayFormatted) + ' · ' + esc(missedName) + '</span>'
      + '</div>'
      + '<div style="font-size:17px;font-weight:600;color:#F5F5F4;line-height:1.2;margin-bottom:4px">' + esc(missedName) + ' Missed</div>'
      + '<div style="font-size:15px;color:#8A8A8E;line-height:1.4;margin-bottom:14px">No remaining workout days this week to redistribute volume. You can log it late or skip.</div>'
      + '<div style="display:flex;align-items:center;gap:12px">'
      + '<button type="button" class="btn btn-primary" id="catchupLateLogBtn" data-missed-date="' + missedDate + '" style="height:36px;padding:0 14px;border-radius:10px;background:#C6F432;color:#0B0B0C;font-size:15px;font-weight:600;border:none;cursor:pointer">Log it late</button>'
      + '<button type="button" class="btn-text-action" id="catchupSkipBtn" data-missed-date="' + missedDate + '" style="background:none;border:none;color:#8A8A8E;font-size:15px;font-weight:500;cursor:pointer;padding:0 8px">Skip</button>'
      + '</div>'
      + '</div>';
  }

  var fullBodyBadge = spreadPlan.isFullBody
    ? '<span style="font-size:11px;font-weight:600;color:#0B0B0C;background:#C6F432;border-radius:9999px;padding:2px 8px;white-space:nowrap">Full-body week</span>'
    : '';

  var planTitle = spreadPlan.isFullBody
    ? (spreadPlan.remainingDays.length <= 1 ? 'Switch to 1 full-body session' : 'Switch to 2 full-body sessions')
    : 'Spread volume across week';

  var planSub = spreadPlan.isFullBody
    ? 'Combines compound lifts into full-body sessions for remaining days'
    : 'Restore volume as +1 set on remaining days';

  var previewHTML = spreadPlan.preview && spreadPlan.preview.length
    ? ('<div id="catchupInlinePreview" style="display:none;background:#0B0B0C;border-radius:10px;padding:8px 12px;margin-top:10px;font-size:11px;color:#8A8A8E;line-height:1.4">'
      + spreadPlan.preview.map(function (line) { return '<div>• ' + esc(line) + '</div>'; }).join('')
      + '</div>')
    : '';

  return '<div class="catchup-card" style="background:#141416;border:1px solid #222222;border-radius:20px;padding:16px;margin-bottom:20px">'
    + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">'
    + '<span style="font-size:11px;font-weight:600;color:#8A8A8E;text-transform:uppercase;letter-spacing:0.08em">Missed ' + esc(missedDayFormatted) + ' · ' + esc(missedName) + '</span>'
    + fullBodyBadge
    + '</div>'
    + '<div style="font-size:17px;font-weight:600;color:#F5F5F4;line-height:1.2;margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(planTitle) + '</div>'
    + '<div style="font-size:15px;color:#8A8A8E;margin-bottom:12px">' + esc(planSub) + '</div>'
    + '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap">'
    + '<div style="display:flex;align-items:center;gap:8px">'
    + (spreadPlan.valid ? '<button type="button" class="btn btn-primary" id="catchupSpreadBtn" data-missed-date="' + missedDate + '" style="height:36px;padding:0 14px;border-radius:10px;background:#C6F432;color:#0B0B0C;font-size:15px;font-weight:600;border:none;cursor:pointer">Spread</button>' : '')
    + (slidePlan.valid ? '<button type="button" class="btn" id="catchupSlideBtn" data-missed-date="' + missedDate + '" style="height:36px;padding:0 12px;border-radius:10px;background:#1C1C1F;color:#F5F5F4;font-size:15px;font-weight:600;border:1px solid #222222;cursor:pointer">Shift +1d</button>' : '')
    + '</div>'
    + '<div style="display:flex;align-items:center;gap:12px">'
    + (spreadPlan.preview && spreadPlan.preview.length ? '<button type="button" id="catchupTogglePlanBtn" style="background:none;border:none;color:#C6F432;font-size:15px;font-weight:600;cursor:pointer;padding:0">See plan ▾</button>' : '')
    + '<button type="button" id="catchupLateLogBtn" data-missed-date="' + missedDate + '" style="background:none;border:none;color:#8A8A8E;font-size:15px;font-weight:500;cursor:pointer;padding:0">Log it late</button>'
    + '<button type="button" id="catchupSkipBtn" data-missed-date="' + missedDate + '" style="background:none;border:none;color:#8A8A8E;font-size:15px;font-weight:500;cursor:pointer;padding:0">Skip</button>'
    + '</div>'
    + '</div>'
    + previewHTML
    + '</div>';
}

export function bindCatchupCardEvents(container, refreshCallback) {
  if (!container || typeof container.querySelector !== 'function') return;

  var togglePlanBtn = container.querySelector('#catchupTogglePlanBtn');
  if (togglePlanBtn) {
    togglePlanBtn.onclick = function () {
      var prev = container.querySelector('#catchupInlinePreview');
      if (prev) {
        var isHidden = prev.style.display === 'none';
        prev.style.display = isHidden ? 'block' : 'none';
        togglePlanBtn.textContent = isHidden ? 'Hide plan ▴' : 'See plan ▾';
      }
    };
  }

  var reviewBtn = container.querySelector('#catchupReviewPlanBtn');
  if (reviewBtn) {
    reviewBtn.onclick = function () {
      triggerHaptic();
      openThisWeeksPlanSheet({
        currentDateKey: todayKey(),
        refreshCallback: refreshCallback
      });
    };
  }

  var skipBtn = container.querySelector('#catchupSkipBtn');
  if (skipBtn) {
    skipBtn.onclick = function () {
      triggerHaptic();
      setCatchupDecision(skipBtn.dataset.missedDate, 'skipped');
      showToast('Missed workout skipped', 'ok');
      if (typeof refreshCallback === 'function') refreshCallback();
    };
  }

  var lateLogBtn = container.querySelector('#catchupLateLogBtn');
  if (lateLogBtn) {
    lateLogBtn.onclick = function () {
      triggerHaptic();
      window.activeGymDateKey = lateLogBtn.dataset.missedDate;
      setTab('gym');
    };
  }

  var slideBtn = container.querySelector('#catchupSlideBtn');
  if (slideBtn) {
    slideBtn.onclick = function () {
      triggerHaptic();
      var mDate = slideBtn.dataset.missedDate, tKey = todayKey();
      var prevOverrides = Object.assign({}, getWeekOverrides());
      var prevDecision = getCatchupDecisions()[mDate];
      var settings = getCatchupSettings();
      var prog = getActiveProgram();
      var userTrainingDays = (profile && Array.isArray(profile.trainingDays) && profile.trainingDays.length > 0)
        ? profile.trainingDays
        : (prog && prog.length === 3 ? [1, 3, 5] : (prog && prog.length === 2 ? [1, 4] : (prog && prog.length === 4 ? [1, 2, 4, 5] : [1, 2, 4, 5, 6])));
      var slidePlan = planSlide(tKey, mDate, { prog: prog, trainingDays: userTrainingDays, weekOverrides: prevOverrides, protectLastRestDay: settings.protectLastRestDay });
      if (!slidePlan.valid) { showToast(slidePlan.reason || 'Could not shift schedule', 'warn'); return; }

      saveWeekOverrides(slidePlan.newWeekOverrides);
      setCatchupDecision(mDate, 'slid');
      if (typeof refreshCallback === 'function') refreshCallback();

      showUndoToast('Schedule shifted by 1 day', function undo() {
        saveWeekOverrides(prevOverrides);
        if (prevDecision !== undefined) setCatchupDecision(mDate, prevDecision);
        else { var decs = getCatchupDecisions(); delete decs[mDate]; saveWeekOverrides(prevOverrides); }
        if (typeof refreshCallback === 'function') refreshCallback();
      });
    };
  }

  var spreadBtn = container.querySelector('#catchupSpreadBtn');
  if (spreadBtn) {
    spreadBtn.onclick = function () {
      triggerHaptic();
      var mDate = spreadBtn.dataset.missedDate, tKey = todayKey();
      var prevOverrides = Object.assign({}, getWeekOverrides());
      var prevDecision = getCatchupDecisions()[mDate];
      var settings = getCatchupSettings();
      var prog = getActiveProgram();
      var userTrainingDays = (profile && Array.isArray(profile.trainingDays) && profile.trainingDays.length > 0)
        ? profile.trainingDays
        : (prog && prog.length === 3 ? [1, 3, 5] : (prog && prog.length === 2 ? [1, 4] : (prog && prog.length === 4 ? [1, 2, 4, 5] : [1, 2, 4, 5, 6])));
      var spreadPlan = planSpreadAcrossWeek(tKey, {
        prog: prog, trainingDays: userTrainingDays, weekOverrides: prevOverrides, protectLastRestDay: settings.protectLastRestDay
      });

      if (!spreadPlan.valid || !Object.keys(spreadPlan.assignments).length) {
        showToast(spreadPlan.reason || 'Could not spread workout volume', 'warn');
        return;
      }

      var newOverrides = Object.assign({}, prevOverrides, spreadPlan.assignments);
      saveWeekOverrides(newOverrides);
      setCatchupDecision(mDate, 'spread');
      Object.keys(spreadPlan.assignments).forEach(function (dKey) {
        var rec = dayRecord(dKey); rec.isMerged = true; rec.catchupFrom = mDate; saveDayRecord(dKey, rec, { silent: true });
      });

      if (typeof refreshCallback === 'function') refreshCallback();
      var toastMsg = spreadPlan.isFullBody ? 'Switched to Full-Body schedule' : 'Volume distributed across remaining days';
      showUndoToast(toastMsg, function undo() {
        saveWeekOverrides(prevOverrides);
        if (prevDecision !== undefined) setCatchupDecision(mDate, prevDecision);
        else { var decs = getCatchupDecisions(); delete decs[mDate]; saveWeekOverrides(prevOverrides); }
        Object.keys(spreadPlan.assignments).forEach(function (dKey) {
          var r = dayRecord(dKey); delete r.isMerged; delete r.catchupFrom; saveDayRecord(dKey, r, { silent: true });
        });
        if (typeof refreshCallback === 'function') refreshCallback();
      });
    };
  }
}

export function openMergePreviewSheet(todayDateKey, missedDateKey, onCompleted) {
  var tKey = todayDateKey || todayKey(), prog = getActiveProgram(), overrides = getWeekOverrides(), settings = getCatchupSettings();
  var todaySched = scheduledSessionFor(tKey, { prog: prog, weekOverrides: overrides, rec: dayRecord(tKey) });
  var missedSched = scheduledSessionFor(missedDateKey, { prog: prog, weekOverrides: overrides, rec: dayRecord(missedDateKey) });
  var tPlan = todaySched.session || (prog && prog[0]), mPlan = missedSched.session || (prog && prog[1]);

  var mergeRes = buildMergedSession(tPlan, mPlan, {}, {}, { maxSets: settings.maxSets, setsPerAddedExercise: settings.setsPerExercise });
  var workingSession = JSON.parse(JSON.stringify(mergeRes.mergedSession));
  var overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.id = 'mergePreviewOverlay';

  function renderSheetContent() {
    var addedItems = workingSession.exercises.filter(function (e) { return e.isCatchup; });
    var totalSets = workingSession.exercises.reduce(function (tot, e) { return tot + (e.sets || 2); }, 0);
    var estMin = Math.round(totalSets * 3.5);

    var addedRowsHTML = addedItems.map(function (ex, idx) {
      return '<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--hairline)">'
        + '<div style="flex:1;min-width:0;padding-right:8px">'
        + '<div style="font-size:15px;font-weight:600;color:var(--text)">' + esc(ex.name) + '</div>'
        + '<div style="font-size:11px;color:var(--lime);margin-top:2px">Catch-up · ' + (ex.muscle || '') + '</div>'
        + '</div>'
        + '<div style="display:flex;align-items:center;gap:8px">'
        + '<button type="button" class="btn set-step-down" data-ex-idx="' + idx + '" style="width:28px;height:28px;border-radius:6px;background:var(--surface-raised);color:var(--text);border:1px solid var(--hairline);font-size:15px;font-weight:600;cursor:pointer;padding:0">-</button>'
        + '<span style="font-size:15px;font-weight:600;color:var(--text);width:24px;text-align:center;font-variant-numeric:tabular-nums">' + ex.sets + '</span>'
        + '<button type="button" class="btn set-step-up" data-ex-idx="' + idx + '" style="width:28px;height:28px;border-radius:6px;background:var(--surface-raised);color:var(--text);border:1px solid var(--hairline);font-size:15px;font-weight:600;cursor:pointer;padding:0">+</button>'
        + '<button type="button" class="btn set-step-remove" data-ex-idx="' + idx + '" style="background:none;border:none;color:var(--danger);font-size:11px;font-weight:600;cursor:pointer;padding:4px 6px">Remove</button>'
        + '</div></div>';
    }).join('');

    var droppedHTML = mergeRes.droppedReason
      ? ('<div style="font-size:11px;color:var(--text-secondary);line-height:1.4;margin-top:12px;background:var(--surface-raised);border-radius:8px;padding:8px 12px">' + esc(mergeRes.droppedReason) + '</div>') : '';

    return '<div class="sheet" style="background:var(--surface);border-radius:28px 28px 0 0;padding:20px 20px calc(24px + var(--safe-b));max-width:480px;width:100%;max-height:85vh;overflow-y:auto">'
      + '<div class="sheet-handle"></div>'
      + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">'
      + '<span style="font-size:28px;font-weight:600;color:var(--text)">Merged Workout</span>'
      + '<button type="button" id="closeMergeSheetBtn" style="background:none;border:none;color:var(--text-secondary);font-size:15px;cursor:pointer;padding:4px 0">Cancel</button>'
      + '</div>'
      + '<div style="font-size:15px;color:var(--text-secondary);line-height:1.4;margin-bottom:16px">Adding key volume from <b>' + esc(canonicalSessionName(mPlan)) + '</b> to <b>' + esc(canonicalSessionName(tPlan)) + '</b>.</div>'
      + '<div style="display:flex;justify-content:space-between;align-items:center;background:var(--surface-raised);border-radius:12px;padding:12px 14px;margin-bottom:16px">'
      + '<span style="font-size:15px;font-weight:600;color:var(--text)">Total Volume</span>'
      + '<span style="font-size:15px;font-weight:600;color:var(--lime);font-variant-numeric:tabular-nums">' + totalSets + ' sets · ~' + estMin + ' min</span>'
      + '</div>'
      + '<div style="font-size:11px;font-weight:600;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px">Added Volume (Adjustable)</div>'
      + '<div style="margin-bottom:12px">' + addedRowsHTML + '</div>' + droppedHTML
      + '<div style="margin-top:24px"><button type="button" class="btn" id="confirmMergeBtn" style="width:100%;height:48px;border-radius:12px;background:var(--lime);color:var(--bg);border:none;font-size:15px;font-weight:600;cursor:pointer">Start Merged Workout</button></div>'
      + '</div>';
  }

  overlay.innerHTML = renderSheetContent();
  document.body.appendChild(overlay);

  function attachSheetEvents() {
    var closeBtn = overlay.querySelector('#closeMergeSheetBtn');
    if (closeBtn) closeBtn.onclick = function () { triggerHaptic(); if (overlay.parentNode) overlay.parentNode.removeChild(overlay); };

    overlay.querySelectorAll('.set-step-down').forEach(function (btn) {
      btn.onclick = function () {
        triggerHaptic();
        var idx = Number(btn.dataset.exIdx);
        var addedExs = workingSession.exercises.filter(function (e) { return e.isCatchup; });
        if (addedExs[idx] && addedExs[idx].sets > 1) { addedExs[idx].sets -= 1; overlay.innerHTML = renderSheetContent(); attachSheetEvents(); }
      };
    });

    overlay.querySelectorAll('.set-step-up').forEach(function (btn) {
      btn.onclick = function () {
        triggerHaptic();
        var idx = Number(btn.dataset.exIdx);
        var addedExs = workingSession.exercises.filter(function (e) { return e.isCatchup; });
        if (addedExs[idx] && addedExs[idx].sets < 5) { addedExs[idx].sets += 1; overlay.innerHTML = renderSheetContent(); attachSheetEvents(); }
      };
    });

    overlay.querySelectorAll('.set-step-remove').forEach(function (btn) {
      btn.onclick = function () {
        triggerHaptic();
        var idx = Number(btn.dataset.exIdx), addedCount = 0;
        for (var i = 0; i < workingSession.exercises.length; i++) {
          if (workingSession.exercises[i].isCatchup) {
            if (addedCount === idx) { workingSession.exercises.splice(i, 1); break; }
            addedCount++;
          }
        }
        overlay.innerHTML = renderSheetContent(); attachSheetEvents();
      };
    });

    var confirmBtn = overlay.querySelector('#confirmMergeBtn');
    if (confirmBtn) {
      confirmBtn.onclick = function () {
        triggerHaptic();
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        var prevOverrides = Object.assign({}, getWeekOverrides());
        var prevDecision = getCatchupDecisions()[missedDateKey];
        var newOverrides = Object.assign({}, prevOverrides);
        newOverrides[tKey] = workingSession;
        saveWeekOverrides(newOverrides);
        setCatchupDecision(missedDateKey, 'merged');
        var rec = dayRecord(tKey); rec.isMerged = true; rec.catchupFrom = missedDateKey; saveDayRecord(tKey, rec);
        window.activeGymDateKey = tKey;
        if (typeof onCompleted === 'function') onCompleted();
        setTab('gym');

        showUndoToast('Workout merged into today', function undo() {
          saveWeekOverrides(prevOverrides);
          if (prevDecision !== undefined) setCatchupDecision(missedDateKey, prevDecision);
          else { var decs = getCatchupDecisions(); delete decs[missedDateKey]; saveWeekOverrides(prevOverrides); }
          var r = dayRecord(tKey); delete r.isMerged; delete r.catchupFrom; saveDayRecord(tKey, r);
          if (typeof onCompleted === 'function') onCompleted();
        });
      };
    }
  }
  attachSheetEvents();
}
