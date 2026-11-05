/* Gym exercise editor modals: add, edit, and swap exercises in plan */

import { profile } from "../../state.js";
import { sv } from "../../storage.js";
import { getActiveProgram, getExerciseData, getAllExercisesForMuscle, ALTERNATES } from "../../data/plan.js";
import { BUILTIN_EXERCISE_CATALOG, getAllKnownExercises, saveCustomExercise } from "../../data/exercises.js";
import { esc } from "../../lib/format.js";
import { showToast } from "../../components/toast.js";

export { BUILTIN_EXERCISE_CATALOG };
export var BASE_EXERCISE_LIBRARY = BUILTIN_EXERCISE_CATALOG;

export function getFullExerciseCatalog() {
  var seen = {};
  var list = [];
  function add(item) {
    if (!item || !item.name) return;
    var norm = item.name.toLowerCase().trim();
    if (seen[norm]) return;
    seen[norm] = true;
    var id = item.id || norm.replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    list.push({
      id: id,
      name: item.name,
      muscle: item.muscle || 'other',
      sets: item.sets || 2,
      reps: item.reps || '8–12',
      rir: item.rir || '1–2',
      rest: item.rest != null ? item.rest : 90,
      cue: item.cue || '',
      weightIncrement: item.weightIncrement || 2.5,
      type: item.type || 'compound',
      bodyweight: item.bodyweight === true || item.isBW === true
    });
  }
  getAllKnownExercises().forEach(add);
  if (Array.isArray(ALTERNATES)) ALTERNATES.forEach(add);
  var prog = getActiveProgram();
  if (Array.isArray(prog)) {
    prog.forEach(function(day) {
      if (Array.isArray(day.exercises)) day.exercises.forEach(add);
    });
  }
  return list;
}

