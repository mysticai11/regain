/* Progress screen: main view container, segmented tabs (Body / Lifts), and settings button */

import { dayRecord, allDayKeys, getWorkoutSessions } from "../storage.js";
import { getDayTotals, calcE1RM } from "../lib/calc.js";
import { getActiveProgram, getExerciseData, isBodyweightExercise } from "../data/plan.js";
import { esc, todayKey, goalDirection } from "../lib/format.js";
import { ic } from "../lib/dom.js";
import { openSettings } from "./settings.js";
import { openQuickEditSetModal } from "../components/quick-edit-modal.js";
import { getWeightHistory, getProgressRows, getRollingWeightValues, buildDotConsistencyCalendarHTML, progressPlot, goalTrajectoryText } from "./progress/charts.js";
import { getEquivalentExerciseIds } from "./gym/sets.js";
import { workoutHistoryHTML, nutritionProgressHTML, weeklyVolumeChart } from "./progress/history.js";
export * from "./progress/charts.js";
export * from "./progress/history.js";

export function renderProgressSimple(mode) {
  mode=mode||'body';
  var entries=getWeightHistory(), records=allDayKeys().map(function(k){var r=dayRecord(k),t=getDayTotals(k);return {key:k,weight:r.weight,kcal:t.kcal,protein:t.protein};});
  var workoutSessions=getWorkoutSessions().filter(function(session){return (session.exercises||[]).some(function(exercise){return (exercise.sets||[]).some(Boolean);});});
  var current=entries.length?entries[entries.length-1].weight:null, range='1w';
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
    var weightPlot=document.getElementById('weightPlot'); if(weightPlot) weightPlot.innerHTML=progressPlot(weightValues, (profile && profile.targetWeight) || null);
    var liftPlot=document.getElementById('liftPlot'); if(liftPlot) liftPlot.innerHTML=progressPlot(liftValues, null, isBW ? 'reps' : 'kg');
    var direction=goalDirection(), latest=weightValues.length?weightValues[weightValues.length-1].value:null;
    var trend=weightValues.length>1?latest-weightValues[0].value:0;
    var status=weightValues.length>1?(direction*trend>0?'moving toward goal':direction*trend<0?'moving away from goal':'flat'):'need more entries';
    var weightMeta=document.getElementById('weightMeta'); if(weightMeta) weightMeta.innerHTML=latest!=null?(latest+' kg 7-day avg · goal '+(profile.targetWeight||'—')+' kg · '+status+'<br><span class="progress-summary">'+esc(goalTrajectoryText(entries))+'</span>'):'No weight entries yet';
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
    + '<div class="t-display" style="margin-bottom:14px">' + (current != null ? current.toFixed(1) : '—') + '<span style="font-size:15px;color:var(--text-secondary);margin-left:4px">kg</span></div>'
    + '<div class="seg-range" style="display:flex;gap:24px;align-items:center;margin-bottom:16px">'
      + '<button type="button" class="range-btn active" data-range="1w" style="background:none;border:none;padding:4px 0;font-size:15px;font-weight:600;color:#F5F5F4;border-bottom:2px solid #F5F5F4;cursor:pointer">4W</button>'
      + '<button type="button" class="range-btn" data-range="1m" style="background:none;border:none;padding:4px 0;font-size:15px;font-weight:500;color:#55555A;border-bottom:2px solid transparent;cursor:pointer">12W</button>'
      + '<button type="button" class="range-btn" data-range="all" style="background:none;border:none;padding:4px 0;font-size:15px;font-weight:500;color:#55555A;border-bottom:2px solid transparent;cursor:pointer">All</button>'
    + '</div>'
    + '<div id="weightPlot"></div>'
    + '<div id="weightMeta" class="tabnum" style="font-size:15px;color:var(--text-secondary);margin-top:10px;line-height:1.4"></div>'
    + '<div style="display:flex;align-items:center;gap:12px;margin-top:16px">'
      + '<input id="progressWeight" type="number" step="0.1" min="20" max="300" placeholder="Log weight (kg)" inputmode="decimal" style="background:#1C1C1F;border:none;border-radius:12px;height:48px;padding:0 16px;color:#F5F5F4;font-size:17px;font-family:var(--font-display);font-variant-numeric:tabular-nums;flex:1">'
      + '<button type="button" class="btn-text-action" id="saveProgressWeight" style="display:none;font-size:15px;font-weight:600;color:#F5F5F4;background:none;border:none;height:48px;padding:0 8px;cursor:pointer">Save</button>'
    + '</div>'
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
    + '<div class="seg-tabs">'
      + '<button class="seg-tab-btn' + (mode === 'body' ? ' active' : '') + '" id="bodyProgressBtn">Body</button>'
      + '<button class="seg-tab-btn' + (mode === 'lifts' ? ' active' : '') + '" id="liftProgressBtn">Lifts</button>'
    + '</div>'
    + buildDotConsistencyCalendarHTML()
    + (mode === 'body' ? bodySection : liftSection)
    + '<div style="margin-top:32px">'
      + '<div class="t-label" style="margin-bottom:12px">Workout history · ' + workoutSessions.length + (workoutSessions.length === 1 ? ' session' : ' sessions') + '</div>'
      + workoutHistoryHTML()
    + '</div>';
  document.getElementById('settingsBtn').onclick=openSettings;
  document.getElementById('bodyProgressBtn').onclick=function(){renderProgressSimple('body');};
  document.getElementById('liftProgressBtn').onclick=function(){renderProgressSimple('lifts');};
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
  var pWInput = document.getElementById('progressWeight');
  var pWSave = document.getElementById('saveProgressWeight');
  if (pWInput && pWSave) {
    pWInput.addEventListener('input', function(){
      pWSave.style.display = pWInput.value.trim() ? 'inline-flex' : 'none';
    });
  }
  var liftSelect=document.getElementById('liftSelect'); if(liftSelect) liftSelect.onchange=render;
  document.querySelectorAll('[data-edit-weight]').forEach(function(btn){btn.onclick=function(){editWeightEntry(btn.dataset.editWeight);};});
  document.querySelectorAll('[data-delete-weight]').forEach(function(btn){btn.onclick=function(){deleteWeightEntry(btn.dataset.deleteWeight);};});
  document.querySelectorAll('[data-duration-session]').forEach(function(btn){
    btn.onclick=function(){
      var session=workoutSessions.find(function(item){return item.id===btn.dataset.durationSession;});
      if(session) setManualSessionDuration(session.dayKey, session, session.programDay);
    };
  });
  document.querySelectorAll('[data-delete-workout-session]').forEach(function(btn){
    btn.onclick = function(){ deleteWorkoutSession(btn.dataset.deleteWorkoutSession); };
  });
  document.querySelectorAll('[data-edit-date-day]').forEach(function(btn){
    btn.onclick = function(e){ if(e && e.stopPropagation) e.stopPropagation(); openEditDateAndDayModal(btn.dataset.editDateDay); };
  });
  document.querySelectorAll('[data-edit-workout-session]').forEach(function(btn){
    btn.onclick = function(e){
      if (e) {
        if (e.stopPropagation) e.stopPropagation();
        if (e.preventDefault) e.preventDefault();
      }
      openEditWorkoutSheet(btn.dataset.editWorkoutSession);
    };
  });
  document.querySelectorAll('[data-quick-edit-set]').forEach(function(btn){
    btn.onclick = function() {
      openQuickEditSetModal({
        context: 'history',
        sessionId: btn.dataset.sessionId,
        exId: btn.dataset.exId,
        exName: btn.dataset.exName,
        setIndex: parseInt(btn.dataset.setIdx, 10),
        weight: parseFloat(btn.dataset.weight) || 0,
        reps: parseInt(btn.dataset.reps, 10) || 0,
        rir: btn.dataset.rir === '' ? null : parseInt(btn.dataset.rir, 10)
      });
    };
  });
  var saveWeight=document.getElementById('saveProgressWeight'); if(saveWeight) saveWeight.onclick=function(){var value=parseFloat(document.getElementById('progressWeight').value);if(!value||value<20||value>300){showToast('Enter a valid weight','warn');return;}profile.weightEntries=profile.weightEntries||[];profile.weightEntries.push({id:'weight_'+Date.now(),dayKey:todayKey(),weight:value,createdAt:new Date().toISOString()});sv('rg_profile',profile);var r=dayRecord(todayKey());r.weight=value;saveDayRecord(todayKey(),r);showToast('Bodyweight saved','ok');renderProgressSimple('body');};
  render();
}

