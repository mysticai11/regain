/* FAB Quick Action Sheet: provides instant logging shortcuts for Food, Workout, Weight, and Steps */

import { setTab } from "../state.js";
import { todayKey, esc } from "../lib/format.js";
import { ic, triggerHaptic } from "../lib/dom.js";
import { dayRecord, saveDayRecord } from "../storage.js";
import { promptDialog } from "../components/dialog.js";
import { showToast } from "../components/toast.js";
import { openTodayWeightModal } from "../screens/today.js?v=26";

export function openQuickActionSheet() {
  var existing = document.getElementById('fabActionSheetOverlay');
  if (existing) existing.remove();

  var overlay = document.createElement('div');
  overlay.id = 'fabActionSheetOverlay';
  overlay.className = 'dialog-overlay';
  overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);z-index:9999;display:flex;align-items:flex-end;justify-content:center;opacity:0;transition:opacity 200ms ease;';

  var sheetHTML = '<div class="dialog-surface" style="background:var(--surface);border:1px solid var(--hairline);border-radius:24px 24px 0 0;padding:20px 20px calc(24px + var(--safe-b));width:100%;max-width:480px;box-sizing:border-box;box-shadow:var(--card-shadow, 0 -10px 40px rgba(0,0,0,0.6))">'
    + '<div style="width:36px;height:4px;border-radius:2px;background:var(--text-tertiary);margin:0 auto 16px;opacity:0.5"></div>'
    + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">'
      + '<div style="font-size:28px;font-weight:700;color:var(--text);letter-spacing:-0.02em">Quick Log</div>'
      + '<button type="button" class="btn-text-action" id="closeFabSheetBtn" style="color:var(--text-secondary);font-size:15px;background:none;border:none;padding:4px 8px;cursor:pointer">Cancel</button>'
    + '</div>'
    + '<div style="display:flex;flex-direction:column;gap:10px">'
      + '<button type="button" class="fab-action-row" id="fabActFood" style="display:flex;align-items:center;gap:14px;padding:12px 16px;border-radius:14px;background:var(--surface2);border:1px solid var(--hairline);color:var(--text);cursor:pointer;text-align:left">'
        + '<div style="width:36px;height:36px;border-radius:10px;background:rgba(139,92,246,0.15);color:var(--accent-primary);display:flex;align-items:center;justify-content:center;flex-shrink:0">' + ic('apple', 20) + '</div>'
        + '<div style="flex:1;min-width:0"><div style="font-size:15px;font-weight:600;color:var(--text)">Log Food</div><div style="font-size:12px;color:var(--text-secondary)">Track meal calories & macros</div></div>'
      + '</button>'
      + '<button type="button" class="fab-action-row" id="fabActWorkout" style="display:flex;align-items:center;gap:14px;padding:12px 16px;border-radius:14px;background:var(--surface2);border:1px solid var(--hairline);color:var(--text);cursor:pointer;text-align:left">'
        + '<div style="width:36px;height:36px;border-radius:10px;background:rgba(6,182,212,0.15);color:var(--accent-secondary);display:flex;align-items:center;justify-content:center;flex-shrink:0">' + ic('barbell', 20) + '</div>'
        + '<div style="flex:1;min-width:0"><div style="font-size:15px;font-weight:600;color:var(--text)">Start Workout</div><div style="font-size:12px;color:var(--text-secondary)">Begin training session</div></div>'
      + '</button>'
      + '<button type="button" class="fab-action-row" id="fabActWeight" style="display:flex;align-items:center;gap:14px;padding:12px 16px;border-radius:14px;background:var(--surface2);border:1px solid var(--hairline);color:var(--text);cursor:pointer;text-align:left">'
        + '<div style="width:36px;height:36px;border-radius:10px;background:rgba(139,92,246,0.15);color:var(--accent-primary);display:flex;align-items:center;justify-content:center;flex-shrink:0">' + ic('trend_up', 20) + '</div>'
        + '<div style="flex:1;min-width:0"><div style="font-size:15px;font-weight:600;color:var(--text)">Log Bodyweight</div><div style="font-size:12px;color:var(--text-secondary)">Record morning weigh-in</div></div>'
      + '</button>'
      + '<button type="button" class="fab-action-row" id="fabActSteps" style="display:flex;align-items:center;gap:14px;padding:12px 16px;border-radius:14px;background:var(--surface2);border:1px solid var(--hairline);color:var(--text);cursor:pointer;text-align:left">'
        + '<div style="width:36px;height:36px;border-radius:10px;background:rgba(236,72,153,0.15);color:var(--accent-pink);display:flex;align-items:center;justify-content:center;flex-shrink:0">' + ic('flame', 20) + '</div>'
        + '<div style="flex:1;min-width:0"><div style="font-size:15px;font-weight:600;color:var(--text)">Log Steps</div><div style="font-size:12px;color:var(--text-secondary)">Update daily step count</div></div>'
      + '</button>'
    + '</div>'
  + '</div>';

  overlay.innerHTML = sheetHTML;
  document.body.appendChild(overlay);
  requestAnimationFrame(function() { overlay.style.opacity = '1'; });

  var close = function() {
    overlay.style.opacity = '0';
    setTimeout(function() { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); }, 200);
  };

  var closeBtn = overlay.querySelector('#closeFabSheetBtn');
  if (closeBtn) closeBtn.onclick = close;
  overlay.onclick = function(e) { if (e.target === overlay) close(); };

  var btnFood = overlay.querySelector('#fabActFood');
  if (btnFood) btnFood.onclick = function() {
    close();
    triggerHaptic();
    setTab('nutrition');
    if (typeof window !== 'undefined' && typeof window.renderApp === 'function') window.renderApp();
  };

  var btnWorkout = overlay.querySelector('#fabActWorkout');
  if (btnWorkout) btnWorkout.onclick = function() {
    close();
    triggerHaptic();
    setTab('gym');
    if (typeof window !== 'undefined' && typeof window.renderApp === 'function') window.renderApp();
  };

  var btnWeight = overlay.querySelector('#fabActWeight');
  if (btnWeight) btnWeight.onclick = function() {
    close();
    triggerHaptic();
    openTodayWeightModal(todayKey());
  };

  var btnSteps = overlay.querySelector('#fabActSteps');
  if (btnSteps) btnSteps.onclick = function() {
    close();
    triggerHaptic();
    var dKey = todayKey();
    var rec = dayRecord(dKey);
    var cur = (rec && rec.steps != null) ? rec.steps : '';
    promptDialog({
      title: 'Log Today\'s Steps',
      message: 'Enter your total step count for today:',
      defaultValue: cur,
      inputType: 'number',
      placeholder: 'e.g. 10000',
      confirmLabel: 'Save',
      cancelLabel: 'Cancel'
    }).then(function(input) {
      if (input == null) return;
      var parsed = parseInt(String(input).replace(/[^0-9]/g, ''), 10);
      if (isNaN(parsed) || parsed < 0) {
        showToast('Please enter a valid step count', 'warn');
        return;
      }
      rec.steps = parsed;
      saveDayRecord(dKey, rec);
      showToast('Steps updated: ' + parsed.toLocaleString(), 'ok');
      if (typeof window !== 'undefined' && typeof window.renderTab === 'function') window.renderTab();
    });
  };
}
