/* Progress session editor: session options menu, edit full workout sheet, duplicate and delete with undo */

import { dayRecord, saveDayRecord, sv } from "../../storage.js";
import { workoutSessionStore, saveWorkoutSession, getWorkoutSessions, WORKOUT_SESSIONS_KEY } from "../../storage-sessions.js";
import { openActionMenuSheet } from "../../components/sheet.js";
import { showToast, showUndoToast } from "../../components/toast.js";
import { esc, todayKey } from "../../lib/format.js";
import { getExerciseData, isBodyweightExercise } from "../../data/plan.js";

export function openSessionMenu(sessionId) {
  var store = workoutSessionStore();
  var session = store.sessions[sessionId];
  if (!session) {
    showToast('Session not found', 'warn');
    return;
  }
  var label = session.programLabel || session.sessionLabel || 'Workout';

  openActionMenuSheet(label, [
    {
      label: 'Edit session',
      action: function() {
        openEditWorkoutSheet(sessionId);
      }
    },
    {
      label: 'Duplicate to today',
      action: function() {
        duplicateSessionToToday(sessionId);
      }
    },
    {
      label: 'Delete session',
      destructive: true,
      action: function() {
        deleteSessionWithUndo(sessionId);
      }
    }
  ]);
}

export function duplicateSessionToToday(sessionId) {
  var session = getWorkoutSessions().find(function(s) { return s.id === sessionId; });
  if (!session) { showToast('Session not found', 'warn'); return; }
  var today = todayKey();
  var rec = dayRecord(today);
  rec.workout = rec.workout || {};
  (session.exercises || []).forEach(function(ex) {
    if (!ex.id) return;
    rec.workout[ex.id] = (ex.sets || []).map(function(s) {
      return { weight: Number(s.weight) || 0, reps: Number(s.reps) || 0, rir: s.rir };
    });
  });
  rec.workoutDone = false;
  saveDayRecord(today, rec);
  showToast('Workout duplicated to today', 'ok');
  if (typeof window.renderProgressSimple === 'function') window.renderProgressSimple();
}

export function deleteSessionWithUndo(sessionId) {
  var store = workoutSessionStore();
  var session = store.sessions[sessionId];
  if (!session) return;
  var label = session.programLabel || session.sessionLabel || 'Workout';
  var dateStr = session.dayKey || 'recorded date';

  if (!confirm('Are you sure you want to delete "' + label + '" on ' + dateStr + '?')) return;

  var backupSession = JSON.parse(JSON.stringify(session));
  var backupDayRec = session.dayKey ? JSON.parse(JSON.stringify(dayRecord(session.dayKey))) : null;

  delete store.sessions[sessionId];
  sv(WORKOUT_SESSIONS_KEY, store);

  if (session.dayKey) {
    var rec = dayRecord(session.dayKey);
    (session.exercises || []).forEach(function(ex) {
      if (rec.workout && rec.workout[ex.id]) delete rec.workout[ex.id];
    });
    if (rec.workoutMetaBySession && rec.workoutMetaBySession[String(session.programDay)]) {
      delete rec.workoutMetaBySession[String(session.programDay)];
    }
    var hasRemaining = Object.keys(rec.workout || {}).some(function(k){
      return (rec.workout[k] || []).some(Boolean);
    });
    if (!hasRemaining) { rec.workoutDone = false; rec.workout = {}; }
    saveDayRecord(session.dayKey, rec);
  }

  showUndoToast('Session deleted', function() {
    var curStore = workoutSessionStore();
    curStore.sessions[sessionId] = backupSession;
    sv(WORKOUT_SESSIONS_KEY, curStore);
    if (backupDayRec && backupSession.dayKey) {
      saveDayRecord(backupSession.dayKey, backupDayRec);
    }
    if (typeof window.renderProgressSimple === 'function') window.renderProgressSimple();
  });

  if (typeof window.renderProgressSimple === 'function') window.renderProgressSimple();
}

