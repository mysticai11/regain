/* Progress screen: main view container, segmented tabs (Body / Lifts), and settings button */

import { profile, setTab } from "../state.js";
import { dayRecord, saveDayRecord, sv, allDayKeys, getWorkoutSessions } from "../storage.js";
import { getDayTotals, calcE1RM } from "../lib/calc.js";
import { getActiveProgram, getExerciseData, isBodyweightExercise } from "../data/plan.js";
import { esc, todayKey, goalDirection } from "../lib/format.js";
import { ic, triggerHaptic } from "../lib/dom.js";
import { openSettings } from "./settings.js";
import { showToast } from "../components/toast.js";
import { openQuickEditSetModal } from "../components/quick-edit-modal.js";
import { getWeightHistory, getProgressRows, getRollingWeightValues, buildDotConsistencyCalendarHTML, progressPlot, goalTrajectoryText, getLiftHistory } from "./progress/charts.js?v=4";
import { getEquivalentExerciseIds } from "./gym/sets.js";
import { workoutHistoryHTML, getResumeWorkoutCardHTML, nutritionProgressHTML, weeklyVolumeChart, editWeightEntry, deleteWeightEntry, weightEntriesHTML } from "./progress/history.js";
import { openSessionMenu, openEditWorkoutSheet } from "./progress/session-editor.js";
import { buildMonthlyDigestHTML, buildWeeklyDigestHTML } from "./progress/digests.js";
export * from "./progress/charts.js?v=4";
export * from "./progress/history.js";
export * from "./progress/session-editor.js";

function setupChartInteractions(container) {
  if (!container) return;
  var chart = container.querySelector('.chart-container');
  if (!chart) return;
  var svg = chart.querySelector('svg');
  var readout = chart.querySelector('.chart-readout');
  var cursor = chart.querySelector('.chart-scrub-line');
  var defaultText = readout ? readout.innerHTML : '';
  var pointGroups = Array.from(chart.querySelectorAll('.chart-point-group'));
  if (!pointGroups.length || !svg || !readout) return;

  function updatePoint(pt) {
    if (!pt) return;
    var d = pt.dataset;
    var date = d.date || '';
    var val = d.val || '';
    var unit = d.unit || 'kg';
    var avg = d.avg || '';
    var entryId = d.id || '';
    var setDesc = d.setDesc || '';
    var isPr = d.isPr === 'true';
    var prBadge = isPr ? ' <span style="color:#C6F432;font-weight:600;font-size:11px">PR</span>' : '';

    if (setDesc) {
      var metricText = (unit === 'reps') ? '' : (' <span style="font-size:11px;color:#8A8A8E">(Est. 1RM ' + esc(val) + ' ' + esc(unit) + ')</span>');
      readout.innerHTML = esc(date) + ' · <span style="color:#F5F5F4;font-weight:600">' + esc(setDesc) + '</span>' + metricText + prBadge;
    } else {
      var delBtnHTML = entryId ? ' <button type="button" class="btn-text-action chart-del-btn" data-delete-chart-weight="' + esc(entryId) + '" style="color:#FF4D4F;font-size:11px;font-weight:600;margin-left:8px;background:none;border:none;padding:0;cursor:pointer">Delete</button>' : '';
      readout.innerHTML = esc(date) + ' · ' + esc(val) + ' ' + esc(unit) + (avg ? ' <span style="font-size:11px;color:#8A8A8E">(avg ' + esc(avg) + ')</span>' : '') + delBtnHTML;
      var delBtn = readout.querySelector('[data-delete-chart-weight]');
      if (delBtn) {
        delBtn.onclick = function(e) {
          e.stopPropagation();
          deleteWeightEntry(delBtn.dataset.deleteChartWeight);
        };
      }
    }
    var circle = pt.querySelector('circle');
    if (circle && cursor) {
      cursor.setAttribute('x1', circle.getAttribute('cx'));
      cursor.setAttribute('x2', circle.getAttribute('cx'));
      cursor.style.display = 'block';
    }
  }

  function resetPoint() {
    readout.innerHTML = defaultText;
    if (cursor) cursor.style.display = 'none';
  }

  pointGroups.forEach(function(g) {
    g.addEventListener('pointerenter', function() { updatePoint(g); });
    g.addEventListener('click', function(e) { e.stopPropagation(); updatePoint(g); });
  });

  svg.addEventListener('pointerleave', resetPoint);
  document.addEventListener('click', function(e) {
    if (!chart.contains(e.target)) resetPoint();
  });
}

