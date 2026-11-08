/* Today screen widgets: staples shelf, week dot row, calorie ring, and workout preview */

import { profile } from "../../state.js";
import { ls, sv, dayRecord, saveDayRecord, getWorkoutSessions, allDayKeys, getWeekOverrides, getCatchupDecisions } from "../../storage.js";
import { getActiveProgram, getWeeklySchedule, getNextProgramWorkout } from "../../data/plan.js";
import { DEFAULT_STAPLES } from "../../data/foods.js";
import { todayKey, dateKey, addDays, esc, currentWeight, goalDirection } from "../../lib/format.js";
import { getTargetsForDate, getDayTotals, addRecent } from "../../lib/calc.js";
import { showToast } from "../../components/toast.js";
import { ic, animateNumber } from "../../lib/dom.js";
import { computeWeekStrip } from "../../view/weekStrip.js";
import { buildSegmentedRing } from "../../components/svgRing.js";

function triggerRenderScreens() {
  if (typeof window !== 'undefined') {
    if (typeof window.renderTodaySimple === 'function') window.renderTodaySimple();
    if (typeof window.renderGym === 'function') window.renderGym();
    if (typeof window.renderTab === 'function') window.renderTab();
  }
}

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
    saveDayRecord(key,rec); addRecent('Quick add',kcal,protein,0,0); overlay.remove(); triggerRenderScreens();
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
    btn.onclick = function() { overlay.remove(); onSelect(parseFloat(btn.dataset.portion)); };
  });
}

export function getStaplesShelfHTML() {
  var staples = getMergedStaples();
  if (!staples || !staples.length) return '';
  var chips = staples.map(function(s, idx) {
    var sub = s.portion ? s.portion : (s.kcal ? (s.kcal + ' kcal · ' + (s.protein || 0) + 'g') : '');
    return '<button type="button" class="staple-chip" data-quick-staple="' + idx + '" style="display:inline-flex;flex-direction:column;align-items:flex-start;justify-content:center;height:52px;min-height:52px;padding:6px 16px;border-radius:14px;background:#141416;border:1px solid #222222;cursor:pointer;flex-shrink:0">'
      + '<span style="font-size:15px;font-weight:600;color:#F5F5F4;line-height:1.2;white-space:nowrap">' + esc(s.name) + '</span>'
      + (sub ? '<span style="font-size:11px;color:#8A8A8E;margin-top:2px;white-space:nowrap;font-variant-numeric:tabular-nums">' + esc(sub) + '</span>' : '')
      + '</button>';
  }).join('');

  return '<div class="staples-shelf" style="margin:24px 0">'
    + '<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:10px">'
      + '<span class="t-label">Quick Add</span>'
    + '</div>'
    + '<div class="staples-chip-row" style="display:flex;gap:8px;overflow-x:auto;padding-bottom:4px;mask-image:linear-gradient(to right,black 88%,transparent 100%);-webkit-mask-image:linear-gradient(to right,black 88%,transparent 100%)">' + chips + '</div>'
    + '</div>';
}