export function openAddExerciseModal(onAdd) {
  var quickLibrary = BUILTIN_EXERCISE_CATALOG;
  var quickChipsHTML = quickLibrary.slice(0, 16).map(function(item, idx) {
    return '<button type="button" class="chip" data-quick-ex-idx="' + idx + '" style="font-size:11px;padding:4px 8px;border-radius:8px;background:#1C1C1F;border:none;color:#F5F5F4;cursor:pointer">' + esc(item.name) + '</button>';
  }).join('');

  var modal = document.createElement('div');
  modal.className = 'overlay';
  modal.style.zIndex = '9999';
  modal.innerHTML = '<div class="sheet" style="max-height:88vh;overflow-y:auto;background:#141416;border-radius:20px 20px 0 0;padding:20px">'
    + '<div class="sheet-handle"></div>'
    + '<div class="sheet-title" style="font-size:28px;font-weight:600;color:#F5F5F4;margin-bottom:8px">Create / Add Exercise</div>'
    + '<div style="font-size:11px;color:#8A8A8E;margin-bottom:8px">Tap a popular exercise to autofill, or type custom details:</div>'
    + '<div style="display:flex;gap:6px;flex-wrap:wrap;max-height:80px;overflow-y:auto;padding:6px 0;margin-bottom:12px">'
      + quickChipsHTML
    + '</div>'
    + '<label style="display:block;font-size:11px;font-weight:600;color:#8A8A8E;text-transform:uppercase;margin-bottom:4px">Exercise Name</label>'
    + '<input type="text" id="newExName" placeholder="e.g. Close-Grip Lat Pulldown" style="background:#1C1C1F;border:none;border-radius:12px;height:48px;padding:0 16px;color:#F5F5F4;font-size:15px;width:100%;margin-bottom:10px;box-sizing:border-box">'
    + '<label style="display:block;font-size:11px;font-weight:600;color:#8A8A8E;text-transform:uppercase;margin-bottom:4px">Target Muscle Group</label>'
    + '<input type="text" id="newExMuscle" placeholder="e.g. chest, back, shoulders, quads, biceps" style="background:#1C1C1F;border:none;border-radius:12px;height:48px;padding:0 16px;color:#F5F5F4;font-size:15px;width:100%;margin-bottom:10px;box-sizing:border-box">'
    + '<div style="display:flex;gap:10px;margin-bottom:10px">'
      + '<div style="flex:1"><label style="display:block;font-size:11px;font-weight:600;color:#8A8A8E;text-transform:uppercase;margin-bottom:4px">Sets</label><input type="number" id="newExSets" value="2" min="1" max="10" style="background:#1C1C1F;border:none;border-radius:12px;height:48px;padding:0 16px;color:#F5F5F4;font-size:15px;width:100%;box-sizing:border-box"></div>'
      + '<div style="flex:1"><label style="display:block;font-size:11px;font-weight:600;color:#8A8A8E;text-transform:uppercase;margin-bottom:4px">Reps</label><input type="text" id="newExReps" value="8–12" style="background:#1C1C1F;border:none;border-radius:12px;height:48px;padding:0 16px;color:#F5F5F4;font-size:15px;width:100%;box-sizing:border-box"></div>'
    + '</div>'
    + '<div style="display:flex;gap:10px;margin-bottom:10px">'
      + '<div style="flex:1"><label style="display:block;font-size:11px;font-weight:600;color:#8A8A8E;text-transform:uppercase;margin-bottom:4px">Rest Seconds</label><input type="number" id="newExRest" value="90" min="0" step="15" style="background:#1C1C1F;border:none;border-radius:12px;height:48px;padding:0 16px;color:#F5F5F4;font-size:15px;width:100%;box-sizing:border-box"></div>'
      + '<div style="flex:1"><label style="display:block;font-size:11px;font-weight:600;color:#8A8A8E;text-transform:uppercase;margin-bottom:4px">Type</label><select id="newExType" style="background:#1C1C1F;border:none;border-radius:12px;height:48px;padding:0 12px;color:#F5F5F4;font-size:15px;width:100%;box-sizing:border-box"><option value="machine">Machine</option><option value="compound" selected>Compound</option><option value="isolation">Isolation</option><option value="cable">Cable</option></select></div>'
    + '</div>'
    + '<div style="display:flex;gap:12px;margin-top:16px">'
      + '<button type="button" class="btn" id="cancelAddExBtn" style="flex:1;height:48px;border-radius:12px;background:#1C1C1F;color:#8A8A8E;border:none;font-size:15px;cursor:pointer">Cancel</button>'
      + '<button type="button" class="btn" id="confirmAddExBtn" style="flex:1;height:48px;border-radius:12px;background:#F5F5F4;color:#0B0B0C;border:none;font-size:15px;font-weight:600;cursor:pointer">Save & Add</button>'
    + '</div>'
  + '</div>';
  document.body.appendChild(modal);

  modal.querySelectorAll('[data-quick-ex-idx]').forEach(function(chip) {
    chip.onclick = function() {
      var item = quickLibrary[parseInt(chip.dataset.quickExIdx, 10)];
      if (item) {
        modal.querySelector('#newExName').value = item.name;
        modal.querySelector('#newExMuscle').value = item.muscle;
        modal.querySelector('#newExSets').value = item.sets;
        modal.querySelector('#newExReps').value = item.reps;
        modal.querySelector('#newExRest').value = item.rest;
        modal.querySelector('#newExType').value = item.type || 'compound';
      }
    };
  });

  modal.querySelector('#cancelAddExBtn').onclick = function() { modal.remove(); };
  modal.querySelector('#confirmAddExBtn').onclick = function() {
    var name = modal.querySelector('#newExName').value.trim();
    if (!name) { showToast('Please enter an exercise name', 'warn'); return; }
    var muscle = modal.querySelector('#newExMuscle').value.trim() || 'other';
    var sets = parseInt(modal.querySelector('#newExSets').value, 10) || 2;
    var reps = modal.querySelector('#newExReps').value.trim() || '8–12';
    var rest = parseInt(modal.querySelector('#newExRest').value, 10) || 90;
    var type = modal.querySelector('#newExType').value || 'compound';
    var id = 'custom_' + name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    var savedEx = saveCustomExercise({
      id: id,
      name: name,
      muscle: muscle,
      sets: sets,
      reps: reps,
      rir: '1–2',
      rest: rest,
      cue: '',
      weightIncrement: 2.5,
      type: type
    });
    modal.remove();
    showToast('Exercise saved to library', 'ok');
    if (typeof onAdd === 'function') onAdd(savedEx || { id: id, name: name, muscle: muscle, sets: sets, reps: reps, rir: '1–2', rest: rest, cue: '', weightIncrement: 2.5, type: type });
  };
}

