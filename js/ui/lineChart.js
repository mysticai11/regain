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
  color = 'var(--chart-line, #F5F5F4)'
} = {}) {
  if (!container || typeof document === 'undefined' || typeof document.createElementNS !== 'function' || typeof container.appendChild !== 'function') {
    return { update: function(){}, destroy: function(){} };
  }

  var chartId = ++chartCounter;
  var currentData = data || [];
  var lastWidth = container.clientWidth || 320;
  var activePointIndex = -1;
  var isScrubbing = false;

  if (container.style) {
    container.style.position = 'relative';
    container.style.width = '100%';
    container.style.maxWidth = '100%';
    container.style.overflow = 'hidden';
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
  svg.style.overflow = 'hidden';

  // Readout pill
  var pill = document.createElement('div');
  pill.className = 'chart-readout-pill';
  pill.style.position = 'absolute';
  pill.style.pointerEvents = 'none';
  pill.style.opacity = '0';
  pill.style.transform = 'translate(-50%, -100%)';
  pill.style.marginTop = '-10px';
  pill.style.zIndex = '10';
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
      padding: { top: 12, right: 16, bottom: 24, left: 40 }
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

    // 1. Defs gradient & glow filters
    var defs = document.createElementNS(svgNS, 'defs');
    var grad = document.createElementNS(svgNS, 'linearGradient');
    grad.setAttribute('id', 'chartGrad_' + chartId);
    grad.setAttribute('x1', '0');
    grad.setAttribute('y1', '0');
    grad.setAttribute('x2', '0');
    grad.setAttribute('y2', '1');

    var stop1 = document.createElementNS(svgNS, 'stop');
    stop1.setAttribute('offset', '0%');
    stop1.setAttribute('stop-color', 'rgba(139, 92, 246, 0.3)');
    stop1.setAttribute('stop-opacity', '1');
    grad.appendChild(stop1);

    var stop2 = document.createElementNS(svgNS, 'stop');
    stop2.setAttribute('offset', '100%');
    stop2.setAttribute('stop-color', 'rgba(139, 92, 246, 0)');
    stop2.setAttribute('stop-opacity', '0');
    grad.appendChild(stop2);
    defs.appendChild(grad);

    var orbFilter = document.createElementNS(svgNS, 'filter');
    orbFilter.setAttribute('id', 'chartOrbGlow_' + chartId);
    orbFilter.setAttribute('x', '-60%');
    orbFilter.setAttribute('y', '-60%');
    orbFilter.setAttribute('width', '220%');
    orbFilter.setAttribute('height', '220%');
    var feDrop = document.createElementNS(svgNS, 'feDropShadow');
    feDrop.setAttribute('dx', '0');
    feDrop.setAttribute('dy', '0');
    feDrop.setAttribute('stdDeviation', '4');
    feDrop.setAttribute('flood-color', '#8B5CF6');
    feDrop.setAttribute('flood-opacity', '0.8');
    orbFilter.appendChild(feDrop);
    defs.appendChild(orbFilter);
    svg.appendChild(defs);

    // 2. Horizontal grid lines & Y-axis labels
    var ticks = currentGeom.yTicks || [];
    for (var i = 0; i < ticks.length; i++) {
      var tk = ticks[i];
      var gridLine = document.createElementNS(svgNS, 'line');
      gridLine.setAttribute('x1', '40');
      gridLine.setAttribute('y1', String(tk.y));
      gridLine.setAttribute('x2', String(width - 16));
      gridLine.setAttribute('y2', String(tk.y));
      gridLine.setAttribute('stroke', 'rgba(255, 255, 255, 0.03)');
      gridLine.setAttribute('stroke-width', '1');
      svg.appendChild(gridLine);

      var tickText = document.createElementNS(svgNS, 'text');
      tickText.setAttribute('x', '32');
      tickText.setAttribute('y', String(tk.y + 4));
      tickText.setAttribute('text-anchor', 'end');
      tickText.setAttribute('fill', 'var(--text-muted, #8A8A8E)');
      tickText.setAttribute('font-size', '11');
      tickText.setAttribute('font-weight', '400');
      tickText.textContent = tk.text;
      svg.appendChild(tickText);
    }

    // 2b. X-axis date labels (Item 2)
    var xTicks = currentGeom.xTicks || [];
    for (var xi = 0; xi < xTicks.length; xi++) {
      var xt = xTicks[xi];
      var xText = document.createElementNS(svgNS, 'text');
      var anchor = 'middle';
      var posX = xt.x;
      if (xTicks.length > 1) {
        if (xi === 0) {
          anchor = 'start';
          posX = 40;
        } else if (xi === xTicks.length - 1) {
          anchor = 'end';
          posX = width - 16;
        }
      }
      xText.setAttribute('x', String(posX));
      xText.setAttribute('y', String(height - 4));
      xText.setAttribute('text-anchor', anchor);
      xText.setAttribute('fill', 'var(--text-muted, #8A8A8E)');
      xText.setAttribute('font-size', '11');
      xText.setAttribute('font-weight', '400');
      xText.textContent = formatShortDate(xt.t);
      svg.appendChild(xText);
    }

    // 3. Area path
    if (currentGeom.areaPath) {
      var area = document.createElementNS(svgNS, 'path');
      area.setAttribute('d', currentGeom.areaPath);
      area.setAttribute('fill', 'url(#chartGrad_' + chartId + ')');
      svg.appendChild(area);
    }

    // 4. Line curve
    if (currentGeom.linePath) {
      var line = document.createElementNS(svgNS, 'path');
      line.setAttribute('d', currentGeom.linePath);
      line.setAttribute('fill', 'none');
      line.setAttribute('stroke', color);
      line.setAttribute('stroke-width', '2.5');
      line.setAttribute('stroke-linecap', 'round');
      line.setAttribute('stroke-linejoin', 'round');
      svg.appendChild(line);
    }

    // Data points along line
    if (currentGeom.points && currentGeom.points.length > 0) {
      var pts = currentGeom.points;
      for (var pi = 0; pi < pts.length; pi++) {
        var isLast = (pi === pts.length - 1);
        if (isLast) {
          var halo = document.createElementNS(svgNS, 'circle');
          halo.setAttribute('cx', String(pts[pi].x));
          halo.setAttribute('cy', String(pts[pi].y));
          halo.setAttribute('r', '8');
          halo.setAttribute('fill', 'rgba(139, 92, 246, 0.25)');
          svg.appendChild(halo);

          var lastDot = document.createElementNS(svgNS, 'circle');
          lastDot.setAttribute('cx', String(pts[pi].x));
          lastDot.setAttribute('cy', String(pts[pi].y));
          lastDot.setAttribute('r', '5');
          lastDot.setAttribute('fill', '#FFFFFF');
          lastDot.setAttribute('stroke', 'var(--accent-primary, #8B5CF6)');
          lastDot.setAttribute('stroke-width', '2');
          lastDot.setAttribute('filter', 'url(#chartOrbGlow_' + chartId + ')');
          svg.appendChild(lastDot);
        } else {
          var dot = document.createElementNS(svgNS, 'circle');
          dot.setAttribute('cx', String(pts[pi].x));
          dot.setAttribute('cy', String(pts[pi].y));
          dot.setAttribute('r', '3');
          dot.setAttribute('fill', '#FFFFFF');
          dot.setAttribute('opacity', '0.75');
          svg.appendChild(dot);
        }
      }
    }

    // 5. Scrub overlay elements
    var scrubLine = document.createElementNS(svgNS, 'line');
    scrubLine.setAttribute('stroke', 'var(--hairline, #222222)');
    scrubLine.setAttribute('stroke-dasharray', '2 2');
    scrubLine.setAttribute('stroke-width', '1');
    scrubLine.style.display = 'none';
    svg.appendChild(scrubLine);

    var scrubDot = document.createElementNS(svgNS, 'circle');
    scrubDot.setAttribute('r', '6');
    scrubDot.setAttribute('fill', 'var(--accent-primary)');
    scrubDot.setAttribute('stroke', 'var(--bg, #0B0B0C)');
    scrubDot.setAttribute('stroke-width', '2');
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
    pill.style.left = pt.x + 'px';
    pill.style.top = pt.y + 'px';
    pill.style.opacity = '1';
  }

  function handlePointerDown(e) {
    if (e.target && typeof e.target.setPointerCapture === 'function' && e.pointerId) {
      try { e.target.setPointerCapture(e.pointerId); } catch(err) {}
    }
    isScrubbing = true;
    handlePointerMove(e);
  }

  function handlePointerUp() {
    isScrubbing = false;
    activePointIndex = -1;
    pill.style.opacity = '0';
    if (svg._scrubLine) svg._scrubLine.style.display = 'none';
    if (svg._scrubDot) svg._scrubDot.style.display = 'none';
  }

  svg.addEventListener('pointerdown', handlePointerDown);
  svg.addEventListener('pointermove', handlePointerMove);
  svg.addEventListener('pointerup', handlePointerUp);
  svg.addEventListener('pointercancel', handlePointerUp);

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
