/* Today screen widgets: staples shelf, week dot row, calorie ring, and workout preview */

import { profile } from "../../state.js";
import { ls, dayRecord, saveDayRecord, getWorkoutSessions, allDayKeys } from "../../storage.js";
import { getActiveProgram, getWeeklySchedule, getNextProgramWorkout } from "../../data/plan.js";
import { DEFAULT_STAPLES } from "../../data/foods.js";
import { todayKey, dateKey, addDays, esc, currentWeight, goalDirection } from "../../lib/format.js";
import { getTargetsForDate, getDayTotals, addRecent } from "../../lib/calc.js";
import { showToast } from "../../components/toast.js";
import { renderTodaySimple } from "../today.js";
import { ic } from "../../lib/dom.js";

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

export function getMergedStaples() {
  var recents = [];
  try {
    recents = ls('rg_recent_foods', []) || [];
  } catch(e) {}
  var staples = (profile && profile.customStaples) || DEFAULT_STAPLES || [];
  var result = [];
  var seen = {};

  recents.forEach(function(r) {
    var k = (r.name || '').trim().toLowerCase();
    if (!k || seen[k]) return;
    seen[k] = true;
    result.push({
      id: r.id || ('recent_' + k),
      name: r.name,
      kcal: r.kcal,
      protein: r.protein,
      carbs: r.carbs || 0,
      fat: r.fat || 0,
      isRecent: true
    });
  });

  staples.forEach(function(s) {
    var k = (s.name || '').trim().toLowerCase();
    if (!k || seen[k]) return;
    seen[k] = true;
    result.push(s);
  });

  return result.slice(0, 8);
}

export function openPortionSheet(item, onSelect) {
  var overlay = document.createElement('div');
  overlay.className = 'overlay active';
  overlay.innerHTML = '<div class="sheet" style="background:#141416;border:none;border-radius:20px 20px 0 0;padding:20px 20px calc(24px + var(--safe-b));width:100%;max-width:480px">'
    + '<div class="sheet-handle"></div>'
    + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">'
      + '<div style="font-size:28px;font-weight:600;color:#F5F5F4;line-height:1.15">Portion Size</div>'
      + '<button type="button" class="btn-text-action" id="cancelPortionBtn" style="color:#8A8A8E;font-size:15px;background:none;border:none;padding:0;cursor:pointer">Cancel</button>'
    + '</div>'
    + '<div style="font-size:17px;font-weight:600;color:#F5F5F4;margin-bottom:4px">' + esc(item.name) + '</div>'
    + '<div style="font-size:15px;color:#8A8A8E;margin-bottom:20px">' + item.kcal + ' kcal · ' + item.protein + 'g protein (1×)</div>'
    + '<div style="display:flex;flex-direction:column;gap:8px">'
      + '<button type="button" class="btn" data-portion="0.5" style="width:100%;height:48px;background:#1C1C1F;color:#F5F5F4;font-size:15px;font-weight:600;border:none;border-radius:12px;cursor:pointer;display:flex;justify-content:space-between;align-items:center;padding:0 16px">'
        + '<span>½× Portion</span><span style="color:#8A8A8E">' + Math.round(item.kcal * 0.5) + ' kcal · ' + (item.protein * 0.5).toFixed(1) + 'g</span>'
      + '</button>'
      + '<button type="button" class="btn" data-portion="1" style="width:100%;height:48px;background:#1C1C1F;color:#F5F5F4;font-size:15px;font-weight:600;border:none;border-radius:12px;cursor:pointer;display:flex;justify-content:space-between;align-items:center;padding:0 16px">'
        + '<span>1× Portion (Default)</span><span style="color:#8A8A8E">' + item.kcal + ' kcal · ' + item.protein + 'g</span>'
      + '</button>'
      + '<button type="button" class="btn" data-portion="2" style="width:100%;height:48px;background:#1C1C1F;color:#F5F5F4;font-size:15px;font-weight:600;border:none;border-radius:12px;cursor:pointer;display:flex;justify-content:space-between;align-items:center;padding:0 16px">'
        + '<span>2× Portion (Double)</span><span style="color:#8A8A8E">' + Math.round(item.kcal * 2) + ' kcal · ' + (item.protein * 2).toFixed(1) + 'g</span>'
      + '</button>'
    + '</div>'
    + '</div>';

  document.body.appendChild(overlay);
  overlay.querySelector('#cancelPortionBtn').onclick = function() { overlay.remove(); };
  overlay.querySelectorAll('[data-portion]').forEach(function(btn) {
    btn.onclick = function() {
      var p = parseFloat(btn.dataset.portion);
      overlay.remove();
      onSelect(p);
    };
  });
}

