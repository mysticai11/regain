/* Gym edit workout sheet: clean, on-brand workout and set editing */

import { dayRecord, saveDayRecord, getWorkoutSession, saveWorkoutSession, deleteWorkoutSession, workoutSessionStore, sv, WORKOUT_SESSIONS_KEY } from "../../storage.js";
import { getExerciseData, isBodyweightExercise, getActiveProgram } from "../../data/plan.js";
import { getAllKnownExercises } from "../../data/exercises.js";
import { openAddExerciseModal } from "./exercise-modal.js?v=21";
import { esc, todayKey } from "../../lib/format.js";
import { showToast } from "../../components/toast.js";
import { confirmDialog, promptDialog } from "../../components/dialog.js";

export function openEditWorkoutSheet(sessionId) {
  var store = workoutSessionStore();
  var session = store.sessions[sessionId];
  if (!session) {
    var match = String(sessionId || '').match(/^workout_session_([0-9]{4}-[0-9]{2}-[0-9]{2})_(.*)$/);
    if (match) {
      var dKey = match[1], pIdx = parseInt(match[2], 10);
      var prog = getActiveProgram() || [];
      var planDay = (!isNaN(pIdx) && prog[pIdx]) ? prog[pIdx] : (prog[0] || { label: 'Workout', exercises: [] });
      session = {
        id: sessionId,
        dayKey: dKey,
        programDay: !isNaN(pIdx) ? pIdx : 0,
        programLabel: planDay.label || 'Workout',
        day: (!isNaN(pIdx) ? pIdx : 0) + 1,
        week: 1,
        exercises: (planDay.exercises || []).map(function(e) {
          return { id: e.id, name: e.name, sets: Array.from({ length: e.sets || 2 }, function() { return { weight: 0, reps: 0, rir: 2 }; }) };
        }),
        durationMinutes: 45,
        duration_sec: 2700
      };
      store.sessions[sessionId] = session;
    } else {
      showToast('Session not found', 'warn');
      return;
    }
  }
  var rec = session.dayKey ? dayRecord(session.dayKey) : { workout: {} };
  var currentExercises = (session.exercises || []).map(function(ex) {
    var sets = (rec.workout && rec.workout[ex.id]) || ex.sets || [];
    return {
      id: ex.id,
      name: (getExerciseData(ex.id) || {}).name || ex.name || ex.id,
      sets: Array.isArray(sets) ? sets.map(function(s) {
        return s ? { weight: s.weight != null ? s.weight : 0, reps: s.reps != null ? s.reps : 0, rir: s.rir } : null;
      }).filter(Boolean) : []
    };
  });

  var overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.style.zIndex = '999';

  function captureCurrentInputs() {
    overlay.querySelectorAll('[data-field]').forEach(function(inp) {
      var eI = parseInt(inp.dataset.exIdx, 10);
      var sI = parseInt(inp.dataset.setIdx, 10);
      var f = inp.dataset.field;
      if (!currentExercises[eI] || !currentExercises[eI].sets[sI]) return;
      if (f === 'weight') currentExercises[eI].sets[sI].weight = parseFloat(inp.value) || 0;
      else if (f === 'reps') currentExercises[eI].sets[sI].reps = parseInt(inp.value, 10) || 0;
      else if (f === 'rir') currentExercises[eI].sets[sI].rir = inp.value === '' ? null : parseInt(inp.value, 10);
    });
  }

  function renderModalBody() {
    var exHTML = currentExercises.map(function(ex, exIdx) {
      var isBW = isBodyweightExercise(ex.id, ex.name);
      var setsRows = ex.sets.map(function(s, sIdx) {
        return '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">'
          + '<span style="width:28px;text-align:center;font-size:11px;font-weight:700;color:#8A8A8E;font-variant-numeric:tabular-nums">S' + (sIdx + 1) + '</span>'
          + '<input type="number" step="0.25" min="0" value="' + s.weight + '" placeholder="' + (isBW ? 'BW' : 'kg') + '" class="precision-input" style="flex:1;height:38px;font-size:15px;border-radius:8px;border:1px solid #222;background:#141416;color:#F5F5F4;text-align:center;font-weight:600;font-variant-numeric:tabular-nums;box-sizing:border-box" data-ex-idx="' + exIdx + '" data-set-idx="' + sIdx + '" data-field="weight" inputmode="decimal">'
          + '<input type="number" min="1" max="100" value="' + s.reps + '" placeholder="reps" class="precision-input" style="flex:1;height:38px;font-size:15px;border-radius:8px;border:1px solid #222;background:#141416;color:#F5F5F4;text-align:center;font-weight:600;font-variant-numeric:tabular-nums;box-sizing:border-box" data-ex-idx="' + exIdx + '" data-set-idx="' + sIdx + '" data-field="reps" inputmode="numeric">'
          + '<select style="width:68px;height:38px;font-size:11px;font-weight:600;border-radius:8px;border:1px solid #222;background:#141416;color:#F5F5F4;text-align:center;padding:0 4px;box-sizing:border-box" data-ex-idx="' + exIdx + '" data-set-idx="' + sIdx + '" data-field="rir">'
            + '<option value="" ' + (s.rir == null ? 'selected' : '') + '>RIR</option>'
            + '<option value="3" ' + (s.rir === 3 ? 'selected' : '') + '>3+</option>'
            + '<option value="2" ' + (s.rir === 2 ? 'selected' : '') + '>2</option>'
            + '<option value="1" ' + (s.rir === 1 ? 'selected' : '') + '>1</option>'
            + '<option value="0" ' + (s.rir === 0 ? 'selected' : '') + '>0 (F)</option>'
          + '</select>'
          + '<button type="button" style="width:24px;height:38px;background:none;border:none;color:#55555A;font-size:17px;line-height:1;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;padding:0" data-del-ex-idx="' + exIdx + '" data-del-set-idx="' + sIdx + '" title="Remove set">&times;</button>'
          + '</div>';
      }).join('');

      return '<div style="background:#1C1C1F;border-radius:14px;padding:14px;margin-bottom:12px">'
        + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">'
          + '<div style="font-size:17px;font-weight:600;color:#F5F5F4;line-height:1.25">' + esc(ex.name) + '</div>'
          + '<div style="display:flex;align-items:center;gap:4px">'
            + '<button type="button" class="btn-text-action" data-edit-ex-idx="' + exIdx + '" style="font-size:15px;color:#8A8A8E;background:none;border:none;cursor:pointer;padding:4px 8px">Edit</button>'
            + '<button type="button" class="btn-text-action" data-remove-ex-idx="' + exIdx + '" style="font-size:15px;color:#FF4D4F;background:none;border:none;cursor:pointer;padding:4px 8px">Remove</button>'
          + '</div>'
        + '</div>'
        + '<div style="display:flex;gap:8px;font-size:11px;font-weight:600;color:#8A8A8E;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px;padding:0 4px">'
          + '<span style="width:28px;text-align:center">Set</span>'
          + '<span style="flex:1;text-align:center">' + (isBW ? '+Kg (BW)' : 'Kg') + '</span>'
          + '<span style="flex:1;text-align:center">Reps</span>'
          + '<span style="width:68px;text-align:center">RIR</span>'
          + '<span style="width:24px"></span>'
        + '</div>'
        + (setsRows || '<div style="font-size:15px;color:#55555A;text-align:center;padding:10px 0">No sets logged</div>')
        + '<div style="margin-top:8px">'
          + '<button type="button" class="btn-text-action" data-add-set-ex-idx="' + exIdx + '" style="font-size:15px;font-weight:600;color:var(--accent-primary);background:none;border:none;padding:4px 0;cursor:pointer">+ Add Set</button>'
        + '</div>'
        + '</div>';
    }).join('');

    var durationMinutes = session.duration_sec ? Math.round(session.duration_sec / 60) : (session.durationMinutes || 45);

    overlay.innerHTML = '<div class="sheet" style="max-height:88vh;overflow-y:auto;padding:20px 20px calc(24px + var(--safe-b));width:100%;max-width:480px;background:#141416;border-radius:20px 20px 0 0;box-sizing:border-box">'
      + '<div class="sheet-handle"></div>'
      + '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px">'
        + '<div>'
          + '<div style="font-size:28px;font-weight:700;color:#F5F5F4;letter-spacing:-0.02em">Edit Workout</div>'
          + '<div style="font-size:15px;color:#8A8A8E;margin-top:2px">' + esc(session.programLabel || 'Workout') + '</div>'
        + '</div>'
        + '<button type="button" class="btn-text-action" id="cancelEditWorkoutBtn" style="font-size:15px;color:#8A8A8E;background:none;border:none;padding:0;cursor:pointer">Done</button>'
      + '</div>'

      + '<div style="display:flex;gap:10px;margin-bottom:16px">'
        + '<div style="flex:1">'
          + '<label style="display:block;font-size:11px;font-weight:600;color:#8A8A8E;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px">Date</label>'
          + '<input type="date" id="editSessionDate" class="precision-input" value="' + (session.dayKey || todayKey()) + '" style="width:100%;height:38px;padding:0 10px;background:#0B0B0C;border:1px solid #1C1C1F;border-radius:10px;color:#F5F5F4;font-size:15px;box-sizing:border-box">'
        + '</div>'
        + '<div style="width:110px">'
          + '<label style="display:block;font-size:11px;font-weight:600;color:#8A8A8E;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px">Duration (m)</label>'
          + '<input type="number" min="1" max="300" id="editSessionDuration" class="precision-input" value="' + durationMinutes + '" placeholder="min" style="width:100%;height:38px;padding:0 10px;background:#0B0B0C;border:1px solid #1C1C1F;border-radius:10px;color:#F5F5F4;font-size:15px;text-align:center;box-sizing:border-box">'
        + '</div>'
      + '</div>'

      + '<div style="font-size:11px;font-weight:600;color:#8A8A8E;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:8px">Exercises</div>'
      + '<div>' + (exHTML || '<div style="font-size:15px;color:#55555A;text-align:center;padding:16px 0">No exercises in this workout.</div>') + '</div>'

      + '<button type="button" id="addExToWorkoutBtn" style="width:100%;height:44px;background:#141416;border:1px dashed #222;color:var(--accent-primary);font-size:15px;font-weight:600;border-radius:12px;cursor:pointer;margin-bottom:14px">+ Add Exercise</button>'
      + '<button type="button" class="btn btn-primary" id="saveEditWorkoutBtn" style="width:100%;height:48px;background:var(--accent-primary);color:var(--text);font-size:15px;font-weight:700;border:none;border-radius:12px;box-shadow:0 4px 16px var(--accent-glow);cursor:pointer">Save Changes</button>'
      + '<button type="button" id="deleteWorkoutSessionBtn" style="width:100%;background:none;border:none;color:#FF4D4F;font-size:15px;padding:14px 0 0;cursor:pointer">Delete Workout Session</button>'
      + '</div>';

    // Event attachments
    overlay.querySelector('#cancelEditWorkoutBtn').onclick = function() { overlay.remove(); };

    var delSessionBtn = overlay.querySelector('#deleteWorkoutSessionBtn');
    if (delSessionBtn) {
      delSessionBtn.onclick = async function() {
        var ok = await confirmDialog({ title: 'Delete Workout?', message: 'Delete this entire workout session?', confirmLabel: 'Delete', destructive: true });
        if (ok) {
          overlay.remove();
          deleteWorkoutSession(sessionId);
          if (typeof window.renderGym === 'function') window.renderGym();
          if (typeof window.renderProgressSimple === 'function') window.renderProgressSimple('lifts');
          showToast('Workout session deleted', 'ok');
        }
      };
    }

    overlay.querySelector('#saveEditWorkoutBtn').onclick = function() {
      captureCurrentInputs();
      var durInput = parseInt(overlay.querySelector('#editSessionDuration').value, 10);
      if (durInput && durInput > 0) {
        session.durationMinutes = durInput;
        session.duration_sec = durInput * 60;
      }
      var newDate = overlay.querySelector('#editSessionDate').value;
      var oldDate = session.dayKey;

      rec.workout = rec.workout || {};
      var currentExIdMap = {};
      currentExercises.forEach(function(ex) { currentExIdMap[ex.id] = true; });
      Object.keys(rec.workout).forEach(function(k) {
        if (!currentExIdMap[k]) delete rec.workout[k];
      });

      session.exercises = currentExercises.map(function(ex) {
        rec.workout[ex.id] = ex.sets;
        return { id: ex.id, name: ex.name, sets: ex.sets };
      });

      if (newDate && newDate !== oldDate) {
        session.dayKey = newDate;
        var newRec = dayRecord(newDate);
        newRec.workout = rec.workout;
        newRec.workoutDone = true;
        saveDayRecord(newDate, newRec);
        if (oldDate) {
          var oldRec = dayRecord(oldDate);
          oldRec.workout = {};
          oldRec.workoutDone = false;
          saveDayRecord(oldDate, oldRec);
        }
      } else if (session.dayKey) {
        saveDayRecord(session.dayKey, rec);
      }

      // Propagate edited exercises to activeSplitData so subsequent weeks carry changes forward
      if (typeof profile !== 'undefined' && profile) {
        profile.activeSplitData = profile.activeSplitData || JSON.parse(JSON.stringify(getActiveProgram()));
        var pDay = session.programDay;
        if (pDay != null && profile.activeSplitData[pDay]) {
          profile.activeSplitData[pDay].exercises = currentExercises.map(function(ex) {
            var orig = (getExerciseData(ex.id) || {});
            return {
              id: ex.id,
              name: ex.name,
              muscle: orig.muscle || 'other',
              sets: (ex.sets && ex.sets.length) || orig.sets || 2,
              reps: orig.reps || '8–12',
              rir: orig.rir || '1–2',
              rest: orig.rest || 90,
              type: orig.type || 'isolation'
            };
          });
          sv('rg_profile', profile);
        }
      }

      store.sessions[sessionId] = session;
      sv(WORKOUT_SESSIONS_KEY, store);
      overlay.remove();
      showToast('Workout changes saved', 'ok');
      if (typeof window.renderGym === 'function') window.renderGym();
      if (typeof window.renderProgressSimple === 'function') window.renderProgressSimple('lifts');
    };

    overlay.querySelectorAll('[data-del-ex-idx]').forEach(function(btn) {
      btn.onclick = function() {
        captureCurrentInputs();
        var eI = parseInt(btn.dataset.delExIdx, 10);
        var sI = parseInt(btn.dataset.delSetIdx, 10);
        currentExercises[eI].sets.splice(sI, 1);
        renderModalBody();
      };
    });

    overlay.querySelectorAll('[data-edit-ex-idx]').forEach(function(btn) {
      btn.onclick = async function() {
        captureCurrentInputs();
        var eI = parseInt(btn.dataset.editExIdx, 10);
        var curEx = currentExercises[eI];
        var newName = await promptDialog({
          title: 'Edit Exercise',
          message: 'Update exercise name or type replacement:',
          defaultValue: curEx.name,
          confirmLabel: 'Save'
        });
        if (newName && newName.trim() && newName.trim() !== curEx.name) {
          curEx.name = newName.trim();
          var all = getAllKnownExercises();
          var found = all.find(function(e) { return e.name.toLowerCase() === curEx.name.toLowerCase(); });
          if (found) curEx.id = found.id;
          renderModalBody();
        }
      };
    });

    overlay.querySelectorAll('[data-remove-ex-idx]').forEach(function(btn) {
      btn.onclick = async function() {
        captureCurrentInputs();
        var eI = parseInt(btn.dataset.removeExIdx, 10);
        var ok = await confirmDialog({
          title: 'Remove Exercise?',
          message: 'Remove ' + currentExercises[eI].name + ' from this workout?',
          confirmLabel: 'Remove',
          destructive: true
        });
        if (ok) {
          currentExercises.splice(eI, 1);
          renderModalBody();
        }
      };
    });

    overlay.querySelectorAll('[data-add-set-ex-idx]').forEach(function(btn) {
      btn.onclick = function() {
        captureCurrentInputs();
        var eI = parseInt(btn.dataset.addSetExIdx, 10);
        var lastSet = currentExercises[eI].sets[currentExercises[eI].sets.length - 1];
        var defW = lastSet ? lastSet.weight : 20;
        var defR = lastSet ? lastSet.reps : 10;
        currentExercises[eI].sets.push({ weight: defW, reps: defR, rir: 2 });
        renderModalBody();
      };
    });

    var addExBtn = overlay.querySelector('#addExToWorkoutBtn');
    if (addExBtn) {
      addExBtn.onclick = function() {
        captureCurrentInputs();
        openAddExerciseModal(function(newEx) {
          if (!newEx) return;
          var numSets = parseInt(newEx.sets, 10) || 2;
          var setsArr = [];
          for (var i = 0; i < numSets; i++) {
            setsArr.push({ weight: 20, reps: 10, rir: 2 });
          }
          currentExercises.push({
            id: newEx.id,
            name: newEx.name,
            sets: setsArr
          });
          renderModalBody();
        });
      };
    }
  }

  overlay.onclick = function(e) {
    if (e.target === overlay) {
      overlay.remove();
    }
  };

  document.body.appendChild(overlay);
  renderModalBody();
}
