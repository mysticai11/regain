/* Today screen: main dashboard view, daily meal checklist, and bodyweight row */

import { profile, setTab } from "../state.js";
import { dayRecord, saveDayRecord, ls, sv, allDayKeys, exportData, getWorkoutSessions } from "../storage.js";
import { getActiveProgram, getWeeklySchedule, getWorkoutForDate, getNextProgramWorkout, getCurrentWorkout, CAL_TARGET_REST, CAL_TARGET_GYM, PROT_TARGET_REST, PROT_TARGET_GYM } from "../data/plan.js";
import { DEFAULT_MEAL_PLAN } from "../data/foods.js";
import { todayKey, dateKey, addDays, esc, currentWeight, formatDuration } from "../lib/format.js";
import { getTargetsForDate, getDayTotals, getWeeklyVolume, getLoggedWeeklyVolume, computeStreak, yesterdayMissed, foodMacros, addRecent } from "../lib/calc.js";
import { playSound, triggerHaptic, ic, showFoodAddedChip } from "../lib/dom.js";
import { showToast, showUndoToast } from "../components/toast.js";
import { confirmDialog } from "../components/dialog.js";
import { buildGauge, statusPill, macroBar } from "../components/gauge.js";
import { openFoodSearch, openCustomFoodBuilder, openRecipeBuilder, openCustomFoodsManager, openMealEditor, openEditItemSheet } from "./today/food-modal.js";
import { addQuickFood, getStaplesShelfHTML, getMergedStaples, openPortionSheet, buildWeekDotRowHTML, openWorkoutOverrideSheet, buildCalRingHTML, buildWeightTrendChip, buildBackupNudgeHTML, bindBackupNudgeEvents, triggerTodayAnimations } from "./today/widgets.js";
import { buildCatchupCardHTML, bindCatchupCardEvents } from "./today/catchup-card.js";
import { openSettings } from "./settings.js";
import { sessionSetCount } from "../lib/schedule.js";
import { setGestureCooldown, claimGestureOwner, releaseGestureOwner } from "../lib/gesture.js";
export * from "./today/food-modal.js"; export * from "./today/widgets.js";

