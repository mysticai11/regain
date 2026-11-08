/* Segmented SVG Ring: Whoop-style radial gauge with 4-segment track, violet-to-pink gradient, deep bloom, and glowing orb */

export function buildSegmentedRing(opts) {
  var options = opts || {};
  var progress = Math.max(0, Number(options.progress) || 0);
  var size = Number(options.size) || 240;
  var strokeWidth = Number(options.strokeWidth) || 14;
  var centerHTML = options.centerHTML || '';

  var center = size / 2;
  var radius = (size - strokeWidth) / 2;
  var circumference = 2 * Math.PI * radius;
  var clampedProgress = Math.min(100, progress);

  // 4 large track segments separated by clean gaps
  var gap = 8;
  var segLen = Math.max(1, (circumference - (4 * gap)) / 4);
  var trackDashArray = segLen.toFixed(2) + ' ' + gap;

  // Active stroke calculation
  var arcLength = (clampedProgress / 100) * circumference;
  var activeDashArray = arcLength.toFixed(3) + ' ' + circumference.toFixed(3);

  // Glowing orb position at head of progress arc using trigonometry
  var orbHTML = '';
  if (clampedProgress > 0) {
    var angle = (clampedProgress / 100) * 2 * Math.PI;
    var dotX = center + radius * Math.cos(angle);
    var dotY = center + radius * Math.sin(angle);
    orbHTML = '<circle cx="' + dotX.toFixed(2) + '" cy="' + dotY.toFixed(2) + '" r="6" fill="#FFFFFF" filter="url(#orbGlow)" />';
  }

  return '<div class="segmented-ring-wrap" style="position:relative;width:' + size + 'px;height:' + size + 'px;margin:0 auto;display:flex;align-items:center;justify-content:center">'
    + '<div style="position:absolute;width:' + Math.round(size * 0.8) + 'px;height:' + Math.round(size * 0.8) + 'px;border-radius:50%;background:radial-gradient(circle, rgba(139,92,246,0.22) 0%, rgba(236,72,153,0.06) 50%, transparent 75%);pointer-events:none;filter:blur(16px)"></div>'
    + '<svg viewBox="0 0 ' + size + ' ' + size + '" width="' + size + '" height="' + size + '" style="transform:rotate(-90deg);overflow:visible;display:block">'
      + '<defs>'
        + '<linearGradient id="ringLinearGrad" x1="0%" y1="0%" x2="100%" y2="100%">'
          + '<stop offset="0%" stop-color="#8B5CF6"/>'
          + '<stop offset="100%" stop-color="#EC4899"/>'
        + '</linearGradient>'
        + '<filter id="ringBloom" x="-40%" y="-40%" width="180%" height="180%">'
          + '<feGaussianBlur stdDeviation="20"/>'
        + '</filter>'
        + '<filter id="ringDropShadow" x="-30%" y="-30%" width="160%" height="160%">'
          + '<feDropShadow dx="0" dy="0" stdDeviation="6" flood-color="rgba(139, 92, 246, 0.5)"/>'
        + '</filter>'
        + '<filter id="orbGlow" x="-80%" y="-80%" width="260%" height="260%">'
          + '<feDropShadow dx="0" dy="0" stdDeviation="6" flood-color="#8B5CF6" flood-opacity="0.95"/>'
          + '<feDropShadow dx="0" dy="0" stdDeviation="2" flood-color="#FFFFFF" flood-opacity="0.9"/>'
        + '</filter>'
      + '</defs>'
      + '<circle cx="' + center + '" cy="' + center + '" r="' + radius.toFixed(3) + '" fill="none" stroke="rgba(255, 255, 255, 0.08)" stroke-width="' + strokeWidth + '" stroke-dasharray="' + trackDashArray + '" stroke-linecap="round" />'
      + (clampedProgress > 0
          ? ('<circle cx="' + center + '" cy="' + center + '" r="' + radius.toFixed(3) + '" fill="none" stroke="#8B5CF6" stroke-width="' + (strokeWidth + 4) + '" stroke-linecap="round" stroke-dasharray="' + activeDashArray + '" opacity="0.3" filter="url(#ringBloom)" />'
            + '<circle cx="' + center + '" cy="' + center + '" r="' + radius.toFixed(3) + '" fill="none" stroke="url(#ringLinearGrad)" stroke-width="' + strokeWidth + '" stroke-linecap="round" stroke-dasharray="' + activeDashArray + '" filter="url(#ringDropShadow)" />'
            + orbHTML)
          : '')
    + '</svg>'
    + '<div class="ring-center-content" style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;pointer-events:none">'
      + centerHTML
    + '</div>'
  + '</div>';
}