export function openEditExerciseModal(ex, onSave) {
  var modal = document.createElement('div');
  modal.className = 'overlay';
  modal.style.zIndex = '9999';
  modal.innerHTML = '<div class="sheet" style="max-height:88vh;overflow-y:auto;background:#141416;border-radius:20px 20px 0 0;padding:20px">'
    + '<div class="sheet-handle"></div>'
    + '<div class="sheet-title" style="font-size:28px;font-weight:600;color:#F5F5F4;margin-bottom:12px">Edit Exercise</div>'
    + '<label style="display:block;font-size:11px;font-weight:600;color:#8A8A8E;text-transform:uppercase;margin-bottom:4px">Exercise Name</label>'
    + '<input type="text" id="editExName" value="' + esc(ex.name) + '" style="background:#1C1C1F;border:none;border-radius:12px;height:48px;padding:0 16px;color:#F5F5F4;font-size:15px;width:100%;margin-bottom:10px;box-sizing:border-box">'
    + '<label style="display:block;font-size:11px;font-weight:600;color:#8A8A8E;text-transform:uppercase;margin-bottom:4px">Target Muscle Group</label>'
    + '<input type="text" id="editExMuscle" value="' + esc(ex.muscle || '') + '" style="background:#1C1C1F;border:none;border-radius:12px;height:48px;padding:0 16px;color:#F5F5F4;font-size:15px;width:100%;margin-bottom:10px;box-sizing:border-box">'
    + '<div style="display:flex;gap:10px;margin-bottom:10px">'
      + '<div style="flex:1"><label style="display:block;font-size:11px;font-weight:600;color:#8A8A8E;text-transform:uppercase;margin-bottom:4px">Sets</label><input type="number" id="editExSets" value="' + (ex.sets || 2) + '" min="1" max="10" style="background:#1C1C1F;border:none;border-radius:12px;height:48px;padding:0 16px;color:#F5F5F4;font-size:15px;width:100%;box-sizing:border-box"></div>'
      + '<div style="flex:1"><label style="display:block;font-size:11px;font-weight:600;color:#8A8A8E;text-transform:uppercase;margin-bottom:4px">Reps</label><input type="text" id="editExReps" value="' + esc(ex.reps || '8–12') + '" style="background:#1C1C1F;border:none;border-radius:12px;height:48px;padding:0 16px;color:#F5F5F4;font-size:15px;width:100%;box-sizing:border-box"></div>'
    + '</div>'
    + '<div style="display:flex;gap:10px;margin-bottom:10px">'
      + '<div style="flex:1"><label style="display:block;font-size:11px;font-weight:600;color:#8A8A8E;text-transform:uppercase;margin-bottom:4px">Rest Seconds</label><input type="number" id="editExRest" value="' + (ex.rest != null ? ex.rest : 90) + '" min="0" step="15" style="background:#1C1C1F;border:none;border-radius:12px;height:48px;padding:0 16px;color:#F5F5F4;font-size:15px;width:100%;box-sizing:border-box"></div>'
      + '<div style="flex:1"><label style="display:block;font-size:11px;font-weight:600;color:#8A8A8E;text-transform:uppercase;margin-bottom:4px">Type</label><select id="editExType" style="background:#1C1C1F;border:none;border-radius:12px;height:48px;padding:0 12px;color:#F5F5F4;font-size:15px;width:100%;box-sizing:border-box"><option value="machine"' + (ex.type === 'machine' ? ' selected' : '') + '>Machine</option><option value="compound"' + (ex.type === 'compound' || !ex.type ? ' selected' : '') + '>Compound</option><option value="isolation"' + (ex.type === 'isolation' ? ' selected' : '') + '>Isolation</option><option value="cable"' + (ex.type === 'cable' ? ' selected' : '') + '>Cable</option></select></div>'
    + '</div>'
    + '<div style="display:flex;gap:12px;margin-top:16px">'
      + '<button type="button" class="btn" id="cancelEditExBtn" style="flex:1;height:48px;border-radius:12px;background:#1C1C1F;color:#8A8A8E;border:none;font-size:15px;cursor:pointer">Cancel</button>'
      + '<button type="button" class="btn" id="confirmEditExBtn" style="flex:1;height:48px;border-radius:12px;background:#F5F5F4;color:#0B0B0C;border:none;font-size:15px;font-weight:600;cursor:pointer">Save Changes</button>'
    + '</div>'
  + '</div>';
  document.body.appendChild(modal);

  modal.querySelector('#cancelEditExBtn').onclick = function() { modal.remove(); };
  modal.querySelector('#confirmEditExBtn').onclick = function() {
    var name = modal.querySelector('#editExName').value.trim();
    if (!name) { showToast('Please enter an exercise name', 'warn'); return; }
    ex.name = name;
    ex.muscle = modal.querySelector('#editExMuscle').value.trim() || 'other';
    ex.sets = parseInt(modal.querySelector('#editExSets').value, 10) || 2;
    ex.reps = modal.querySelector('#editExReps').value.trim() || '8–12';
    ex.rest = parseInt(modal.querySelector('#editExRest').value, 10) || 90;
    ex.type = modal.querySelector('#editExType').value || 'compound';
    modal.remove();
    onSave(ex);
  };
}

