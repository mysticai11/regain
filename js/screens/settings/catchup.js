/* Catch-up settings section: auto-offer, protect last rest day, max sets, and sets per exercise */

import { getCatchupSettings, saveCatchupSettings } from "../../storage-catchup.js";
import { triggerHaptic } from "../../lib/dom.js";

export function buildCatchupSettingsHTML() {
  var s = getCatchupSettings();
  var setsOptions = [1, 2, 3].map(function (num) {
    var active = s.setsPerExercise === num;
    var bg = active ? '#C6F432' : '#1C1C1F';
    var fg = active ? '#0B0B0C' : '#F5F5F4';
    return '<button type="button" class="btn catchup-sets-btn" data-catchup-sets="' + num + '" style="height:32px;width:32px;border-radius:8px;background:' + bg + ';color:' + fg + ';font-size:15px;font-weight:600;border:1px solid #222;cursor:pointer;padding:0">' + num + '</button>';
  }).join('');

  return '<div style="margin-top:32px;margin-bottom:8px"><span style="font-size:11px;font-weight:600;color:#8A8A8E;text-transform:uppercase;letter-spacing:0.08em">Catch-up & Schedule</span></div>'
    + '<div class="list-row" style="display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid #222">'
      + '<div>'
        + '<div style="font-size:15px;font-weight:500;color:#F5F5F4">Auto-offer catch-up</div>'
        + '<div style="font-size:11px;color:#8A8A8E;margin-top:2px">Prompt to slide or merge missed workouts</div>'
      + '</div>'
      + '<button type="button" class="btn" id="toggleAutoOfferBtn" style="height:36px;padding:0 14px;border-radius:8px;background:#1C1C1F;color:' + (s.autoOffer ? '#C6F432' : '#8A8A8E') + ';font-size:15px;font-weight:600;border:1px solid #222;cursor:pointer">' + (s.autoOffer ? 'On' : 'Off') + '</button>'
    + '</div>'
    + '<div class="list-row" style="display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid #222">'
      + '<div>'
        + '<div style="font-size:15px;font-weight:500;color:#F5F5F4">Protect last rest day</div>'
        + '<div style="font-size:11px;color:#8A8A8E;margin-top:2px">Prevents sliding workouts past Saturday</div>'
      + '</div>'
      + '<button type="button" class="btn" id="toggleProtectRestBtn" style="height:36px;padding:0 14px;border-radius:8px;background:#1C1C1F;color:' + (s.protectLastRestDay ? '#C6F432' : '#8A8A8E') + ';font-size:15px;font-weight:600;border:1px solid #222;cursor:pointer">' + (s.protectLastRestDay ? 'On' : 'Off') + '</button>'
    + '</div>'
    + '<div class="list-row" style="display:flex;flex-direction:column;gap:8px;padding:12px 0;border-bottom:1px solid #222">'
      + '<div style="display:flex;justify-content:space-between;align-items:center">'
        + '<div>'
          + '<div style="font-size:15px;font-weight:500;color:#F5F5F4">Max sets per merged session</div>'
          + '<div style="font-size:11px;color:#8A8A8E;margin-top:2px">Hard cap on combined volume (16–24)</div>'
        + '</div>'
        + '<span id="maxSetsDisplay" style="font-size:15px;font-weight:600;color:#C6F432;font-variant-numeric:tabular-nums">' + s.maxSets + ' sets</span>'
      + '</div>'
      + '<input type="range" id="maxSetsSlider" min="16" max="24" step="1" value="' + s.maxSets + '" style="width:100%;accent-color:#C6F432;cursor:pointer;margin:4px 0">'
    + '</div>'
    + '<div class="list-row" style="display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid #222">'
      + '<div>'
        + '<div style="font-size:15px;font-weight:500;color:#F5F5F4">Sets per added exercise</div>'
        + '<div style="font-size:11px;color:#8A8A8E;margin-top:2px">Volume added from missed day</div>'
      + '</div>'
      + '<div style="display:flex;gap:6px">' + setsOptions + '</div>'
    + '</div>';
}

export function bindCatchupSettingsEvents(container) {
  if (!container || typeof container.querySelector !== 'function') return;
  var autoBtn = container.querySelector('#toggleAutoOfferBtn');
  if (autoBtn) {
    autoBtn.onclick = function () {
      triggerHaptic();
      var cur = getCatchupSettings();
      var next = !cur.autoOffer;
      saveCatchupSettings({ autoOffer: next });
      autoBtn.textContent = next ? 'On' : 'Off';
      autoBtn.style.color = next ? '#C6F432' : '#8A8A8E';
    };
  }

  var protectBtn = container.querySelector('#toggleProtectRestBtn');
  if (protectBtn) {
    protectBtn.onclick = function () {
      triggerHaptic();
      var cur = getCatchupSettings();
      var next = !cur.protectLastRestDay;
      saveCatchupSettings({ protectLastRestDay: next });
      protectBtn.textContent = next ? 'On' : 'Off';
      protectBtn.style.color = next ? '#C6F432' : '#8A8A8E';
    };
  }

  var slider = container.querySelector('#maxSetsSlider');
  var display = container.querySelector('#maxSetsDisplay');
  if (slider && display) {
    slider.oninput = function () {
      display.textContent = slider.value + ' sets';
    };
    slider.onchange = function () {
      triggerHaptic();
      saveCatchupSettings({ maxSets: Number(slider.value) });
    };
  }

  container.querySelectorAll('.catchup-sets-btn').forEach(function (btn) {
    btn.onclick = function () {
      triggerHaptic();
      var val = Number(btn.dataset.catchupSets);
      saveCatchupSettings({ setsPerExercise: val });
      container.querySelectorAll('.catchup-sets-btn').forEach(function (b) {
        var isTarget = Number(b.dataset.catchupSets) === val;
        b.style.background = isTarget ? '#C6F432' : '#1C1C1F';
        b.style.color = isTarget ? '#0B0B0C' : '#F5F5F4';
      });
    };
  });
}
