/* Nutrition Screen: 4-Pillar dedicated nutrition view, calorie & macro ring, food logging, and staples */

import { profile, tab } from "../state.js";
import { dayRecord, saveDayRecord, ls, sv, allDayKeys } from "../storage.js";
import { todayKey, esc } from "../lib/format.js";
import { getTargetsForDate, getDayTotals, foodMacros, addRecent } from "../lib/calc.js";
import { triggerHaptic, ic, showFoodAddedChip } from "../lib/dom.js";
import { openSettings } from "./settings.js";
import { openFoodSearch, openCustomFoodBuilder, openRecipeBuilder, openCustomFoodsManager, openMealEditor, openEditItemSheet } from "./today/food-modal.js";
import { buildCalRingHTML, getStaplesShelfHTML, triggerTodayAnimations } from "./today/widgets.js";
import { buildCollapsibleFoodLogHTML, bindFoodLogCardEvents, openTodayFoodSheet } from "./today/food-log-card.js";
import { bindStaplesShelfEvents } from "./today/staples-events.js";

export function renderNutritionSimple() {
  window.renderNutritionSimple = renderNutritionSimple;
  var key = todayKey();
  var activeDateKey = window.activeTodaySelectedDateKey || key;
  var rec = dayRecord(activeDateKey);
  var tot = getDayTotals(activeDateKey);
  var targets = getTargetsForDate(activeDateKey);

  var activeDateObj = new Date(activeDateKey + 'T00:00:00');
  var dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  var monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  var dateStr = dayNames[activeDateObj.getDay()] + ' ' + activeDateObj.getDate() + ' ' + monthNames[activeDateObj.getMonth()];

  var calRingHTML = buildCalRingHTML(
    Math.round(tot.kcal || 0),
    targets.kcal,
    Math.round(tot.protein || 0),
    targets.protein,
    Math.round(tot.carbs || 0),
    Math.round(tot.fat || 0),
    targets.carbs,
    targets.fat
  );

  var pastDateBanner = (activeDateKey !== key)
    ? ('<div style="display:flex;justify-content:space-between;align-items:center;background:var(--surface);border-radius:12px;padding:10px 14px;margin-bottom:14px;font-size:15px;color:var(--text)">'
        + '<span>Viewing: <b>' + activeDateObj.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) + '</b></span>'
        + '<button type="button" class="btn-text-action" id="nutritionReturnTodayBtn" style="color:var(--lime);font-size:15px;font-weight:600;background:none;border:none;cursor:pointer;padding:0">Today</button>'
      + '</div>')
    : '';

  var userInitial = (profile && profile.name && profile.name.trim()) ? profile.name.trim().charAt(0).toUpperCase() : '';
  var avatarInner = userInitial || ic('user', 18);

  var quickActionsHTML = '<div style="display:grid;grid-template-columns:repeat(3, 1fr);gap:10px;margin-bottom:20px">'
    + '<button type="button" class="btn btn-action-card" id="nutritionQuickLogBtn" style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;min-height:72px;padding:12px 6px;border-radius:16px;background:var(--accent-primary);color:var(--text);border:none;box-shadow:0 4px 16px var(--accent-glow);cursor:pointer">'
      + '<span style="display:inline-flex;align-items:center;justify-content:center;color:var(--text)">' + ic('plus', 20) + '</span>'
      + '<span style="font-size:var(--fs-caption);font-weight:600;letter-spacing:0.02em">Log Food</span>'
    + '</button>'
    + '<button type="button" class="btn btn-action-card" id="nutritionSearchBtn" style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;min-height:72px;padding:12px 6px;border-radius:16px;background:var(--surface2);color:var(--text);border:1px solid var(--hairline);cursor:pointer">'
      + '<span style="display:inline-flex;align-items:center;justify-content:center;color:var(--text)">' + ic('search', 20) + '</span>'
      + '<span style="font-size:var(--fs-caption);font-weight:600;letter-spacing:0.02em">Search</span>'
    + '</button>'
    + '<button type="button" class="btn btn-action-card" id="nutritionCustomBtn" style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;min-height:72px;padding:12px 6px;border-radius:16px;background:var(--surface2);color:var(--text);border:1px solid var(--hairline);cursor:pointer">'
      + '<span style="display:inline-flex;align-items:center;justify-content:center;color:var(--text)">' + ic('cook', 20) + '</span>'
      + '<span style="font-size:var(--fs-caption);font-weight:600;letter-spacing:0.02em">Custom</span>'
    + '</button>'
  + '</div>';

  var contentEl = document.getElementById('content');
  var prevScroll = (typeof window !== 'undefined' && (window.scrollY || window.pageYOffset || (document.documentElement ? document.documentElement.scrollTop : 0) || (document.body ? document.body.scrollTop : 0))) || (contentEl ? contentEl.scrollTop : 0);

  contentEl.innerHTML =
    '<div style="margin-bottom:20px">'
      + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">'
        + '<div style="display:flex;align-items:center;gap:10px">'
          + '<img src="assets/logo.png" alt="Regain" style="width:28px;height:28px;object-fit:contain;border-radius:6px">'
          + '<span style="font-size:var(--fs-20, 20px);font-weight:800;color:var(--text);letter-spacing:-0.02em">Regain</span>'
        + '</div>'
        + '<button class="profile-avatar-btn" id="nutritionSettingsBtn" aria-label="Profile and Settings" style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,rgba(139,92,246,0.3) 0%,rgba(56,189,248,0.2) 100%);border:1px solid rgba(255,255,255,0.12);color:var(--text);font-weight:700;font-size:15px;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:var(--card-shadow, 0 4px 12px rgba(0,0,0,0.3));flex-shrink:0">' + avatarInner + '</button>'
      + '</div>'
      + '<h1 style="font-size:32px;font-weight:800;color:var(--text);letter-spacing:-0.03em;margin:0;line-height:1.1">Nutrition</h1>'
      + '<div style="font-size:11px;font-weight:600;letter-spacing:0.08em;color:var(--text-secondary);text-transform:uppercase;margin-top:4px">' + esc(dateStr) + '</div>'
    + '</div>'
    + pastDateBanner
    + calRingHTML
    + quickActionsHTML
    + getStaplesShelfHTML()
    + buildCollapsibleFoodLogHTML({ key: key, activeDateKey: activeDateKey, rec: rec });

  var settingsBtn = document.getElementById('nutritionSettingsBtn');
  if (settingsBtn) settingsBtn.onclick = function(e) { if (e && e.stopPropagation) e.stopPropagation(); openSettings(); };

  var retBtn = document.getElementById('nutritionReturnTodayBtn');
  if (retBtn) retBtn.onclick = function() { triggerHaptic(); window.activeTodaySelectedDateKey = null; renderNutritionSimple(); };

  var quickLogBtn = document.getElementById('nutritionQuickLogBtn');
  if (quickLogBtn) {
    quickLogBtn.onclick = function() {
      triggerHaptic();
      openTodayFoodSheet({ activeDateKey: activeDateKey, openFoodSearch: openFoodSearch, addFoodToDay: addFoodToDay, onUpdate: renderNutritionSimple });
    };
  }

  var searchBtn = document.getElementById('nutritionSearchBtn');
  if (searchBtn) {
    searchBtn.onclick = function() {
      triggerHaptic();
      openFoodSearch(function(food, s) { addFoodToDay(activeDateKey, food, s); });
    };
  }

  var customBtn = document.getElementById('nutritionCustomBtn');
  if (customBtn) {
    customBtn.onclick = function() {
      triggerHaptic();
      openCustomFoodsManager(function() { renderNutritionSimple(); });
    };
  }

  bindStaplesShelfEvents(contentEl, function() {
    renderNutritionSimple();
  });

  bindFoodLogCardEvents(contentEl, {
    key: key,
    activeDateKey: activeDateKey,
    onUpdate: renderNutritionSimple,
    openFoodSearch: function() {
      openFoodSearch(function(food, s) { addFoodToDay(activeDateKey, food, s); });
    }
  });

  triggerTodayAnimations();

  if (prevScroll > 0) {
    if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') window.scrollTo(0, prevScroll);
    if (contentEl) contentEl.scrollTop = prevScroll;
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(function() { if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') window.scrollTo(0, prevScroll); });
  }
}

export function addFoodToDay(key, food, servings) {
  var prevTot = getDayTotals(key), dayTargets = getTargetsForDate(key);
  var m = foodMacros(food, servings), rec = dayRecord(key);
  rec.extra = rec.extra || [];
  rec.extra.push({ name: food.name + (servings !== 1 ? ' ×' + servings : ''), kcal: m.kcal, protein: m.protein, carbs: m.carbs, fat: m.fat, servings: 1 });
  saveDayRecord(key, rec); addRecent(food.name, m.kcal, m.protein, m.carbs, m.fat);
  sv('rg_food_log_collapsed', false);
  if (profile) { profile.xp = (profile.xp || 0) + 5; sv('rg_profile', profile); }
  var newTot = getDayTotals(key), reached = (prevTot.kcal < dayTargets.kcal && newTot.kcal >= dayTargets.kcal);
  triggerHaptic(reached ? 'success' : 'light');

  if (typeof window !== 'undefined' && window.tab === 'nutrition' && typeof window.renderNutritionSimple === 'function') {
    window.renderNutritionSimple();
  } else if (typeof window !== 'undefined' && typeof window.renderTodaySimple === 'function') {
    window.renderTodaySimple();
  }
  showFoodAddedChip(m.kcal);
}

export function migrateFoodTotals() {
  if (!profile || !profile.startDate || ls('rg_food_totals_v2', false)) return;
  allDayKeys().forEach(function (key) {
    var rec = dayRecord(key), changed = false;
    (rec.extra || []).forEach(function (item) {
      var s = Number(item.servings) || 1;
      if (s > 1) {
        item.kcal = +(Number(item.kcal || 0)).toFixed(1); item.protein = +(Number(item.protein || 0)).toFixed(1);
        item.carbs = +(Number(item.carbs || 0)).toFixed(1); item.fat = +(Number(item.fat || 0)).toFixed(1);
        item.servings = 1; changed = true;
      }
    });
    if (changed) saveDayRecord(key, rec);
  });
  sv('rg_food_totals_v2', true);
}
