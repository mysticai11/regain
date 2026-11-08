/* Weight card event handling: save, clear, blur debouncing and undo */

import { profile } from "../../state.js";
import { sv, dayRecord, saveDayRecord } from "../../storage.js";
import { showToast } from "../../components/toast.js";
import { triggerHaptic } from "../../lib/dom.js";
import { confirmDialog } from "../../components/dialog.js";

export function bindTodayWeightEvents(activeDateKey, rec, renderTodaySimple) {
  var todayWeightInput = document.getElementById('todayWeight');
  var saveTodayWeight = document.getElementById('saveTodayWeight');
  var deleteTodayWeightBtn = document.getElementById('deleteTodayWeightBtn');

  var clearTodayWeight = async function() {
    var ok = await confirmDialog({
      title: 'Clear Weight Log?',
      message: 'Clear weight log (' + rec.weight + ' kg)?',
      confirmLabel: 'Clear Log',
      destructive: true
    });
    if (!ok) return;
    rec.weight = null;
    saveDayRecord(activeDateKey, rec);
    if (profile.weightEntries) {
      profile.weightEntries = profile.weightEntries.filter(function(e) { return e.dayKey !== activeDateKey; });
      sv('rg_profile', profile);
    }
    triggerHaptic();
    showToast('Weight log cleared', 'ok');
    renderTodaySimple();
  };

  if (deleteTodayWeightBtn) deleteTodayWeightBtn.onclick = clearTodayWeight;

  if (todayWeightInput && saveTodayWeight) {
    var initialW = (todayWeightInput.value || '').trim();
    todayWeightInput.oninput = function () {
      var curW = (todayWeightInput.value || '').trim();
      var changed = curW !== initialW;
      if (changed) {
        saveTodayWeight.textContent = 'Save';
        saveTodayWeight.style.background = 'var(--accent-primary)';
        saveTodayWeight.style.color = 'var(--text)';
        saveTodayWeight.style.border = 'none';
        saveTodayWeight.style.opacity = '1';
        saveTodayWeight.style.cursor = 'pointer';
      } else if (initialW !== '') {
        saveTodayWeight.textContent = 'Saved';
        saveTodayWeight.style.background = 'var(--surface2)';
        saveTodayWeight.style.color = 'var(--text-secondary)';
        saveTodayWeight.style.border = '1px solid var(--hairline)';
        saveTodayWeight.style.opacity = '1';
        saveTodayWeight.style.cursor = 'default';
      } else {
        saveTodayWeight.textContent = 'Save';
        saveTodayWeight.style.background = 'transparent';
        saveTodayWeight.style.color = 'var(--text-secondary)';
        saveTodayWeight.style.border = '1px solid var(--hairline)';
        saveTodayWeight.style.opacity = '0.4';
        saveTodayWeight.style.cursor = 'default';
      }
    };

    var doSaveWeight = function () {
      var valStr = (todayWeightInput.value || '').trim();
      if (!valStr || valStr === initialW) return;
      var w = parseFloat(valStr.replace(',', '.'));
      if (!w || isNaN(w) || w < 20 || w > 300) {
        showToast('Enter a valid weight', 'warn');
        return;
      }
      profile.weightEntries = (profile.weightEntries || []).filter(function(e) { return e.dayKey !== activeDateKey; });
      profile.weightEntries.push({
        id: 'weight_' + Date.now(),
        dayKey: activeDateKey,
        weight: w,
        createdAt: new Date().toISOString()
      });
      sv('rg_profile', profile);
      rec.weight = w;
      saveDayRecord(activeDateKey, rec);
      triggerHaptic();
      showToast('Weight saved', 'ok');
      initialW = String(w);
      renderTodaySimple();
    };

    saveTodayWeight.onclick = doSaveWeight;
    todayWeightInput.onblur = doSaveWeight;
  }
}