export function renderTodaySimple() {
  window.renderTodaySimple = renderTodaySimple;
  var key = todayKey();
  var activeDateKey = window.activeTodaySelectedDateKey || key;
  var rec = dayRecord(activeDateKey), targetRec = rec;
  var tot = getDayTotals(activeDateKey), targets = getTargetsForDate(activeDateKey);
  var calorieDelta = targets.kcal - tot.kcal;
  var calPct = Math.min(100, Math.round((tot.kcal / targets.kcal) * 100));
  var proteinPct = Math.min(100, Math.round((tot.protein / targets.protein) * 100));

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

  var calRingHTML = buildCalRingHTML(Math.round(tot.kcal || 0), targets.kcal, Math.round(tot.protein || 0), targets.protein, Math.round(tot.carbs || 0), Math.round(tot.fat || 0));
  var weekDotHTML = buildWeekDotRowHTML(key, activeDateKey);
  var pastDateBanner = (activeDateKey !== key)
    ? ('<div style="display:flex;justify-content:space-between;align-items:center;background:#141416;border-radius:12px;padding:10px 14px;margin-bottom:14px;font-size:15px;color:#F5F5F4">'
        + '<span>Viewing: <b>' + activeDateObj.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) + '</b></span>'
        + '<button type="button" class="btn-text-action" id="returnTodayBtn" style="color:#C6F432;font-size:15px;font-weight:600;background:none;border:none;cursor:pointer;padding:0">Today</button>'
      + '</div>')
    : '';

  var contentEl = document.getElementById('content');
  var prevScroll = (typeof window !== 'undefined' && (window.scrollY || window.pageYOffset || (document.documentElement ? document.documentElement.scrollTop : 0) || (document.body ? document.body.scrollTop : 0))) || (contentEl ? contentEl.scrollTop : 0);
  contentEl.innerHTML =
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px">'
    + '<span class="t-label">' + todayHeaderDateStr + '</span>'
    + '<button class="icon-btn" id="settingsBtn" aria-label="Settings">' + ic('settings') + '</button>'
    + '</div>'
    + pastDateBanner
    + buildBackupNudgeHTML()
    + buildCatchupCardHTML(key)
    + calRingHTML
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
        var compSubline = 'Completed · ' + durMin + ' min · ' + loggedSets + (loggedSets === 1 ? ' set' : ' sets');
        cardInner = '<div style="font-size:17px;font-weight:600;color:#F5F5F4;line-height:1.2;margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(cleanWorkoutName) + '</div>'
          + '<div style="font-size:15px;color:#8A8A8E;font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:16px">' + esc(compSubline) + '</div>'
          + '<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">'
            + '<button type="button" class="btn" id="trainAgainBtn" style="height:48px;min-height:48px;padding:0 20px;border-radius:12px;background:#1C1C1F;border:1px solid #222222;color:#F5F5F4;font-size:15px;font-weight:600;cursor:pointer;white-space:nowrap;display:inline-flex;align-items:center;justify-content:center">Train again</button>'
            + (hasOverride ? '<button type="button" class="btn-text-action" id="resetSuggestedWorkoutBtn" style="height:48px;min-height:48px;color:#8A8A8E;font-size:15px;background:none;border:none;padding:0 8px;cursor:pointer;white-space:nowrap;display:inline-flex;align-items:center">Reset to suggested</button>' : '')
          + '</div>';
      } else {
        var btnText = !isRest ? (loggedSets > 0 ? 'Keep logging' : 'Start') : 'Choose';
        var btnStyle = !isRest ? 'background:#C6F432;color:#0B0B0C' : 'background:#1C1C1F;color:#F5F5F4';
        cardInner = '<div style="font-size:28px;font-weight:600;color:#F5F5F4;line-height:1.2;margin-bottom:4px">' + esc(cleanWorkoutName) + '</div>'
          + '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:12px">'
            + '<div style="font-size:15px;color:#8A8A8E;font-variant-numeric:tabular-nums">' + (isRest ? 'Recovery & Nutrition' : (loggedSets + ' / ' + totalPlannedSets + ' sets')) + '</div>'
            + '<button class="btn btn-primary btn-start" id="startWorkout" style="' + btnStyle + ';border:none;border-radius:12px;font-size:15px;font-weight:600;padding:10px 20px;cursor:pointer;box-shadow:none">' + btnText + '</button>'
          + '</div>'
          + (hasOverride ? '<div style="margin-top:12px"><button type="button" class="btn-text-action" id="resetSuggestedWorkoutBtn" style="color:#8A8A8E;font-size:15px;background:none;border:none;padding:0;cursor:pointer">Reset to suggested</button></div>' : '');
      }
      return '<div class="today-workout-block" style="background:#141416;border-radius:20px;padding:20px;margin-bottom:20px">'
        + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">'
          + '<span class="t-label">' + esc(workoutBlockDateLabel) + '</span>'
          + '<button type="button" class="btn-text-action" id="changeWorkoutBtn" style="color:#F5F5F4;font-size:15px;font-weight:600;background:none;border:none;padding:0;cursor:pointer">Change</button>'
        + '</div>' + cardInner + '</div>';
    })()
    + (function () {
      var lastW = currentWeight(), bwPlaceholder = lastW ? lastW.toFixed(1) : '54.0', bwValue = rec.weight ? rec.weight : '';
      var saveLabel = bwValue ? 'Saved' : 'Save';
      var saveStyle = bwValue ? 'background:#1C1C1F;color:#8A8A8E;border:1px solid #222222;cursor:default' : 'background:transparent;color:#8A8A8E;border:1px solid #222222;opacity:0.4;cursor:default';
      return '<div style="margin-bottom:24px">'
        + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">'
          + '<span style="font-size:11px;font-weight:600;letter-spacing:0.08em;color:#8A8A8E;text-transform:uppercase">WEIGHT</span>'
          + (bwValue ? '<button type="button" class="btn-text-action" id="deleteTodayWeightBtn" style="color:#8A8A8E;font-size:15px;background:none;border:none;padding:0;min-height:48px;cursor:pointer;display:inline-flex;align-items:center">Clear</button>' : '')
        + '</div>'
        + '<div class="field">'
          + '<input type="number" id="todayWeight" step="0.1" inputmode="decimal" placeholder="' + bwPlaceholder + '" value="' + bwValue + '">'
          + '<span class="field-unit">kg</span>'
          + '<button type="button" class="field-btn" id="saveTodayWeight" style="height:38px;padding:0 14px;border-radius:8px;font-size:15px;font-weight:600;' + saveStyle + '">' + saveLabel + '</button>'
        + '</div></div>';
    })()
    + getStaplesShelfHTML()
    + '<div style="margin-top:28px;margin-bottom:40px">'
    + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">'
    + '<span class="t-label">' + (activeDateKey === key ? "Today's Food" : "Food Log") + '</span>'
    + '<span style="font-size:11px;color:#8A8A8E;font-variant-numeric:tabular-nums">' + (rec.extra ? rec.extra.length : 0) + (rec.extra && rec.extra.length === 1 ? ' item' : ' items') + '</span>'
    + '</div>'
    + (rec.extra && rec.extra.length
      ? ('<div>' + rec.extra.map(function (item, i) {
        var kc = Math.round(item.kcal * (item.servings || 1));
        var pr = Math.round((item.protein || 0) * (item.servings || 1));
        return '<div class="food-log-row" data-gesture-owner="food-row" data-food-index="' + i + '" style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #222;padding:14px 0;min-height:48px;gap:12px;touch-action:pan-y;cursor:pointer">'
          + '<span style="font-size:17px;font-weight:400;color:#F5F5F4;flex:1;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;word-break:break-word;line-height:1.3">' + esc(item.name) + '</span>'
          + '<span style="font-size:15px;color:#8A8A8E;font-variant-numeric:tabular-nums;flex-shrink:0">' + kc + ' kcal · ' + pr + ' g</span>'
          + '</div>';
      }).join('') + '</div>'
        + '<button type="button" class="btn-text-action" id="addFoodBtn" style="color:#F5F5F4;font-size:15px;font-weight:600;background:none;border:none;padding:16px 0;min-height:48px;cursor:pointer;display:inline-flex;align-items:center">+ Add food</button>')
      : '<div style="padding:16px 0 12px;text-align:left"><div style="font-size:15px;color:#55555A;margin-bottom:12px">No food logged for this day.</div><button type="button" class="btn btn-primary" id="addFoodBtn" style="min-height:48px;height:48px;padding:0 20px;cursor:pointer">+ Add food</button></div>')
    + '</div>';

  var settingsBtn = document.getElementById('settingsBtn');
  if (settingsBtn) settingsBtn.onclick = function(e) { if (e && e.stopPropagation) e.stopPropagation(); openSettings(); };
  bindBackupNudgeEvents(exportData);
  bindCatchupCardEvents(contentEl, renderTodaySimple);
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
        renderApp();
      }
    };
  }

  var todayWeightInput = document.getElementById('todayWeight');
  var saveTodayWeight = document.getElementById('saveTodayWeight');
  var deleteTodayWeightBtn = document.getElementById('deleteTodayWeightBtn');
  var clearTodayWeight = async function() {
    var ok = await confirmDialog({ title: 'Clear Weight Log?', message: "Clear weight log (" + rec.weight + " kg)?", confirmLabel: 'Clear Log', destructive: true });
    if (!ok) return;
    rec.weight = null; saveDayRecord(activeDateKey, rec);
    if (profile.weightEntries) { profile.weightEntries = profile.weightEntries.filter(function(e){ return e.dayKey !== activeDateKey; }); sv('rg_profile', profile); }
    triggerHaptic(); showToast('Weight log cleared', 'ok'); renderTodaySimple();
  };
  if (deleteTodayWeightBtn) deleteTodayWeightBtn.onclick = clearTodayWeight;
  if (todayWeightInput && saveTodayWeight) {
    var initialW = (todayWeightInput.value || '').trim();
    todayWeightInput.oninput = function () {
      var curW = (todayWeightInput.value || '').trim(), changed = curW !== initialW;
      if (changed) {
        saveTodayWeight.textContent = 'Save'; saveTodayWeight.style.background = '#C6F432';
        saveTodayWeight.style.color = '#0B0B0C'; saveTodayWeight.style.border = 'none';
        saveTodayWeight.style.opacity = '1'; saveTodayWeight.style.cursor = 'pointer';
      } else if (initialW !== '') {
        saveTodayWeight.textContent = 'Saved'; saveTodayWeight.style.background = '#1C1C1F';
        saveTodayWeight.style.color = '#8A8A8E'; saveTodayWeight.style.border = '1px solid #222222';
        saveTodayWeight.style.opacity = '1'; saveTodayWeight.style.cursor = 'default';
      } else {
        saveTodayWeight.textContent = 'Save'; saveTodayWeight.style.background = 'transparent';
        saveTodayWeight.style.color = '#8A8A8E'; saveTodayWeight.style.border = '1px solid #222222';
        saveTodayWeight.style.opacity = '0.4'; saveTodayWeight.style.cursor = 'default';
      }
    };
    var doSaveWeight = function () {
      var valStr = (todayWeightInput.value || '').trim();
      if (!valStr || valStr === initialW) return;
      var w = parseFloat(valStr.replace(',', '.'));
      if (!w || isNaN(w) || w < 20 || w > 300) { showToast('Enter a valid weight', 'warn'); return; }
      profile.weightEntries = (profile.weightEntries || []).filter(function(e){ return e.dayKey !== activeDateKey; });
      profile.weightEntries.push({ id: 'weight_' + Date.now(), dayKey: activeDateKey, weight: w, createdAt: new Date().toISOString() });
      sv('rg_profile', profile); rec.weight = w; saveDayRecord(activeDateKey, rec);
      triggerHaptic(); showToast('Weight saved', 'ok'); initialW = String(w);
      renderTodaySimple();
    };
    saveTodayWeight.onclick = doSaveWeight;
    todayWeightInput.onblur = doSaveWeight;
  }

  var staples = getMergedStaples();
  document.querySelectorAll('[data-quick-staple]').forEach(function (card) {
    var sIdx = parseInt(card.dataset.quickStaple, 10);
    var item = staples[sIdx];
    if (!item) return;

    var logItem = function (mult) {
      mult = mult || 1;
      var prevTot = getDayTotals(activeDateKey), dayTargets = getTargetsForDate(activeDateKey);
      var currentRec = dayRecord(activeDateKey);
      currentRec.extra = currentRec.extra || [];
      var insertIdx = currentRec.extra.length;
      var portionLabel = mult === 1 ? '' : (mult === 0.5 ? '½× ' : mult + '× ');
      currentRec.extra.push({
        name: portionLabel + item.name, kcal: Math.round(item.kcal * mult),
        protein: +(item.protein * mult).toFixed(1), carbs: Math.round((item.carbs || 0) * mult),
        fat: Math.round((item.fat || 0) * mult), servings: 1
      });
      saveDayRecord(activeDateKey, currentRec);
      addRecent(item.name, item.kcal, item.protein, item.carbs || 0, item.fat || 0);
      var newTot = getDayTotals(activeDateKey), reached = (prevTot.kcal < dayTargets.kcal && newTot.kcal >= dayTargets.kcal);
      playSound('set_logged'); triggerHaptic(reached ? 'success' : 'light'); renderTodaySimple(); showFoodAddedChip(Math.round(item.kcal * mult));
      showUndoToast('Logged ' + portionLabel + item.name + ' (' + +(item.protein * mult).toFixed(1) + 'g P)', function () {
        var undoRec = dayRecord(activeDateKey);
        if (undoRec.extra && undoRec.extra.length > insertIdx) {
          undoRec.extra.splice(insertIdx, 1); saveDayRecord(activeDateKey, undoRec); renderTodaySimple();
        }
      });
    };

    var pressTimer = null, didLongPress = false, touchStartX = 0, touchStartY = 0, hasMoved = false;
    card.addEventListener('touchstart', function (e) {
      didLongPress = false; hasMoved = false;
      if (e.touches && e.touches[0]) { touchStartX = e.touches[0].clientX; touchStartY = e.touches[0].clientY; }
      pressTimer = setTimeout(function () {
        if (!hasMoved) { didLongPress = true; triggerHaptic(); openPortionSheet(item, function (mult) { logItem(mult); }); }
      }, 450);
    }, { passive: true });
    card.addEventListener('touchmove', function (e) {
      if (e.touches && e.touches[0]) {
        var dx = Math.abs(e.touches[0].clientX - touchStartX), dy = Math.abs(e.touches[0].clientY - touchStartY);
        if (dx > 10 || dy > 10) { hasMoved = true; if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; } }
      }
    }, { passive: true });
    card.addEventListener('touchend', function () { if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; } }, { passive: true });
    card.addEventListener('contextmenu', function (e) {
      e.preventDefault(); if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; }
      triggerHaptic(); openPortionSheet(item, function (mult) { logItem(mult); });
    });

    card.onclick = function () {
      if (didLongPress || hasMoved) return;
      logItem(1);
    };
  });

  var addFoodBtn = document.getElementById('addFoodBtn');
  if (addFoodBtn) addFoodBtn.onclick = function () { openFoodSearch(function (food, s) { addFoodToDay(activeDateKey, food, s); }); };

  var deleteFoodEntry = function(idx, row) {
    var current = dayRecord(activeDateKey);
    if (!current.extra || isNaN(idx) || !current.extra[idx]) return;
    var performDel = function() {
      var removed = current.extra.splice(idx, 1)[0];
      saveDayRecord(activeDateKey, current); renderTodaySimple();
      showUndoToast('Food entry deleted', function () {
        var restored = dayRecord(activeDateKey);
        restored.extra = restored.extra || []; restored.extra.splice(Math.min(idx, restored.extra.length), 0, removed);
        saveDayRecord(activeDateKey, restored); renderTodaySimple();
      });
    };
    if (row && typeof window !== 'undefined' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      row.style.transition = 'height 150ms cubic-bezier(0.2,0,0,1), opacity 150ms cubic-bezier(0.2,0,0,1), margin 150ms cubic-bezier(0.2,0,0,1)';
      row.style.height = row.offsetHeight + 'px'; void row.offsetHeight;
      row.style.height = '0px'; row.style.opacity = '0'; row.style.margin = '0px'; row.style.overflow = 'hidden';
      setTimeout(performDel, 150);
    } else { performDel(); }
  };

  document.querySelectorAll('.food-delete').forEach(function (btn) {
    btn.onclick = function (e) {
      if (e && e.stopPropagation) e.stopPropagation();
      deleteFoodEntry(parseInt(btn.dataset.foodIndex, 10), btn.closest('.food-log-row'));
    };
  });

  document.querySelectorAll('.food-log-row').forEach(function (row) {
    var startX = 0, deltaX = 0, idx = parseInt(row.dataset.foodIndex, 10);
    row.addEventListener('touchstart', function (e) {
      claimGestureOwner('food-row');
      if (e.changedTouches && e.changedTouches[0]) { startX = e.changedTouches[0].clientX; deltaX = 0; }
    }, { passive: true });
    row.addEventListener('touchmove', function (e) {
      if (!e.changedTouches || !e.changedTouches[0]) return;
      deltaX = e.changedTouches[0].clientX - startX;
      if (deltaX < 0) row.style.transform = 'translateX(' + Math.max(deltaX, -80) + 'px)';
    }, { passive: true });
    row.addEventListener('touchend', function () {
      releaseGestureOwner(); setGestureCooldown(400);
      if (deltaX < -60) deleteFoodEntry(idx, row);
      else row.style.transform = '';
    }, { passive: true });
  });
}

