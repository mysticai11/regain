/* Catch-up settings section: auto-offer, protect last rest day, max sets, and sets per exercise */

import { getCatchupSettings, saveCatchupSettings } from "../../storage-catchup.js";
import { triggerHaptic } from "../../lib/dom.js";
import { renderSwitchHTML, updateSwitchUI } from "./helpers.js";

export function buildCatchupSettingsHTML() {
  var s = getCatchupSettings();
  var setsOptions = [1, 2, 3].map(function (num) {
    var active = s.setsPerExercise === num;
    var bg = active ? '#C6F432' : '#141416';
    var fg = active ? '#0B0B0C' : '#F5F5F4';
    return '<button type="button" class="btn catchup-sets-btn" data-catchup-sets="' + num + '" style="height:36px;width:36px;border-radius:8px;background:' + bg + ';color:' + fg + ';font-size:15px;font-weight:600;border:1px solid #222;cursor:pointer;padding:0">' + num + '</button>';
  }).join('');

  return '<div style="margin-top:24px;margin-bottom:8px"><span style="font-size:11px;font-weight:600;color:#8A8A8E;text-transform:uppercase;letter-spacing:0.08em">Catch-up & Schedule</span></div>'
    + '<div style="background:#1C1C1F;border-radius:16px;padding:16px;margin-bottom:24px">'
      + '<div style="display:flex;justify-content:space-between;align-items:center;padding-bottom:14px;border-bottom:1px solid #141416">'
        + '<div style="padding-right:12px">'
          + '<div style="font-size:15px;font-weight:600;color:#F5F5F4">Auto-offer catch-up</div>'
          + '<div style="font-size:11px;color:#8A8A8E;margin-top:2px">Prompt to spread or slide missed workouts</div>'
        + '</div>'
        + renderSwitchHTML('toggleAutoOfferBtn', s.autoOffer, 'Auto-offer catch-up')
      + '</div>'
      + '<div style="display:flex;justify-content:space-between;align-items:center;padding:14px 0;border-bottom:1px solid #141416">'
        + '<div style="padding-right:12px">'
          + '<div style="font-size:15px;font-weight:600;color:#F5F5F4">Protect rest day</div>'
          + '<div style="font-size:11px;color:#8A8A8E;margin-top:2px">Keeps Sunday reserved for recovery</div>'
        + '</div>'
        + renderSwitchHTML('toggleProtectRestBtn', s.protectLastRestDay, 'Protect rest day')
      + '</div>'
      + '<div style="display:flex;justify-content:space-between;align-items:center;padding:14px 0;border-bottom:1px solid #141416">'
        + '<div style="padding-right:12px">'
          + '<div style="font-size:15px;font-weight:600;color:#F5F5F4">Max sets per session</div>'
          + '<div style="font-size:11px;color:#8A8A8E;margin-top:2px">Hard cap on combined volume (16–24)</div>'
        + '</div>'
        + '<div style="display:flex;align-items:center;gap:6px">'
          + '<button type="button" class="btn" id="decMaxSetsBtn" style="height:36px;width:36px;border-radius:8px;background:#141416;color:#F5F5F4;font-size:17px;font-weight:600;border:1px solid #222;cursor:pointer;padding:0;display:flex;align-items:center;justify-content:center">-</button>'
          + '<span id="maxSetsDisplay" style="font-size:15px;font-weight:600;color:#F5F5F4;font-variant-numeric:tabular-nums;width:64px;text-align:center">' + s.maxSets + ' sets</span>'
          + '<button type="button" class="btn" id="incMaxSetsBtn" style="height:36px;width:36px;border-radius:8px;background:#141416;color:#F5F5F4;font-size:17px;font-weight:600;border:1px solid #222;cursor:pointer;padding:0;display:flex;align-items:center;justify-content:center">+</button>'
        + '</div>'
      + '</div>'
      + '<div style="display:flex;justify-content:space-between;align-items:center;padding-top:14px">'
        + '<div style="padding-right:12px">'
          + '<div style="font-size:15px;font-weight:600;color:#F5F5F4">Sets per added lift</div>'
          + '<div style="font-size:11px;color:#8A8A8E;margin-top:2px">Volume added from missed day</div>'
        + '</div>'
        + '<div style="display:flex;gap:6px">' + setsOptions + '</div>'
      + '</div>'
    + '</div>';
}

export function bindCatchupSettingsEvents(container) {
  if (!container || typeof container.querySelector !== 'function') return;
  var autoBtn = container.querySelector('#toggleAutoOfferBtn');
  if (autoBtn) {
    autoBtn.onclick = function () {
      triggerHaptic('selection');
      var cur = getCatchupSettings();
      var next = !cur.autoOffer;
      saveCatchupSettings({ autoOffer: next });
      updateSwitchUI(autoBtn, next);
    };
  }

  var protectBtn = container.querySelector('#toggleProtectRestBtn');
  if (protectBtn) {
    protectBtn.onclick = function () {
      triggerHaptic('selection');
      var cur = getCatchupSettings();
      var next = !cur.protectLastRestDay;
      saveCatchupSettings({ protectLastRestDay: next });
      updateSwitchUI(protectBtn, next);
    };
  }

  var decBtn = container.querySelector('#decMaxSetsBtn');
  var incBtn = container.querySelector('#incMaxSetsBtn');
  var display = container.querySelector('#maxSetsDisplay');
  var updateSets = function(delta) {
    triggerHaptic('selection');
    var cur = getCatchupSettings();
    var next = Math.max(16, Math.min(24, (cur.maxSets || 20) + delta));
    saveCatchupSettings({ maxSets: next });
    if (display) display.textContent = next + ' sets';
  };
  if (decBtn) decBtn.onclick = function() { updateSets(-1); };
  if (incBtn) incBtn.onclick = function() { updateSets(1); };

  container.querySelectorAll('.catchup-sets-btn').forEach(function (btn) {
    btn.onclick = function () {
      triggerHaptic('selection');
      var val = Number(btn.dataset.catchupSets);
      saveCatchupSettings({ setsPerExercise: val });
      container.querySelectorAll('.catchup-sets-btn').forEach(function (b) {
        var isTarget = Number(b.dataset.catchupSets) === val;
        b.style.background = isTarget ? '#C6F432' : '#141416';
        b.style.color = isTarget ? '#0B0B0C' : '#F5F5F4';
      });
    };
  });
}
