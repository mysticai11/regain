/* Today screen: main dashboard view, daily meal checklist, and bodyweight row */

import { profile, setTab } from "../state.js";
import { dayRecord, saveDayRecord, ls, sv, allDayKeys } from "../storage.js";
import { getActiveProgram, getWeeklySchedule, getWorkoutForDate, getNextProgramWorkout, CAL_TARGET_REST, CAL_TARGET_GYM, PROT_TARGET_REST, PROT_TARGET_GYM } from "../data/plan.js";
import { DEFAULT_MEAL_PLAN } from "../data/foods.js";
import { todayKey, dateKey, addDays, esc, currentWeight, formatDuration } from "../lib/format.js";
import { getTargetsForDate, getDayTotals, getWeeklyVolume, getLoggedWeeklyVolume, computeStreak, yesterdayMissed, foodMacros } from "../lib/calc.js";
import { playSound, triggerHaptic, ic } from "../lib/dom.js";
import { showToast, showUndoToast } from "../components/toast.js";
import { buildGauge, statusPill, macroBar } from "../components/gauge.js";
import { openFoodSearch, openCustomFoodBuilder, openRecipeBuilder, openCustomFoodsManager, openMealEditor, openEditItemSheet } from "./today/food-modal.js";
import { addQuickFood, getStaplesShelfHTML, buildWeekDotRowHTML, openWorkoutOverrideSheet, buildCalRingHTML, buildWeightTrendChip, buildNextSessionPreviewHTML, buildWeekGlanceHTML, openCheckinSheet } from "./today/widgets.js";
import { openSettings } from "./settings.js";
export * from "./today/food-modal.js";
export * from "./today/widgets.js";

