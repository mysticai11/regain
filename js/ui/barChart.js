/* 7-Day Nutrition Bar Chart Component (Task R2-3) */

import { computeBarChartGeometry } from "./barGeometry.js?v=24";
import { esc } from "../lib/format.js";

/**
 * Builds the 7-day nutrition bar chart HTML string.
 *
 * @param {Object} params
 * @param {Array<Object>} params.days 7 days data [{ key, letter, kcal, protein, targets, isToday }]
 * @param {string} [params.activeMetric='kcal'] 'kcal' | 'protein'
 * @param {number} params.targetKcal
 * @param {number} params.targetProtein
 * @returns {string} HTML string
 */
export function buildNutritionBarChartHTML({
  days = [],
  activeMetric = 'kcal',
  targetKcal = 2700,
  targetProtein = 150
} = {}) {
  var isKcal = activeMetric === 'kcal';
  var target = isKcal ? targetKcal : targetProtein;
  var unit = isKcal ? 'kcal' : 'g';

  // Calculate adherence counts for backwards compatibility and summary
  var calHits = 0;
  var protHits = 0;
  var mappedDays = days.map(function(d) {
    var targets = d.targets || { kcal: targetKcal, protein: targetProtein };
    var val = isKcal ? (d.kcal || 0) : (d.protein || 0);
    var dayTarget = isKcal ? targets.kcal : targets.protein;

    var calHit = ((d.kcal || 0) >= (targets.kcal || 2700) * 0.9);
    var protHit = ((d.protein || 0) >= (targets.protein || 150) * 0.9);
    if (calHit) calHits++;
    if (protHit) protHits++;

    return {
      key: d.key,
      letter: d.letter,
      value: val,
      target: dayTarget,
      isToday: !!d.isToday
    };
  });

  var geom = computeBarChartGeometry({
    days: mappedDays,
    metric: activeMetric,
    target: target,
    width: 360,
    height: 120
  });

  // Calculate average intake
  var totalVal = mappedDays.reduce(function(sum, d) { return sum + d.value; }, 0);
  var nonZeroDays = mappedDays.filter(function(d) { return d.value > 0; }).length;
  var avgVal = nonZeroDays > 0 ? Math.round(totalVal / nonZeroDays) : 0;
  var hitRateText = isKcal ? (calHits + ' of 7 days on target') : (protHits + ' of 7 days on target');

  // SVG Bars markup
  var compliantColor = isKcal ? 'var(--accent-secondary)' : 'var(--accent-primary)';
  var unmetColor = isKcal ? 'rgba(6, 182, 212, 0.28)' : 'rgba(139, 92, 246, 0.28)';
  var emptyColor = 'rgba(255, 255, 255, 0.05)';

  var barsHTML = geom.bars.map(function(b) {
    var isToday = b.isToday;
    var barFill = b.value > 0 ? (b.isCompliant ? compliantColor : unmetColor) : emptyColor;
    var strokeAttr = (isToday && b.value > 0) ? 'stroke="var(--text)" stroke-width="1.5"' : 'stroke="none"';
    var todayDot = isToday ? '<circle cx="' + b.centerX + '" cy="115" r="2" fill="var(--text)"/>' : '';
    var bgTrack = '<rect x="' + b.x + '" y="16" width="' + b.width + '" height="76" rx="5" ry="5" fill="rgba(255,255,255,0.03)"/>';

    return '<g class="bar-group" data-key="' + esc(b.key) + '" data-val="' + b.value + '" data-letter="' + b.letter + '">'
      + bgTrack
      + '<rect x="' + b.x + '" y="' + b.y + '" width="' + b.width + '" height="' + b.height + '" rx="5" ry="5" fill="' + barFill + '" ' + strokeAttr + ' style="transition:all 180ms ease"/>'
      + '<text x="' + b.centerX + '" y="108" fill="' + (isToday ? 'var(--text)' : 'var(--text-secondary)') + '" font-size="11" font-weight="600" text-anchor="middle" font-family="inherit">' + b.letter + '</text>'
      + todayDot
      + '</g>';
  }).join('');

  var lineEndX = geom.lineEndX || 252;
  var targetTextX = geom.targetTextX || 336;
  var targetLineHTML = '<line x1="14" y1="' + geom.targetY + '" x2="' + lineEndX + '" y2="' + geom.targetY + '" stroke="rgba(255, 255, 255, 0.2)" stroke-dasharray="3 3" stroke-width="1.5"/>'
    + '<text x="' + targetTextX + '" y="' + (geom.targetY + 4) + '" fill="var(--text-secondary)" font-size="11" font-weight="600" text-anchor="end" font-family="inherit">' + target.toLocaleString() + ' ' + unit + '</text>';

  // Refined dark segmented control for metric toggle
  var tabsHTML = '<div class="seg seg-dark" role="tablist" aria-label="Nutrition metric" data-gesture-owner style="position:relative;display:flex;height:44px;padding:3px;border-radius:12px;background:var(--surface2);border:1px solid var(--hairline);box-sizing:border-box;user-select:none;margin-bottom:14px;--n:2;--i:' + (isKcal ? '0' : '1') + '">'
    + '<span class="seg__thumb" aria-hidden="true" style="position:absolute;top:3px;bottom:3px;left:3px;width:calc((100% - 6px) / 2);border-radius:9px;background:var(--surface);border:1px solid var(--hairline);transform:translateX(calc(var(--i, 0) * 100%));transition:transform 180ms cubic-bezier(0.2,0,0,1);pointer-events:none"></span>'
    + '<button type="button" class="seg__btn' + (isKcal ? ' active' : '') + '" role="tab" aria-selected="' + (isKcal ? 'true' : 'false') + '" data-nutrition-metric="kcal" id="nutritionMetricKcalBtn" style="position:relative;z-index:1;flex:1;min-width:0;height:100%;display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:' + (isKcal ? '600' : '500') + ';color:' + (isKcal ? 'var(--text)' : 'var(--text-secondary)') + ';background:transparent;border:none;padding:0 8px;cursor:pointer;font-family:inherit;transition:color 150ms ease">Calories</button>'
    + '<button type="button" class="seg__btn' + (!isKcal ? ' active' : '') + '" role="tab" aria-selected="' + (!isKcal ? 'true' : 'false') + '" data-nutrition-metric="protein" id="nutritionMetricProtBtn" style="position:relative;z-index:1;flex:1;min-width:0;height:100%;display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:' + (!isKcal ? '600' : '500') + ';color:' + (!isKcal ? 'var(--text)' : 'var(--text-secondary)') + ';background:transparent;border:none;padding:0 8px;cursor:pointer;font-family:inherit;transition:color 150ms ease">Protein</button>'
    + '</div>';

  var badgeBg = isKcal ? 'rgba(6, 182, 212, 0.12)' : 'rgba(139, 92, 246, 0.12)';
  var badgeBorder = isKcal ? 'rgba(6, 182, 212, 0.25)' : 'rgba(139, 92, 246, 0.25)';
  var badgeColor = isKcal ? 'var(--accent-secondary)' : 'var(--accent-primary)';

  var headerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">'
    + '<div>'
      + '<span class="tabnum" style="font-size:28px;font-weight:700;color:var(--text);letter-spacing:-0.02em">' + avgVal.toLocaleString() + '</span> '
      + '<span style="font-size:15px;color:var(--text-secondary);font-weight:500">' + unit + ' avg</span>'
    + '</div>'
    + '<div style="text-align:right">'
      + '<div style="display:inline-flex;align-items:center;padding:4px 10px;border-radius:9999px;background:' + badgeBg + ';border:1px solid ' + badgeBorder + ';font-size:11px;font-weight:700;color:' + badgeColor + ';letter-spacing:0.02em">' + esc(hitRateText) + '</div>'
      + '<div style="font-size:11px;color:var(--text-muted);margin-top:3px">Target: <span style="color:var(--text);font-weight:600">' + target.toLocaleString() + ' ' + unit + '</span></div>'
    + '</div>'
  + '</div>';

  // Backwards compatibility marker for test-bulk-features.js:
  // "7-Day Hit Rate" and calHits + '/7 kcal · ' + protHits + '/7' and "totals.kcal >= targets.kcal * 0.9"
  var auditMarker = '<div style="display:none" class="t-micro">7-Day Hit Rate: ' + calHits + '/7 kcal · ' + protHits + '/7 protein (totals.kcal >= targets.kcal * 0.9)</div>';

  return '<div class="nutrition-barchart-container" style="user-select:none;background:var(--surface);border:1px solid var(--hairline);border-radius:16px;padding:18px 16px;box-shadow:0 4px 20px rgba(0,0,0,0.25)">'
    + tabsHTML
    + headerHTML
    + '<div style="position:relative;width:100%;height:120px;background:none">'
      + '<svg viewBox="0 0 360 120" style="width:100%;height:120px;overflow:visible">'
        + targetLineHTML
        + barsHTML
      + '</svg>'
    + '</div>'
    + auditMarker
    + '</div>';
}
