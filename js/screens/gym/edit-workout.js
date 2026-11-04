/* Gym edit workout sheet: edit logged sets and session details */

import { dayRecord, saveDayRecord, getWorkoutSession, saveWorkoutSession, deleteWorkoutSession } from "../../storage.js";
import { getExerciseData } from "../../data/plan.js";
import { esc } from "../../lib/format.js";
import { showToast } from "../../components/toast.js";

export function openEditWorkoutSheet(sessionId) {
  var store = workoutSessionStore();
  var session = store.sessions[sessionId];
  if (!session) {
    showToast('Session not found', 'warn');
    return;
  }
  var rec = session.dayKey ? dayRecord(session.dayKey) : { workout: {} };
  var currentExercises = (session.exercises || []).map(function(ex) {
    var sets = (rec.workout && rec.workout[ex.id]) || ex.sets || [];
    return {
      id: ex.id,
      name: (getExerciseData(ex.id) || {}).name || ex.name || ex.id,
      sets: sets.map(function(s) {
        return s ? { weight: s.weight, reps: s.reps, rir: s.rir } : null;
      }).filter(Boolean)
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
          + '<button type="button" class="btn-ghost" style="font-size:11px;color:var(--rust-light);cursor:pointer;padding:2px 6px" data-remove-ex-idx="' + exIdx + '">Remove</button>'
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
        renderProgressSimple('lifts');
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
      session.exercises = currentExercises.map(function(ex) {
        rec.workout[ex.id] = ex.sets;
        return { id: ex.id, name: ex.name, sets: ex.sets };
      });

      if (newDate && newDate !== oldDate) {
        session.dayKey = newDate;
        // Transfer to new day record
        var newRec = dayRecord(newDate);
        newRec.workout = rec.workout;
        newRec.workoutDone = true;
        saveDayRecord(newDate, newRec);
        // Clear from old day record if no workouts left
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
      renderProgressSimple('lifts');
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

    overlay.querySelectorAll('[data-remove-ex-idx]').forEach(function(btn) {
      btn.onclick = function() {
        captureCurrentInputs();
        var eI = parseInt(btn.dataset.removeExIdx, 10);
        if (confirm('Remove ' + currentExercises[eI].name + ' from this workout?')) {
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
        var allEx = Object.keys(EXERCISE_LIBRARY || {}).map(function(k){ return EXERCISE_LIBRARY[k]; });
        var chosenName = prompt('Enter exercise name to add:\n(e.g. Barbell Squat, Pull-ups, Lateral Raises)');
        if (!chosenName || !chosenName.trim()) return;
        chosenName = chosenName.trim();
        var found = allEx.find(function(e){ return e.name.toLowerCase() === chosenName.toLowerCase(); });
        var newId = found ? found.id : ('custom_' + chosenName.toLowerCase().replace(/\s+/g, '_'));
        currentExercises.push({
          id: newId,
          name: found ? found.name : chosenName,
          sets: [{ weight: 20, reps: 10, rir: 2 }]
        });
        renderModalBody();
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
