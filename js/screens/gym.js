/* Gym screen: main logger accordion view, set inputs, and gym header */

import { profile, activeGymDateKey, activeExpandedExId, setActiveExpandedExId, setTab } from "../state.js";
import { dayRecord, saveDayRecord } from "../storage.js";
import { getActiveProgram, getExerciseData, getWeeklySchedule, getCurrentWorkout, sessionSetCount } from "../data/plan.js";
import { todayKey, dateKey, formatDuration, workoutElapsed, esc, pad } from "../lib/format.js";
import { playSound, triggerHaptic, ic } from "../lib/dom.js";
import { showToast } from "../components/toast.js";
import { openSheet } from "../components/sheet.js";
import { getWeeklyVolume } from "../lib/calc.js";
import { isBodyweightExercise, getLastSessionSets } from "./gym/sets.js";
import { renderWorkoutTimer, renderRestTimer, startRestTimer, showFinishWorkoutSheet } from "./gym/timer.js";
import { chooseWorkoutForDate } from "./gym/session-sheet.js";
import { getWorkoutForDate, getWorkoutWeek, getCompletedWorkoutCount, getNextProgramWorkout, getActiveWorkoutSession, getSessionMeta, attachCommonGymHeaderEvents, buildVolumeTable } from "./gym/helpers.js";
import { attachGymEvents } from "./gym/events.js";
import { renderSetRowWrap } from "./gym/swipe-delete.js";
export * from "./gym/helpers.js"; export * from "./gym/timer.js"; export * from "./gym/sets.js"; export * from "./gym/swap.js"; export * from "./gym/session-sheet.js"; export * from "./gym/plan-editor.js"; export * from "./gym/events.js";