export function renderProgressSimple(mode) {
  mode=mode||'body';
  var entries=getWeightHistory(), records=allDayKeys().map(function(k){var r=dayRecord(k),t=getDayTotals(k);return {key:k,weight:r.weight,kcal:t.kcal,protein:t.protein};});
  var workoutSessions=getWorkoutSessions().filter(function(session){return (session.exercises||[]).some(function(exercise){return (exercise.sets||[]).some(Boolean);});});
  var current=entries.length?entries[entries.length-1].weight:null, range='4w';
  var exOptions=[]; getActiveProgram().forEach(function(s){s.exercises.forEach(function(e){if(!exOptions.some(function(x){return x.id===e.id;}))exOptions.push(e);});});
  allDayKeys().forEach(function(key){Object.keys(dayRecord(key).workout||{}).forEach(function(id){var e=getExerciseData(id);if(e&&!exOptions.some(function(x){return x.id===id;}))exOptions.push(e);});});
  workoutSessions.forEach(function(s){ (s.exercises||[]).forEach(function(e){ if(e&&e.id&&!exOptions.some(function(x){return x.id===e.id;})) exOptions.push({id:e.id, name:e.name||e.id}); }); });
  var render=function(){
    var rangeEntries=getProgressRows(range,entries), weightValues=getRollingWeightValues(rangeEntries,entries);
    var liftControl=document.getElementById('liftSelect');
    var selected=liftControl?liftControl.value:(exOptions.length?exOptions[0].id:null);
    var selectedExData = selected ? getExerciseData(selected) : null;
    var isBW = selected ? isBodyweightExercise(selected, selectedExData ? selectedExData.name : '') : false;
    var liftValues = getLiftHistory(selected);

    var weightPlot=document.getElementById('weightPlot');
    if(weightPlot) {
      weightPlot.innerHTML = progressPlot(weightValues, (profile && profile.targetWeight) || null, 'kg', false);
      setupChartInteractions(weightPlot);
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

    var liftSummaryCard = document.getElementById('liftSummaryCard');
    if (liftSummaryCard) {
      if (liftValues.length > 0) {
        var allTimePeak = liftValues.find(function(v){ return v.isPeak; }) || liftValues[liftValues.length - 1];
        var latestEntry = liftValues[liftValues.length - 1];
        var firstEntry = liftValues[0];
        var gain = latestEntry.value - firstEntry.value;
        var u = isBW ? 'reps' : 'kg';
        var gainStr = (gain >= 0 ? '+' : '') + (isBW ? Math.round(gain) : gain.toFixed(1)) + ' ' + u;
        var gainPct = (firstEntry.value > 0 && gain !== 0) ? ((gain >= 0 ? '+' : '') + ((gain / firstEntry.value) * 100).toFixed(0) + '%') : '';

        liftSummaryCard.innerHTML = '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;background:#141416;border-radius:12px;padding:12px 14px;margin-bottom:12px;text-align:left">'
          + '<div>'
            + '<div class="t-micro" style="color:#C6F432;font-size:11px;letter-spacing:0.04em">Best PR</div>'
            + '<div class="tabnum" style="font-size:28px;font-weight:600;color:#F5F5F4;line-height:1.15;margin-top:2px">' + (isBW ? Math.round(allTimePeak.value) : allTimePeak.value.toFixed(1)) + '<span style="font-size:15px;color:#8A8A8E;font-weight:400;margin-left:2px">' + u + '</span></div>'
            + '<div class="tabnum" style="font-size:11px;color:#8A8A8E;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(allTimePeak.setDesc || '') + '</div>'
          + '</div>'
          + '<div>'
            + '<div class="t-micro" style="color:#8A8A8E;font-size:11px;letter-spacing:0.04em">Latest</div>'
            + '<div class="tabnum" style="font-size:28px;font-weight:600;color:#F5F5F4;line-height:1.15;margin-top:2px">' + (isBW ? Math.round(latestEntry.value) : latestEntry.value.toFixed(1)) + '<span style="font-size:15px;color:#8A8A8E;font-weight:400;margin-left:2px">' + u + '</span></div>'
            + '<div class="tabnum" style="font-size:11px;color:#8A8A8E;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(latestEntry.setDesc || '') + '</div>'
          + '</div>'
          + '<div>'
            + '<div class="t-micro" style="color:#8A8A8E;font-size:11px;letter-spacing:0.04em">Progress</div>'
            + '<div class="tabnum" style="font-size:28px;font-weight:600;color:#F5F5F4;line-height:1.15;margin-top:2px">' + gainStr + '</div>'
            + '<div class="tabnum" style="font-size:11px;color:#8A8A8E;margin-top:2px">' + (gainPct ? (gainPct + ' gain') : 'From start') + '</div>'
          + '</div>'
          + '</div>';
      } else {
        liftSummaryCard.innerHTML = '';
      }
    }

    var liftPlot=document.getElementById('liftPlot');
    if(liftPlot) {
      if (liftValues.length > 0) {
        liftPlot.innerHTML = progressPlot(liftValues, null, isBW ? 'reps' : 'kg', true);
        setupChartInteractions(liftPlot);
      } else {
        liftPlot.innerHTML = '<div style="background:#141416;border-radius:12px;padding:24px 16px;text-align:center;color:#8A8A8E;font-size:15px">No logged sets for this exercise yet.<div style="font-size:11px;color:#55555A;margin-top:4px">Complete workout sets in Gym tab to track PRs here.</div></div>';
      }
    }
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

    var advisorCard = '';
    if (entries.length >= 5 && weeklyRate != null) {
      if (avgCalories >= 2700 && weeklyRate < 0.25) {
        advisorCard = '<div style="font-size:15px;color:#F5F5F4;line-height:1.35;border-top:1px solid #222222;padding-top:10px">'
          + '<span style="font-size:11px;font-weight:600;color:#8A8A8E;text-transform:uppercase;letter-spacing:0.08em;display:block;margin-bottom:2px">Bulking Pace: Slow</span>'
          + 'Eating ~' + avgCalories.toLocaleString() + ' kcal and gaining slowly (' + rateStr + '). Target is +0.25–0.50 kg/wk. Increase intake by +150–200 kcal/day.'
          + '</div>';
      } else if (isRateOnTarget) {
        advisorCard = '<div style="font-size:15px;color:#F5F5F4;line-height:1.35;border-top:1px solid #222222;padding-top:10px">'
          + '<span style="font-size:11px;font-weight:600;color:#8A8A8E;text-transform:uppercase;letter-spacing:0.08em;display:block;margin-bottom:2px">Bulking Pace: On Target</span>'
          + rateStr + ' (target +0.25–0.50 kg/wk) · Est. ' + Math.round(targetW) + ' kg by ' + etaText
          + '</div>';
      } else if (weeklyRate > 0.55) {
        advisorCard = '<div style="font-size:15px;color:#F5F5F4;line-height:1.35;border-top:1px solid #222222;padding-top:10px">'
          + '<span style="font-size:11px;font-weight:600;color:#8A8A8E;text-transform:uppercase;letter-spacing:0.08em;display:block;margin-bottom:2px">Bulking Pace: Fast</span>'
          + 'Gaining ' + rateStr + ' vs +0.25–0.50 kg/wk target. Maintain a clean surplus.'
          + '</div>';
      }
    }

    var weightMeta=document.getElementById('weightMeta');
    if (weightMeta) {
      if (latest != null) {
        var latestAvg = (weightValues.length && weightValues[weightValues.length - 1].avg != null) ? weightValues[weightValues.length - 1].avg : latest;
        var toGoalText = toGoal != null ? ((toGoal > 0 ? '+' : '') + toGoal.toFixed(1) + ' <span style="font-size:15px;color:#8A8A8E;font-weight:400">kg</span>') : '—';
        var rateDisplay = weeklyRate != null ? ((weeklyRate >= 0 ? '+' : '') + weeklyRate.toFixed(2) + ' <span style="font-size:15px;color:#8A8A8E;font-weight:400">kg/wk</span>') : '—';

        weightMeta.innerHTML = '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:16px;text-align:left">'
          + '<div>'
            + '<div class="t-micro" style="color:#8A8A8E;font-size:11px;text-transform:uppercase;letter-spacing:0.04em">7-Day Avg</div>'
            + '<div class="tabnum" style="font-size:28px;font-weight:600;color:#F5F5F4;line-height:1.2;margin-top:2px">' + latestAvg.toFixed(1) + ' <span style="font-size:15px;color:#8A8A8E;font-weight:400">kg</span></div>'
          + '</div>'
          + '<div>'
            + '<div class="t-micro" style="color:#8A8A8E;font-size:11px;text-transform:uppercase;letter-spacing:0.04em">Rate</div>'
            + '<div class="tabnum" style="font-size:28px;font-weight:600;color:#F5F5F4;line-height:1.2;margin-top:2px">' + rateDisplay + '</div>'
          + '</div>'
          + '<div>'
            + '<div class="t-micro" style="color:#8A8A8E;font-size:11px;text-transform:uppercase;letter-spacing:0.04em">To ' + Math.round(targetW) + ' kg</div>'
            + '<div class="tabnum" style="font-size:28px;font-weight:600;color:#F5F5F4;line-height:1.2;margin-top:2px">' + toGoalText + '</div>'
          + '</div>'
          + '</div>'
          + (entries.length < 5
              ? '<div style="font-size:15px;color:#8A8A8E;margin-top:10px">Log 5+ weigh-ins for weekly rate</div>'
              : (advisorCard ? ('<div style="margin-top:12px">' + advisorCard + '</div>') : ''));
      } else {
        weightMeta.innerHTML = '<div style="padding:12px 0;font-size:15px;color:#8A8A8E">No weight entries yet</div>';
      }
    }
    var liftMeta=document.getElementById('liftMeta');
    if(liftMeta) {
      if (liftValues.length > 0) {
        liftMeta.textContent = isBW ? 'Peak reps' : 'Est. 1RM (Epley formula)';
      } else {
        liftMeta.textContent = 'No lift entries yet';
      }
    }
  };
  var bodySection = '<div style="margin-bottom:28px">'
    + '<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px">'
      + '<span class="t-label">Bodyweight</span>'
      + '<span class="t-micro">' + (profile && profile.targetWeight ? ('Target ' + profile.targetWeight + ' kg') : '') + '</span>'
    + '</div>'
    + '<div class="t-display" style="margin-bottom:14px">' + (current != null ? (current.toFixed(1) + '<span style="font-size:15px;color:var(--text-secondary);margin-left:4px">kg</span>') : '<span style="font-size:17px;font-weight:500;color:#8A8A8E">No data yet</span>') + '</div>'
    + '<div class="seg-range" style="display:flex;gap:24px;align-items:center;margin-bottom:16px">'
      + '<button type="button" class="range-btn active" data-range="4w" style="background:none;border:none;padding:4px 0;font-size:15px;font-weight:600;color:#F5F5F4;border-bottom:2px solid #F5F5F4;cursor:pointer">4W</button>'
      + '<button type="button" class="range-btn" data-range="12w" style="background:none;border:none;padding:4px 0;font-size:15px;font-weight:500;color:#55555A;border-bottom:2px solid transparent;cursor:pointer">12W</button>'
      + '<button type="button" class="range-btn" data-range="all" style="background:none;border:none;padding:4px 0;font-size:15px;font-weight:500;color:#55555A;border-bottom:2px solid transparent;cursor:pointer">All</button>'
    + '</div>'
    + '<div id="weightPlot"></div>'
    + '<div id="weightMeta" class="tabnum" style="font-size:15px;color:var(--text-secondary);margin-top:10px;line-height:1.4"></div>'
    + '<div style="display:flex;align-items:center;gap:12px;margin-top:16px">'
      + '<input id="progressWeight" type="number" step="0.1" min="20" max="300" placeholder="Log weight (kg)" inputmode="decimal" style="background:#1C1C1F;border:none;border-radius:12px;height:48px;padding:0 16px;color:#F5F5F4;font-size:17px;font-family:var(--font-display);font-variant-numeric:tabular-nums;flex:1">'
      + '<button type="button" class="btn btn-primary" id="saveProgressWeight" style="height:48px;min-height:48px;padding:0 16px;cursor:pointer">Save</button>'
    + '</div>'
    + '<div id="weightEntriesContainer"></div>'
    + '</div>'
    + '<div style="margin-top:28px">'
      + '<div class="t-label" style="margin-bottom:8px">Nutrition · Last 7 days</div>'
      + nutritionProgressHTML(records)
    + '</div>';
  var liftChartBlock = '<div style="margin-top:32px;margin-bottom:32px">'
    + '<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px">'
      + '<span class="t-label">Lift & PR progress</span>'
      + '<span id="liftMeta" class="t-micro tabnum" style="color:var(--text-secondary)"></span>'
    + '</div>'
    + '<select id="liftSelect" style="background:#1C1C1F;border:none;border-radius:12px;height:48px;padding:0 12px;color:#F5F5F4;font-size:15px;width:100%;margin-bottom:12px">'
      + exOptions.map(function(e){ return '<option value="' + e.id + '">' + esc(e.name) + '</option>'; }).join('')
    + '</select>'
    + '<div id="liftSummaryCard"></div>'
    + '<div id="liftPlot"></div>'
    + '</div>';
  var weeklyWorkBlock = '<div style="margin-top:24px">'
    + '<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:10px">'
      + '<span class="t-label">Weekly work · Sets last 7 days</span>'
      + '<span class="t-micro tabnum" style="color:var(--text-secondary)">Target 10–18</span>'
    + '</div>'
    + weeklyVolumeChart()
    + '</div>';
  var calOffset = Number(window.activeProgressMonthOffset) || 0;
  var calD = new Date(new Date().getFullYear(), new Date().getMonth() + calOffset, 1);
  var monthlyDigestBlock = buildMonthlyDigestHTML(calD.getFullYear(), calD.getMonth()), weeklyDigestBlock = buildWeeklyDigestHTML();

  document.getElementById('content').innerHTML =
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">'
      + '<span class="t-label">Progress</span>'
      + '<button class="icon-btn" id="settingsBtn" aria-label="Settings">' + ic('settings') + '</button>'
    + '</div>'
    + '<div class="seg-tabs" style="margin-bottom:20px">'
      + '<button class="seg-tab-btn' + (mode === 'body' ? ' active' : '') + '" id="bodyProgressBtn">Body</button>'
      + '<button class="seg-tab-btn' + (mode === 'lifts' ? ' active' : '') + '" id="liftProgressBtn">Lifts</button>'
    + '</div>'
    + (mode === 'body'
        ? ('<div class="app-view">' + buildDotConsistencyCalendarHTML() + monthlyDigestBlock + bodySection + weeklyDigestBlock + '</div>')
        : ('<div class="app-view">' + getResumeWorkoutCardHTML() + workoutHistoryHTML() + liftChartBlock + weeklyWorkBlock + '</div>')
      );
  document.getElementById('settingsBtn').onclick=openSettings;
  document.getElementById('bodyProgressBtn').onclick=function(){ if (mode !== 'body') { triggerHaptic(); renderProgressSimple('body'); } };
  document.getElementById('liftProgressBtn').onclick=function(){ if (mode !== 'lifts') { triggerHaptic(); renderProgressSimple('lifts'); } };
  var prevM = document.getElementById('prevProgressMonthBtn');
  if (prevM) prevM.onclick = function() { triggerHaptic(); window.activeProgressMonthOffset = (window.activeProgressMonthOffset || 0) - 1; renderProgressSimple('body'); };
  var nextM = document.getElementById('nextProgressMonthBtn');
  if (nextM) nextM.onclick = function() { triggerHaptic(); window.activeProgressMonthOffset = (window.activeProgressMonthOffset || 0) + 1; renderProgressSimple('body'); };
  document.querySelectorAll('[data-toggle-digest]').forEach(function(el) {
    el.onclick = function() {
      var target = document.getElementById(el.dataset.toggleDigest);
      if (target) target.style.display = (target.style.display === 'none' ? 'block' : 'none');
    };
  });
  document.querySelectorAll('[data-jump-day]').forEach(function(btn) {
    btn.onclick = function() {
      triggerHaptic();
      window.activeTodaySelectedDateKey = btn.dataset.jumpDay;
      setTab('today');
    };
  });
  var contentEl = document.getElementById('content');
  if (contentEl) {
    var touchStartX = 0, touchStartY = 0;
    contentEl.ontouchstart = function(e) {
      if (e.touches && e.touches[0]) { touchStartX = e.touches[0].clientX; touchStartY = e.touches[0].clientY; }
    };
    contentEl.ontouchend = function(e) {
      if (!e.changedTouches || !e.changedTouches[0]) return;
      var dx = e.changedTouches[0].clientX - touchStartX, dy = e.changedTouches[0].clientY - touchStartY;
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        if (dx < 0 && mode === 'body') { triggerHaptic(); renderProgressSimple('lifts'); }
        else if (dx > 0 && mode === 'lifts') { triggerHaptic(); renderProgressSimple('body'); }
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
  var saveWeight=document.getElementById('saveProgressWeight');
  if(saveWeight) {
    saveWeight.onclick = function() {
      var pInp = document.getElementById('progressWeight');
      var value = pInp ? parseFloat((pInp.value || '').trim()) : NaN;
      if(!value || isNaN(value) || value < 20 || value > 300) { showToast('Enter a valid weight', 'warn'); return; }
      profile.weightEntries = profile.weightEntries || [];
      profile.weightEntries.push({ id: 'weight_' + Date.now(), dayKey: todayKey(), weight: value, createdAt: new Date().toISOString() });
      sv('rg_profile', profile);
      var r = dayRecord(todayKey()); r.weight = value; saveDayRecord(todayKey(), r);
      triggerHaptic();
      showToast('Weight saved', 'ok');
      renderProgressSimple('body');
    };
  }
  var liftSelect=document.getElementById('liftSelect'); if(liftSelect) liftSelect.onchange=render;
  document.querySelectorAll('[data-edit-weight]').forEach(function(btn){btn.onclick=function(){editWeightEntry(btn.dataset.editWeight);};});
  document.querySelectorAll('[data-delete-weight]').forEach(function(btn){btn.onclick=function(){deleteWeightEntry(btn.dataset.deleteWeight);};});
  document.querySelectorAll('[data-edit-workout-session]').forEach(function(btn){
    btn.onclick = function(e){
      if (e && e.stopPropagation) e.stopPropagation();
      if (e && e.preventDefault) e.preventDefault();
      openEditWorkoutSheet(btn.dataset.editWorkoutSession);
    };
  });
  document.querySelectorAll('[data-session-menu]').forEach(function(btn){
    btn.onclick = function(e){
      if (e && e.stopPropagation) e.stopPropagation();
      if (e && e.preventDefault) e.preventDefault();
      openSessionMenu(btn.dataset.sessionMenu);
    };
  });
  document.querySelectorAll('[data-quick-edit-set]').forEach(function(btn){
    btn.onclick = function() {
      openQuickEditSetModal({
        context: 'history', sessionId: btn.dataset.sessionId, exId: btn.dataset.exId, exName: btn.dataset.exName,
        setIndex: parseInt(btn.dataset.setIdx, 10), weight: parseFloat(btn.dataset.weight) || 0,
        reps: parseInt(btn.dataset.reps, 10) || 0, rir: btn.dataset.rir === '' ? null : parseInt(btn.dataset.rir, 10)
      });
    };
  });
  render();
}

export function renderProgress() {
  return renderProgressSimple();
}
