/* Progress digests: weekly and monthly review summaries, archives, and historical data access */

import { profile, setTab } from "../../state.js";
import { dayRecord, allDayKeys, getWorkoutSessions } from "../../storage.js";
import { getDayTotals, getTargetsForDate } from "../../lib/calc.js";
import { todayKey, dateKey, addDays, esc, daysBetween } from "../../lib/format.js";
import { triggerHaptic } from "../../lib/dom.js";
import { getWeightHistory, buildDotConsistencyCalendarHTML } from "./charts.js";
import { workoutHistoryHTML } from "./history.js";
import { openDayDetailSheet } from "./day-detail-sheet.js";

export function buildMonthlyDigestHTML(year, month, bgColor) {
  var monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  var monthName = monthNames[month];
  var firstDay = new Date(year, month, 1);
  var lastDay = new Date(year, month + 1, 0);
  var totalDaysInMonth = lastDay.getDate();
  var todayStr = todayKey();

  var tdays = (profile && profile.trainingDays) || [1,2,3,5,6];
  var sessionDays = {};
  try {
    getWorkoutSessions().forEach(function(s) {
      if (s.dayKey && (s.exercises || []).some(function(ex){ return (ex.sets || []).some(Boolean); })) {
        sessionDays[s.dayKey] = true;
      }
    });
  } catch(e) {}

  var trainedCount = 0, plannedCount = 0, totalKcal = 0, totalProt = 0, foodDays = 0;

  for (var d = 1; d <= totalDaysInMonth; d++) {
    var k = year + '-' + (month + 1 < 10 ? '0' : '') + (month + 1) + '-' + (d < 10 ? '0' : '') + d;
    var dow = new Date(year, month, d).getDay();

    if (tdays.includes(dow) && k <= todayStr) plannedCount++;
    var rec = dayRecord(k);
    var trained = !!sessionDays[k] || (rec && (rec.workoutDone || (rec.workout && Object.keys(rec.workout).some(function(id){ return (rec.workout[id]||[]).some(Boolean); }))));
    if (trained) trainedCount++;

    var totals = getDayTotals(k);
    if (totals.kcal > 0) {
      totalKcal += totals.kcal;
      totalProt += totals.protein;
      foodDays++;
    }
  }

  var avgKcal = foodDays ? Math.round(totalKcal / foodDays) : 0;
  var avgProt = foodDays ? Math.round(totalProt / foodDays) : 0;

  var startMonthKey = year + '-' + ((month + 1 < 10 ? '0' : '') + (month + 1)) + '-01';
  var endMonthKey = year + '-' + ((month + 1 < 10 ? '0' : '') + (month + 1)) + '-' + (totalDaysInMonth < 10 ? '0' : '') + totalDaysInMonth;
  var entries = getWeightHistory().filter(function(e){ return (e.dayKey || e.createdAt.slice(0, 10)) >= startMonthKey && (e.dayKey || e.createdAt.slice(0, 10)) <= endMonthKey; });
  
  var weightDeltaStr = '—';
  var monthWeightDesc = 'No weigh-ins';
  if (entries.length >= 2) {
    var wDiff = entries[entries.length - 1].weight - entries[0].weight;
    weightDeltaStr = (wDiff >= 0 ? '+' : '') + wDiff.toFixed(1) + ' <span style="font-size:15px;color:#8A8A8E;font-weight:400">kg</span>';
    monthWeightDesc = entries[0].weight.toFixed(1) + ' → ' + entries[entries.length - 1].weight.toFixed(1) + ' kg';
  } else if (entries.length === 1) {
    weightDeltaStr = entries[0].weight.toFixed(1) + ' <span style="font-size:15px;color:#8A8A8E;font-weight:400">kg</span>';
    monthWeightDesc = '1 weigh-in';
  }

  var consistencyPct = plannedCount > 0 ? Math.round((trainedCount / plannedCount) * 100) : 0;
  var bg = bgColor || '#141416';

  return '<div style="background:' + bg + ';border-radius:12px;padding:12px 14px;margin-top:8px;margin-bottom:8px;display:grid;grid-template-columns:repeat(3,1fr);gap:10px;text-align:left">'
    + '<div>'
      + '<div class="t-micro" style="color:#8A8A8E;font-size:11px;letter-spacing:0.04em">Workouts</div>'
      + '<div class="tabnum" style="font-size:28px;font-weight:600;color:#F5F5F4;line-height:1.15;margin-top:2px">' + trainedCount + '</div>'
      + '<div class="tabnum" style="font-size:11px;color:#8A8A8E;margin-top:2px">' + (plannedCount > 0 ? (consistencyPct + '% consistency') : 'Logged') + '</div>'
    + '</div>'
    + '<div>'
      + '<div class="t-micro" style="color:#8A8A8E;font-size:11px;letter-spacing:0.04em">Avg Intake</div>'
      + '<div class="tabnum" style="font-size:28px;font-weight:600;color:#F5F5F4;line-height:1.15;margin-top:2px">' + (avgKcal > 0 ? avgKcal : '—') + '<span style="font-size:15px;color:#8A8A8E;font-weight:400;margin-left:2px">kcal</span></div>'
      + '<div class="tabnum" style="font-size:11px;color:#8A8A8E;margin-top:2px">' + (avgProt > 0 ? (avgProt + 'g protein/day') : 'No food logged') + '</div>'
    + '</div>'
    + '<div>'
      + '<div class="t-micro" style="color:#8A8A8E;font-size:11px;letter-spacing:0.04em">Weight</div>'
      + '<div class="tabnum" style="font-size:28px;font-weight:600;color:#F5F5F4;line-height:1.15;margin-top:2px">' + weightDeltaStr + '</div>'
      + '<div class="tabnum" style="font-size:11px;color:#8A8A8E;margin-top:2px">' + esc(monthWeightDesc) + '</div>'
    + '</div>'
    + '</div>';
}

