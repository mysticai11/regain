/* Gym exercise swap & calculators: exercise substitution, warm-up sets, and plate loading */

import { profile } from "../../state.js";
import { sv, dayRecord, saveDayRecord } from "../../storage.js";
import { getExerciseData, getAllExercisesForMuscle, getActiveProgram, getCurrentWorkout, ALTERNATES } from "../../data/plan.js";
import { openAddExerciseModal, openEditExerciseModal } from "./exercise-modal.js";
import { getPlateBreakdown } from "../../lib/calc.js";
import { openSheet } from "../../components/sheet.js";
import { showToast } from "../../components/toast.js";
import { esc } from "../../lib/format.js";

export function openWarmUpSheet(exName, exId) {
  var inputEl = document.querySelector('.set-weight[data-ex="' + exId + '"]');
  var workingWeight = parseFloat(inputEl ? inputEl.value : '') || 40;
  var w50 = (Math.round((workingWeight * 0.5) / 2.5) * 2.5).toFixed(1);
  var w70 = (Math.round((workingWeight * 0.7) / 2.5) * 2.5).toFixed(1);
  var w85 = (Math.round((workingWeight * 0.85) / 2.5) * 2.5).toFixed(1);

  var overlay = document.createElement('div'); overlay.className = 'overlay';
  overlay.innerHTML = '<div class="sheet" style="background:#141416;border:none;border-radius:20px 20px 0 0;padding:20px 20px calc(24px + var(--safe-b));max-width:480px;width:100%">'
    + '<div class="sheet-handle"></div>'
    + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">'
    + '<div style="font-size:28px;font-weight:600;color:#F5F5F4;line-height:1.15">Warm-Up</div>'
    + '<button type="button" class="btn-text-action" id="closeWarmBtn" style="font-size:15px;color:#8A8A8E;background:none;border:none;padding:0;cursor:pointer">Close</button>'
    + '</div>'
    + '<p style="font-size:15px;color:#8A8A8E;margin-bottom:12px">' + esc(exName) + ' · ramp to <strong>' + workingWeight + ' kg</strong>:</p>'
    + '<div style="background:#1C1C1F;padding:12px;border-radius:12px;font-size:15px;line-height:1.8;font-variant-numeric:tabular-nums;color:#F5F5F4">'
    + '<div style="display:flex;justify-content:space-between"><span>Set 1 (50%):</span><strong>' + w50 + ' kg × 5 reps</strong></div>'
    + '<div style="display:flex;justify-content:space-between"><span>Set 2 (70%):</span><strong>' + w70 + ' kg × 3 reps</strong></div>'
    + '<div style="display:flex;justify-content:space-between"><span>Set 3 (85%):</span><strong>' + w85 + ' kg × 1 rep</strong></div>'
    + '</div>'
    + '<p style="font-size:11px;color:#8A8A8E;margin-top:12px">Rest 60-90s between warmups, then 2-3 mins before your first working set.</p>'
    + '</div>';
  document.body.appendChild(overlay);
  overlay.querySelector('#closeWarmBtn').addEventListener('click', function () { overlay.remove(); });
  overlay.addEventListener('click', function (e) { if (e.target === overlay) overlay.remove(); });
}

