/* Gym plan editor: split manager sheet, custom routine manager, and reordering */

import { profile, setState } from "../../state.js";
import { sv } from "../../storage.js";
import { getActiveProgram, DEFAULT_5DAY_ROUTINE } from "../../data/plan.js";
import { openActionMenuSheet } from "../../components/sheet.js";
import { showToast } from "../../components/toast.js";
import { esc } from "../../lib/format.js";
import { openAddExerciseModal, openEditExerciseModal, openSwapExerciseModal } from "./exercise-modal.js";
export * from "./exercise-modal.js";
export * from "./edit-workout.js";

export function openCustomRoutineSheet(dayKey) {
  var day = new Date(dayKey + 'T00:00:00').getDay();
  var dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var overlay = document.createElement('div'); overlay.className = 'overlay';
  overlay.innerHTML = '<div class="sheet"><div class="sheet-handle"></div>'
    + '<div class="sheet-title">Add exercise · ' + dayNames[day] + '</div>'
    + '<label class="eyebrow">Exercise name</label><input id="customExName" type="text" placeholder="e.g. Chest press machine">'
    + '<label class="eyebrow">Muscle group</label><input id="customExMuscle" type="text" placeholder="e.g. chest, triceps">'
    + '<div style="display:flex;gap:8px"><div style="flex:1"><label class="eyebrow">Sets</label><input id="customExSets" type="number" min="1" value="3"></div><div style="flex:1"><label class="eyebrow">Reps</label><input id="customExReps" type="text" value="8–12"></div></div>'
    + '<div style="display:flex;gap:8px"><div style="flex:1"><label class="eyebrow">Rest</label><input id="customExRest" type="number" min="0" value="90"></div><div style="flex:1"><label class="eyebrow">Type</label><select id="customExType"><option value="machine">Machine</option><option value="compound">Compound</option><option value="isolation">Isolation</option></select></div></div>'
    + '<div class="modal-actions" style="margin-top:10px"><button class="btn" id="cancelRoutineBtn">Cancel</button><button class="btn btn-primary" id="saveRoutineBtn">Add exercise</button></div></div>';
  document.body.appendChild(overlay);
  overlay.querySelector('#cancelRoutineBtn').onclick = function () { overlay.remove(); };
  overlay.querySelector('#saveRoutineBtn').onclick = function () {
    var name = overlay.querySelector('#customExName').value.trim();
    if (!name) { showToast('Enter an exercise name', 'warn'); return; }
    profile.customRoutines = profile.customRoutines || {};
    profile.customRoutines[day] = profile.customRoutines[day] || [];
    profile.customRoutines[day].push({
      id: 'custom_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
      name: name,
      muscle: overlay.querySelector('#customExMuscle').value.trim() || 'other',
      sets: parseInt(overlay.querySelector('#customExSets').value, 10) || 3,
      reps: overlay.querySelector('#customExReps').value.trim() || '8–12',
      rir: '1–2', rest: parseInt(overlay.querySelector('#customExRest').value, 10) || 90,
      cue: '', type: overlay.querySelector('#customExType').value
    });
    sv('rg_profile', profile);
    overlay.remove();
    if (typeof window !== 'undefined' && typeof window.renderGym === 'function') window.renderGym();
  };
}

