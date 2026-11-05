/* Gym plan editor: split manager sheet, custom routine manager, and reordering */

import { profile } from "../../state.js";
import { sv, dayRecord, saveDayRecord } from "../../storage.js";
import { getActiveProgram, getExerciseData, DEFAULT_5DAY_ROUTINE } from "../../data/plan.js";
import { openActionMenuSheet } from "../../components/sheet.js";
import { showToast } from "../../components/toast.js";
import { esc } from "../../lib/format.js";
export * from "./exercise-modal.js";
export * from "./edit-workout.js";

export function openCustomRoutineSheet(dayKey) {
  var day = new Date(dayKey + 'T00:00:00').getDay();
  var dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var overlay = document.createElement('div'); overlay.className = 'overlay';
  overlay.innerHTML = '<div class="sheet"><div class="sheet-handle"></div>'
    + '<div class="sheet-title">Add exercise · ' + dayNames[day] + '</div>'
    + '<div style="font-size:11px;color:var(--text-muted);margin-bottom:6px">Enter your trainer\'s exercise. Sets, reps, and weight are logged manually on the Gym screen.</div>'
    + '<label class="eyebrow">Exercise name</label><input id="customExName" type="text" placeholder="e.g. Chest press machine">'
    + '<label class="eyebrow">Muscle group</label><input id="customExMuscle" type="text" placeholder="e.g. chest, triceps">'
    + '<div style="display:flex;gap:8px"><div style="flex:1"><label class="eyebrow">Planned sets</label><input id="customExSets" type="number" min="1" value="3" inputmode="numeric"></div><div style="flex:1"><label class="eyebrow">Rep range</label><input id="customExReps" type="text" value="8–12" placeholder="optional"></div></div>'
    + '<div style="display:flex;gap:8px"><div style="flex:1"><label class="eyebrow">Rest seconds</label><input id="customExRest" type="number" min="0" value="90" inputmode="numeric"></div><div style="flex:1"><label class="eyebrow">Type</label><select id="customExType"><option value="machine">Machine</option><option value="compound">Compound</option><option value="isolation">Isolation</option></select></div></div>'
    + '<label class="eyebrow">Notes / cue</label><input id="customExCue" type="text" placeholder="optional technique cue">'
    + '<div class="modal-actions" style="margin-top:10px"><button class="btn" id="cancelRoutineBtn">Cancel</button><button class="btn btn-primary" id="saveRoutineBtn">Add exercise</button></div></div>';
  document.body.appendChild(overlay);
  overlay.querySelector('#cancelRoutineBtn').addEventListener('click', function () { overlay.remove(); });
  overlay.querySelector('#saveRoutineBtn').addEventListener('click', function () {
    var name = overlay.querySelector('#customExName').value.trim();
    if (!name) { showToast('Enter an exercise name', 'warn'); return; }
    var exercise = {
      id: 'custom_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
      name: name,
      muscle: overlay.querySelector('#customExMuscle').value.trim() || 'other',
      sets: parseInt(overlay.querySelector('#customExSets').value, 10) || 3,
      reps: overlay.querySelector('#customExReps').value.trim() || 'manual',
      rir: '',
      rest: parseInt(overlay.querySelector('#customExRest').value, 10) || 90,
      cue: overlay.querySelector('#customExCue').value.trim(),
      type: overlay.querySelector('#customExType').value
    };
    profile.customRoutines = profile.customRoutines || {};
    profile.customRoutines[day] = profile.customRoutines[day] || [];
    profile.customRoutines[day].push(exercise);
    sv('rg_profile', profile);
    overlay.remove();
    if (typeof window !== 'undefined' && typeof window.renderGym === 'function') window.renderGym();
  });
}