export function buildWeekDotRowHTML(dayKey, activeSelectedKey) {
  var offset = Number(window.todayWeekOffset) || 0;
  var targetDay = addDays(dayKey, offset * 7);
  var now = new Date(targetDay + 'T00:00:00');
  var dow = now.getDay();
  var monday = addDays(now, -(dow === 0 ? 6 : dow - 1));
  var sunday = addDays(monday, 6);

  var sessionDays = {};
  try {
    getWorkoutSessions().forEach(function(s) {
      if (s.dayKey && (s.exercises || []).some(function(ex){ return (ex.sets || []).some(Boolean); })) {
        sessionDays[s.dayKey] = true;
      }
    });
  } catch(e) {}

  var dayRecordsMap = {};
  for (var i = 0; i < 7; i++) {
    var curK = addDays(monday, i);
    var rec = dayRecord(curK);
    if (sessionDays[curK]) {
      dayRecordsMap[curK] = rec ? Object.assign({}, rec, { workoutDone: true }) : { workoutDone: true };
    } else if (rec) {
      dayRecordsMap[curK] = rec;
    }
  }

  var tdays = (profile && profile.trainingDays) || [1, 2, 3, 5, 6];
  var plannedIndices = tdays.map(function(d) { return (d + 6) % 7; });

  var days = computeWeekStrip({
    mondayKey: monday,
    todayDateKey: todayKey(),
    activeSelectedKey: activeSelectedKey,
    dayRecordsMap: dayRecordsMap,
    plannedDayIndices: plannedIndices,
    overrides: getWeekOverrides(),
    decisions: getCatchupDecisions()
  });

  var checkIcon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FAFAFA" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
  var arrowIcon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FAFAFA" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>';
  var dashIcon = '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>';

  var cols = days.map(function(d) {
    var inner = '';
    if (d.state === 'done') {
      inner = d.isSlid ? arrowIcon : checkIcon;
    } else if (d.state === 'skipped') {
      inner = dashIcon;
    } else if (d.state === 'rest') {
      inner = '<span class="day-circle-rest-dot"></span>';
    }

    var circleClass = 'day-circle day-circle--' + d.state + (d.isToday ? ' is-today' : '') + (d.isSelected ? ' is-selected' : '');
    var letterClass = 'week-strip-letter' + (d.isToday || d.isSelected ? ' is-selected' : '');

    return '<div class="week-strip-cell" data-pick-today-strip-date="' + d.dateKey + '" style="cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:6px;padding:6px 0;flex:1">'
      + '<span class="' + letterClass + '">' + d.dayLetter + '</span>'
      + '<div class="' + circleClass + '">' + inner + '</div>'
      + '</div>';
  });

  var monObj = new Date(monday + 'T00:00:00');
  var sunObj = new Date(sunday + 'T00:00:00');
  var rangeStr = monObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ' – ' + sunObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

  var navHeader = '<div style="display:flex;justify-content:space-between;align-items:center;padding:2px 0 6px;font-size:11px;color:#8A8A8E;font-weight:600">'
    + '<button type="button" class="btn-text-action" id="prevWeekBtn" style="color:#8A8A8E;background:none;border:none;padding:2px 4px;cursor:pointer;font-size:15px">&larr;</button>'
    + '<span class="t-micro" style="color:#8A8A8E">' + (offset === 0 ? 'This Week' : rangeStr) + '</span>'
    + (offset < 0 ? '<button type="button" class="btn-text-action" id="nextWeekBtn" style="color:#8A8A8E;background:none;border:none;padding:2px 4px;cursor:pointer;font-size:15px">&rarr;</button>' : '<span style="width:20px"></span>')
    + '</div>';

  return '<div class="week-strip-container" style="margin-bottom:12px;border-bottom:1px solid #222">'
    + navHeader
    + '<div class="week-strip-row" style="display:flex;justify-content:space-between;align-items:center;padding:6px 0 10px">' + cols.join('') + '</div>'
    + '</div>';
}

export { openWorkoutOverrideSheet } from "./workout-override.js";

