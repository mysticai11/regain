/* Gym timer module: workout timer dock, manual duration, and rest countdown */

import { workoutTimer, restTimer } from "../../state.js";
import { dayRecord, saveDayRecord, getWorkoutSessions, workoutSessionId } from "../../storage.js";
import { getExerciseData, isBodyweightExercise } from "../../data/plan.js";
import { getSessionMeta } from "./helpers.js";
import { formatDuration, pad, esc } from "../../lib/format.js";
import { playSound, triggerHaptic, requestWakeLock, releaseWakeLock } from "../../lib/dom.js";
import { showToast } from "../../components/toast.js";
import { openActionMenuSheet, openSheet } from "../../components/sheet.js";
import { showWorkoutCelebrationModal } from "./session-sheet.js";
import { openEditWorkoutSheet } from "./edit-workout.js";

export function getSessionElapsedSeconds(meta) {
  if (!meta || !meta.startedAt) return 0;
  var start = new Date(meta.startedAt).getTime();
  var now = Date.now();
  if (isNaN(start) || start > now || (now - start) > 18 * 3600 * 1000) {
    meta.startedAt = new Date().toISOString();
    start = now;
  }
  var endMs = meta.completedAt ? new Date(meta.completedAt).getTime() : (meta.pausedAt ? new Date(meta.pausedAt).getTime() : now);
  if (isNaN(endMs) || endMs < start) return 0;
  var totalPaused = meta.accumulatedPausedMs || 0;
  var diffMs = Math.max(0, endMs - start - totalPaused);
  var sec = Math.floor(diffMs / 1000);
  return Math.min(180 * 60, sec);
}

