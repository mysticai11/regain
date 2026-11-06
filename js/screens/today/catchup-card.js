/* Catch-up resolution card and merge preview sheet for Today screen */

import { detectMissedDay, planSlide, buildMergedSession } from "../../lib/catchup.js";
import { getWeekOverrides, saveWeekOverrides, getCatchupDecisions, setCatchupDecision, getCatchupSettings } from "../../storage-catchup.js";
import { scheduledSessionFor, canonicalSessionName, canonicalSessionLabel } from "../../lib/schedule.js";
import { getActiveProgram, getWeeklySchedule } from "../../data/plan.js";
import { dayRecord, allDayKeys } from "../../storage.js";
import { todayKey, esc } from "../../lib/format.js";
import { triggerHaptic } from "../../lib/dom.js";
import { showToast, showUndoToast } from "../../components/toast.js";
import { setTab } from "../../state.js";

export function buildCatchupCardHTML(currentDateKey) {
  var tKey = currentDateKey || todayKey();
  var settings = getCatchupSettings();
  if (!settings.autoOffer) return '';

  var prog = getActiveProgram();
  var overrides = getWeekOverrides();
  var decisions = getCatchupDecisions();

  // Build records map for the current week
  var records = {};
  allDayKeys().forEach(function (k) {
    records[k] = dayRecord(k);
  });

  var detection = detectMissedDay(tKey, {
    prog: prog,
    weekOverrides: overrides,
    decisions: decisions,
    records: records
  });

  if (!detection.missed || !detection.date || !detection.session) {
    return '';
  }

  var missedDate = detection.date;
  var missedSession = detection.session;
  var missedName = canonicalSessionName(missedSession);

  var dObj = new Date(missedDate + 'T00:00:00');
  var missedDayFormatted = dObj.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });

  var todaySched = scheduledSessionFor(tKey, { prog: prog, weekOverrides: overrides, rec: dayRecord(tKey) });
  var todayName = todaySched.isRest ? 'Rest Day' : canonicalSessionName(todaySched.session);

  // Check slide feasibility
  var slidePlan = planSlide(tKey, missedDate, {
    prog: prog,
    weekOverrides: overrides,
    protectLastRestDay: settings.protectLastRestDay
  });

  var slideBtnHTML = slidePlan.valid
    ? ('<button type="button" class="btn" id="catchupSlideBtn" data-missed-date="' + missedDate + '" style="height:36px;padding:0 14px;border-radius:8px;background:#1C1C1F;color:#F5F5F4;font-size:15px;font-weight:600;border:1px solid #222;cursor:pointer">Slide schedule</button>')
    : ('<button type="button" class="btn" disabled style="height:36px;padding:0 14px;border-radius:8px;background:#1C1C1F;color:#55555A;font-size:15px;font-weight:600;border:1px solid #222;cursor:not-allowed" title="' + esc(slidePlan.reason) + '">Slide unavailable</button>');

  var slideDesc = slidePlan.valid
    ? 'Shift remaining workouts right by 1 day'
    : slidePlan.reason;

  return '<div class="catchup-card" style="background:#141416;border:1px solid #1C1C1F;border-radius:20px;padding:18px 20px;margin-bottom:20px">'
    + '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:8px">'
      + '<div>'
        + '<div style="font-size:11px;font-weight:600;color:#C6F432;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px">Missed Workout Detected</div>'
        + '<div style="font-size:28px;font-weight:600;color:#F5F5F4;line-height:1.15">' + esc(missedName) + '</div>'
        + '<div style="font-size:11px;color:#8A8A8E;margin-top:2px">Scheduled on ' + esc(missedDayFormatted) + '</div>'
      + '</div>'
      + '<button type="button" id="catchupSkipBtn" data-missed-date="' + missedDate + '" style="background:none;border:none;color:#8A8A8E;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;cursor:pointer;padding:4px 0">Skip</button>'
    + '</div>'
    + '<div style="font-size:15px;color:#8A8A8E;line-height:1.4;margin-bottom:16px">Choose how you would like to recover the missed volume:</div>'
    + '<div style="display:flex;flex-direction:column;gap:10px">'
      + '<div style="display:flex;justify-content:space-between;align-items:center;background:#1C1C1F;border-radius:12px;padding:12px 14px">'
        + '<div style="flex:1;min-width:0;padding-right:12px">'
          + '<div style="font-size:15px;font-weight:600;color:#F5F5F4">Merge into today</div>'
          + '<div style="font-size:11px;color:#8A8A8E;margin-top:2px">Add key exercises to ' + esc(todayName) + '</div>'
        + '</div>'
        + '<button type="button" class="btn" id="catchupMergeBtn" data-missed-date="' + missedDate + '" style="height:36px;padding:0 14px;border-radius:8px;background:#C6F432;color:#0B0B0C;font-size:15px;font-weight:600;border:none;cursor:pointer;flex-shrink:0">Merge</button>'
      + '</div>'
      + '<div style="display:flex;justify-content:space-between;align-items:center;background:#1C1C1F;border-radius:12px;padding:12px 14px">'
        + '<div style="flex:1;min-width:0;padding-right:12px">'
          + '<div style="font-size:15px;font-weight:600;color:#F5F5F4">Slide schedule</div>'
          + '<div style="font-size:11px;color:#8A8A8E;margin-top:2px">' + esc(slideDesc) + '</div>'
        + '</div>'
        + slideBtnHTML
      + '</div>'
    + '</div>'
    + '<div style="display:flex;justify-content:center;margin-top:14px">'
      + '<button type="button" id="catchupLateLogBtn" data-missed-date="' + missedDate + '" style="background:none;border:none;color:#8A8A8E;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;cursor:pointer;padding:4px 8px">Log it late (' + esc(missedDayFormatted) + ') &rarr;</button>'
    + '</div>'
    + '</div>';
}

