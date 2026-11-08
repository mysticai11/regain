/* Pure Sparkline SVG Generator: Lightweight trendline rendering with smooth cubic bezier curves */

/**
 * Generates an inline SVG sparkline string.
 * Pure function: NO DOM, NO storage, NO Date.now() inside.
 *
 * @param {Array<number>} points Array of numeric values
 * @param {Object} [options]
 * @param {number} [options.width=40] SVG width in px
 * @param {number} [options.height=20] SVG height in px
 * @param {string} [options.stroke='var(--accent-secondary)'] Stroke color
 * @param {number} [options.strokeWidth=1.5] Stroke width
 * @param {boolean} [options.gradient=false] Whether to render a gradient area fill
 * @returns {string} SVG string
 */
export function renderSparklineSVG(points, {
  width = 40,
  height = 20,
  stroke = 'var(--accent-secondary)',
  strokeWidth = 1.5,
  gradient = false
} = {}) {
  if (!Array.isArray(points) || points.length === 0) {
    return '<svg width="' + width + '" height="' + height + '" viewBox="0 0 ' + width + ' ' + height + '" style="display:block;opacity:0.2"><line x1="0" y1="' + (height / 2) + '" x2="' + width + '" y2="' + (height / 2) + '" stroke="var(--text-dim)" stroke-width="1" stroke-dasharray="2 2"/></svg>';
  }

  var valid = points.map(Number).filter(Number.isFinite);
  if (valid.length === 0) {
    return '<svg width="' + width + '" height="' + height + '" viewBox="0 0 ' + width + ' ' + height + '" style="display:block;opacity:0.2"><line x1="0" y1="' + (height / 2) + '" x2="' + width + '" y2="' + height + '" stroke="var(--text-dim)" stroke-width="1" stroke-dasharray="2 2"/></svg>';
  }

  if (valid.length === 1) {
    var midY = height / 2;
    return '<svg width="' + width + '" height="' + height + '" viewBox="0 0 ' + width + ' ' + height + '" style="display:block"><circle cx="' + (width / 2) + '" cy="' + midY + '" r="2" fill="' + stroke + '"/><line x1="0" y1="' + midY + '" x2="' + width + '" y2="' + midY + '" stroke="' + stroke + '" stroke-width="' + strokeWidth + '" stroke-dasharray="2 2" opacity="0.4"/></svg>';
  }

  var min = Math.min.apply(null, valid);
  var max = Math.max.apply(null, valid);
  var span = max - min;
  var padY = span > 0 ? span * 0.15 : 1;
  var effMin = min - padY;
  var effMax = max + padY;
  var effSpan = effMax - effMin || 1;

  var insetX = strokeWidth;
  var insetY = strokeWidth;
  var plotW = width - insetX * 2;
  var plotH = height - insetY * 2;

  var rawCoords = valid.map(function(v, idx) {
    var x = insetX + (idx / (valid.length - 1)) * plotW;
    var y = insetY + ((effMax - v) / effSpan) * plotH;
    return { x: x, y: y };
  });

  // Build smooth cubic bezier curve
  var pathD = 'M ' + rawCoords[0].x.toFixed(1) + ',' + rawCoords[0].y.toFixed(1);
  for (var i = 1; i < rawCoords.length; i++) {
    var prev = rawCoords[i - 1];
    var curr = rawCoords[i];
    var dx = curr.x - prev.x;
    var cp1x = prev.x + dx * 0.5;
    var cp1y = prev.y;
    var cp2x = curr.x - dx * 0.5;
    var cp2y = curr.y;
    pathD += ' C ' + cp1x.toFixed(1) + ',' + cp1y.toFixed(1) + ' ' + cp2x.toFixed(1) + ',' + cp2y.toFixed(1) + ' ' + curr.x.toFixed(1) + ',' + curr.y.toFixed(1);
  }

  var linePoints = rawCoords.map(function(c) {
    return c.x.toFixed(1) + ',' + c.y.toFixed(1);
  }).join(' ');

  var gradDef = '';
  var areaPath = '';
  if (gradient) {
    var gradId = 'spkGrad_' + Math.abs((min * 31 + max * 17) | 0);
    gradDef = '<defs><linearGradient id="' + gradId + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="' + stroke + '" stop-opacity="0.3"/><stop offset="100%" stop-color="' + stroke + '" stop-opacity="0"/></linearGradient></defs>';
    var firstX = rawCoords[0].x.toFixed(1);
    var lastX = rawCoords[rawCoords.length - 1].x.toFixed(1);
    var bottomY = height.toFixed(1);
    var fillD = pathD + ' L ' + lastX + ',' + bottomY + ' L ' + firstX + ',' + bottomY + ' Z';
    areaPath = '<path d="' + fillD + '" fill="url(#' + gradId + ')"/>';
  }

  return '<svg width="' + width + '" height="' + height + '" viewBox="0 0 ' + width + ' ' + height + '" style="display:block;overflow:visible">'
    + gradDef
    + areaPath
    + '<path d="' + pathD + '" fill="none" stroke="' + stroke + '" stroke-width="' + strokeWidth + '" stroke-linecap="round" stroke-linejoin="round"/>'
    + '<polyline points="' + linePoints + '" style="display:none" stroke="' + stroke + '"/>'
    + '</svg>';
}
