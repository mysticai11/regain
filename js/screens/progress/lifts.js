/* Lifts Tab Enhanced View: Metric Switch, Monotone Spline Chart, Personal Bests, Recent Sessions (Item 3) */

import { computeLiftViewModel } from "../../view/liftStats.js";
import { createSegmented } from "../../ui/segmented.js";
import { renderLineChart } from "../../ui/lineChart.js";
import { esc } from "../../lib/format.js";
import { triggerHaptic } from "../../lib/dom.js";
import { getWorkoutSessions, allDayKeys, dayRecord } from "../../storage.js";

/**
 * Builds HTML for the 3-column Personal Bests card.
 */
export function buildPersonalBestsCardHTML(pb) {
  if (!pb) return '';
  var hVal = pb.heaviest ? (pb.heaviest.weight + ' kg') : '—';
  var hSub = pb.heaviest ? (pb.heaviest.dateKey + ' · ' + pb.heaviest.reps + ' reps') : 'No data';

  var eVal = pb.bestE1RM ? (pb.bestE1RM.value + ' kg') : '—';
  var eSub = pb.bestE1RM ? (pb.bestE1RM.dateKey) : 'No data';

  var vVal = pb.bestVolume ? (pb.bestVolume.value + ' kg') : '—';
  var vSub = pb.bestVolume ? (pb.bestVolume.dateKey) : 'No data';

  return '<div class="lift-summary-grid" style="margin-bottom:16px">'
    + '<div class="lift-summary-col">'
      + '<div class="lift-summary-label">HEAVIEST</div>'
      + '<div class="lift-summary-value" style="color:var(--text)">' + esc(hVal) + '</div>'
      + '<div class="t-micro tabnum" style="color:var(--text-secondary);margin-top:2px">' + esc(hSub) + '</div>'
    + '</div>'
    + '<div class="lift-summary-col">'
      + '<div class="lift-summary-label">BEST 1RM</div>'
      + '<div class="lift-summary-value" style="color:var(--text)">' + esc(eVal) + '</div>'
      + '<div class="t-micro tabnum" style="color:var(--text-secondary);margin-top:2px">' + esc(eSub) + '</div>'
    + '</div>'
    + '<div class="lift-summary-col">'
      + '<div class="lift-summary-label">BEST VOLUME</div>'
      + '<div class="lift-summary-value" style="color:var(--text)">' + esc(vVal) + '</div>'
      + '<div class="t-micro tabnum" style="color:var(--text-secondary);margin-top:2px">' + esc(vSub) + '</div>'
    + '</div>'
  + '</div>';
}

/**
 * Builds HTML for the Recent Sessions list.
 */
export function buildRecentSessionsHTML(recentSessions, maxShown) {
  maxShown = maxShown || 8;
  if (!Array.isArray(recentSessions) || recentSessions.length === 0) {
    return '<div style="margin-top:24px"><div class="t-label" style="margin-bottom:12px">Recent Sessions</div><div class="empty-state">No sessions recorded yet</div></div>';
  }

  var list = recentSessions.slice(0, maxShown);
  var rows = list.map(function(s) {
    var prBadge = s.isPR
      ? '<span class="lift-pr-badge" style="background:var(--lime);color:#0B0B0C;font-size:11px;font-weight:700;padding:2px 6px;border-radius:4px;letter-spacing:0.04em">PR</span>'
      : '';
    return '<div class="lift-session-row" style="display:flex;align-items:center;justify-content:space-between;padding:12px 14px;background:var(--surface);border:1px solid var(--hairline);border-radius:12px;margin-bottom:8px;box-sizing:border-box">'
      + '<div>'
        + '<div class="lift-session-date" style="font-size:15px;font-weight:600;color:var(--text)">' + esc(s.dateKey) + '</div>'
        + '<div class="tabnum" style="font-size:11px;color:var(--text-secondary);margin-top:2px">Top set: ' + s.topSet.weight + ' kg × ' + s.topSet.reps + '</div>'
      + '</div>'
      + '<div style="display:flex;align-items:center;gap:10px">'
        + '<div class="tabnum" style="font-size:var(--fs-14);color:var(--text-secondary);font-weight:500">' + s.volume + ' kg vol</div>'
        + prBadge
      + '</div>'
    + '</div>';
  }).join('');

  var expandBtn = '';
  if (recentSessions.length > maxShown) {
    expandBtn = '<button type="button" class="btn-text-action" id="showAllLiftSessionsBtn" style="color:var(--lime);font-size:15px;background:none;border:none;padding:8px 0;cursor:pointer;font-weight:600;display:block;width:100%;text-align:center">Show all (' + recentSessions.length + ')</button>';
  }

  return '<div style="margin-top:28px">'
    + '<div class="t-label" style="margin-bottom:12px">Recent Sessions</div>'
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
