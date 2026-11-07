/* Set row swipe-left delete with pointer events, axis locking, undo toast, and empty reset */

import { dayRecord, saveDayRecord } from "../../storage.js";
import { triggerHaptic } from "../../lib/dom.js";
import { showToast, showUndoToast } from "../../components/toast.js";
import { renderGym } from "../gym.js";

export function renderSetRowWrap(innerHtml, exId, setIndex, isDone) {
  var trashIcon = '<svg class="set-trash-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0B0B0C" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="transform:scale(0.6);transition:transform 60ms linear"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>';
  return '<div class="set-row-wrap" id="setwrap-' + exId + '-' + setIndex + '" style="position:relative;overflow:hidden;border-radius:12px;margin-bottom:8px">'
    + '<div class="set-swipe-bg" style="position:absolute;inset:0;background:#FF4D4F;border-radius:12px;display:flex;align-items:center;justify-content:flex-end;padding-right:20px;pointer-events:none;z-index:1;opacity:0">'
    + trashIcon
    + '</div>'
    + '<div class="set-row set-row-precision ' + (isDone ? 'is-done' : '') + '" id="setrow-' + exId + '-' + setIndex + '" data-ex-id="' + exId + '" data-set-index="' + setIndex + '" style="position:relative;z-index:2;background:#0B0B0C;touch-action:pan-y">'
    + innerHtml
    + '</div>'
    + '</div>';
}

export function openSetActionMenu(dayKey, exId, setIndex, isLogged) {
  var overlay = document.createElement('div');
  overlay.className = 'overlay active';
  overlay.innerHTML = '<div class="sheet" style="background:var(--surface);border-radius:28px 28px 0 0;padding:20px 20px calc(24px + var(--safe-b));width:100%;max-width:480px">'
    + '<div class="sheet-handle"></div>'
    + '<div style="font-size:17px;font-weight:600;color:var(--text);margin-bottom:16px">Set ' + (setIndex + 1) + ' Options</div>'
    + '<div style="display:flex;flex-direction:column;gap:8px">'
      + '<button type="button" class="btn" id="actionDupSet" style="height:48px;background:var(--surface-raised);color:var(--text);font-size:15px;font-weight:600;border:1px solid var(--hairline);border-radius:12px;cursor:pointer">Duplicate set</button>'
      + '<button type="button" class="btn" id="actionDelSet" style="height:48px;background:none;color:var(--danger);font-size:15px;font-weight:600;border:none;cursor:pointer">Delete set</button>'
      + '<button type="button" class="btn" id="actionCancelSet" style="height:48px;background:none;color:var(--text-secondary);font-size:15px;border:none;cursor:pointer">Cancel</button>'
    + '</div>'
  + '</div>';
  document.body.appendChild(overlay);

  overlay.querySelector('#actionCancelSet').onclick = function() { overlay.remove(); };
  overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };

  overlay.querySelector('#actionDupSet').onclick = function() {
    overlay.remove();
    var r = dayRecord(dayKey);
    var sourceSet = (r.workout && r.workout[exId] && r.workout[exId][setIndex]) ||
                    (r.workoutDraft && r.workoutDraft[exId] && r.workoutDraft[exId][setIndex]) || { weight: '', reps: '' };
    r.workoutDraft = r.workoutDraft || {};
    r.workoutDraft[exId] = r.workoutDraft[exId] || [];
    var curPlanned = (r.exercisePlannedSets && r.exercisePlannedSets[exId] != null) ? r.exercisePlannedSets[exId] : 2;
    var nextIdx = Math.max(curPlanned, r.workoutDraft[exId].length);
    r.workoutDraft[exId][nextIdx] = { weight: sourceSet.weight, reps: sourceSet.reps, rir: sourceSet.rir, manual: true };
    r.exercisePlannedSets = r.exercisePlannedSets || {};
    r.exercisePlannedSets[exId] = nextIdx + 1;
    saveDayRecord(dayKey, r);
    renderGym();
    showToast('Set ' + (setIndex + 1) + ' duplicated', 'ok');
  };

  overlay.querySelector('#actionDelSet').onclick = function() {
    overlay.remove();
    if (isLogged && !confirm('Delete logged set ' + (setIndex + 1) + '?')) return;
    var curRec = dayRecord(dayKey);
    var prevPlanned = (curRec.exercisePlannedSets && curRec.exercisePlannedSets[exId] != null) ? curRec.exercisePlannedSets[exId] : null;
    var curTotal = (curRec.exercisePlannedSets && curRec.exercisePlannedSets[exId]) || 2;
    curRec.exercisePlannedSets = curRec.exercisePlannedSets || {};
    curRec.exercisePlannedSets[exId] = Math.max(1, curTotal - 1);
    var removedDraft = (curRec.workoutDraft && curRec.workoutDraft[exId]) ? curRec.workoutDraft[exId].splice(setIndex, 1)[0] : null;
    var removedSet = (curRec.workout && curRec.workout[exId]) ? curRec.workout[exId].splice(setIndex, 1)[0] : null;
    saveDayRecord(dayKey, curRec);
    renderGym();
    showUndoToast('Set deleted', function() {
      var restoreRec = dayRecord(dayKey);
      if (prevPlanned != null) {
        restoreRec.exercisePlannedSets = restoreRec.exercisePlannedSets || {};
        restoreRec.exercisePlannedSets[exId] = prevPlanned;
      }
      if (removedDraft) {
        restoreRec.workoutDraft = restoreRec.workoutDraft || {};
        restoreRec.workoutDraft[exId] = restoreRec.workoutDraft[exId] || [];
        restoreRec.workoutDraft[exId].splice(setIndex, 0, removedDraft);
      }
      if (removedSet) {
        restoreRec.workout = restoreRec.workout || {};
        restoreRec.workout[exId] = restoreRec.workout[exId] || [];
        restoreRec.workout[exId].splice(setIndex, 0, removedSet);
      }
      saveDayRecord(dayKey, restoreRec);
      renderGym();
    });
  };
}

