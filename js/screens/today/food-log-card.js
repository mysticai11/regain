/* Collapsible Food Log Card Component for Today Screen */

import { esc } from "../../lib/format.js";
import { triggerHaptic } from "../../lib/dom.js";
import { ls, sv } from "../../storage.js";
import { claimGestureOwner, releaseGestureOwner, setGestureCooldown } from "../../lib/gesture.js";

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
    return '<div style="background:#141416;border:1px solid #222222;border-radius:16px;padding:16px;margin-top:28px;margin-bottom:40px">'
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

  return '<div style="background:#141416;border:1px solid #222222;border-radius:16px;padding:16px;margin-top:28px;margin-bottom:40px">'
    + '<div style="display:flex;justify-content:space-between;align-items:center;min-height:36px">'
    + '<button type="button" id="toggleFoodLogBtn" aria-expanded="' + (!isCollapsed) + '" aria-label="Toggle food log" style="display:flex;align-items:center;gap:10px;background:none;border:none;padding:0;cursor:pointer;color:inherit;text-align:left;flex:1;min-width:0">'
    + '<span style="font-size:17px;font-weight:600;color:#F5F5F4">' + title + '</span>'
    + '<span style="font-size:11px;font-weight:600;color:#8A8A8E;letter-spacing:0.08em;text-transform:uppercase;font-variant-numeric:tabular-nums">' + countText + '</span>'
    + '<svg id="foodLogChevron" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:#8A8A8E;transition:transform 200ms cubic-bezier(0.2,0,0,1);' + chevronTransform + ';flex-shrink:0"><polyline points="6 9 12 15 18 9"></polyline></svg>'
    + '</button>'
    + '<button type="button" class="btn-text-action" id="addFoodQuickBtn" style="color:#C6F432;font-size:15px;font-weight:600;background:none;border:none;padding:4px 0 4px 12px;min-height:44px;cursor:pointer;display:inline-flex;align-items:center;flex-shrink:0">+ Add</button>'
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

