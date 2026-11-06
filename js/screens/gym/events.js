/* Gym screen events: set logging, rir cycling, cues toggle, and dynamic input handlers */

import { profile } from "../../state.js";
import { dayRecord, saveDayRecord, sv } from "../../storage.js";
import { getExerciseData } from "../../data/plan.js";
import { isBodyweightExercise } from "./sets.js";
import { getSessionMeta, attachCommonGymHeaderEvents } from "./helpers.js";
import { getBestRepCount, getBestE1RM } from "../../lib/calc.js";
import { playSound, triggerHaptic } from "../../lib/dom.js";
import { showToast, showUndoToast } from "../../components/toast.js";
import { openSheet } from "../../components/sheet.js";
import { openQuickEditSetModal } from "../../components/quick-edit-modal.js";
import { renderGym, buildVolumeTable } from "../gym.js";
import { chooseWorkoutForDate } from "./session-sheet.js";
import { openSwapSheet, openPlateCalculator } from "./swap.js";
import { startRestTimer } from "./timer.js";
import { openCustomRoutineSheet, openCustomRoutineManager } from "./plan-editor.js";
import { attachSetRowSwipeHandlers } from "./swipe-delete.js";

export function attachGymEvents(key, rec, session, programDayIndex) {
  attachCommonGymHeaderEvents();
  var chooseWorkoutBtn=document.getElementById('chooseWorkoutBtn');
  if(chooseWorkoutBtn) chooseWorkoutBtn.addEventListener('click',function(){chooseWorkoutForDate(key);});
  document.querySelectorAll('[data-pick-workout]').forEach(function(btn){
    btn.addEventListener('click',function(){var next=dayRecord(key);next.selectedWorkout=parseInt(btn.dataset.pickWorkout,10);saveDayRecord(key,next);renderGym();});
  });
  var volBtn = document.getElementById('volBtn');
  if(volBtn) volBtn.addEventListener('click', function(){
    openSheet('<div class="sheet-title">Weekly Volume Summary</div>'+buildVolumeTable()+'<div style="font-size:11px;color:var(--text-muted);margin-top:12px">Target range: 10–18 sets/muscle/week (Pelland et al. 2024 meta-regression)</div>');
  });

  var addRoutineBtn = document.getElementById('addRoutineExerciseBtn');
  if(addRoutineBtn) addRoutineBtn.addEventListener('click', function(){ openCustomRoutineSheet(key); });
  var editRoutineBtn = document.getElementById('editRoutineBtn');
  if(editRoutineBtn) editRoutineBtn.addEventListener('click', openCustomRoutineManager);

  document.querySelectorAll('.remove-routine-btn').forEach(function(btn){
    btn.addEventListener('click', function(){
      if(!confirm('Remove this exercise from today\'s routine?')) return;
      var day = new Date(key+'T00:00:00').getDay();
      profile.customRoutines = profile.customRoutines || {};
      profile.customRoutines[day] = (profile.customRoutines[day]||[]).filter(function(ex){ return ex.id !== btn.dataset.exid; });
      sv('rg_profile', profile);
      renderGym();
    });
  });

  document.querySelectorAll('.plate-calc-btn').forEach(function(btn){
    btn.onclick = function() {
      openPlateCalculator(btn.dataset.exWeight || 60);
    };
  });
  document.querySelectorAll('.warm-up-btn').forEach(function(btn){
    btn.addEventListener('click', function(){
      openWarmUpSheet(btn.dataset.exname, btn.dataset.exid);
    });
  });

  document.querySelectorAll('.ex-note-input').forEach(function(input){
    input.addEventListener('change', function(){
      profile.exerciseNotes = profile.exerciseNotes || {};
      profile.exerciseNotes[input.dataset.ex] = input.value.trim();
      sv('rg_profile', profile);
      showToast('Cue saved', 'ok');
    });
  });
  document.querySelectorAll('.cue-toggle').forEach(function(btn){
    btn.addEventListener('click', function(){
      var exId = btn.dataset.cueEx;
      var inp = document.querySelector('.ex-note-input[data-ex="' + exId + '"]');
      if (inp) {
        var isHidden = inp.style.display === 'none';
        inp.style.display = isHidden ? 'block' : 'none';
        if (isHidden) inp.focus();
      }
    });
  });

  document.querySelectorAll('[data-expand-ex]').forEach(function(row){
    row.addEventListener('click', function(){
      window.activeExpandedExId = row.dataset.expandEx;
      renderGym();
    });
  });

  var isLoggingSet = false;
  document.querySelectorAll('[data-logset]').forEach(function(btn){
    btn.addEventListener('click', function(){
      if (isLoggingSet) return;
      isLoggingSet = true;
      var id = btn.dataset.logset;
      var exObj = getExerciseData(id) || {};
      var isBW = isBodyweightExercise(id, exObj.name);
      var setIndex = parseInt(btn.dataset.setIndex,10);
      var wEl = document.querySelector('.set-weight[data-ex="'+id+'"][data-set-index="'+setIndex+'"]');
      var rEl = document.querySelector('.set-reps[data-ex="'+id+'"][data-set-index="'+setIndex+'"]');
      var rawW = (wEl ? wEl.value : '').trim();
      if (!rawW && wEl && wEl.dataset.prefill) rawW = wEl.dataset.prefill.trim();
      var w = 0;
      if (rawW !== '' && rawW.toUpperCase() !== 'BW') {
        w = parseFloat(rawW) || 0;
      }
      var rawR = (rEl ? rEl.value : '').trim();
      if (!rawR && rEl && rEl.dataset.prefill) rawR = rEl.dataset.prefill.trim();
      var r = parseInt(rawR, 10);
      if (!r || r <= 0) { isLoggingSet = false; showToast('Please enter reps', 'warn'); return; }
      if (!isBW && (!w || w <= 0)) { isLoggingSet = false; showToast('Please enter weight and reps', 'warn'); return; }
      var rirEl = document.querySelector('.set-rir[data-ex="'+id+'"][data-set-index="'+setIndex+'"]');
      var rirValue = rirEl && rirEl.value !== '' ? parseInt(rirEl.value,10) : null;
      var savedOk = false;
      try {
        rec = dayRecord(key);
        rec.workout = rec.workout||{};
        rec.workout[id] = rec.workout[id]||[];
        rec.workoutDraft = rec.workoutDraft||{};
        var sessionMeta=getSessionMeta(rec, programDayIndex);
        var hadLoggedSets = Object.keys(rec.workout).some(function(workoutId){
          return (rec.workout[workoutId]||[]).some(Boolean);
        });
        if(!sessionMeta.startedAt) sessionMeta.startedAt=new Date().toISOString();
        if(!hadLoggedSets) sessionMeta.firstSetAt=new Date().toISOString();
        sessionMeta.lastSetAt=new Date().toISOString();
        sessionMeta.sessionLabel=session.label;
        rec.workout[id][setIndex] = {weight:w,reps:r,rir:rirValue};
        if (rec.workoutDraft[id]) delete rec.workoutDraft[id][setIndex];
        var sessionEx = (session && session.exercises) ? session.exercises.find(function(item) {
          var actualItemId = (rec.swaps && rec.swaps[item.id]) || item.id;
          return actualItemId === id || item.id === id;
        }) : null;
        var exPlannedSets = (sessionEx && sessionEx.sets != null) ? sessionEx.sets : ((exObj && exObj.sets != null) ? exObj.sets : 2);
        if (setIndex + 1 < exPlannedSets && !rec.workout[id][setIndex + 1]) {
          rec.workoutDraft[id] = rec.workoutDraft[id] || [];
          rec.workoutDraft[id][setIndex + 1] = { weight: w, reps: r, rir: rirValue };
        }
        if (rec.workoutDraft && rec.workoutDraft[id]) {
          for (var dI = exPlannedSets; dI < rec.workoutDraft[id].length; dI++) {
            if (rec.workoutDraft[id][dI] && !rec.workoutDraft[id][dI].manual) delete rec.workoutDraft[id][dI];
          }
        }
        var curSetsDone = ((rec.workout || {})[id] || []).filter(Boolean).length;
        if (curSetsDone >= exPlannedSets) {
          var nextIncomplete = session.exercises.find(function(item) {
            var actualItemId = (rec.swaps && rec.swaps[item.id]) || item.id;
            var itemSets = ((rec.workout || {})[actualItemId] || []).filter(Boolean).length;
            return itemSets < (item.sets || 2);
          });
          if (nextIncomplete) {
            window.activeExpandedExId = (rec.swaps && rec.swaps[nextIncomplete.id]) || nextIncomplete.id;
          }
        }
        sessionMeta.updatedAt=new Date().toISOString();
        var allDone = session.exercises.every(function(ex){var actualId=(rec.swaps&&rec.swaps[ex.id])||ex.id;return (rec.workout[actualId]||[]).filter(Boolean).length>=(ex.sets||2);});
        if(allDone && !rec.workoutDone){
          rec.workoutDone=true; profile.xp=(profile.xp||0)+30; sv('rg_profile',profile);
          showToast('Session complete.', 'ok');
        } else {
          profile.xp=(profile.xp||0)+3; sv('rg_profile',profile);
        }
        saveDayRecord(key, rec, { silent: true });
        renderGym();
        savedOk = true;
      } catch(err) {
        console.error('Set log error:', err);
        showToast('Could not save set', 'warn');
      } finally {
        isLoggingSet = false;
      }

      if (savedOk) {
        try {
          triggerHaptic();
          if(navigator.vibrate) navigator.vibrate(35);
          if (isBW && (!w || w === 0)) {
            var prevBestReps = getBestRepCount(id) || 0;
            if (r > prevBestReps) {
              playSound('workout_complete');
              showToast('PR: ' + (exObj.name || 'Lift') + ': ' + r + ' reps (BW)', 'ok');
            } else {
              playSound('set_logged');
            }
          } else {
            var prevBestE1RM = getBestE1RM(id) || 0;
            var currentE1RM = w * (1 + r / 30);
            if (currentE1RM > prevBestE1RM + 0.25) {
              playSound('workout_complete');
              showToast('PR: ' + (exObj.name || 'Lift') + ': ' + (w > 0 ? (w + 'kg × ' + r) : (r + ' reps')) + ' (' + currentE1RM.toFixed(1) + 'kg e1RM)', 'ok');
            } else {
              playSound('set_logged');
            }
          }
        } catch(sensErr) {}
        try {
          var loggedExercise=getExerciseData(id)||{};
          startRestTimer(loggedExercise.rest||90);
        } catch(timerErr) {}
      }
    });
  });

  document.querySelectorAll('.effort-btn').forEach(function(btn){
    btn.addEventListener('click',function(){
      openEffortSheet(btn.dataset.effortEx, parseInt(btn.dataset.setIndex,10));
    });
  });

  // Tap-to-cycle RIR handler (3+ -> 2 -> 1 -> F)
  document.querySelectorAll('[data-cycle-rir]').forEach(function(btn) {
    btn.onclick = function() {
      var exId = btn.dataset.cycleRir, sIdx = parseInt(btn.dataset.setIndex, 10);
      var select = document.querySelector('.set-rir[data-ex="' + exId + '"][data-set-index="' + sIdx + '"]');
      if (!select) return;
      var cur = select.value === '' ? null : parseInt(select.value, 10);
      var nextVal, nextTxt;
      if (cur === 3) { nextVal = '2'; nextTxt = 'RIR 2'; }
      else if (cur === 2) { nextVal = '1'; nextTxt = 'RIR 1'; }
      else if (cur === 1) { nextVal = '0'; nextTxt = 'F'; }
      else { nextVal = '3'; nextTxt = '3+'; }

      select.value = nextVal;
      btn.textContent = nextTxt;

      var draftRec = dayRecord(key);
      draftRec.workoutDraft = draftRec.workoutDraft || {};
      draftRec.workoutDraft[exId] = draftRec.workoutDraft[exId] || [];
      draftRec.workoutDraft[exId][sIdx] = draftRec.workoutDraft[exId][sIdx] || {};
      draftRec.workoutDraft[exId][sIdx].rir = parseInt(nextVal, 10);
      saveDayRecord(key, draftRec, { silent: true });
    };
  });

  var draftTimer = null;
  var flushDraft = function(input) {
    if (!input) return;
    var draftRec = dayRecord(key), id = input.dataset.ex, index = parseInt(input.dataset.setIndex, 10);
    draftRec.workoutDraft = draftRec.workoutDraft || {};
    draftRec.workoutDraft[id] = draftRec.workoutDraft[id] || [];
    var wInput = document.querySelector('.set-weight[data-ex="' + id + '"][data-set-index="' + index + '"]');
    var rInput = document.querySelector('.set-reps[data-ex="' + id + '"][data-set-index="' + index + '"]');
    var rawW = (wInput ? wInput.value : '').trim();
    var parsedW = (rawW === '' || rawW.toUpperCase() === 'BW') ? 0 : (parseFloat(rawW) || 0);
    var parsedR = parseInt((rInput ? rInput.value : ''), 10) || '';
    var rirEl = document.querySelector('.set-rir[data-ex="' + id + '"][data-set-index="' + index + '"]');
    var row = {
      weight: parsedW,
      reps: parsedR,
      rir: (rirEl && rirEl.value !== '') ? parseInt(rirEl.value, 10) : null
    };
    draftRec.workoutDraft[id][index] = row;
    saveDayRecord(key, draftRec, { silent: true });
  };

  document.querySelectorAll('.set-weight,.set-reps,.set-rir').forEach(function(input){
    input.addEventListener('input', function(){
      var id = input.dataset.ex, index = parseInt(input.dataset.setIndex, 10);
      var isBW = isBodyweightExercise(id);
      var wInput = document.querySelector('.set-weight[data-ex="' + id + '"][data-set-index="' + index + '"]');
      var rInput = document.querySelector('.set-reps[data-ex="' + id + '"][data-set-index="' + index + '"]');
      var logButton = document.querySelector('[data-logset="' + id + '"][data-set-index="' + index + '"]');
      if (logButton) {
        var pw = (wInput && wInput.dataset.prefill) || '';
        var pr = (rInput && rInput.dataset.prefill) || '';
        var effW = (wInput && wInput.value) || pw;
        var effR = (rInput && rInput.value) || pr;
        logButton.disabled = isBW ? !(parseInt(effR, 10) > 0) : !(parseFloat(effW) > 0 && parseInt(effR, 10) > 0);
      }
      clearTimeout(draftTimer);
      draftTimer = setTimeout(function() {
        flushDraft(input);
      }, 300);
    });
    input.addEventListener('blur', function() {
      flushDraft(input);
    });
  });

  document.querySelectorAll('.set-weight').forEach(function(input) {
    input.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        var id = input.dataset.ex, idx = parseInt(input.dataset.setIndex, 10);
        var r = document.querySelector('.set-reps[data-ex="' + id + '"][data-set-index="' + idx + '"]');
        if (r) { r.focus(); if (r.select) r.select(); }
      }
    });
  });
  document.querySelectorAll('.set-reps').forEach(function(input) {
    input.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        var id = input.dataset.ex, idx = parseInt(input.dataset.setIndex, 10);
        var nextW = document.querySelector('.set-weight[data-ex="' + id + '"][data-set-index="' + (idx + 1) + '"]');
        if (nextW) { nextW.focus(); if (nextW.select) nextW.select(); }
        else { input.blur(); }
      }
    });
  });

  document.querySelectorAll('[data-add-set]').forEach(function(btn){
    btn.addEventListener('click',function(){
      var draftRec=dayRecord(key), id=btn.dataset.addSet;
      draftRec.workoutDraft=draftRec.workoutDraft||{};
      draftRec.workoutDraft[id]=draftRec.workoutDraft[id]||[];
      var sessionEx = (session && session.exercises) ? session.exercises.find(function(item) {
        var actualItemId = (draftRec.swaps && draftRec.swaps[item.id]) || item.id;
        return actualItemId === id || item.id === id;
      }) : null;
      var pSets = (sessionEx && sessionEx.sets != null) ? sessionEx.sets : 2;
      var curDone = (draftRec.workout && draftRec.workout[id] || []).filter(Boolean).length;
      var count = Math.max(pSets, curDone, draftRec.workoutDraft[id].length);
      draftRec.workoutDraft[id][count] = { weight: '', reps: '', rir: null, manual: true };
      saveDayRecord(key,draftRec,{silent:true});
      renderGym();
    });
  });

  document.querySelectorAll('[data-remove-draft],[data-remove-extra-set]').forEach(function(btn){
    btn.addEventListener('click',function(){
      var draftRec=dayRecord(key), id=btn.dataset.removeDraft || btn.dataset.removeExtraSet, index=parseInt(btn.dataset.setIndex,10);
      var removedDraft = (draftRec.workoutDraft && draftRec.workoutDraft[id]) ? draftRec.workoutDraft[id].splice(index,1)[0] : null;
      var removedSet = (draftRec.workout && draftRec.workout[id]) ? draftRec.workout[id].splice(index,1)[0] : null;
      saveDayRecord(key,draftRec,{silent:true});
      renderGym();
      showUndoToast('Set removed', function() {
        var restoreRec = dayRecord(key);
        if (removedDraft) {
          restoreRec.workoutDraft = restoreRec.workoutDraft || {};
          restoreRec.workoutDraft[id] = restoreRec.workoutDraft[id] || [];
          restoreRec.workoutDraft[id].splice(index, 0, removedDraft);
        }
        if (removedSet) {
          restoreRec.workout = restoreRec.workout || {};
          restoreRec.workout[id] = restoreRec.workout[id] || [];
          restoreRec.workout[id].splice(index, 0, removedSet);
        }
        saveDayRecord(key, restoreRec, {silent:true});
        renderGym();
      });
    });
  });

  document.querySelectorAll('.swap-btn').forEach(function(btn){
    btn.addEventListener('click', function(){
      openSwapSheet(btn.dataset.swapOrig, btn.dataset.swapCurr, btn.dataset.muscle, key);
    });
  });

  document.querySelectorAll('[data-quick-edit-logged]').forEach(function(btn){
    btn.addEventListener('click', function(){
      openQuickEditSetModal({
        context: 'gym',
        dayKey: key,
        exId: btn.dataset.quickEditLogged,
        exName: btn.dataset.exName,
        setIndex: parseInt(btn.dataset.setIndex, 10),
        weight: parseFloat(btn.dataset.weight) || 0,
        reps: parseInt(btn.dataset.reps, 10) || 0,
        rir: btn.dataset.rir === '' ? null : parseInt(btn.dataset.rir, 10)
      });
    });
  });

  document.querySelectorAll('[data-delete-set]').forEach(function(btn){
    btn.addEventListener('click',function(){
      var current=dayRecord(key), id=btn.dataset.deleteSet, index=parseInt(btn.dataset.setIndex,10);
      if(current.workout && current.workout[id]) { current.workout[id].splice(index,1); current.workoutDone=false; saveDayRecord(key,current); renderGym(); }
    });
  });
  document.querySelectorAll('[data-edit-set]').forEach(function(btn){
    btn.addEventListener('click',function(){
      var current=dayRecord(key), id=btn.dataset.editSet, index=parseInt(btn.dataset.setIndex,10), set=current.workout&&current.workout[id]&&current.workout[id][index];
      if(!set) return;
      var weight=prompt('Weight (kg)',set.weight), reps=prompt('Reps',set.reps), effort=prompt('RIR (0 = failure, blank = not logged)',set.rir===0?'0':(set.rir==null?'':set.rir));
      if(weight===null||reps===null||effort===null) return;
      var w=parseFloat(weight), r=parseInt(reps,10);
      if(!w||!r||w<=0||r<=0){showToast('Enter valid weight and reps','warn');return;}
      var rir=effort.trim()===''?null:parseInt(effort,10);
      if(rir!==null&&(isNaN(rir)||rir<0||rir>3)){showToast('RIR must be blank or 0 to 3','warn');return;}
      current.workout[id][index]={weight:w,reps:r,rir:rir}; saveDayRecord(key,current); renderGym();
    });
  });
  attachSetRowSwipeHandlers(key);
}
