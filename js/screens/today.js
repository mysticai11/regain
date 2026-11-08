/* Today screen: 4-Pillar Home dashboard summary, calorie ring overview, activity grid, and workout card */

import { profile, setTab } from "../state.js";
import { dayRecord, saveDayRecord, ls, sv, allDayKeys, exportData, getWorkoutSessions } from "../storage.js";
import { getActiveProgram, getWeeklySchedule, getWorkoutForDate, getNextProgramWorkout, getCurrentWorkout, CAL_TARGET_REST, CAL_TARGET_GYM, PROT_TARGET_REST, PROT_TARGET_GYM } from "../data/plan.js";
import { todayKey, dateKey, addDays, esc, currentWeight, formatDuration } from "../lib/format.js";
import { getTargetsForDate, getDayTotals, getWeeklyVolume, getLoggedWeeklyVolume, computeStreak, yesterdayMissed } from "../lib/calc.js";
import { playSound, triggerHaptic, ic, showFoodAddedChip } from "../lib/dom.js";
import { showToast, showUndoToast } from "../components/toast.js";
import { confirmDialog } from "../components/dialog.js";
import { buildGauge, statusPill, macroBar } from "../components/gauge.js";
import { openFoodSearch, openCustomFoodBuilder, openRecipeBuilder, openCustomFoodsManager, openMealEditor, openEditItemSheet } from "./today/food-modal.js";
import { addQuickFood, getStaplesShelfHTML, getMergedStaples, openPortionSheet, buildWeekDotRowHTML, openWorkoutOverrideSheet, buildCalRingHTML, buildWeightTrendChip, buildBackupNudgeHTML, bindBackupNudgeEvents, triggerTodayAnimations } from "./today/widgets.js";
import { buildCatchupCardHTML, bindCatchupCardEvents } from "./today/catchup-card.js?v=26";
import { buildCollapsibleFoodLogHTML, bindFoodLogCardEvents, openTodayFoodSheet } from "./today/food-log-card.js?v=26";
import { openSettings } from "./settings.js";
import { sessionSetCount } from "../lib/schedule.js";
import { fetchTodaySteps } from "../lib/steps.js";
import { calculateTotalBurn } from "../lib/energy.js";
import { buildActivityGridHTML, bindActivityGridEvents, buildActivityInsightHTML } from "./today/activity-grid.js";
import { bindTodayWeightEvents } from "./today/weight-handler.js";
import { addFoodToDay, migrateFoodTotals } from "./nutrition.js";

export * from "./today/food-modal.js";
export * from "./today/widgets.js";
export * from "./today/food-log-card.js";
export { addFoodToDay, migrateFoodTotals } from "./nutrition.js";