export function renderChecklistHTML() { return ''; }
export function addFoodToDay(key, food, servings) {
  var prevTot = getDayTotals(key), dayTargets = getTargetsForDate(key);
  var m = foodMacros(food, servings), rec = dayRecord(key);
  rec.extra = rec.extra || [];
  rec.extra.push({ name: food.name + (servings !== 1 ? ' ×' + servings : ''), kcal: m.kcal, protein: m.protein, carbs: m.carbs, fat: m.fat, servings: 1 });
  saveDayRecord(key, rec); addRecent(food.name, m.kcal, m.protein, m.carbs, m.fat);
  if (profile) { profile.xp = (profile.xp || 0) + 5; sv('rg_profile', profile); }
  var newTot = getDayTotals(key), reached = (prevTot.kcal < dayTargets.kcal && newTot.kcal >= dayTargets.kcal);
  triggerHaptic(reached ? 'success' : 'light');
  renderTodaySimple(); showFoodAddedChip(m.kcal);
}

export function migrateFoodTotals() {
  if (!profile || !profile.startDate || ls('rg_food_totals_v2', false)) return;
  allDayKeys().forEach(function (key) {
    var rec = dayRecord(key), changed = false;
    (rec.extra || []).forEach(function (item) {
      var s = Number(item.servings) || 1;
      if (s > 1) {
        item.kcal = +(Number(item.kcal || 0)).toFixed(1); item.protein = +(Number(item.protein || 0)).toFixed(1);
        item.carbs = +(Number(item.carbs || 0)).toFixed(1); item.fat = +(Number(item.fat || 0)).toFixed(1);
        item.servings = 1; changed = true;
      }
    });
    if (changed) saveDayRecord(key, rec);
  });
  sv('rg_food_totals_v2', true);
}

