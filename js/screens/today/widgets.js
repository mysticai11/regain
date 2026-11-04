/* Today screen widgets: staples shelf, week dot row, calorie ring, and workout preview */

import { profile } from "../../state.js";
import { dayRecord, saveDayRecord } from "../../storage.js";
import { getActiveProgram, getWeeklySchedule } from "../../data/plan.js";
import { DEFAULT_STAPLES } from "../../data/foods.js";
import { todayKey, dateKey, addDays, esc, currentWeight, goalDirection } from "../../lib/format.js";
import { getTargetsForDate, getDayTotals } from "../../lib/calc.js";
import { showToast } from "../../components/toast.js";
import { renderTodaySimple } from "../today.js";

export function addQuickFood(key) {
  var overlay=document.createElement('div'); overlay.className='overlay';
  overlay.innerHTML='<div class="sheet"><div class="sheet-handle"></div><div class="sheet-title">Quick add</div><div class="small dim">Use this when you know the calories and protein.</div>'
    +'<label class="eyebrow">Calories</label><input type="number" id="quickKcal" inputmode="numeric" placeholder="e.g. 300">'
    +'<label class="eyebrow">Protein (g)</label><input type="number" id="quickProtein" inputmode="decimal" placeholder="e.g. 25">'
    +'<div class="modal-actions"><button class="btn" id="quickCancel">Cancel</button><button class="btn btn-primary" id="quickSave">Add</button></div></div>';
  document.body.appendChild(overlay);
  overlay.querySelector('#quickCancel').onclick=function(){overlay.remove();};
  overlay.querySelector('#quickSave').onclick=function(){
    var kcal=parseInt(document.getElementById('quickKcal').value,10);
    var protein=parseFloat(document.getElementById('quickProtein').value)||0;
    if(!kcal || kcal<1 || protein<0){showToast('Enter calories and protein','warn');return;}
    var rec=dayRecord(key); rec.extra.push({name:'Quick add',kcal:kcal,protein:protein,carbs:0,fat:0,servings:1});
    saveDayRecord(key,rec); addRecent('Quick add',kcal,protein,0,0); overlay.remove(); renderTodaySimple();
  };
}

export function getStaplesShelfHTML() {
  var rawStaples = (profile && profile.customStaples) || DEFAULT_STAPLES;
  if (!rawStaples || !rawStaples.length) return '';
  var seenIds = {};
  var staples = rawStaples.filter(function(s){
    var sid = s.id || s.name;
    if (seenIds[sid]) return false;
    seenIds[sid] = true;
    return true;
  });
  var rows = staples.map(function(s, idx) {
    return '<div class="list-row" data-quick-staple="' + idx + '" style="height:56px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #222;cursor:pointer;padding:0">'
      + '<span style="font-size:17px;font-weight:500;color:#F5F5F4">' + esc(s.name) + '</span>'
      + '<span style="font-size:15px;color:#8A8A8E;font-variant-numeric:tabular-nums">' + s.kcal + ' kcal · ' + s.protein + ' g</span>'
      + '</div>';
  }).join('');

  return '<div style="margin-top:28px;margin-bottom:28px">'
    + '<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px">'
      + '<span class="t-label">Quick-add staples</span>'
      + '<span class="t-micro">1-tap</span>'
    + '</div>'
    + '<div>' + rows + '</div>'
    + '</div>';
}

