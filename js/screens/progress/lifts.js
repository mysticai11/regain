/* Lifts Tab Enhanced View: Metric Switch, Monotone Spline Chart, Personal Bests, Recent Sessions (Item 3) */

import { computeLiftViewModel } from "../../view/liftStats.js";
import { createSegmented } from "../../ui/segmented.js";
import { renderLineChart } from "../../ui/lineChart.js";
import { esc } from "../../lib/format.js";
import { triggerHaptic } from "../../lib/dom.js";
import { getWorkoutSessions, allDayKeys, dayRecord } from "../../storage.js";
import { getLoggedWeeklyVolume, getWeeklyVolume } from "../../lib/calc.js";

/**
 * Builds HTML for the personal bests section (streamlined to avoid redundancy with hero summary).
 */
export function buildPersonalBestsCardHTML(pb) {
  return '';
}

/**
 * Builds HTML for the Recent Sessions list.
 */
export function buildRecentSessionsHTML(recentSessions, maxShown) {
  maxShown = maxShown || 8;
  if (!Array.isArray(recentSessions) || recentSessions.length === 0) {
    return '<div style="margin-top:24px"><div class="t-label" style="margin-bottom:12px">RECENT SESSIONS</div><div class="empty-state" style="background:var(--surface);border:1px solid var(--hairline);border-radius:16px;padding:24px;text-align:center;color:var(--text-secondary)">No sessions recorded yet</div></div>';
  }

  var list = recentSessions.slice(0, maxShown);
  var rows = list.map(function(s) {
    var prBadge = s.isPR
      ? '<span class="lift-pr-badge" style="background:rgba(139, 92, 246, 0.15);border:1px solid rgba(139, 92, 246, 0.35);color:var(--accent-primary);font-size:11px;font-weight:700;padding:2px 8px;border-radius:6px;letter-spacing:0.04em">PR</span>'
      : '';
    return '<div class="lift-session-row" style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px;background:var(--surface);border:1px solid var(--hairline);border-radius:14px;margin-bottom:8px;box-sizing:border-box">'
      + '<div>'
        + '<div class="lift-session-date" style="font-size:15px;font-weight:600;color:var(--text)">' + esc(s.dateKey) + '</div>'
        + '<div class="tabnum" style="font-size:11px;color:var(--text-secondary);margin-top:3px">Top set: <span style="color:var(--text);font-weight:600">' + s.topSet.weight + ' kg × ' + s.topSet.reps + '</span></div>'
      + '</div>'
      + '<div style="display:flex;align-items:center;gap:12px">'
        + '<div class="tabnum" style="font-size:11px;color:var(--text-secondary);font-weight:600">' + s.volume + ' kg vol</div>'
        + prBadge
      + '</div>'
    + '</div>';
  }).join('');

  var expandBtn = '';
  if (recentSessions.length > maxShown) {
    expandBtn = '<button type="button" class="btn-text-action" id="showAllLiftSessionsBtn" style="color:var(--accent-primary);font-size:15px;background:none;border:none;padding:12px 0;cursor:pointer;font-weight:600;display:block;width:100%;text-align:center">Show all (' + recentSessions.length + ')</button>';
  }

  return '<div style="margin-top:28px">'
    + '<div class="t-label" style="margin-bottom:12px">RECENT SESSIONS</div>'
    + '<div id="recentSessionsListArea">' + rows + '</div>'
    + expandBtn
  + '</div>';
}

/**
 * Enhances the Lifts tab view with Item 1 Segmented metric switch, Item 2 Monotone Spline chart,
 * Personal Bests card, and Recent Sessions feed.
 */