export function buildAllMonthsHistoryHTML() {
  var keys = allDayKeys();
  var monthSet = {};
  keys.forEach(function(k) { if (k && k.length >= 7) monthSet[k.slice(0, 7)] = true; });
  var curYm = todayKey().slice(0, 7);
  monthSet[curYm] = true;

  var sortedYm = Object.keys(monthSet).sort().reverse();
  var monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  var monthBlocks = sortedYm.map(function(ym) {
    var parts = ym.split('-');
    var y = parseInt(parts[0], 10);
    var m = parseInt(parts[1], 10) - 1;
    var title = monthNames[m] + ' ' + y;
    var isCurrentMonth = (ym === curYm);
    var statsHTML = buildMonthlyDigestHTML(y, m, '#1C1C1F');

    return '<div style="background:#141416;border-radius:14px;padding:14px;margin-bottom:12px;text-align:left">'
      + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">'
        + '<div style="font-size:17px;font-weight:600;color:#F5F5F4">' + esc(title) + '</div>'
        + (isCurrentMonth ? '<span class="t-micro" style="color:#C6F432;font-size:11px">Current Month</span>' : '')
      + '</div>'
      + statsHTML
      + '</div>';
  });

  return '<div>' + monthBlocks.join('') + '</div>';
}

export function buildWeeklyDigestHTML() {
  var keys = allDayKeys();
  if (!keys.length) return '<div style="padding:24px 0;text-align:center;color:#8A8A8E;font-size:15px">No weekly data recorded yet.</div>';

  var earliestKey = keys[0];
  var today = todayKey();
  var eDate = new Date(earliestKey + 'T00:00:00');
  var eDow = eDate.getDay();
  var firstMon = addDays(earliestKey, -(eDow === 0 ? 6 : eDow - 1));

  var tDate = new Date(today + 'T00:00:00');
  var tDow = tDate.getDay();
  var lastSun = addDays(today, (tDow === 0 ? 0 : 7 - tDow));

  var totalDays = daysBetween(firstMon, lastSun) + 1;
  var numWeeks = Math.max(1, Math.ceil(totalDays / 7));

  var allSessions = getWorkoutSessions();
  var allEntries = getWeightHistory();

  var weekBlocks = [];

  var chevronRightSVG = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>';

  for (var w = numWeeks - 1; w >= 0; w--) {
    var monKey = addDays(firstMon, w * 7);
    var sunKey = addDays(monKey, 6);
    var weekNum = w + 1;

    var monObj = new Date(monKey + 'T00:00:00');
    var sunObj = new Date(sunKey + 'T00:00:00');
    var rangeStr = monObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ' – ' + sunObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

    var wSessions = allSessions.filter(function(s) {
      return s.dayKey >= monKey && s.dayKey <= sunKey && (s.exercises || []).some(function(ex) { return (ex.sets || []).some(Boolean); });
    });
    var totalSets = wSessions.reduce(function(acc, s) {
      return acc + (s.exercises || []).reduce(function(a, ex) { return a + (ex.sets || []).filter(Boolean).length; }, 0);
    }, 0);

    var trainedRows = [], restRows = [], skippedDaysCount = 0, pureRestCount = 0, wKcal = 0, wProt = 0, wFoodDays = 0;
    var profileTrainingDays = (profile && profile.trainingDays) || [1, 2, 3, 5, 6];

    for (var d = 0; d < 7; d++) {
      var dKey = addDays(monKey, d);
      var curDayObj = new Date(dKey + 'T00:00:00');
      var dayName = curDayObj.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
      var t = getDayTotals(dKey);
      if (t.kcal > 0) { wKcal += t.kcal; wProt += t.protein; wFoodDays++; }

      var dSessions = wSessions.filter(function(s){ return s.dayKey === dKey; });
      var woLabel = dSessions.length ? (dSessions[0].label || dSessions[0].programLabel || 'Workout') : '';
      var dSets = dSessions.reduce(function(acc, s) {
        return acc + (s.exercises || []).reduce(function(a, ex) { return a + (ex.sets || []).filter(Boolean).length; }, 0);
      }, 0);

      var isTrained = dSessions.length > 0 || (dayRecord(dKey) && dayRecord(dKey).workoutDone);
      var isSched = profileTrainingDays.includes(curDayObj.getDay());

      if (isTrained) {
        trainedRows.push('<div class="list-row" data-jump-day="' + dKey + '" style="display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid #1C1C1F;cursor:pointer">'
          + '<div style="flex:1;min-width:0;overflow:hidden">'
            + '<div style="font-size:15px;font-weight:600;color:#F5F5F4;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(woLabel || 'Workout') + '</div>'
            + '<div style="font-size:11px;color:#8A8A8E;margin-top:2px;font-variant-numeric:tabular-nums">' + esc(dayName) + (dSets ? (' · ' + dSets + (dSets === 1 ? ' set' : ' sets')) : '') + '</div>'
          + '</div>'
          + '<span style="display:inline-flex;align-items:center;justify-content:center;color:#8A8A8E;width:32px;height:32px;flex-shrink:0">' + chevronRightSVG + '</span>'
          + '</div>');
      } else {
        if (isSched && dKey <= todayKey()) skippedDaysCount++;
        else pureRestCount++;
        var statusLabel = (isSched && dKey <= todayKey()) ? 'Skipped' : 'Rest';
        restRows.push('<div class="list-row rest-skipped-row" data-inspect-day="' + dKey + '" data-jump-day="' + dKey + '" style="display:flex;justify-content:space-between;align-items:center;min-height:56px;height:56px;box-sizing:border-box;border-bottom:1px solid #1C1C1F;cursor:pointer;padding:0">'
          + '<div style="flex:1;min-width:0;overflow:hidden">'
            + '<div style="font-size:15px;font-weight:500;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(dayName) + '</div>'
            + '<div style="font-size:11px;color:var(--text-secondary);margin-top:2px;font-variant-numeric:tabular-nums">' + esc(statusLabel) + (t.kcal > 0 ? (' · ' + t.kcal + ' kcal') : '') + '</div>'
          + '</div>'
          + '<span style="display:inline-flex;align-items:center;justify-content:center;color:#8A8A8E;width:32px;height:32px;flex-shrink:0">' + chevronRightSVG + '</span>'
          + '</div>');
      }
    }

    var totalWeekVol = wSessions.reduce(function(acc, s) {
      return acc + (s.exercises || []).reduce(function(a, ex) {
        return a + (ex.sets || []).reduce(function(v, st) { return v + ((Number(st && st.weight) || 0) * (Number(st && st.reps) || 0)); }, 0);
      }, 0);
    }, 0);
    var volDisp = totalWeekVol > 0 ? (Math.round(totalWeekVol).toLocaleString() + ' kg') : '–';

    var totalWeekDurMin = wSessions.reduce(function(acc, s) {
      var dSec = s.duration_sec != null ? Number(s.duration_sec) : (s.durationMinutes ? Number(s.durationMinutes) * 60 : 0);
      return acc + (dSec ? Math.round(dSec / 60) : 0);
    }, 0);
    var durDisp = totalWeekDurMin > 0 ? (totalWeekDurMin + ' min') : '–';

    var wWeighIns = allEntries.filter(function(e){ var k = e.dayKey || e.createdAt.slice(0, 10); return k >= monKey && k <= sunKey; });
    var avgWNum = wWeighIns.length > 0 ? (wWeighIns.reduce(function(sum, e){ return sum + Number(e.weight); }, 0) / wWeighIns.length) : null;
    var weightDisp = avgWNum ? (avgWNum.toFixed(1) + ' kg') : '–';

    var digestId = 'digest_wk_' + w;
    var restSummaryHTML = '';
    if (restRows.length > 0) {
      var countsParts = [];
      if (pureRestCount > 0) countsParts.push(pureRestCount + (pureRestCount === 1 ? ' rest day' : ' rest days'));
      if (skippedDaysCount > 0) countsParts.push(skippedDaysCount + ' skipped');
      var restLabel = (countsParts.join(' · ') || (restRows.length + ' rest days')) + ' ▾';
      restSummaryHTML = '<div style="cursor:pointer;padding:10px 0 2px;color:#8A8A8E;font-size:11px;display:flex;justify-content:space-between;align-items:center" data-toggle-digest="' + digestId + '">'
        + '<span>' + esc(restLabel) + '</span>'
        + '</div>'
        + '<div id="' + digestId + '" style="display:none;padding:4px 0">' + restRows.join('') + '</div>';
    }

    var sessionCountStr = wSessions.length + (wSessions.length === 1 ? ' session' : ' sessions');
    var setsCountStr = totalSets + (totalSets === 1 ? ' set' : ' sets');
    var sameMonth = monObj.getMonth() === sunObj.getMonth();
    var rangeTitle = sameMonth
      ? (monObj.getDate() + ' - ' + sunObj.getDate() + ' ' + sunObj.toLocaleDateString('en-GB', { month: 'short' }))
      : (monObj.getDate() + ' ' + monObj.toLocaleDateString('en-GB', { month: 'short' }) + ' - ' + sunObj.getDate() + ' ' + sunObj.toLocaleDateString('en-GB', { month: 'short' }));
    var headerSubtitle = sessionCountStr + ' · ' + setsCountStr;

    weekBlocks.push('<div style="background:#141416;border-radius:16px;padding:16px;margin-bottom:14px;text-align:left">'
      + '<div style="margin-bottom:12px">'
        + '<div style="font-size:17px;font-weight:600;color:var(--text);line-height:1.2">' + esc(rangeTitle) + '</div>'
        + '<div style="font-size:11px;color:var(--text-secondary);margin-top:2px">' + esc(headerSubtitle) + '</div>'
      + '</div>'
      + '<div style="display:grid;grid-template-columns:1fr 1px 1fr 1px 1fr;align-items:center;background:#1C1C1F;border-radius:12px;padding:12px 14px;margin-bottom:12px;text-align:center">'
        + '<div><div style="font-size:11px;font-weight:600;color:#8A8A8E;letter-spacing:0.04em;text-transform:uppercase">Volume</div><div class="tabnum" style="font-size:17px;font-weight:600;color:#F5F5F4;margin-top:2px">' + esc(volDisp) + '</div></div>'
        + '<div style="width:1px;height:28px;background:#222222"></div>'
        + '<div><div style="font-size:11px;font-weight:600;color:#8A8A8E;letter-spacing:0.04em;text-transform:uppercase">Duration</div><div class="tabnum" style="font-size:17px;font-weight:600;color:#F5F5F4;margin-top:2px">' + esc(durDisp) + '</div></div>'
        + '<div style="width:1px;height:28px;background:#222222"></div>'
        + '<div><div style="font-size:11px;font-weight:600;color:#8A8A8E;letter-spacing:0.04em;text-transform:uppercase">Weight</div><div class="tabnum" style="font-size:17px;font-weight:600;color:#F5F5F4;margin-top:2px">' + esc(weightDisp) + '</div></div>'
      + '</div>'
      + '<div>' + (trainedRows.length ? trainedRows.join('') : '<div style="font-size:11px;color:#8A8A8E;padding:6px 0">No sessions logged this week</div>') + '</div>'
      + restSummaryHTML
      + '</div>');
  }

  return '<div>' + weekBlocks.join('') + '</div>';
}