export function buildWeekDotRowHTML(dayKey, activeSelectedKey) {
  var letters = ['M','T','W','T','F','S','S'];
  var now = new Date(dayKey + 'T00:00:00');
  var dow = now.getDay(); // 0=Sun, 1=Mon...
  var monday = addDays(now, -(dow === 0 ? 6 : dow - 1));
  var cols = [];

  for (var d = 0; d < 7; d++) {
    var day = addDays(monday, d);
    var k = dateKey(day);
    var isToday = (k === todayKey());
    var isSelected = (k === activeSelectedKey);
    var rec = dayRecord(k);
    var isTrained = rec && (rec.workoutDone || (rec.workout && Object.keys(rec.workout).some(function(id){return (rec.workout[id]||[]).some(Boolean);})));

    var dotHTML = '';
    if (isTrained) {
      dotHTML = '<span style="width:6px;height:6px;border-radius:50%;background:#F5F5F4;display:inline-block"></span>';
    } else if (isSelected) {
      dotHTML = '<span style="width:6px;height:6px;border-radius:50%;border:1.5px solid #F5F5F4;background:transparent;box-sizing:border-box;display:inline-block"></span>';
    } else if (isToday) {
      dotHTML = '<span style="width:6px;height:6px;border-radius:50%;background:#F5F5F4;display:inline-block"></span>';
    } else {
      dotHTML = '<span style="width:6px;height:6px;border-radius:50%;background:#222;display:inline-block"></span>';
    }

    cols.push('<div class="week-strip-cell" data-pick-today-strip-date="' + k + '" style="cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:8px;padding:6px 0;flex:1">'
      + '<span style="font-size:11px;font-weight:600;color:' + (isToday || isSelected ? '#F5F5F4' : '#8A8A8E') + ';text-transform:uppercase">' + letters[d] + '</span>'
      + dotHTML
      + '</div>');
  }

  return '<div class="week-strip-row" style="display:flex;justify-content:space-between;align-items:center;padding:12px 0;margin-bottom:12px;border-bottom:1px solid #222">' + cols.join('') + '</div>';
}

export function openWorkoutOverrideSheet(dKey) {
  var overlay = document.createElement('div');
  overlay.className = 'overlay';
  var dObj = new Date(dKey + 'T00:00:00');
  var formatted = dObj.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  var title = 'Choose workout for ' + formatted;

  var prog = getActiveProgram();
  var d = dObj.getDay();
  var dayNum = d === 0 ? 7 : d;
  var weeklySched = getWeeklySchedule();
  var matchedSched = weeklySched.find(function(s){ return s.dayNum === dayNum; });
  var suggestedWorkoutIdx = (matchedSched && !matchedSched.isRest) ? matchedSched.workoutIndex : null;

  var targetRec = dayRecord(dKey);
  var hasOverride = targetRec && targetRec.selectedWorkout !== undefined;
  var currentSelection = hasOverride ? targetRec.selectedWorkout : suggestedWorkoutIdx;

  var workoutRows = prog.map(function(s, idx) {
    var cleanLabel = s.label.replace(/^Day\s*\d+\s*[—–-]\s*/i, '');
    var isSuggested = (suggestedWorkoutIdx === idx);
    var isSelected = (currentSelection === idx);
    return '<div class="list-row" data-choose-plan-idx="' + idx + '" style="height:56px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #222;cursor:pointer;padding:0">'
      + '<span style="font-size:17px;font-weight:600;color:' + (isSelected ? '#F5F5F4' : '#8A8A8E') + '">Day ' + (idx + 1) + ' · ' + esc(cleanLabel) + '</span>'
      + '<div style="display:flex;align-items:center;gap:8px">'
        + (isSuggested ? '<span style="font-size:11px;font-weight:600;color:#8A8A8E;text-transform:uppercase;letter-spacing:0.08em">Suggested</span>' : '')
        + (isSelected ? '<span style="color:#F5F5F4;font-weight:700">✓</span>' : '')
      + '</div>'
      + '</div>';
  }).join('');

  var isRestSuggested = (suggestedWorkoutIdx === null);
  var isRestSelected = (currentSelection === null);
  var restRow = '<div class="list-row" data-choose-plan-idx="rest" style="height:56px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #222;cursor:pointer;padding:0">'
    + '<span style="font-size:17px;font-weight:600;color:' + (isRestSelected ? '#F5F5F4' : '#8A8A8E') + '">Rest day</span>'
    + '<div style="display:flex;align-items:center;gap:8px">'
      + (isRestSuggested ? '<span style="font-size:11px;font-weight:600;color:#8A8A8E;text-transform:uppercase;letter-spacing:0.08em">Suggested</span>' : '')
      + (isRestSelected ? '<span style="color:#F5F5F4;font-weight:700">✓</span>' : '')
    + '</div>'
    + '</div>';

  var resetActionHTML = hasOverride
    ? '<button type="button" class="btn-text-action" id="sheetResetBtn" style="color:#8A8A8E;font-size:15px;background:none;border:none;padding:16px 0 0;cursor:pointer;text-align:left">Reset to suggested</button>'
    : '';

  overlay.innerHTML = '<div class="sheet" style="background:#141416;border-radius:20px 20px 0 0;padding:20px 20px calc(24px + var(--safe-b));max-width:480px;width:100%">'
    + '<div class="sheet-handle"></div>'
    + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">'
      + '<div style="font-size:28px;font-weight:600;color:#F5F5F4;line-height:1.15">' + esc(title) + '</div>'
      + '<button type="button" class="btn-text-action" id="closeOverrideSheetBtn" style="font-size:15px;color:#8A8A8E;background:none;border:none;padding:0;cursor:pointer">Close</button>'
    + '</div>'
    + '<div>' + workoutRows + restRow + '</div>'
    + resetActionHTML
    + '</div>';

  document.body.appendChild(overlay);

  overlay.querySelector('#closeOverrideSheetBtn').onclick = function() { overlay.remove(); };
  overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };

  overlay.querySelectorAll('[data-choose-plan-idx]').forEach(function(row) {
    row.onclick = function() {
      var val = row.dataset.choosePlanIdx;
      targetRec = dayRecord(dKey);
      if (val === 'rest') {
        targetRec.selectedWorkout = null;
      } else {
        targetRec.selectedWorkout = parseInt(val, 10);
      }
      saveDayRecord(dKey, targetRec);
      overlay.remove();
      var rFn = renderTodaySimple || window.renderTodaySimple;
      if (rFn) rFn();
      showToast('Workout updated for ' + formatted, 'ok');
    };
  });

  var rBtn = overlay.querySelector('#sheetResetBtn');
  if (rBtn) {
    rBtn.onclick = function() {
      targetRec = dayRecord(dKey);
      delete targetRec.selectedWorkout;
      saveDayRecord(dKey, targetRec);
      overlay.remove();
      var rFn = renderTodaySimple || window.renderTodaySimple;
      if (rFn) rFn();
      showToast('Reset to suggested workout', 'ok');
    };
  }
}