export function enhanceLiftsTab({
  selected,
  isBW,
  liftRange,
  liftValues = [],
  activeMetric = 'e1rm',
  maxSessionsShown = 8,
  onMetricChange,
  onShowAllSessions
}) {
  var sessions = [];
  if (typeof getWorkoutSessions === 'function') {
    sessions = (getWorkoutSessions() || []).slice();
  }
  if (sessions.length === 0 && typeof allDayKeys === 'function') {
    var dKeys = allDayKeys();
    for (var k = 0; k < dKeys.length; k++) {
      var key = dKeys[k];
      var rec = typeof dayRecord === 'function' ? dayRecord(key) : null;
      if (rec && rec.workout) {
        sessions.push({ dayKey: key, dateKey: key, workout: rec.workout });
      }
    }
  }

  var vm = computeLiftViewModel({
    exerciseId: selected,
    sessions: sessions,
    metric: activeMetric,
    range: liftRange,
    nowMs: Date.now()
  });

  // 1. Metric Segmented Control
  var segMount = document.getElementById('liftMetricSegContainer');
  if (segMount && typeof document !== 'undefined' && typeof document.createElement === 'function' && typeof createSegmented === 'function') {
    segMount.innerHTML = '';
    var seg = createSegmented({
      options: [
        { value: 'e1rm', label: 'Est. 1RM' },
        { value: 'topSet', label: 'Top set' },
        { value: 'volume', label: 'Volume' }
      ],
      value: activeMetric,
      ariaLabel: 'Lift metric',
      onChange: function(newMetric) {
        if (typeof onMetricChange === 'function') onMetricChange(newMetric);
      }
    });
    if (seg && seg.el && typeof segMount.appendChild === 'function') {
      segMount.appendChild(seg.el);
    }
  }

  // 2. Summary Card update
  var liftSummaryCard = document.getElementById('liftSummaryCard');
  if (liftSummaryCard) {
    if (liftValues && liftValues.length > 0) {
      var allTimePeak = liftValues.find(function(v){ return v.isPeak; }) || liftValues[liftValues.length - 1];
      var latestEntry = liftValues[liftValues.length - 1], firstEntry = liftValues[0];
      var gainRaw = latestEntry.value - firstEntry.value;
      var gainVal = isBW ? Math.round(gainRaw) : Number(gainRaw.toFixed(1));
      if (Math.abs(gainVal) < 0.0001) gainVal = 0;
      var u = (activeMetric === 'volume') ? 'kg' : (isBW ? 'reps' : 'kg');
      var changeColor = gainVal > 0 ? 'var(--lime)' : (gainVal < 0 ? 'var(--text)' : 'var(--text-secondary)');
      var gainStr = (gainVal > 0 ? '+' : '') + (isBW ? gainVal : gainVal.toFixed(1));
      var peakVal = isBW ? Math.round(allTimePeak.value) : allTimePeak.value.toFixed(1);
      var curVal = isBW ? Math.round(latestEntry.value) : latestEntry.value.toFixed(1);
      var unitHTML = '<span class="lift-summary-unit">' + u + '</span>';
      var labelBest = (activeMetric === 'topSet') ? 'BEST TOP' : ((activeMetric === 'volume') ? 'BEST VOL' : 'BEST 1RM');

      liftSummaryCard.innerHTML = '<div class="lift-summary-grid">'
        + '<div class="lift-summary-col"><div class="lift-summary-label">' + labelBest + '</div><div class="lift-summary-value" style="color:var(--text)">' + peakVal + unitHTML + '</div></div>'
        + '<div class="lift-summary-col"><div class="lift-summary-label">LATEST</div><div class="lift-summary-value" style="color:var(--text)">' + curVal + unitHTML + '</div></div>'
        + '<div class="lift-summary-col"><div class="lift-summary-label">CHANGE</div><div class="lift-summary-value" style="color:' + changeColor + '">' + gainStr + unitHTML + '</div></div>'
      + '</div>';
    } else {
      liftSummaryCard.innerHTML = '';
    }
  }

  // 3. Monotone Line Chart
  var liftPlot = document.getElementById('liftPlot');
  if (liftPlot) {
    if (!liftValues || liftValues.length < 2) {
      liftPlot.innerHTML = '<div style="background:var(--surface);border:1px solid var(--hairline);border-radius:14px;padding:20px;text-align:center">'
        + '<div style="font-size:15px;font-weight:600;color:var(--text);margin-bottom:4px">Log 2+ sessions to see your trend</div>'
        + '<div style="font-size:var(--fs-13);color:var(--text-secondary)">Track this exercise across workouts to view strength curves and estimated 1RM.</div>'
      + '</div>';
    } else if (typeof document !== 'undefined' && typeof document.createElementNS === 'function' && typeof liftPlot.appendChild === 'function') {
      var points = (vm.chartPoints && vm.chartPoints.length > 0) ? vm.chartPoints : liftValues.map(function(lv) {
        var t = new Date(lv.dateKey + 'T12:00:00').getTime();
        return { t: t, v: Number(lv.value), label: lv.dateKey };
      });
      renderLineChart({
        container: liftPlot,
        data: points,
        height: 200,
        unit: (activeMetric === 'volume') ? 'kg' : (isBW ? 'reps' : 'kg'),
        ariaLabel: 'Lift progress curve'
      });
    }
  }

  // 4. Personal Bests Card
  var pbCard = document.getElementById('liftPersonalBestsCard');
  if (pbCard) {
    pbCard.innerHTML = buildPersonalBestsCardHTML(vm.personalBests);
  }

  // 5. Recent Sessions Feed
  var feed = document.getElementById('liftRecentSessionsFeed');
  if (feed) {
    feed.innerHTML = buildRecentSessionsHTML(vm.recentSessions, maxSessionsShown);
    var showMoreBtn = feed.querySelector('#showAllLiftSessionsBtn');
    if (showMoreBtn) {
      showMoreBtn.onclick = function() {
        triggerHaptic();
        if (typeof onShowAllSessions === 'function') onShowAllSessions();
      };
    }
  }
}

