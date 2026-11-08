/* Segmented SVG Ring: Whoop-style radial progress indicator with solid glowing gauge and tip dot */

export function buildSegmentedRing(opts) {
  var options = opts || {};
  var progress = Math.max(0, Number(options.progress) || 0);
  var size = Number(options.size) || 240;
  var strokeWidth = Number(options.strokeWidth) || 14;
  var color = options.color || 'var(--accent-primary)';
  var trackColor = options.trackColor || 'var(--hairline)';
  var centerHTML = options.centerHTML || '';

  var center = size / 2;
  var radius = (size - strokeWidth) / 2;
  var circumference = 2 * Math.PI * radius;
  var clampedProgress = Math.min(100, progress);

  var arcLength = (clampedProgress / 100) * circumference;
  var strokeDashArray = arcLength.toFixed(3) + ' ' + circumference.toFixed(3);

  // Calculate tip dot position at the end of the arc
  var dotHTML = '';
  if (clampedProgress >= 2 && clampedProgress <= 99.5) {
    var angle = (clampedProgress / 100) * 2 * Math.PI;
    var dotX = center + radius * Math.cos(angle);
    var dotY = center + radius * Math.sin(angle);
    dotHTML = '<circle cx="' + dotX.toFixed(2) + '" cy="' + dotY.toFixed(2) + '" r="5.5" fill="var(--text)" filter="url(#dotGlow)" />';
  }

  return '<div class="segmented-ring-wrap" style="position:relative;width:' + size + 'px;height:' + size + 'px;margin:0 auto;display:flex;align-items:center;justify-content:center">'
    + '<div style="position:absolute;width:' + Math.round(size * 0.75) + 'px;height:' + Math.round(size * 0.75) + 'px;border-radius:50%;background:radial-gradient(circle, rgba(139,92,246,0.18) 0%, rgba(139,92,246,0.03) 60%, transparent 75%);pointer-events:none;filter:blur(10px)"></div>'
    + '<svg viewBox="0 0 ' + size + ' ' + size + '" width="' + size + '" height="' + size + '" style="transform:rotate(-90deg);overflow:visible;display:block">'
      + '<defs>'
        + '<filter id="ringDropShadow" x="-30%" y="-30%" width="160%" height="160%">'
          + '<feDropShadow dx="0" dy="0" stdDeviation="6" flood-color="var(--accent-primary)" flood-opacity="0.6"/>'
        + '</filter>'
        + '<filter id="dotGlow" x="-50%" y="-50%" width="200%" height="200%">'
          + '<feDropShadow dx="0" dy="0" stdDeviation="4" flood-color="var(--accent-primary)" flood-opacity="0.8"/>'
        + '</filter>'
      + '</defs>'
      + '<circle cx="' + center + '" cy="' + center + '" r="' + radius.toFixed(3) + '" fill="none" stroke="' + trackColor + '" stroke-width="' + strokeWidth + '" />'
      + (clampedProgress > 0
          ? ('<circle cx="' + center + '" cy="' + center + '" r="' + radius.toFixed(3) + '" fill="none" stroke="' + color + '" stroke-width="' + strokeWidth + '" stroke-linecap="round" stroke-dasharray="' + strokeDashArray + '" filter="url(#ringDropShadow)" />' + dotHTML)
          : '')
    + '</svg>'
    + '<div class="ring-center-content" style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;pointer-events:none">'
      + centerHTML
    + '</div>'
  + '</div>';
}