export function buildCalRingHTML(kcalLogged, kcalTarget, protLogged, protTarget, carbsLogged, fatLogged) {
  var remaining = Math.max(0, kcalTarget - kcalLogged);
  var isOver = kcalLogged > kcalTarget;
  var calPct = Math.min(100, Math.round(kcalLogged / Math.max(1, kcalTarget) * 100));
  var protPct = Math.min(100, Math.round(protLogged / Math.max(1, protTarget) * 100));

  return '<div style="margin-bottom:20px">'
    + '<div class="t-hero tabnum">' + (isOver ? ('+' + (kcalLogged - kcalTarget).toLocaleString()) : remaining.toLocaleString()) + '</div>'
    + '<div style="font-size:15px;color:var(--text-secondary);margin-top:4px">' + (isOver ? 'kcal over target' : ('of ' + kcalTarget.toLocaleString() + ' kcal')) + '</div>'
    + '<div class="prog-line" style="margin-top:10px;margin-bottom:20px"><div class="prog-line-fill" style="width:' + calPct + '%"></div></div>'
    + '<div style="display:flex;align-items:baseline;gap:6px">'
      + '<span class="t-display tabnum">' + Math.round(protLogged) + '</span>'
      + '<span style="font-size:15px;color:var(--text-secondary)">/ ' + protTarget + ' g</span>'
    + '</div>'
    + '<div class="prog-line" style="margin-top:8px"><div class="prog-line-fill" style="width:' + protPct + '%"></div></div>'
    + '</div>';
}

export function buildWeightTrendChip(currentWeight) {
  if (currentWeight == null) return '';
  var entries = ((profile && profile.weightEntries) || []).slice().sort(function(a,b){ return String(a.createdAt||a.dayKey).localeCompare(String(b.createdAt||b.dayKey)); });
  var sevenDaysAgo = dateKey(addDays(new Date(), -7));
  var old = null;
  for (var i = entries.length - 1; i >= 0; i--) {
    if (entries[i].dayKey <= sevenDaysAgo && entries[i].weight != null) { old = entries[i].weight; break; }
  }
  if (old == null || entries.length < 2) return '';
  var delta = currentWeight - old;
  var sign = delta > 0 ? '+' : '';
  var cls = delta > 0.2 ? 'up' : (delta < -0.2 ? 'down' : 'flat');
  var arrow = delta > 0.2 ? '↑' : (delta < -0.2 ? '↓' : '→');
  return '<span class="weight-trend-chip ' + cls + '">' + arrow + ' ' + sign + delta.toFixed(1) + ' kg vs 7d ago</span>';
}