export function renderGym() {
  var contentEl = document.getElementById('content');
  var prevScroll = (typeof window !== 'undefined' && (window.scrollY || window.pageYOffset || (document.documentElement ? document.documentElement.scrollTop : 0) || (document.body ? document.body.scrollTop : 0))) || (contentEl ? contentEl.scrollTop : 0);
  var restoreScroll = function() { if (prevScroll > 0) { if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') window.scrollTo(0, prevScroll); if (contentEl) contentEl.scrollTop = prevScroll; if (typeof requestAnimationFrame === 'function') requestAnimationFrame(function() { if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') window.scrollTo(0, prevScroll); }); } };
  var key = window.activeGymDateKey || todayKey();
  var rec = dayRecord(key);
  var prog = getActiveProgram();
  var activeDate = new Date(key + 'T00:00:00');
  var currentD = activeDate.getDay();
  var isActualToday = key === todayKey();
  var completedCount = getCompletedWorkoutCount();
  var cycleWorkouts = prog.length || 5;
  var workoutWeek = Math.floor(completedCount / cycleWorkouts) + 1;
  var completedInCycle = completedCount % cycleWorkouts;

  // Day names and month names for strict "WED 4 NOV · WEEK 1" format
  var dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'], monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  var headerDateStr = dayNames[activeDate.getDay()] + ' ' + activeDate.getDate() + ' ' + monthNames[activeDate.getMonth()];
  var formattedSessionDate = activeDate.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });

  var defaultScheduleDay = currentD === 0 ? 7 : currentD, weeklySched = getWeeklySchedule(), curWorkout = getCurrentWorkout(key);
  var activeSched = {
    isRest: curWorkout.isRest, workoutIndex: curWorkout.workoutIndex,
    label: curWorkout.isRest ? 'Rest Day' : (curWorkout.session ? curWorkout.session.label : 'Workout'),
    dayNum: rec.selectedDayNumber != null ? rec.selectedDayNumber : defaultScheduleDay
  };

  var activeCleanName = curWorkout.isRest ? 'Scheduled Rest Day' : (curWorkout.cleanName || 'Workout');

  var workoutIndex = curWorkout.workoutIndex;
  var session = curWorkout.session || (prog && prog[0]) || { label: 'Workout', exercises: [] };
  var activeExercises = (session.exercises || []).filter(function (ex) {
    return !(rec.skippedExercises && rec.skippedExercises[ex.id]);
  });
  var totalPlanned = sessionSetCount(Object.assign({}, session, { exercises: activeExercises }), rec);
  var loggedTotal = activeExercises.reduce(function (total, ex) {
    var actualId = (rec.swaps && rec.swaps[ex.id]) || ex.id;
    return total + ((rec.workout || {})[actualId] || []).filter(Boolean).length;
  }, 0);

  // Precision Gym Header (Item 5: 11px label "WED 4 NOV · WEEK 1", 28px title, "3 / 12 sets" right in text2)
  var gymHeaderUnifiedHTML =
    '<div class="gym-header-unified" style="margin-bottom:16px">'
    + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">'
    + '<button type="button" id="gymDateSelectBtn" style="background:none;border:none;padding:0;font-size:11px;font-weight:600;color:#8A8A8E;text-transform:uppercase;letter-spacing:0.08em;cursor:pointer;text-align:left">'
    + headerDateStr + ' · WEEK ' + workoutWeek
    + '</button>'
    + '<div style="display:flex;align-items:center;gap:14px">'
    + '<button type="button" id="manageSplitTopBtn" style="background:none;border:none;padding:0;font-size:11px;font-weight:600;color:#8A8A8E;text-transform:uppercase;letter-spacing:0.08em;cursor:pointer">Plan</button>'
    + '<button class="icon-btn" id="settingsBtn" aria-label="Settings">' + ic('settings') + '</button>'
    + '</div>'
    + '</div>'
    + '<div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:baseline;gap:4px 12px;margin-bottom:6px">'
    + '<div style="font-size:28px;line-height:1.15;font-weight:600;color:#F5F5F4;min-width:200px;flex:1 1 auto;word-break:break-word">' + esc(activeCleanName) + '</div>'
    + (!activeSched.isRest ? ('<span style="font-size:15px;color:#8A8A8E;font-variant-numeric:tabular-nums;flex-shrink:0" id="gymSetProgress">' + loggedTotal + ' / ' + totalPlanned + ' sets</span>') : '')
    + '</div>'
    + '</div>';

  var progressRatio = totalPlanned > 0 ? Math.min(1, loggedTotal / totalPlanned) : (rec.workoutDone ? 1 : 0);
  var sessionStatusText = rec.workoutDone ? 'Completed' : (loggedTotal > 0 ? 'In progress' : 'Scheduled');
  var sessionBarHTML = !activeSched.isRest
    ? ('<div class="gym-session-bar" id="gymSessionBar"><div style="min-width:0;flex:1"><div style="font-size:15px;font-weight:600;color:#F5F5F4;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(activeCleanName) + '</div><div class="t-micro tabnum" id="sessionBarSetProgress" style="color:#8A8A8E;margin-top:2px">' + loggedTotal + ' / ' + totalPlanned + ' sets · ' + sessionStatusText + '</div></div><div id="sessionTimer" class="session-timer-dock" style="display:flex;align-items:center;flex-shrink:0"></div><div class="gym-session-bar-progress"><div class="gym-session-bar-progress-fill" id="sessionBarProgressFill" style="transform:scaleX(' + progressRatio + ')"></div></div></div>')
    : '';

  var dateBannerHTML = !isActualToday
    ? ('<div class="gym-date-banner" style="margin-bottom:14px;display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:#1C1C1F;border-radius:12px"><span style="font-size:11px;color:#8A8A8E">Logging for <strong style="color:#F5F5F4">' + esc(formattedSessionDate) + '</strong></span><button type="button" class="btn-ghost" id="gymDateResetBtn" style="background:none;border:none;font-size:11px;color:#F5F5F4;font-weight:600;cursor:pointer">Jump to Today</button></div>')
    : '';

  // 1. If active schedule is a Rest Day
  if (activeSched.isRest || activeSched.workoutIndex == null) {
    var nextWorkoutSched = weeklySched.find(function (s) { return !s.isRest && s.dayNum > activeSched.dayNum; }) || weeklySched.find(function (s) { return !s.isRest; }) || weeklySched[0];
    document.getElementById('content').innerHTML =
      '<div class="gym-page">'
      + dateBannerHTML
      + gymHeaderUnifiedHTML
      + '<div style="padding:16px 0 24px;border-bottom:1px solid #222">'
      + '<div style="font-size:11px;font-weight:600;color:#8A8A8E;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px">Rest Day</div>'
      + '<div style="font-size:28px;font-weight:600;color:#F5F5F4;margin-bottom:8px">Recovery & Adaptation</div>'
      + '<div style="font-size:15px;color:#8A8A8E;line-height:1.4;margin-bottom:20px">Muscles adapt during rest. Hit your protein targets and get quality recovery.</div>'
      + '<button type="button" class="btn-text-action" id="previewNextWorkoutBtn" style="color:#F5F5F4;font-size:15px;font-weight:600;background:none;border:none;padding:0;cursor:pointer">Start Next: ' + esc(nextWorkoutSched.label.replace(/^Day\s*\d+\s*[—–-]\s*/i, '')) + ' →</button>'
      + '</div>'
      + '<div style="margin-top:32px"><div style="font-size:11px;font-weight:600;color:#8A8A8E;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:12px">Weekly volume targets</div>' + buildVolumeTable() + '</div>'
      + '</div>';

    attachCommonGymHeaderEvents();
  restoreScroll();
    var nextBtn = document.getElementById('previewNextWorkoutBtn');
    if (nextBtn) {
      nextBtn.onclick = function () {
        var r = dayRecord(key);
        r.selectedDayNumber = nextWorkoutSched.dayNum;
        r.selectedWorkout = nextWorkoutSched.workoutIndex;
        saveDayRecord(key, r);
        renderGym();
      };
    }
    return;
  }

  // 2. CHECK IF TODAY'S WORKOUT IS COMPLETED
  var isTodaySelected = activeSched.dayNum === defaultScheduleDay;
  if (isTodaySelected && rec.workoutDone) {
    var nextWorkoutSched = weeklySched.find(function (s) { return !s.isRest && s.dayNum > activeSched.dayNum; }) || weeklySched.find(function (s) { return !s.isRest; }) || weeklySched[0];
    document.getElementById('content').innerHTML =
      '<div class="gym-page">'
      + dateBannerHTML
      + gymHeaderUnifiedHTML
      + '<div style="padding:16px 0 24px;border-bottom:1px solid #222">'
      + '<div style="font-size:28px;font-weight:600;color:#F5F5F4;margin-bottom:6px">Session Complete</div>'
      + '<div style="font-size:15px;color:#8A8A8E;margin-bottom:16px">' + esc(activeCleanName) + ' · ' + loggedTotal + ' sets logged</div>'
      + '<div style="font-size:15px;color:#8A8A8E;line-height:1.4;margin-bottom:20px">Logged and archived in History. View or edit sets in <strong>Progress → History</strong>.</div>'
      + '<div style="display:flex;align-items:center;gap:20px">'
      + '<button type="button" class="btn-text-action" id="openHistoryFromGymBtn" style="color:#F5F5F4;font-size:15px;font-weight:600;background:none;border:none;padding:0;cursor:pointer">View in History</button>'
      + '<button type="button" class="btn-text-action" id="trainNextDayEarlyBtn" style="color:#F5F5F4;font-size:15px;font-weight:600;background:none;border:none;padding:0;cursor:pointer">Next: ' + esc(nextWorkoutSched.name) + ' →</button>'
      + '</div>'
      + '<div style="margin-top:24px">'
      + '<button type="button" class="btn-text-action" id="reopenSessionBtn" style="color:#55555A;font-size:11px;background:none;border:none;padding:0;cursor:pointer">Accidentally finished? Reopen session</button>'
      + '</div>'
      + '</div>'
      + '</div>';

    attachCommonGymHeaderEvents();
  restoreScroll();
    var histBtn = document.getElementById('openHistoryFromGymBtn');
    if (histBtn) {
      histBtn.onclick = function () {
        setTab('progress');
        renderApp();
      };
    }
    var trainNextBtn = document.getElementById('trainNextDayEarlyBtn');
    if (trainNextBtn) {
      trainNextBtn.onclick = function () {
        var r = dayRecord(key);
        r.selectedDayNumber = nextWorkoutSched.dayNum;
        r.selectedWorkout = nextWorkoutSched.workoutIndex;
        saveDayRecord(key, r);
        renderGym();
      };
    }
    var reopenBtn = document.getElementById('reopenSessionBtn');
    if (reopenBtn) {
      reopenBtn.onclick = function () {
        var r = dayRecord(key);
        r.workoutDone = false;
        saveDayRecord(key, r);
        window.activeExpandedExId = 'all';
        renderGym();
        showToast('Session reopened for editing', 'ok');
      };
    }
    return;
  }

  // 3. ACTIVE / EDITABLE WORKOUT LOGGING
  var seenExIds = {};
  var uniqueExercises = (session.exercises || []).filter(function (ex) {
    if (!ex || !ex.id) return false;
    if (seenExIds[ex.id]) return false;
    seenExIds[ex.id] = true;
    return true;
  });

  // Accordion: determine currently expanded exercise ID
  var expandedExId = window.activeExpandedExId;
  var exists = uniqueExercises.some(function (e) { return e.id === expandedExId; });
  var firstIncomplete = uniqueExercises.find(function (e) {
    var actualId = (rec.swaps && rec.swaps[e.id]) || e.id;
    var loggedSets = ((rec.workout || {})[actualId] || []).filter(Boolean).length;
    var target = (rec.exercisePlannedSets && rec.exercisePlannedSets[actualId] != null) ? rec.exercisePlannedSets[actualId] : (e.sets || 2);
    return loggedSets < target;
  });
  var currentExId = firstIncomplete ? firstIncomplete.id : null;
  if (expandedExId !== 'all') {
    if (!expandedExId || !exists) {
      expandedExId = currentExId || (uniqueExercises[0] ? uniqueExercises[0].id : null);
      window.activeExpandedExId = expandedExId;
    }
  }

  var isAllExpanded = expandedExId === 'all';
  var totalExCount = uniqueExercises.length;

  var exHTML = uniqueExercises.map(function (exOrig, exIndex) {
    var exId = (rec.swaps && rec.swaps[exOrig.id]) ? rec.swaps[exOrig.id] : exOrig.id;
    var isCurrent = (exOrig.id === currentExId || exId === currentExId);
    var ex = Object.assign({}, getExerciseData(exId) || {}, exOrig);
    var isBW = isBodyweightExercise(ex.id, ex.name);
    var sets = (rec.workout || {})[ex.id] || [];
    var drafts = (rec.workoutDraft || {})[ex.id] || [];
    var lastSets = getLastSessionSets(ex.id, rec);
    var basePlanned = (exOrig && exOrig.sets != null) ? exOrig.sets : ((ex && ex.sets != null) ? ex.sets : 2);
    var plannedCount = (rec.exercisePlannedSets && rec.exercisePlannedSets[ex.id] != null) ? rec.exercisePlannedSets[ex.id] : basePlanned;
    var completedSets = sets.filter(Boolean);
    var manualExtra = 0;
    for (var dI = plannedCount; dI < drafts.length; dI++) {
      if (drafts[dI] && drafts[dI].manual) manualExtra = Math.max(manualExtra, dI + 1);
    }
    var visibleCount = Math.max(plannedCount, completedSets.length, manualExtra);
    var targetSets = plannedCount;
    var isExCompleted = completedSets.length >= targetSets && targetSets > 0;
    var isCurrentExpanded = isAllExpanded || (ex.id === expandedExId);

    // Item 4: Collapsed 56px row when not the active exercise
    if (!isCurrentExpanded) {
      return '<div class="gym-ex-collapsed-row' + (isCurrent ? ' is-current' : '') + '" data-expand-ex="' + ex.id + '" style="min-height:56px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #222;cursor:pointer;padding:8px 0;box-sizing:border-box">'
        + '<div style="display:flex;align-items:center;gap:12px;min-width:0;flex:1">'
        + '<span style="font-size:17px;font-weight:600;color:#8A8A8E;font-variant-numeric:tabular-nums;width:20px;text-align:right;flex-shrink:0">' + (exIndex + 1) + '</span>'
        + '<span style="font-size:17px;font-weight:600;color:#F5F5F4;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;line-height:1.25;word-break:break-word">' + esc(ex.name) + (ex.isCatchup || ex.source === 'catchup' ? ' <span style="font-size:11px;font-weight:600;color:#0B0B0C;background:#C6F432;border-radius:4px;padding:2px 6px;margin-left:6px;vertical-align:middle">Catch-up</span>' : '') + '</span>'
        + '</div>'
        + '<div style="flex-shrink:0;margin-left:12px">'
        + (isExCompleted
          ? '<span style="font-size:17px;font-weight:600;color:#C6F432">✓</span>'
          : '<span style="font-size:15px;color:#8A8A8E;font-variant-numeric:tabular-nums">' + completedSets.length + ' / ' + targetSets + '</span>')
        + '</div>'
        + '</div>';
    }

    // EXPANDED EXERCISE
    if (rec.skippedExercises && rec.skippedExercises[ex.id]) {
      return '<section class="gym-ex-skipped" style="display:flex;justify-content:space-between;align-items:center;padding:14px 16px;background:var(--surface);border:1px solid var(--hairline);border-radius:14px;margin-bottom:12px">'
        + '<span style="font-size:15px;color:var(--text-muted);text-decoration:line-through">' + esc(ex.name) + ' (Skipped today)</span>'
        + '<button type="button" class="btn-text-action unskip-ex-btn" data-unskip-exercise="' + ex.id + '" style="font-size:var(--fs-13);color:var(--lime);background:none;border:none;cursor:pointer;padding:0;font-weight:600">Undo</button>'
      + '</section>';
    }

    var plannedRows = Array.from({ length: visibleCount }, function (_, i) {
      var logged = sets[i], draft = drafts[i], last = lastSets[i];
      var isCalf = /calf|calves/i.test(ex.id) || /calf|calves/i.test(ex.name);

      var valueW = logged ? logged.weight : (draft ? draft.weight : (last ? last.weight : ''));
      var valueR = logged ? logged.reps : (draft ? draft.reps : (last ? last.reps : ''));
      var valueRir = logged ? logged.rir : (draft ? draft.rir : (last ? last.rir : null));

      var usePrefill = !logged && !draft && !!last;
      if (isCalf && usePrefill && (Number(valueW) === 30 || !valueW)) {
        usePrefill = false; valueW = ''; valueR = '';
      }

      var inputW = '';
      if (logged) {
        inputW = (isBW && (!logged.weight || Number(logged.weight) === 0)) ? 'BW' : logged.weight;
      } else if (draft && draft.weight !== '' && draft.weight != null) {
        inputW = (isBW && Number(draft.weight) === 0) ? 'BW' : draft.weight;
      }

      var inputR = '';
      if (logged) {
        inputR = logged.reps;
      } else if (draft && draft.reps !== '' && draft.reps != null) {
        inputR = draft.reps;
      }

      var prefillW = (last && last.weight != null) ? (isBW ? 'BW' : String(last.weight)) : (usePrefill ? (valueW != null ? String(valueW) : '') : '');
      var prefillR = (last && last.reps != null) ? String(last.reps) : (usePrefill ? (valueR != null ? String(valueR) : '') : '');
      var hasValues = logged || (isBW ? (Number(inputR) > 0 || Number(prefillR) > 0) : ((Number(inputW) > 0 || Number(prefillW) > 0) && (Number(inputR) > 0 || Number(prefillR) > 0)));

      var placeholderW = isBW ? 'BW' : (last && last.weight ? (last.weight + ' kg') : 'kg');
      var displayPlaceholderW = placeholderW.replace(/\s*kg$/i, '') || '–';
      var placeholderR = (last && last.reps != null ? String(last.reps) : 'reps');
      var displayPlaceholderR = (placeholderR === 'reps') ? '–' : placeholderR;
      var rirDisplay = (valueRir === 0 || valueRir === '0') ? 'F' : ((valueRir != null && valueRir !== '') ? (Number(valueRir) >= 4 ? '+' : String(valueRir)) : '1');

      var tagHTML = '';
      if (i >= plannedCount) {
        tagHTML = '<div style="display:flex;justify-content:space-between;align-items:center;padding-left:24px;margin-top:-2px;margin-bottom:6px"><span style="font-size:11px;color:var(--text-secondary)">extra</span><button type="button" class="btn-text-action" data-remove-extra-set="' + ex.id + '" data-set-index="' + i + '" style="font-size:11px;color:var(--text-muted);background:none;border:none;padding:0;cursor:pointer">Remove</button></div>';
      } else if (ex.setTags && ex.setTags[i]) {
        tagHTML = '<div style="font-size:11px;color:var(--text-secondary);padding-left:24px;margin-top:-2px;margin-bottom:6px">' + esc(ex.setTags[i]) + '</div>';
      }

      var rowInner = '<span class="set-row-num" data-ex-id="' + ex.id + '" data-set-index="' + i + '" data-is-logged="' + (logged ? '1' : '0') + '" title="Long-press for options" style="font-size:17px;font-weight:600;color:var(--text-secondary);font-variant-numeric:tabular-nums;width:24px;text-align:center;cursor:pointer">' + (i + 1) + '</span>'
        + '<input type="text" id="set_weight_' + ex.id + '_' + i + '" placeholder="' + displayPlaceholderW + '" class="precision-input set-weight ' + (usePrefill ? 'prefill ' : '') + '" data-prefill="' + prefillW + '" data-ex="' + ex.id + '" data-set-index="' + i + '" data-is-bw="' + (isBW ? '1' : '0') + '" value="' + inputW + '" inputmode="decimal" enterkeyhint="next">'
        + '<input type="text" id="set_reps_' + ex.id + '_' + i + '" placeholder="' + displayPlaceholderR + '" class="precision-input set-reps ' + (usePrefill ? 'prefill ' : '') + '" data-prefill="' + prefillR + '" data-ex="' + ex.id + '" data-set-index="' + i + '" value="' + inputR + '" inputmode="numeric" enterkeyhint="next">'
        + '<button type="button" class="rir-cycle-text" data-cycle-rir="' + ex.id + '" data-set-index="' + i + '" style="min-width:48px;height:48px;background:none;border:none;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;padding:0"><span class="hist-rir-badge" style="display:inline-flex;align-items:center;justify-content:center;padding:2px 6px;min-width:18px;border-radius:4px;background:var(--surface-raised);font-size:11px;font-weight:600;color:' + (rirDisplay === 'F' ? 'var(--lime)' : 'var(--text-secondary)') + '">' + rirDisplay + '</span></button>'
        + '<select class="set-rir" data-ex="' + ex.id + '" data-set-index="' + i + '" style="display:none"><option value="3" ' + (valueRir === 3 ? 'selected' : '') + '>3+</option><option value="2" ' + (valueRir === 2 ? 'selected' : '') + '>RIR 2</option><option value="1" ' + (valueRir === 1 || valueRir == null ? 'selected' : '') + '>RIR 1</option><option value="0" ' + (valueRir === 0 ? 'selected' : '') + '>F</option></select>'
        + '<button type="button" class="precision-circle-tap ' + (logged ? 'done' : 'btn-log') + '" ' + (logged ? ('data-quick-edit-logged="' + ex.id + '"') : ('data-logset="' + ex.id + '"')) + ' data-set-index="' + i + '" data-ex-name="' + esc(ex.name) + '" data-weight="' + (logged ? (logged.weight || 0) : '') + '" data-reps="' + (logged ? logged.reps : '') + '" data-rir="' + (logged && logged.rir != null ? logged.rir : '') + '" ' + (!logged && !hasValues ? 'disabled' : '') + ' aria-label="' + (logged ? 'Edit logged set' : 'Log set') + '">'
          + '<span class="precision-circle ' + (logged ? 'done' : '') + '">' + (logged ? '<svg class="check-svg" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5"><path class="check-path" d="M5 13l4 4L19 7"/></svg>' : '') + '</span>'
        + '</button>';
      return renderSetRowWrap(rowInner, ex.id, i, !!logged) + tagHTML;
    }).join('');

    var repsStr = ex.reps || exOrig.reps || '8-12';
    var targetDisplay = targetSets + ' × ' + esc(repsStr) + (ex.rir ? ' · ' + esc(ex.rir) + ' RIR' : '') + (isBW ? ' · Bodyweight' : '');
    var lastSetsStr = lastSets.length ? lastSets.map(function (s) {
      var wDisp = isBW ? ((!s.weight || Number(s.weight) === 0) ? 'BW' : 'BW+' + s.weight) : s.weight;
      return wDisp + '×' + s.reps;
    }).join(', ') : '';

    var metaLine = targetDisplay + (lastSetsStr ? ' · Last time: ' + lastSetsStr : '');
    var swapIconSVG = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4"/></svg>';
    var swapBtn = '<button type="button" class="swap-btn" data-swap-orig="' + exOrig.id + '" data-swap-curr="' + ex.id + '" data-muscle="' + (ex.muscle || '') + '" title="Reorder / swap exercise" style="background:none;border:none;padding:0;width:48px;height:48px;min-width:48px;min-height:48px;cursor:pointer;color:var(--text-secondary);display:inline-flex;align-items:center;justify-content:center" aria-label="Reorder exercise">' + swapIconSVG + '</button>';
    var exMenuBtn = '<button type="button" class="btn-ghost" data-ex-menu="' + ex.id + '" data-ex-name="' + esc(ex.name) + '" style="background:none;border:none;padding:0;width:48px;height:48px;min-width:48px;min-height:48px;cursor:pointer;color:var(--text-secondary);display:inline-flex;align-items:center;justify-content:center;font-size:17px;line-height:1" aria-label="Exercise options">···</button>';

    var curLoggedSets = ((rec.workout || {})[ex.id] || []).filter(Boolean);
    var bestWeight = lastSets.reduce(function (m, s) { return Math.max(m, Number(s.weight) || 0); }, 0);
    var bestReps = lastSets.reduce(function (m, s) { return Math.max(m, Number(s.reps) || 0); }, 0);
    var prStr = '';
    if (lastSets.length > 0 && curLoggedSets.length > 0) {
      if (isBW) {
        var curTopR = curLoggedSets.reduce(function (m, s) { return Math.max(m, Number(s.reps) || 0); }, 0);
        if (curTopR > bestReps && bestReps > 0) prStr = '<span style="font-size:11px;color:var(--lime);font-weight:600">' + curTopR + ' reps PR</span>';
      } else {
        var curTopW = curLoggedSets.reduce(function (m, s) { return Math.max(m, Number(s.weight) || 0); }, 0);
        if (curTopW > bestWeight && bestWeight > 0) prStr = '<span style="font-size:11px;color:var(--lime);font-weight:600">' + curTopW + ' kg PR</span>';
      }
    }

    var catchupBadge = (!session.isFullBody && (ex.isCatchup || ex.source === 'catchup'))
      ? '<span style="display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:600;color:var(--lime);margin-left:8px;vertical-align:middle"><span style="width:6px;height:6px;border-radius:50%;background:var(--lime);display:inline-block"></span>Catch-up</span>'
      : '';

    var colHeaders = '<div class="set-col-headers" style="display:flex;align-items:center;gap:var(--spacing-8);padding:0 0 6px;font-size:11px;font-weight:600;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.08em">'
      + '<span style="width:24px;text-align:center">Set</span>'
      + '<span style="flex:1;text-align:center">Kg</span>'
      + '<span style="flex:1;text-align:center">Reps</span>'
      + '<span style="min-width:48px;text-align:center">Rir</span>'
      + '<span style="width:var(--tap-min)"></span>'
      + '</div>';

    return '<section class="gym-ex-section-expanded' + (isCurrent ? ' is-current' : '') + '" id="exsec-' + ex.id + '" style="padding:16px 0 12px;border-bottom:1px solid var(--hairline)">'
      + '<div style="margin-bottom:16px">'
      + '<div style="font-size:11px;font-weight:600;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px">' + (exIndex + 1) + ' / ' + totalExCount + '</div>'
      + '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">'
      + '<div style="font-size:28px;line-height:1.15;font-weight:600;color:var(--text);flex:1;min-width:0;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;word-break:break-word">' + esc(ex.name) + catchupBadge + '</div>'
      + '<div style="display:flex;align-items:center;flex-shrink:0">' + swapBtn + exMenuBtn + '</div>'
      + '</div>'
      + '<div style="font-size:15px;color:var(--text-secondary);margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="' + esc(metaLine) + '">' + esc(metaLine) + '</div>'
      + (prStr ? ('<div style="margin-top:4px">' + prStr + '</div>') : '')
      + '</div>'
      + colHeaders
      + plannedRows
      + '<div style="display:flex;justify-content:space-between;align-items:center;padding:12px 0 4px">'
      + '<div style="display:flex;align-items:center;gap:16px">'
      + '<button type="button" class="btn-text-action" data-add-set="' + ex.id + '" style="color:var(--text);font-size:15px;font-weight:600;background:none;border:none;padding:0;cursor:pointer">+ Add set</button>'
      + '<button type="button" class="btn-text-action" data-reduce-set="' + ex.id + '" style="color:var(--text-secondary);font-size:15px;background:none;border:none;padding:0;cursor:pointer">− Remove set</button>'
      + '</div>'
      + '</div>'
      + '<div class="ex-cues-row" style="margin-top:2px">'
      + '<button type="button" class="btn-text-action cue-toggle" data-cue-ex="' + ex.id + '" style="color:var(--text-secondary);font-size:15px;background:none;border:none;padding:0;min-height:48px;cursor:pointer;display:inline-flex;align-items:center;gap:4px"><span>Cues</span><span style="font-size:11px">▾</span></button>'
      + '<input type="text" class="precision-input ex-note-input" data-ex="' + ex.id + '" placeholder="Technique cue..." value="' + esc((profile && profile.exerciseNotes && profile.exerciseNotes[ex.id]) || '') + '" style="display:none;width:100%;margin-top:4px;margin-bottom:8px;text-align:left;padding:0 12px;font-size:15px">'
      + '</div>'
      + '</section>';
  }).join('');

  var finishCardHTML = (loggedTotal >= totalPlanned && totalPlanned > 0 && !rec.workoutDone)
    ? ('<div style="margin:20px 0 16px"><button type="button" class="btn" id="finishAllSetsBtn" style="width:100%;height:48px;background:#1C1C1F;color:#F5F5F4;font-size:15px;font-weight:600;border:none;border-radius:12px;cursor:pointer">Finish workout (' + loggedTotal + '/' + totalPlanned + ' sets completed)</button></div>')
    : '';

  var expandToggleHTML = (!activeSched.isRest && totalExCount > 1)
    ? ('<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;padding-bottom:6px;border-bottom:1px solid #1C1C1F">'
      + '<span style="font-size:11px;font-weight:600;color:#8A8A8E;text-transform:uppercase;letter-spacing:0.08em">' + totalExCount + ' exercises</span>'
      + '<button type="button" id="toggleExpandAllBtn" style="background:none;border:none;padding:0;font-size:11px;font-weight:600;color:' + (isAllExpanded ? '#8A8A8E' : '#C6F432') + ';cursor:pointer;text-transform:uppercase;letter-spacing:0.06em">' + (isAllExpanded ? 'Collapse' : 'Expand all') + '</button>'
      + '</div>')
    : '';

  document.getElementById('content').innerHTML =
    '<div class="gym-page" style="padding-bottom:120px">'
    + dateBannerHTML
    + gymHeaderUnifiedHTML
    + sessionBarHTML
    + expandToggleHTML
    + exHTML
    + finishCardHTML
    + '</div><div id="restTimerWrap" style="pointer-events:none"></div>';

  attachGymEvents(key, rec, session, workoutIndex);
  renderWorkoutTimer(key, rec, session, workoutIndex);
  renderRestTimer();
  var finishAllSetsBtn = document.getElementById('finishAllSetsBtn');
  if (finishAllSetsBtn) {
    finishAllSetsBtn.onclick = function() {
      showFinishWorkoutSheet(key, workoutIndex, session);
    };
  }
  attachCommonGymHeaderEvents();
  restoreScroll();
}