export function renderTodaySimple() {
  window.renderTodaySimple = renderTodaySimple;
  var key = todayKey(), rec = dayRecord(key), tot = getDayTotals(key), targets = getTargetsForDate(key);
  var calorieDelta = targets.kcal - tot.kcal;
  var calPct = Math.min(100, Math.round((tot.kcal / targets.kcal) * 100));
  var proteinPct = Math.min(100, Math.round((tot.protein / targets.protein) * 100));

  var activeDateKey = window.activeTodaySelectedDateKey || key;
  var targetRec = dayRecord(activeDateKey);
  var activeDateObj = new Date(activeDateKey + 'T00:00:00');
  var prog = getActiveProgram();

  var hasOverride = targetRec && targetRec.selectedWorkout !== undefined;
  var session = null;
  var isRest = false;

  if (hasOverride) {
    if (targetRec.selectedWorkout === null) {
      isRest = true;
    } else {
      session = (prog && prog[targetRec.selectedWorkout]) || (prog && prog[0]);
    }
  } else {
    var chosen = targetRec.workoutDone ? getNextProgramWorkout() : getWorkoutForDate(activeDateKey, targetRec);
    session = chosen ? chosen.session : null;
    isRest = !session || (chosen && chosen.isRest);
  }

  var rawWorkoutName = isRest ? 'Rest Day' : (session ? session.label.replace(/^Day\s*\d+\s*[—–-]\s*/i, '') : 'Workout');
  var cleanWorkoutName = rawWorkoutName;
  var lastSpace = cleanWorkoutName.lastIndexOf(' ');
  if (lastSpace > 0) cleanWorkoutName = cleanWorkoutName.substring(0, lastSpace) + '\u00A0' + cleanWorkoutName.substring(lastSpace + 1);

  var exercises = (session && session.exercises) ? session.exercises : [];
  var totalPlannedSets = exercises.reduce(function(acc, ex){ return acc + (ex.sets || 0); }, 0);
  var loggedSets = exercises.reduce(function(acc, ex){
    var aid = (targetRec.swaps && targetRec.swaps[ex.id]) || ex.id;
    return acc + ((targetRec.workout || {})[aid] || []).filter(Boolean).length;
  }, 0);
  var isSessionDone = targetRec.workoutDone || (totalPlannedSets > 0 && loggedSets >= totalPlannedSets);

  var dayNames = ['SUN','MON','TUE','WED','THU','FRI','SAT'];
  var monthNames = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  var todayHeaderDateStr = dayNames[new Date().getDay()] + ' ' + new Date().getDate() + ' ' + monthNames[new Date().getMonth()];

  var workoutBlockDateLabel = (activeDateKey === key)
    ? (isRest ? 'REST DAY' : "TODAY'S WORKOUT")
    : (dayNames[activeDateObj.getDay()] + ' ' + activeDateObj.getDate() + ' ' + monthNames[activeDateObj.getMonth()] + (isRest ? ' · REST DAY' : ' · WORKOUT'));

  var calRingHTML = buildCalRingHTML(Math.round(tot.kcal||0), targets.kcal, Math.round(tot.protein||0), targets.protein, Math.round(tot.carbs||0), Math.round(tot.fat||0));
  var weekDotHTML = buildWeekDotRowHTML(key, activeDateKey);

  document.getElementById('content').innerHTML =
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px">'
      + '<span class="t-label">' + todayHeaderDateStr + '</span>'
      + '<button class="icon-btn" id="settingsBtn" aria-label="Settings">' + ic('settings') + '</button>'
    + '</div>'
    + calRingHTML
    + weekDotHTML
    + '<div class="today-workout-block" style="background:#141416;border-radius:20px;padding:20px;margin-bottom:20px">'
      + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">'
        + '<span class="t-label">' + esc(workoutBlockDateLabel) + '</span>'
        + '<button type="button" class="btn-text-action" id="changeWorkoutBtn" style="color:#F5F5F4;font-size:15px;font-weight:600;background:none;border:none;padding:0;cursor:pointer">Change</button>'
      + '</div>'
      + '<div style="font-size:28px;font-weight:600;color:#F5F5F4;line-height:1.2;margin-bottom:4px">' + esc(cleanWorkoutName) + '</div>'
      + '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:12px">'
        + '<div style="font-size:15px;color:#8A8A8E;font-variant-numeric:tabular-nums">'
          + (isRest ? 'Recovery & Nutrition' : (loggedSets + ' / ' + totalPlannedSets + ' sets'))
        + '</div>'
        + (!isRest
          ? ('<button class="btn btn-primary btn-start" id="startWorkout" style="background:#C6F432;color:#0B0B0C;border:none;border-radius:12px;font-size:15px;font-weight:600;padding:10px 20px;cursor:pointer;box-shadow:none">'
              + (isSessionDone ? 'Done' : (loggedSets > 0 ? 'Keep logging' : 'Start'))
            + '</button>')
          : ('<button class="btn btn-primary btn-start" id="startWorkout" style="background:#1C1C1F;color:#F5F5F4;border:none;border-radius:12px;font-size:15px;font-weight:600;padding:10px 20px;cursor:pointer;box-shadow:none">Choose</button>'))
      + '</div>'
      + (hasOverride
        ? ('<div style="margin-top:12px"><button type="button" class="btn-text-action" id="resetSuggestedWorkoutBtn" style="color:#8A8A8E;font-size:15px;background:none;border:none;padding:0;cursor:pointer">Reset to suggested</button></div>')
        : '')
    + '</div>'
    + (function() {
        var lastW = currentWeight();
        var bwPlaceholder = lastW ? lastW.toFixed(1) : '54.0';
        var bwValue = rec.weight ? rec.weight : '';
        return '<div style="display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid #222;margin-bottom:20px;gap:12px">'
          + '<div style="display:flex;align-items:center;gap:8px;flex:1">'
            + '<span class="t-label" style="min-width:54px">Weight</span>'
            + '<input type="number" id="todayWeight" step="0.1" inputmode="decimal" placeholder="' + bwPlaceholder + '" value="' + bwValue + '" style="font-family:\'Space Grotesk\',sans-serif;font-size:17px;font-weight:600;font-variant-numeric:tabular-nums;color:#F5F5F4;background:#1C1C1F;border:none;border-radius:12px;outline:none;padding:0 12px;height:44px;min-height:44px;flex:1;max-width:130px">'
            + '<span style="font-size:15px;color:#8A8A8E;font-weight:400">kg</span>'
          + '</div>'
          + '<button type="button" class="btn btn-primary" id="saveTodayWeight" style="height:44px;min-height:44px;padding:0 16px;cursor:pointer">Save</button>'
        + '</div>';
      })()
    + getStaplesShelfHTML()
    + '<div style="margin-top:28px;margin-bottom:40px">'
      + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">'
        + '<span class="t-label">Today\'s Food</span>'
        + '<span style="font-size:11px;color:#8A8A8E;font-variant-numeric:tabular-nums">' + (rec.extra ? rec.extra.length : 0) + (rec.extra && rec.extra.length === 1 ? ' item' : ' items') + '</span>'
      + '</div>'
      + (rec.extra && rec.extra.length
        ? ('<div>' + rec.extra.map(function(item, i) {
            var kc = Math.round(item.kcal * (item.servings || 1));
            var pr = Math.round((item.protein || 0) * (item.servings || 1));
            return '<div class="food-log-row" data-food-index="' + i + '" style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #222;padding:14px 0;min-height:48px;gap:12px;touch-action:pan-y">'
              + '<span style="font-size:17px;font-weight:400;color:#F5F5F4;flex:1;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;word-break:break-word;line-height:1.3">' + esc(item.name) + '</span>'
              + '<span style="display:flex;align-items:center;gap:12px;flex-shrink:0">'
                + '<span style="font-size:15px;color:#8A8A8E;font-variant-numeric:tabular-nums">' + kc + ' kcal · ' + pr + ' g</span>'
                + '<button class="food-delete" data-food-index="' + i + '" aria-label="Delete" style="background:none;border:none;color:#55555A;font-size:17px;cursor:pointer;padding:8px;line-height:1;margin-right:-8px">×</button>'
              + '</span>'
            + '</div>';
          }).join('') + '</div>'
          + '<button class="btn-text-action" id="addFoodBtn" style="color:#F5F5F4;font-size:15px;font-weight:600;background:none;border:none;padding:16px 0 0;cursor:pointer;display:block">+ Add food</button>')
        : '<div style="padding:16px 0 12px;text-align:left"><div style="font-size:15px;color:#55555A;margin-bottom:12px">No food logged yet today.</div><button type="button" class="btn btn-primary" id="addFoodBtn" style="height:44px;min-height:44px;padding:0 20px;cursor:pointer">+ Add food</button></div>')
    + '</div>';

  var settingsBtn = document.getElementById('settingsBtn');
  if (settingsBtn) settingsBtn.onclick = openSettings;

  document.querySelectorAll('[data-pick-today-strip-date]').forEach(function(cell) {
    cell.onclick = function() {
      var picked = cell.dataset.pickTodayStripDate;
      window.activeTodaySelectedDateKey = picked;
      renderTodaySimple();
      openWorkoutOverrideSheet(picked);
    };
  });

  var changeWorkoutBtn = document.getElementById('changeWorkoutBtn');
  if (changeWorkoutBtn) {
    changeWorkoutBtn.onclick = function() {
      openWorkoutOverrideSheet(activeDateKey);
    };
  }

  var resetSuggestedWorkoutBtn = document.getElementById('resetSuggestedWorkoutBtn');
  if (resetSuggestedWorkoutBtn) {
    resetSuggestedWorkoutBtn.onclick = function() {
      var r = dayRecord(activeDateKey);
      delete r.selectedWorkout;
      saveDayRecord(activeDateKey, r);
      renderTodaySimple();
      showToast('Reset to suggested workout', 'ok');
    };
  }

  var startWorkout = document.getElementById('startWorkout');
  if (startWorkout) {
    startWorkout.onclick = function() {
      if (isRest) {
        openWorkoutOverrideSheet(activeDateKey);
      } else if (isSessionDone) {
        setTab('progress');
        renderApp();
      } else {
        window.activeGymDateKey = activeDateKey;
        setTab('gym');
        renderApp();
      }
    };
  }

  var todayWeightInput = document.getElementById('todayWeight');
  var saveTodayWeight = document.getElementById('saveTodayWeight');
  if (todayWeightInput && saveTodayWeight) {
    saveTodayWeight.onclick = function() {
      var valStr = (todayWeightInput.value || '').trim();
      var w = parseFloat(valStr || todayWeightInput.placeholder);
      if (!w || isNaN(w) || w < 20 || w > 300) { showToast('Enter a valid weight', 'warn'); return; }
      profile.weightEntries = profile.weightEntries || [];
      profile.weightEntries.push({ id: 'weight_' + Date.now(), dayKey: key, weight: w, createdAt: new Date().toISOString() });
      sv('rg_profile', profile);
      rec.weight = w;
      saveDayRecord(key, rec);
      showToast('Saved ' + w.toFixed(1) + ' kg today', 'ok');
      renderTodaySimple();
    };
  }

  document.querySelectorAll('[data-quick-staple]').forEach(function(card) {
    card.onclick = function() {
      var sIdx = parseInt(card.dataset.quickStaple, 10);
      var rawStaples = (profile && profile.customStaples) || DEFAULT_STAPLES;
      var seenIds = {};
      var staples = rawStaples.filter(function(s) {
        var sid = (s.id || '') + '::' + (s.name || '');
        if (seenIds[sid]) return false;
        seenIds[sid] = true;
        return true;
      });
      var item = staples[sIdx];
      if (!item) return;
      var currentRec = dayRecord(key);
      currentRec.extra = currentRec.extra || [];
      var insertIdx = currentRec.extra.length;
      currentRec.extra.push({ name: item.name, kcal: item.kcal, protein: item.protein, carbs: item.carbs || 0, fat: item.fat || 0, servings: 1 });
      saveDayRecord(key, currentRec);
      playSound('set_logged');
      triggerHaptic();
      renderTodaySimple();
      showUndoToast('Logged ' + item.name + ' (' + item.protein + 'g P)', function() {
        var undoRec = dayRecord(key);
        if (undoRec.extra && undoRec.extra.length > insertIdx) {
          undoRec.extra.splice(insertIdx, 1);
          saveDayRecord(key, undoRec);
          renderTodaySimple();
        }
      });
    };
  });

  var addFoodBtn = document.getElementById('addFoodBtn');
  if (addFoodBtn) {
    addFoodBtn.onclick = function() {
      openFoodSearch(function(food, s) { addFoodToDay(key, food, s); });
    };
  }

  document.querySelectorAll('.food-delete').forEach(function(btn) {
    btn.onclick = function(e) {
      if (e && e.stopPropagation) e.stopPropagation();
      var idx = parseInt(btn.dataset.foodIndex, 10);
      var current = dayRecord(key);
      if (!current.extra || isNaN(idx) || !current.extra[idx]) return;
      var removed = current.extra.splice(idx, 1)[0];
      saveDayRecord(key, current);
      renderTodaySimple();
      showUndoToast('Food entry deleted', function() {
        var restored = dayRecord(key);
        restored.extra = restored.extra || [];
        restored.extra.splice(Math.min(idx, restored.extra.length), 0, removed);
        saveDayRecord(key, restored);
        renderTodaySimple();
      });
    };
  });

  document.querySelectorAll('.food-log-row').forEach(function(row) {
    var startX = 0, deltaX = 0;
    var idx = parseInt(row.dataset.foodIndex, 10);
    row.addEventListener('touchstart', function(e) {
      if (!e.changedTouches || !e.changedTouches[0]) return;
      startX = e.changedTouches[0].clientX;
      deltaX = 0;
    }, { passive: true });
    row.addEventListener('touchmove', function(e) {
      if (!e.changedTouches || !e.changedTouches[0]) return;
      deltaX = e.changedTouches[0].clientX - startX;
      if (deltaX < 0) {
        row.style.transform = 'translateX(' + Math.max(deltaX, -80) + 'px)';
      }
    }, { passive: true });
    row.addEventListener('touchend', function() {
      if (deltaX < -60) {
        var current = dayRecord(key);
        if (!current.extra || isNaN(idx) || !current.extra[idx]) return;
        var removed = current.extra.splice(idx, 1)[0];
        saveDayRecord(key, current);
        renderTodaySimple();
        showUndoToast('Food entry deleted', function() {
          var restored = dayRecord(key);
          restored.extra = restored.extra || [];
          restored.extra.splice(Math.min(idx, restored.extra.length), 0, removed);
          saveDayRecord(key, restored);
          renderTodaySimple();
        });
      } else {
        row.style.transform = '';
      }
    }, { passive: true });
  });
}