export function getStaplesShelfHTML() {
  var staples = getMergedStaples();
  if (!staples || !staples.length) return '';
  var chips = staples.map(function(s, idx) {
    return '<button type="button" class="staple-chip" data-quick-staple="' + idx + '">' + esc(s.name) + '</button>';
  }).join('');

  return '<div class="staples-shelf">'
    + '<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px">'
      + '<span class="t-label">Quick Add</span>'
    + '</div>'
    + '<div class="staples-chip-row">' + chips + '</div>'
    + '</div>';
}

export function buildWeekDotRowHTML(dayKey, activeSelectedKey) {
  var letters = ['M','T','W','T','F','S','S'];
  var now = new Date(dayKey + 'T00:00:00');
  var dow = now.getDay(); // 0=Sun, 1=Mon...
  var monday = addDays(now, -(dow === 0 ? 6 : dow - 1));
  var cols = [];

  // Build session days map for fast lookup
  var sessionDays = {};
  try {
    getWorkoutSessions().forEach(function(s) {
      if (s.dayKey && (s.exercises || []).some(function(ex){ return (ex.sets || []).some(Boolean); })) {
        sessionDays[s.dayKey] = true;
      }
    });
  } catch(e) {}

  for (var d = 0; d < 7; d++) {
    var day = addDays(monday, d);
    var k = dateKey(day);
    var isToday = (k === todayKey());
    var isSelected = (k === activeSelectedKey);
    var rec = dayRecord(k);
    var isTrained = !!sessionDays[k] || (rec && (rec.workoutDone || (rec.workout && Object.keys(rec.workout).some(function(id){return (rec.workout[id]||[]).some(Boolean);}))));

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

  var heroNumber = isOver ? ('+' + (kcalLogged - kcalTarget).toLocaleString()) : (remaining > 0 ? remaining.toLocaleString() : kcalLogged.toLocaleString());
  var heroSub = isOver
    ? 'kcal over target · ' + kcalLogged.toLocaleString() + ' eaten'
    : (remaining > 0
      ? 'kcal remaining · of ' + kcalTarget.toLocaleString() + ' kcal'
      : 'kcal eaten · target hit');

  return '<div style="margin-bottom:20px">'
    + '<div class="t-hero tabnum">' + heroNumber + '</div>'
    + '<div style="font-size:15px;color:var(--text-secondary);margin-top:4px">' + heroSub + '</div>'
    + '<div class="prog-line" style="height:6px;border-radius:3px;background:#222;margin-top:8px;margin-bottom:16px;overflow:hidden"><div class="prog-line-fill' + (calPct >= 100 ? ' lime' : '') + '" style="width:' + calPct + '%;height:100%;border-radius:3px;background:#C6F432"></div></div>'
    + '<div style="display:flex;align-items:baseline;gap:6px">'
      + '<span style="font-size:17px;font-weight:600;color:#F5F5F4;font-variant-numeric:tabular-nums">' + Math.round(protLogged) + '</span>'
      + '<span style="font-size:15px;color:var(--text-secondary)">/ ' + protTarget + ' g protein</span>'
    + '</div>'
    + '<div class="prog-line" style="height:6px;border-radius:3px;background:#222;margin-top:6px;overflow:hidden"><div class="prog-line-fill' + (protPct >= 100 ? ' lime' : '') + '" style="width:' + protPct + '%;height:100%;border-radius:3px;background:#C6F432"></div></div>'
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

export function buildNextSessionPreviewHTML() { return ''; }
export function buildWeekGlanceHTML() { return ''; }
export function openCheckinSheet() {}
