/* Collapsible Food Log Card Component for Today Screen */

import { esc, todayKey } from "../../lib/format.js";
import { triggerHaptic } from "../../lib/dom.js";
import { ls, sv, dayRecord, saveDayRecord } from "../../storage.js";
import { claimGestureOwner, releaseGestureOwner, setGestureCooldown } from "../../lib/gesture.js";
import { getStaplesShelfHTML } from "./widgets.js";
import { bindStaplesShelfEvents } from "./staples-events.js";
import { showUndoToast } from "../../components/toast.js";

/**
 * Builds the collapsible food log card HTML.
 *
 * @param {Object} params
 * @param {string} params.key Current date key
 * @param {string} params.activeDateKey Selected view date key
 * @param {Object} params.rec Day record
 * @returns {string} HTML string
 */
export function buildCollapsibleFoodLogHTML({ key, activeDateKey, rec } = {}) {
  var isToday = (activeDateKey === key);
  var title = isToday ? "Today's Food" : "Food Log";
  var items = (rec && rec.extra) ? rec.extra : [];
  var count = items.length;
  var countText = count + (count === 1 ? ' item' : ' items');
  var isCollapsed = ls('rg_food_log_collapsed', true);

  if (!count) {
    return '<div style="background:var(--surface);border:1px solid var(--hairline);border-radius:16px;padding:16px;margin-top:16px;margin-bottom:24px">'
      + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">'
      + '<span style="font-size:17px;font-weight:600;color:#F5F5F4">' + title + '</span>'
      + '<span style="font-size:11px;font-weight:600;color:#8A8A8E;letter-spacing:0.08em;text-transform:uppercase;font-variant-numeric:tabular-nums">0 items</span>'
      + '</div>'
      + '<div style="padding:16px 0 12px;text-align:left">'
      + '<div style="font-size:15px;color:#55555A;margin-bottom:12px">No food logged for this day.</div>'
      + '<button type="button" class="btn btn-primary" id="addFoodBtn" style="min-height:48px;height:48px;padding:0 20px;cursor:pointer">+ Add food</button>'
      + '</div>'
      + '</div>';
  }

  var rowsHTML = items.map(function (item, i) {
    var kc = Math.round(item.kcal * (item.servings || 1));
    var pr = Math.round((item.protein || 0) * (item.servings || 1));
    return '<div class="food-log-row" data-gesture-owner="food-row" data-food-index="' + i + '" style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #1C1C1F;padding:14px 0;min-height:48px;gap:12px;touch-action:pan-y;cursor:pointer">'
      + '<span style="font-size:15px;font-weight:500;color:#F5F5F4;flex:1;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;word-break:break-word;line-height:1.3">' + esc(item.name) + '</span>'
      + '<span style="font-size:15px;color:#8A8A8E;font-variant-numeric:tabular-nums;flex-shrink:0">' + kc + ' kcal · ' + pr + ' g</span>'
      + '</div>';
  }).join('');

  var chevronTransform = isCollapsed ? 'transform:rotate(-90deg)' : 'transform:rotate(0deg)';
  var contentDisplay = isCollapsed ? 'display:none;' : 'display:block;margin-top:4px;';

  return '<div style="background:var(--surface);border:1px solid var(--hairline);border-radius:16px;padding:16px;margin-top:16px;margin-bottom:24px">'
    + '<div style="display:flex;justify-content:space-between;align-items:center;min-height:36px">'
    + '<button type="button" id="toggleFoodLogBtn" aria-expanded="' + (!isCollapsed) + '" aria-label="Toggle food log" style="display:flex;align-items:center;gap:10px;background:none;border:none;padding:0;cursor:pointer;color:inherit;text-align:left;flex:1;min-width:0">'
    + '<span style="font-size:17px;font-weight:600;color:#F5F5F4">' + title + '</span>'
    + '<span style="font-size:11px;font-weight:600;color:#8A8A8E;letter-spacing:0.08em;text-transform:uppercase;font-variant-numeric:tabular-nums">' + countText + '</span>'
    + '<svg id="foodLogChevron" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:#8A8A8E;transition:transform 200ms cubic-bezier(0.2,0,0,1);' + chevronTransform + ';flex-shrink:0"><polyline points="6 9 12 15 18 9"></polyline></svg>'
    + '</button>'
    + '<button type="button" class="btn-text-action" id="addFoodQuickBtn" style="color:var(--accent-primary);font-size:15px;font-weight:600;background:none;border:none;padding:4px 0 4px 12px;min-height:44px;cursor:pointer;display:inline-flex;align-items:center;flex-shrink:0">+ Add</button>'
    + '</div>'
    + '<div id="foodLogContent" style="' + contentDisplay + '">'
    + '<div>' + rowsHTML + '</div>'
    + '<button type="button" class="btn-text-action" id="addFoodBtn" style="color:#F5F5F4;font-size:15px;font-weight:600;background:none;border:none;padding:16px 0 4px;min-height:48px;cursor:pointer;display:inline-flex;align-items:center">+ Add food</button>'
    + '</div>'
    + '</div>';
}

