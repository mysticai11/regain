/* Progress screen: main view container, segmented tabs (Body / Lifts), and settings button */

import { profile } from "../state.js";
import { dayRecord, saveDayRecord, sv, allDayKeys, getWorkoutSessions } from "../storage.js";
import { getDayTotals, calcE1RM } from "../lib/calc.js";
import { getActiveProgram, getExerciseData, isBodyweightExercise } from "../data/plan.js";
import { esc, todayKey, goalDirection } from "../lib/format.js";
import { ic, triggerHaptic } from "../lib/dom.js";
import { openSettings } from "./settings.js";
import { showToast } from "../components/toast.js";
import { openSheet } from "../components/sheet.js";
import { openQuickEditSetModal } from "../components/quick-edit-modal.js";
import { getWeightHistory, getProgressRows, getRollingWeightValues, buildDotConsistencyCalendarHTML, progressPlot, goalTrajectoryText } from "./progress/charts.js?v=4";
import { getEquivalentExerciseIds } from "./gym/sets.js";
import { workoutHistoryHTML, getResumeWorkoutCardHTML, nutritionProgressHTML, weeklyVolumeChart, editWeightEntry, deleteWeightEntry } from "./progress/history.js";
import { openSessionMenu, openEditWorkoutSheet } from "./progress/session-editor.js";
export * from "./progress/charts.js?v=4";
export * from "./progress/history.js";
export * from "./progress/session-editor.js";