export function renderTodaySimple() {
  window.renderTodaySimple = renderTodaySimple;
  var key = todayKey();
  var activeDateKey = window.activeTodaySelectedDateKey || key;
  var rec = dayRecord(activeDateKey), targetRec = rec;
  var tot = getDayTotals(activeDateKey), targets = getTargetsForDate(activeDateKey);

  var activeDateObj = new Date(activeDateKey + 'T00:00:00');
  var curWorkout = getCurrentWorkout(activeDateKey);
  var session = curWorkout.session;
  var isRest = curWorkout.isRest;
  var hasOverride = curWorkout.hasOverride;

  var rawWorkoutName = curWorkout.cleanName;
  var cleanWorkoutName = rawWorkoutName;
  var lastSpace = cleanWorkoutName.lastIndexOf(' ');
  if (lastSpace > 0) cleanWorkoutName = cleanWorkoutName.substring(0, lastSpace) + '\u00A0' + cleanWorkoutName.substring(lastSpace + 1);

  var exercises = (session && session.exercises) ? session.exercises : [];
  var totalPlannedSets = sessionSetCount(session);
  var loggedSets = exercises.reduce(function (acc, ex) {
    var aid = (targetRec.swaps && targetRec.swaps[ex.id]) || ex.id;
    return acc + ((targetRec.workout || {})[aid] || []).filter(Boolean).length;
  }, 0);
  var isSessionDone = targetRec.workoutDone || (totalPlannedSets > 0 && loggedSets >= totalPlannedSets);

  var dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'], monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  var todayHeaderDateStr = dayNames[new Date().getDay()] + ' ' + new Date().getDate() + ' ' + monthNames[new Date().getMonth()];
  var workoutBlockDateLabel = (activeDateKey === key)
    ? (isRest ? 'REST DAY' : "TODAY'S WORKOUT")
    : (dayNames[activeDateObj.getDay()] + ' ' + activeDateObj.getDate() + ' ' + monthNames[activeDateObj.getMonth()] + (isRest ? ' · REST DAY' : ' · WORKOUT'));

  var wMeta = targetRec.workoutMeta || {};
  var workoutDurMins = wMeta.durationMinutes || (wMeta.duration_sec ? Math.round(wMeta.duration_sec / 60) : (targetRec.workoutDurationMins || 0));
  var userW = targetRec.weight || currentWeight();
  var userH = (profile && profile.heightCm) || 175;
  var userAge = (profile && profile.age) || 25;
  var userGender = (profile && profile.gender) || 'male';
  var currentSteps = targetRec.steps || 0;
  var totalBurn = calculateTotalBurn(userW, userH, userAge, userGender, currentSteps, workoutDurMins);

  if (typeof window !== 'undefined' && window._stepsFetchedDate !== activeDateKey && typeof fetchTodaySteps === 'function') {
    window._stepsFetchedDate = activeDateKey;
    fetchTodaySteps().then(function(nativeSteps) {
      if (nativeSteps != null && nativeSteps > (targetRec.steps || 0)) {
        targetRec.steps = nativeSteps;
        saveDayRecord(activeDateKey, targetRec, { silent: true });
        renderTodaySimple();
      }
    }).catch(function() {});
  }

  var dynamicCalTarget = targets.kcal + (totalBurn.stepBurn || 0) + (totalBurn.workoutBurn || 0);
  var calRingHTML = buildCalRingHTML(Math.round(tot.kcal || 0), dynamicCalTarget, Math.round(tot.protein || 0), targets.protein, Math.round(tot.carbs || 0), Math.round(tot.fat || 0), targets.carbs, targets.fat);
  var insightHTML = buildActivityInsightHTML(totalBurn.stepBurn, totalBurn.workoutBurn);

  var weeklyLoggedVolume = getLoggedWeeklyVolume();
  var weeklySetsTotal = weeklyLoggedVolume.reduce(function(acc, item) { return acc + (item.sets || 0); }, 0);
  var weightEntries = ((profile && profile.weightEntries) || []).slice(-7);
  var weightAvgVal = weightEntries.length > 0 ? +(weightEntries.reduce(function(acc, e) { return acc + (Number(e.weight) || 0); }, 0) / weightEntries.length).toFixed(1) : null;
  var activityGridHTML = buildActivityGridHTML({
    steps: currentSteps,
    totalBurn: totalBurn,
    currentWeightKg: targetRec.weight || currentWeight(),
    weightAvg: weightAvgVal,
    weeklySets: weeklySetsTotal,
    dateKey: activeDateKey
  });

  var weekDotHTML = buildWeekDotRowHTML(key, activeDateKey);
  var pastDateBanner = (activeDateKey !== key)
    ? ('<div style="display:flex;justify-content:space-between;align-items:center;background:var(--surface);border-radius:12px;padding:10px 14px;margin-bottom:14px;font-size:15px;color:var(--text)">'
        + '<span>Viewing: <b>' + activeDateObj.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) + '</b></span>'
        + '<button type="button" class="btn-text-action" id="returnTodayBtn" style="color:var(--lime);font-size:15px;font-weight:600;background:none;border:none;cursor:pointer;padding:0">Today</button>'
      + '</div>')
    : '';

  var contentEl = document.getElementById('content');
  var prevScroll = (typeof window !== 'undefined' && (window.scrollY || window.pageYOffset || (document.documentElement ? document.documentElement.scrollTop : 0) || (document.body ? document.body.scrollTop : 0))) || (contentEl ? contentEl.scrollTop : 0);
  var userInitial = (profile && profile.name && profile.name.trim()) ? profile.name.trim().charAt(0).toUpperCase() : '';
  var avatarInner = userInitial || ic('user', 18);

  contentEl.innerHTML =
    '<div style="margin-bottom:20px">'
      + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">'
        + '<div style="display:flex;align-items:center;gap:10px">'
          + '<img src="assets/logo.png" alt="Regain" style="width:28px;height:28px;object-fit:contain;border-radius:6px">'
          + '<span style="font-size:var(--fs-20, 20px);font-weight:800;color:var(--text);letter-spacing:-0.02em">Regain</span>'
        + '</div>'
        + '<button class="profile-avatar-btn" id="settingsBtn" aria-label="Profile and Settings" style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,rgba(139,92,246,0.3) 0%,rgba(56,189,248,0.2) 100%);border:1px solid rgba(255,255,255,0.12);color:var(--text);font-weight:700;font-size:15px;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:var(--card-shadow, 0 4px 12px rgba(0,0,0,0.3));flex-shrink:0">' + avatarInner + '</button>'
      + '</div>'
      + '<h1 style="font-size:32px;font-weight:800;color:var(--text);letter-spacing:-0.03em;margin:0;line-height:1.1">Today</h1>'
      + '<div style="font-size:11px;font-weight:600;letter-spacing:0.08em;color:var(--text-secondary);text-transform:uppercase;margin-top:4px">' + esc(todayHeaderDateStr) + '</div>'
    + '</div>'
    + pastDateBanner
    + buildBackupNudgeHTML()
    + buildCatchupCardHTML(key)
    + '<div id="calRingMount" style="cursor:pointer" title="View Nutrition">' + calRingHTML + '</div>'
    + insightHTML
    + activityGridHTML
    + weekDotHTML
    + (function() {
      var cardInner = '';
      if (!isRest && isSessionDone) {
        var wMeta = targetRec.workoutMeta || {};
        var durSec = wMeta.duration_sec != null ? Number(wMeta.duration_sec) : (wMeta.durationMinutes != null ? Number(wMeta.durationMinutes) * 60 : null);
        if (durSec == null) {
          var ms = getWorkoutSessions().find(function(s){ return s.dayKey === activeDateKey; });
          if (ms) durSec = ms.duration_sec != null ? Number(ms.duration_sec) : (ms.durationMinutes != null ? Number(ms.durationMinutes) * 60 : null);
        }
        var durMin = durSec ? Math.round(durSec / 60) : (wMeta.durationMinutes || 45);
        cardInner = '<div style="font-size:28px;font-weight:800;color:var(--text);letter-spacing:-0.5px;line-height:1.2;margin-bottom:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(cleanWorkoutName) + '</div>'
          + '<div style="display:flex;align-items:center;gap:8px;font-size:15px;color:var(--accent-primary);font-weight:600;margin-bottom:16px">'
            + '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>'
            + '<span>Completed · ' + durMin + ' min</span>'
          + '</div>'
          + '<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">'
            + '<button type="button" class="btn" id="trainAgainBtn" style="height:48px;min-height:48px;padding:0 20px;border-radius:12px;background:#1C1C1F;border:1px solid #222222;color:#F5F5F4;font-size:15px;font-weight:600;cursor:pointer;white-space:nowrap;display:inline-flex;align-items:center;justify-content:center">Train again</button>'
            + (hasOverride ? '<button type="button" class="btn-text-action" id="resetSuggestedWorkoutBtn" style="height:48px;min-height:48px;color:#8A8A8E;font-size:15px;background:none;border:none;padding:0 8px;cursor:pointer;white-space:nowrap;display:inline-flex;align-items:center">Reset to suggested</button>' : '')
          + '</div>';
      } else {
        var btnText = !isRest ? (loggedSets > 0 ? 'Keep logging' : 'Start Workout') : 'Choose workout';
        cardInner = '<div style="font-size:28px;font-weight:800;color:var(--text);letter-spacing:-0.5px;line-height:1.2;margin-bottom:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(cleanWorkoutName) + '</div>'
          + '<div style="font-size:15px;color:var(--text-secondary);margin-bottom:16px">'
            + (isRest ? 'Scheduled rest & active recovery day' : (loggedSets + ' of ' + totalPlannedSets + ' sets logged'))
          + '</div>'
          + '<button class="btn btn-primary btn-start" id="startWorkout" style="background:var(--accent-primary);color:#000;border-radius:12px;font-weight:700;width:100%;height:50px;font-size:17px;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;box-shadow:none">'
            + btnText
          + '</button><!-- background:#C6F432;color:#0B0B0C -->'
          + (hasOverride ? '<div style="margin-top:12px;text-align:center"><button type="button" class="btn-text-action" id="resetSuggestedWorkoutBtn" style="color:#8A8A8E;font-size:15px;background:none;border:none;padding:0;cursor:pointer">Reset to suggested</button></div>' : '');
      }
      return '<div class="today-workout-block metric-card" style="background:#141416;border-radius:20px;padding:20px;margin-bottom:24px;border:1px solid var(--hairline);box-sizing:border-box">'
        + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">'
          + '<span class="t-label" style="font-size:11px;font-weight:700;letter-spacing:0.08em;color:var(--text-secondary);text-transform:uppercase">' + esc(workoutBlockDateLabel) + '</span>'
          + '<button type="button" class="btn-text-action" id="changeWorkoutBtn" style="color:var(--text);font-size:15px;font-weight:600;background:none;border:none;padding:0;cursor:pointer">Change</button>'
        + '</div>' + cardInner + '</div>';
    })();

  var settingsBtn = document.getElementById('settingsBtn');
  if (settingsBtn) settingsBtn.onclick = function(e) { if (e && e.stopPropagation) e.stopPropagation(); openSettings(); };

  var calRingMount = document.getElementById('calRingMount');
  if (calRingMount) {
    calRingMount.onclick = function() {
      triggerHaptic();
      setTab('nutrition');
      var bNav = document.querySelectorAll('.navitem');
      bNav.forEach(function(b) {
        var isAct = b.dataset.tab === 'nutrition';
        b.classList.toggle('active', isAct);
        b.setAttribute('aria-selected', isAct ? 'true' : 'false');
      });
      window.renderApp();
    };
  }

  bindBackupNudgeEvents(exportData);
  bindCatchupCardEvents(contentEl, renderTodaySimple);
  bindActivityGridEvents(contentEl, {
    rec: targetRec,
    dateKey: activeDateKey,
    onUpdate: renderTodaySimple,
    onOpenWeightModal: function() { openTodayWeightModal(activeDateKey); }
  });

  triggerTodayAnimations();
  if (prevScroll > 0) {
    if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') window.scrollTo(0, prevScroll);
    if (contentEl) contentEl.scrollTop = prevScroll;
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(function() { if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') window.scrollTo(0, prevScroll); });
  }

  var prevWk = document.getElementById('prevWeekBtn'); if (prevWk) prevWk.onclick = function() { triggerHaptic(); window.todayWeekOffset = (window.todayWeekOffset || 0) - 1; renderTodaySimple(); };
  var nextWk = document.getElementById('nextWeekBtn'); if (nextWk) nextWk.onclick = function() { triggerHaptic(); window.todayWeekOffset = (window.todayWeekOffset || 0) + 1; renderTodaySimple(); };
  var retBtn = document.getElementById('returnTodayBtn'); if (retBtn) retBtn.onclick = function() { triggerHaptic(); window.activeTodaySelectedDateKey = null; window.todayWeekOffset = 0; renderTodaySimple(); };

  document.querySelectorAll('[data-pick-today-strip-date]').forEach(function (cell) {
    cell.onclick = function () {
      triggerHaptic();
      window.activeTodaySelectedDateKey = cell.dataset.pickTodayStripDate;
      renderTodaySimple();
    };
  });

  var changeWorkoutBtn = document.getElementById('changeWorkoutBtn');
  if (changeWorkoutBtn) {
    changeWorkoutBtn.onclick = function () {
      openWorkoutOverrideSheet(activeDateKey);
    };
  }

  var resetSuggestedWorkoutBtn = document.getElementById('resetSuggestedWorkoutBtn');
  if (resetSuggestedWorkoutBtn) {
    resetSuggestedWorkoutBtn.onclick = function () {
      var r = dayRecord(activeDateKey);
      delete r.selectedWorkout;
      saveDayRecord(activeDateKey, r);
      renderTodaySimple();
      showToast('Reset to suggested workout', 'ok');
    };
  }

  var trainAgainBtn = document.getElementById('trainAgainBtn');
  if (trainAgainBtn) {
    trainAgainBtn.onclick = function () {
      targetRec.workoutDone = false;
      saveDayRecord(activeDateKey, targetRec);
      renderTodaySimple();
      showToast('Session reopened', 'ok');
    };
  }

  var startWorkout = document.getElementById('startWorkout');
  if (startWorkout) {
    startWorkout.onclick = function () {
      if (isRest) {
        openWorkoutOverrideSheet(activeDateKey);
      } else {
        window.activeGymDateKey = activeDateKey;
        setTab('gym');
        var bNav = document.querySelectorAll('.navitem');
        bNav.forEach(function(b) {
          var isAct = b.dataset.tab === 'gym';
          b.classList.toggle('active', isAct);
          b.setAttribute('aria-selected', isAct ? 'true' : 'false');
        });
        window.renderApp();
      }
    };
  }
}

export function openTodayWeightModal(activeDateKey) {
  var dKey = activeDateKey || todayKey();
  var rec = dayRecord(dKey);
  var lastW = currentWeight(), bwPlaceholder = lastW ? lastW.toFixed(1) : '54.0', bwValue = rec.weight ? rec.weight : '';
  var saveLabel = bwValue ? 'Saved' : 'Save';
  var saveStyle = bwValue ? 'background:var(--surface2);color:var(--text-secondary);border:1px solid var(--hairline);cursor:default' : 'background:var(--accent-primary);color:var(--text);border:none;cursor:pointer;box-shadow:0 4px 16px var(--accent-glow)';

  var overlay = document.createElement('div');
  overlay.id = 'todayWeightModal';
  overlay.className = 'dialog-overlay';
  overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);z-index:9999;display:flex;align-items:flex-end;justify-content:center;opacity:0;transition:opacity 200ms ease;';

  var sheetHTML = '<div class="dialog-surface" style="background:var(--surface);border:1px solid var(--hairline);border-radius:24px 24px 0 0;padding:24px 20px calc(24px + var(--safe-b));width:100%;max-width:480px;box-sizing:border-box;box-shadow:0 -10px 40px rgba(0,0,0,0.6)">'
    + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">'
      + '<div>'
        + '<div style="font-size:28px;font-weight:700;color:var(--text);letter-spacing:-0.02em">Log Bodyweight</div>'
        + '<div style="font-size:11px;font-weight:600;letter-spacing:0.08em;color:var(--text-secondary);text-transform:uppercase;margin-top:2px">' + esc(dKey) + '</div>'
      + '</div>'
      + '<button type="button" class="icon-btn" id="closeWeightModalBtn" aria-label="Close" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;padding:6px;display:flex;align-items:center;justify-content:center">'
        + '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>'
      + '</button>'
    + '</div>'
    + '<div class="field">'
      + '<input type="number" id="todayWeight" step="0.1" inputmode="decimal" placeholder="' + bwPlaceholder + '" value="' + bwValue + '" style="font-size:48px">'
      + '<span class="field-unit">kg</span>'
      + '<button type="button" class="field-btn" id="saveTodayWeight" style="height:40px;min-height:40px;padding:0 16px;border-radius:9px;font-size:15px;font-weight:600;' + saveStyle + '">' + saveLabel + '</button>'
    + '</div>'
    + (bwValue ? '<div style="margin-top:16px;text-align:center"><button type="button" class="btn-text-action" id="deleteTodayWeightBtn" style="color:#FF4D4F;font-size:15px;background:none;border:none;padding:8px 16px;cursor:pointer">Clear Log (' + bwValue + ' kg)</button></div>' : '')
  + '</div>';

  overlay.innerHTML = sheetHTML;
  document.body.appendChild(overlay);
  requestAnimationFrame(function() { overlay.style.opacity = '1'; });

  var close = function() {
    overlay.style.opacity = '0';
    setTimeout(function() { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); }, 200);
  };

  var closeBtn = overlay.querySelector('#closeWeightModalBtn');
  if (closeBtn) closeBtn.onclick = close;
  overlay.onclick = function(e) { if (e.target === overlay) close(); };

  bindTodayWeightEvents(dKey, rec, function() {
    close();
    renderTodaySimple();
  });

  var input = overlay.querySelector('#todayWeight');
  if (input && typeof input.focus === 'function') setTimeout(function() { input.focus(); }, 80);
}

export function renderChecklistHTML() { return ''; }
