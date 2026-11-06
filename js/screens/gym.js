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
import { getWorkoutForDate, getWorkoutWeek, getCompletedWorkoutCount, getNextProgramWorkout, getActiveWorkoutSession, getSessionMeta, attachCommonGymHeaderEvents } from "./gym/helpers.js";
import { attachGymEvents } from "./gym/events.js";
import { renderSetRowWrap } from "./gym/swipe-delete.js";
export * from "./gym/helpers.js";
export * from "./gym/timer.js";
export * from "./gym/sets.js";
export * from "./gym/swap.js";
export * from "./gym/session-sheet.js";
export * from "./gym/plan-editor.js";
export * from "./gym/events.js";

export function renderGym() {
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
  var dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  var monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  var headerDateStr = dayNames[activeDate.getDay()] + ' ' + activeDate.getDate() + ' ' + monthNames[activeDate.getMonth()];
  var formattedSessionDate = activeDate.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });

  // Determine active schedule day (1..7) and derived current workout
  var defaultScheduleDay = currentD === 0 ? 7 : currentD;
  var weeklySched = getWeeklySchedule();
  var curWorkout = getCurrentWorkout(key);
  var activeSched = {
    isRest: curWorkout.isRest,
    workoutIndex: curWorkout.workoutIndex,
    label: curWorkout.isRest ? 'Rest Day' : (curWorkout.session ? curWorkout.session.label : 'Workout'),
    dayNum: rec.selectedDayNumber != null ? rec.selectedDayNumber : defaultScheduleDay
  };

  // Clean workout name for the selected day
  var activeCleanName = curWorkout.isRest
    ? 'Scheduled Rest Day'
    : (curWorkout.cleanName || 'Workout');

  var workoutIndex = curWorkout.workoutIndex;
  var session = curWorkout.session || (prog && prog[0]) || { label: 'Workout', exercises: [] };
  var totalPlanned = sessionSetCount(session);
  var loggedTotal = (session.exercises || []).reduce(function (total, ex) {
    var actualId = (rec.swaps && rec.swaps[ex.id]) || ex.id;
    return total + ((rec.workout || {})[actualId] || []).filter(Boolean).length;
  }, 0);

  // Precision Gym Header (Item 5: 11px label "WED 4 NOV · WEEK 1", 28px title, "3 / 12 sets" right in text2, session timer below)
  var gymHeaderUnifiedHTML =
    '<div class="gym-header-unified" style="margin-bottom:24px">'
    + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">'
    + '<button type="button" id="gymDateSelectBtn" style="background:none;border:none;padding:0;font-size:11px;font-weight:600;color:#8A8A8E;text-transform:uppercase;letter-spacing:0.08em;cursor:pointer;text-align:left">'
    + headerDateStr + ' · WEEK ' + workoutWeek
    + '</button>'
    + '<button type="button" id="manageSplitTopBtn" style="background:none;border:none;padding:0;font-size:11px;font-weight:600;color:#8A8A8E;text-transform:uppercase;letter-spacing:0.08em;cursor:pointer">Plan</button>'
    + '</div>'
    + '<div style="display:flex;justify-content:space-between;align-items:baseline;gap:12px;margin-bottom:6px">'
    + '<div style="font-size:28px;line-height:1.15;font-weight:600;color:#F5F5F4;flex:1;word-break:break-word">' + esc(activeCleanName) + '</div>'
    + (!activeSched.isRest ? ('<span style="font-size:15px;color:#8A8A8E;font-variant-numeric:tabular-nums;flex-shrink:0" id="gymSetProgress">' + loggedTotal + ' / ' + totalPlanned + ' sets</span>') : '')
    + '</div>'
    + (!activeSched.isRest ? '<div class="session-timer-dock" id="sessionTimer" style="display:flex;align-items:center;justify-content:space-between;padding-top:2px"></div>' : '')
    + '</div>';

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
  if (!expandedExId || !exists) {
    // Find first exercise that has remaining unlogged sets
    var firstIncomplete = uniqueExercises.find(function (e) {
      var actualId = (rec.swaps && rec.swaps[e.id]) || e.id;
      var loggedSets = ((rec.workout || {})[actualId] || []).filter(Boolean).length;
      return loggedSets < (e.sets || 2);
    });
    expandedExId = firstIncomplete ? firstIncomplete.id : (uniqueExercises[0] ? uniqueExercises[0].id : null);
    window.activeExpandedExId = expandedExId;
  }

  var totalExCount = uniqueExercises.length;

  var exHTML = uniqueExercises.map(function (exOrig, exIndex) {
    var exId = (rec.swaps && rec.swaps[exOrig.id]) ? rec.swaps[exOrig.id] : exOrig.id;
    var ex = Object.assign({}, getExerciseData(exId) || {}, exOrig);
    var isBW = isBodyweightExercise(ex.id, ex.name);
    var sets = (rec.workout || {})[ex.id] || [];
    var drafts = (rec.workoutDraft || {})[ex.id] || [];
    var lastSets = getLastSessionSets(ex.id, rec);
    var plannedCount = (exOrig && exOrig.sets != null) ? exOrig.sets : ((ex && ex.sets != null) ? ex.sets : 2);
    var completedSets = sets.filter(Boolean);
    var manualExtra = 0;
    for (var dI = plannedCount; dI < drafts.length; dI++) {
      if (drafts[dI] && drafts[dI].manual) manualExtra = Math.max(manualExtra, dI + 1);
    }
    var visibleCount = Math.max(plannedCount, completedSets.length, manualExtra);
    var targetSets = plannedCount;
    var isExCompleted = completedSets.length >= targetSets && targetSets > 0;
    var isCurrentExpanded = ex.id === expandedExId;

    // Item 4: Collapsed 56px row when not the active exercise
    if (!isCurrentExpanded) {
      return '<div class="gym-ex-collapsed-row" data-expand-ex="' + ex.id + '" style="min-height:56px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #222;cursor:pointer;padding:8px 0;box-sizing:border-box">'
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
    var plannedRows = Array.from({ length: visibleCount }, function (_, i) {
      var logged = sets[i], draft = drafts[i], last = lastSets[i];
      var isCalf = /calf|calves/i.test(ex.id) || /calf|calves/i.test(ex.name);

      var valueW = logged ? logged.weight : (draft ? draft.weight : (last ? last.weight : ''));
      var valueR = logged ? logged.reps : (draft ? draft.reps : (last ? last.reps : ''));
      var valueRir = logged ? logged.rir : (draft ? draft.rir : (last ? last.rir : null));

      var usePrefill = !logged && !draft && !!last;
      // Item 2: For calves, remove prefilled ~30kg from home logs, first set uses blank inputs with placeholder "kg"
      if (isCalf && usePrefill && (Number(valueW) === 30 || !valueW)) {
        usePrefill = false;
        valueW = '';
        valueR = '';
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

      // Item 2: Greyed last-time values as placeholder for each set (e.g. 35 kg x 10)
      var placeholderW = isBW ? 'BW' : (last && last.weight ? (last.weight + ' kg') : 'kg');
      var placeholderR = (last && last.reps != null ? String(last.reps) : 'reps');

      // Item 6: Tap-to-cycle RIR text: 3+ > 2 > 1 > F
      var rirDisplay = 'RIR 1';
      if (valueRir === 0) rirDisplay = 'F';
      else if (valueRir === 1) rirDisplay = 'RIR 1';
      else if (valueRir === 2) rirDisplay = 'RIR 2';
      else if (valueRir === 3) rirDisplay = '3+';

      // Item 1: Set tag field (set 2 has tag "rest-pause (15+5+5, 0 RIR)", extra sets have "extra")
      var tagHTML = '';
      if (i >= plannedCount) {
        tagHTML = '<div style="display:flex;justify-content:space-between;align-items:center;padding-left:24px;margin-top:-2px;margin-bottom:6px"><span style="font-size:11px;color:#8A8A8E">extra</span><button type="button" class="btn-text-action" data-remove-extra-set="' + ex.id + '" data-set-index="' + i + '" style="font-size:11px;color:#55555A;background:none;border:none;padding:0;cursor:pointer">Remove</button></div>';
      } else if (ex.setTags && ex.setTags[i]) {
        tagHTML = '<div style="font-size:11px;color:#8A8A8E;padding-left:24px;margin-top:-2px;margin-bottom:6px">' + esc(ex.setTags[i]) + '</div>';
      }

      var rowInner = '<span style="font-size:17px;font-weight:600;color:#8A8A8E;font-variant-numeric:tabular-nums;width:16px;text-align:right">' + (i + 1) + '</span>'
        + '<input type="text" id="set_weight_' + ex.id + '_' + i + '" placeholder="' + placeholderW + '" class="precision-input set-weight ' + (usePrefill ? 'prefill ' : '') + '" data-prefill="' + prefillW + '" data-ex="' + ex.id + '" data-set-index="' + i + '" data-is-bw="' + (isBW ? '1' : '0') + '" value="' + inputW + '" inputmode="decimal" enterkeyhint="next" ' + (logged ? 'disabled' : '') + '>'
        + '<input type="text" id="set_reps_' + ex.id + '_' + i + '" placeholder="' + placeholderR + '" class="precision-input set-reps ' + (usePrefill ? 'prefill ' : '') + '" data-prefill="' + prefillR + '" data-ex="' + ex.id + '" data-set-index="' + i + '" value="' + inputR + '" inputmode="numeric" enterkeyhint="next" ' + (logged ? 'disabled' : '') + '>'
        + '<button type="button" class="rir-cycle-text" data-cycle-rir="' + ex.id + '" data-set-index="' + i + '" ' + (logged ? 'disabled' : '') + '>' + rirDisplay + '</button>'
        + '<select class="set-rir" data-ex="' + ex.id + '" data-set-index="' + i + '" style="display:none">'
        + '<option value="3" ' + (valueRir === 3 ? 'selected' : '') + '>3+</option>'
        + '<option value="2" ' + (valueRir === 2 ? 'selected' : '') + '>RIR 2</option>'
        + '<option value="1" ' + (valueRir === 1 || valueRir == null ? 'selected' : '') + '>RIR 1</option>'
        + '<option value="0" ' + (valueRir === 0 ? 'selected' : '') + '>F</option>'
        + '</select>'
        + '<button type="button" class="precision-circle-tap ' + (logged ? 'done' : 'btn-log') + '" ' + (logged ? ('data-quick-edit-logged="' + ex.id + '"') : ('data-logset="' + ex.id + '"')) + ' data-set-index="' + i + '" data-ex-name="' + esc(ex.name) + '" data-weight="' + (logged ? (logged.weight || 0) : '') + '" data-reps="' + (logged ? logged.reps : '') + '" data-rir="' + (logged && logged.rir != null ? logged.rir : '') + '" ' + (!logged && !hasValues ? 'disabled' : '') + ' aria-label="' + (logged ? 'Edit logged set' : 'Log set') + '">'
          + '<span class="precision-circle ' + (logged ? 'done' : '') + '">' + (logged ? '✓' : '') + '</span>'
        + '</button>';
      return renderSetRowWrap(rowInner, ex.id, i, !!logged) + tagHTML;
    }).join('');

    var repsStr = ex.reps || exOrig.reps || '8-12';
    var targetDisplay = targetSets + ' × ' + esc(repsStr) + (ex.rir ? ' · ' + esc(ex.rir) + ' RIR' : '') + (isBW ? ' · Bodyweight' : '');
    var lastSetsStr = lastSets.length ? lastSets.map(function (s) {
      var wDisp = isBW ? ((!s.weight || Number(s.weight) === 0) ? 'BW' : 'BW+' + s.weight) : s.weight;
      return wDisp + '×' + s.reps;
    }).join(', ') : '';

    var metaLine = targetDisplay + (lastSetsStr ? ' · Last ' + lastSetsStr : '');
    // Item 7: "Alt" becomes a small swap SVG icon beside the name
    var swapIconSVG = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4"/></svg>';
    var swapBtn = '<button type="button" class="swap-btn" data-swap-orig="' + exOrig.id + '" data-swap-curr="' + ex.id + '" data-muscle="' + (ex.muscle || '') + '" title="Swap exercise" style="background:none;border:none;padding:4px;cursor:pointer;color:#8A8A8E;display:inline-flex;align-items:center;justify-content:center">' + swapIconSVG + '</button>';

    var curLoggedSets = ((rec.workout || {})[ex.id] || []).filter(Boolean);
    var bestWeight = lastSets.reduce(function (m, s) { return Math.max(m, Number(s.weight) || 0); }, 0);
    var bestReps = lastSets.reduce(function (m, s) { return Math.max(m, Number(s.reps) || 0); }, 0);
    var prStr = '';
    if (lastSets.length > 0 && curLoggedSets.length > 0) {
      if (isBW) {
        var curTopR = curLoggedSets.reduce(function (m, s) { return Math.max(m, Number(s.reps) || 0); }, 0);
        if (curTopR > bestReps && bestReps > 0) {
          prStr = '<span style="font-size:11px;color:#C6F432;font-weight:600">' + curTopR + ' reps PR</span>';
        }
      } else {
        var curTopW = curLoggedSets.reduce(function (m, s) { return Math.max(m, Number(s.weight) || 0); }, 0);
        if (curTopW > bestWeight && bestWeight > 0) {
          prStr = '<span style="font-size:11px;color:#C6F432;font-weight:600">' + curTopW + ' kg PR</span>';
        }
      }
    }

    // Item 3: "1 / 7" as an 11px text2 label above the name
    return '<section class="gym-ex-section-expanded" id="exsec-' + ex.id + '" style="padding:16px 0 20px;border-bottom:1px solid #222">'
      + '<div style="margin-bottom:16px">'
      + '<div style="font-size:11px;font-weight:600;color:#8A8A8E;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px">' + (exIndex + 1) + ' / ' + totalExCount + '</div>'
      + '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">'
      + '<div style="font-size:28px;line-height:1.15;font-weight:600;color:#F5F5F4;flex:1;word-break:break-word">' + esc(ex.name) + (ex.isCatchup || ex.source === 'catchup' ? ' <span style="display:inline-block;font-size:11px;font-weight:600;color:#0B0B0C;background:#C6F432;border-radius:4px;padding:2px 6px;margin-left:8px;vertical-align:middle">Catch-up</span>' : '') + '</div>'
      + '<div style="flex-shrink:0">' + swapBtn + '</div>'
      + '</div>'
      + '<div style="font-size:15px;color:#8A8A8E;margin-top:4px">' + esc(metaLine) + '</div>'
      + (prStr ? ('<div style="margin-top:4px">' + prStr + '</div>') : '')
      + '</div>'
      + plannedRows
      + '<div style="display:flex;justify-content:space-between;align-items:center;padding:12px 0 4px">'
      + '<button type="button" class="btn-text-action" data-add-set="' + ex.id + '" style="color:#F5F5F4;font-size:15px;font-weight:600;background:none;border:none;padding:0;cursor:pointer">+ Add set</button>'
      + '</div>'
      + '<div class="ex-cues-row" style="margin-top:8px;border-top:1px solid #1C1C1F;padding-top:8px">'
      + '<button type="button" class="btn-text-action cue-toggle" data-cue-ex="' + ex.id + '" style="color:#8A8A8E;font-size:15px;background:none;border:none;padding:4px 0;cursor:pointer;display:flex;align-items:center;gap:4px"><span>Cues</span><span style="font-size:11px">▾</span></button>'
      + '<input type="text" class="precision-input ex-note-input" data-ex="' + ex.id + '" placeholder="Technique cue..." value="' + esc((profile && profile.exerciseNotes && profile.exerciseNotes[ex.id]) || '') + '" style="display:none;width:100%;margin-top:8px;text-align:left;padding:0 12px;font-size:15px">'
      + '</div>'
      + '</section>';
  }).join('');

  var finishCardHTML = (loggedTotal >= totalPlanned && totalPlanned > 0 && !rec.workoutDone)
    ? ('<div style="margin:20px 0 16px"><button type="button" class="btn" id="finishAllSetsBtn" style="width:100%;height:48px;background:#1C1C1F;color:#F5F5F4;font-size:15px;font-weight:600;border:none;border-radius:12px;cursor:pointer">Finish workout (' + loggedTotal + '/' + totalPlanned + ' sets completed)</button></div>')
    : '';

  document.getElementById('content').innerHTML =
    '<div class="gym-page">'
    + dateBannerHTML
    + gymHeaderUnifiedHTML
    + exHTML
    + finishCardHTML
    + '</div><div id="restTimerWrap"></div>';

  attachGymEvents(key, rec, session, workoutIndex);
  renderWorkoutTimer(key, rec, session, workoutIndex);
  var finishAllSetsBtn = document.getElementById('finishAllSetsBtn');
  if (finishAllSetsBtn) {
    finishAllSetsBtn.onclick = function() {
      showFinishWorkoutSheet(key, workoutIndex, session);
    };
  }
  attachCommonGymHeaderEvents();
}

export function buildVolumeTable() {
  var vData = getWeeklyVolume();
  return '<div style="display:flex;flex-direction:column;gap:8px">'
    + vData.map(function(v) {
      var pct = Math.min(100, Math.round((v.sets / 20) * 100));
      var inRange = v.sets >= 10 && v.sets <= 20;
      return '<div style="padding:10px 0;border-bottom:1px solid #1C1C1F">'
        + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">'
          + '<span style="font-size:15px;font-weight:600;color:#F5F5F4">' + esc(v.muscle) + '</span>'
          + '<span class="tabnum" style="font-size:11px;color:' + (inRange ? '#F5F5F4' : '#8A8A8E') + '">' + v.sets + ' / 10–20 sets</span>'
        + '</div>'
        + '<div class="prog-line"><div class="prog-line-fill' + (inRange ? ' lime' : '') + '" style="width:' + pct + '%"></div></div>'
        + '</div>';
    }).join('')
    + '</div>';
}