export function openPlateCalculator(weight) {
  var target = parseFloat(weight) || 60;
  var breakdown = getPlateBreakdown(target, 20);
  var overlay = document.createElement('div');
  overlay.className = 'overlay';

  function renderPlateUI() {
    breakdown = getPlateBreakdown(target, 20);
    var platesHTML = breakdown.perSide.length ? breakdown.perSide.map(function (p) {
      var bg = p >= 20 ? '#F5F5F4' : '#1C1C1F';
      var fg = p >= 20 ? '#0B0B0C' : '#F5F5F4';
      var border = p >= 20 ? 'none' : '1px solid #222';
      return '<div style="display:inline-flex;flex-direction:column;align-items:center;justify-content:center;background:' + bg + ';color:' + fg + ';border:' + border + ';font-weight:700;font-size:11px;border-radius:12px;padding:8px 8px;min-width:36px;font-variant-numeric:tabular-nums">'
        + p + '<span style="font-size:11px">kg</span></div>';
    }).join('') : '<div style="color:#8A8A8E;font-size:15px">No plates needed (empty bar).</div>';

    overlay.innerHTML = '<div class="sheet" style="background:#141416;border:none;border-radius:20px 20px 0 0;padding:20px 20px calc(24px + var(--safe-b));max-width:480px;width:100%">'
      + '<div class="sheet-handle"></div>'
      + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">'
      + '<div style="font-size:28px;font-weight:600;color:#F5F5F4;line-height:1.15">Plate Calculator</div>'
      + '<button type="button" class="btn-text-action" id="closePlateCalcBtn" style="font-size:15px;color:#8A8A8E;background:none;border:none;padding:0;cursor:pointer">Close</button>'
      + '</div>'
      + '<div style="font-size:15px;color:#8A8A8E;margin-bottom:16px">Standard 20 kg Olympic Barbell breakdown per side.</div>'
      + '<div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">'
      + '<label style="font-size:15px;font-weight:600;color:#F5F5F4">Total Weight:</label>'
      + '<input type="number" step="0.5" id="plateTargetInput" value="' + target + '" style="width:100px;font-size:17px;font-weight:600;padding:8px;border-radius:12px;border:none;background:#1C1C1F;color:#F5F5F4;font-variant-numeric:tabular-nums">'
      + '<span style="font-size:15px;font-weight:600;color:#8A8A8E">kg</span>'
      + '</div>'
      + '<div style="background:#1C1C1F;border-radius:12px;padding:16px;margin-bottom:20px">'
      + '<div style="font-size:11px;color:#8A8A8E;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:10px">Plates on EACH SIDE (' + breakdown.sideWeight + ' kg):</div>'
      + '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;min-height:48px">' + platesHTML + '</div>'
      + '<div style="font-size:11px;color:#8A8A8E;margin-top:12px">Bar: 20 kg + (' + breakdown.sideWeight + ' kg × 2 sides) = ' + target + ' kg</div>'
      + '</div>'
      + '</div>';

    overlay.querySelector('#closePlateCalcBtn').onclick = function () { overlay.remove(); };
    var input = overlay.querySelector('#plateTargetInput');
    input.oninput = function () {
      var val = parseFloat(input.value);
      if (val && val >= 20) {
        target = val;
        renderPlateUI();
        var refreshedInput = overlay.querySelector('#plateTargetInput');
        refreshedInput.focus();
        refreshedInput.setSelectionRange(refreshedInput.value.length, refreshedInput.value.length);
      }
    };
  }

  document.body.appendChild(overlay);
  renderPlateUI();
}