export function openHistoryArchiveModal(defaultTab) {
  defaultTab = defaultTab || 'weeks';
  var existing = document.getElementById('historyArchiveOverlay');
  if (existing && typeof existing.remove === 'function') existing.remove();

  var overlay = document.createElement('div');
  overlay.className = 'overlay active';
  overlay.id = 'historyArchiveOverlay';
  overlay.innerHTML = '<div class="sheet" style="background:#141416;border:none;border-radius:24px 24px 0 0;padding:20px 20px calc(24px + var(--safe-b));max-width:520px;width:100%;max-height:88vh;display:flex;flex-direction:column;box-sizing:border-box">'
    + '<div class="sheet-handle"></div>'
    + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">'
      + '<div>'
        + '<div style="font-size:28px;font-weight:600;color:#F5F5F4;line-height:1.15">History</div>'
        + '<div class="t-micro" style="color:#8A8A8E;margin-top:2px">Previous weeks and months archive</div>'
      + '</div>'
      + '<button type="button" class="btn-text-action" id="closeHistoryArchiveBtn" style="color:#8A8A8E;font-size:15px;background:none;border:none;padding:6px 0;cursor:pointer">Done</button>'
    + '</div>'
    + '<div class="history-segmented-control" style="margin-bottom:14px">'
      + '<button type="button" class="history-segment-btn' + (defaultTab === 'weeks' ? ' active' : '') + '" id="archiveTabWeeksBtn">Past Weeks</button>'
      + '<button type="button" class="history-segment-btn' + (defaultTab === 'months' ? ' active' : '') + '" id="archiveTabMonthsBtn">Past Months</button>'
    + '</div>'
    + '<div id="archiveScrollArea" style="overflow-y:auto;flex:1;-webkit-overflow-scrolling:touch;padding-right:2px"></div>'
    + '</div>';

  document.body.appendChild(overlay);

  function wireInteractions() {
    overlay.querySelectorAll('[data-toggle-digest]').forEach(function(el) {
      el.onclick = function() {
        var target = document.getElementById(el.dataset.toggleDigest);
        if (target) target.style.display = (target.style.display === 'none' ? 'block' : 'none');
      };
    });
    overlay.querySelectorAll('[data-jump-day]').forEach(function(btn) {
      btn.onclick = function(e) {
        if (e && e.stopPropagation) e.stopPropagation();
        triggerHaptic();
        if (btn.dataset.inspectDay) {
          openDayDetailSheet(btn.dataset.inspectDay);
          return;
        }
        overlay.remove();
        window.activeTodaySelectedDateKey = btn.dataset.jumpDay;
        if (typeof window !== 'undefined' && typeof window.setTab === 'function') { window.setTab('today'); }
        else { setTab('today'); if (typeof window !== 'undefined' && typeof window.renderTab === 'function') window.renderTab(); }
      };
    });
  }

  function renderTab(tab) {
    var area = overlay.querySelector('#archiveScrollArea'); if (!area) return;
    var wBtn = overlay.querySelector('#archiveTabWeeksBtn'), mBtn = overlay.querySelector('#archiveTabMonthsBtn');
    if (wBtn) wBtn.classList.toggle('active', tab === 'weeks');
    if (mBtn) mBtn.classList.toggle('active', tab === 'months');
    area.innerHTML = (tab === 'weeks') ? buildWeeklyDigestHTML() : buildAllMonthsHistoryHTML();
    wireInteractions();
  }

  var closeBtn = overlay.querySelector('#closeHistoryArchiveBtn');
  if (closeBtn) closeBtn.onclick = function() { triggerHaptic(); overlay.remove(); };
  var wBtn = overlay.querySelector('#archiveTabWeeksBtn');
  if (wBtn) wBtn.onclick = function() { triggerHaptic(); renderTab('weeks'); };
  var mBtn = overlay.querySelector('#archiveTabMonthsBtn');
  if (mBtn) mBtn.onclick = function() { triggerHaptic(); renderTab('months'); };
  overlay.onclick = function(e) { if (e.target === overlay) { triggerHaptic(); overlay.remove(); } };
  renderTab(defaultTab);
}

