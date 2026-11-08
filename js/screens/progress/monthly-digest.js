/* Monthly Digest & Historical Monthly Summaries */

import { profile } from "../../state.js";
import { dayRecord, allDayKeys, getWorkoutSessions } from "../../storage.js";
import { getDayTotals } from "../../lib/calc.js";
import { todayKey, esc } from "../../lib/format.js";
import { getWeightHistory } from "./charts.js";

export function buildMonthlyDigestHTML(year, month, bgColor) {
  var monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
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
        + (isCurrentMonth ? '<span class="t-micro" style="color:var(--accent-primary);font-size:11px">Current Month</span>' : '')
      + '</div>'
      + statsHTML
      + '</div>';
  });

  return '<div>' + monthBlocks.join('') + '</div>';
}
