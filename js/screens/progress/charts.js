/* Progress charts: weight trend line SVG, dot consistency calendar, e1RM charts, and rolling averages */

import { profile } from "../../state.js";
import { dayRecord, allDayKeys, getWorkoutSessions } from "../../storage.js";
import { todayKey, dateKey, addDays, goalDirection, esc } from "../../lib/format.js";
import { getExerciseData, isBodyweightExercise } from "../../data/plan.js";
import { calcE1RM } from "../../lib/calc.js";
import { getEquivalentExerciseIds } from "../gym/sets.js";
import { ic } from "../../lib/dom.js";

export function getWeightHistory() {
  var entries = (profile && Array.isArray(profile.weightEntries)) ? profile.weightEntries.slice() : [];
  allDayKeys().forEach(function(k) {
    var r=dayRecord(k);
    if(r.weight!=null && !entries.some(function(e){return e.dayKey===k;})) entries.push({id:'legacy_'+k,dayKey:k,weight:r.weight,createdAt:k+'T12:00:00'});
  });
  return entries.filter(function(e){return e.weight!=null;}).sort(function(a,b){return String(a.createdAt||a.dayKey).localeCompare(String(b.createdAt||b.dayKey));});
}

export function getProgressRows(range, entries) {
  var days = { '4w': 28, '12w': 84, 'all': 0, '1w': 7, '1m': 30, '3m': 90 }[range];
  var cutoff = (!days || range === 'all') ? 0 : Date.now() - days * 86400000;
  return entries.filter(function(e) { return new Date(e.createdAt || e.dayKey + 'T12:00:00').getTime() >= cutoff; });
}

export function getRollingWeightValues(entries, source) {
  source = source || entries;
  return entries.map(function(entry) {
    var day = new Date((entry.dayKey || entry.createdAt).slice(0, 10) + 'T12:00:00');
    var start = day.getTime() - 6 * 86400000, end = day.getTime();
    var window = source.filter(function(e) {
      var t = new Date((e.dayKey || e.createdAt).slice(0, 10) + 'T12:00:00').getTime();
      return t >= start && t <= end;
    });
    var avg = window.reduce(function(sum, e) { return sum + Number(e.weight); }, 0) / window.length;
    var dKey = entry.dayKey || (entry.createdAt ? entry.createdAt.slice(0, 10) : '');
    return {
      id: entry.id || (dKey ? 'legacy_' + dKey : ''),
      value: Number(entry.weight),
      avg: +avg.toFixed(2),
      rawWeight: Number(entry.weight),
      dateKey: dKey,
      label: dKey + ' · ' + Number(entry.weight).toFixed(1) + ' kg (avg ' + avg.toFixed(1) + ')'
    };
  });
}

export function goalTrajectoryText(entries) {
  var target = Number((profile && profile.targetWeight) || 60), direction=goalDirection();
  if(!target||entries.length<7) return 'Keep logging — need 7+ weigh-ins for trend';
  var firstDate=new Date((entries[0].dayKey||entries[0].createdAt).slice(0,10)+'T12:00:00');
  var lastDate=new Date((entries[entries.length-1].dayKey||entries[entries.length-1].createdAt).slice(0,10)+'T12:00:00');
  var weeks=(lastDate-firstDate)/604800000;
  if(weeks<1) return 'Keep logging — need 7+ weigh-ins over time';
  var rate=(entries[entries.length-1].weight-entries[0].weight)/weeks;
  if(!Number.isFinite(rate)||direction*rate<=0) return 'No clear trend toward goal yet';
  var weeksLeft=Math.abs((target-entries[entries.length-1].weight)/rate);
  if(!Number.isFinite(weeksLeft)||weeksLeft>260) return 'Trend is too slow to estimate';
  var eta=new Date(lastDate.getTime()+weeksLeft*604800000);
  return 'Estimated '+eta.toLocaleDateString([], {month:'short',year:'numeric'})+' · based on logged intake and weight trend';
}