export function buildHistoryScreenHTML(historyTab) {
  historyTab = historyTab || 'weeks';
  var calendarHTML = buildDotConsistencyCalendarHTML();
  var tabsHTML = '<div class="history-segmented-control">'
    + '<button type="button" class="history-segment-btn' + (historyTab === 'weeks' ? ' active' : '') + '" id="historyTabWeeksBtn">Past Weeks</button>'
    + '<button type="button" class="history-segment-btn' + (historyTab === 'months' ? ' active' : '') + '" id="historyTabMonthsBtn">Past Months</button>'
    + '</div>';
  var listHTML = (historyTab === 'weeks') ? buildWeeklyDigestHTML() : buildAllMonthsHistoryHTML();
  return '<div class="app-view" style="padding-bottom:calc(32px + var(--safe-b))">'
    + calendarHTML
    + tabsHTML
    + '<div id="historyDigestListContainer">' + listHTML + '</div>'
    + '<div style="margin-top:24px"><div class="t-label" style="margin-bottom:12px">Logged Sessions</div>' + workoutHistoryHTML() + '</div>'
    + '</div>';
}

export function wireHistoryScreenEvents(container, onTabSwitch, onMonthChange) {
  if (!container || typeof container.querySelector !== 'function') return;
  var prevM = container.querySelector('#prevProgressMonthBtn');
  if (prevM) prevM.onclick = function() { triggerHaptic(); window.activeProgressMonthOffset = (window.activeProgressMonthOffset || 0) - 1; if (typeof onMonthChange === 'function') onMonthChange(); };
  var nextM = container.querySelector('#nextProgressMonthBtn');
  if (nextM) nextM.onclick = function() { triggerHaptic(); window.activeProgressMonthOffset = (window.activeProgressMonthOffset || 0) + 1; if (typeof onMonthChange === 'function') onMonthChange(); };
  var wBtn = container.querySelector('#historyTabWeeksBtn');
  if (wBtn) wBtn.onclick = function() { triggerHaptic(); if (typeof onTabSwitch === 'function') onTabSwitch('weeks'); };
  var mBtn = container.querySelector('#historyTabMonthsBtn');
  if (mBtn) mBtn.onclick = function() { triggerHaptic(); if (typeof onTabSwitch === 'function') onTabSwitch('months'); };

  container.querySelectorAll('[data-toggle-digest]').forEach(function(el) {
    el.onclick = function() {
      var target = document.getElementById(el.dataset.toggleDigest);
      if (target) target.style.display = (target.style.display === 'none' ? 'block' : 'none');
    };
  });

  container.querySelectorAll('[data-jump-day]').forEach(function(btn) {
    btn.onclick = function(e) {
      if (e && e.stopPropagation) e.stopPropagation();
      triggerHaptic();
      if (btn.dataset.inspectDay) {
        openDayDetailSheet(btn.dataset.inspectDay);
        return;
      }
      window.activeTodaySelectedDateKey = btn.dataset.jumpDay;
      if (typeof window !== 'undefined' && typeof window.setTab === 'function') {
        window.setTab('today');
      } else {
        setTab('today');
        if (typeof window !== 'undefined' && typeof window.renderTab === 'function') window.renderTab();
      }
    };
  });
}