// ══ Next Workout Preview ══
export function buildNextSessionPreviewHTML() {
  var next = getNextProgramWorkout();
  if (!next || !next.session) return '';
  var session = next.session;
  var exPills = (session.exercises || []).slice(0, 6).map(function(ex) {
    return '<span class="next-session-ex">' + esc(ex.name) + '</span>';
  }).join('');
  var moreCount = Math.max(0, (session.exercises || []).length - 6);
  if (moreCount > 0) exPills += '<span class="next-session-ex">+' + moreCount + ' more</span>';
  return '<div class="next-session-card">'
    + '<div class="next-session-eyebrow">Next up • Week ' + next.week + '</div>'
    + '<div class="next-session-label">' + esc(session.label) + '</div>'
    + '<div class="next-session-exercises">' + exPills + '</div>'
    + '</div>';
}

export function buildWeekGlanceHTML(streak) {
  var today = new Date();
  var currentDay = today.getDay();
  var distanceToMonday = currentDay === 0 ? 6 : currentDay - 1;
  var mondayDate = addDays(today, -distanceToMonday);
  
  var totalKcal = 0;
  var loggedDays = 0;
  for(var i=0; i<=distanceToMonday; i++) {
    var d = addDays(mondayDate, i);
    var k = dateKey(d);
    var tot = getDayTotals(k);
    if (tot.kcal > 0) {
      totalKcal += tot.kcal;
      loggedDays++;
    }
  }
  var avgKcalThisWeek = loggedDays > 0 ? Math.round(totalKcal / loggedDays) : 0;
  
  var completedWorkoutsThisWeek = 0;
  for(var i=0; i<=distanceToMonday; i++) {
    var d = addDays(mondayDate, i);
    var k = dateKey(d);
    var r = dayRecord(k);
    if (r.workoutDone) {
      completedWorkoutsThisWeek++;
    }
  }
  var tdays = profile.trainingDays || [1,3,5];
  var totalScheduledThisWeek = 0;
  for(var i=0; i<=6; i++) {
    var d = addDays(mondayDate, i);
    if (tdays.includes(d.getDay())) {
      totalScheduledThisWeek++;
    }
  }
  
  var thisWeekWeights = [];
  for(var i=0; i<=distanceToMonday; i++) {
    var d = addDays(mondayDate, i);
    var r = dayRecord(dateKey(d));
    if (r.weight != null) thisWeekWeights.push(r.weight);
  }
  var lastWeekWeights = [];
  var lastMonday = addDays(mondayDate, -7);
  for(var i=0; i<7; i++) {
    var d = addDays(lastMonday, i);
    var r = dayRecord(dateKey(d));
    if (r.weight != null) lastWeekWeights.push(r.weight);
  }
  
  var weightDiffText = '–';
  var weightDiffColor = 'var(--text-secondary)';
  if (thisWeekWeights.length > 0 && lastWeekWeights.length > 0) {
    var avgThis = thisWeekWeights.reduce(function(a,b){return a+b;},0)/thisWeekWeights.length;
    var avgLast = lastWeekWeights.reduce(function(a,b){return a+b;},0)/lastWeekWeights.length;
    var diff = avgThis - avgLast;
    weightDiffText = (diff >= 0 ? '+' : '') + diff.toFixed(1) + ' kg';
    weightDiffColor = diff >= 0 ? 'var(--sage-light)' : 'var(--rust-light)';
  } else {
    var curW = currentWeight();
    var startW = profile.startWeight || 54.0;
    if (curW) {
      var diff = curW - startW;
      weightDiffText = (diff >= 0 ? '+' : '') + diff.toFixed(1) + ' kg';
      weightDiffColor = diff >= 0 ? 'var(--sage-light)' : 'var(--rust-light)';
    }
  }
  
  return '<div style="background:var(--surface-raised);border:1px solid var(--border-strong);border-radius:12px;padding:12px 14px;margin-bottom:14px">'
    +'<span class="eyebrow" style="margin:0 0 8px 0;display:flex;align-items:center;gap:4px;color:var(--text-muted)">' + ic('chart', 12) + ' This Week at a Glance</span>'
    +'<div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:6px;text-align:center">'
      +'<div><div class="tabnum" style="font-size:15px;font-weight:600;color:var(--text)">' + (avgKcalThisWeek > 0 ? avgKcalThisWeek.toLocaleString() : '–') + '</div><div style="font-size:11px;color:var(--text-secondary)">avg kcal</div></div>'
      +'<div><div class="tabnum" style="font-size:15px;font-weight:600;color:var(--text)">' + completedWorkoutsThisWeek + '/' + totalScheduledThisWeek + '</div><div style="font-size:11px;color:var(--text-secondary)">gym days</div></div>'
      +'<div><div class="tabnum" style="font-size:15px;font-weight:600;color:' + weightDiffColor + '">' + weightDiffText + '</div><div style="font-size:11px;color:var(--text-secondary)">weight</div></div>'
      +'<div><div class="tabnum" style="font-size:15px;font-weight:600;color:var(--text)">' + streak + 'd</div><div style="font-size:11px;color:var(--text-secondary)">streak</div></div>'
    +'</div>'
  +'</div>';
}