export function bindCatchupCardEvents(container, refreshCallback) {
  if (!container || typeof container.querySelector !== 'function') return;

  var skipBtn = container.querySelector('#catchupSkipBtn');
  if (skipBtn) {
    skipBtn.onclick = function () {
      triggerHaptic();
      var mDate = skipBtn.dataset.missedDate;
      setCatchupDecision(mDate, 'skipped');
      showToast('Missed workout skipped', 'ok');
      if (typeof refreshCallback === 'function') refreshCallback();
    };
  }

  var lateLogBtn = container.querySelector('#catchupLateLogBtn');
  if (lateLogBtn) {
    lateLogBtn.onclick = function () {
      triggerHaptic();
      var mDate = lateLogBtn.dataset.missedDate;
      window.activeGymDateKey = mDate;
      setTab('gym');
    };
  }

  var slideBtn = container.querySelector('#catchupSlideBtn');
  if (slideBtn) {
    slideBtn.onclick = function () {
      triggerHaptic();
      var mDate = slideBtn.dataset.missedDate;
      var tKey = todayKey();
      var prevOverrides = Object.assign({}, getWeekOverrides());
      var prevDecision = getCatchupDecisions()[mDate];
      var settings = getCatchupSettings();

      var slidePlan = planSlide(tKey, mDate, {
        prog: getActiveProgram(),
        weekOverrides: prevOverrides,
        protectLastRestDay: settings.protectLastRestDay
      });

      if (!slidePlan.valid) {
        showToast(slidePlan.reason || 'Could not slide schedule', 'warn');
        return;
      }

      saveWeekOverrides(slidePlan.newWeekOverrides);
      setCatchupDecision(mDate, 'slid');
      if (typeof refreshCallback === 'function') refreshCallback();

      showUndoToast('Schedule shifted by 1 day', function undo() {
        saveWeekOverrides(prevOverrides);
        if (prevDecision !== undefined) {
          setCatchupDecision(mDate, prevDecision);
        } else {
          var decs = getCatchupDecisions();
          delete decs[mDate];
          saveWeekOverrides(prevOverrides);
        }
        if (typeof refreshCallback === 'function') refreshCallback();
      });
    };
  }

  var mergeBtn = container.querySelector('#catchupMergeBtn');
  if (mergeBtn) {
    mergeBtn.onclick = function () {
      triggerHaptic();
      var mDate = mergeBtn.dataset.missedDate;
      var tKey = todayKey();
      openMergePreviewSheet(tKey, mDate, refreshCallback);
    };
  }
}

