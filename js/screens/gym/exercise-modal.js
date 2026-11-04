/* Gym exercise editor modals: add/edit exercises in plan */

import { profile } from "../../state.js";
import { sv } from "../../storage.js";
import { getActiveProgram, getExerciseData, getAllExercisesForMuscle } from "../../data/plan.js";
import { esc } from "../../lib/format.js";
import { showToast } from "../../components/toast.js";

export function openAddExerciseModal(onAdd) {
  var quickLibrary = [
    { name: 'Flat Bench Press', muscle: 'chest', sets: 2, reps: '6–10', rir: '1–2', rest: 150, cue: 'Chest', type: 'compound' },
    { name: 'Incline Dumbbell Press', muscle: 'chest', sets: 2, reps: '8–12', rir: '1–2', rest: 120, cue: 'Upper chest', type: 'compound' },
    { name: 'Chest Press Machine', muscle: 'chest', sets: 2, reps: '8–12', rir: '1–2', rest: 120, cue: 'Chest', type: 'machine' },
    { name: 'Pec Deck Fly', muscle: 'chest', sets: 2, reps: '10–15', rir: '1–2', rest: 90, cue: 'Chest stretch', type: 'isolation' },
    { name: 'Pull-ups', muscle: 'back,biceps', sets: 2, reps: '8–12', rir: '1–2', rest: 120, cue: 'Lats & mid back', type: 'compound' },
    { name: 'Lat Pulldown', muscle: 'back', sets: 2, reps: '8–12', rir: '1–2', rest: 120, cue: 'Lats', type: 'cable' },
    { name: 'Machine Row', muscle: 'back', sets: 2, reps: '8–12', rir: '1–2', rest: 120, cue: 'Mid back', type: 'compound' },
    { name: 'Cable Row', muscle: 'back', sets: 2, reps: '8–12', rir: '1–2', rest: 90, cue: 'Mid back squeeze', type: 'machine' },
    { name: 'Shoulder Press Machine', muscle: 'shoulders', sets: 2, reps: '6–10', rir: '1–2', rest: 120, cue: 'Deltoids', type: 'machine' },
    { name: 'Lateral Raise Machine', muscle: 'shoulders', sets: 3, reps: '10–15', rir: '1–2', rest: 90, cue: 'Side delts', type: 'isolation' },
    { name: 'Rear Delt Fly', muscle: 'shoulders', sets: 2, reps: '12–15', rir: '1–2', rest: 90, cue: 'Rear delts', type: 'isolation' },
    { name: 'Leg Press', muscle: 'quads,glutes', sets: 2, reps: '8–12', rir: '1–2', rest: 150, cue: 'Quads & glutes', type: 'compound' },
    { name: 'Romanian Deadlift', muscle: 'hamstrings', sets: 2, reps: '8–12', rir: '1–2', rest: 150, cue: 'Hamstrings & hinge', type: 'compound' },
    { name: 'Leg Extension', muscle: 'quads', sets: 2, reps: '10–15', rir: '1–2', rest: 90, cue: 'Quads isolation', type: 'isolation' },
    { name: 'Hamstring Curl', muscle: 'hamstrings', sets: 2, reps: '10–15', rir: '1–2', rest: 90, cue: 'Hamstrings isolation', type: 'isolation' },
    { name: 'Standing Calf Raise', muscle: 'calves', sets: 3, reps: '12–20', rir: '1–2', rest: 60, cue: 'Calves stretch', type: 'isolation' },
    { name: 'EZ-Bar Curl', muscle: 'biceps', sets: 2, reps: '8–12', rir: '1–2', rest: 90, cue: 'Biceps peak', type: 'isolation' },
    { name: 'Incline Dumbbell Curl', muscle: 'biceps', sets: 2, reps: '8–12', rir: '1–2', rest: 90, cue: 'Biceps stretch', type: 'isolation' },
    { name: 'Hammer Curl', muscle: 'forearms', sets: 2, reps: '8–12', rir: '1–2', rest: 90, cue: 'Brachialis & forearms', type: 'isolation' },
    { name: 'Triceps Pushdown', muscle: 'triceps', sets: 2, reps: '10–15', rir: '1–2', rest: 90, cue: 'Triceps lock', type: 'isolation' },
    { name: 'Overhead Triceps Extension', muscle: 'triceps', sets: 2, reps: '10–15', rir: '1–2', rest: 90, cue: 'Triceps overhead', type: 'isolation' }
  ];

  var quickChipsHTML = quickLibrary.map(function(item, idx) {
    return '<button type="button" class="chip" data-quick-ex-idx="' + idx + '" style="font-size:11px;padding:4px 8px">' + item.name + '</button>';
  }).join('');

  var modal = document.createElement('div');
  modal.className = 'overlay';
  modal.style.zIndex = '9999';
  modal.innerHTML = '<div class="sheet" style="max-height:88vh;overflow-y:auto">'
    + '<div class="sheet-handle"></div>'
    + '<div class="sheet-title">Add Exercise</div>'
    + '<div style="font-size:11px;color:var(--text-muted);margin-bottom:6px">Tap a popular exercise to autofill, or type custom details below:</div>'
    + '<div style="display:flex;gap:5px;flex-wrap:wrap;max-height:100px;overflow-y:auto;padding:6px;background:var(--surface-raised);border-radius:8px;border:1px solid var(--border);margin-bottom:12px">'
      + quickChipsHTML
    + '</div>'
    + '<label class="eyebrow">Exercise Name</label>'
    + '<input type="text" id="newExName" placeholder="e.g. Incline Dumbbell Press">'
    + '<label class="eyebrow" style="margin-top:10px">Target Muscle Group</label>'
    + '<input type="text" id="newExMuscle" placeholder="e.g. chest, back, shoulders, quads, biceps, triceps">'
    + '<div style="display:flex;gap:10px;margin-top:10px">'
      + '<div style="flex:1"><label class="eyebrow">Sets</label><input type="number" id="newExSets" value="2" min="1" max="10"></div>'
      + '<div style="flex:1"><label class="eyebrow">Rep Range</label><input type="text" id="newExReps" value="8–12" placeholder="e.g. 6–10, 8–12"></div>'
    + '</div>'
    + '<div style="display:flex;gap:10px;margin-top:10px">'
      + '<div style="flex:1"><label class="eyebrow">Target RIR</label><input type="text" id="newExRir" value="1–2" placeholder="e.g. 1–2"></div>'
      + '<div style="flex:1"><label class="eyebrow">Rest Seconds</label><input type="number" id="newExRest" value="90" min="0" step="15"></div>'
    + '</div>'
    + '<div style="display:flex;gap:10px;margin-top:10px">'
      + '<div style="flex:1"><label class="eyebrow">Weight +kg</label><input type="number" step="0.25" id="newExInc" value="2.5"></div>'
      + '<div style="flex:1"><label class="eyebrow">Type</label><select id="newExType"><option value="machine">Machine</option><option value="compound" selected>Compound</option><option value="isolation">Isolation</option><option value="cable">Cable</option></select></div>'
    + '</div>'
    + '<label class="eyebrow" style="margin-top:10px">Notes / Cue</label>'
    + '<input type="text" id="newExCue" placeholder="optional cue (e.g. full stretch, pause at bottom)">'
    + '<div style="display:flex;gap:10px;margin-top:16px">'
      + '<button class="btn" id="cancelAddExBtn" style="flex:1">Cancel</button>'
      + '<button class="btn btn-primary" id="confirmAddExBtn" style="flex:1">Add Exercise</button>'
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
        modal.querySelector('#newExRir').value = item.rir;
        modal.querySelector('#newExRest').value = item.rest;
        modal.querySelector('#newExCue').value = item.cue || '';
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
    var rir = modal.querySelector('#newExRir').value.trim() || '1–2';
    var rest = parseInt(modal.querySelector('#newExRest').value, 10) || 90;
    var inc = parseFloat(modal.querySelector('#newExInc').value) || 2.5;
    var type = modal.querySelector('#newExType').value || 'compound';
    var cue = modal.querySelector('#newExCue').value.trim();
    var id = name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    modal.remove();
    onAdd({
      id: id,
      name: name,
      muscle: muscle,
      sets: sets,
      reps: reps,
      rir: rir,
      rest: rest,
      cue: cue,
      weightIncrement: inc,
      type: type
    });
  };
}