export function openSwapSheet(origId, currId, muscleStr, dayKey) {
  var exList = getAllExercisesForMuscle(muscleStr);
  if (!exList.length) exList = getAllExercisesForMuscle('all');
  var overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.style.zIndex = '9999';

  function formatMuscles(mStr) {
    if (!mStr) return '';
    var parts = mStr.split(/[\s,]+/).filter(Boolean);
    return parts.map(function (m, idx) {
      m = m.toLowerCase();
      if (idx === 0) m = m.charAt(0).toUpperCase() + m.slice(1);
      return m;
    }).join(', ');
  }

  function applySwap(sid, customData) {
    var keepFuture = overlay.querySelector('#keepFutureWeeksToggle') ? overlay.querySelector('#keepFutureWeeksToggle').checked : true;
    var rec = dayRecord(dayKey);
    rec.swaps = rec.swaps || {};
    if (sid === origId) {
      delete rec.swaps[origId];
    } else {
      rec.swaps[origId] = sid;
    }
    saveDayRecord(dayKey, rec);

    if (keepFuture) {
      var curWorkout = getCurrentWorkout(dayKey);
      var wIdx = curWorkout ? curWorkout.workoutIndex : null;
      var prog = JSON.parse(JSON.stringify(getActiveProgram()));
      if (wIdx != null && prog[wIdx] && Array.isArray(prog[wIdx].exercises)) {
        var sessionExs = prog[wIdx].exercises;
        var targetIdx = sessionExs.findIndex(function(e) { return e.id === origId || e.id === currId; });
        if (targetIdx >= 0) {
          var cData = customData || getExerciseData(sid);
          sessionExs[targetIdx] = {
            id: cData.id,
            name: cData.name,
            muscle: cData.muscle || sessionExs[targetIdx].muscle || 'other',
            sets: sessionExs[targetIdx].sets || cData.sets || 2,
            reps: sessionExs[targetIdx].reps || cData.reps || '8–12',
            rir: sessionExs[targetIdx].rir || cData.rir || '1–2',
            rest: sessionExs[targetIdx].rest != null ? sessionExs[targetIdx].rest : (cData.rest != null ? cData.rest : 90),
            cue: cData.cue || sessionExs[targetIdx].cue || '',
            weightIncrement: cData.weightIncrement || sessionExs[targetIdx].weightIncrement || 2.5,
            type: cData.type || sessionExs[targetIdx].type || 'compound',
            bodyweight: cData.bodyweight === true || sessionExs[targetIdx].bodyweight === true
          };
          profile.activeSplitData = prog;
          sv('rg_profile', profile);
        }
      }
    }
    overlay.remove();
    showToast(keepFuture ? 'Swapped & saved for future weeks' : 'Swapped for this session', 'ok');
    if (typeof window !== 'undefined' && typeof window.renderGym === 'function') window.renderGym();
  }

  function renderList(filterQuery) {
    var q = (filterQuery || '').toLowerCase().trim();
    var filtered = exList.filter(function(e) {
      if (!q) return true;
      return e.name.toLowerCase().includes(q) || (e.muscle && e.muscle.toLowerCase().includes(q));
    });

    var rows = filtered.map(function(e) {
      var isSel = e.id === currId;
      var muscleText = formatMuscles(e.muscle || muscleStr);
      return '<div class="list-row swap-pick-row" data-selectswap="' + esc(e.id) + '" style="display:flex;align-items:center;justify-content:space-between;padding:14px 0;border-bottom:1px solid #222;cursor:pointer">'
        + '<div style="flex:1;min-width:0;padding-right:12px">'
          + '<div style="font-size:17px;font-weight:500;color:#F5F5F4;line-height:1.25">' + esc(e.name) + '</div>'
          + '<div style="font-size:15px;color:#8A8A8E;margin-top:2px">' + esc(muscleText) + ' · ' + (e.type || 'compound') + '</div>'
        + '</div>'
        + (isSel ? '<span style="color:#F5F5F4;font-size:17px;font-weight:700">✓</span>' : '<span style="color:#8A8A8E;font-size:15px">Select</span>')
        + '</div>';
    }).join('');

    var container = overlay.querySelector('#swapRowsContainer');
    if (container) {
      container.innerHTML = rows || '<div style="font-size:15px;color:#8A8A8E;padding:24px 0;text-align:center">No variations match your search</div>';
      attachRowEvents();
    }
  }

  function attachRowEvents() {
    overlay.querySelectorAll('[data-selectswap]').forEach(function(row) {
      row.onclick = function() {
        applySwap(row.dataset.selectswap);
      };
    });
  }

  overlay.innerHTML = '<div class="sheet" style="background:#141416;border:none;border-radius:20px 20px 0 0;padding:20px 20px calc(24px + var(--safe-b));max-width:480px;width:100%;max-height:85vh;overflow-y:auto">'
    + '<div class="sheet-handle"></div>'
    + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">'
    + '<div style="font-size:28px;font-weight:600;color:#F5F5F4;line-height:1.15">Swap Exercise</div>'
    + '<button type="button" class="btn-text-action" id="closeSwapBtn" style="font-size:15px;color:#8A8A8E;background:none;border:none;padding:0;cursor:pointer">Close</button>'
    + '</div>'
    + '<div style="font-size:15px;color:#8A8A8E;margin-bottom:12px">Choose a variation or custom exercise for this workout.</div>'
    + '<label style="display:flex;align-items:center;justify-content:space-between;background:#1C1C1F;border-radius:12px;padding:12px 14px;margin-bottom:12px;cursor:pointer">'
      + '<div>'
        + '<div style="font-size:15px;color:#F5F5F4;font-weight:500">Keep for future weeks</div>'
        + '<div style="font-size:11px;color:#8A8A8E;margin-top:2px">Saves this exercise to your routine for upcoming weeks</div>'
      + '</div>'
      + '<input type="checkbox" id="keepFutureWeeksToggle" checked style="width:20px;height:20px;accent-color:#C6F432;cursor:pointer">'
    + '</label>'
    + '<div style="display:flex;gap:8px;margin-bottom:12px">'
      + '<button type="button" id="swapSheetCreateCustomBtn" style="flex:1;height:44px;background:#1C1C1F;border:1px dashed #55555A;border-radius:12px;color:#C6F432;font-size:15px;font-weight:600;cursor:pointer">+ Custom Exercise</button>'
      + '<button type="button" id="swapSheetEditCurrentBtn" style="flex:1;height:44px;background:#1C1C1F;border:1px solid #222;border-radius:12px;color:#F5F5F4;font-size:15px;cursor:pointer">Edit Routine Sets</button>'
    + '</div>'
    + '<input type="text" id="swapSheetSearchInput" placeholder="Filter variations..." style="background:#1C1C1F;border:none;border-radius:12px;height:44px;padding:0 14px;color:#F5F5F4;font-size:15px;width:100%;margin-bottom:12px;box-sizing:border-box">'
    + '<div id="swapRowsContainer" style="max-height:48vh;overflow-y:auto"></div>'
    + '</div>';

  document.body.appendChild(overlay);

  overlay.querySelector('#closeSwapBtn').addEventListener('click', function () { overlay.remove(); });
  overlay.addEventListener('click', function (e) { if (e.target === overlay) overlay.remove(); });

  overlay.querySelector('#swapSheetCreateCustomBtn').onclick = function() {
    openAddExerciseModal(function(newEx) {
      applySwap(newEx.id, newEx);
    });
  };

  overlay.querySelector('#swapSheetEditCurrentBtn').onclick = function() {
    var curExData = getExerciseData(currId);
    var curWorkout = getCurrentWorkout(dayKey);
    var wIdx = curWorkout ? curWorkout.workoutIndex : null;
    var prog = JSON.parse(JSON.stringify(getActiveProgram()));
    var targetInProg = null;
    if (wIdx != null && prog[wIdx] && Array.isArray(prog[wIdx].exercises)) {
      targetInProg = prog[wIdx].exercises.find(function(e) { return e.id === origId || e.id === currId; });
    }
    var exToEdit = Object.assign({}, curExData, targetInProg || {});
    openEditExerciseModal(exToEdit, function(updatedEx) {
      if (wIdx != null && prog[wIdx] && Array.isArray(prog[wIdx].exercises)) {
        var tIdx = prog[wIdx].exercises.findIndex(function(e) { return e.id === origId || e.id === currId; });
        if (tIdx >= 0) {
          prog[wIdx].exercises[tIdx] = updatedEx;
          profile.activeSplitData = prog;
          sv('rg_profile', profile);
        }
      }
      overlay.remove();
      showToast('Routine exercise updated', 'ok');
      if (typeof window !== 'undefined' && typeof window.renderGym === 'function') window.renderGym();
    });
  };

  var searchInp = overlay.querySelector('#swapSheetSearchInput');
  if (searchInp) {
    searchInp.oninput = function() {
      renderList(searchInp.value);
    };
  }

  renderList('');
}