export function renderProgress() {
  var keys = allDayKeys();
  var records = keys.map(function(k){
    var r = dayRecord(k); var t = getDayTotals(k);
    return {key:k,weight:r.weight,readiness:r.readiness,kcal:t.kcal,protein:t.protein,carbs:t.carbs,fat:t.fat};
  });

  // Calculate weighted average targets for the past 7 days for the dashboard
  var last7 = records.slice(-7);
  var sumCt = 0, sumPt = 0;
  last7.forEach(function(r){
    var t = getTargetsForDate(r.key);
    sumCt += t.kcal; sumPt += t.protein;
  });
  var avgCt = last7.length ? Math.round(sumCt / last7.length) : CAL_TARGET_REST;
  var avgPt = last7.length ? Math.round(sumPt / last7.length) : PROT_TARGET_REST;
  var ct = avgCt; // for rendering
  var pt = avgPt; // for rendering

  // Weekly weight averages
  var weeklyWeights = [];
  for(var i=0;i<records.length;i+=7){
    var chunk=records.slice(i,i+7).filter(function(r){return r.weight!=null;});
    if(chunk.length) weeklyWeights.push(+(chunk.reduce(function(s,r){return s+r.weight;},0)/chunk.length).toFixed(2));
  }

  var withW = records.filter(function(r){return r.weight!=null;});
  var curW = withW.length?withW[withW.length-1].weight:null;
  var startW = parseFloat(ls('rg_profile',{}).startWeight||54);
  var delta = curW!=null ? curW-startW : null;

  // Regression on weekly weights
  var reg = weeklyWeights.length>=3 ? linReg(weeklyWeights) : null;
  var weeklyGainPct = reg ? reg.slope/weeklyWeights[0]*100 : null;
  var inRange = weeklyGainPct!=null && weeklyGainPct>=GAIN_LOW/startW*100*0.6 && weeklyGainPct<=GAIN_HIGH/startW*100*1.4;

  // Streak + avg kcal this week
  var streak = computeStreak();
  var last7 = records.slice(-7);
  var avgKcal7 = last7.length ? Math.round(last7.reduce(function(s,r){return s+r.kcal;},0)/last7.length) : 0;

  var measurements = profile.measurements || [];
  var photos = profile.photos || [];

  var measHTML = '<div class="section"><div class="section-head"><span class="eyebrow">body measurements (cm)</span><button class="btn-ghost" id="addMeasBtn">log new</button></div>';
  if(measurements.length) {
    measHTML += '<div style="display:flex;gap:12px;overflow-x:auto;padding-bottom:8px">';
    measurements.slice(-5).forEach(function(m){
      measHTML += '<div style="background:var(--surface);padding:10px;border-radius:10px;min-width:120px;font-size:15px"><div class="eyebrow" style="margin-bottom:6px">'+new Date(m.date).toLocaleDateString([],{month:'short',day:'numeric'})+'</div>'
        +'<div style="display:flex;justify-content:space-between;margin-bottom:2px"><span class="dim">Chest</span><span>'+(m.chest||'–')+'</span></div>'
        +'<div style="display:flex;justify-content:space-between;margin-bottom:2px"><span class="dim">Arms</span><span>'+(m.arms||'–')+'</span></div>'
        +'<div style="display:flex;justify-content:space-between;margin-bottom:2px"><span class="dim">Waist</span><span>'+(m.waist||'–')+'</span></div>'
        +'<div style="display:flex;justify-content:space-between"><span class="dim">Thighs</span><span>'+(m.thighs||'–')+'</span></div></div>';
    });
    measHTML += '</div>';
  } else {
    measHTML += '<div class="chart-empty">Log measurements every 2 weeks</div>';
  }
  measHTML += '</div>';

  var photoHTML = '<div class="section"><div class="section-head"><span class="eyebrow">progress photos</span><button class="btn-ghost" id="addPhotoBtn">upload</button></div>';
  if(photos.length) {
    photoHTML += '<div style="display:flex;gap:10px;overflow-x:auto;padding-bottom:8px">';
    photos.slice(-5).forEach(function(p){
      photoHTML += '<div style="flex-shrink:0;width:100px"><img src="'+p.srcBase64+'" style="width:100px;height:100px;object-fit:cover;border-radius:10px;border:1px solid var(--border)"><div class="eyebrow" style="text-align:center;margin-top:4px">'+new Date(p.date).toLocaleDateString([],{month:'short',day:'numeric'})+'</div></div>';
    });
    photoHTML += '</div>';
  } else {
    photoHTML += '<div class="chart-empty">Take your first progress photo</div>';
  }
  photoHTML += '<input type="file" id="photoInput" accept="image/*" style="display:none"></div>';

  var notesHTML = '';
  var recentNotes = [];
  records.forEach(function(r){
    var dayRec = dayRecord(r.key);
    if(dayRec.note) {
      recentNotes.push({date: r.key, note: dayRec.note, weight: dayRec.weight});
    }
  });
  if (recentNotes.length > 0) {
    notesHTML += '<div class="section"><span class="eyebrow">daily notes log</span>'
      +'<div style="max-height:200px;overflow-y:auto;background:var(--surface);border-radius:10px;padding:12px;display:flex;flex-direction:column;gap:8px;border:1px solid var(--border)">';
    recentNotes.reverse().slice(0, 10).forEach(function(n){
      notesHTML += '<div style="font-size:11px;border-bottom:1px solid rgba(255,255,255,0.05);padding-bottom:6px">'
        +'<div style="display:flex;justify-content:space-between;margin-bottom:2px">'
          +'<span class="tabnum" style="color:var(--text-muted)">' + new Date(n.date + 'T00:00:00').toLocaleDateString([], {month:'short', day:'numeric'}) + '</span>'
          +(n.weight ? '<span class="tabnum" style="color:var(--text)">' + n.weight + ' kg</span>' : '')
        +'</div>'
        +'<div style="color:var(--text-secondary);font-style:italic">"' + n.note + '"</div>'
        +'</div>';
    });
    notesHTML += '</div></div>';
  }

  var targetW = profile.targetWeight || 60.0;
  var goalText = 'Log weight regularly to estimate target date';
  if(weeklyWeights.length >= 2) {
    var slope = reg ? reg.slope : 0;
    if(slope === 0 && weeklyWeights.length >= 2) {
      slope = weeklyWeights[weeklyWeights.length-1] - weeklyWeights[0];
      var wWeeks = Math.max(1, weeklyWeights.length - 1);
      slope = slope / wWeeks;
    }
    
    if(slope > 0 && curW) {
      var weeksLeft = (targetW - curW) / slope;
      if (weeksLeft > 0) {
        var today = new Date();
        var hitDate = new Date(today.getTime() + weeksLeft * 7 * 24 * 60 * 60 * 1000);
        goalText = 'Est. ' + weeksLeft.toFixed(1) + ' wks left (around ' + hitDate.toLocaleDateString([], {month:'short', day:'numeric'}) + ')';
      } else {
        goalText = 'Goal reached';
      }
    } else {
      goalText = goalDirection()<0 ? 'Trend is not moving toward your loss goal' : 'Trend is not moving toward your gain goal';
    }
  } else if (curW) {
    goalText = 'Goal: ' + targetW + 'kg (need 2+ weeks of weight logs for estimate)';
  }

  var bannerHTML = '<div style="background:var(--surface-raised);border:1px solid var(--border-strong);border-radius:10px;padding:12px 14px;margin-bottom:18px;display:flex;justify-content:space-between;align-items:center">'
    +'<div><span class="eyebrow" style="margin:0">'+esc(goalLabel())+' goal</span><div style="font-weight:600;font-size:15px;color:var(--text)">' + targetW + ' kg</div></div>'
    +'<div class="tabnum" style="font-size:11px;color:var(--text);text-align:right">' + goalText + '</div>'
    +'</div>';

  document.getElementById('content').innerHTML =
    '<div class="topbar"><div><span class="eyebrow">day '+currentDayNum()+' of program</span><div class="title">Progress</div></div></div>'
    +bannerHTML
    +'<div class="stat-grid">'
      +'<div class="stat-card"><span class="eyebrow">current weight</span><div class="stat-val">'+(curW!=null?curW.toFixed(1)+'kg':'–')+'</div><div class="stat-sub">'+(delta!=null?(delta>=0?'+':'')+delta.toFixed(1)+' kg since day 1':'log weight to track')+'</div></div>'
      +'<div class="stat-card"><span class="eyebrow">'+goalRateLabel()+'</span><div class="stat-val '+(weeklyGainPct!=null?(inRange?'sage':'rust'):'')+'">'+( weeklyGainPct!=null?weeklyGainPct.toFixed(2)+'%':'–')+'</div><div class="stat-sub">goal-aware trend</div></div>'
      +'<div class="stat-card"><span class="eyebrow">current streak</span><div class="stat-val amber">'+streak+'</div><div class="stat-sub">days</div></div>'
      +'<div class="stat-card"><span class="eyebrow">avg kcal (7d)</span><div class="stat-val">'+avgKcal7+'</div><div class="stat-sub">target '+ct+'</div></div>'
    +'</div>'
    +(reg ? renderRegression(reg, weeklyWeights[0]) : '')
    +'<div class="section"><span class="eyebrow">weekly weight trend</span><div class="chart-wrap"><canvas id="weightChart"></canvas></div><div id="weightEmpty" class="chart-empty hidden"></div></div>'
    +'<div class="section"><span class="eyebrow">daily calories (last 14 days)</span><div class="chart-wrap"><canvas id="kcalChart"></canvas></div><div id="kcalEmpty" class="chart-empty hidden"></div></div>'
    +'<div class="section"><span class="eyebrow">protein trend (7-day rolling avg)</span><div class="chart-wrap"><canvas id="protChart"></canvas></div><div id="protEmpty" class="chart-empty hidden"></div></div>'
    +measHTML
    +photoHTML
    +notesHTML
    +'<div class="section ex-select-wrap"><span class="eyebrow">strength / e1RM</span><select id="exSelect" style="margin-top:8px">'+buildExOptions()+'</select><div class="chart-wrap" style="margin-top:10px"><canvas id="e1rmChart"></canvas></div><div class="e1rm-note">Estimated 1RM via Epley formula. Trend based on best set per session.</div></div>'
    +'<div class="section"><span class="eyebrow">adherence ledger</span><div class="ledger-grid" id="ledger"></div><div class="legend"><span><span class="dot" style="background:#F5F5F4"></span>on target</span><span><span class="dot" style="background:#FF4D4F"></span>aggressive</span><span><span class="dot" style="background:#1C1C1F"></span>under/none</span></div></div>'
    +'<div id="advisoryZone"></div>';

  buildProgressCharts(records, weeklyWeights);
  buildLedger(records);
  runDiscovery(records, weeklyWeights, ct, reg);

  var exSel = document.getElementById('exSelect');
  if(exSel) exSel.addEventListener('change', function(){ buildE1RMChart(exSel.value, records); });
  if(exSel && exSel.value) buildE1RMChart(exSel.value, records);

  var addMeasBtn = document.getElementById('addMeasBtn');
  if(addMeasBtn) addMeasBtn.addEventListener('click', openMeasSheet);

  var photoInput = document.getElementById('photoInput');
  var addPhotoBtn = document.getElementById('addPhotoBtn');
  if(addPhotoBtn && photoInput) {
    addPhotoBtn.addEventListener('click', function(){ photoInput.click(); });
    photoInput.addEventListener('change', function(){ handlePhotoUpload(photoInput.files[0]); });
  }
}