/**
 * Binds interactivity for the collapsible food log card.
 *
 * @param {Object} params
 * @param {string} params.activeDateKey
 * @param {Function} params.openFoodSearch
 * @param {Function} params.addFoodToDay
 * @param {Function} params.deleteFoodEntry
 */
export function bindFoodLogCardEvents({ activeDateKey, openFoodSearch, addFoodToDay, deleteFoodEntry } = {}) {
  var toggleBtn = document.getElementById('toggleFoodLogBtn');
  var content = document.getElementById('foodLogContent');
  var chevron = document.getElementById('foodLogChevron');

  if (toggleBtn && content) {
    toggleBtn.onclick = function (e) {
      if (e && e.preventDefault) e.preventDefault();
      triggerHaptic('selection');
      var isHidden = content.style.display === 'none';
      if (isHidden) {
        content.style.display = 'block';
        content.style.marginTop = '4px';
        toggleBtn.setAttribute('aria-expanded', 'true');
        if (chevron) chevron.style.transform = 'rotate(0deg)';
        sv('rg_food_log_collapsed', false);
      } else {
        content.style.display = 'none';
        toggleBtn.setAttribute('aria-expanded', 'false');
        if (chevron) chevron.style.transform = 'rotate(-90deg)';
        sv('rg_food_log_collapsed', true);
      }
    };
  }

  var handleOpenSearch = function () {
    if (typeof openFoodSearch === 'function') {
      openFoodSearch(function (food, s) {
        if (typeof addFoodToDay === 'function') addFoodToDay(activeDateKey, food, s);
      });
    }
  };

  var addFoodBtn = document.getElementById('addFoodBtn');
  if (addFoodBtn) addFoodBtn.onclick = handleOpenSearch;

  var addFoodQuickBtn = document.getElementById('addFoodQuickBtn');
  if (addFoodQuickBtn) addFoodQuickBtn.onclick = handleOpenSearch;

  document.querySelectorAll('.food-delete').forEach(function (btn) {
    btn.onclick = function (e) {
      if (e && e.stopPropagation) e.stopPropagation();
      if (typeof deleteFoodEntry === 'function') {
        deleteFoodEntry(parseInt(btn.dataset.foodIndex, 10), btn.closest('.food-log-row'));
      }
    };
  });

  document.querySelectorAll('.food-log-row').forEach(function (row) {
    var startX = 0, deltaX = 0, idx = parseInt(row.dataset.foodIndex, 10);
    row.addEventListener('touchstart', function (e) {
      claimGestureOwner('food-row');
      if (e.changedTouches && e.changedTouches[0]) { startX = e.changedTouches[0].clientX; deltaX = 0; }
    }, { passive: true });
    row.addEventListener('touchmove', function (e) {
      if (!e.changedTouches || !e.changedTouches[0]) return;
      deltaX = e.changedTouches[0].clientX - startX;
      if (deltaX < 0) row.style.transform = 'translateX(' + Math.max(deltaX, -80) + 'px)';
    }, { passive: true });
    row.addEventListener('touchend', function () {
      releaseGestureOwner(); setGestureCooldown(400);
      if (deltaX < -60) {
        if (typeof deleteFoodEntry === 'function') deleteFoodEntry(idx, row);
      } else {
        row.style.transform = '';
      }
    }, { passive: true });
  });
}

/**
 * Opens the dedicated, full-screen Food Logger and Staples sheet.
 */
