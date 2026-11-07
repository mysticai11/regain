/* Progress screen: main view container, segmented tabs (Body / Lifts), and settings button */

import { profile, setTab } from "../state.js";
import { dayRecord, saveDayRecord, sv, allDayKeys, getWorkoutSessions } from "../storage.js";
import { getDayTotals, calcE1RM } from "../lib/calc.js";
import { getActiveProgram, getExerciseData, isBodyweightExercise } from "../data/plan.js";
import { esc, todayKey, goalDirection } from "../lib/format.js";
import { ic, triggerHaptic, animateNumber } from "../lib/dom.js";
import { openSettings } from "./settings.js";
import { showToast } from "../components/toast.js";
import { openQuickEditSetModal } from "../components/quick-edit-modal.js";
import { getWeightHistory, getProgressRows, getRollingWeightValues, buildDotConsistencyCalendarHTML, progressPlot, goalTrajectoryText, getLiftHistory } from "./progress/charts.js?v=4";
import { getEquivalentExerciseIds } from "./gym/sets.js";
import { workoutHistoryHTML, getResumeWorkoutCardHTML, nutritionProgressHTML, weeklyVolumeChart, editWeightEntry, deleteWeightEntry, weightEntriesHTML } from "./progress/history.js";
import { openSessionMenu, openEditWorkoutSheet } from "./progress/session-editor.js";
import { buildMonthlyDigestHTML, buildWeeklyDigestHTML, openHistoryArchiveModal, buildHistoryScreenHTML, wireHistoryScreenEvents } from "./progress/digests.js";
export * from "./progress/charts.js?v=4"; export * from "./progress/history.js"; export * from "./progress/session-editor.js";

import { setupChartInteractions, openExercisePickerModal } from "./progress/interactions.js";
import { decideSwipe, SWIPE_NAV_SCOPE, showGestureDebug } from "../lib/gesture.js";
import { renderLineChart } from "../ui/lineChart.js";
import { enhanceLiftsTab } from "./progress/lifts.js";

