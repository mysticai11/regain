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

export function attachSetRowSwipeHandlers(key) {
  var rows = document.querySelectorAll('.set-row');
  if (!rows || !rows.length) return;

  var prefersReduced = false;
  if (typeof window !== 'undefined' && window.matchMedia) {
    prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  rows.forEach(function(row) {
    var startX = 0;
    var startY = 0;
    var startTime = 0;
    var axisLocked = null;
    var hapticFired = false;
    var rowWidth = 0;
    var wrap = row.closest('.set-row-wrap');
    var trash = wrap ? wrap.querySelector('.set-trash-icon') : null;

    row.onpointerdown = function(e) {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON' || e.target.tagName === 'SELECT')) {
        return;
      }
      startX = e.clientX;
      startY = e.clientY;
      startTime = Date.now();
      axisLocked = null;
      hapticFired = false;
      rowWidth = row.offsetWidth || 300;
    };

    row.onpointermove = function(e) {
      if (!startTime) return;
      var dx = e.clientX - startX;
      var dy = e.clientY - startY;

      if (!axisLocked) {
        if (Math.hypot(dx, dy) >= 8) {
          if (Math.abs(dx) > Math.abs(dy)) {
            axisLocked = 'h';
            if (row.setPointerCapture && e.pointerId) {
              try { row.setPointerCapture(e.pointerId); } catch(err) {}
            }
          } else {
            axisLocked = 'v';
          }
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
        if (trash) {
          trash.style.transform = 'scale(' + (0.6 + ratio * 0.6) + ')';
        }

        if (Math.abs(tx) >= threshold && !hapticFired) {
          triggerHaptic();
          hapticFired = true;
        } else if (Math.abs(tx) < threshold && hapticFired) {
          hapticFired = false;
        }
      }
    };

    var endDrag = function(e) {
      if (!startTime) return;
      if (axisLocked === 'h') {
        if (e.stopPropagation) e.stopPropagation();
        if (row.releasePointerCapture && e.pointerId) {
          try { row.releasePointerCapture(e.pointerId); } catch(err) {}
        }
        var elapsed = Math.max(1, Date.now() - startTime);
        var dx = e.clientX - startX;
        var velocity = Math.abs(dx) / elapsed;
        var threshold = Math.max(40, rowWidth * 0.40);
        var committed = (dx < 0) && (Math.abs(dx) >= threshold || velocity > 0.5);

        var exId = row.dataset.exId;
        var setIndex = parseInt(row.dataset.setIndex, 10);

        if (committed && exId) {
          var allExerciseRows = document.querySelectorAll('.set-row[data-ex-id="' + exId + '"]');
          var totalCount = allExerciseRows ? allExerciseRows.length : 1;

          if (totalCount <= 1) {
            // Last remaining set: reset to empty instead of silently deleting
            var rec = dayRecord(key);
            if (rec.workout && rec.workout[exId]) {
              delete rec.workout[exId];
            }
            if (rec.workoutDraft && rec.workoutDraft[exId]) {
              rec.workoutDraft[exId] = [{ weight: '', reps: '', rir: null }];
            }
            saveDayRecord(key, rec);
            row.style.transition = prefersReduced ? 'none' : 'transform 200ms cubic-bezier(0.16, 1, 0.3, 1)';
            row.style.transform = 'translateX(0)';
            if (trash) trash.style.transform = 'scale(0.6)';
            showToast('Set reset to empty', 'ok');
            setTimeout(function() { renderGym(); }, 120);
          } else {
            // Animate height collapse (150ms) then delete set with Undo toast
            var targetWrap = wrap || row;
            var currentHeight = targetWrap.offsetHeight;
            if (!prefersReduced) {
              targetWrap.style.height = currentHeight + 'px';
              void targetWrap.offsetHeight;
              targetWrap.style.transition = 'height 150ms cubic-bezier(0.16, 1, 0.3, 1), opacity 150ms cubic-bezier(0.16, 1, 0.3, 1), margin-bottom 150ms cubic-bezier(0.16, 1, 0.3, 1)';
              targetWrap.style.height = '0px';
              targetWrap.style.opacity = '0';
              targetWrap.style.marginBottom = '0px';
            }

            setTimeout(function() {
              var curRec = dayRecord(key);
              var removedDraft = (curRec.workoutDraft && curRec.workoutDraft[exId]) ? curRec.workoutDraft[exId].splice(setIndex, 1)[0] : null;
              var removedSet = (curRec.workout && curRec.workout[exId]) ? curRec.workout[exId].splice(setIndex, 1)[0] : null;
              saveDayRecord(key, curRec);
              renderGym();

              showUndoToast('Set removed', function() {
                var restoreRec = dayRecord(key);
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
                saveDayRecord(key, restoreRec);
                renderGym();
              });
            }, prefersReduced ? 0 : 150);
          }
        } else {
          // Not committed: spring back
          row.style.transition = prefersReduced ? 'none' : 'transform 200ms cubic-bezier(0.16, 1, 0.3, 1)';
          row.style.transform = 'translateX(0)';
          if (trash) trash.style.transform = 'scale(0.6)';
          setTimeout(function() {
            var bg = wrap ? wrap.querySelector('.set-swipe-bg') : null;
            if (bg && (!row.style.transform || row.style.transform === 'translateX(0px)' || row.style.transform === 'translateX(0)')) {
              bg.style.opacity = '0';
            }
          }, 200);
        }
      }
      startTime = 0;
      axisLocked = null;
    };

    row.onpointerup = endDrag;
    row.onpointercancel = endDrag;
  });
}

