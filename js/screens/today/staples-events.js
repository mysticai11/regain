/* Staple food shelf event handlers: tap, long-press portion sheet, logging, and undo */

import { dayRecord, saveDayRecord } from "../../storage.js";
import { getTargetsForDate, getDayTotals, addRecent } from "../../lib/calc.js";
import { playSound, triggerHaptic, showFoodAddedChip } from "../../lib/dom.js";
import { showUndoToast } from "../../components/toast.js";
import { getMergedStaples, openPortionSheet } from "./widgets.js";

export function bindStaplesShelfEvents(container, activeDateKey, onUpdate) {
  if (!container || typeof container.querySelectorAll !== 'function') return;
  var staples = getMergedStaples();
  container.querySelectorAll('[data-quick-staple]').forEach(function (card) {
    var sIdx = parseInt(card.dataset.quickStaple, 10);
    var item = staples[sIdx];
    if (!item) return;

    var logItem = function (mult) {
      mult = mult || 1;
      var prevTot = getDayTotals(activeDateKey), dayTargets = getTargetsForDate(activeDateKey);
      var currentRec = dayRecord(activeDateKey);
      currentRec.extra = currentRec.extra || [];
      var insertIdx = currentRec.extra.length;
      var portionLabel = mult === 1 ? '' : (mult === 0.5 ? '½× ' : mult + '× ');
      currentRec.extra.push({
        name: portionLabel + item.name, kcal: Math.round(item.kcal * mult),
        protein: +(item.protein * mult).toFixed(1), carbs: Math.round((item.carbs || 0) * mult),
        fat: Math.round((item.fat || 0) * mult), servings: 1
      });
      saveDayRecord(activeDateKey, currentRec);
      addRecent(item.name, item.kcal, item.protein, item.carbs || 0, item.fat || 0);
      var newTot = getDayTotals(activeDateKey), reached = (prevTot.kcal < dayTargets.kcal && newTot.kcal >= dayTargets.kcal);
      playSound('set_logged'); triggerHaptic(reached ? 'success' : 'light');
      if (typeof onUpdate === 'function') onUpdate();
      showFoodAddedChip(Math.round(item.kcal * mult));
      showUndoToast('Logged ' + portionLabel + item.name + ' (' + +(item.protein * mult).toFixed(1) + 'g P)', function () {
        var undoRec = dayRecord(activeDateKey);
        if (undoRec.extra && undoRec.extra.length > insertIdx) {
          undoRec.extra.splice(insertIdx, 1); saveDayRecord(activeDateKey, undoRec);
          if (typeof onUpdate === 'function') onUpdate();
        }
      });
    };

    var pressTimer = null, didLongPress = false, touchStartX = 0, touchStartY = 0, hasMoved = false;
    card.addEventListener('touchstart', function (e) {
      didLongPress = false; hasMoved = false;
      if (e.touches && e.touches[0]) { touchStartX = e.touches[0].clientX; touchStartY = e.touches[0].clientY; }
      pressTimer = setTimeout(function () {
        if (!hasMoved) { didLongPress = true; triggerHaptic(); openPortionSheet(item, function (mult) { logItem(mult); }); }
      }, 450);
    }, { passive: true });

    card.addEventListener('touchmove', function (e) {
      if (e.touches && e.touches[0]) {
        var dx = Math.abs(e.touches[0].clientX - touchStartX), dy = Math.abs(e.touches[0].clientY - touchStartY);
        if (dx > 10 || dy > 10) { hasMoved = true; if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; } }
      }
    }, { passive: true });

    card.addEventListener('touchend', function () { if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; } }, { passive: true });

    card.addEventListener('contextmenu', function (e) {
      e.preventDefault(); if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; }
      triggerHaptic(); openPortionSheet(item, function (mult) { logItem(mult); });
    });

    card.onclick = function () {
      if (didLongPress || hasMoved) return;
      logItem(1);
    };
  });
}