export function openCheckinSheet(dayKey) {
  var rec = dayRecord(dayKey);
  
  // Find last logged weight for pre-fill
  var preW = rec.weight;
  if (!preW) {
    var keys = allDayKeys().reverse();
    for (var i = 0; i < keys.length; i++) {
      var r = dayRecord(keys[i]);
      if (r.weight) {
        preW = r.weight;
        break;
      }
    }
  }
  if (!preW) preW = parseFloat(profile.startWeight) || 54.0;

  var sleepVal = rec.sleep != null ? rec.sleep : 8;
  var readinessVal = rec.readiness != null ? rec.readiness : 3;
  var noteVal = rec.note || '';

  var overlay = document.createElement('div'); overlay.className = 'overlay';
  overlay.innerHTML = '<div class="sheet">'
    +'<div class="sheet-handle"></div>'
    +'<div class="sheet-title">Morning Check-in</div>'
    
    +'<label class="eyebrow" style="margin-top:12px">Body Weight (kg)</label>'
    +'<input type="number" step="0.1" id="recWeight" value="'+preW+'" style="width:100%" inputmode="decimal">'
    
    +'<label class="eyebrow" style="margin-top:16px">Sleep Duration (hours)</label>'
    +'<input type="number" step="0.5" id="recSleep" value="'+sleepVal+'" style="width:100%" inputmode="decimal">'
    
    +'<label class="eyebrow" style="margin-top:16px">Readiness (1 = Poor, 5 = Great)</label>'
    +'<div style="display:flex;gap:6px;margin-top:4px">'
      +[1,2,3,4,5].map(function(num){
        return '<button class="btn btn-sm ready-btn'+(readinessVal===num?' active':'')+'" data-val="'+num+'" style="flex:1">'+num+'</button>';
      }).join('')
    +'</div>'
    
    +'<label class="eyebrow" style="margin-top:16px">Daily Note (optional)</label>'
    +'<input type="text" id="recNote" value="'+noteVal+'" placeholder="e.g. Felt strong, sore shoulders, exam stress..." style="width:100%">'
    
    +'<div class="modal-actions" style="margin-top:20px">'
      +'<button class="btn" id="closeCheckinBtn" style="flex:1">Cancel</button>'
      +'<button class="btn btn-primary" id="saveCheckinBtn" style="flex:1">Save</button>'
    +'</div>'
    +'</div>';
  document.body.appendChild(overlay);

  var selectedReadiness = readinessVal;

  overlay.querySelectorAll('.ready-btn').forEach(function(btn){
    btn.addEventListener('click', function(){
      overlay.querySelectorAll('.ready-btn').forEach(function(b){ b.classList.remove('active'); });
      btn.classList.add('active');
      selectedReadiness = parseInt(btn.dataset.val, 10);
    });
  });

  overlay.querySelector('#closeCheckinBtn').addEventListener('click',function(){overlay.remove();});
  overlay.querySelector('#saveCheckinBtn').addEventListener('click',function(){
    var w = parseFloat(document.getElementById('recWeight').value);
    if(w && (w<20 || w>300)) { showToast('Enter a valid weight', 'warn'); return; }
    var s = parseFloat(document.getElementById('recSleep').value) || 8;
    var n = document.getElementById('recNote').value.trim();
    
    rec = dayRecord(dayKey);
    rec.weight = w || null;
    rec.sleep = s;
    rec.readiness = selectedReadiness;
    rec.recovery = selectedReadiness >= 3 ? 'good' : 'bad';
    rec.note = n;
    saveDayRecord(dayKey, rec);
    overlay.remove();
    renderTodaySimple();
  });
}
