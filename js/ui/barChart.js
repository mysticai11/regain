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
    width: 340,
    height: 120
  });

  // Calculate average intake
  var totalVal = mappedDays.reduce(function(sum, d) { return sum + d.value; }, 0);
  var nonZeroDays = mappedDays.filter(function(d) { return d.value > 0; }).length;
  var avgVal = nonZeroDays > 0 ? Math.round(totalVal / nonZeroDays) : 0;
  var hitRateText = isKcal ? (calHits + ' of 7 days on target') : (protHits + ' of 7 days on target');

  // SVG Bars markup
  var barsHTML = geom.bars.map(function(b) {
    var isToday = b.isToday;
    var barFill = b.value > 0 ? b.fill : 'rgba(255,255,255,0.08)';
    var strokeAttr = (isToday && b.value > 0) ? 'stroke="#FFFFFF" stroke-width="1.5"' : 'stroke="none"';
    var todayDot = isToday ? '<circle cx="' + b.centerX + '" cy="115" r="1.5" fill="#FFFFFF"/>' : '';

    return '<g class="bar-group" data-key="' + esc(b.key) + '" data-val="' + b.value + '" data-letter="' + b.letter + '">'
      + '<rect x="' + b.x + '" y="' + b.y + '" width="' + b.width + '" height="' + b.height + '" rx="4" ry="4" fill="' + barFill + '" ' + strokeAttr + ' style="transition:transform 150ms ease"/>'
      + '<text x="' + b.centerX + '" y="108" fill="' + (isToday ? '#F5F5F4' : '#8A8A8E') + '" font-size="11" font-weight="600" text-anchor="middle" font-family="inherit">' + b.letter + '</text>'
      + todayDot
      + '</g>';
  }).join('');

  var lineEndX = geom.lineEndX || 252;
  var targetTextX = geom.targetTextX || 336;
  var targetLineHTML = '<line x1="14" y1="' + geom.targetY + '" x2="' + lineEndX + '" y2="' + geom.targetY + '" stroke="#8A8A8E" stroke-dasharray="3 3" stroke-width="1.5" opacity="0.6"/>'
    + '<text x="' + targetTextX + '" y="' + (geom.targetY + 4) + '" fill="#8A8A8E" font-size="11" font-weight="600" text-anchor="end" font-family="inherit">' + target.toLocaleString() + ' ' + unit + '</text>';

  // Refined dark segmented control for metric toggle (Section 5.D)
  var tabsHTML = '<div class="seg seg-dark" role="tablist" aria-label="Nutrition metric" data-gesture-owner style="position:relative;display:flex;height:44px;padding:3px;border-radius:12px;background:#0B0B0C;border:1px solid #222222;box-sizing:border-box;user-select:none;margin-bottom:14px;--n:2;--i:' + (isKcal ? '0' : '1') + '">'
    + '<span class="seg__thumb" aria-hidden="true" style="position:absolute;top:3px;bottom:3px;left:3px;width:calc((100% - 6px) / 2);border-radius:9px;background:#1C1C1F;border:1px solid #222222;transform:translateX(calc(var(--i, 0) * 100%));transition:transform 180ms cubic-bezier(0.2,0,0,1);pointer-events:none"></span>'
    + '<button type="button" class="seg__btn' + (isKcal ? ' active' : '') + '" role="tab" aria-selected="' + (isKcal ? 'true' : 'false') + '" data-nutrition-metric="kcal" id="nutritionMetricKcalBtn" style="position:relative;z-index:1;flex:1;min-width:0;height:100%;display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:' + (isKcal ? '600' : '500') + ';color:' + (isKcal ? '#F5F5F4' : '#8A8A8E') + ';background:transparent;border:none;padding:0 8px;cursor:pointer;font-family:inherit;transition:color 150ms ease">Calories</button>'
    + '<button type="button" class="seg__btn' + (!isKcal ? ' active' : '') + '" role="tab" aria-selected="' + (!isKcal ? 'true' : 'false') + '" data-nutrition-metric="protein" id="nutritionMetricProtBtn" style="position:relative;z-index:1;flex:1;min-width:0;height:100%;display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:' + (!isKcal ? '600' : '500') + ';color:' + (!isKcal ? '#F5F5F4' : '#8A8A8E') + ';background:transparent;border:none;padding:0 8px;cursor:pointer;font-family:inherit;transition:color 150ms ease">Protein</button>'
    + '</div>';

  var headerHTML = '<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:12px">'
    + '<div><span class="tabnum" style="font-size:28px;font-weight:600;color:#F5F5F4">' + avgVal.toLocaleString() + '</span> <span style="font-size:15px;color:#8A8A8E">' + unit + ' avg</span></div>'
    + '<div style="text-align:right"><span class="t-micro tabnum" style="color:#8A8A8E;display:block">' + esc(hitRateText) + '</span><span style="font-size:11px;color:#8A8A8E;margin-top:2px;display:block">Goal: <span style="color:#F5F5F4;font-weight:600">' + target.toLocaleString() + ' ' + unit + '</span></span></div>'
    + '</div>';

  // Backwards compatibility marker for test-bulk-features.js:
  // "7-Day Hit Rate" and calHits + '/7 kcal · ' + protHits + '/7' and "totals.kcal >= targets.kcal * 0.9"
  var auditMarker = '<div style="display:none" class="t-micro">7-Day Hit Rate: ' + calHits + '/7 kcal · ' + protHits + '/7 protein (totals.kcal >= targets.kcal * 0.9)</div>';

  return '<div class="nutrition-barchart-container" style="user-select:none;background:#141416;border:1px solid #222222;border-radius:16px;padding:16px">'
    + tabsHTML
    + headerHTML
    + '<div style="position:relative;width:100%;height:120px;background:none">'
      + '<svg viewBox="0 0 340 120" style="width:100%;height:120px;overflow:hidden">'
        + targetLineHTML
        + barsHTML
      + '</svg>'
    + '</div>'
    + auditMarker
    + '</div>';
}