export function openMergePreviewSheet(todayDateKey, missedDateKey, onCompleted) {
  var tKey = todayDateKey || todayKey();
  var prog = getActiveProgram();
  var overrides = getWeekOverrides();
  var settings = getCatchupSettings();

  var todaySched = scheduledSessionFor(tKey, { prog: prog, weekOverrides: overrides, rec: dayRecord(tKey) });
  var missedSched = scheduledSessionFor(missedDateKey, { prog: prog, weekOverrides: overrides, rec: dayRecord(missedDateKey) });

  var tPlan = todaySched.session || (prog && prog[0]);
  var mPlan = missedSched.session || (prog && prog[1]);

  var mergeRes = buildMergedSession(tPlan, mPlan, {}, {}, {
    maxSets: settings.maxSets,
    setsPerAddedExercise: settings.setsPerExercise
  });

  var workingSession = JSON.parse(JSON.stringify(mergeRes.mergedSession));

  var overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.id = 'mergePreviewOverlay';

  function renderSheetContent() {
    var addedItems = workingSession.exercises.filter(function (e) { return e.isCatchup; });
    var totalSets = workingSession.exercises.reduce(function (tot, e) { return tot + (e.sets || 2); }, 0);
    var estMin = Math.round(totalSets * 3.5);

    var addedRowsHTML = addedItems.map(function (ex, idx) {
      return '<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #222">'
        + '<div style="flex:1;min-width:0;padding-right:8px">'
          + '<div style="font-size:15px;font-weight:600;color:#F5F5F4">' + esc(ex.name) + '</div>'
          + '<div style="font-size:11px;color:#C6F432;margin-top:2px">Catch-up · ' + (ex.muscle || '') + '</div>'
        + '</div>'
        + '<div style="display:flex;align-items:center;gap:8px">'
          + '<button type="button" class="btn set-step-down" data-ex-idx="' + idx + '" style="width:28px;height:28px;border-radius:6px;background:#1C1C1F;color:#F5F5F4;border:1px solid #222;font-size:15px;font-weight:600;cursor:pointer;padding:0">-</button>'
          + '<span style="font-size:15px;font-weight:600;color:#F5F5F4;width:24px;text-align:center;font-variant-numeric:tabular-nums">' + ex.sets + '</span>'
          + '<button type="button" class="btn set-step-up" data-ex-idx="' + idx + '" style="width:28px;height:28px;border-radius:6px;background:#1C1C1F;color:#F5F5F4;border:1px solid #222;font-size:15px;font-weight:600;cursor:pointer;padding:0">+</button>'
          + '<button type="button" class="btn set-step-remove" data-ex-idx="' + idx + '" style="background:none;border:none;color:#FF4D4F;font-size:11px;font-weight:600;cursor:pointer;padding:4px 6px">Remove</button>'
        + '</div>'
        + '</div>';
    }).join('');

    var droppedHTML = mergeRes.droppedReason
      ? ('<div style="font-size:11px;color:#8A8A8E;line-height:1.4;margin-top:12px;background:#1C1C1F;border-radius:8px;padding:8px 12px">' + esc(mergeRes.droppedReason) + '</div>')
      : '';

    return '<div class="sheet" style="background:#141416;border-radius:20px 20px 0 0;padding:20px 20px calc(24px + var(--safe-b));max-width:480px;width:100%;max-height:85vh;overflow-y:auto">'
      + '<div class="sheet-handle"></div>'
      + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">'
        + '<span style="font-size:28px;font-weight:600;color:#F5F5F4">Merged Workout</span>'
        + '<button type="button" id="closeMergeSheetBtn" style="background:none;border:none;color:#8A8A8E;font-size:15px;cursor:pointer;padding:4px 0">Cancel</button>'
      + '</div>'
      + '<div style="font-size:15px;color:#8A8A8E;line-height:1.4;margin-bottom:16px">'
        + 'Adding key volume from <b>' + esc(canonicalSessionName(mPlan)) + '</b> to <b>' + esc(canonicalSessionName(tPlan)) + '</b>.'
      + '</div>'
      + '<div style="display:flex;justify-content:space-between;align-items:center;background:#1C1C1F;border-radius:12px;padding:12px 14px;margin-bottom:16px">'
        + '<span style="font-size:15px;font-weight:600;color:#F5F5F4">Total Volume</span>'
        + '<span style="font-size:15px;font-weight:600;color:#C6F432;font-variant-numeric:tabular-nums">' + totalSets + ' sets · ~' + estMin + ' min</span>'
      + '</div>'
      + '<div style="font-size:11px;font-weight:600;color:#8A8A8E;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px">Added Volume (Adjustable)</div>'
      + '<div style="margin-bottom:12px">' + addedRowsHTML + '</div>'
      + droppedHTML
      + '<div style="margin-top:24px">'
        + '<button type="button" class="btn" id="confirmMergeBtn" style="width:100%;height:48px;border-radius:12px;background:#C6F432;color:#0B0B0C;border:none;font-size:15px;font-weight:600;cursor:pointer">Start Merged Workout</button>'
      + '</div>'
      + '</div>';
  }

  overlay.innerHTML = renderSheetContent();
  document.body.appendChild(overlay);

  function attachSheetEvents() {
    var closeBtn = overlay.querySelector('#closeMergeSheetBtn');
    if (closeBtn) {
      closeBtn.onclick = function () {
        triggerHaptic();
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      };
    }

    overlay.querySelectorAll('.set-step-down').forEach(function (btn) {
      btn.onclick = function () {
        triggerHaptic();
        var idx = Number(btn.dataset.exIdx);
        var addedExs = workingSession.exercises.filter(function (e) { return e.isCatchup; });
        if (addedExs[idx] && addedExs[idx].sets > 1) {
          addedExs[idx].sets -= 1;
          overlay.innerHTML = renderSheetContent();
          attachSheetEvents();
        }
      };
    });

    overlay.querySelectorAll('.set-step-up').forEach(function (btn) {
      btn.onclick = function () {
        triggerHaptic();
        var idx = Number(btn.dataset.exIdx);
        var addedExs = workingSession.exercises.filter(function (e) { return e.isCatchup; });
        if (addedExs[idx] && addedExs[idx].sets < 5) {
          addedExs[idx].sets += 1;
          overlay.innerHTML = renderSheetContent();
          attachSheetEvents();
        }
      };
    });

    overlay.querySelectorAll('.set-step-remove').forEach(function (btn) {
      btn.onclick = function () {
        triggerHaptic();
        var idx = Number(btn.dataset.exIdx);
        var addedCount = 0;
        for (var i = 0; i < workingSession.exercises.length; i++) {
          if (workingSession.exercises[i].isCatchup) {
            if (addedCount === idx) {
              workingSession.exercises.splice(i, 1);
              break;
            }
            addedCount++;
          }
        }
        overlay.innerHTML = renderSheetContent();
        attachSheetEvents();
      };
    });

    var confirmBtn = overlay.querySelector('#confirmMergeBtn');
    if (confirmBtn) {
      confirmBtn.onclick = function () {
        triggerHaptic();
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);

        var prevOverrides = Object.assign({}, getWeekOverrides());
        var prevDecision = getCatchupDecisions()[missedDateKey];

        // Save merged session override for today
        var newOverrides = Object.assign({}, prevOverrides);
        newOverrides[tKey] = workingSession;
        saveWeekOverrides(newOverrides);
        setCatchupDecision(missedDateKey, 'merged');

        // Mark dayRecord as merged
        var rec = dayRecord(tKey);
        rec.isMerged = true;
        rec.catchupFrom = missedDateKey;

        window.activeGymDateKey = tKey;
        if (typeof onCompleted === 'function') onCompleted();
        setTab('gym');

        showUndoToast('Workout merged into today', function undo() {
          saveWeekOverrides(prevOverrides);
          if (prevDecision !== undefined) {
            setCatchupDecision(missedDateKey, prevDecision);
          } else {
            var decs = getCatchupDecisions();
            delete decs[missedDateKey];
            saveWeekOverrides(prevOverrides);
          }
          var r = dayRecord(tKey);
          delete r.isMerged;
          delete r.catchupFrom;
          if (typeof onCompleted === 'function') onCompleted();
        });
      };
    }
  }

  attachSheetEvents();
}
