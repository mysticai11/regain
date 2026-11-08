/* Gym edit workout sheet: edit logged sets and session details */

import { dayRecord, saveDayRecord, getWorkoutSession, saveWorkoutSession, deleteWorkoutSession, workoutSessionStore, sv, WORKOUT_SESSIONS_KEY } from "../../storage.js";
import { getExerciseData, isBodyweightExercise, getActiveProgram } from "../../data/plan.js";
import { getAllKnownExercises } from "../../data/exercises.js";
import { openAddExerciseModal } from "./exercise-modal.js";
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
        return '<div style="display:grid;grid-template-columns:30px 1fr 1fr 84px 30px;gap:8px;align-items:center;margin-bottom:6px">'
          + '<span style="font-size:11px;font-weight:700;color:var(--text-muted);text-align:center;font-variant-numeric:tabular-nums">S' + (sIdx + 1) + '</span>'
          + '<input type="number" step="0.25" min="0" value="' + s.weight + '" placeholder="' + (isBW ? 'BW' : 'kg') + '" style="min-height:36px;height:36px;font-size:15px;padding:4px;border-radius:8px;border:1px solid var(--border);background:var(--surface);color:var(--text);text-align:center;font-family:var(--font-display);font-variant-numeric:tabular-nums" data-ex-idx="' + exIdx + '" data-set-idx="' + sIdx + '" data-field="weight" inputmode="decimal">'
          + '<input type="number" min="1" max="100" value="' + s.reps + '" placeholder="reps" style="min-height:36px;height:36px;font-size:15px;padding:4px;border-radius:8px;border:1px solid var(--border);background:var(--surface);color:var(--text);text-align:center;font-family:var(--font-display);font-variant-numeric:tabular-nums" data-ex-idx="' + exIdx + '" data-set-idx="' + sIdx + '" data-field="reps" inputmode="numeric">'
          + '<select style="min-height:36px;height:36px;font-size:11px;padding:2px 4px;border-radius:8px;border:1px solid var(--border);background:var(--surface);color:var(--text)" data-ex-idx="' + exIdx + '" data-set-idx="' + sIdx + '" data-field="rir">'
          + '<option value="" ' + (s.rir == null ? 'selected' : '') + '>Effort</option>'
          + '<option value="3" ' + (s.rir === 3 ? 'selected' : '') + '>3 RIR</option>'
          + '<option value="2" ' + (s.rir === 2 ? 'selected' : '') + '>2 RIR</option>'
          + '<option value="1" ' + (s.rir === 1 ? 'selected' : '') + '>1 RIR</option>'
          + '<option value="0" ' + (s.rir === 0 ? 'selected' : '') + '>Failure</option>'
          + '</select>'
          + '<button type="button" class="btn-ghost" style="color:var(--rust-light);padding:4px;font-size:17px;line-height:1;text-align:center;cursor:pointer" data-del-ex-idx="' + exIdx + '" data-del-set-idx="' + sIdx + '" title="Remove set">×</button>'
          + '</div>';
      }).join('');

      return '<div style="background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:14px;padding:12px 14px;margin-bottom:12px">'
        + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">'
          + '<div style="font-family:var(--font-display);font-size:15px;font-weight:700;color:var(--text)">' + esc(ex.name) + '</div>'
          + '<div style="display:flex;align-items:center;gap:6px">'
            + '<button type="button" class="btn-ghost" style="font-size:11px;color:var(--text-secondary);cursor:pointer;padding:2px 6px;border-radius:4px;border:1px solid rgba(255,255,255,0.1)" data-edit-ex-idx="' + exIdx + '">Edit</button>'
            + '<button type="button" class="btn-ghost" style="font-size:11px;color:var(--rust-light);cursor:pointer;padding:2px 6px;border-radius:4px;border:1px solid rgba(239,68,68,0.2)" data-remove-ex-idx="' + exIdx + '">Remove</button>'
          + '</div>'
        + '</div>'
        + '<div style="display:grid;grid-template-columns:30px 1fr 1fr 84px 30px;gap:8px;padding:0 0 4px 0;margin-bottom:4px;font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;text-align:center;letter-spacing:0.06em">'
          + '<span>#</span><span>' + (isBW ? '+KG (BW)' : 'KG') + '</span><span>REPS</span><span>EFFORT</span><span></span>'
        + '</div>'
        + (setsRows || '<div style="font-size:11px;color:var(--text-muted);text-align:center;padding:10px 0">No sets logged.</div>')
        + '<div style="margin-top:8px;text-align:left">'
          + '<button type="button" class="btn btn-sm" style="font-size:11px;padding:4px 10px;background:rgba(255,255,255,0.05);border:1px solid var(--border)" data-add-set-ex-idx="' + exIdx + '">+ Add Set</button>'
        + '</div>'
        + '</div>';
    }).join('');

    var durationMinutes = session.duration_sec ? Math.round(session.duration_sec / 60) : (session.durationMinutes || 45);

    overlay.innerHTML = '<div class="sheet" style="max-height:88vh;overflow-y:auto;padding-bottom:calc(24px + var(--safe-b));width:100%;max-width:480px;display:flex;flex-direction:column;gap:12px;background:var(--bg);border-top:1px solid rgba(255,255,255,0.12)">'
      + '<div class="sheet-handle"></div>'
      
      + '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px">'
        + '<div>'
          + '<div class="sheet-title" style="margin-bottom:2px">Edit Workout</div>'
          + '<div style="font-size:11px;color:var(--text-secondary)">' + esc(session.programLabel || 'Workout') + '</div>'
        + '</div>'
        + '<button type="button" class="btn-ghost" id="deleteWorkoutSessionBtn" style="color:var(--rust-light);font-size:11px;padding:4px 8px;border-radius:8px;border:1px solid rgba(239,68,68,0.2);cursor:pointer">Delete Session</button>'
      + '</div>'

      // Meta controls: Date, Day, Week, and Duration
      + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:14px;padding:12px">'
        + '<div>'
          + '<label class="t-label" style="display:block;margin-bottom:4px">Workout Date</label>'
          + '<input type="date" id="editSessionDate" value="' + (session.dayKey || todayKey()) + '" style="min-height:38px;height:38px;padding:4px 8px;font-size:15px;border-radius:8px;border:1px solid var(--border);background:var(--surface);color:var(--text);width:100%">'
        + '</div>'
        + '<div>'
          + '<label class="t-label" style="display:block;margin-bottom:4px">Day / Routine</label>'
          + '<select id="editSessionDay" style="min-height:38px;height:38px;padding:4px 8px;font-size:15px;border-radius:8px;border:1px solid var(--border);background:var(--surface);color:var(--text);width:100%">'
            + getActiveProgram().map(function(p, pIdx) {
                var isSel = (session.programDay === pIdx) || (session.programLabel === p.label);
                return '<option value="' + pIdx + '" ' + (isSel ? 'selected' : '') + '>' + esc(p.label) + '</option>';
              }).join('')
          + '</select>'
        + '</div>'
        + '<div>'
          + '<label class="t-label" style="display:block;margin-bottom:4px">Cycle Week</label>'
          + '<input type="number" min="1" max="100" id="editSessionWeek" value="' + (session.week || 1) + '" style="min-height:38px;height:38px;padding:4px 8px;font-size:15px;border-radius:8px;border:1px solid var(--border);background:var(--surface);color:var(--text);width:100%">'
        + '</div>'
        + '<div>'
          + '<label class="t-label" style="display:block;margin-bottom:4px">Duration (min)</label>'
          + '<input type="number" min="1" max="300" id="editSessionDuration" value="' + durationMinutes + '" style="min-height:38px;height:38px;padding:4px 8px;font-size:15px;border-radius:8px;border:1px solid var(--border);background:var(--surface);color:var(--text);width:100%">'
        + '</div>'
      + '</div>'

      // Exercise List (all vertically inside sheet)
      + '<div style="display:flex;flex-direction:column;gap:0">'
        + (exHTML || '<div style="font-size:11px;color:var(--text-muted);text-align:center;padding:16px 0">No exercises in this session.</div>')
      + '</div>'

      + '<div style="text-align:center">'
        + '<button type="button" class="btn" id="addExToWorkoutBtn" style="font-size:15px;padding:8px 14px;width:100%;border-radius:10px">+ Add Exercise to Workout</button>'
      + '</div>'

      + '<div style="display:flex;gap:10px;margin-top:4px">'
        + '<button type="button" class="btn" id="cancelEditWorkoutBtn" style="flex:1">Cancel</button>'
        + '<button type="button" class="btn btn-primary" id="saveEditWorkoutBtn" style="flex:1">Save Changes</button>'
      + '</div>'
      + '</div>';

    // Event attachments
    overlay.querySelector('#cancelEditWorkoutBtn').onclick = function() { overlay.remove(); };

    var delSessionBtn = overlay.querySelector('#deleteWorkoutSessionBtn');
    if (delSessionBtn) {
      delSessionBtn.onclick = function() {
        overlay.remove();
        deleteWorkoutSession(sessionId);
        if (typeof window.renderGym === 'function') window.renderGym();
        if (typeof window.renderProgressSimple === 'function') window.renderProgressSimple('lifts');
      };
    }

    overlay.querySelector('#saveEditWorkoutBtn').onclick = function() {
      var progList = getActiveProgram();
      var selDayIdx = parseInt(overlay.querySelector('#editSessionDay').value, 10);
      if (!isNaN(selDayIdx) && progList[selDayIdx]) {
        session.programDay = selDayIdx;
        session.programLabel = progList[selDayIdx].label;
        session.day = selDayIdx + 1;
      }
      var selWeek = parseInt(overlay.querySelector('#editSessionWeek').value, 10);
      if (!isNaN(selWeek) && selWeek > 0) {
        session.week = selWeek;
      }
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
