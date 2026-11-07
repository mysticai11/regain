/* Pure Sparkline SVG Generator (Task R2-2) */

/**
 * Generates an inline SVG sparkline string.
 * Pure function: NO DOM, NO storage, NO Date.now() inside.
 *
 * @param {Array<number>} points Array of numeric values
 * @param {Object} [options]
 * @param {number} [options.width=64] SVG width in px
 * @param {number} [options.height=24] SVG height in px
 * @param {string} [options.stroke='#C6F432'] Stroke color
 * @param {number} [options.strokeWidth=1.5] Stroke width
 * @returns {string} SVG string
 */
export function renderSparklineSVG(points, {
  width = 64,
  height = 24,
  stroke = '#C6F432',
  strokeWidth = 1.5
} = {}) {
  if (!Array.isArray(points) || points.length === 0) {
    return '<svg width="' + width + '" height="' + height + '" viewBox="0 0 ' + width + ' ' + height + '" style="display:block;opacity:0.2"><line x1="0" y1="' + (height / 2) + '" x2="' + width + '" y2="' + (height / 2) + '" stroke="#55555A" stroke-width="1" stroke-dasharray="2 2"/></svg>';
  }

  var valid = points.map(Number).filter(Number.isFinite);
  if (valid.length === 0) {
    return '<svg width="' + width + '" height="' + height + '" viewBox="0 0 ' + width + ' ' + height + '" style="display:block;opacity:0.2"><line x1="0" y1="' + (height / 2) + '" x2="' + width + '" y2="' + (height / 2) + '" stroke="#55555A" stroke-width="1" stroke-dasharray="2 2"/></svg>';
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

  var coords = valid.map(function(v, idx) {
    var x = insetX + (idx / (valid.length - 1)) * plotW;
    var y = insetY + ((effMax - v) / effSpan) * plotH;
    return x.toFixed(1) + ',' + y.toFixed(1);
  });

  return '<svg width="' + width + '" height="' + height + '" viewBox="0 0 ' + width + ' ' + height + '" style="display:block;overflow:visible">'
    + '<polyline points="' + coords.join(' ') + '" fill="none" stroke="' + stroke + '" stroke-width="' + strokeWidth + '" stroke-linecap="round" stroke-linejoin="round"/>'
    + '</svg>';
}
