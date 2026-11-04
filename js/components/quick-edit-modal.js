/* Quick edit modal: edit logged sets inline in gym or workout history */

import { sv, dayRecord, saveDayRecord } from "../storage.js";
import { workoutSessionStore, WORKOUT_SESSIONS_KEY } from "../storage-sessions.js";
import { isBodyweightExercise } from "../data/plan.js";
import { esc, todayKey } from "../lib/format.js";
import { showToast } from "./toast.js";

export function openQuickEditSetModal(options) {
  // options: { context: 'history'|'gym', sessionId, dayKey, exId, exName, setIndex, weight, reps, rir }
  var overlay = document.createElement('div');
  overlay.className = 'overlay active';

  var isBW = isBodyweightExercise(options.exId, options.exName);
  var curW = options.weight != null && options.weight !== '' ? Number(options.weight) : (isBW ? 0 : 20);
  var curR = Number(options.reps) || 10;
  var curRir = options.rir != null && options.rir !== '' ? Number(options.rir) : null;

  function renderQuickSheet() {
    overlay.innerHTML = '<div class="sheet quick-edit-sheet">'
      + '<div class="sheet-handle"></div>'
      + '<div class="quick-edit-title-row" style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px">'
        + '<div>'
          + '<span class="eyebrow" style="color:var(--text2);font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em">' + (options.context === 'history' ? 'History · Edit Set' : 'Active Session · Edit Set') + '</span>'
          + '<div style="font-size:17px;font-weight:600;color:var(--text);margin-top:2px">Set ' + (options.setIndex + 1) + ' · ' + esc(options.exName || 'Lift') + '</div>'
        + '</div>'
        + '<button type="button" class="btn-text-action" id="quickCloseBtn" style="font-size:15px;color:var(--text2);background:none;border:none;padding:0;cursor:pointer">Close</button>'
      + '</div>'

      // Weight stepper
      + '<div class="quick-stepper-box" style="margin-bottom:16px">'
        + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">'
          + '<span class="eyebrow" style="font-size:11px;font-weight:600;text-transform:uppercase;color:var(--text-secondary)">' + (isBW ? 'Added Weight (kg · 0 = Bodyweight Only)' : 'Weight (kg)') + '</span>'
          + '<span style="font-size:11px;color:var(--text3);font-variant-numeric:tabular-nums">' + (isBW ? (curW <= 0 ? 'Current: Bodyweight (BW)' : 'Current: BW + ' + curW + ' kg') : ('Current: ' + curW + ' kg')) + '</span>'
        + '</div>'
        + '<div class="stepper-main" style="display:flex;gap:8px;align-items:center">'
          + '<button type="button" class="btn" id="wDecBtn" style="min-width:44px;font-size:15px">−</button>'
          + '<input type="number" step="0.25" min="0" id="quickWeightInp" class="precision-input" value="' + curW + '" placeholder="' + (isBW ? 'BW (0)' : 'kg') + '" inputmode="decimal" style="flex:1">'
          + '<button type="button" class="btn" id="wIncBtn" style="min-width:44px;font-size:15px">+</button>'
        + '</div>'
        + '<div class="chips-stepper-row" style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap">'
          + (isBW ? '<button type="button" class="btn btn-sm" data-set-bw="true" style="font-weight:600">BW (0)</button>' : '')
          + '<button type="button" class="btn btn-sm" data-adj-w="-5">−5</button>'
          + '<button type="button" class="btn btn-sm" data-adj-w="-2.5">−2.5</button>'
          + '<button type="button" class="btn btn-sm" data-adj-w="1">+1</button>'
          + '<button type="button" class="btn btn-sm" data-adj-w="2.5">+2.5</button>'
          + '<button type="button" class="btn btn-sm" data-adj-w="5">+5</button>'
        + '</div>'
      + '</div>'

      // Reps stepper
      + '<div class="quick-stepper-box" style="margin-bottom:16px">'
        + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">'
          + '<span class="eyebrow" style="font-size:11px;font-weight:600;text-transform:uppercase;color:var(--text-secondary)">Reps</span>'
          + '<span style="font-size:11px;color:var(--text3);font-variant-numeric:tabular-nums">Current: ' + curR + ' reps</span>'
        + '</div>'
        + '<div class="stepper-main" style="display:flex;gap:8px;align-items:center">'
          + '<button type="button" class="btn" id="rDecBtn" style="min-width:44px;font-size:15px">−</button>'
          + '<input type="number" step="1" min="1" id="quickRepsInp" class="precision-input" value="' + curR + '" placeholder="reps" inputmode="numeric" style="flex:1">'
          + '<button type="button" class="btn" id="rIncBtn" style="min-width:44px;font-size:15px">+</button>'
        + '</div>'
        + '<div class="chips-stepper-row" style="display:flex;gap:6px;margin-top:8px">'
          + '<button type="button" class="btn btn-sm" data-adj-r="-2">−2</button>'
          + '<button type="button" class="btn btn-sm" data-adj-r="-1">−1</button>'
          + '<button type="button" class="btn btn-sm" data-adj-r="1">+1</button>'
          + '<button type="button" class="btn btn-sm" data-adj-r="2">+2</button>'
        + '</div>'
      + '</div>'

      // RIR Selector
      + '<div style="margin-bottom:20px">'
        + '<label class="section-label">RIR (Reps in Reserve)</label>'
        + '<div style="display:flex;gap:6px;margin-top:6px">'
          + [0, 1, 2, 3].map(function(val) {
            return '<button type="button" class="btn btn-sm' + (curRir === val ? ' btn-primary' : '') + '" data-set-rir="' + val + '" style="flex:1">' + (val === 0 ? '0 (Fail)' : val) + '</button>';
          }).join('')
          + '<button type="button" class="btn btn-sm' + (curRir === null ? ' btn-primary' : '') + '" data-set-rir="" style="flex:1">None</button>'
        + '</div>'
      + '</div>'

      // Actions
      + '<div style="display:flex;gap:12px;margin-top:20px">'
        + '<button type="button" class="btn" id="quickDeleteSetBtn" style="flex:1;background:var(--danger-bg);color:var(--danger)">Delete Set</button>'
        + '<button type="button" class="btn btn-primary" id="quickSaveSetBtn" style="flex:2">Save Changes</button>'
      + '</div>'
    + '</div>';

    var wInp = overlay.querySelector('#quickWeightInp');
    var rInp = overlay.querySelector('#quickRepsInp');

    overlay.querySelector('#quickCloseBtn').onclick = function() { overlay.remove(); };

    overlay.querySelector('#wDecBtn').onclick = function() {
      curW = Math.max(0, parseFloat((curW - 2.5).toFixed(2)));
      wInp.value = curW;
    };
    var bwBtn = overlay.querySelector('[data-set-bw]');
    if (bwBtn) {
      bwBtn.onclick = function() {
        curW = 0;
        wInp.value = 0;
      };
    }

    overlay.querySelector('#wIncBtn').onclick = function() {
      curW = parseFloat((curW + 2.5).toFixed(2));
      wInp.value = curW;
    };
    overlay.querySelectorAll('[data-adj-w]').forEach(function(b) {
      b.onclick = function() {
        var delta = parseFloat(b.dataset.adjW);
        curW = Math.max(0, parseFloat((curW + delta).toFixed(2)));
        wInp.value = curW;
      };
    });

    overlay.querySelector('#rDecBtn').onclick = function() {
      curR = Math.max(1, curR - 1);
      rInp.value = curR;
    };
    overlay.querySelector('#rIncBtn').onclick = function() {
      curR = curR + 1;
      rInp.value = curR;
    };
    overlay.querySelectorAll('[data-adj-r]').forEach(function(b) {
      b.onclick = function() {
        var delta = parseInt(b.dataset.adjR, 10);
        curR = Math.max(1, curR + delta);
        rInp.value = curR;
      };
    });

    overlay.querySelectorAll('[data-set-rir]').forEach(function(b) {
      b.onclick = function() {
        curRir = b.dataset.setRir === '' ? null : parseInt(b.dataset.setRir, 10);
        overlay.querySelectorAll('[data-set-rir]').forEach(function(pill) {
          pill.classList.toggle('btn-primary', pill === b);
        });
      };
    });

    wInp.oninput = function() { curW = parseFloat(wInp.value) || 0; };
    rInp.oninput = function() { curR = parseInt(rInp.value, 10) || 1; };

    // Delete set
    overlay.querySelector('#quickDeleteSetBtn').onclick = function() {
      if (!confirm('Delete Set ' + (options.setIndex + 1) + ' of ' + (options.exName || 'this exercise') + '?')) return;
      if (options.context === 'history') {
        var store = workoutSessionStore();
        var session = store.sessions[options.sessionId];
        if (session && session.exercises) {
          var targetEx = session.exercises.find(function(e) { return e.id === options.exId; });
          if (targetEx && targetEx.sets) {
            targetEx.sets.splice(options.setIndex, 1);
            if (!targetEx.sets.length) {
              session.exercises = session.exercises.filter(function(e) { return e.id !== options.exId; });
            }
          }
          if (session.dayKey) {
            var rec = dayRecord(session.dayKey);
            if (rec.workout && rec.workout[options.exId]) {
              rec.workout[options.exId].splice(options.setIndex, 1);
              if (!rec.workout[options.exId].length) delete rec.workout[options.exId];
              var hasRemaining = Object.keys(rec.workout).some(function(k){ return (rec.workout[k]||[]).some(Boolean); });
              if (!hasRemaining) rec.workoutDone = false;
              saveDayRecord(session.dayKey, rec);
            }
          }
          store.sessions[options.sessionId] = session;
          sv(WORKOUT_SESSIONS_KEY, store);
        }
        overlay.remove();
        showToast('Set deleted', 'ok');
        if (typeof window.renderTab === 'function') window.renderTab();
      } else {
        // Gym context
        var rec = dayRecord(options.dayKey || todayKey());
        if (rec.workout && rec.workout[options.exId]) {
          rec.workout[options.exId].splice(options.setIndex, 1);
          if (!rec.workout[options.exId].length) delete rec.workout[options.exId];
          saveDayRecord(options.dayKey || todayKey(), rec);
        }
        overlay.remove();
        showToast('Set deleted', 'ok');
        if (typeof window.renderTab === 'function') window.renderTab();
      }
    };

    // Save set
    overlay.querySelector('#quickSaveSetBtn').onclick = function() {
      var rawW = (wInp.value || '').trim();
      var finalW = (rawW === '' || rawW.toUpperCase() === 'BW') ? 0 : (parseFloat(rawW) || 0);
      var finalR = parseInt(rInp.value, 10);
      if (isNaN(finalW) || (!isBW && finalW <= 0) || !finalR || finalR <= 0) {
        showToast(isBW ? 'Please enter valid reps' : 'Please enter valid weight and reps', 'warn');
        return;
      }
      var updatedSet = { weight: finalW, reps: finalR, rir: curRir };

      if (options.context === 'history') {
        var store = workoutSessionStore();
        var session = store.sessions[options.sessionId];
        if (session && session.exercises) {
          var targetEx = session.exercises.find(function(e) { return e.id === options.exId; });
          if (targetEx && targetEx.sets) {
            targetEx.sets[options.setIndex] = updatedSet;
          }
          if (session.dayKey) {
            var rec = dayRecord(session.dayKey);
            rec.workout = rec.workout || {};
            rec.workout[options.exId] = rec.workout[options.exId] || [];
            rec.workout[options.exId][options.setIndex] = updatedSet;
            saveDayRecord(session.dayKey, rec);
          }
          store.sessions[options.sessionId] = session;
          sv(WORKOUT_SESSIONS_KEY, store);
        }
        overlay.remove();
        showToast('Set updated successfully', 'ok');
        if (typeof window.renderTab === 'function') window.renderTab();
      } else {
        // Gym context
        var rec = dayRecord(options.dayKey || todayKey());
        rec.workout = rec.workout || {};
        rec.workout[options.exId] = rec.workout[options.exId] || [];
        rec.workout[options.exId][options.setIndex] = updatedSet;
        saveDayRecord(options.dayKey || todayKey(), rec);
        overlay.remove();
        showToast('Set updated successfully', 'ok');
        if (typeof window.renderTab === 'function') window.renderTab();
      }
    };
  }

  document.body.appendChild(overlay);
  renderQuickSheet();
}