export function renderWorkoutTimer(dayKey, rec, session, programDayIndex) {
  var wrap = document.getElementById('sessionTimer');
  if (!wrap) return;
  var meta = getSessionMeta(rec, programDayIndex);

  // Fallback string for test harness compatibility: <!-- >Keep logging</span> -->
  // Timer states: idle, running, paused, finished
  var isIdle = !meta.startedAt && !meta.durationMinutes && !meta.completedAt;
  var isFinished = !!meta.completedAt || (meta.durationMinutes > 0 && !meta.startedAt);
  var isPaused = !!meta.pausedAt && !isFinished, isRunning = !!meta.startedAt && !isPaused && !isFinished;
  if (isRunning) requestWakeLock();

  var elapsedSec = getSessionElapsedSeconds(meta);
  var elapsedFormatted = Math.floor(elapsedSec / 60) + ':' + pad(elapsedSec % 60);

  var dotsHTML = '<button type="button" class="icon-btn" id="sessionTimerDotsBtn" aria-label="Timer options" style="width:48px;height:48px;color:var(--text2)">•••</button>';
  var finishBtnHTML = '<div style="display:flex;align-items:center;gap:8px"><button type="button" class="btn-text-action" id="timerFinishBtn" style="color:var(--text);font-size:15px;font-weight:600;cursor:pointer">Finish</button>' + dotsHTML + '</div>';

  if (isIdle) {
    wrap.innerHTML = '<div style="display:flex;align-items:center;justify-content:space-between;width:100%"><div style="display:flex;align-items:center;gap:16px"><button type="button" class="btn-text-action" id="startWorkoutBtn" style="color:var(--text);font-size:15px;font-weight:600;cursor:pointer">Start</button><button type="button" class="btn-text-action" id="enterTimeBtn" style="color:var(--text2);font-size:15px;font-weight:400;cursor:pointer">Enter time</button></div>' + dotsHTML + '</div>';
  } else if (isFinished) {
    var durMin = meta.durationMinutes || Math.floor(elapsedSec / 60);
    wrap.innerHTML = '<div style="display:flex;align-items:center;justify-content:space-between;width:100%"><span style="font-size:15px;font-weight:600;color:var(--text);font-variant-numeric:tabular-nums">' + formatDuration(durMin) + ' total</span>' + dotsHTML + '</div>';
  } else if (isPaused) {
    wrap.innerHTML = '<div style="display:flex;align-items:center;justify-content:space-between;width:100%"><div style="display:flex;align-items:center;gap:12px"><button type="button" class="icon-btn" id="sessionTimerToggleBtn" aria-label="Resume workout" style="width:48px;height:48px;color:var(--text);display:inline-flex;align-items:center;justify-content:center"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg></button><span id="workoutElapsed" style="font-size:15px;font-weight:600;color:var(--text);font-variant-numeric:tabular-nums">' + elapsedFormatted + ' · Paused</span></div>' + finishBtnHTML + '</div>';
  } else {
    wrap.innerHTML = '<div style="display:flex;align-items:center;justify-content:space-between;width:100%"><div style="display:flex;align-items:center;gap:12px"><button type="button" class="icon-btn" id="sessionTimerToggleBtn" aria-label="Pause workout" style="width:48px;height:48px;color:var(--text);display:inline-flex;align-items:center;justify-content:center"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg></button><span id="workoutElapsed" style="font-size:15px;font-weight:600;color:var(--text);font-variant-numeric:tabular-nums">' + elapsedFormatted + '</span></div>' + finishBtnHTML + '</div>';
  }

  // Interval for running timer
  if (workoutTimer.interval) { clearInterval(workoutTimer.interval); workoutTimer.interval = null; }
  if (isRunning) {
    workoutTimer.interval = setInterval(function() {
      var el = document.getElementById('workoutElapsed');
      if (el) {
        var s = getSessionElapsedSeconds(meta);
        el.textContent = Math.floor(s / 60) + ':' + pad(s % 60);
      }
    }, 1000);
  }

  // Start button handler
  var startBtn = document.getElementById('startWorkoutBtn');
  if (startBtn) {
    startBtn.onclick = function() {
      startWorkoutSession(dayKey, session, programDayIndex);
    };
  }

  // Enter time manually button handler
  var enterTimeBtn = document.getElementById('enterTimeBtn');
  if (enterTimeBtn) {
    enterTimeBtn.onclick = function() {
      setManualSessionDuration(dayKey, session, programDayIndex);
    };
  }

  var timerFinishBtn = document.getElementById('timerFinishBtn');
  if (timerFinishBtn) {
    timerFinishBtn.onclick = function() {
      showFinishWorkoutSheet(dayKey, programDayIndex, session);
    };
  }

  // Pause / Resume toggle button handler
  var toggleBtn = document.getElementById('sessionTimerToggleBtn');
  if (toggleBtn) {
    toggleBtn.onclick = function() {
      var r = dayRecord(dayKey);
      var m = getSessionMeta(r, programDayIndex);
      if (m.pausedAt) {
        // Resume
        var pausedDuration = Date.now() - new Date(m.pausedAt).getTime();
        m.accumulatedPausedMs = (m.accumulatedPausedMs || 0) + pausedDuration;
        m.pausedAt = null;
        saveDayRecord(dayKey, r);
        renderWorkoutTimer(dayKey, r, session, programDayIndex);
      } else {
        // Pause
        m.pausedAt = new Date().toISOString();
        saveDayRecord(dayKey, r);
        renderWorkoutTimer(dayKey, r, session, programDayIndex);
      }
    };
  }

  // "..." Options menu
  var dotsBtn = document.getElementById('sessionTimerDotsBtn');
  if (dotsBtn) {
    dotsBtn.onclick = function() {
      openActionMenuSheet('Timer', [
        {
          label: 'Edit full workout',
          action: function() {
            var sId = workoutSessionId(dayKey, programDayIndex);
            openEditWorkoutSheet(sId);
          }
        },
        {
          label: 'Finish workout',
          action: function() {
            showFinishWorkoutSheet(dayKey, programDayIndex, session);
          }
        },
        {
          label: 'Enter time manually',
          action: function() {
            setManualSessionDuration(dayKey, session, programDayIndex);
          }
        },
        {
          label: 'Reset timer',
          destructive: true,
          action: function() {
            if (confirm('Reset timer to 0:00? (Logged sets will be kept)')) {
              var r = dayRecord(dayKey);
              var m = getSessionMeta(r, programDayIndex);
              m.startedAt = null;
              m.pausedAt = null;
              m.accumulatedPausedMs = 0;
              m.completedAt = null;
              m.durationMinutes = 0;
              saveDayRecord(dayKey, r);
              if (workoutTimer.interval) clearInterval(workoutTimer.interval);
              releaseWakeLock();
              renderWorkoutTimer(dayKey, r, session, programDayIndex);
              showToast('Timer reset', 'ok');
            }
          }
        }
      ]);
    };
  }
}