export function progressPlot(values, goal, unit, isLift) {
  if (!values || !values.length) {
    return '<div style="height:48px;display:flex;align-items:center;justify-content:center;font-size:15px;color:#8A8A8E">Log weight to see trend</div>';
  }
  var unitLabel = unit || 'kg';
  var isReps = unitLabel === 'reps';
  var nums = values.map(function(v){ return Number(v.value); });
  var rawMin = Math.min.apply(null, nums), rawMax = Math.max.apply(null, nums);
  var rawSpan = rawMax - rawMin;

  var goalNum = goal != null ? Number(goal) : ((profile && profile.targetWeight) ? Number(profile.targetWeight) : null);

  var pad = rawSpan ? Math.max(rawSpan * 0.15, 0.4) : 0.5;
  var min, max;
  if (!isLift && goalNum != null) {
    if (goalNum >= rawMax) {
      max = Math.max(goalNum, rawMax + 0.5);
      min = rawMin - pad;
    } else if (goalNum <= rawMin) {
      min = Math.min(goalNum, rawMin - 0.5);
      max = rawMax + pad;
    } else {
      min = Math.min(goalNum - pad, rawMin - pad);
      max = Math.max(goalNum + pad, rawMax + pad);
    }
  } else {
    min = rawMin - pad;
    max = rawMax + pad;
  }
  var span = max - min || 1;

  var svgWidth = 340;
  var svgHeight = 120;
  var insetX = 20;
  var insetY = 20;
  var plotW = svgWidth - insetX * 2 - 28;
  var plotH = svgHeight - insetY * 2;

  var points = values.map(function(v, i) {
    var x = values.length > 1 ? insetX + (i / (values.length - 1)) * plotW : insetX + plotW / 2;
    var y = insetY + ((max - v.value) / span) * plotH;
    return { x: x, y: y, v: v, idx: i };
  });

  var poly = points.map(function(p){ return p.x.toFixed(1) + ',' + p.y.toFixed(1); }).join(' ');
  var firstVal = Number(values[0].rawWeight || values[0].value);
  var lastVal = Number(values[values.length - 1].rawWeight || values[values.length - 1].value);
  var delta = lastVal - firstVal;
  var deltaSign = delta > 0 ? '+' : '';
  var deltaFormatted = values.length > 1 ? (delta === 0 ? '0.0 ' + unitLabel : (deltaSign + (isReps ? Math.round(delta) : delta.toFixed(1)) + ' ' + unitLabel)) : 'First entry';

  var goalY = goalNum != null ? (insetY + ((max - goalNum) / span) * plotH) : -999;
  var hasGoal = goalNum != null && goalY >= insetY - 1 && goalY <= svgHeight - insetY + 1;
  var goalLineHTML = '';
  if (hasGoal) {
    goalLineHTML = '<line x1="' + insetX + '" y1="' + goalY.toFixed(1) + '" x2="' + (insetX + plotW) + '" y2="' + goalY.toFixed(1) + '" stroke="#8A8A8E" stroke-dasharray="3 3" stroke-width="1.5"/>'
      + '<text x="' + (svgWidth - insetX) + '" y="' + (goalY + 4).toFixed(1) + '" fill="#8A8A8E" font-size="11" font-weight="600" text-anchor="end" font-family="Space Grotesk, sans-serif">' + Math.round(goalNum) + '</text>';
  }

  var showTopGuide = !hasGoal || Math.abs(goalY - insetY) >= 10;
  var showBottomGuide = !hasGoal || Math.abs(goalY - (svgHeight - insetY)) >= 10;
  var guideLinesHTML = '';
  if (showTopGuide) {
    guideLinesHTML += '<line x1="' + insetX + '" y1="' + insetY + '" x2="' + (insetX + plotW) + '" y2="' + insetY + '" stroke="#222222" stroke-width="1" stroke-dasharray="2 4"/>'
      + '<text x="' + (svgWidth - insetX) + '" y="' + (insetY + 4) + '" fill="#8A8A8E" font-size="11" text-anchor="end" font-family="Space Grotesk, sans-serif">' + max.toFixed(1) + '</text>';
  }
  if (showBottomGuide) {
    guideLinesHTML += '<line x1="' + insetX + '" y1="' + (svgHeight - insetY) + '" x2="' + (insetX + plotW) + '" y2="' + (svgHeight - insetY) + '" stroke="#222222" stroke-width="1" stroke-dasharray="2 4"/>'
      + '<text x="' + (svgWidth - insetX) + '" y="' + (svgHeight - insetY + 4) + '" fill="#8A8A8E" font-size="11" text-anchor="end" font-family="Space Grotesk, sans-serif">' + min.toFixed(1) + '</text>';
  }

  var peakIndex = -1;
  if (isLift && values.length > 0) {
    for (var pIdx = values.length - 1; pIdx >= 0; pIdx--) {
      if (values[pIdx].isPeak || values[pIdx].value === rawMax) { peakIndex = pIdx; break; }
    }
  }

  var dots = points.map(function(p, idx) {
    var isLatest = (idx === points.length - 1);
    var dateLabel = p.v.dateKey || (p.v.label ? p.v.label.slice(0, 10) : '');
    var displayWeight = Number(p.v.rawWeight != null ? p.v.rawWeight : p.v.value).toFixed(1);
    var tooltip = p.v.setDesc
      ? (dateLabel + ': ' + p.v.setDesc + (isReps ? '' : (' · Est. 1RM ' + Number(p.v.value).toFixed(1) + ' ' + unitLabel)))
      : (dateLabel + ': ' + displayWeight + ' ' + unitLabel);

    var extraDot = '';
    var baseFill = '#F5F5F4';

    if (isLift) {
      if (idx === peakIndex || p.v.isPeak) {
        baseFill = '#C6F432';
        extraDot = '<circle cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="6" fill="none" stroke="#C6F432" stroke-width="1.5"/>'
          + '<text x="' + p.x.toFixed(1) + '" y="' + (p.y - 10).toFixed(1) + '" fill="#C6F432" font-size="11" font-weight="600" text-anchor="middle" font-family="Space Grotesk, sans-serif">PR</text>';
      } else if (p.v.isPR) {
        baseFill = '#C6F432';
        extraDot = '<circle cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="5" fill="none" stroke="#C6F432" stroke-width="1.2"/>';
      } else if (isLatest && values.length > 1) {
        extraDot = '<circle cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="5" fill="none" stroke="#F5F5F4" stroke-width="1.5"/>';
      }
    } else if (isLatest && values.length > 1) {
      extraDot = '<circle cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="5" fill="none" stroke="#F5F5F4" stroke-width="1.5"/>';
    }

    return '<g class="chart-point-group" data-idx="' + idx + '" data-id="' + esc(p.v.id || '') + '" data-val="' + Number(p.v.value).toFixed(1) + '" data-raw-val="' + displayWeight + '" data-unit="' + unitLabel + '" data-date="' + esc(dateLabel) + '" data-set-desc="' + esc(p.v.setDesc || '') + '" data-is-pr="' + (p.v.isPR ? 'true' : 'false') + '" data-avg="' + (p.v.avg != null ? Number(p.v.avg).toFixed(1) : '') + '">'
      + '<circle cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="3" fill="' + baseFill + '" stroke="#0B0B0C" stroke-width="1.5"/>'
      + extraDot
      + '<circle cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="16" fill="transparent" style="cursor:pointer">'
        + '<title>' + esc(tooltip) + '</title>'
      + '</circle>'
      + '</g>';
  }).join('');

  var distinctLabels = [];
  values.forEach(function(v){
    var raw = String(v.dateKey || v.label || '').slice(0, 10);
    var match = raw.match(/\d{4}-\d{2}-\d{2}/);
    var d = match ? new Date(match[0] + 'T00:00:00') : new Date(raw);
    var dt = !isNaN(d.getTime()) ? d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : raw.replace(/^\d{4}-/, '').replace('-', '/');
    if (dt && !distinctLabels.includes(dt)) distinctLabels.push(dt);
  });
  var displayLabels = (distinctLabels.length <= 4) ? distinctLabels : [
    distinctLabels[0], distinctLabels[Math.round((distinctLabels.length - 1) / 3)],
    distinctLabels[Math.round(((distinctLabels.length - 1) / 3) * 2)], distinctLabels[distinctLabels.length - 1]
  ];

  var chartId = 'plot_' + Math.random().toString(36).slice(2, 8);
  var headerLeftHTML = '';
  if (isLift) {
    var peakEntry = values.find(function(v){ return v.isPeak; }) || values[values.length - 1];
    var peakVal = isReps ? Math.round(peakEntry.value) : Number(peakEntry.value).toFixed(1);
    var peakDesc = peakEntry.setDesc ? (' (' + peakEntry.setDesc + ')') : '';
    headerLeftHTML = '<span class="chart-readout tabnum" style="font-size:15px;color:#F5F5F4"><span style="color:#C6F432;font-weight:600">PR:</span> ' + peakVal + ' ' + unitLabel + '<span style="font-size:11px;color:#8A8A8E;margin-left:4px">' + esc(peakDesc) + '</span></span>';
  } else {
    headerLeftHTML = '<span class="chart-readout tabnum" style="font-size:15px;color:#F5F5F4">' + esc(deltaFormatted) + ' <span style="font-size:11px;color:#8A8A8E;text-transform:uppercase;letter-spacing:0.04em">' + (values.length > 1 ? 'overall' : '') + '</span></span>';
  }

  var headerRightHTML = isLift
    ? ('<span class="t-micro tabnum" style="color:var(--text-secondary)">' + values.length + ' ' + (values.length === 1 ? 'session' : 'sessions') + ' · ' + esc(deltaFormatted) + '</span>')
    : ('<span class="t-micro tabnum" style="color:var(--text-secondary)">' + values.length + ' ' + (values.length === 1 ? 'entry' : 'entries') + (goalNum != null ? (' · Target ' + Math.round(goalNum) + ' ' + unitLabel) : '') + '</span>');

  return '<div class="chart-container" id="' + chartId + '" style="margin-top:0;margin-bottom:12px;user-select:none">'
    + '<div class="chart-header" style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px">'
      + headerLeftHTML
      + headerRightHTML
    + '</div>'
    + '<div style="position:relative;width:100%;height:120px;background:none">'
      + '<svg viewBox="0 0 340 120" style="width:100%;height:120px;overflow:hidden">'
        + guideLinesHTML
        + goalLineHTML
        + (values.length > 1 ? '<polyline points="' + poly + '" fill="none" stroke="#F5F5F4" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>' : '')
        + dots
        + '<line class="chart-scrub-line" x1="-10" y1="10" x2="-10" y2="110" stroke="#8A8A8E" stroke-width="1" stroke-dasharray="2 2" style="display:none"/>'
      + '</svg>'
    + '</div>'
    + '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;font-size:11px;letter-spacing:0.08em;color:var(--text-secondary);text-transform:uppercase">'
      + displayLabels.map(function(l){ return '<span>' + esc(l) + '</span>'; }).join('')
    + '</div>'
    + '</div>';
}