export function openSplitManagerSheet() {
  var prog = JSON.parse(JSON.stringify(getActiveProgram()));
  var currentTdays = (profile && Array.isArray(profile.trainingDays) && profile.trainingDays.length > 0) ? profile.trainingDays.slice() : [1, 2, 4, 5, 6];
  var tdays = currentTdays.slice();
  var weekDaysMeta = [{ js: 1, name: 'Mon' }, { js: 2, name: 'Tue' }, { js: 3, name: 'Wed' }, { js: 4, name: 'Thu' }, { js: 5, name: 'Fri' }, { js: 6, name: 'Sat' }, { js: 0, name: 'Sun' }];

  var overlay = document.createElement('div');
  overlay.className = 'overlay';

  function renderSplitUI() {
    var dayTogglesHTML = weekDaysMeta.map(function (d) {
      var act = tdays.includes(d.js);
      return '<button type="button" class="day-toggle ' + (act ? 'active' : '') + '" data-split-day="' + d.js + '">' + d.name + '</button>';
    }).join('');

    var daysHTML = prog.map(function (day, dIdx) {
      var exCount = (day.exercises || []).length;
      var exListHTML = (day.exercises || []).map(function (ex, eIdx) {
        var upBtn = '<button type="button" data-ex-up="' + dIdx + ',' + eIdx + '" style="background:none;border:none;padding:2px 4px;font-size:11px;color:' + (eIdx > 0 ? '#F5F5F4' : '#55555A') + ';cursor:' + (eIdx > 0 ? 'pointer' : 'default') + '"' + (eIdx === 0 ? ' disabled' : '') + '>▲</button>';
        var downBtn = '<button type="button" data-ex-down="' + dIdx + ',' + eIdx + '" style="background:none;border:none;padding:2px 4px;font-size:11px;color:' + (eIdx < exCount - 1 ? '#F5F5F4' : '#55555A') + ';cursor:' + (eIdx < exCount - 1 ? 'pointer' : 'default') + '"' + (eIdx === exCount - 1 ? ' disabled' : '') + '>▼</button>';
        return '<div style="display:flex;align-items:center;justify-content:space-between;padding:12px 0;border-bottom:1px solid #222;gap:8px">'
          + '<div style="display:flex;flex-direction:column;gap:2px;margin-right:6px">' + upBtn + downBtn + '</div>'
          + '<div style="flex:1;min-width:0;padding-right:8px">'
            + '<div style="font-size:17px;font-weight:500;color:#F5F5F4;line-height:1.25">' + esc(ex.name) + '</div>'
            + '<div style="font-size:15px;color:#8A8A8E;margin-top:2px">' + ex.sets + ' sets · ' + esc(ex.reps) + (ex.rir ? ' · ' + esc(ex.rir) + ' RIR' : '') + '</div>'
          + '</div>'
          + '<div style="display:flex;align-items:center;gap:6px">'
            + '<button type="button" class="btn-text-action" data-ex-swap="' + dIdx + ',' + eIdx + '" style="font-size:15px;color:#F5F5F4;background:none;border:none;padding:4px 6px;cursor:pointer">Swap</button>'
            + '<button type="button" class="btn-ghost" data-ex-menu="' + dIdx + ',' + eIdx + '" style="font-size:17px;line-height:1;padding:4px 6px;color:#8A8A8E;background:none;border:none;cursor:pointer">···</button>'
          + '</div>'
          + '</div>';
      }).join('');

      var totalSets = (day.exercises || []).reduce(function (acc, item) { return acc + (Number(item.sets) || 0); }, 0);
      return '<div class="split-day-card" style="padding:16px 0;border-bottom:1px solid #222;margin-bottom:8px">'
        + '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;gap:8px">'
          + '<div style="flex:1;min-width:0">'
            + '<div style="font-size:17px;font-weight:600;color:#F5F5F4;line-height:1.25">' + esc(day.label) + '</div>'
            + '<div style="font-size:15px;color:#8A8A8E;margin-top:2px">' + exCount + ' exercises · ' + totalSets + ' sets</div>'
          + '</div>'
          + '<button type="button" class="btn-ghost" data-day-menu="' + dIdx + '" style="font-size:17px;line-height:1;padding:4px 8px;color:#8A8A8E;background:none;border:none;cursor:pointer">···</button>'
        + '</div>'
        + (exListHTML || '<div style="font-size:15px;color:#55555A;padding:8px 0">No exercises yet in this workout day.</div>')
        + '<div style="margin-top:10px"><button type="button" class="btn-text-action" data-add-ex-day="' + dIdx + '" style="font-size:15px;color:#F5F5F4;font-weight:600;background:none;border:none;padding:6px 0;cursor:pointer">+ Add exercise</button></div>'
        + '</div>';
    }).join('');

    overlay.innerHTML = '<div class="sheet" style="background:#141416;border:none;border-radius:20px 20px 0 0;padding:20px 20px calc(24px + var(--safe-b));max-width:480px;width:100%">'
      + '<div class="sheet-handle"></div>'
      + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">'
        + '<div style="font-size:28px;font-weight:600;color:#F5F5F4;line-height:1.15">Plan Editor</div>'
        + '<div style="display:flex;align-items:center;gap:16px">'
          + '<button type="button" class="btn-text-action" id="resetDefaultSplitBtn" style="font-size:15px;color:#F5F5F4;background:none;border:none;padding:0;cursor:pointer">Reset default</button>'
          + '<button type="button" class="btn-text-action" id="closeSplitEditorBtn" style="font-size:15px;color:#8A8A8E;background:none;border:none;padding:0;cursor:pointer">Close</button>'
        + '</div>'
      + '</div>'
      + '<div style="font-size:15px;color:#8A8A8E;margin-bottom:16px">Customize days, sessions, exercise order, and swaps. Saved plans apply to future workouts.</div>'
      + '<div style="margin-bottom:20px">'
        + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><span class="eyebrow">Days You Train</span><span style="font-size:11px;color:#8A8A8E;font-weight:600">' + tdays.length + ' training · ' + (7 - tdays.length) + ' rest</span></div>'
        + '<div class="day-toggles">' + dayTogglesHTML + '</div>'
      + '</div>'
      + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">'
        + '<span class="eyebrow">Workout Sessions (' + prog.length + ' days in split)</span>'
        + '<button type="button" class="btn-text-action" id="addNewSplitDayBtn" style="color:#F5F5F4;font-size:15px;font-weight:600;background:none;border:none;padding:0;cursor:pointer">+ Workout day</button>'
      + '</div>'
      + '<div class="split-manager-list" style="max-height:50vh;overflow-y:auto">' + (daysHTML || '<div style="text-align:center;color:#55555A;padding:20px 0">No workout days in this plan yet.</div>') + '</div>'
      + '<div style="margin-top:20px"><button type="button" class="btn" id="saveCloseSplitBtn" style="width:100%;height:48px;border-radius:12px;background:#F5F5F4;color:#0B0B0C;border:none;font-size:15px;font-weight:600;cursor:pointer">Save & Apply Plan</button></div>'
      + '</div>';

    overlay.querySelector('#closeSplitEditorBtn').onclick = function () { overlay.remove(); };

    overlay.querySelectorAll('[data-add-ex-day]').forEach(function (btn) {
      btn.onclick = function () {
        var dIdx = parseInt(btn.dataset.addExDay, 10);
        openAddExerciseModal(function (newEx) {
          prog[dIdx].exercises = prog[dIdx].exercises || [];
          prog[dIdx].exercises.push(newEx);
          renderSplitUI();
        });
      };
    });

    overlay.querySelectorAll('[data-ex-swap]').forEach(function (btn) {
      btn.onclick = function () {
        var parts = btn.dataset.exSwap.split(',');
        var dIdx = parseInt(parts[0], 10), eIdx = parseInt(parts[1], 10);
        openSwapExerciseModal(prog[dIdx].exercises[eIdx], function (swappedEx) {
          prog[dIdx].exercises[eIdx] = swappedEx;
          renderSplitUI();
        });
      };
    });

    overlay.querySelectorAll('[data-ex-up]').forEach(function (btn) {
      btn.onclick = function () {
        var p = btn.dataset.exUp.split(','), d = parseInt(p[0], 10), e = parseInt(p[1], 10);
        if (e > 0) {
          var arr = prog[d].exercises, tmp = arr[e];
          arr[e] = arr[e - 1]; arr[e - 1] = tmp;
          renderSplitUI();
        }
      };
    });

    overlay.querySelectorAll('[data-ex-down]').forEach(function (btn) {
      btn.onclick = function () {
        var p = btn.dataset.exDown.split(','), d = parseInt(p[0], 10), e = parseInt(p[1], 10);
        var arr = prog[d].exercises;
        if (e < arr.length - 1) {
          var tmp = arr[e];
          arr[e] = arr[e + 1]; arr[e + 1] = tmp;
          renderSplitUI();
        }
      };
    });

    overlay.querySelectorAll('[data-split-day]').forEach(function (btn) {
      btn.onclick = function () {
        var dayVal = parseInt(btn.dataset.splitDay, 10);
        if (tdays.includes(dayVal)) {
          if (tdays.length <= 1) { showToast('Need at least 1 training day', 'warn'); return; }
          tdays = tdays.filter(function (x) { return x !== dayVal; });
        } else {
          tdays.push(dayVal);
          tdays.sort(function (a, b) { return (a === 0 ? 7 : a) - (b === 0 ? 7 : b); });
        }
        renderSplitUI();
      };
    });

    overlay.querySelectorAll('[data-day-menu]').forEach(function (btn) {
      btn.onclick = function () {
        var dIdx = parseInt(btn.dataset.dayMenu, 10);
        var dayObj = prog[dIdx];
        var menuItems = [
          { label: 'Rename', action: function () {
            var n = prompt('Enter name for this workout day:', dayObj.label || '');
            if (n && n.trim()) { dayObj.label = n.trim(); renderSplitUI(); }
          }},
          { label: '+ Add exercise', action: function () {
            openAddExerciseModal(function (newEx) {
              dayObj.exercises = dayObj.exercises || [];
              dayObj.exercises.push(newEx);
              renderSplitUI();
            });
          }}
        ];
        if (dIdx > 0) menuItems.push({ label: 'Move up', action: function () { var t = prog[dIdx]; prog[dIdx] = prog[dIdx - 1]; prog[dIdx - 1] = t; renderSplitUI(); } });
        if (dIdx < prog.length - 1) menuItems.push({ label: 'Move down', action: function () { var t = prog[dIdx]; prog[dIdx] = prog[dIdx + 1]; prog[dIdx + 1] = t; renderSplitUI(); } });
        menuItems.push({ label: 'Delete day', destructive: true, action: function () {
          if (prog.length <= 1) { showToast('Plan must have at least 1 day', 'warn'); return; }
          if (!confirm('Delete ' + (dayObj.label || 'this day') + '?')) return;
          prog.splice(dIdx, 1);
          renderSplitUI();
        }});
        openActionMenuSheet(dayObj.label || 'Session Options', menuItems);
      };
    });

    overlay.querySelectorAll('[data-ex-menu]').forEach(function (btn) {
      btn.onclick = function () {
        var p = btn.dataset.exMenu.split(','), dIdx = parseInt(p[0], 10), eIdx = parseInt(p[1], 10);
        var dayObj = prog[dIdx], exObj = dayObj.exercises[eIdx];
        var menuItems = [
          { label: 'Swap / Change exercise', action: function () {
            openSwapExerciseModal(exObj, function (swappedEx) { dayObj.exercises[eIdx] = swappedEx; renderSplitUI(); });
          }}
        ];
        if (eIdx > 0) menuItems.push({ label: 'Move up', action: function () { var t = dayObj.exercises[eIdx]; dayObj.exercises[eIdx] = dayObj.exercises[eIdx - 1]; dayObj.exercises[eIdx - 1] = t; renderSplitUI(); } });
        if (eIdx < dayObj.exercises.length - 1) menuItems.push({ label: 'Move down', action: function () { var t = dayObj.exercises[eIdx]; dayObj.exercises[eIdx] = dayObj.exercises[eIdx + 1]; dayObj.exercises[eIdx + 1] = t; renderSplitUI(); } });
        menuItems.push({ label: 'Edit details', action: function () {
          openEditExerciseModal(exObj, function (updatedEx) { dayObj.exercises[eIdx] = updatedEx; renderSplitUI(); });
        }});
        menuItems.push({ label: 'Delete', destructive: true, action: function () {
          dayObj.exercises.splice(eIdx, 1);
          renderSplitUI();
        }});
        openActionMenuSheet(exObj.name || 'Exercise Options', menuItems);
      };
    });

    overlay.querySelector('#addNewSplitDayBtn').onclick = function () {
      var n = prompt('Enter Day Name (e.g. Day ' + (prog.length + 1) + ' — Push):', 'Day ' + (prog.length + 1) + ' — Custom');
      if (!n || !n.trim()) return;
      prog.push({ label: n.trim(), dayIndex: prog.length, exercises: [] });
      renderSplitUI();
    };

    overlay.querySelector('#resetDefaultSplitBtn').onclick = function () {
      if (!confirm('Reset back to default 5-Day Muscle-Building Split?')) return;
      prog = JSON.parse(JSON.stringify(DEFAULT_5DAY_ROUTINE));
      tdays = [1, 2, 4, 5, 6];
      profile.activeSplitData = prog;
      profile.trainingDays = tdays;
      sv('rg_profile', profile);
      setState({ profile: profile });
      renderSplitUI();
      showToast('Reset to 5-Day Muscle Split', 'ok');
    };

    overlay.querySelector('#saveCloseSplitBtn').onclick = function () {
      if (!tdays || !tdays.length) { showToast('Select at least 1 training day', 'warn'); return; }
      if (!prog || !prog.length) { showToast('Add at least 1 workout day', 'warn'); return; }
      profile.activeSplitData = JSON.parse(JSON.stringify(prog));
      profile.trainingDays = tdays;
      profile.programSplit = 'custom';
      sv('rg_profile', profile);
      setState({ profile: profile });
      overlay.remove();
      showToast('Workout plan updated & saved for future sessions', 'ok');
      if (typeof window !== 'undefined' && typeof window.renderTab === 'function') window.renderTab();
    };
  }

  document.body.appendChild(overlay);
  renderSplitUI();
}