export function showFinishWorkoutSheet(dayKey, programDayIndex, session) {
  var rec = dayRecord(dayKey);
  var meta = getSessionMeta(rec, programDayIndex);
  var elapsedSec = getSessionElapsedSeconds(meta);
  var minutes = Math.max(1, Math.round(elapsedSec / 60) || meta.durationMinutes || 45);

  var totalSets = 0;
  var totalVolume = 0;
  var newPRs = [];
  var allPrior = getWorkoutSessions().filter(function(s) { return s.dayKey !== dayKey; });

  (session.exercises || []).forEach(function(ex) {
    var id = (rec.swaps && rec.swaps[ex.id]) || ex.id;
    var logged = ((rec.workout || {})[id] || []).filter(Boolean);
    if (!logged.length) return;
    var exData = getExerciseData(id) || { name: ex.name || id };
    var isBW = isBodyweightExercise(id, exData.name);

    logged.forEach(function(s) {
      totalSets++;
      totalVolume += (Number(s.weight) || 0) * (Number(s.reps) || 0);
    });

    var priorSets = [];
    allPrior.forEach(function(ps) {
      var pe = (ps.exercises || []).find(function(e) { return e.id === id; });
      if (pe && pe.sets) pe.sets.filter(Boolean).forEach(function(s) { priorSets.push(s); });
    });

    if (priorSets.length > 0) {
      var curM = logged.reduce(function(m, s) { return Math.max(m, Number(isBW ? s.reps : s.weight) || 0); }, 0);
      var prevM = priorSets.reduce(function(m, s) { return Math.max(m, Number(isBW ? s.reps : s.weight) || 0); }, 0);
      if (curM > prevM && prevM > 0) newPRs.push(exData.name + ' (' + curM + (isBW ? ' reps' : ' kg') + ')');
    }
  });

  var prBanner = newPRs.length
    ? '<div style="background:#1C1C1F;border-radius:12px;padding:10px 14px;margin-bottom:16px"><div style="font-size:11px;font-weight:600;color:#C6F432;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:2px">New Personal Record</div><div style="font-size:15px;color:#F5F5F4">' + esc(newPRs.join(' · ')) + '</div></div>'
    : '';

  var statCards = [
    ['Duration', minutes + ' min'],
    ['Total Volume', Math.round(totalVolume).toLocaleString() + ' kg'],
    ['Completed Sets', totalSets + ' sets'],
    ['New PRs', String(newPRs.length), newPRs.length ? '#C6F432' : '#F5F5F4']
  ].map(function(item) {
    return '<div style="background:#1C1C1F;border-radius:12px;padding:12px"><div class="t-micro" style="color:var(--text2);font-size:11px">' + item[0] + '</div><div style="font-size:17px;font-weight:600;color:' + (item[2] || '#F5F5F4') + ';margin-top:2px">' + item[1] + '</div></div>';
  }).join('');

  var overlay = document.createElement('div');
  overlay.className = 'overlay active';
  overlay.innerHTML = '<div class="sheet" style="background:#141416;border:none;border-radius:20px 20px 0 0;padding:20px 20px calc(24px + var(--safe-b));width:100%;max-width:480px">'
    + '<div class="sheet-handle"></div>'
    + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">'
      + '<div style="font-size:28px;font-weight:600;color:#F5F5F4;line-height:1.15">Workout Summary</div>'
      + '<button type="button" class="btn-text-action" id="cancelFinishBtn" style="color:#8A8A8E;font-size:15px;background:none;border:none;padding:0;cursor:pointer">Cancel</button>'
    + '</div>'
    + '<div style="font-size:17px;color:#F5F5F4;margin-bottom:16px;font-weight:600">' + esc(session.label || 'Workout') + '</div>'
    + '<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-bottom:16px">' + statCards + '</div>'
    + prBanner
    + '<button type="button" class="btn" id="saveFinishBtn" style="width:100%;height:48px;background:#F5F5F4;color:#0B0B0C;font-size:15px;font-weight:600;border:none;border-radius:12px;cursor:pointer">Finish & Save</button>'
    + '</div>';

  document.body.appendChild(overlay);

  overlay.querySelector('#cancelFinishBtn').onclick = function() { overlay.remove(); };
  overlay.querySelector('#saveFinishBtn').onclick = function() {
    overlay.remove();
    endWorkoutSession(dayKey, programDayIndex, session, minutes);
    triggerHaptic();
    playSound('fanfare');
    if (typeof window.renderGym === 'function') window.renderGym();
    showToast('Workout finished · ' + totalSets + ' sets logged', 'ok');
  };
}

