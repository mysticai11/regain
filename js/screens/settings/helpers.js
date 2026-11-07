/* Settings screen UI helpers: switches, bottom-sheet profile picker, and day toggles */

import { esc } from "../../lib/format.js";
import { triggerHaptic } from "../../lib/dom.js";
import { confirmDialog } from "../../components/dialog.js";

export function renderSwitchHTML(id, isActive, ariaLabel) {
  var trackBg = isActive ? 'var(--lime)' : 'var(--surface-raised)';
  var border = isActive ? 'none' : '1px solid var(--hairline)';
  var thumbBg = isActive ? '#0B0B0C' : 'var(--text-secondary)';
  var thumbTransform = isActive ? 'translateX(20px)' : 'translateX(0)';
  return '<button type="button" role="switch" aria-checked="' + (isActive ? 'true' : 'false') + '" aria-label="' + esc(ariaLabel || '') + '" id="' + id + '" style="width:44px;height:24px;min-height:24px;border-radius:12px;background:' + trackBg + ';border:' + border + ';padding:2px;cursor:pointer;position:relative;display:inline-flex;align-items:center;box-sizing:border-box">'
    + '<span class="switch-thumb" style="width:18px;height:18px;border-radius:50%;background:' + thumbBg + ';transform:' + thumbTransform + ';transition:transform 0.2s, background 0.2s;display:inline-block"></span>'
    + '</button>';
}

export function updateSwitchUI(btn, isActive) {
  if (!btn) return;
  btn.setAttribute('aria-checked', isActive ? 'true' : 'false');
  btn.style.background = isActive ? 'var(--lime)' : 'var(--surface-raised)';
  btn.style.border = isActive ? 'none' : '1px solid var(--hairline)';
  var thumb = btn.querySelector('.switch-thumb');
  if (thumb) {
    thumb.style.background = isActive ? '#0B0B0C' : 'var(--text-secondary)';
    thumb.style.transform = isActive ? 'translateX(20px)' : 'translateX(0)';
  }
}

export function openProfilePickerModal(options) {
  var title = options.title || 'Select';
  var items = options.items || [];
  var currentValue = options.currentValue || '';
  var onSelect = options.onSelect;

  var overlay = document.createElement('div');
  overlay.className = 'overlay active';
  overlay.innerHTML = '<div class="sheet" style="background:var(--surface);border-radius:28px 28px 0 0;padding:20px 20px calc(24px + var(--safe-b));width:100%;max-width:480px;max-height:80vh;display:flex;flex-direction:column">'
    + '<div class="sheet-handle"></div>'
    + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px"><span style="font-size:17px;font-weight:600;color:var(--text)">' + esc(title) + '</span><button type="button" id="closeProfilePickerBtn" style="background:none;border:none;color:var(--text-secondary);font-size:15px;cursor:pointer">Done</button></div>'
    + '<div style="flex:1;overflow-y:auto">'
      + items.map(function(item) {
        var isCur = item.value === currentValue;
        return '<div class="picker-option-row" data-val="' + esc(item.value) + '" style="display:flex;justify-content:space-between;align-items:center;padding:14px 0;border-bottom:1px solid var(--hairline);cursor:pointer">'
          + '<span style="font-size:15px;font-weight:600;color:' + (isCur ? 'var(--lime)' : 'var(--text)') + '">' + esc(item.label) + '</span>'
          + (isCur ? '<span style="color:var(--lime);font-size:17px;font-weight:700">✓</span>' : '')
          + '</div>';
      }).join('')
    + '</div></div>';

  document.body.appendChild(overlay);
  overlay.querySelector('#closeProfilePickerBtn').onclick = function() { overlay.remove(); };
  overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };
  overlay.querySelectorAll('.picker-option-row').forEach(function(row) {
    row.onclick = function() {
      triggerHaptic();
      overlay.remove();
      if (typeof onSelect === 'function') onSelect(row.dataset.val);
    };
  });
}

export function bindResetAction(overlay, resetAllData, showToast) {
  var resetBtn = overlay.querySelector('#resetBtn');
  if (!resetBtn) return;
  var armed = false;
  var resetTimer = null;
  resetBtn.addEventListener('click', async function() {
    var executeReset = function() {
      resetBtn.disabled = true;
      resetBtn.textContent = 'Resetting…';
      resetAllData().then(function() {
        window.location.reload();
      }).catch(function() {
        showToast('Reset failed. Export a backup and try again.', 'warn');
        resetBtn.disabled = false;
        resetBtn.textContent = 'Reset';
      });
    };

    if (armed) {
      if (resetTimer) clearTimeout(resetTimer);
      executeReset();
      return;
    }

    var confirmed = false;
    try {
      confirmed = await confirmDialog({
        title: 'Wipe All Data?',
        message: 'This will delete all Regain data on this device. Are you sure?',
        confirmLabel: 'Wipe All Data',
        destructive: true
      });
    } catch (e) {
      confirmed = false;
    }

    if (confirmed) {
      executeReset();
    } else {
      armed = true;
      resetBtn.textContent = 'Confirm reset';
      resetBtn.style.background = '#FF4D4F';
      resetBtn.style.color = '#0B0B0C';
      showToast('Tap "Confirm reset" to wipe all data', 'warn');
      resetTimer = setTimeout(function() {
        armed = false;
        resetBtn.textContent = 'Reset';
        resetBtn.style.background = 'transparent';
        resetBtn.style.color = '#FF4D4F';
      }, 4500);
    }
  });
}
