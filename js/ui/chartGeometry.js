/* Chart Geometry Engine: Pure Fritsch-Carlson Monotone Cubic Spline (Item 2) */

/**
 * Calculates monotone cubic spline geometry for charts.
 * Pure function: NO DOM, NO storage, NO Date.now().
 *
 * @param {Array<{t: number, v: number, label?: string}>} rawData
 * @param {Object} options
 * @param {number} options.width Total chart width in pixels
 * @param {number} options.height Total chart height in pixels
 * @param {Object} [options.padding] { top, right, bottom, left }
 * @returns {Object} Chart geometry object
 */
export function computeChartGeometry(rawData, options) {
  var width = (options && options.width) || 320;
  var height = (options && options.height) || 180;
  var pad = Object.assign({ top: 12, right: 16, bottom: 24, left: 40 }, (options && options.padding) || {});

  // 1. Filter: require finite numbers
  if (!Array.isArray(rawData)) return { empty: true };
  var valid = [];
  for (var i = 0; i < rawData.length; i++) {
    var p = rawData[i];
    if (p && Number.isFinite(p.t) && Number.isFinite(p.v)) {
      valid.push({ t: Number(p.t), v: Number(p.v), label: p.label || null });
    }
  }
  if (valid.length === 0) return { empty: true };

  // Sort by timestamp ascending
  valid.sort(function(a, b) { return a.t - b.t; });

  // 2. Deduplicate: keep latest value for identical t
  var deduped = [];
  for (var j = 0; j < valid.length; j++) {
    if (deduped.length > 0 && deduped[deduped.length - 1].t === valid[j].t) {
      deduped[deduped.length - 1] = valid[j];
    } else {
      deduped.push(valid[j]);
    }
  }

  // 3. Downsample if N > 120: keep 0, bucket rest into 119 picking last
  var sampled = deduped;
  var N = deduped.length;
  if (N > 120) {
    sampled = [deduped[0]];
    var bucketCount = 119;
    var remainder = N - 1;
    for (var b = 0; b < bucketCount; b++) {
      var endIdx = 1 + Math.floor(((b + 1) * remainder) / bucketCount) - 1;
      if (endIdx >= N) endIdx = N - 1;
      sampled.push(deduped[endIdx]);
    }
  }

  var ptsLen = sampled.length;
  var plotW = Math.max(10, width - pad.left - pad.right);
  var plotH = Math.max(10, height - pad.top - pad.bottom);
  var baseY = height - pad.bottom;

  // 4. Data bounds
  var minT = sampled[0].t;
  var maxT = sampled[ptsLen - 1].t;
  if (minT === maxT) {
    // 1-day padding if single timestamp
    var oneDay = 86400000;
    minT -= oneDay;
    maxT += oneDay;
  }

  var dMin = sampled[0].v;
  var dMax = sampled[0].v;
  for (var k = 1; k < ptsLen; k++) {
    if (sampled[k].v < dMin) dMin = sampled[k].v;
    if (sampled[k].v > dMax) dMax = sampled[k].v;
  }

  var yMin = dMin;
  var yMax = dMax;
  if (dMin === dMax) {
    yMin = dMin - 1;
    yMax = dMax + 1;
  } else {
    var ySpan = dMax - dMin;
    var padY = ySpan * 0.08;
    yMin = dMin - padY;
    yMax = dMax + padY;
  }

  function mapX(t) {
    return pad.left + ((t - minT) / (maxT - minT)) * plotW;
  }

  function mapY(v) {
    return pad.top + (1 - (v - yMin) / (yMax - yMin)) * plotH;
  }

  // 5. Pixel mapped points
  var mappedPoints = [];
  for (var m = 0; m < ptsLen; m++) {
    mappedPoints.push({
      t: sampled[m].t,
      v: sampled[m].v,
      label: sampled[m].label,
      x: mapX(sampled[m].t),
      y: mapY(sampled[m].v)
    });
  }

  // 6. Handle single point case
  if (ptsLen === 1) {
    var singlePt = mappedPoints[0];
    singlePt.x = pad.left + plotW / 2;
    var singleLine = 'M ' + pad.left.toFixed(1) + ' ' + singlePt.y.toFixed(1) + ' L ' + (width - pad.right).toFixed(1) + ' ' + singlePt.y.toFixed(1);
    var singleArea = singleLine + ' L ' + (width - pad.right).toFixed(1) + ' ' + baseY.toFixed(1) + ' L ' + pad.left.toFixed(1) + ' ' + baseY.toFixed(1) + ' Z';
    return {
      points: mappedPoints,
      linePath: singleLine,
      areaPath: singleArea,
      yTicks: buildTicks(dMin, dMax, mapY),
      bounds: { minT: minT, maxT: maxT, yMin: yMin, yMax: yMax, dMin: dMin, dMax: dMax },
      baseY: baseY,
      isSingle: true
    };
  }

  // 7. Fritsch-Carlson Monotone Cubic Spline
  var n = ptsLen;
  var deltas = [];
  var tangents = new Array(n);

  // Secants
  for (var s = 0; s < n - 1; s++) {
    var dxSec = mappedPoints[s + 1].x - mappedPoints[s].x;
    var dySec = mappedPoints[s + 1].y - mappedPoints[s].y;
    deltas.push(dxSec !== 0 ? dySec / dxSec : 0);
  }

  // Initial tangents
  tangents[0] = deltas[0];
  tangents[n - 1] = deltas[n - 2];
  for (var mid = 1; mid < n - 1; mid++) {
    tangents[mid] = (deltas[mid - 1] + deltas[mid]) / 2;
  }

  // Monotonicity enforcement
  for (var e = 0; e < n - 1; e++) {
    var d = deltas[e];
    if (d === 0) {
      tangents[e] = 0;
      tangents[e + 1] = 0;
    } else {
      var alpha = tangents[e] / d;
      var beta = tangents[e + 1] / d;
      if (alpha < 0) tangents[e] = 0;
      if (beta < 0) tangents[e + 1] = 0;
      var sumSq = alpha * alpha + beta * beta;
      if (sumSq > 9) {
        var tau = 3 / Math.sqrt(sumSq);
        tangents[e] = tau * alpha * d;
        tangents[e + 1] = tau * beta * d;
      }
    }
  }

  // Build SVG path with Bezier control points
  var linePath = 'M ' + mappedPoints[0].x.toFixed(1) + ' ' + mappedPoints[0].y.toFixed(1);
  for (var seg = 0; seg < n - 1; seg++) {
    var p0 = mappedPoints[seg];
    var p1 = mappedPoints[seg + 1];
    var segDx = (p1.x - p0.x) / 3;

    var c1x = p0.x + segDx;
    var c1y = p0.y + tangents[seg] * segDx;

    var c2x = p1.x - segDx;
    var c2y = p1.y - tangents[seg + 1] * segDx;

    linePath += ' C ' + c1x.toFixed(1) + ' ' + c1y.toFixed(1) + ', ' + c2x.toFixed(1) + ' ' + c2y.toFixed(1) + ', ' + p1.x.toFixed(1) + ' ' + p1.y.toFixed(1);
  }

  var firstX = mappedPoints[0].x.toFixed(1);
  var lastX = mappedPoints[n - 1].x.toFixed(1);
  var areaPath = linePath + ' L ' + lastX + ' ' + baseY.toFixed(1) + ' L ' + firstX + ' ' + baseY.toFixed(1) + ' Z';

  return {
    points: mappedPoints,
    linePath: linePath,
    areaPath: areaPath,
    yTicks: buildTicks(dMin, dMax, mapY),
    bounds: { minT: minT, maxT: maxT, yMin: yMin, yMax: yMax, dMin: dMin, dMax: dMax },
    baseY: baseY
  };
}

