/* Regain Gesture Routing: strict tab-swipe navigation vs child gesture ownership */

export var SWIPE_NAV_SCOPE = 'progress-tabs';
export var DEBUG_GESTURES = false;

var lastRowSwipeTime = 0;
var activeOwner = null;

export function setGestureCooldown(ms) {
  lastRowSwipeTime = Date.now() + (ms || 400);
}

export function isGestureInCooldown() {
  return Date.now() < lastRowSwipeTime;
}

export function claimGestureOwner(id) {
  activeOwner = id;
}

export function releaseGestureOwner() {
  activeOwner = null;
}

export function getActiveGestureOwner() {
  return activeOwner;
}

export function showGestureDebug(info) {
  if (!DEBUG_GESTURES || typeof document === 'undefined') return;
  var chip = document.getElementById('gestureDebugChip');
  if (!chip) {
    chip = document.createElement('div');
    chip.id = 'gestureDebugChip';
    chip.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#0B0B0C;color:#C6F432;padding:6px 14px;border-radius:20px;font-size:11px;font-family:inherit;z-index:99999;pointer-events:none;border:1px solid #C6F432;';
    document.body.appendChild(chip);
  }
  chip.textContent = info;
  chip.style.display = 'block';
  clearTimeout(chip._timer);
  chip._timer = setTimeout(function() { chip.style.display = 'none'; }, 2000);
}

export function decideSwipe(params) {
  var p = params || {};
  var startTarget = p.startTarget;
  var startX = p.startX != null ? p.startX : 0;
  var startY = p.startY != null ? p.startY : 0;
  var currentX = p.currentX != null ? p.currentX : 0;
  var currentY = p.currentY != null ? p.currentY : 0;
  var pointers = p.pointers != null ? p.pointers : 1;
  var activeSheet = p.activeSheet != null ? p.activeSheet : false;
  var isCooldown = p.isCooldown != null ? p.isCooldown : isGestureInCooldown();
  var scope = p.scope || SWIPE_NAV_SCOPE;
  var activeTab = p.activeTab || 'today';
  var screenWidth = p.screenWidth || (typeof window !== 'undefined' ? window.innerWidth : 360);
  var targetScrollTop = p.targetScrollTop != null ? p.targetScrollTop : 0;

  // 1. Check scope restrictions
  if (scope === 'progress-tabs' && activeTab !== 'progress' && activeTab !== 'body' && activeTab !== 'lifts' && activeTab !== 'history') {
    return { action: 'IGNORE', direction: null, reason: 'scope-restricted' };
  }

  // 2. Single pointer only
  if (pointers !== 1) {
    return { action: 'IGNORE', direction: null, reason: 'multi-touch' };
  }

  // 3. Cooldown check
  if (isCooldown) {
    return { action: 'IGNORE', direction: null, reason: 'cooldown-active' };
  }

  // 4. Modal/sheet check
  if (activeSheet) {
    return { action: 'IGNORE', direction: null, reason: 'sheet-open' };
  }
  if (typeof document !== 'undefined') {
    var openModal = document.querySelector('.overlay:not(.is-hidden):not([hidden]), .sheet-overlay:not(.is-hidden):not([hidden]), .dialog-overlay:not(.is-hidden):not([hidden])');
    if (openModal) {
      return { action: 'IGNORE', direction: null, reason: 'sheet-open' };
    }
  }

  // 5. Vertical scroll check
  if (targetScrollTop > 0) {
    return { action: 'IGNORE', direction: null, reason: 'scroll-active' };
  }

  // 6. Edge guard: 24dp from screen edges
  if (startX < 24 || (screenWidth && startX > screenWidth - 24)) {
    return { action: 'IGNORE', direction: null, reason: 'edge-guard' };
  }

  // 7. Gesture owner check
  if (activeOwner) {
    return { action: 'IGNORE', direction: null, reason: 'gesture-owner' };
  }
  if (startTarget && typeof startTarget.closest === 'function') {
    var owned = startTarget.closest(
      '[data-gesture-owner], .food-log-row, .set-row, .set-row-precision, .set-row-wrap, ' +
      '.horizontal-scroller, .staples-shelf, .staples-chip-row, .staple-chip, ' +
      '.sheet, .overlay, .modal-backdrop, .dialog-overlay, .dialog-surface, ' +
      'input, textarea, select, button, #weightPlot, svg, canvas, .chart-container, ' +
      '.stat-tile, .stat-tiles-grid, .nutrition-barchart-container, #weeklyStatTilesContainer, ' +
      '.chart-header, .seg-tabs, .seg-range, .seg-dark, .app-view'
    );
    if (owned) {
      return { action: 'IGNORE', direction: null, reason: 'gesture-owner' };
    }
  }

  var dx = currentX - startX;
  var dy = currentY - startY;
  var absX = Math.abs(dx);
  var absY = Math.abs(dy);

  // 8. Distance threshold: max(80, screenWidth * 0.3)
  var minDistance = Math.max(80, screenWidth * 0.3);
  if (absX < minDistance) {
    return { action: 'IGNORE', direction: null, reason: 'distance-insufficient' };
  }

  // 9. Strictly horizontal: |dx| >= 2 * |dy|
  if (absX < 2 * absY) {
    return { action: 'IGNORE', direction: null, reason: 'diagonal-movement' };
  }

  var direction = dx < 0 ? 'LEFT' : 'RIGHT';
  return { action: 'NAVIGATE', direction: direction, reason: 'valid-swipe' };
}