export function buildDotConsistencyCalendarHTML() {
  var now = new Date();
  var todayStr = todayKey();
  var year = now.getFullYear();
  var month = now.getMonth();
  var monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var monthName = monthNames[month];

  var tdays = (profile && profile.trainingDays) || [1,2,3,5,6];
  var sessionDays = {};
  try {
    getWorkoutSessions().forEach(function(s) {
      if (s.dayKey && (s.exercises || []).some(function(ex) { return (ex.sets || []).some(Boolean); })) {
        sessionDays[s.dayKey] = true;
      }
    });
  } catch (e) {}

  var trainedCount = 0;
  var plannedCount = 0;
  var dots = [];

  var firstDay = new Date(year, month, 1);
  var lastDay = new Date(year, month + 1, 0);
  var totalDaysInMonth = lastDay.getDate();
  var firstDow = firstDay.getDay();
  var leadSpaces = (firstDow === 0) ? 6 : firstDow - 1;

  for (var s = 0; s < leadSpaces; s++) {
    dots.push('<span class="dot-cell" style="width:6px;height:6px;display:inline-block;visibility:hidden"></span>');
  }

  for (var d = 1; d <= totalDaysInMonth; d++) {
    var curD = new Date(year, month, d);
    var mStr = (month + 1 < 10 ? '0' : '') + (month + 1);
    var dStr = (d < 10 ? '0' : '') + d;
    var key = year + '-' + mStr + '-' + dStr;
    var dDow = curD.getDay();
    var isTrainingDay = tdays.includes(dDow);
    if (isTrainingDay && key <= todayStr) plannedCount++;

    var rec = dayRecord(key);
    var trained = !!sessionDays[key] || (rec && (rec.workoutDone || (rec.workout && Object.keys(rec.workout).some(function(k){return (rec.workout[k]||[]).some(Boolean);}))));
    var isToday = (key === todayStr);

    if (trained) trainedCount++;

    var dotStyle = 'width:6px;height:6px;border-radius:50%;display:inline-block;box-sizing:border-box;';
    var dayTitle = key;
    if (trained) {
      dotStyle += 'background:#C6F432;'; // all logged sessions = lime green
      dayTitle += ' (Logged)';
    } else if (isToday) {
      if (isTrainingDay) {
        dotStyle += 'background:transparent;border:1.5px solid #F5F5F4;'; // today training day = ring
        dayTitle += ' (Today · Training)';
      } else {
        dotStyle += 'background:#55555A;border:1.5px solid #F5F5F4;'; // today rest day = gray with ring
        dayTitle += ' (Today · Rest)';
      }
    } else if (key > todayStr) {
      dotStyle += 'background:#222222;'; // future = dim slot
    } else if (isTrainingDay) {
      dotStyle += 'background:transparent;border:1px solid #55555A;'; // untrained / skipped = ring
      dayTitle += ' (Skipped)';
    } else {
      dotStyle += 'background:#55555A;'; // rest day = solid gray
      dayTitle += ' (Rest)';
    }

    dots.push('<span class="dot-cell" style="' + dotStyle + '" title="' + esc(dayTitle) + '"></span>');
  }

  var trailSpaces = (7 - ((leadSpaces + totalDaysInMonth) % 7)) % 7;
  for (var t = 0; t < trailSpaces; t++) {
    dots.push('<span class="dot-cell" style="width:6px;height:6px;display:inline-block;visibility:hidden"></span>');
  }

  var dayLetters = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  var lettersRow = '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:8px;justify-items:center;align-items:center;margin-bottom:6px">'
    + dayLetters.map(function(ch) {
      return '<span style="font-size:11px;font-weight:600;color:#8A8A8E;line-height:1">' + ch + '</span>';
    }).join('')
    + '</div>';

  var legendHTML = '<div style="display:flex;align-items:center;justify-content:center;gap:14px;margin-top:12px;font-size:11px;color:#8A8A8E">'
    + '<span style="display:inline-flex;align-items:center;gap:4px"><span style="width:6px;height:6px;border-radius:50%;background:#C6F432;display:inline-block"></span> logged</span>'
    + '<span style="display:inline-flex;align-items:center;gap:4px"><span style="width:6px;height:6px;border-radius:50%;background:#55555A;display:inline-block"></span> rest</span>'
    + '<span style="display:inline-flex;align-items:center;gap:4px"><span style="width:6px;height:6px;border-radius:50%;border:1px solid #55555A;background:transparent;display:inline-block"></span> skipped</span>'
    + '</div>';

  return '<div style="margin-bottom:24px">'
    + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">'
      + '<span class="t-label">Consistency · ' + monthName + '</span>'
      + '<span class="t-micro tabnum" style="color:var(--text-secondary)">' + trainedCount + ' of ' + plannedCount + (plannedCount === 1 ? ' workout' : ' workouts') + '</span>'
    + '</div>'
    + lettersRow
    + '<div class="dot-grid" style="display:grid;grid-template-columns:repeat(7,1fr);gap:8px;justify-items:center;align-items:center;padding:2px 0">'
      + dots.join('')
    + '</div>'
    + legendHTML
    + '</div>';
}

