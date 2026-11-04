/* Gauge components: semi-circle calorie gauge, status pills, and macro progress bars */

import { esc } from "../lib/format.js";

export function buildGauge(logged, target) {
  var max = target * 1.4;
  var fU = Math.min(0.9 * target / max, 1), fO = Math.min(1.15 * target / max, 1);
  var cx = 150, cy = 150, r = 120;
  function angle(f) { return Math.PI * (1 - f); }
  function pt(f) { var a = angle(f); return [cx + r * Math.cos(a), cy - r * Math.sin(a)]; }
  function arc(f0, f1, col) {
    var p0 = pt(f0), p1 = pt(f1);
    return '<path d="M ' + p0[0].toFixed(1) + ' ' + p0[1].toFixed(1) + ' A ' + r + ' ' + r + ' 0 0 1 ' + p1[0].toFixed(1) + ' ' + p1[1].toFixed(1) + '" fill="none" stroke="' + col + '" stroke-width="18" stroke-linecap="round"/>';
  }
  var segs = arc(0, fU, '#1C1C1F') + arc(fU, fO, '#F5F5F4') + arc(fO, 1, '#FF4D4F');
  var nf = Math.min(logged / max, 1);
  var rot = (nf * 180).toFixed(1);
  var gaugeColor = logged >= target * 1.15 ? '#FF4D4F' : logged >= target * 0.9 ? '#F5F5F4' : '#8A8A8E';
  return '<svg viewBox="0 0 300 162" style="width:100%;display:block" role="img" aria-label="Calorie gauge">'
    + segs
    + '<line id="gaugeNeedle" x1="' + cx + '" y1="' + cy + '" x2="' + (cx - r) + '" y2="' + cy + '" stroke="' + gaugeColor + '" stroke-width="4" stroke-linecap="round" data-rotate="' + rot + '" style="transform: rotate(0deg); transform-origin: 150px 150px; transition: transform 1.2s cubic-bezier(0.19, 1, 0.22, 1);"/>'
    + '<circle cx="' + cx + '" cy="' + cy + '" r="7" fill="' + gaugeColor + '"/>'
    + '</svg>';
}

// ── Status pill ───────────────────────────────────────────────────────────────
export function statusPill(status, remaining) {
  var M = {
    under:      { ic: 'bolt',  color: '#8A8A8E', bg: '#1C1C1F', label: remaining > 0 ? (remaining + ' kcal to go') : 'logging…' },
    target:     { ic: 'check', color: '#F5F5F4', bg: '#1C1C1F', label: remaining > 0 ? ('on target · ' + remaining + ' to go') : 'on target ✓' },
    aggressive: { ic: 'info',  color: '#FF4D4F', bg: '#1C1C1F', label: 'aggressive surplus' },
    none:       { ic: 'bolt',  color: '#55555A', bg: '#1C1C1F', label: 'nothing logged yet' },
  };
  var s = M[status]; if(!s) s = M.none;
  return '<span class="pill" style="color:' + s.color + ';background:' + s.bg + '">' + s.label + '</span>';
}

// ── Macro bar ─────────────────────────────────────────────────────────────────
export function macroBar(label, val, target, color) {
  var pct = Math.min(100, target > 0 ? (val / target * 100) : 0);
  return '<div class="macro-card">'
    + '<div class="macro-label">' + esc(label) + '</div>'
    + '<div class="macro-val" style="color:' + color + '">' + val + '<span style="font-size:11px;color:var(--text-muted)">g</span></div>'
    + '<div class="macro-bar-track"><div class="macro-bar-fill" style="width:' + pct + '%;background:' + color + '"></div></div>'
    + '</div>';
}

export function triggerGaugeAnimation() {
  setTimeout(function() {
    var n = document.getElementById('gaugeNeedle');
    if(n) n.style.transform = 'rotate(' + n.dataset.rotate + 'deg)';
  }, 40);
}