export function openSplitManagerSheet() {
  var prog = JSON.parse(JSON.stringify(getActiveProgram()));
  var currentTdays = (profile && Array.isArray(profile.trainingDays) && profile.trainingDays.length > 0)
    ? profile.trainingDays.slice()
    : [1, 2, 4, 5, 6];
  var tdays = currentTdays.slice();
  var weekDaysMeta = [
    { js: 1, name: 'Mon' },
    { js: 2, name: 'Tue' },
    { js: 3, name: 'Wed' },
    { js: 4, name: 'Thu' },
    { js: 5, name: 'Fri' },
    { js: 6, name: 'Sat' },
    { js: 0, name: 'Sun' }
  ];

  var overlay = document.createElement('div');
  overlay.className = 'overlay';

  function renderSplitUI() {
    var dayTogglesHTML = weekDaysMeta.map(function (d) {
      var active = tdays.includes(d.js);
      return '<button type="button" class="day-toggle ' + (active ? 'active' : '') + '" data-split-day="' + d.js + '">' + d.name + '</button>';
    }).join('');

    var trainCount = tdays.length;
    var restCount = 7 - trainCount;

    var daysHTML = prog.map(function (day, dIdx) {
      var exListHTML = (day.exercises || []).map(function (ex, eIdx) {
        return '<div style="display:flex;align-items:center;justify-content:space-between;padding:12px 0;border-bottom:1px solid #222;gap:8px">'
          + '<div style="flex:1;min-width:0;padding-right:8px">'
          + '<div style="font-size:17px;font-weight:500;color:#F5F5F4;line-height:1.25">' + esc(ex.name) + '</div>'
          + '<div style="font-size:15px;color:#8A8A8E;margin-top:2px">'
          + ex.sets + ' sets · ' + esc(ex.reps)
          + (ex.rir ? ' · ' + esc(ex.rir) + ' RIR' : '')
          + (ex.rest ? ' · ' + ex.rest + 's rest' : '')
          + '</div>'
          + '</div>'
          + '<button type="button" class="btn-ghost" data-ex-menu="' + dIdx + ',' + eIdx + '" style="font-size:17px;line-height:1;padding:4px 8px;color:#8A8A8E;background:none;border:none;cursor:pointer" aria-label="Exercise options">···</button>'
          + '</div>';
      }).join('');

      var totalSets = (day.exercises || []).reduce(function (acc, item) { return acc + (Number(item.sets) || 0); }, 0);

      return '<div class="split-day-card" style="background:#141416;border:1px solid #222;border-radius:20px;padding:16px;margin-bottom:16px">'
        + '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;gap:8px">'
        + '<div style="flex:1;min-width:0">'
        + '<div style="font-size:17px;font-weight:600;color:#F5F5F4;line-height:1.25;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;word-break:break-word">' + esc(day.label) + '</div>'
        + '<div style="font-size:15px;color:#8A8A8E;margin-top:2px">' + (day.exercises || []).length + ' exercises · ' + totalSets + ' sets</div>'
        + '</div>'
        + '<button type="button" class="btn-ghost" data-day-menu="' + dIdx + '" style="font-size:17px;line-height:1;padding:4px 8px;color:#8A8A8E;background:none;border:none;cursor:pointer" aria-label="Session options">···</button>'
        + '</div>'
        + (exListHTML || '<div style="font-size:15px;color:#55555A;padding:8px 0">No exercises yet in this workout day.</div>')
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
      + '<div style="font-size:15px;color:#8A8A8E;margin-bottom:16px">Customize your training days, sessions and exercises.</div>'

      // Section 1: Days of Week You Train
      + '<div style="margin-bottom:20px">'
      + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">'
      + '<span class="eyebrow">Days You Train</span>'
      + '<span style="font-size:11px;color:#8A8A8E;font-weight:600">' + trainCount + ' training · ' + restCount + ' rest</span>'
      + '</div>'
      + '<div class="day-toggles">' + dayTogglesHTML + '</div>'
      + '</div>'

      // Section 2: Workout Days
      + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">'
      + '<span class="eyebrow">Workout Sessions (' + prog.length + ' days in split)</span>'
      + '<button type="button" class="btn-text-action" id="addNewSplitDayBtn" style="color:#F5F5F4;font-size:15px;font-weight:600;background:none;border:none;padding:0;cursor:pointer">+ Workout day</button>'
      + '</div>'
      + '<div class="split-manager-list" style="max-height:50vh;overflow-y:auto">' + (daysHTML || '<div style="text-align:center;color:#55555A;padding:20px 0">No workout days in this plan yet.</div>') + '</div>'

      // Bottom Save button
      + '<div style="margin-top:20px">'
      + '<button type="button" class="btn btn-primary" id="saveCloseSplitBtn" style="width:100%;height:48px;border-radius:12px;background:#C6F432;color:#0B0B0C;border:none;font-size:15px;font-weight:600;cursor:pointer">Save & Apply Plan</button>'
      + '</div>'
      + '</div>';

    overlay.querySelector('#closeSplitEditorBtn').onclick = function () { overlay.remove(); };

    // Day toggles events
    overlay.querySelectorAll('[data-split-day]').forEach(function (btn) {
      btn.onclick = function () {
        var dayVal = parseInt(btn.dataset.splitDay, 10);
        if (tdays.includes(dayVal)) {
          if (tdays.length <= 1) {
            showToast('You need at least 1 training day', 'warn');
            return;
          }
          tdays = tdays.filter(function (x) { return x !== dayVal; });
        } else {
          tdays.push(dayVal);
          tdays.sort(function (a, b) { return (a === 0 ? 7 : a) - (b === 0 ? 7 : b); });
        }
        renderSplitUI();
      };
    });

    // Day ... menu
    overlay.querySelectorAll('[data-day-menu]').forEach(function (btn) {
      btn.onclick = function () {
        var dIdx = parseInt(btn.dataset.dayMenu, 10);
        var dayObj = prog[dIdx];
        var menuItems = [
          {
            label: 'Rename',
            action: function () {
              var newName = prompt('Enter name for this workout day:', dayObj.label || '');
              if (newName && newName.trim()) {
                dayObj.label = newName.trim();
                renderSplitUI();
              }
            }
          },
          {
            label: '+ Add exercise',
            action: function () {
              openAddExerciseModal(function (newEx) {
                dayObj.exercises = dayObj.exercises || [];
                dayObj.exercises.push(newEx);
                renderSplitUI();
              });
            }
          }
        ];

        if (dIdx > 0) {
          menuItems.push({
            label: 'Move up',
            action: function () {
              var temp = prog[dIdx];
              prog[dIdx] = prog[dIdx - 1];
              prog[dIdx - 1] = temp;
              renderSplitUI();
            }
          });
        }
        if (dIdx < prog.length - 1) {
          menuItems.push({
            label: 'Move down',
            action: function () {
              var temp = prog[dIdx];
              prog[dIdx] = prog[dIdx + 1];
              prog[dIdx + 1] = temp;
              renderSplitUI();
            }
          });
        }

        menuItems.push({
          label: 'Delete day',
          destructive: true,
          action: function () {
            if (prog.length <= 1) {
              showToast('Workout plan must have at least 1 day', 'warn');
              return;
            }
            if (!confirm('Delete ' + (dayObj.label || 'this day') + '?')) return;
            prog.splice(dIdx, 1);
            renderSplitUI();
          }
        });

        openActionMenuSheet(dayObj.label || 'Session Options', menuItems);
      };
    });

    // Exercise ... menu
    overlay.querySelectorAll('[data-ex-menu]').forEach(function (btn) {
      btn.onclick = function () {
        var parts = btn.dataset.exMenu.split(',');
        var dIdx = parseInt(parts[0], 10);
        var eIdx = parseInt(parts[1], 10);
        var dayObj = prog[dIdx];
        var exObj = dayObj.exercises[eIdx];

        var menuItems = [];
        if (eIdx > 0) {
          menuItems.push({
            label: 'Move up',
            action: function () {
              var temp = dayObj.exercises[eIdx];
              dayObj.exercises[eIdx] = dayObj.exercises[eIdx - 1];
              dayObj.exercises[eIdx - 1] = temp;
              renderSplitUI();
            }
          });
        }
        if (eIdx < dayObj.exercises.length - 1) {
          menuItems.push({
            label: 'Move down',
            action: function () {
              var temp = dayObj.exercises[eIdx];
              dayObj.exercises[eIdx] = dayObj.exercises[eIdx + 1];
              dayObj.exercises[eIdx + 1] = temp;
              renderSplitUI();
            }
          });
        }

        menuItems.push({
          label: 'Edit',
          action: function () {
            openEditExerciseModal(exObj, function (updatedEx) {
              dayObj.exercises[eIdx] = updatedEx;
              renderSplitUI();
            });
          }
        });

        menuItems.push({
          label: 'Delete',
          destructive: true,
          action: function () {
            dayObj.exercises.splice(eIdx, 1);
            renderSplitUI();
          }
        });

        openActionMenuSheet(exObj.name || 'Exercise Options', menuItems);
      };
    });

    // Add new day
    overlay.querySelector('#addNewSplitDayBtn').onclick = function () {
      var dayName = prompt('Enter Day Name (e.g. Day ' + (prog.length + 1) + ' — Push):', 'Day ' + (prog.length + 1) + ' — Custom');
      if (!dayName || !dayName.trim()) return;
      prog.push({
        label: dayName.trim(),
        dayIndex: prog.length,
        exercises: []
      });
      renderSplitUI();
    };

    // Reset default
    overlay.querySelector('#resetDefaultSplitBtn').onclick = function () {
      if (!confirm('Reset back to the default 5-Day Muscle-Building Split (Day 4 Arms, Day 5 Chest & Back B)?')) return;
      prog = JSON.parse(JSON.stringify(DEFAULT_5DAY_ROUTINE));
      tdays = [1, 2, 4, 5, 6];
      profile.activeSplitData = prog;
      profile.trainingDays = tdays;
      sv('rg_profile', profile);
      renderSplitUI();
      showToast('Reset to 5-Day Muscle Split', 'ok');
    };

    // Save & Close
    overlay.querySelector('#saveCloseSplitBtn').onclick = function () {
      if (!tdays || tdays.length === 0) {
        showToast('Please select at least 1 training day', 'warn');
        return;
      }
      if (!prog || prog.length === 0) {
        showToast('Please add at least 1 workout day', 'warn');
        return;
      }
      profile.activeSplitData = prog;
      profile.trainingDays = tdays;
      profile.programSplit = 'custom';
      sv('rg_profile', profile);
      overlay.remove();
      showToast('Workout plan & schedule saved', 'ok');
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
      return '<div style="display:flex;align-items:center;gap:8px;margin-top:6px;font-size:11px;color:var(--text-secondary)"><span style="flex:1">' + ex.name + '</span><button class="btn-ghost" data-routine-remove="' + day + '" data-exid="' + ex.id + '" style="color:var(--rust-light);font-size:11px">Remove</button></div>';
    }).join('');
    return '<div style="display:flex;align-items:center;gap:10px;padding:12px 0;border-bottom:1px solid var(--border)">'
      + '<div style="flex:1"><div style="font-size:15px;font-weight:600">' + names[day] + '</div><div style="font-size:11px;color:var(--text-muted)">' + count + ' exercise' + (count === 1 ? '' : 's') + ' saved</div>' + exerciseList + '</div>'
      + '<button class="btn btn-sm" data-routine-day="' + day + '">Add</button></div>';
  }).join('');
  overlay.innerHTML = '<div class="sheet"><div class="sheet-handle"></div><div class="sheet-title">Custom routines</div>'
    + '<div style="font-size:11px;color:var(--text-muted);line-height:1.45">Build each training day separately. Your sets, reps, and weight stay in the daily log.</div>'
    + rows
    + '<button class="btn" id="closeRoutineManagerBtn" style="margin-top:10px">Close</button></div>';
  document.body.appendChild(overlay);
  overlay.querySelector('#closeRoutineManagerBtn').addEventListener('click', function () { overlay.remove(); });
  overlay.querySelectorAll('[data-routine-remove]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var day = btn.dataset.routineRemove;
      profile.customRoutines[day] = (profile.customRoutines[day] || []).filter(function (ex) { return ex.id !== btn.dataset.exid; });
      sv('rg_profile', profile);
      overlay.remove();
      openCustomRoutineManager();
    });
  });
  overlay.querySelectorAll('[data-routine-day]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var day = parseInt(btn.dataset.routineDay, 10);
      var now = new Date();
      var offset = (day - now.getDay() + 7) % 7;
      var target = addDays(now, offset);
      overlay.remove();
      openCustomRoutineSheet(dateKey(target));
    });
  });
}