export function buildCalRingHTML(kcalLogged, kcalTarget, protLogged, protTarget, carbsLogged, fatLogged, carbsTarget, fatTarget) {
  var remaining = Math.max(0, kcalTarget - kcalLogged);
  var isOver = kcalLogged > kcalTarget;
  var calPct = Math.min(100, Math.round(kcalLogged / Math.max(1, kcalTarget) * 100));
  var protPct = Math.min(100, Math.round(protLogged / Math.max(1, protTarget) * 100));

  var heroNumber = isOver ? ('+' + (kcalLogged - kcalTarget).toLocaleString()) : (remaining > 0 ? remaining.toLocaleString() : kcalLogged.toLocaleString());
  var heroLabel = isOver ? 'KCAL OVER' : 'KCAL REMAINING';
  var rawVal = isOver ? (kcalLogged - kcalTarget) : (remaining > 0 ? remaining : kcalLogged);

  var cTarget = Number(carbsTarget) || 415;
  var fTarget = Number(fatTarget) || 100;
  var carbsPct = Math.min(100, Math.round(((carbsLogged || 0) / Math.max(1, cTarget)) * 100));
  var fatPct = Math.min(100, Math.round(((fatLogged || 0) / Math.max(1, fTarget)) * 100));

  var centerHTML = '<div style="color:var(--accent-primary);display:inline-flex;align-items:center;justify-content:center;margin-bottom:2px">' + ic('flame', 18) + '</div>'
    + '<div class="t-display tabnum" id="todayHeroCal" style="font-size:var(--fs-64);font-weight:800;line-height:0.95;color:var(--text);letter-spacing:-0.03em;margin-bottom:4px"><span id="todayHeroCalNum" data-value="' + rawVal + '">' + heroNumber + '</span></div>'
    + '<div style="font-size:11px;font-weight:700;letter-spacing:0.08em;color:var(--accent-primary);text-transform:uppercase">' + heroLabel + '</div>'
    + '<div style="font-size:12px;font-weight:500;color:var(--text-secondary);margin-top:6px;font-variant-numeric:tabular-nums">' + Number(kcalLogged).toLocaleString() + ' / ' + Number(kcalTarget).toLocaleString() + ' kcal</div>';

  var ringHTML = buildSegmentedRing({ progress: calPct, size: 240, strokeWidth: 14, color: 'var(--accent-primary)', trackColor: 'var(--hairline)', centerHTML: centerHTML });

  var macroRowHTML = '<div style="display:grid;grid-template-columns:repeat(3, 1fr);gap:10px;margin-top:20px;margin-bottom:20px">'
    + '<div class="metric-card" style="padding:14px 12px">'
      + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">'
        + '<span style="font-size:var(--fs-caption);font-weight:600;letter-spacing:0.06em;color:var(--text-secondary);text-transform:uppercase">PROTEIN</span>'
        + '<div style="width:24px;height:24px;border-radius:50%;background:rgba(139, 92, 246, 0.15);color:var(--accent-primary);display:inline-flex;align-items:center;justify-content:center">' + ic('bolt', 13) + '</div>'
      + '</div>'
      + '<div style="font-size:var(--fs-15);font-weight:600;color:var(--text);font-variant-numeric:tabular-nums"><span id="todayProtNum" data-value="' + Math.round(protLogged) + '">' + Math.round(protLogged) + '</span> <span style="font-size:var(--fs-caption);font-weight:400;color:var(--text-secondary)">/ ' + Math.round(protTarget) + 'g</span></div>'
      + '<div class="prog-line" style="height:4px;border-radius:9999px;background:var(--hairline);margin-top:8px;overflow:hidden"><div class="prog-line-fill" id="todayProtFill" style="height:100%;border-radius:9999px;background:var(--accent-primary);transform-origin:left;transform:scaleX(' + (protPct / 100) + ')"></div></div>'
    + '</div>'
    + '<div class="metric-card" style="padding:14px 12px">'
      + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">'
        + '<span style="font-size:var(--fs-caption);font-weight:600;letter-spacing:0.06em;color:var(--accent-secondary);text-transform:uppercase">CARBS</span>'
        + '<div style="width:24px;height:24px;border-radius:50%;background:rgba(6, 182, 212, 0.15);color:var(--accent-secondary);display:inline-flex;align-items:center;justify-content:center">' + ic('bowl', 13) + '</div>'
      + '</div>'
      + '<div style="font-size:var(--fs-15);font-weight:600;color:var(--text);font-variant-numeric:tabular-nums">' + Math.round(carbsLogged || 0) + ' <span style="font-size:var(--fs-caption);font-weight:400;color:var(--text-secondary)">/ ' + Math.round(cTarget) + 'g</span></div>'
      + '<div class="prog-line" style="height:4px;border-radius:9999px;background:var(--hairline);margin-top:8px;overflow:hidden"><div class="prog-line-fill" style="height:100%;border-radius:9999px;background:var(--accent-secondary);transform-origin:left;transform:scaleX(' + (carbsPct / 100) + ')"></div></div>'
    + '</div>'
    + '<div class="metric-card" style="padding:14px 12px">'
      + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">'
        + '<span style="font-size:var(--fs-caption);font-weight:600;letter-spacing:0.06em;color:var(--accent-pink);text-transform:uppercase">FATS</span>'
        + '<div style="width:24px;height:24px;border-radius:50%;background:rgba(236, 72, 153, 0.15);color:var(--accent-pink);display:inline-flex;align-items:center;justify-content:center">' + ic('avocado', 13) + '</div>'
      + '</div>'
      + '<div style="font-size:var(--fs-15);font-weight:600;color:var(--text);font-variant-numeric:tabular-nums">' + Math.round(fatLogged || 0) + ' <span style="font-size:var(--fs-caption);font-weight:400;color:var(--text-secondary)">/ ' + Math.round(fTarget) + 'g</span></div>'
      + '<div class="prog-line" style="height:4px;border-radius:9999px;background:var(--hairline);margin-top:8px;overflow:hidden"><div class="prog-line-fill" style="height:100%;border-radius:9999px;background:var(--accent-pink);transform-origin:left;transform:scaleX(' + (fatPct / 100) + ')"></div></div>'
    + '</div>'
  + '</div>'
  + '<div id="todayCalFill" style="display:none;transform:scaleX(' + (calPct / 100) + ')"></div>';

  return '<div style="margin-bottom:8px">' + ringHTML + macroRowHTML + '</div>';
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

export function buildBackupNudgeHTML() {
  var lastBackup = ls('rg_last_backup') || ls('tally_last_backup');
  var now = Date.now();
  var diffDays = lastBackup ? Math.floor((now - new Date(lastBackup).getTime()) / 86400000) : 999;
  var snoozedUntil = ls('rg_backup_nudge_snooze', 0);
  if (diffDays < 14 || now < snoozedUntil) return '';

  var diffMsg = lastBackup ? (diffDays + ' days') : '14+ days';
  return '<div id="backupNudgeBanner" style="display:flex;align-items:center;justify-content:space-between;background:#141416;border-radius:12px;padding:10px 14px;margin-bottom:14px;border:1px solid #222">'
    + '<span style="font-size:11px;color:#8A8A8E">No backup for ' + diffMsg + ' · <button type="button" id="backupNudgeActionBtn" style="background:none;border:none;color:var(--accent-primary);font-size:11px;font-weight:600;padding:0;cursor:pointer">Back up now</button></span>'
    + '<button type="button" id="dismissBackupNudgeBtn" style="background:none;border:none;color:#8A8A8E;font-size:15px;cursor:pointer;padding:4px 8px;line-height:1" aria-label="Dismiss">&times;</button>'
    + '</div>';
}

export function bindBackupNudgeEvents(exportFn) {
  var nudgeAction = document.getElementById('backupNudgeActionBtn');
  if (nudgeAction) {
    nudgeAction.onclick = function() {
      if (typeof exportFn === 'function') exportFn();
    };
  }
  var nudgeDismiss = document.getElementById('dismissBackupNudgeBtn');
  if (nudgeDismiss) {
    nudgeDismiss.onclick = function() {
      sv('rg_backup_nudge_snooze', Date.now() + 7 * 86400000);
      var banner = document.getElementById('backupNudgeBanner');
      if (banner) banner.remove();
    };
  }
}

export function triggerTodayAnimations() {
  var heroNumEl = document.getElementById('todayHeroCalNum');
  if (heroNumEl) {
    var hVal = heroNumEl.dataset ? heroNumEl.dataset.value : (heroNumEl.getAttribute && heroNumEl.getAttribute('data-value'));
    animateNumber(heroNumEl, 0, parseInt(hVal, 10) || 0, { duration: 300, isTodayHero: true });
  }
  var protNumEl = document.getElementById('todayProtNum');
  if (protNumEl) {
    var pVal = protNumEl.dataset ? protNumEl.dataset.value : (protNumEl.getAttribute && protNumEl.getAttribute('data-value'));
    animateNumber(protNumEl, 0, parseInt(pVal, 10) || 0, { duration: 300, isTodayHero: true });
  }
  var cF = document.getElementById('todayCalFill');
  if (cF && cF.style.transform && cF.style.transform.includes('scaleX(1') && !window._calSheenPlayed) {
    window._calSheenPlayed = true; if (cF.parentElement) cF.parentElement.classList.add('sheen');
  }
  var pF = document.getElementById('todayProtFill');
  if (pF && pF.style.transform && pF.style.transform.includes('scaleX(1') && !window._protSheenPlayed) {
    window._protSheenPlayed = true; if (pF.parentElement) pF.parentElement.classList.add('sheen');
  }
}