export function openEditExerciseModal(ex, onSave) {
  var modal = document.createElement('div');
  modal.className = 'overlay';
  modal.style.zIndex = '9999';
  modal.innerHTML = '<div class="sheet" style="max-height:88vh;overflow-y:auto">'
    + '<div class="sheet-handle"></div>'
    + '<div class="sheet-title">Edit Exercise</div>'
    + '<label class="eyebrow" style="margin-top:8px">Exercise Name</label>'
    + '<input type="text" id="editExName" value="' + esc(ex.name) + '">'
    + '<label class="eyebrow" style="margin-top:10px">Target Muscle Group</label>'
    + '<input type="text" id="editExMuscle" value="' + esc(ex.muscle || '') + '">'
    + '<div style="display:flex;gap:10px;margin-top:10px">'
      + '<div style="flex:1"><label class="eyebrow">Sets</label><input type="number" id="editExSets" value="' + (ex.sets || 2) + '" min="1" max="10"></div>'
      + '<div style="flex:1"><label class="eyebrow">Rep Range</label><input type="text" id="editExReps" value="' + esc(ex.reps || '8–12') + '"></div>'
    + '</div>'
    + '<div style="display:flex;gap:10px;margin-top:10px">'
      + '<div style="flex:1"><label class="eyebrow">Target RIR</label><input type="text" id="editExRir" value="' + esc(ex.rir || '1–2') + '"></div>'
      + '<div style="flex:1"><label class="eyebrow">Rest Seconds</label><input type="number" id="editExRest" value="' + (ex.rest != null ? ex.rest : 90) + '" min="0" step="15"></div>'
    + '</div>'
    + '<div style="display:flex;gap:10px;margin-top:10px">'
      + '<div style="flex:1"><label class="eyebrow">Weight +kg</label><input type="number" step="0.25" id="editExInc" value="' + (ex.weightIncrement || 2.5) + '"></div>'
      + '<div style="flex:1"><label class="eyebrow">Type</label><select id="editExType"><option value="machine"' + (ex.type === 'machine' ? ' selected' : '') + '>Machine</option><option value="compound"' + (ex.type === 'compound' || !ex.type ? ' selected' : '') + '>Compound</option><option value="isolation"' + (ex.type === 'isolation' ? ' selected' : '') + '>Isolation</option><option value="cable"' + (ex.type === 'cable' ? ' selected' : '') + '>Cable</option></select></div>'
    + '</div>'
    + '<label class="eyebrow" style="margin-top:10px">Notes / Cue</label>'
    + '<input type="text" id="editExCue" value="' + esc(ex.cue || '') + '">'
    + '<div style="display:flex;gap:10px;margin-top:16px">'
      + '<button class="btn" id="cancelEditExBtn" style="flex:1">Cancel</button>'
      + '<button class="btn btn-primary" id="confirmEditExBtn" style="flex:1">Save Changes</button>'
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
    ex.rir = modal.querySelector('#editExRir').value.trim() || '1–2';
    ex.rest = parseInt(modal.querySelector('#editExRest').value, 10) || 90;
    ex.weightIncrement = parseFloat(modal.querySelector('#editExInc').value) || 2.5;
    ex.type = modal.querySelector('#editExType').value || 'compound';
    ex.cue = modal.querySelector('#editExCue').value.trim();
    modal.remove();
    onSave(ex);
  };
}