export function renderProgressSimple(mode) {
  mode = mode || 'body';
  var entries = getWeightHistory(), records = allDayKeys().map(function(k){ var r=dayRecord(k),t=getDayTotals(k); return {key:k,weight:r.weight,kcal:t.kcal,protein:t.protein}; });
  var current = entries.length ? entries[entries.length-1].weight : null, range = '1w';

  var exOptions = [];
  getActiveProgram().forEach(function(s){ s.exercises.forEach(function(e){ if(!exOptions.some(function(x){ return x.id===e.id; })) exOptions.push(e); }); });
  allDayKeys().forEach(function(key){ Object.keys(dayRecord(key).workout||{}).forEach(function(id){ var e=getExerciseData(id); if(e&&!exOptions.some(function(x){ return x.id===id; })) exOptions.push(e); }); });
  getWorkoutSessions().forEach(function(session){
    (session.exercises || []).forEach(function(ex){
      var e = getExerciseData(ex.id) || { id: ex.id, name: ex.id };
      if(e && !exOptions.some(function(x){ return x.id===ex.id; })) exOptions.push(e);
    });
  });

  var selected = (typeof window !== 'undefined' && window.__selectedLiftId) || (exOptions.length ? exOptions[0].id : null);

  var render = function() {
    var rangeEntries = getProgressRows(range, entries), weightValues = getRollingWeightValues(rangeEntries, entries);
    var cutoff = range === 'all' ? 0 : Date.now() - ({'1w':7,'1m':30,'3m':90}[range]||30)*86400000;
    var rangeRecords = records.filter(function(r){ return new Date(r.key+'T23:59:59').getTime() >= cutoff; });

    var selectedExData = selected ? getExerciseData(selected) : null;
    var isBW = selected ? isBodyweightExercise(selected, selectedExData ? selectedExData.name : '') : false;
    var eqIds = (typeof getEquivalentExerciseIds === 'function' && selected) ? getEquivalentExerciseIds(selected) : (selected ? [selected] : []);

    // Compute liftValues from both getWorkoutSessions() and dayRecord()
    var liftValues = [];
    var sessionsInRange = getWorkoutSessions().filter(function(s) {
      if (!s.dayKey) return false;
      return new Date(s.dayKey + 'T23:59:59').getTime() >= cutoff;
    });
    var datesWithLifts = {};
    rangeRecords.forEach(function(r){ datesWithLifts[r.key] = true; });
    sessionsInRange.forEach(function(s){ datesWithLifts[s.dayKey] = true; });

    Object.keys(datesWithLifts).sort().forEach(function(dKey) {
      var best = 0;
      sessionsInRange.filter(function(s){ return s.dayKey === dKey; }).forEach(function(session) {
        (session.exercises || []).forEach(function(ex) {
          if (eqIds.includes(ex.id)) {
            (ex.sets || []).forEach(function(s) {
              if (!s) return;
              if (isBW) {
                var reps = Number(s.reps) || 0;
                if (reps > best) best = reps;
              } else {
                var e1 = calcE1RM(s.weight, s.reps);
                if (e1 > best) best = e1;
              }
            });
          }
        });
      });
      var dayWo = dayRecord(dKey).workout || {};
      eqIds.forEach(function(id) {
        (dayWo[id] || []).forEach(function(s) {
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
          value: isBW ? best : +best.toFixed(1),
          label: dKey + ' · ' + (isBW ? (best + ' reps (BW)') : (best.toFixed(1) + ' kg'))
        });
      }
    });

    // Item 10: Weight plot has no lime PR tag (isLift = false)
    var weightPlot = document.getElementById('weightPlot');
    if (weightPlot) weightPlot.innerHTML = progressPlot(weightValues, (profile && profile.targetWeight) || null, 'kg', false);

    // Lifts plot has lime PR tag (isLift = true)
    var liftPlot = document.getElementById('liftPlot');
    if (liftPlot) liftPlot.innerHTML = progressPlot(liftValues, null, isBW ? 'reps' : 'kg', true);

    var latest = weightValues.length ? weightValues[weightValues.length-1].value : null;
    var trend = weightValues.length > 1 ? latest - weightValues[0].value : 0;
    var weeklyRate = null;
    if (entries.length >= 2) {
      var fEntry = entries[0], lEntry = entries[entries.length - 1];
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
    var toGoalText = toGoal != null ? ((toGoal > 0 ? '+' : '') + toGoal.toFixed(1) + ' kg') : '—';

    var recentRecords = records.slice(-7);
    var avgCalories = recentRecords.length ? Math.round(recentRecords.reduce(function(s, r){ return s + (r.kcal || 0); }, 0) / recentRecords.length) : 0;
    var advisorCard = '';
    if (entries.length >= 5 && weeklyRate != null) {
      if (avgCalories >= 2700 && weeklyRate < 0.25) {
        advisorCard = '<div style="background:#1C1C1F;border-radius:12px;padding:12px 14px;margin-top:10px;text-align:left"><div style="font-size:11px;font-weight:600;color:#C6F432;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:2px">Bulking Advisor</div><div style="font-size:15px;color:#F5F5F4;line-height:1.35">Eating ~' + avgCalories.toLocaleString() + ' kcal and gaining slowly (' + rateStr + ')? Target is +0.25–0.50 kg/wk. Increase intake by +150–200 kcal/day to hit growth pace.</div></div>';
      } else if (isRateOnTarget) {
        advisorCard = '<div style="background:#1C1C1F;border-radius:12px;padding:12px 14px;margin-top:10px;text-align:left"><div style="font-size:11px;font-weight:600;color:#C6F432;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:2px">Bulking Pace: On Target</div><div style="font-size:15px;color:#F5F5F4;line-height:1.35">' + rateStr + ' (target +0.25–0.50 kg/wk)</div></div>';
      } else if (weeklyRate > 0.55) {
        advisorCard = '<div style="background:#1C1C1F;border-radius:12px;padding:12px 14px;margin-top:10px;text-align:left"><div style="font-size:11px;font-weight:600;color:#8A8A8E;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:2px">Bulking Pace: Fast</div><div style="font-size:15px;color:#F5F5F4;line-height:1.35">Gaining ' + rateStr + ' vs +0.25–0.50 kg/wk target.</div></div>';
      }
    }

    // Item 12: Stats row: three 28px values with 11px labels above, no card, no clipping
    var weightMeta = document.getElementById('weightMeta');
    if (weightMeta) {
      if (latest != null) {
        weightMeta.innerHTML = '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:20px 0 16px;text-align:left">'
          + '<div><div class="t-micro" style="color:#8A8A8E;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px">7-Day Avg</div><div class="tabnum" style="font-size:28px;font-weight:600;color:#F5F5F4;line-height:1.15;white-space:nowrap">' + latest.toFixed(1) + '<span style="font-size:15px;color:#8A8A8E;margin-left:2px">kg</span></div></div>'
          + '<div><div class="t-micro" style="color:#8A8A8E;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px"><div>Rate</div></div><div class="tabnum" style="font-size:28px;font-weight:600;color:#F5F5F4;line-height:1.15;white-space:nowrap">' + rateStr + '</div></div>'
          + '<div><div class="t-micro" style="color:#8A8A8E;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px">To Goal</div><div class="tabnum" style="font-size:28px;font-weight:600;color:#F5F5F4;line-height:1.15;white-space:nowrap">' + toGoalText + '</div></div>'
          + '</div>'
          + advisorCard;
      } else {
        weightMeta.innerHTML = '<div style="padding:12px 0;font-size:15px;color:#8A8A8E">No weight entries yet</div>';
      }
    }

    // Lift meta line
    var liftMeta = document.getElementById('liftMeta');
    if (liftMeta) {
      var firstLift = liftValues.length ? liftValues[0].value : null;
      var latestLift = liftValues.length ? liftValues[liftValues.length - 1].value : null;
      if (latestLift != null) {
        if (isBW) {
          liftMeta.textContent = latestLift + ' reps (BW) peak' + (firstLift != null && liftValues.length > 1 ? ' · ' + (latestLift - firstLift >= 0 ? '+' : '') + (latestLift - firstLift) + ' reps since start' : '');
        } else {
          liftMeta.textContent = latestLift.toFixed(1) + ' kg e1RM' + (firstLift != null && liftValues.length > 1 ? ' · ' + (latestLift - firstLift >= 0 ? '+' : '') + (latestLift - firstLift).toFixed(1) + ' since start' : '');
        }
      } else {
        liftMeta.textContent = 'No lift entries yet';
      }
    }

    // Item 7: PR list as ListRows (exercise left, "40 kg × 12" right)
    var prList = [];
    var allSessions = getWorkoutSessions(), allDays = allDayKeys();
    exOptions.forEach(function(ex) {
      var exIsBW = isBodyweightExercise(ex.id, ex.name);
      var topWeight = 0, topReps = 0, topE1 = 0;
      var updateBest = function(w, r) {
        var numW = Number(w) || 0, numR = Number(r) || 0;
        if (numR <= 0) return;
        if (exIsBW) {
          if (numR > topReps || (numR === topReps && numW > topWeight)) { topReps = numR; topWeight = numW; }
        } else {
          var e1 = calcE1RM(numW, numR);
          if (e1 > topE1) { topE1 = e1; topWeight = numW; topReps = numR; }
        }
      };
      allSessions.forEach(function(session) {
        (session.exercises || []).forEach(function(e) {
          if (e.id === ex.id) (e.sets || []).forEach(function(s) { if (s) updateBest(s.weight, s.reps); });
        });
      });
      allDays.forEach(function(k) {
        var dWo = dayRecord(k).workout || {};
        (dWo[ex.id] || []).forEach(function(s) { if (s) updateBest(s.weight, s.reps); });
      });
      if (topReps > 0) {
        var prStr = exIsBW ? ((topWeight > 0 ? ('BW+' + topWeight + ' kg × ') : '') + topReps + ' reps') : (topWeight + ' kg × ' + topReps);
        prList.push({ name: ex.name, pr: prStr, id: ex.id });
      }
    });

    var prContainer = document.getElementById('prListContainer');
    if (prContainer) {
      prContainer.innerHTML = prList.length ? ('<div style="margin-top:28px"><div class="t-label" style="margin-bottom:8px">Personal records</div>'
        + prList.map(function(item) {
          return '<div class="list-row" style="display:flex;justify-content:space-between;align-items:center;min-height:56px;padding:0;border-bottom:1px solid #1C1C1F">'
            + '<span style="font-size:15px;font-weight:500;color:#F5F5F4">' + esc(item.name) + '</span>'
            + '<span class="tabnum" style="font-size:15px;color:#8A8A8E">' + esc(item.pr) + '</span>'
            + '</div>';
        }).join('') + '</div>') : '';
    }
  };

  var bodySection = '<div style="margin-bottom:28px">'
    + '<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px">'
      + '<span class="t-label">Bodyweight</span>'
      + '<span class="t-micro">' + (profile && profile.targetWeight ? ('Target ' + profile.targetWeight + ' kg') : '') + '</span>'
    + '</div>'
    + '<div class="t-display" style="margin-bottom:14px">' + (current != null ? (current.toFixed(1) + '<span style="font-size:15px;color:var(--text-secondary);margin-left:4px">kg</span>') : '<span style="font-size:17px;font-weight:500;color:#8A8A8E">No data yet</span>') + '</div>'
    + '<div class="seg-range" style="display:flex;gap:24px;align-items:center;margin-bottom:16px">'
      + '<button type="button" class="range-btn active" data-range="1w" style="background:none;border:none;padding:4px 0;font-size:15px;font-weight:600;color:#F5F5F4;border-bottom:2px solid #F5F5F4;cursor:pointer">4W</button>'
      + '<button type="button" class="range-btn" data-range="1m" style="background:none;border:none;padding:4px 0;font-size:15px;font-weight:500;color:#55555A;border-bottom:2px solid transparent;cursor:pointer">12W</button>'
      + '<button type="button" class="range-btn" data-range="all" style="background:none;border:none;padding:4px 0;font-size:15px;font-weight:500;color:#55555A;border-bottom:2px solid transparent;cursor:pointer">All</button>'
    + '</div>'
    + '<div id="weightPlot"></div>'
    + '<div id="weightMeta" class="tabnum" style="font-size:15px;color:var(--text-secondary);margin-top:10px;line-height:1.4"></div>'
    + '<div style="display:flex;align-items:center;gap:12px;margin-top:16px">'
      + '<input id="progressWeight" type="number" step="0.1" min="20" max="300" placeholder="Log weight (kg)" inputmode="decimal" style="background:#1C1C1F;border:none;border-radius:12px;height:48px;padding:0 16px;color:#F5F5F4;font-size:17px;font-family:var(--font-display);font-variant-numeric:tabular-nums;flex:1">'
      + '<button type="button" class="btn btn-primary" id="saveProgressWeight" style="height:48px;min-height:48px;padding:0 16px;cursor:pointer">Save</button>'
    + '</div>'
    + '</div>'
    + '<div style="margin-top:28px">'
      + '<div class="t-label" style="margin-bottom:8px">Nutrition · Last 7 days</div>'
      + nutritionProgressHTML(records)
    + '</div>';

  var selectedExName = (exOptions.find(function(e){ return e.id === selected; }) || {}).name || (exOptions[0] ? exOptions[0].name : 'Select exercise');

  // Item 7: Lifts shows exercise picker (Sheet), 120px e1RM line chart, PR list as ListRows, weekly work
  var liftSection = '<div style="margin-bottom:32px">'
    + '<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px">'
      + '<span class="t-label">Lift progress</span>'
      + '<span id="liftMeta" class="t-micro tabnum" style="color:var(--text-secondary)"></span>'
    + '</div>'
    + '<button type="button" id="openLiftSheetBtn" style="background:#1C1C1F;border:none;border-radius:12px;height:48px;padding:0 16px;color:#F5F5F4;font-size:15px;font-weight:500;width:100%;display:flex;justify-content:space-between;align-items:center;cursor:pointer;margin-bottom:12px">'
      + '<span id="liftSelectedText">' + esc(selectedExName) + '</span>'
      + '<span style="color:#8A8A8E;font-size:11px">▼</span>'
    + '</button>'
    + '<select id="liftSelect" style="display:none">'
      + exOptions.map(function(e){ return '<option value="' + e.id + '"' + (e.id === selected ? ' selected' : '') + '>' + esc(e.name) + '</option>'; }).join('')
    + '</select>'
    + '<div id="liftPlot"></div>'
    + '<div id="prListContainer"></div>'
    + '</div>'
    + '<div style="margin-top:32px">'
      + '<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:12px">'
        + '<span class="t-label">WEEKLY WORK</span>'
        + '<span class="t-micro tabnum" style="color:var(--text-secondary);text-transform:uppercase">LAST 7 DAYS · TARGET 10–18</span>'
      + '</div>'
      + weeklyVolumeChart()
    + '</div>';

  // Item 13: Body and Lifts share only header and segmented tab control
  document.getElementById('content').innerHTML =
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">'
      + '<span class="t-label">Progress</span>'
      + '<button class="icon-btn" id="settingsBtn" aria-label="Settings">' + ic('settings') + '</button>'
    + '</div>'
    + '<div class="seg-tabs">'
      + '<button class="seg-tab-btn' + (mode === 'body' ? ' active' : '') + '" id="bodyProgressBtn">Body</button>'
      + '<button class="seg-tab-btn' + (mode === 'lifts' ? ' active' : '') + '" id="liftProgressBtn">Lifts</button>'
    + '</div>'
    + (mode === 'body' ? (getResumeWorkoutCardHTML() + buildDotConsistencyCalendarHTML() + bodySection + '<div style="margin-top:24px">' + workoutHistoryHTML() + '</div>') : liftSection);

  document.getElementById('settingsBtn').onclick = openSettings;
  document.getElementById('bodyProgressBtn').onclick = function(){ renderProgressSimple('body'); };
  document.getElementById('liftProgressBtn').onclick = function(){ renderProgressSimple('lifts'); };

  var openLiftBtn = document.getElementById('openLiftSheetBtn');
  if (openLiftBtn) {
    openLiftBtn.onclick = function() {
      var sheetRows = exOptions.map(function(e) {
        var isCur = (e.id === selected);
        return '<div class="list-row" data-choose-lift="' + esc(e.id) + '" style="min-height:56px;display:flex;justify-content:space-between;align-items:center;cursor:pointer;border-bottom:1px solid #1C1C1F">'
          + '<span style="font-size:17px;color:#F5F5F4;' + (isCur ? 'font-weight:600' : '') + '">' + esc(e.name) + '</span>'
          + (isCur ? '<span style="color:#F5F5F4;font-size:17px">✓</span>' : '')
          + '</div>';
      }).join('');
      openSheet('<div class="sheet-title" style="font-size:28px;font-weight:600;color:#F5F5F4;margin-bottom:16px">Choose Exercise</div><div style="max-height:360px;overflow-y:auto">' + sheetRows + '</div>');
      document.querySelectorAll('[data-choose-lift]').forEach(function(row) {
        row.onclick = function() {
          var chosenId = row.dataset.chooseLift;
          window.__selectedLiftId = chosenId;
          selected = chosenId;
          var lSel = document.getElementById('liftSelect');
          if (lSel) lSel.value = chosenId;
          var tEl = document.getElementById('liftSelectedText');
          var exObj = exOptions.find(function(x){ return x.id === chosenId; });
          if (tEl && exObj) tEl.textContent = exObj.name;
          var cBtn = document.getElementById('closeSheetBtn');
          if (cBtn) cBtn.click();
          render();
        };
      });
    };
  }

  // Item 6: Tapping a dot shows small readout that dismisses on next tap
  document.querySelectorAll('.dot-cell').forEach(function(dot) {
    dot.onclick = function(e) {
      if (e && e.stopPropagation) e.stopPropagation();
      var readoutEl = document.getElementById('gridDotReadout');
      if (!readoutEl) return;
      var text = dot.getAttribute('data-readout');
      if (!text) return;
      if (readoutEl.style.display !== 'none' && readoutEl.getAttribute('data-active-key') === dot.getAttribute('data-date')) {
        readoutEl.style.display = 'none';
        readoutEl.removeAttribute('data-active-key');
      } else {
        readoutEl.textContent = text;
        readoutEl.setAttribute('data-active-key', dot.getAttribute('data-date'));
        readoutEl.style.display = 'block';
      }
    };
  });
  document.addEventListener('click', function() {
    var readoutEl = document.getElementById('gridDotReadout');
    if (readoutEl) {
      readoutEl.style.display = 'none';
      readoutEl.removeAttribute('data-active-key');
    }
  });

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

  var saveWeight = document.getElementById('saveProgressWeight');
  if (saveWeight) {
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

  var liftSelect = document.getElementById('liftSelect');
  if (liftSelect) liftSelect.onchange = render;
  document.querySelectorAll('[data-edit-weight]').forEach(function(btn){ btn.onclick = function(){ editWeightEntry(btn.dataset.editWeight); }; });
  document.querySelectorAll('[data-delete-weight]').forEach(function(btn){ btn.onclick = function(){ deleteWeightEntry(btn.dataset.deleteWeight); }; });
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