export function openSwapExerciseModal(currentEx, onSwap) {
  var catalog = getFullExerciseCatalog();
  var modal = document.createElement('div');
  modal.className = 'overlay';
  modal.style.zIndex = '9999';

  var selectedMuscle = 'all';
  var searchQuery = '';
  var muscles = ['all', 'chest', 'back', 'shoulders', 'quads', 'hamstrings', 'biceps', 'triceps', 'calves', 'forearms'];

  function renderList() {
    var filtered = catalog.filter(function(item) {
      if (selectedMuscle !== 'all' && !item.muscle.toLowerCase().includes(selectedMuscle)) return false;
      if (searchQuery) {
        var q = searchQuery.toLowerCase();
        return item.name.toLowerCase().includes(q) || item.muscle.toLowerCase().includes(q);
      }
      return true;
    });

    var rows = filtered.map(function(item) {
      var isCurrent = (currentEx && (currentEx.id === item.id || currentEx.name.toLowerCase() === item.name.toLowerCase()));
      return '<div class="list-row" data-swap-pick="' + esc(item.id) + '" style="display:flex;align-items:center;justify-content:space-between;padding:12px 0;border-bottom:1px solid #222;cursor:pointer">'
        + '<div style="flex:1;min-width:0;padding-right:12px">'
          + '<div style="font-size:17px;font-weight:500;color:#F5F5F4;line-height:1.25">' + esc(item.name) + '</div>'
          + '<div style="font-size:15px;color:#8A8A8E;margin-top:2px">' + esc(item.muscle) + ' · ' + (item.type || 'compound') + '</div>'
        + '</div>'
        + (isCurrent
            ? '<span style="font-size:17px;font-weight:700;color:#F5F5F4">✓</span>'
            : '<span style="font-size:15px;color:#F5F5F4;font-weight:500">Select</span>')
        + '</div>';
    }).join('');

    var container = modal.querySelector('#swapListContainer');
    if (container) {
      container.innerHTML = rows || '<div style="font-size:15px;color:#8A8A8E;padding:24px 0;text-align:center">No matching exercises found</div>';
      attachRowEvents();
    }
  }

  function attachRowEvents() {
    modal.querySelectorAll('[data-swap-pick]').forEach(function(row) {
      row.onclick = function() {
        var exId = row.dataset.swapPick;
        var chosen = catalog.find(function(c) { return c.id === exId; });
        if (!chosen) return;
        var swapped = {
          id: chosen.id,
          name: chosen.name,
          muscle: chosen.muscle,
          sets: (currentEx && currentEx.sets) || chosen.sets || 2,
          reps: (currentEx && currentEx.reps) || chosen.reps || '8–12',
          rir: (currentEx && currentEx.rir) || chosen.rir || '1–2',
          rest: (currentEx && currentEx.rest != null) ? currentEx.rest : (chosen.rest || 90),
          cue: chosen.cue || (currentEx && currentEx.cue) || '',
          weightIncrement: chosen.weightIncrement || (currentEx && currentEx.weightIncrement) || 2.5,
          type: chosen.type || (currentEx && currentEx.type) || 'compound'
        };
        modal.remove();
        onSwap(swapped);
        showToast('Swapped to ' + chosen.name, 'ok');
      };
    });
  }

  var chipsHTML = muscles.map(function(m) {
    var label = m.charAt(0).toUpperCase() + m.slice(1);
    var act = (m === selectedMuscle);
    return '<button type="button" class="chip" data-muscle-chip="' + m + '" style="font-size:11px;padding:6px 10px;border-radius:12px;background:' + (act ? '#F5F5F4' : '#1C1C1F') + ';color:' + (act ? '#0B0B0C' : '#8A8A8E') + ';border:none;cursor:pointer;white-space:nowrap">' + label + '</button>';
  }).join('');

  modal.innerHTML = '<div class="sheet" style="background:#141416;border:none;border-radius:20px 20px 0 0;padding:20px 20px calc(24px + var(--safe-b));max-width:480px;width:100%;max-height:85vh;overflow-y:auto">'
    + '<div class="sheet-handle"></div>'
    + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">'
      + '<div style="font-size:28px;font-weight:600;color:#F5F5F4;line-height:1.15">Swap Exercise</div>'
      + '<button type="button" class="btn-text-action" id="closeSwapModalBtn" style="font-size:15px;color:#8A8A8E;background:none;border:none;padding:0;cursor:pointer">Close</button>'
    + '</div>'
    + '<div style="font-size:15px;color:#8A8A8E;margin-bottom:12px">Replacing: <span style="color:#F5F5F4;font-weight:500">' + esc(currentEx ? currentEx.name : 'Exercise') + '</span></div>'
    + '<button type="button" id="swapCreateCustomBtn" style="display:flex;align-items:center;justify-content:center;width:100%;height:44px;background:#1C1C1F;border:1px dashed #55555A;border-radius:12px;color:#C6F432;font-size:15px;font-weight:600;margin-bottom:12px;cursor:pointer">+ Create Custom Exercise</button>'
    + '<input type="text" id="swapExSearchInput" placeholder="Search exercises..." style="background:#1C1C1F;border:none;border-radius:12px;height:48px;padding:0 16px;color:#F5F5F4;font-size:15px;width:100%;margin-bottom:10px;box-sizing:border-box">'
    + '<div style="display:flex;gap:6px;overflow-x:auto;padding-bottom:10px;margin-bottom:10px">' + chipsHTML + '</div>'
    + '<div id="swapListContainer" style="max-height:48vh;overflow-y:auto"></div>'
    + '</div>';

  document.body.appendChild(modal);

  modal.querySelector('#closeSwapModalBtn').onclick = function() { modal.remove(); };
  modal.addEventListener('click', function(e) { if (e.target === modal) modal.remove(); });

  var createCustomBtn = modal.querySelector('#swapCreateCustomBtn');
  if (createCustomBtn) {
    createCustomBtn.onclick = function() {
      openAddExerciseModal(function(newEx) {
        modal.remove();
        if (typeof onSwap === 'function') onSwap(newEx);
      });
    };
  }

  var searchInp = modal.querySelector('#swapExSearchInput');
  if (searchInp) {
    searchInp.oninput = function() {
      searchQuery = (searchInp.value || '').trim();
      renderList();
    };
  }

  modal.querySelectorAll('[data-muscle-chip]').forEach(function(chip) {
    chip.onclick = function() {
      selectedMuscle = chip.dataset.muscleChip;
      modal.querySelectorAll('[data-muscle-chip]').forEach(function(c) {
        var isAct = (c.dataset.muscleChip === selectedMuscle);
        c.style.background = isAct ? '#F5F5F4' : '#1C1C1F';
        c.style.color = isAct ? '#0B0B0C' : '#8A8A8E';
      });
      renderList();
    };
  });

  renderList();
}
