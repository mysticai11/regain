/* Progress digests: weekly and monthly review summaries, archives, and historical data access */

import { profile } from "../../state.js";
import { dayRecord, allDayKeys, getWorkoutSessions } from "../../storage.js";
import { getDayTotals, getTargetsForDate } from "../../lib/calc.js";
import { todayKey, dateKey, addDays, esc, daysBetween } from "../../lib/format.js";
import { getWeightHistory } from "./charts.js";

export function buildMonthlyDigestHTML(year, month) {
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

  var trainedCount = 0;
  var plannedCount = 0;
  var totalKcal = 0;
  var totalProt = 0;
  var foodDays = 0;

  for (var d = 1; d <= totalDaysInMonth; d++) {
    var mStr = (month + 1 < 10 ? '0' : '') + (month + 1);
    var dStr = (d < 10 ? '0' : '') + d;
    var k = year + '-' + mStr + '-' + dStr;
    var curD = new Date(year, month, d);
    var dow = curD.getDay();

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

  return '<div style="background:#141416;border-radius:12px;padding:12px 14px;margin-top:12px;margin-bottom:20px;display:grid;grid-template-columns:repeat(3,1fr);gap:10px;text-align:left">'
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

export function buildWeeklyDigestHTML() {
  var keys = allDayKeys();
  if (!keys.length) return '';

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

    var wKcal = 0, wProt = 0, wFoodDays = 0;
    var dayRows = [];

    for (var d = 0; d < 7; d++) {
      var dKey = addDays(monKey, d);
      var curDayObj = new Date(dKey + 'T00:00:00');
      var dayName = curDayObj.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });

      var t = getDayTotals(dKey);
      if (t.kcal > 0) { wKcal += t.kcal; wProt += t.protein; wFoodDays++; }

      var dSessions = wSessions.filter(function(s){ return s.dayKey === dKey; });
      var woLabel = dSessions.length ? (dSessions[0].label || 'Workout') : '';
      var dSets = dSessions.reduce(function(acc, s) {
        return acc + (s.exercises || []).reduce(function(a, ex) { return a + (ex.sets || []).filter(Boolean).length; }, 0);
      }, 0);

      var wEntry = allEntries.find(function(e){ return (e.dayKey || e.createdAt.slice(0, 10)) === dKey; });

      var dayInfo = [];
      if (woLabel) dayInfo.push(esc(woLabel) + (dSets ? (' (' + dSets + ' sets)') : ''));
      if (t.kcal > 0) dayInfo.push(t.kcal + ' kcal · ' + t.protein + 'g');
      if (wEntry) dayInfo.push(wEntry.weight.toFixed(1) + ' kg');
      var dayDesc = dayInfo.join(' · ') || 'Rest';

      dayRows.push('<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;font-size:15px;color:#F5F5F4;border-bottom:1px solid #222">'
        + '<div style="display:flex;flex-direction:column">'
          + '<span style="font-size:11px;font-weight:600;color:#8A8A8E;text-transform:uppercase">' + esc(dayName) + '</span>'
          + '<span style="font-size:15px;color:' + (woLabel ? '#C6F432' : '#F5F5F4') + '">' + dayDesc + '</span>'
        + '</div>'
        + '<button type="button" class="btn-text-action" data-jump-day="' + dKey + '" style="font-size:11px;color:#8A8A8E;background:none;border:none;cursor:pointer;padding:4px">View</button>'
        + '</div>');
    }

    var avgKcal = wFoodDays ? Math.round(wKcal / wFoodDays) : 0;
    var avgProt = wFoodDays ? Math.round(wProt / wFoodDays) : 0;

    var wWeighIns = allEntries.filter(function(e){ var k = e.dayKey || e.createdAt.slice(0, 10); return k >= monKey && k <= sunKey; });
    var weightStr = 'No weigh-ins';
    if (wWeighIns.length >= 2) {
      var diff = wWeighIns[wWeighIns.length - 1].weight - wWeighIns[0].weight;
      weightStr = wWeighIns[0].weight.toFixed(1) + ' → ' + wWeighIns[wWeighIns.length - 1].weight.toFixed(1) + ' kg (' + (diff >= 0 ? '+' : '') + diff.toFixed(1) + ' kg)';
    } else if (wWeighIns.length === 1) {
      weightStr = wWeighIns[0].weight.toFixed(1) + ' kg';
    }

    var digestId = 'digest_wk_' + w;

    weekBlocks.push('<div style="background:#141416;border-radius:12px;padding:14px;margin-bottom:12px;text-align:left">'
      + '<div style="display:flex;justify-content:space-between;align-items:center;cursor:pointer" data-toggle-digest="' + digestId + '">'
        + '<div>'
          + '<div class="t-micro" style="color:#C6F432;font-size:11px;letter-spacing:0.04em">Week ' + weekNum + ' · ' + esc(rangeStr) + '</div>'
          + '<div class="tabnum" style="font-size:17px;font-weight:600;color:#F5F5F4;margin-top:2px">' + wSessions.length + (wSessions.length === 1 ? ' session' : ' sessions') + ' · ' + totalSets + ' sets · ' + (avgKcal > 0 ? (avgKcal + ' kcal/day') : 'No food') + '</div>'
          + '<div class="tabnum" style="font-size:11px;color:#8A8A8E;margin-top:2px">' + esc(weightStr) + '</div>'
        + '</div>'
        + '<button type="button" class="btn-text-action" style="color:#8A8A8E;font-size:11px;background:none;border:none;cursor:pointer;padding:0">Details</button>'
      + '</div>'
      + '<div id="' + digestId + '" style="display:none;margin-top:10px;padding-top:10px;border-top:1px solid #222">'
        + dayRows.join('')
      + '</div>'
      + '</div>');
  }

  return '<div style="margin-top:28px">'
    + '<div class="t-label" style="margin-bottom:12px">Weekly History · Previous weeks</div>'
    + weekBlocks.join('')
    + '</div>';
}