export function openTodayFoodSheet({ activeDateKey, openFoodSearch, addFoodToDay, onUpdate } = {}) {
  var dKey = activeDateKey || todayKey();
  var sheetId = 'todayFoodSheet';
  var existing = document.getElementById(sheetId);
  if (existing && existing.parentNode) existing.parentNode.removeChild(existing);

  var overlay = document.createElement('div');
  overlay.id = sheetId;
  overlay.className = 'dialog-overlay';
  overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);z-index:9999;display:flex;align-items:flex-end;justify-content:center;opacity:0;transition:opacity 200ms ease;';

  var close = function() {
    overlay.style.opacity = '0';
    setTimeout(function() { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); }, 200);
  };

  var renderSheetBody = function() {
    var rec = dayRecord(dKey);
    var sheetHTML = '<div class="dialog-surface" style="background:var(--surface);border:1px solid var(--hairline);border-radius:24px 24px 0 0;padding:24px 20px calc(28px + var(--safe-b));width:100%;max-width:540px;max-height:85vh;overflow-y:auto;box-sizing:border-box;box-shadow:0 -10px 40px rgba(0,0,0,0.6)">'
      + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px">'
        + '<div>'
          + '<div style="font-size:28px;font-weight:700;color:var(--text);letter-spacing:-0.02em">Food & Meals</div>'
          + '<div style="font-size:11px;font-weight:600;letter-spacing:0.08em;color:var(--text-secondary);text-transform:uppercase;margin-top:2px">' + esc(dKey) + '</div>'
        + '</div>'
        + '<button type="button" class="icon-btn" id="closeFoodSheetBtn" aria-label="Close" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;padding:6px;display:flex;align-items:center;justify-content:center">'
          + '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>'
        + '</button>'
      + '</div>'
      + '<div id="sheetStaplesMount">' + getStaplesShelfHTML() + '</div>'
      + '<div id="sheetFoodLogMount">' + buildCollapsibleFoodLogHTML({ key: todayKey(), activeDateKey: dKey, rec: rec }) + '</div>'
    + '</div>';

    overlay.innerHTML = sheetHTML;

    var closeBtn = overlay.querySelector('#closeFoodSheetBtn');
    if (closeBtn) closeBtn.onclick = close;

    bindStaplesShelfEvents(overlay, dKey, function() {
      if (typeof onUpdate === 'function') onUpdate();
      renderSheetBody();
    });

    var deleteFoodEntry = function(idx, row) {
      var current = dayRecord(dKey);
      if (!current.extra || isNaN(idx) || !current.extra[idx]) return;
      var performDel = function() {
        var removed = current.extra.splice(idx, 1)[0];
        saveDayRecord(dKey, current);
        if (typeof onUpdate === 'function') onUpdate();
        renderSheetBody();
        showUndoToast('Food entry deleted', function () {
          var restored = dayRecord(dKey);
          restored.extra = restored.extra || [];
          restored.extra.splice(Math.min(idx, restored.extra.length), 0, removed);
          saveDayRecord(dKey, restored);
          if (typeof onUpdate === 'function') onUpdate();
          renderSheetBody();
        });
      };
      if (row && typeof window !== 'undefined' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        row.style.transition = 'height 150ms cubic-bezier(0.2,0,0,1), opacity 150ms cubic-bezier(0.2,0,0,1), margin 150ms cubic-bezier(0.2,0,0,1)';
        row.style.height = row.offsetHeight + 'px'; void row.offsetHeight;
        row.style.height = '0px'; row.style.opacity = '0'; row.style.margin = '0px'; row.style.overflow = 'hidden';
        setTimeout(performDel, 150);
      } else { performDel(); }
    };

    bindFoodLogCardEvents({
      activeDateKey: dKey,
      openFoodSearch: function() {
        if (typeof openFoodSearch === 'function') {
          openFoodSearch(function(food, servings) {
            if (typeof addFoodToDay === 'function') addFoodToDay(dKey, food, servings);
            if (typeof onUpdate === 'function') onUpdate();
            renderSheetBody();
          });
        }
      },
      addFoodToDay: addFoodToDay,
      deleteFoodEntry: deleteFoodEntry
    });
  };

  overlay.onclick = function(e) { if (e.target === overlay) close(); };

  renderSheetBody();
  document.body.appendChild(overlay);
  requestAnimationFrame(function() { overlay.style.opacity = '1'; });
}