export function renderProgressSimple(mode, historySubTab) {
  mode = mode || (typeof window !== 'undefined' ? window.activeProgressSubTab : null) || 'body';
  if (typeof window !== 'undefined') window.activeProgressSubTab = mode;
  historySubTab = historySubTab || (typeof window !== 'undefined' ? window.activeProgressHistorySubTab : null) || 'weeks';
  if (typeof window !== 'undefined') window.activeProgressHistorySubTab = historySubTab;
  var entries=getWeightHistory(), records=allDayKeys().map(function(k){var r=dayRecord(k),t=getDayTotals(k);return {key:k,weight:r.weight,kcal:t.kcal,protein:t.protein};});
  var workoutSessions=getWorkoutSessions().filter(function(session){return (session.exercises||[]).some(function(exercise){return (exercise.sets||[]).some(Boolean);});});
  var current=entries.length?entries[entries.length-1].weight:null, range='4w', liftRange='4w';
  var activeLiftMetric = (typeof window !== 'undefined' ? window.activeLiftMetric : null) || 'e1rm';
  var liftSessionsMaxShown = (typeof window !== 'undefined' ? window.liftSessionsMaxShown : null) || 8;
  var exerciseSessionCounts = {};
  allDayKeys().forEach(function(k) {
    var wo = (dayRecord(k) || {}).workout || {};
    Object.keys(wo).forEach(function(id) {
      if ((wo[id] || []).some(function(s) { return s && (s.reps || s.weight); })) {
        exerciseSessionCounts[id] = (exerciseSessionCounts[id] || 0) + 1;
      }
    });
  });
  var exOptions=[]; getActiveProgram().forEach(function(s){s.exercises.forEach(function(e){if(!exOptions.some(function(x){return x.id===e.id;}))exOptions.push(e);});}); allDayKeys().forEach(function(key){Object.keys(dayRecord(key).workout||{}).forEach(function(id){var e=getExerciseData(id);if(e&&!exOptions.some(function(x){return x.id===id;}))exOptions.push(e);});}); workoutSessions.forEach(function(s){ (s.exercises||[]).forEach(function(e){ if(e&&e.id&&!exOptions.some(function(x){return x.id===e.id;})) exOptions.push({id:e.id, name:e.name||e.id}); }); });
  var selected = (typeof window !== 'undefined' && window.activeProgressExerciseId) || null;
  if (!selected && exOptions.length) {
    var loggedEx = exOptions.find(function(e){ return (exerciseSessionCounts[e.id] || 0) > 0; });
    selected = loggedEx ? loggedEx.id : exOptions[0].id;
  }
  var render=function(){
    var rangeEntries=getProgressRows(range,entries), weightValues=getRollingWeightValues(rangeEntries,entries), liftControl=document.getElementById('liftSelect');
    if (liftControl && liftControl.value) selected = liftControl.value;
    else if (!selected && exOptions.length) selected = exOptions[0].id;
    var selectedExData = selected ? getExerciseData(selected) : null, isBW = selected ? isBodyweightExercise(selected, selectedExData ? selectedExData.name : '') : false, liftValues = getLiftHistory(selected);

    var weightPlot=document.getElementById('weightPlot');
    if(weightPlot) {
      weightPlot.innerHTML = progressPlot(weightValues, (profile && profile.targetWeight) || null, 'kg', false);
      if (weightValues && weightValues.length && typeof document.createElementNS === 'function' && typeof weightPlot.appendChild === 'function') {
        var chartData = weightValues.map(function(w) {
          return { t: new Date(w.dateKey + 'T12:00:00').getTime(), v: Number(w.value), label: w.dateKey };
        });
        renderLineChart({
          container: weightPlot,
          data: chartData,
          height: 180,
          unit: 'kg',
          ariaLabel: 'Body weight history'
        });
      } else {
        setupChartInteractions(weightPlot);
      }
    }
    var weightEntriesContainer = document.getElementById('weightEntriesContainer');
    if (weightEntriesContainer) {
      weightEntriesContainer.innerHTML = weightEntriesHTML(entries);
      weightEntriesContainer.querySelectorAll('[data-edit-weight]').forEach(function(btn){
        btn.onclick = function(){ editWeightEntry(btn.dataset.editWeight); };
      });
      weightEntriesContainer.querySelectorAll('[data-delete-weight]').forEach(function(btn){
        btn.onclick = function(){ deleteWeightEntry(btn.dataset.deleteWeight); };
      });
    }

    enhanceLiftsTab({
      selected: selected,
      isBW: isBW,
      liftRange: liftRange,
      liftValues: liftValues,
      activeMetric: activeLiftMetric,
      maxSessionsShown: liftSessionsMaxShown,
      onMetricChange: function(newMetric) {
        activeLiftMetric = newMetric;
        if (typeof window !== 'undefined') window.activeLiftMetric = newMetric;
        render();
      },
      onShowAllSessions: function() {
        liftSessionsMaxShown = 20;
        if (typeof window !== 'undefined') window.liftSessionsMaxShown = 20;
        render();
      }
    });
    var direction=goalDirection(), latest=weightValues.length?weightValues[weightValues.length-1].value:null;
    var trend=weightValues.length>1?latest-weightValues[0].value:0;

    // Bulking rate & target computations
    var weeklyRate = null;
    if (entries.length >= 2) {
      var fEntry = entries[0];
      var lEntry = entries[entries.length - 1];
      var diffDays = (new Date(lEntry.dayKey || lEntry.createdAt) - new Date(fEntry.dayKey || fEntry.createdAt)) / 86400000;
      var wks = Math.max(diffDays / 7, 0.5);
      weeklyRate = (lEntry.weight - fEntry.weight) / wks;
    } else if (weightValues.length >= 2) {
      weeklyRate = trend;
    }

    var targetW = (profile && profile.targetWeight) || 60;
    var toGoal = (latest != null && targetW) ? (targetW - latest) : null;
    var rateStr = weeklyRate != null ? ((weeklyRate >= 0 ? '+' : '') + weeklyRate.toFixed(2) + ' kg/wk') : '—';
    var isRateOnTarget = weeklyRate != null && weeklyRate >= 0.25 && weeklyRate <= 0.55;

    var etaText = '—';
    if (weeklyRate != null && weeklyRate > 0 && toGoal != null && toGoal > 0) {
      var weeksLeft = toGoal / weeklyRate;
      var eta = new Date(Date.now() + weeksLeft * 604800000);
      etaText = eta.toLocaleDateString([], { month: 'short', year: 'numeric' });
    } else if (toGoal != null && toGoal <= 0) {
      etaText = 'Reached';
    }

    var recentRecords = records.slice(-7);
    var avgCalories = recentRecords.length ? Math.round(recentRecords.reduce(function(s, r){ return s + (r.kcal || 0); }, 0) / recentRecords.length) : 0;
    var targetCal = (profile && (profile.calTargetGym || profile.calTargetRest)) || 2700;

    var advisorCard = '';
    if (entries.length >= 5 && weeklyRate != null) {
      var paceTitle = (avgCalories >= targetCal && weeklyRate < 0.25) ? 'Bulking Pace: Slow' : (isRateOnTarget ? 'Bulking Pace: On Target' : (weeklyRate > 0.55 ? 'Bulking Pace: Fast' : ''));
      var paceBody = (avgCalories >= targetCal && weeklyRate < 0.25) ? ('Eating ~' + avgCalories.toLocaleString() + ' kcal and gaining slowly (' + rateStr + '). Target is +0.25–0.50 kg/wk. Increase intake by +150–200 kcal/day.') : (isRateOnTarget ? (rateStr + ' (target +0.25–0.50 kg/wk) · Est. ' + Math.round(targetW) + ' kg by ' + etaText) : (weeklyRate > 0.55 ? ('Gaining ' + rateStr + ' vs +0.25–0.50 kg/wk target. Maintain a clean surplus.') : ''));
      if (paceTitle) advisorCard = '<div style="font-size:15px;color:#F5F5F4;line-height:1.35;border-top:1px solid #222222;padding-top:10px"><span style="font-size:11px;font-weight:600;color:#8A8A8E;text-transform:uppercase;letter-spacing:0.08em;display:block;margin-bottom:2px">' + paceTitle + '</span>' + paceBody + '</div>';
    }

    var weightMeta=document.getElementById('weightMeta');
    if (weightMeta) {
      if (latest != null) {
        var latestAvg = (weightValues.length && weightValues[weightValues.length - 1].avg != null) ? weightValues[weightValues.length - 1].avg : latest;
        var toGoalText = toGoal != null ? (Math.abs(toGoal).toFixed(1) + ' <span style="font-size:11px;color:#8A8A8E;font-weight:500">kg left</span>') : '—';
        var rateDisplay = (entries.length >= 5 && weeklyRate != null) ? ((weeklyRate >= 0 ? '+' : '') + weeklyRate.toFixed(2) + ' <span style="font-size:11px;color:#8A8A8E;font-weight:500">kg/wk</span>') : '—';

        var subInfoHTML = '';
        if (entries.length < 5) {
          subInfoHTML = '<div style="font-size:11px;color:#8A8A8E;text-align:center;margin-top:10px;padding-top:10px;border-top:1px solid #1C1C1F">Log 5+ weigh-ins for weekly rate & pace</div>';
        } else if (advisorCard) {
          subInfoHTML = '<div style="margin-top:10px;padding-top:10px;border-top:1px solid #1C1C1F">' + advisorCard + '</div>';
        }

        weightMeta.innerHTML = '<div style="background:#141416;border:1px solid #1C1C1F;border-radius:16px;padding:14px 16px;margin-top:14px">'
          + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;align-items:center;text-align:center">'
            + '<div style="padding-right:8px;border-right:1px solid #1C1C1F">'
              + '<div style="color:#8A8A8E;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em">7-Day Avg</div>'
              + '<div class="tabnum" style="font-size:17px;font-weight:600;color:#F5F5F4;margin-top:4px">' + latestAvg.toFixed(1) + ' <span style="font-size:11px;color:#8A8A8E;font-weight:500">kg</span></div>'
            + '</div>'
            + '<div style="padding:0 8px;border-right:1px solid #1C1C1F">'
              + '<div style="color:#8A8A8E;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em">Rate</div>'
              + '<div class="tabnum" style="font-size:17px;font-weight:600;color:#F5F5F4;margin-top:4px">' + rateDisplay + '</div>'
            + '</div>'
            + '<div style="padding-left:8px">'
              + '<div style="color:#8A8A8E;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em">To ' + Math.round(targetW) + ' kg</div>'
              + '<div class="tabnum" style="font-size:17px;font-weight:600;color:#F5F5F4;margin-top:4px">' + toGoalText + '</div>'
            + '</div>'
          + '</div>'
          + subInfoHTML
          + '</div>';
      } else {
        weightMeta.innerHTML = '<div style="padding:12px 0;font-size:15px;color:#8A8A8E">No weight entries yet</div>';
      }
    }
    var liftMeta=document.getElementById('liftMeta');
    if(liftMeta) liftMeta.textContent = liftValues.length > 0 ? (isBW ? 'Peak reps' : 'Est. 1RM (Epley formula)') : '';
  };
  var bodySection = '<div style="margin-bottom:28px">'
    + '<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px">'
      + '<span class="t-label">Bodyweight</span>'
      + '<span class="t-micro">' + (profile && profile.targetWeight ? ('Target ' + profile.targetWeight + ' kg') : '') + '</span>'
    + '</div>'
    + '<div class="t-display" style="margin-bottom:14px">' + (current != null ? ('<span id="progBodyweightVal" class="tabnum" data-value="' + current.toFixed(1) + '">' + current.toFixed(1) + '</span><span style="font-size:15px;color:var(--text-secondary);margin-left:4px">kg</span>') : '<span style="font-size:17px;font-weight:500;color:#8A8A8E">No data yet</span>') + '</div>'
    + '<div class="seg-range" style="display:flex;gap:24px;align-items:center;margin-bottom:16px">'
      + '<button type="button" class="range-btn active" data-range="4w" style="background:none;border:none;padding:4px 0;font-size:15px;font-weight:600;color:#F5F5F4;border-bottom:2px solid #F5F5F4;cursor:pointer">4W</button>'
      + '<button type="button" class="range-btn" data-range="12w" style="background:none;border:none;padding:4px 0;font-size:15px;font-weight:500;color:#55555A;border-bottom:2px solid transparent;cursor:pointer">12W</button>'
      + '<button type="button" class="range-btn" data-range="all" style="background:none;border:none;padding:4px 0;font-size:15px;font-weight:500;color:#55555A;border-bottom:2px solid transparent;cursor:pointer">All</button>'
    + '</div>'
    + '<div id="weightPlot" data-gesture-owner="chart"></div>'
    + '<div id="weightMeta" class="tabnum" style="font-size:15px;color:var(--text-secondary);margin-top:10px;line-height:1.4"></div>'
    + '<div class="field" style="margin-top:16px">'
      + '<input id="progressWeight" type="number" step="0.1" min="20" max="300" placeholder="0.0" inputmode="decimal">'
      + '<span class="field-unit">kg</span>'
      + '<button type="button" class="btn btn-primary field-btn" id="saveProgressWeight" style="height:40px;min-height:40px;padding:0 14px;border-radius:10px;cursor:pointer">Save</button>'
    + '</div>'
    + '<div id="weightEntriesContainer"></div>'
    + '</div>'
    + '<div style="margin-top:28px">'
      + '<div class="t-label" style="margin-bottom:8px">Nutrition · Last 7 days</div>'
      + nutritionProgressHTML(records)
    + '</div>';
  var curExObj = exOptions.find(function(e){ return e.id === selected; }) || exOptions[0] || { id: 'bench_press', name: 'Bench Press' };
  var curExCount = exerciseSessionCounts[curExObj.id] || 0;
  var liftChartBlock = '<div style="margin-top:28px;margin-bottom:28px">'
    + '<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px">'
      + '<span class="t-label">Lift & PR progress</span>'
      + '<span id="liftMeta" class="t-micro tabnum" style="color:var(--text-secondary)"></span>'
    + '</div>'
    + '<div class="exercise-picker-card" id="openExPickerBtn" style="display:flex;justify-content:space-between;align-items:center;background:var(--surface);border:1px solid var(--hairline);border-radius:14px;padding:12px 16px;margin-bottom:14px;cursor:pointer;min-height:56px;gap:12px">'
      + '<div style="flex:1;min-width:0">'
        + '<div id="openExPickerName" style="font-size:15px;font-weight:600;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(curExObj.name) + '</div>'
        + '<div id="openExPickerSub" class="tabnum" style="font-size:11px;color:var(--text-secondary);margin-top:2px">' + curExCount + (curExCount === 1 ? ' session' : ' sessions') + '</div>'
      + '</div>'
      + '<span style="display:inline-flex;align-items:center;color:var(--text-secondary);flex-shrink:0"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg></span>'
    + '</div>'
    + '<select id="liftSelect" style="display:none">'
      + exOptions.map(function(e){ return '<option value="' + e.id + '" ' + (e.id === curExObj.id ? 'selected' : '') + '>' + esc(e.name) + '</option>'; }).join('')
    + '</select>'
    + '<div id="liftSummaryCard"></div>'
    + '<div id="liftMetricSegContainer" style="margin-bottom:14px"></div>'
    + '<div class="seg-range" style="display:flex;gap:24px;align-items:center;margin-bottom:14px">'
      + '<button type="button" class="lift-range-btn active" data-lift-range="4w" style="background:none;border:none;padding:4px 0;font-size:15px;font-weight:600;color:var(--text);border-bottom:2px solid var(--text);cursor:pointer;height:36px">4W</button>'
      + '<button type="button" class="lift-range-btn" data-lift-range="12w" style="background:none;border:none;padding:4px 0;font-size:15px;font-weight:500;color:var(--text-muted);border-bottom:2px solid transparent;cursor:pointer;height:36px">12W</button>'
      + '<button type="button" class="lift-range-btn" data-lift-range="all" style="background:none;border:none;padding:4px 0;font-size:15px;font-weight:500;color:var(--text-muted);border-bottom:2px solid transparent;cursor:pointer;height:36px">All</button>'
    + '</div>'
    + '<div id="liftPlot" data-gesture-owner="chart"></div>'
    + '<div id="liftPersonalBestsCard"></div>'
    + '<div id="liftRecentSessionsFeed"></div>'
    + '</div>';
  var weeklyWorkBlock = '<div style="margin-top:24px">'
    + '<div style="margin-bottom:10px">'
      + '<div style="font-size:17px;font-weight:600;color:var(--text)" aria-label="Weekly work · Sets last 7 days">Weekly sets</div>'
      + '<div style="font-size:var(--fs-13);color:var(--text-secondary);margin-top:2px">Last 7 days · targets vary by muscle</div>'
    + '</div>'
    + weeklyVolumeChart()
    + '</div>';
  var viewContent = mode === 'body' ? ('<div class="app-view">' + bodySection + '</div>') : (mode === 'lifts' ? ('<div class="app-view">' + getResumeWorkoutCardHTML() + liftChartBlock + weeklyWorkBlock + '</div>') : buildHistoryScreenHTML(historySubTab));

  document.getElementById('content').innerHTML =
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px"><span class="t-label">Progress</span><button class="icon-btn" id="settingsBtn" aria-label="Settings">' + ic('settings') + '</button></div>'
    + '<div class="seg-tabs" role="tablist" style="margin-bottom:20px">'
      + '<button class="seg-tab-btn' + (mode === 'body' ? ' active' : '') + '" id="bodyProgressBtn" role="tab" aria-selected="' + (mode === 'body' ? 'true' : 'false') + '">Body</button>'
      + '<button class="seg-tab-btn' + (mode === 'lifts' ? ' active' : '') + '" id="liftProgressBtn" role="tab" aria-selected="' + (mode === 'lifts' ? 'true' : 'false') + '">Lifts</button>'
      + '<button class="seg-tab-btn' + (mode === 'history' ? ' active' : '') + '" id="historyProgressBtn" role="tab" aria-selected="' + (mode === 'history' ? 'true' : 'false') + '">History</button>'
    + '</div>' + viewContent;

  var settingsBtn = document.getElementById('settingsBtn');
  if (settingsBtn) settingsBtn.onclick = function(e) { if (e && e.stopPropagation) e.stopPropagation(); openSettings(); };
  document.getElementById('bodyProgressBtn').onclick = function() { if (mode !== 'body') { triggerHaptic('selection'); renderProgressSimple('body'); } };
  document.getElementById('liftProgressBtn').onclick = function() { if (mode !== 'lifts') { triggerHaptic('selection'); renderProgressSimple('lifts'); } };
  document.getElementById('historyProgressBtn').onclick = function() { if (mode !== 'history') { triggerHaptic('selection'); renderProgressSimple('history'); } };
  var aK = document.getElementById('progAvgKcalNum'), aP = document.getElementById('progAvgProtNum'), aB = document.getElementById('progBodyweightVal');
  var getV = function(el) { return el && el.dataset ? el.dataset.value : (el && el.getAttribute ? el.getAttribute('data-value') : null); };
  if (aK) animateNumber(aK, 0, parseInt(getV(aK), 10) || 0, { duration: 300 }); if (aP) animateNumber(aP, 0, parseInt(getV(aP), 10) || 0, { duration: 300 }); if (aB) animateNumber(aB, 0, parseFloat(getV(aB)) || 0, { duration: 300, decimals: 1 });

  if (mode === 'history') {
    wireHistoryScreenEvents(document.getElementById('content'), function(newTab) { renderProgressSimple('history', newTab); }, function() { renderProgressSimple('history', historySubTab); });
  }

  var contentEl = document.getElementById('content');
  if (contentEl) {
    var touchStartX = 0, touchStartY = 0, startTarget = null;
    contentEl.ontouchstart = function(e) {
      if (profile && (profile.disableSlideNav || profile.disableSwipeNav)) return;
      if (e.touches && e.touches[0]) { startTarget = e.target; touchStartX = e.touches[0].clientX; touchStartY = e.touches[0].clientY; }
    };
    contentEl.ontouchend = function(e) {
      if (profile && (profile.disableSlideNav || profile.disableSwipeNav)) return;
      if (!e.changedTouches || !e.changedTouches[0]) return;
      var res = decideSwipe({
        startTarget: startTarget, startX: touchStartX, startY: touchStartY,
        currentX: e.changedTouches[0].clientX, currentY: e.changedTouches[0].clientY,
        pointers: (e.touches ? e.touches.length : 0) + 1, activeTab: mode,
        scope: SWIPE_NAV_SCOPE, screenWidth: window.innerWidth, targetScrollTop: contentEl.scrollTop
      });
      showGestureDebug('ProgressSwipe: ' + res.action + ' (' + res.reason + ')');
      if (res.action === 'NAVIGATE') {
        if (res.direction === 'LEFT') {
          if (mode === 'body') { triggerHaptic(); renderProgressSimple('lifts'); }
          else if (mode === 'lifts') { triggerHaptic(); renderProgressSimple('history'); }
        } else if (res.direction === 'RIGHT') {
          if (mode === 'history') { triggerHaptic(); renderProgressSimple('lifts'); }
          else if (mode === 'lifts') { triggerHaptic(); renderProgressSimple('body'); }
        }
      }
    };
  }
  document.querySelectorAll('[data-range]').forEach(function(btn){
    btn.onclick = function(){
      triggerHaptic();
      range = btn.dataset.range;
      document.querySelectorAll('[data-range]').forEach(function(b){
        var isAct = (b === btn);
        b.classList.toggle('active', isAct);
        b.style.color = isAct ? '#F5F5F4' : '#55555A';
        b.style.borderBottom = isAct ? '2px solid #F5F5F4' : '2px solid transparent';
        b.style.fontWeight = isAct ? '600' : '500';
      });
      render();
    };
  });
  var saveWeight=document.getElementById('saveProgressWeight'), isSavingWeight = false;
  if(saveWeight) {
    saveWeight.onclick = function() {
      if (isSavingWeight) return;
      var pInp = document.getElementById('progressWeight');
      var value = pInp ? parseFloat((pInp.value || '').trim().replace(',', '.')) : NaN;
      if(!value || isNaN(value) || value < 20 || value > 300) { showToast('Enter a valid weight', 'warn'); return; }
      var now = Date.now(), nowISO = new Date(now).toISOString(), nowMin = nowISO.slice(0, 16);
      profile.weightEntries = profile.weightEntries || [];
      var isDup = profile.weightEntries.some(function(e) {
        return Number(e.weight) === Number(value) && e.dayKey === todayKey() && (e.createdAt || '').slice(0, 16) === nowMin;
      });
      if (isDup) { showToast('Already logged', 'ok'); return; }
      isSavingWeight = true; if (saveWeight.setAttribute) saveWeight.setAttribute('disabled', 'true');
      try {
        profile.weightEntries.push({ id: 'weight_' + now, dayKey: todayKey(), weight: value, createdAt: nowISO });
        sv('rg_profile', profile);
        var r = dayRecord(todayKey()); r.weight = value; saveDayRecord(todayKey(), r);
        triggerHaptic();
        showToast('Weight saved', 'ok');
        renderProgressSimple('body');
      } finally {
        setTimeout(function() { isSavingWeight = false; if (saveWeight && saveWeight.removeAttribute) saveWeight.removeAttribute('disabled'); }, 300);
      }
    };
  }
  var liftSelect=document.getElementById('liftSelect');
  if(liftSelect) {
    liftSelect.onchange = function() {
      selected = liftSelect.value;
      if (typeof window !== 'undefined') window.activeProgressExerciseId = selected;
      render();
    };
  }
  var openPickerBtn = document.getElementById('openExPickerBtn');
  if (openPickerBtn) {
    openPickerBtn.onclick = function() {
      openExercisePickerModal({
        exOptions: exOptions,
        exerciseSessionCounts: exerciseSessionCounts,
        currentSelectedId: selected,
        onSelect: function(newId) {
          selected = newId;
          if (typeof window !== 'undefined') window.activeProgressExerciseId = newId;
          var lc = document.getElementById('liftSelect');
          if (lc) lc.value = newId;
          var pn = document.getElementById('openExPickerName'), ps = document.getElementById('openExPickerSub');
          if (pn) {
            var c = exerciseSessionCounts[newId] || 0, ed = getExerciseData(newId);
            pn.textContent = ed ? ed.name : newId;
            if (ps) ps.textContent = c + (c === 1 ? ' session' : ' sessions');
          }
          render();
        }
      });
    };
  }
  document.querySelectorAll('.lift-range-btn').forEach(function(btn) {
    btn.onclick = function() {
      triggerHaptic('selection'); liftRange = btn.dataset.liftRange;
      document.querySelectorAll('.lift-range-btn').forEach(function(b) {
        var isAct = b.dataset.liftRange === liftRange;
        b.style.color = isAct ? 'var(--text)' : 'var(--text-muted)'; b.style.borderBottom = isAct ? '2px solid var(--text)' : '2px solid transparent'; b.style.fontWeight = isAct ? '600' : '500';
      });
      render();
    };
  });
  document.querySelectorAll('[data-edit-workout-session]').forEach(function(btn){ btn.onclick = function(e){ if (e && e.stopPropagation) e.stopPropagation(); openEditWorkoutSheet(btn.dataset.editWorkoutSession); }; });
  document.querySelectorAll('[data-session-menu]').forEach(function(btn){ btn.onclick = function(e){ if (e && e.stopPropagation) e.stopPropagation(); openSessionMenu(btn.dataset.sessionMenu); }; });
  document.querySelectorAll('[data-quick-edit-set]').forEach(function(btn){
    btn.onclick = function() {
      openQuickEditSetModal({ context: 'history', sessionId: btn.dataset.sessionId, exId: btn.dataset.exId, exName: btn.dataset.exName, setIndex: parseInt(btn.dataset.setIdx, 10), weight: parseFloat(btn.dataset.weight) || 0, reps: parseInt(btn.dataset.reps, 10) || 0, rir: btn.dataset.rir === '' ? null : parseInt(btn.dataset.rir, 10) });
    };
  });
  render();
}

export function renderProgress() {
  return renderProgressSimple();
}