export function renderChecklistHTML(rec, isTrainingDay) {
  var plan = (profile && profile.mealPlan) || DEFAULT_MEAL_PLAN;
  var badAppetite = rec.badAppetite || false;
  
  if (!badAppetite) {
    // Normal rendering
    var html = '';
    Object.keys(plan).forEach(function(gKey){
      var group = plan[gKey];
      if(group.gymOnly && !isTrainingDay) return;
      
      html += '<div class="meal-group" style="margin-top:16px">'
        + '<div class="eyebrow" style="margin-bottom:8px; display:flex; justify-content:space-between; align-items:center">'
          + '<span>' + group.label + '</span>'
        + '</div>';
        
      (group.items||[]).forEach(function(item){
        var logged = !!rec.meals[item.id];
        var checkedStyle = logged ? 'opacity: 0.45; text-decoration: line-through; background: rgba(255,255,255,0.02); border-color: rgba(255,255,255,0.04);' : '';
        html += '<div class="meal-row" style="padding: 10px 12px; background: var(--surface); border-radius: 8px; margin-bottom: 6px; border: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; ' + checkedStyle + '">'
          + '<div style="display:flex; align-items:center; gap:10px">'
            + '<input type="checkbox" class="plan-chk" data-itemid="' + item.id + '"' + (logged ? ' checked' : '') + ' style="width: 18px; height: 18px; cursor: pointer">'
            + '<div>'
              + '<div style="font-size: 15px; font-weight: 600;' + (logged ? 'color: var(--text-muted)' : 'color: var(--text)') + '">' + item.name + '</div>'
              + '<div style="font-size: 11px; color: var(--text-muted); font-variant-numeric: tabular-nums; margin-top: 2px">' + item.kcal + ' kcal · ' + item.protein + 'P · ' + item.carbs + 'C · ' + item.fat + 'F</div>'
            + '</div>'
          + '</div>'
          + '<button class="edit-item-btn" data-itemid="' + item.id + '" data-group="' + gKey + '" style="background:none; border:none; color:var(--text-muted); cursor:pointer; font-size:15px; padding:4px">' + ic('settings', '14') + '</button>'
          + '</div>';
      });
      
      html += '</div>';
    });
    return html;
  } else {
    // Low Appetite rendering - grouped by priority
    var priorityHTML = '';
    var optionalHTML = '';
    
    Object.keys(plan).forEach(function(gKey){
      var group = plan[gKey];
      if(group.gymOnly && !isTrainingDay) return;
      
      (group.items||[]).forEach(function(item){
        var nameL = item.name.toLowerCase();
        var isOptional = nameL.includes('paneer') || nameL.includes('dahi') || nameL.includes('curd') || nameL.includes('egg') || nameL.includes('sabzi') || nameL.includes('vegetable') || nameL.includes('kiwi');
        
        var logged = !!rec.meals[item.id];
        var checkedStyle = logged ? 'opacity: 0.45; text-decoration: line-through; background: rgba(255,255,255,0.02); border-color: rgba(255,255,255,0.04);' : '';
        var row = '<div class="meal-row" style="padding: 10px 12px; background: var(--surface); border-radius: 8px; margin-bottom: 6px; border: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; ' + (isOptional ? 'opacity: 0.6; ' : '') + checkedStyle + '">'
          + '<div style="display:flex; align-items:center; gap:10px">'
            + '<input type="checkbox" class="plan-chk" data-itemid="' + item.id + '"' + (logged ? ' checked' : '') + ' style="width: 18px; height: 18px; cursor: pointer">'
            + '<div>'
              + '<div style="font-size: 15px; font-weight: 600;' + (logged ? 'color: var(--text-muted)' : 'color: var(--text)') + '">' + item.name + '</div>'
              + '<div style="font-size: 11px; color: var(--text-muted); font-variant-numeric: tabular-nums; margin-top: 2px">' + item.kcal + ' kcal · ' + item.protein + 'P · ' + item.carbs + 'C · ' + item.fat + 'F</div>'
            + '</div>'
          + '</div>'
          + '<button class="edit-item-btn" data-itemid="' + item.id + '" data-group="' + gKey + '" style="background:none; border:none; color:var(--text-muted); cursor:pointer; font-size:15px; padding:4px">' + ic('settings', '14') + '</button>'
          + '</div>';
          
        if (isOptional) {
          optionalHTML += row;
        } else {
          priorityHTML += row;
        }
      });
    });
    
    var html = '';
    if (priorityHTML) {
      html += '<div class="meal-group" style="margin-top:16px"><div class="eyebrow" style="margin-bottom:8px; color:var(--amber-light); display:flex; align-items:center; gap:4px">' + ic('flame', 14) + ' Priority (Energy-Dense Surplus Boosters)</div>' + priorityHTML + '</div>';
    }
    if (optionalHTML) {
      html += '<div class="meal-group" style="margin-top:16px"><div class="eyebrow" style="margin-bottom:8px; color:var(--text-muted); display:flex; align-items:center; gap:4px">' + ic('info', 14) + ' Optional (High-Volume/Protein - Can Skip if Full)</div>' + optionalHTML + '</div>';
    }
    return html;
  }
}