export function openEffortSheet(exId, setIndex) {
  var select = document.querySelector('.set-rir[data-ex="' + exId + '"][data-set-index="' + setIndex + '"]');
  if (!select) return;
  var current = select.value === '' ? null : parseInt(select.value, 10);
  var options = [
    { value: '', title: 'Not set', copy: 'Skip effort tracking' },
    { value: '3', title: '3+ RIR', copy: 'Could do 3 or more' },
    { value: '2', title: '2 RIR', copy: 'Could do 2 more' },
    { value: '1', title: '1 RIR', copy: 'Could do 1 more' },
    { value: '0', title: 'Failure', copy: 'No more clean reps', failure: true }
  ];
  var overlay = document.createElement('div'); overlay.className = 'overlay';
  overlay.innerHTML = '<div class="sheet"><div class="sheet-handle"></div><div class="sheet-title">Set effort</div><div class="effort-sheet-copy">RIR means reps in reserve. Choose the option that best describes how hard this set felt.</div><div class="effort-choice-grid">' + options.map(function (option) {
    var active = (option.value === '' ? current === null : current === parseInt(option.value, 10));
    return '<button type="button" class="btn effort-choice ' + (option.failure ? 'failure' : '') + '" data-effort-value="' + option.value + '" ' + (active ? 'aria-pressed="true"' : '') + '><strong>' + option.title + (active ? ' ✓' : '') + '</strong><small>' + option.copy + '</small></button>';
  }).join('') + '</div><button type="button" class="btn" id="cancelEffortBtn" style="width:100%;margin-top:10px">Cancel</button></div>';
  document.body.appendChild(overlay);
  overlay.querySelector('#cancelEffortBtn').onclick = function () { overlay.remove(); };
  overlay.addEventListener('click', function (event) { if (event.target === overlay) overlay.remove(); });
  overlay.querySelectorAll('[data-effort-value]').forEach(function (option) {
    option.onclick = function () {
      select.value = option.dataset.effortValue;
      select.dispatchEvent(new Event('input', { bubbles: true }));
      var trigger = document.querySelector('.effort-btn[data-effort-ex="' + exId + '"][data-set-index="' + setIndex + '"]');
      if (trigger) {
        var value = option.dataset.effortValue;
        trigger.textContent = value === '' ? 'Effort' : (value === '0' ? 'Failure' : value + ' RIR');
        trigger.classList.toggle('has-value', value !== '');
      }
      overlay.remove();
    };
  });
}
