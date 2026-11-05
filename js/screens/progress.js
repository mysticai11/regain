/* Progress screen: main view container, segmented tabs (Body / Lifts), and settings button */

import { profile } from "../state.js";
import { dayRecord, saveDayRecord, sv, allDayKeys, getWorkoutSessions } from "../storage.js";
import { getDayTotals, calcE1RM } from "../lib/calc.js";
import { getActiveProgram, getExerciseData, isBodyweightExercise } from "../data/plan.js";
import { esc, todayKey, goalDirection } from "../lib/format.js";
import { ic, triggerHaptic } from "../lib/dom.js";
import { openSettings } from "./settings.js";
import { showToast } from "../components/toast.js";
import { openQuickEditSetModal } from "../components/quick-edit-modal.js";
import { getWeightHistory, getProgressRows, getRollingWeightValues, buildDotConsistencyCalendarHTML, progressPlot, goalTrajectoryText } from "./progress/charts.js?v=4";
import { getEquivalentExerciseIds } from "./gym/sets.js";
import { workoutHistoryHTML, getResumeWorkoutCardHTML, nutritionProgressHTML, weeklyVolumeChart, editWeightEntry, deleteWeightEntry, weightEntriesHTML } from "./progress/history.js";
import { openSessionMenu, openEditWorkoutSheet } from "./progress/session-editor.js";
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
    var delBtnHTML = entryId ? ' <button type="button" class="btn-text-action chart-del-btn" data-delete-chart-weight="' + esc(entryId) + '" style="color:#FF4D4F;font-size:11px;font-weight:600;margin-left:8px;background:none;border:none;padding:0;cursor:pointer">Delete</button>' : '';
    readout.innerHTML = esc(date) + ' · ' + esc(val) + ' ' + esc(unit) + (avg ? ' <span style="font-size:11px;color:#8A8A8E">(avg ' + esc(avg) + ')</span>' : '') + delBtnHTML;
    var delBtn = readout.querySelector('[data-delete-chart-weight]');
    if (delBtn) {
      delBtn.onclick = function(e) {
        e.stopPropagation();
        deleteWeightEntry(delBtn.dataset.deleteChartWeight);
      };
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
  var render=function(){
    var rangeEntries=getProgressRows(range,entries), weightValues=getRollingWeightValues(rangeEntries,entries);
    var cutoff = range === 'all' ? 0 : Date.now() - ({'1w':7,'1m':30,'3m':90}[range]||30)*86400000;
    var rangeRecords=records.filter(function(r){return new Date(r.key+'T23:59:59').getTime()>=cutoff;});
    var liftControl=document.getElementById('liftSelect');
    var selected=liftControl?liftControl.value:null, liftValues=[];
    var selectedExData = selected ? getExerciseData(selected) : null;
    var isBW = selected ? isBodyweightExercise(selected, selectedExData ? selectedExData.name : '') : false;
    var eqIds = (typeof getEquivalentExerciseIds === 'function' && selected) ? getEquivalentExerciseIds(selected) : (selected ? [selected] : []);

    rangeRecords.forEach(function(r){
      var best = 0;
      var dayWo = dayRecord(r.key).workout || {};
      eqIds.forEach(function(id){
        (dayWo[id] || []).forEach(function(s){
          if (!s) return;
          if (isBW) {
            var reps = Number(s.reps) || 0;
            if (reps > best) best = reps;
          } else {
            var e1 = calcE1RM(s.weight, s.reps);
            if (e1 > best) best = e1;
          }
        });
      });
      if (best > 0) {
        liftValues.push({
          value: best,
          label: r.key + ' · ' + (isBW ? (best + ' reps (BW)') : (best.toFixed(1) + ' kg'))
        });
      }
    });

    var allLiftValues=[];
    rangeRecords.forEach(function(r){
      var total=0,count=0;
      Object.keys(dayRecord(r.key).workout||{}).forEach(function(id){
        var best=0;
        var exIsBW = isBodyweightExercise(id);
        (dayRecord(r.key).workout[id]||[]).forEach(function(s){
          if(s){
            if (exIsBW) {
              var rVal = Number(s.reps) || 0;
              if (rVal > best) best = rVal;
            } else {
              var e1 = calcE1RM(s.weight,s.reps);
              if (e1 > best) best = e1;
            }
          }
        });
        if(best){total+=best;count++;}
      });
      if(count)allLiftValues.push({value:total/count,label:r.key});
    });

    var first=allLiftValues.length?allLiftValues[0].value:1;
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
    var liftPlot=document.getElementById('liftPlot');
    if(liftPlot) {
      liftPlot.innerHTML = progressPlot(liftValues, null, isBW ? 'reps' : 'kg', true);
      setupChartInteractions(liftPlot);
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
      var firstLift=liftValues.length?liftValues[0].value:null, latestLift=liftValues.length?liftValues[liftValues.length-1].value:null;
      if (latestLift != null) {
        if (isBW) {
          liftMeta.textContent = latestLift + ' reps (BW) peak' + (firstLift!=null&&liftValues.length>1 ? ' · ' + (latestLift-firstLift>=0?'+':'') + (latestLift-firstLift) + ' reps since start' : '');
        } else {
          liftMeta.textContent = latestLift.toFixed(1) + ' kg e1RM' + (firstLift!=null&&liftValues.length>1 ? ' · ' + (latestLift-firstLift>=0?'+':'') + (latestLift-firstLift).toFixed(1) + ' since start' : '');
        }
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
  var liftSection = '<div style="margin-bottom:32px">'
    + '<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px">'
      + '<span class="t-label">Lift progress</span>'
      + '<span id="liftMeta" class="t-micro tabnum" style="color:var(--text-secondary)"></span>'
    + '</div>'
    + '<select id="liftSelect" style="background:#1C1C1F;border:none;border-radius:12px;height:48px;padding:0 12px;color:#F5F5F4;font-size:15px;width:100%;margin-bottom:12px">'
      + exOptions.map(function(e){ return '<option value="' + e.id + '">' + esc(e.name) + '</option>'; }).join('')
    + '</select>'
    + '<div id="liftPlot"></div>'
    + '</div>'
    + '<div style="margin-top:32px">'
      + '<div class="t-label" style="margin-bottom:12px">Weekly work · Sets last 7 days · target 10–18</div>'
      + weeklyVolumeChart()
    + '</div>';
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
        ? ('<div class="app-view">' + buildDotConsistencyCalendarHTML() + bodySection + '</div>')
        : ('<div class="app-view">' + getResumeWorkoutCardHTML() + liftSection + '<div style="margin-top:24px">' + workoutHistoryHTML() + '</div></div>')
      );
  document.getElementById('settingsBtn').onclick=openSettings;
  document.getElementById('bodyProgressBtn').onclick=function(){ if (mode !== 'body') renderProgressSimple('body'); };
  document.getElementById('liftProgressBtn').onclick=function(){ if (mode !== 'lifts') renderProgressSimple('lifts'); };
  document.querySelectorAll('[data-range]').forEach(function(btn){
    btn.onclick = function(){
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