export function openCustomRoutineManager() {
  var days = profile.trainingDays || [];
  var names = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var routines = profile.customRoutines || {};
  var overlay = document.createElement('div'); overlay.className = 'overlay';
  var rows = days.map(function (day) {
    var routine = routines[day] || [];
    var count = routine.length;
    var exerciseList = routine.map(function (ex) {
      return '<div style="display:flex;align-items:center;gap:8px;margin-top:6px;font-size:11px;color:var(--text-secondary)"><span style="flex:1">' + esc(ex.name) + '</span><button class="btn-ghost" data-routine-remove="' + day + '" data-exid="' + ex.id + '" style="color:#FF4D4F;font-size:11px">Remove</button></div>';
    }).join('');
    return '<div style="display:flex;align-items:center;gap:10px;padding:12px 0;border-bottom:1px solid #222">'
      + '<div style="flex:1"><div style="font-size:15px;font-weight:600;color:#F5F5F4">' + names[day] + '</div><div style="font-size:11px;color:#8A8A8E">' + count + ' exercise' + (count === 1 ? '' : 's') + ' saved</div>' + exerciseList + '</div>'
      + '<button class="btn" data-routine-day="' + day + '" style="height:36px;padding:0 12px;font-size:15px;background:#1C1C1F;color:#F5F5F4;border:none;border-radius:8px;cursor:pointer">Add</button></div>';
  }).join('');
  overlay.innerHTML = '<div class="sheet" style="background:#141416;border-radius:20px 20px 0 0;padding:20px"><div class="sheet-handle"></div><div class="sheet-title" style="font-size:28px;font-weight:600;color:#F5F5F4">Custom routines</div>'
    + '<div style="font-size:11px;color:#8A8A8E;line-height:1.45;margin-bottom:12px">Build each training day separately. Your sets, reps, and weight stay in the daily log.</div>'
    + rows
    + '<button class="btn" id="closeRoutineManagerBtn" style="margin-top:16px;width:100%;height:48px;border-radius:12px;background:#1C1C1F;color:#8A8A8E;border:none;font-size:15px;cursor:pointer">Close</button></div>';
  document.body.appendChild(overlay);
  overlay.querySelector('#closeRoutineManagerBtn').onclick = function () { overlay.remove(); };
  overlay.querySelectorAll('[data-routine-remove]').forEach(function (btn) {
    btn.onclick = function () {
      var day = btn.dataset.routineRemove;
      profile.customRoutines[day] = (profile.customRoutines[day] || []).filter(function (ex) { return ex.id !== btn.dataset.exid; });
      sv('rg_profile', profile);
      overlay.remove();
      openCustomRoutineManager();
    };
  });
  overlay.querySelectorAll('[data-routine-day]').forEach(function (btn) {
    btn.onclick = function () {
      var day = parseInt(btn.dataset.routineDay, 10);
      var now = new Date(), offset = (day - now.getDay() + 7) % 7;
      var target = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
      var y = target.getFullYear(), m = String(target.getMonth() + 1).padStart(2, '0'), d = String(target.getDate()).padStart(2, '0');
      overlay.remove();
      openCustomRoutineSheet(y + '-' + m + '-' + d);
    };
  });
}