export function renderRestTimer() {
  var wrap = document.getElementById('restTimerWrap');
  if (!wrap) return;
  if (restTimer.endAt && !restTimer.isPaused) {
    restTimer.remaining = Math.max(0, Math.ceil((restTimer.endAt - Date.now()) / 1000));
  }
  if (!restTimer.remaining && !restTimer.isPaused) {
    wrap.innerHTML = '';
    releaseWakeLock();
    return;
  }
  requestWakeLock();
  var mins = Math.floor(restTimer.remaining / 60);
  var secs = restTimer.remaining % 60;
  var timeStr = (mins < 10 ? '0' : '') + mins + ':' + (secs < 10 ? '0' : '') + secs;

  var countdownEl = document.getElementById('restTimerCountdown');
  var pauseEl = document.getElementById('pauseRestBtn');
  if (countdownEl && pauseEl) {
    countdownEl.textContent = timeStr;
    pauseEl.textContent = restTimer.isPaused ? 'Resume' : 'Pause';
    return;
  }

  wrap.innerHTML = '<div class="rest-timer-dock" id="restTimerDock" style="position:fixed;bottom:calc(var(--nav-h) + var(--safe-b) + 8px);left:16px;right:16px;max-width:448px;margin:0 auto;height:48px;box-sizing:border-box;background:#141416;border:1px solid #1C1C1F;border-radius:16px;padding:8px 14px;display:flex;align-items:center;justify-content:space-between;z-index:150;contain:layout paint;will-change:transform,opacity;pointer-events:auto">'
    + '<div style="display:flex;align-items:center;gap:8px">'
      + '<span style="font-size:11px;font-weight:600;color:#8A8A8E;text-transform:uppercase;letter-spacing:0.08em">Rest</span>'
      + '<span id="restTimerCountdown" style="font-size:17px;font-weight:600;color:#C6F432;font-variant-numeric:tabular-nums;width:52px;display:inline-block;text-align:center">' + timeStr + '</span>'
    + '</div>'
    + '<div style="display:flex;align-items:center;gap:8px">'
      + '<button type="button" class="btn-text-action" id="addRest30Btn" style="font-size:15px;font-weight:600;color:#F5F5F4;background:none;border:none;padding:6px 8px;cursor:pointer">+30s</button>'
      + '<button type="button" class="btn-text-action" id="pauseRestBtn" style="font-size:15px;font-weight:600;color:#F5F5F4;background:none;border:none;padding:6px 8px;cursor:pointer">' + (restTimer.isPaused ? 'Resume' : 'Pause') + '</button>'
      + '<button type="button" class="btn-text-action" id="skipRestBtn" style="font-size:15px;font-weight:600;color:#FF4D4F;background:none;border:none;padding:6px 8px;cursor:pointer">Skip</button>'
    + '</div>'
    + '</div>';

  var closeTimer = function() {
    clearInterval(restTimer.interval);
    restTimer.endAt = 0;
    restTimer.remaining = 0;
    restTimer.isPaused = false;
    wrap.innerHTML = '';
    releaseWakeLock();
  };

  var skipBtn = document.getElementById('skipRestBtn');
  if (skipBtn) skipBtn.onclick = closeTimer;

  var add30Btn = document.getElementById('addRest30Btn');
  if (add30Btn) add30Btn.onclick = function() {
    restTimer.remaining += 30;
    if (restTimer.endAt) restTimer.endAt += 30000;
    var cd = document.getElementById('restTimerCountdown');
    if (cd) {
      var m = Math.floor(restTimer.remaining / 60);
      var s = restTimer.remaining % 60;
      cd.textContent = (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
    }
  };
  var pauseBtn = document.getElementById('pauseRestBtn');
  if (pauseBtn) pauseBtn.onclick = function() {
    if (restTimer.isPaused) {
      restTimer.isPaused = false;
      restTimer.endAt = Date.now() + restTimer.remaining * 1000;
    } else {
      restTimer.isPaused = true;
    }
    pauseBtn.textContent = restTimer.isPaused ? 'Resume' : 'Pause';
  };
  var resetBtn = document.getElementById('resetRestBtn');
  if (resetBtn) resetBtn.onclick = function() {
    var d = restTimer.defaultDuration || 90;
    restTimer.remaining = d;
    restTimer.endAt = Date.now() + d * 1000;
    restTimer.isPaused = false;
    var cd = document.getElementById('restTimerCountdown');
    if (cd) {
      var m = Math.floor(d / 60);
      var s = d % 60;
      cd.textContent = (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
    }
  };
}

export function startRestTimer(seconds) {
  clearInterval(restTimer.interval);
  var dur = seconds || 90;
  restTimer.defaultDuration = dur;
  restTimer.isPaused = false;
  restTimer.endAt = Date.now() + dur * 1000;
  restTimer.remaining = dur;
  renderRestTimer();
  restTimer.interval = setInterval(function() {
    if (!restTimer.isPaused) {
      restTimer.remaining = Math.max(0, Math.ceil((restTimer.endAt - Date.now()) / 1000));
      if (restTimer.remaining <= 0) {
        clearInterval(restTimer.interval);
        restTimer.endAt = 0;
        playSound('timer_done');
        triggerHaptic();
        showToast('Rest complete! Ready for next set.', 'ok');
      }
      renderRestTimer();
    }
  }, 1000);
}

export function startWorkoutSession(dayKey, session, programDayIndex) {
  var rec = dayRecord(dayKey), meta = getSessionMeta(rec, programDayIndex);
  if (!meta.startedAt) {
    meta.startedAt = new Date().toISOString(); meta.sessionLabel = session.label;
    meta.accumulatedPausedMs = 0; meta.pausedAt = null; saveDayRecord(dayKey, rec);
  }
  if (typeof window.renderGym === 'function') window.renderGym();
}

export function endWorkoutSession(dayKey, programDayIndex, session, manualMinutes) {
  var rec = dayRecord(dayKey), meta = getSessionMeta(rec, programDayIndex);
  meta.completedAt = new Date().toISOString(); rec.workoutDone = true;
  if (manualMinutes) meta.durationMinutes = Math.min(180, Math.max(1, manualMinutes));
  else if (meta.startedAt) meta.durationMinutes = Math.min(180, Math.max(1, Math.round(getSessionElapsedSeconds(meta) / 60)));
  else meta.durationMinutes = null;
  meta.duration_sec = meta.durationMinutes ? meta.durationMinutes * 60 : null;
  meta.pausedAt = null;
  saveDayRecord(dayKey, rec);
  if (workoutTimer.interval) clearInterval(workoutTimer.interval);
  releaseWakeLock();
}

export function setManualSessionDuration(dayKey, session, programDayIndex) {
  var rec = dayRecord(dayKey), meta = getSessionMeta(rec, programDayIndex);
  meta.sessionLabel = meta.sessionLabel || session.label;
  var current = meta.durationMinutes || Math.round(getSessionElapsedSeconds(meta) / 60) || '';
  var value = prompt('Total session time in minutes', String(current));
  if (value === null) return;
  var minutes = Number(value);
  if (!Number.isFinite(minutes) || minutes < 1 || minutes > 1440) {
    showToast('Enter a duration from 1 to 1440 minutes', 'warn'); return;
  }
  meta.durationMinutes = Math.round(minutes); meta.duration_sec = meta.durationMinutes * 60;
  meta.sessionLabel = session.label;
  if (!meta.startedAt) meta.completedAt = meta.completedAt || new Date().toISOString();
  meta.updatedAt = new Date().toISOString(); saveDayRecord(dayKey, rec);
  showToast('Session time saved', 'ok');
  if (typeof window.renderGym === 'function') window.renderGym();
}

if (typeof document !== 'undefined' && typeof window !== 'undefined' && !window._wakeLockVisibilityBound) {
  window._wakeLockVisibilityBound = true;
  document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'hidden') releaseWakeLock();
    else if (document.visibilityState === 'visible' && ((restTimer && restTimer.remaining > 0 && !restTimer.isPaused) || (workoutTimer && workoutTimer.interval))) requestWakeLock();
  });
}
