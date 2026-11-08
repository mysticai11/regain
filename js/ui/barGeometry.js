/* Pure Bar Chart Geometry Engine: dynamic Y-scale, bar layouts, and target compliance (Task R2-3) */

/**
 * Computes pure SVG layout geometry for 7-day bar chart.
 * Zero DOM, zero storage, zero Date.now() inside.
 *
 * @param {Object} params
 * @param {Array<Object>} params.days Array of 7 days [{ key, letter, value, target, isToday }]
 * @param {string} params.metric 'kcal' or 'protein'
 * @param {number} params.target Overall target value
 * @param {number} [params.width=320] ViewBox width
 * @param {number} [params.height=120] ViewBox height
 * @returns {Object} Chart geometry
 */
export function computeBarChartGeometry({
  days = [],
  metric = 'kcal',
  target = 2700,
  width = 320,
  height = 120
} = {}) {
  var insetX = 14;
  var insetY = 16;
  var rightGutter = 86;
  var plotW = width - insetX - rightGutter;
  var bottomPad = 26;
  var plotH = height - insetY - bottomPad;

  var values = days.map(function(d) { return Number(d.value) || 0; });
  var maxVal = Math.max.apply(null, [Number(target) || 0].concat(values));

  var step = metric === 'kcal' ? 500 : 25;
  var yMax = Math.max(step, Math.ceil((maxVal * 1.15) / step) * step);

  var targetY = insetY + ((yMax - target) / yMax) * plotH;

  var colW = plotW / Math.max(1, days.length);
  var barW = Math.min(18, Math.max(12, Math.floor(colW * 0.48)));

  var bars = days.map(function(d, i) {
    var val = Number(d.value) || 0;
    var dayTarget = Number(d.target) || target;
    var barH = yMax > 0 ? (val > 0 ? Math.max(4, (val / yMax) * plotH) : 2) : 2;
    var x = insetX + i * colW + (colW - barW) / 2;
    var y = insetY + plotH - barH;
    var isCompliant = (val >= dayTarget * 0.9);

    return {
      index: i,
      key: d.key,
      letter: d.letter,
      value: val,
      target: dayTarget,
      isToday: !!d.isToday,
      isCompliant: isCompliant,
      x: +x.toFixed(1),
      y: +y.toFixed(1),
      width: barW,
      height: +barH.toFixed(1),
      centerX: +(x + barW / 2).toFixed(1),
      fill: isCompliant ? '#C6F432' : '#F5F5F4'
    };
  });

  var lastBar = bars[bars.length - 1];
  var lineEndX = lastBar ? Math.round(lastBar.x + lastBar.width + 6) : (plotW + insetX);
  var targetTextX = width - 4;

  return {
    width: width,
    height: height,
    yMax: yMax,
    targetY: +targetY.toFixed(1),
    lineEndX: lineEndX,
    targetTextX: targetTextX,
    target: target,
    metric: metric,
    bars: bars
  };
}
