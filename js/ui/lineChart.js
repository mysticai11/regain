/* UI Component: Monotone Line Chart (Item 2) */

import { computeChartGeometry } from "./chartGeometry.js";
import { triggerHaptic } from "../lib/dom.js";

var chartCounter = 0;

/**
 * Formats a timestamp into short local date label (e.g. 'Oct 28').
 * Pure local date formatting (Rule 1.9).
 */
function formatShortDate(timestamp) {
  if (!timestamp) return '';
  var d = new Date(timestamp);
  var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return months[d.getMonth()] + ' ' + d.getDate();
}

/**
 * Renders an interactive SVG monotone line chart with Fritsch-Carlson spline and pointer scrub.
 *
 * @param {Object} config
 * @param {HTMLElement} config.container Mount target element
 * @param {Array<{t: number, v: number, label?: string}>} config.data Chart points
 * @param {number} [config.height=180] Height in pixels
 * @param {string} [config.unit='kg'] Data unit
 * @param {string} [config.ariaLabel='Progress Chart'] Accessibility description
 * @param {string} [config.color] Curve stroke color
 * @returns {{ update: Function, destroy: Function }}
 */
export function renderLineChart({
  container,
  data = [],
  height = 180,
  unit = 'kg',
  ariaLabel = 'Progress Chart',
  color = 'var(--chart-line, #F5F5F4)',
  onPoint = null,
  onReset = null
} = {}) {
  if (!container || typeof document === 'undefined' || typeof document.createElementNS !== 'function' || typeof container.appendChild !== 'function') {
    return { update: function(){}, destroy: function(){} };
  }

  var chartId = ++chartCounter;
  var currentData = data || [];
  var lastWidth = container.clientWidth || 320;
  var activePointIndex = -1;
  var isScrubbing = false;
  var hideTimeout = null;
  function clearHideTimeout() { if (hideTimeout) { clearTimeout(hideTimeout); hideTimeout = null; } }

  if (container.style) {
    container.style.position = 'relative';
    container.style.width = '100%';
    container.style.maxWidth = '100%';
    container.style.overflow = 'visible';
    container.style.height = height + 'px';
    container.style.touchAction = 'pan-y';
    container.style.userSelect = 'none';
    container.style.webkitUserSelect = 'none';
    container.style.background = 'linear-gradient(180deg, rgba(24, 24, 27, 0.45) 0%, rgba(9, 9, 11, 0.65) 100%)';
    container.style.borderRadius = '16px';
    container.style.border = '1px solid rgba(255, 255, 255, 0.04)';
    container.style.boxSizing = 'border-box';
    container.style.padding = '4px 0';
  }
  if (typeof container.setAttribute === 'function') {
    container.setAttribute('data-gesture-owner', '');
  }

  var svgNS = 'http://www.w3.org/2000/svg';
  var svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '100%');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', ariaLabel);
  svg.style.display = 'block';
  svg.style.overflow = 'visible';

  // Readout pill
  var pill = document.createElement('div');
  pill.className = 'chart-readout-pill';
  pill.style.position = 'absolute';
  pill.style.pointerEvents = 'none';
  pill.style.opacity = '0';
  pill.style.zIndex = '20';
  pill.style.transition = 'opacity 150ms ease';

  container.innerHTML = '';
  container.appendChild(svg);
  container.appendChild(pill);

  var currentGeom = null;

  function renderChart() {
    var width = container.clientWidth || lastWidth || 320;
    lastWidth = width;
    svg.setAttribute('viewBox', '0 0 ' + width + ' ' + height);

    while (svg.firstChild) {
      svg.removeChild(svg.firstChild);
    }

    currentGeom = computeChartGeometry(currentData, {
      width: width,
      height: height,
      padding: { top: 12, right: 16, bottom: 24, left: 52 }
    });

    if (currentGeom.empty) {
      var emptyText = document.createElementNS(svgNS, 'text');
      emptyText.setAttribute('x', String(width / 2));
      emptyText.setAttribute('y', String(height / 2));
      emptyText.setAttribute('text-anchor', 'middle');
      emptyText.setAttribute('fill', 'var(--text-secondary, #8A8A8E)');
      emptyText.setAttribute('font-size', '15');
      emptyText.textContent = 'No entries yet';
      svg.appendChild(emptyText);
      return;
    }

    function setAttrs(el, attrs) {
      for (var k in attrs) el.setAttribute(k, String(attrs[k]));
      return el;
    }

    // 1. Defs gradient & glow filters
    var defs = document.createElementNS(svgNS, 'defs');
    var grad = setAttrs(document.createElementNS(svgNS, 'linearGradient'), { id: 'chartGrad_' + chartId, x1: '0', y1: '0', x2: '0', y2: '1' });
    var stop1 = setAttrs(document.createElementNS(svgNS, 'stop'), { offset: '0%', 'stop-color': 'rgba(139, 92, 246, 0.3)', 'stop-opacity': '1' });
    var stop2 = setAttrs(document.createElementNS(svgNS, 'stop'), { offset: '100%', 'stop-color': 'rgba(139, 92, 246, 0)', 'stop-opacity': '0' });
    grad.appendChild(stop1);
    grad.appendChild(stop2);
    defs.appendChild(grad);

    var orbFilter = setAttrs(document.createElementNS(svgNS, 'filter'), { id: 'chartOrbGlow_' + chartId, x: '-60%', y: '-60%', width: '220%', height: '220%' });
    var feDrop = setAttrs(document.createElementNS(svgNS, 'feDropShadow'), { dx: '0', dy: '0', stdDeviation: '4', 'flood-color': '#8B5CF6', 'flood-opacity': '0.8' });
    orbFilter.appendChild(feDrop);
    defs.appendChild(orbFilter);
    svg.appendChild(defs);

    // 2. Horizontal grid lines & Y-axis labels
    var ticks = currentGeom.yTicks || [];
    for (var i = 0; i < ticks.length; i++) {
      var tk = ticks[i];
      var gridLine = setAttrs(document.createElementNS(svgNS, 'line'), { x1: '52', y1: tk.y, x2: width - 16, y2: tk.y, stroke: 'rgba(255, 255, 255, 0.03)', 'stroke-width': '1' });
      svg.appendChild(gridLine);
      var tickText = setAttrs(document.createElementNS(svgNS, 'text'), { x: '44', y: tk.y + 4, 'text-anchor': 'end', fill: 'var(--text-muted, #8A8A8E)', 'font-size': '11', 'font-weight': '400' });
      tickText.textContent = tk.text;
      svg.appendChild(tickText);
    }

    // 2b. X-axis date labels (Item 2)
    var xTicks = currentGeom.xTicks || [];
    for (var xi = 0; xi < xTicks.length; xi++) {
      var xt = xTicks[xi];
      var anchor = 'middle';
      var posX = xt.x;
      if (xTicks.length > 1) {
        if (xi === 0) { anchor = 'start'; posX = 52; }
        else if (xi === xTicks.length - 1) { anchor = 'end'; posX = width - 16; }
      }
      var xText = setAttrs(document.createElementNS(svgNS, 'text'), { x: posX, y: height - 4, 'text-anchor': anchor, fill: 'var(--text-muted, #8A8A8E)', 'font-size': '11', 'font-weight': '400' });
      xText.textContent = formatShortDate(xt.t);
      svg.appendChild(xText);
    }

    // 3. Area path
    if (currentGeom.areaPath) {
      var area = setAttrs(document.createElementNS(svgNS, 'path'), { d: currentGeom.areaPath, fill: 'url(#chartGrad_' + chartId + ')' });
      svg.appendChild(area);
    }

    // 4. Line curve
    if (currentGeom.linePath) {
      var line = setAttrs(document.createElementNS(svgNS, 'path'), { d: currentGeom.linePath, fill: 'none', stroke: color, 'stroke-width': '2.5', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
      svg.appendChild(line);
    }

    // Data points along line
    if (currentGeom.points && currentGeom.points.length > 0) {
      var pts = currentGeom.points;
      for (var pi = 0; pi < pts.length; pi++) {
        var isLast = (pi === pts.length - 1);
        if (isLast) {
          var halo = setAttrs(document.createElementNS(svgNS, 'circle'), { cx: pts[pi].x, cy: pts[pi].y, r: '8', fill: 'rgba(139, 92, 246, 0.25)' });
          svg.appendChild(halo);
          var lastDot = setAttrs(document.createElementNS(svgNS, 'circle'), { cx: pts[pi].x, cy: pts[pi].y, r: '5', fill: '#FFFFFF', stroke: 'var(--accent-primary, #8B5CF6)', 'stroke-width': '2', filter: 'url(#chartOrbGlow_' + chartId + ')' });
          svg.appendChild(lastDot);
        } else {
          var dot = setAttrs(document.createElementNS(svgNS, 'circle'), { cx: pts[pi].x, cy: pts[pi].y, r: '3', fill: '#FFFFFF', opacity: '0.75' });
          svg.appendChild(dot);
        }
      }
    }

    // 5. Scrub overlay elements
    var scrubLine = setAttrs(document.createElementNS(svgNS, 'line'), { stroke: 'var(--hairline, #222222)', 'stroke-dasharray': '2 2', 'stroke-width': '1' });
    scrubLine.style.display = 'none';
    svg.appendChild(scrubLine);

    var scrubDot = setAttrs(document.createElementNS(svgNS, 'circle'), { r: '6', fill: 'var(--accent-primary)', stroke: 'var(--bg, #0B0B0C)', 'stroke-width': '2' });
    scrubDot.style.display = 'none';
    svg.appendChild(scrubDot);

    svg._scrubLine = scrubLine;
    svg._scrubDot = scrubDot;
  }

  function handlePointerMove(e) {
    if (!isScrubbing || !currentGeom || currentGeom.empty || !currentGeom.points.length) return;
    var rect = svg.getBoundingClientRect ? svg.getBoundingClientRect() : { left: 0, width: lastWidth };
    var px = (e.clientX !== undefined) ? (e.clientX - rect.left) : (currentGeom.points[0].x);

    // Find nearest point along x axis
    var pts = currentGeom.points;
    var bestIdx = 0;
    var bestDist = Infinity;
    for (var i = 0; i < pts.length; i++) {
      var d = Math.abs(pts[i].x - px);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }

    var pt = pts[bestIdx];
    if (bestIdx !== activePointIndex) {
      activePointIndex = bestIdx;
      triggerHaptic();
    }

    if (svg._scrubLine) {
      svg._scrubLine.setAttribute('x1', String(pt.x));
      svg._scrubLine.setAttribute('x2', String(pt.x));
      svg._scrubLine.setAttribute('y1', '12');
      svg._scrubLine.setAttribute('y2', String(currentGeom.baseY));
      svg._scrubLine.style.display = 'block';
    }

    if (svg._scrubDot) {
      svg._scrubDot.setAttribute('cx', String(pt.x));
      svg._scrubDot.setAttribute('cy', String(pt.y));
      svg._scrubDot.style.display = 'block';
    }

    var dateLabel = pt.label || formatShortDate(pt.t);
    var formattedVal = (pt.v % 1 === 0) ? String(pt.v) : pt.v.toFixed(1);
    pill.innerHTML = '<span style="font-weight:600;color:var(--text)">' + formattedVal + '</span> <span style="color:var(--text-secondary)">' + unit + '</span> · <span style="color:var(--text-muted)">' + dateLabel + '</span>';

    var curW = (rect && rect.width) || (container && container.clientWidth) || lastWidth || 320;
    var transX = '-50%';
    var posX = pt.x;
    if (pt.x > curW - 85) {
      transX = '-100%';
      posX = Math.min(pt.x + 4, curW - 8);
    } else if (pt.x < 85) {
      transX = '0%';
      posX = Math.max(pt.x - 4, 8);
    }

    var isNearTop = pt.y < 54;
    var transY = isNearTop ? '0%' : '-100%';
    var posY = isNearTop ? (pt.y + 12) : (pt.y - 10);

    pill.style.left = posX + 'px';
    pill.style.top = posY + 'px';
    pill.style.transform = 'translate(' + transX + ', ' + transY + ')';
    pill.style.marginTop = '0px';
    pill.style.opacity = '1';

    if (typeof onPoint === 'function') {
      onPoint(pt, { formattedVal: formattedVal, dateLabel: dateLabel, unit: unit });
    }
  }

  function handlePointerDown(e) {
    clearHideTimeout();
    if (e.target && typeof e.target.setPointerCapture === 'function' && e.pointerId) {
      try { e.target.setPointerCapture(e.pointerId); } catch(err) {}
    }
    isScrubbing = true;
    handlePointerMove(e);
  }

  function hideReadout() {
    activePointIndex = -1;
    pill.style.opacity = '0';
    if (svg._scrubLine) svg._scrubLine.style.display = 'none';
    if (svg._scrubDot) svg._scrubDot.style.display = 'none';
    if (typeof onReset === 'function') onReset();
  }

  function handlePointerUp() {
    isScrubbing = false;
    clearHideTimeout();
    hideTimeout = setTimeout(hideReadout, 3500);
  }

  function handleOutsideTap(e) {
    if (container && !container.contains(e.target)) {
      clearHideTimeout();
      hideReadout();
    }
  }

  svg.addEventListener('pointerdown', handlePointerDown);
  svg.addEventListener('pointermove', handlePointerMove);
  svg.addEventListener('pointerup', handlePointerUp);
  svg.addEventListener('pointercancel', handlePointerUp);
  if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
    document.addEventListener('pointerdown', handleOutsideTap);
  }

  var resizeObserver = null;
  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(function(entries) {
      if (!entries || !entries.length) return;
      var newW = entries[0].contentRect.width;
      if (Math.abs(newW - lastWidth) >= 4) {
        renderChart();
      }
    });
    resizeObserver.observe(container);
  }

  renderChart();

  return {
    update: function(newData) {
      currentData = newData || [];
      renderChart();
    },
    destroy: function() {
      clearHideTimeout();
      if (typeof document !== 'undefined' && typeof document.removeEventListener === 'function') {
        document.removeEventListener('pointerdown', handleOutsideTap);
      }
      if (resizeObserver) {
        resizeObserver.disconnect();
        resizeObserver = null;
      }
      svg.removeEventListener('pointerdown', handlePointerDown);
      svg.removeEventListener('pointermove', handlePointerMove);
      svg.removeEventListener('pointerup', handlePointerUp);
      svg.removeEventListener('pointercancel', handlePointerUp);
      container.innerHTML = '';
    }
  };
}