/**
 * Builds 3 to 4 rounded y-axis ticks between dMin and dMax.
 */
function buildTicks(dMin, dMax, mapY) {
  var ticks = [];
  if (dMin === dMax) {
    var midVal = Number(dMin.toFixed(1));
    ticks.push({ value: midVal, y: mapY(midVal), text: String(midVal) });
    return ticks;
  }

  var range = dMax - dMin;
  var step;
  if (range <= 2) step = 0.5;
  else if (range <= 5) step = 1;
  else if (range <= 15) step = 2.5;
  else if (range <= 30) step = 5;
  else if (range <= 60) step = 10;
  else step = 20;

  var startVal = Math.ceil(dMin / step) * step;
  for (var val = startVal; val <= dMax + 0.0001; val += step) {
    var roundedVal = +(val.toFixed(2));
    ticks.push({
      value: roundedVal,
      y: mapY(roundedVal),
      text: roundedVal % 1 === 0 ? String(roundedVal) : roundedVal.toFixed(1)
    });
  }

  // Ensure 3 or 4 ticks
  if (ticks.length < 2) {
    ticks = [
      { value: dMin, y: mapY(dMin), text: dMin.toFixed(1) },
      { value: dMax, y: mapY(dMax), text: dMax.toFixed(1) }
    ];
  } else if (ticks.length > 5) {
    // Keep every second tick to prevent crowding
    var reduced = [];
    for (var r = 0; r < ticks.length; r += 2) {
      reduced.push(ticks[r]);
    }
    if (reduced[reduced.length - 1].value !== ticks[ticks.length - 1].value) {
      reduced.push(ticks[ticks.length - 1]);
    }
    ticks = reduced;
  }

  return ticks;
}