export function getLiftHistory(selectedExId) {
  if (!selectedExId) return [];
  var selectedExData = (typeof getExerciseData === 'function') ? getExerciseData(selectedExId) : null;
  var isBW = isBodyweightExercise(selectedExId, selectedExData ? selectedExData.name : '');
  var eqIds = (typeof getEquivalentExerciseIds === 'function') ? getEquivalentExerciseIds(selectedExId) : [selectedExId];
  if (!eqIds.includes(selectedExId)) eqIds.push(selectedExId);

  var dateMap = {};
  function updateDateMap(k, sets) {
    (sets || []).forEach(function(s) {
      if (!s) return;
      var w = Number(s.weight) || 0, r = Number(s.reps) || 0;
      if (r <= 0 && w <= 0) return;
      var score = isBW ? r : calcE1RM(w, r);
      if (score > 0 && (!dateMap[k] || score > dateMap[k].score)) {
        dateMap[k] = { score: score, weight: w, reps: r, dayKey: k };
      }
    });
  }

  allDayKeys().forEach(function(k) {
    var rec = dayRecord(k);
    if (!rec || !rec.workout) return;
    eqIds.forEach(function(id) { updateDateMap(k, rec.workout[id]); });
  });

  try {
    getWorkoutSessions().forEach(function(session) {
      if (!session || !session.dayKey || !Array.isArray(session.exercises)) return;
      session.exercises.forEach(function(ex) {
        if (ex && eqIds.includes(ex.id)) updateDateMap(session.dayKey, ex.sets);
      });
    });
  } catch(e) {}

  var sortedDates = Object.keys(dateMap).sort();
  var runningMax = 0, allTimeMax = 0;
  sortedDates.forEach(function(k) {
    if (dateMap[k].score > allTimeMax) allTimeMax = dateMap[k].score;
  });

  return sortedDates.map(function(k) {
    var item = dateMap[k];
    var isPR = item.score > runningMax;
    if (isPR) runningMax = item.score;
    var isPeak = (item.score === allTimeMax && allTimeMax > 0);
    var setDesc = isBW ? (item.reps + ' reps') : (item.weight + ' kg × ' + item.reps + ' reps');
    return {
      value: Number(item.score.toFixed(1)), e1rm: Number(item.score.toFixed(1)),
      weight: item.weight, reps: item.reps, rawWeight: item.weight,
      dateKey: k, label: k + ' · ' + setDesc, setDesc: setDesc,
      isPR: isPR, isPeak: isPeak, isBW: isBW
    };
  });
}

export function renderRegression() { return ''; } export function buildExOptions() { return ''; } export function chartDefaults() { return {}; }
export function destroyCharts() {} export function buildProgressCharts() {} export function buildE1RMChart() {} export function buildLedger() {}