export function addFoodToDay(key, food, servings) {
  var m = foodMacros(food, servings);
  var rec = dayRecord(key);
  rec.extra.push({name:food.name+(servings!==1?' ×'+servings:''),kcal:m.kcal,protein:m.protein,carbs:m.carbs,fat:m.fat,servings:1});
  saveDayRecord(key, rec);
  addRecent(food.name, m.kcal, m.protein, m.carbs, m.fat);
  profile.xp=(profile.xp||0)+5; sv('rg_profile',profile);
  renderTodaySimple();
}

export function migrateFoodTotals() {
  if(!profile || !profile.startDate || ls('rg_food_totals_v2', false)) return;
  allDayKeys().forEach(function(key) {
    var rec=dayRecord(key), changed=false;
    (rec.extra||[]).forEach(function(item) {
      var servings=Number(item.servings)||1;
      if(servings>1) {
        item.kcal=+(Number(item.kcal||0)).toFixed(1); item.protein=+(Number(item.protein||0)).toFixed(1);
        item.carbs=+(Number(item.carbs||0)).toFixed(1); item.fat=+(Number(item.fat||0)).toFixed(1);
        item.servings=1; changed=true;
      }
    });
    if(changed) saveDayRecord(key,rec);
  });
  sv('rg_food_totals_v2', true);
}