export function attachSetRowSwipeHandlers(key) {
  var rows = document.querySelectorAll('.set-row');
  if (!rows || !rows.length) return;

  var prefersReduced = false;
  if (typeof window !== 'undefined' && window.matchMedia) {
    prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  // Long-press set number handler
  document.querySelectorAll('.set-row-num').forEach(function(el) {
    var timer = null, sX = 0, sY = 0;
    var cancel = function() { if (timer) { clearTimeout(timer); timer = null; } };
    el.onpointerdown = function(e) {
      sX = e.clientX; sY = e.clientY;
      timer = setTimeout(function() {
        triggerHaptic();
        var exId = el.dataset.exId, setIdx = parseInt(el.dataset.setIndex, 10), isLog = el.dataset.isLogged === '1';
        openSetActionMenu(key, exId, setIdx, isLog);
      }, 500);
    };
    el.onpointermove = function(e) { if (Math.hypot(e.clientX - sX, e.clientY - sY) > 8) cancel(); };
    el.onpointerup = cancel; el.onpointercancel = cancel;
  });

  rows.forEach(function(row) {
    var startX = 0, startY = 0, startTime = 0, axisLocked = null, hapticFired = false, rowWidth = 0;
    var wrap = row.closest('.set-row-wrap'), trash = wrap ? wrap.querySelector('.set-trash-icon') : null;

    row.onpointerdown = function(e) {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON' || e.target.tagName === 'SELECT' || (typeof e.target.closest === 'function' && e.target.closest('input, button, select, label, .precision-input, .rir-cycle-text, .precision-circle-tap, .set-row-num')))) {
        return;
      }
      startX = e.clientX; startY = e.clientY; startTime = Date.now(); axisLocked = null; hapticFired = false;
      rowWidth = row.offsetWidth || 300;
    };

    row.onpointermove = function(e) {
      if (!startTime) return;
      var dx = e.clientX - startX, dy = e.clientY - startY;
      if (!axisLocked) {
        if (Math.hypot(dx, dy) >= 14) {
          if (Math.abs(dx) > Math.abs(dy) * 1.5) {
            axisLocked = 'h';
            if (row.setPointerCapture && e.pointerId) { try { row.setPointerCapture(e.pointerId); } catch(err) {} }
          } else { axisLocked = 'v'; }
        }
      }

      if (axisLocked === 'h') {
        if (e.stopPropagation) e.stopPropagation();
        if (e.preventDefault) e.preventDefault();
        var bg = wrap ? wrap.querySelector('.set-swipe-bg') : null;
        if (bg) bg.style.opacity = '1';
        var tx = Math.max(-96, Math.min(0, dx));
        row.style.transition = 'none';
        row.style.transform = 'translateX(' + tx + 'px)';
        var threshold = Math.max(40, rowWidth * 0.40);
        var ratio = Math.min(1, Math.abs(tx) / threshold);
        if (trash) trash.style.transform = 'scale(' + (0.6 + ratio * 0.6) + ')';
        if (Math.abs(tx) >= threshold && !hapticFired) { triggerHaptic(); hapticFired = true; }
        else if (Math.abs(tx) < threshold && hapticFired) { hapticFired = false; }
      }
    };

    var endDrag = function(e) {
      if (!startTime) return;
      if (axisLocked === 'h') {
        if (e.stopPropagation) e.stopPropagation();
        if (row.releasePointerCapture && e.pointerId) { try { row.releasePointerCapture(e.pointerId); } catch(err) {} }
        var elapsed = Math.max(1, Date.now() - startTime), dx = e.clientX - startX, velocity = Math.abs(dx) / elapsed;
        var threshold = Math.max(40, rowWidth * 0.40);
        var committed = (dx < 0) && (Math.abs(dx) >= threshold || velocity > 0.5);
        var exId = row.dataset.exId, setIndex = parseInt(row.dataset.setIndex, 10);

        if (committed && exId) {
          var curRec = dayRecord(key);
          var isLogged = curRec.workout && curRec.workout[exId] && curRec.workout[exId][setIndex];
          if (isLogged) {
            if (!confirm('Delete logged set ' + (setIndex + 1) + '?')) {
              row.style.transition = prefersReduced ? 'none' : 'transform 200ms cubic-bezier(0.16, 1, 0.3, 1)';
              row.style.transform = 'translateX(0)';
              if (trash) trash.style.transform = 'scale(0.6)';
              startTime = 0; axisLocked = null;
              return;
            }
          }

          var allExerciseRows = document.querySelectorAll('.set-row[data-ex-id="' + exId + '"]');
          var totalCount = allExerciseRows ? allExerciseRows.length : 1;

          if (totalCount <= 1) {
            if (curRec.workout && curRec.workout[exId]) delete curRec.workout[exId];
            if (curRec.workoutDraft && curRec.workoutDraft[exId]) curRec.workoutDraft[exId] = [{ weight: '', reps: '', rir: null }];
            saveDayRecord(key, curRec);
            row.style.transition = prefersReduced ? 'none' : 'transform 200ms cubic-bezier(0.16, 1, 0.3, 1)';
            row.style.transform = 'translateX(0)';
            if (trash) trash.style.transform = 'scale(0.6)';
            showToast('Set reset to empty', 'ok');
            setTimeout(function() { renderGym(); }, 120);
          } else {
            var targetWrap = wrap || row, currentHeight = targetWrap.offsetHeight;
            if (!prefersReduced) {
              targetWrap.style.height = currentHeight + 'px';
              void targetWrap.offsetHeight;
              targetWrap.style.transition = 'height 150ms cubic-bezier(0.16, 1, 0.3, 1), opacity 150ms cubic-bezier(0.16, 1, 0.3, 1), margin-bottom 150ms cubic-bezier(0.16, 1, 0.3, 1)';
              targetWrap.style.height = '0px'; targetWrap.style.opacity = '0'; targetWrap.style.marginBottom = '0px';
            }

            setTimeout(function() {
              var r = dayRecord(key);
              var prevPlanned = (r.exercisePlannedSets && r.exercisePlannedSets[exId] != null) ? r.exercisePlannedSets[exId] : null;
              r.exercisePlannedSets = r.exercisePlannedSets || {};
              r.exercisePlannedSets[exId] = Math.max(1, totalCount - 1);
              var removedDraft = (r.workoutDraft && r.workoutDraft[exId]) ? r.workoutDraft[exId].splice(setIndex, 1)[0] : null;
              var removedSet = (r.workout && r.workout[exId]) ? r.workout[exId].splice(setIndex, 1)[0] : null;
              saveDayRecord(key, r);
              renderGym();

              showUndoToast('Set removed', function() {
                var restoreRec = dayRecord(key);
                if (prevPlanned != null) { restoreRec.exercisePlannedSets = restoreRec.exercisePlannedSets || {}; restoreRec.exercisePlannedSets[exId] = prevPlanned; }
                else if (restoreRec.exercisePlannedSets) { delete restoreRec.exercisePlannedSets[exId]; }
                if (removedDraft) { restoreRec.workoutDraft = restoreRec.workoutDraft || {}; restoreRec.workoutDraft[exId] = restoreRec.workoutDraft[exId] || []; restoreRec.workoutDraft[exId].splice(setIndex, 0, removedDraft); }
                if (removedSet) { restoreRec.workout = restoreRec.workout || {}; restoreRec.workout[exId] = restoreRec.workout[exId] || []; restoreRec.workout[exId].splice(setIndex, 0, removedSet); }
                saveDayRecord(key, restoreRec);
                renderGym();
              });
            }, prefersReduced ? 0 : 150);
          }
        } else {
          row.style.transition = prefersReduced ? 'none' : 'transform 200ms cubic-bezier(0.16, 1, 0.3, 1)';
          row.style.transform = 'translateX(0)';
          if (trash) trash.style.transform = 'scale(0.6)';
          setTimeout(function() {
            var bg = wrap ? wrap.querySelector('.set-swipe-bg') : null;
            if (bg && (!row.style.transform || row.style.transform === 'translateX(0px)' || row.style.transform === 'translateX(0)')) bg.style.opacity = '0';
          }, 200);
        }
      }
      startTime = 0; axisLocked = null;
    };

    row.onpointerup = endDrag;
    row.onpointercancel = endDrag;
  });
}