/**
 * Modern 2-column grid visualization of Weekly Sets by Muscle with .metric-card cards,
 * bold numbers, and violet gradient segmented progress bars.
 */
export function weeklyVolumeChart() {
  var logged = getLoggedWeeklyVolume(), planned = getWeeklyVolume(), plannedByMuscle = {};
  planned.forEach(function(v){ plannedByMuscle[v.muscle] = v.sets; });
  var targetFloor = 10;
  var items = logged.map(function(v) {
    var target = plannedByMuscle[v.muscle] || targetFloor;
    return {
      muscle: v.muscle,
      sets: v.sets,
      target: target,
      pct: Math.min(100, Math.round(v.sets / target * 100)),
      isDone: v.sets >= target
    };
  });
  items.sort(function(a, b) {
    return a.isDone !== b.isDone ? (a.isDone ? 1 : -1) : (a.sets / a.target) - (b.sets / b.target);
  });

  var cards = items.map(function(v) {
    var setsColor = v.isDone ? 'var(--accent-primary)' : 'var(--text)';
    var barGlow = v.isDone ? 'box-shadow:var(--glow-violet, 0 0 10px rgba(139,92,246,0.3));' : '';
    return '<div class="metric-card weekly-muscle-card" style="background:linear-gradient(135deg,rgba(255,255,255,0.04) 0%,rgba(255,255,255,0.01) 100%),var(--surface);border:1px solid var(--hairline);border-radius:16px;padding:14px 16px;box-sizing:border-box;display:flex;flex-direction:column;justify-content:space-between;min-height:104px;box-shadow:var(--card-shadow, 0 4px 16px rgba(0,0,0,0.25))">'
      + '<div style="display:flex;justify-content:space-between;align-items:baseline">'
        + '<div style="font-size:11px;letter-spacing:0.05em;color:var(--text-secondary);text-transform:uppercase;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(v.muscle) + '</div>'
        + (v.isDone ? '<span style="font-size:11px;font-weight:700;color:var(--accent-primary);letter-spacing:0.04em">DONE</span>' : '')
      + '</div>'
      + '<div class="tabnum" style="font-size:var(--fs-24, 24px);font-weight:800;color:' + setsColor + ';line-height:1.1;margin:10px 0 12px;font-variant-numeric:tabular-nums">'
        + v.sets + ' <span style="font-size:15px;font-weight:600;color:var(--text-secondary)">/ ' + v.target + '</span>'
      + '</div>'
      + '<div style="height:8px;background:var(--surface2);border-radius:999px;overflow:hidden;position:relative;' + barGlow + '">'
        + '<div style="height:100%;border-radius:999px;background:linear-gradient(90deg, #8B5CF6, #D946EF);width:' + v.pct + '%;transition:width 0.3s ease"></div>'
      + '</div>'
    + '</div>';
  }).join('');

  return '<div class="weekly-sets-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;box-sizing:border-box">' + cards + '</div>';
}