export function openEditWorkoutSheet(sessionId) {
  var session = getWorkoutSessions().find(function(s) { return s.id === sessionId; });
  if (!session) { showToast('Session not found', 'warn'); return; }

  var currentDayKey = session.dayKey || todayKey();
  var durationMin = session.duration_sec ? Math.round(session.duration_sec / 60) : (session.durationMinutes || 45);

  var overlay = document.createElement('div');
  overlay.className = 'overlay active';

  var exercisesHTML = (session.exercises || []).map(function(exItem, exIdx) {
    var exData = getExerciseData(exItem.id) || { name: exItem.id };
    var sets = (exItem.sets || []).filter(Boolean);

    var setRows = sets.map(function(s, sIdx) {
      var wVal = s.weight != null ? s.weight : '';
      var rVal = s.reps != null ? s.reps : '';
      var rirVal = s.rir != null ? s.rir : '';
      return '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">'
        + '<span style="font-size:11px;font-weight:600;color:#8A8A8E;min-width:40px">Set ' + (sIdx + 1) + '</span>'
        + '<input type="number" step="0.5" class="precision-input edit-set-weight" data-ex-idx="' + exIdx + '" data-set-idx="' + sIdx + '" value="' + esc(String(wVal)) + '" placeholder="kg" style="flex:1;height:36px;text-align:center">'
        + '<input type="number" step="1" class="precision-input edit-set-reps" data-ex-idx="' + exIdx + '" data-set-idx="' + sIdx + '" value="' + esc(String(rVal)) + '" placeholder="reps" style="flex:1;height:36px;text-align:center">'
        + '<input type="number" min="0" max="3" class="precision-input edit-set-rir" data-ex-idx="' + exIdx + '" data-set-idx="' + sIdx + '" value="' + esc(String(rirVal)) + '" placeholder="RIR" style="width:50px;height:36px;text-align:center">'
        + '</div>';
    }).join('');

    return '<div style="background:#1C1C1F;border-radius:12px;padding:12px;margin-bottom:12px">'
      + '<div style="font-size:15px;font-weight:600;color:#F5F5F4;margin-bottom:8px">' + esc(exData.name) + '</div>'
      + '<div style="display:flex;gap:8px;font-size:11px;color:#8A8A8E;margin-bottom:4px;padding-left:48px">'
        + '<span style="flex:1;text-align:center">Weight (kg)</span>'
        + '<span style="flex:1;text-align:center">Reps</span>'
        + '<span style="width:50px;text-align:center">RIR (0–3)</span>'
      + '</div>'
      + setRows
      + '</div>';
  }).join('');

  overlay.innerHTML = '<div class="sheet" style="background:#141416;border-radius:20px 20px 0 0;padding:20px 20px calc(24px + var(--safe-b));width:100%;max-width:480px;max-height:85vh;overflow-y:auto">'
    + '<div class="sheet-handle"></div>'
    + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">'
      + '<div style="font-size:28px;font-weight:600;color:#F5F5F4">Edit Session</div>'
      + '<button type="button" class="btn-text-action" id="cancelEditSessionBtn" style="font-size:15px;color:#8A8A8E;background:none;border:none;padding:0;cursor:pointer">Cancel</button>'
    + '</div>'
    + '<div style="margin-bottom:16px">'
      + '<label style="display:block;font-size:11px;font-weight:600;color:#8A8A8E;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px">Date</label>'
      + '<input type="date" id="editSessionDateInp" class="precision-input" value="' + esc(currentDayKey) + '" style="width:100%;height:44px;text-align:left;padding:0 12px;font-size:15px">'
    + '</div>'
    + '<div style="margin-bottom:16px">'
      + '<label style="display:block;font-size:11px;font-weight:600;color:#8A8A8E;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px">Duration (minutes)</label>'
      + '<input type="number" min="1" max="180" id="editSessionDurInp" class="precision-input" value="' + durationMin + '" style="width:100%;height:44px;text-align:left;padding:0 12px;font-size:15px">'
    + '</div>'
    + '<div style="margin-bottom:20px">'
      + '<label style="display:block;font-size:11px;font-weight:600;color:#8A8A8E;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px">Logged Sets</label>'
      + exercisesHTML
    + '</div>'
    + '<button type="button" class="btn btn-primary" id="saveEditSessionBtn" style="width:100%;height:48px;background:#C6F432;color:#0B0B0C;font-size:15px;font-weight:600;border:none;border-radius:12px;cursor:pointer">Save Changes</button>'
    + '</div>';

  document.body.appendChild(overlay);

  overlay.querySelector('#cancelEditSessionBtn').onclick = function() { overlay.remove(); };

  overlay.querySelector('#saveEditSessionBtn').onclick = function() {
    var newDate = overlay.querySelector('#editSessionDateInp').value;
    var newDur = parseInt(overlay.querySelector('#editSessionDurInp').value, 10);
    if (!newDate) { showToast('Please select a valid date', 'warn'); return; }
    if (isNaN(newDur) || newDur < 1 || newDur > 180) { showToast('Duration must be between 1 and 180 min', 'warn'); return; }

    var updatedExercises = JSON.parse(JSON.stringify(session.exercises || []));
    overlay.querySelectorAll('.edit-set-weight').forEach(function(inp) {
      var eIdx = parseInt(inp.dataset.exIdx, 10);
      var sIdx = parseInt(inp.dataset.setIdx, 10);
      var w = parseFloat(inp.value) || 0;
      if (updatedExercises[eIdx] && updatedExercises[eIdx].sets && updatedExercises[eIdx].sets[sIdx]) {
        updatedExercises[eIdx].sets[sIdx].weight = w;
      }
    });
    overlay.querySelectorAll('.edit-set-reps').forEach(function(inp) {
      var eIdx = parseInt(inp.dataset.exIdx, 10);
      var sIdx = parseInt(inp.dataset.setIdx, 10);
      var r = parseInt(inp.value, 10) || 0;
      if (updatedExercises[eIdx] && updatedExercises[eIdx].sets && updatedExercises[eIdx].sets[sIdx]) {
        updatedExercises[eIdx].sets[sIdx].reps = r;
      }
    });
    overlay.querySelectorAll('.edit-set-rir').forEach(function(inp) {
      var eIdx = parseInt(inp.dataset.exIdx, 10);
      var sIdx = parseInt(inp.dataset.setIdx, 10);
      var rirStr = inp.value.trim();
      var rir = rirStr === '' ? null : parseInt(rirStr, 10);
      if (updatedExercises[eIdx] && updatedExercises[eIdx].sets && updatedExercises[eIdx].sets[sIdx]) {
        updatedExercises[eIdx].sets[sIdx].rir = rir;
      }
    });

    session.exercises = updatedExercises;
    session.durationMinutes = newDur;
    session.duration_sec = newDur * 60;

    var store = workoutSessionStore();
    if (newDate !== currentDayKey) {
      delete store.sessions[session.id];
      var oldRec = dayRecord(currentDayKey);
      (session.exercises || []).forEach(function(ex) {
        if (oldRec.workout && oldRec.workout[ex.id]) delete oldRec.workout[ex.id];
      });
      saveDayRecord(currentDayKey, oldRec);

      session.dayKey = newDate;
      session.id = 'workout_session_' + newDate.replace(/[^0-9A-Za-z_-]/g, '_') + '_' + (session.programDay != null ? session.programDay : 'all');
    }

    var targetRec = dayRecord(newDate);
    targetRec.workout = targetRec.workout || {};
    (session.exercises || []).forEach(function(ex) {
      targetRec.workout[ex.id] = (ex.sets || []).map(function(s) {
        return { weight: s.weight, reps: s.reps, rir: s.rir };
      });
    });
    targetRec.workoutMetaBySession = targetRec.workoutMetaBySession || {};
    var meta = targetRec.workoutMetaBySession[String(session.programDay)] || {};
    meta.durationMinutes = newDur;
    meta.duration_sec = newDur * 60;
    meta.completedAt = meta.completedAt || new Date().toISOString();
    targetRec.workoutMetaBySession[String(session.programDay)] = meta;
    saveDayRecord(newDate, targetRec);

    store.sessions[session.id] = session;
    sv(WORKOUT_SESSIONS_KEY, store);

    overlay.remove();
    showToast('Session updated successfully', 'ok');
    if (typeof window.renderProgressSimple === 'function') window.renderProgressSimple();
  };
}
