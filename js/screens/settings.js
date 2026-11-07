/* Settings screen: targets, training days, plan picker, profile, and onboarding modal */

import { profile, setProfile, setTab } from "../state.js";
import { sv, ls, dayRecord, saveDayRecord, exportData, importData, resetAllData } from "../storage.js";
import { DEFAULT_MEAL_PLAN } from "../data/foods.js";
import { renderApp } from "../main.js";
import { CAL_TARGET_REST, CAL_TARGET_GYM, PROT_TARGET_REST, PROT_TARGET_GYM, DEFAULT_5DAY_ROUTINE } from "../data/plan.js";
import { showToast } from "../components/toast.js";
import { openSplitManagerSheet } from "./gym/plan-editor.js";
import { openCustomFoodsManager } from "./today/food-modal.js";
import { todayKey, esc, currentWeight } from "../lib/format.js";
import { triggerHaptic } from "../lib/dom.js";
import { buildCatchupSettingsHTML, bindCatchupSettingsEvents } from "./settings/catchup.js";
import { renderSwitchHTML, updateSwitchUI, openProfilePickerModal, bindResetAction } from "./settings/helpers.js";

export function openSettings() {
  if (document.getElementById('settingsOverlay')) return;
  var weekDaysMeta = [{ js: 1, name: 'Mon' }, { js: 2, name: 'Tue' }, { js: 3, name: 'Wed' }, { js: 4, name: 'Thu' }, { js: 5, name: 'Fri' }, { js: 6, name: 'Sat' }, { js: 0, name: 'Sun' }];
  var tdays = (profile.trainingDays || [1, 2, 4, 5, 6]).slice();
  var overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.id = 'settingsOverlay';
  var equipVal = profile.equipment || 'full', dietVal = profile.dietaryPattern || 'nonveg', goalVal = profile.goal || 'gain', expVal = profile.experience || 'novice', shields = profile.shields || 0;
  var restKcal = profile.calTargetRest || CAL_TARGET_REST, gymKcal = profile.calTargetGym || CAL_TARGET_GYM, restProt = profile.protTargetRest || PROT_TARGET_REST, gymProt = profile.protTargetGym || PROT_TARGET_GYM, targetWeight = profile.targetWeight || 60.0;

  var goalOptions = [{ value: 'gain', label: 'Build muscle' }, { value: 'loss', label: 'Lose fat' }, { value: 'recomp', label: 'Recomp' }, { value: 'strength', label: 'Strength' }];
  var equipOptions = [{ value: 'full', label: 'Full Gym' }, { value: 'home', label: 'Home Gym' }, { value: 'db', label: 'Dumbbells Only' }, { value: 'body', label: 'Bodyweight' }];
  var dietOptions = [{ value: 'nonveg', label: 'Non-Vegetarian' }, { value: 'eggitarian', label: 'Eggitarian' }, { value: 'veg', label: 'Vegetarian' }, { value: 'vegan', label: 'Vegan' }];
  var expOptions = [{ value: 'novice', label: 'Novice / Intermediate' }, { value: 'advanced', label: 'Advanced' }];

  var getOptLabel = function(opts, val) { var found = opts.find(function(o){ return o.value === val; }); return found ? found.label : val; };

  var dayTogglesHTML = weekDaysMeta.map(function(d) {
    var active = tdays.includes(d.js);
    var actStyle = active
      ? 'background:rgba(200,245,60,0.14) !important;border:1.5px solid var(--lime) !important;color:var(--lime) !important;font-weight:600 !important;'
      : 'background:transparent !important;border:1px solid var(--hairline) !important;color:var(--text-secondary) !important;font-weight:500 !important;';
    return '<button type="button" class="day-toggle settings-day-toggle' + (active ? ' active' : '') + '" data-day="' + d.js + '" style="' + actStyle + 'height:44px;min-width:0;width:100%;border-radius:10px;font-size:15px;cursor:pointer;padding:0;display:flex;align-items:center;justify-content:center;box-sizing:border-box">' + d.name + '</button>';
  }).join('');

  overlay.innerHTML = '<div class="sheet" style="background:#141416;border:none;border-radius:20px 20px 0 0;padding:20px 20px calc(24px + var(--safe-b));max-width:480px;width:100%;max-height:88vh;overflow-y:auto">'
    + '<div class="sheet-handle"></div>'
    + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">'
      + '<div style="font-size:28px;font-weight:600;color:#F5F5F4;line-height:1.15">Settings</div>'
      + '<button type="button" class="btn-text-action" id="closeSettingsBtn" style="font-size:15px;color:#8A8A8E;background:none;border:none;padding:8px 0;cursor:pointer;min-height:48px;min-width:48px;display:inline-flex;align-items:center;justify-content:flex-end">Close</button>'
    + '</div>'

    // TARGETS (Compact Card)
    + '<div style="margin-top:20px;margin-bottom:8px"><span style="font-size:11px;font-weight:600;color:#8A8A8E;text-transform:uppercase;letter-spacing:0.08em">Targets</span></div>'
    + '<div style="background:#1C1C1F;border-radius:16px;padding:16px;margin-bottom:24px">'
      + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">'
        + '<div style="font-size:11px;font-weight:600;color:#8A8A8E;text-transform:uppercase;letter-spacing:0.08em;text-align:center">Rest day</div>'
        + '<div style="font-size:11px;font-weight:600;color:#8A8A8E;text-transform:uppercase;letter-spacing:0.08em;text-align:center">Gym day</div>'
      + '</div>'
      + '<div style="font-size:11px;font-weight:600;color:#8A8A8E;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px">Calories</div>'
      + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px">'
        + '<div style="height:48px;min-height:48px;background:#141416;border:1px solid #222;border-radius:8px;display:flex;align-items:center;justify-content:center;gap:4px;cursor:text" onclick="var i=this.querySelector(\'input\');if(i)i.focus();">'
          + '<input type="number" id="setTargetRest" value="' + restKcal + '" inputmode="numeric" style="background:transparent;border:none;font-size:17px;font-weight:600;color:#F5F5F4;font-variant-numeric:tabular-nums;text-align:center;width:68px;padding:0;outline:none">'
          + '<span style="font-size:11px;color:#8A8A8E;pointer-events:none">kcal</span>'
        + '</div>'
        + '<div style="height:48px;min-height:48px;background:#141416;border:1px solid #222;border-radius:8px;display:flex;align-items:center;justify-content:center;gap:4px;cursor:text" onclick="var i=this.querySelector(\'input\');if(i)i.focus();">'
          + '<input type="number" id="setTargetGym" value="' + gymKcal + '" inputmode="numeric" style="background:transparent;border:none;font-size:17px;font-weight:600;color:#F5F5F4;font-variant-numeric:tabular-nums;text-align:center;width:68px;padding:0;outline:none">'
          + '<span style="font-size:11px;color:#8A8A8E;pointer-events:none">kcal</span>'
        + '</div>'
      + '</div>'
      + '<div style="font-size:11px;font-weight:600;color:#8A8A8E;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px">Protein</div>'
      + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">'
        + '<div style="height:48px;min-height:48px;background:#141416;border:1px solid #222;border-radius:8px;display:flex;align-items:center;justify-content:center;gap:4px;cursor:text" onclick="var i=this.querySelector(\'input\');if(i)i.focus();">'
          + '<input type="number" id="setProtRest" value="' + restProt + '" inputmode="numeric" style="background:transparent;border:none;font-size:17px;font-weight:600;color:#F5F5F4;font-variant-numeric:tabular-nums;text-align:center;width:48px;padding:0;outline:none">'
          + '<span style="font-size:11px;color:#8A8A8E;pointer-events:none">g</span>'
        + '</div>'
        + '<div style="height:48px;min-height:48px;background:#141416;border:1px solid #222;border-radius:8px;display:flex;align-items:center;justify-content:center;gap:4px;cursor:text" onclick="var i=this.querySelector(\'input\');if(i)i.focus();">'
          + '<input type="number" id="setProtGym" value="' + gymProt + '" inputmode="numeric" style="background:transparent;border:none;font-size:17px;font-weight:600;color:#F5F5F4;font-variant-numeric:tabular-nums;text-align:center;width:48px;padding:0;outline:none">'
          + '<span style="font-size:11px;color:#8A8A8E;pointer-events:none">g</span>'
        + '</div>'
      + '</div>'
      + '<div style="border-top:1px solid #222;padding-top:14px;display:grid;grid-template-columns:1fr 1fr;gap:12px;align-items:center">'
        + '<div style="font-size:15px;color:#F5F5F4;font-weight:500">Goal Weight</div>'
        + '<div style="height:48px;min-height:48px;background:#141416;border:1px solid #222;border-radius:8px;display:flex;align-items:center;justify-content:center;gap:4px;cursor:text" onclick="var i=this.querySelector(\'input\');if(i)i.focus();">'
          + '<input type="number" step="0.1" id="setTargetWeight" value="' + targetWeight + '" inputmode="decimal" style="background:transparent;border:none;font-size:17px;font-weight:600;color:#F5F5F4;font-variant-numeric:tabular-nums;text-align:center;width:56px;padding:0;outline:none">'
          + '<span style="font-size:11px;color:#8A8A8E;pointer-events:none">kg</span>'
        + '</div>'
      + '</div>'
    + '</div>'

    // TRAINING DAYS
    + '<div style="margin-top:24px;margin-bottom:8px"><span style="font-size:11px;font-weight:600;color:#8A8A8E;text-transform:uppercase;letter-spacing:0.08em">Training days</span></div>'
    + '<div style="background:#1C1C1F;border-radius:16px;padding:16px;margin-bottom:24px">'
      + '<div style="font-size:15px;font-weight:600;color:#F5F5F4;margin-bottom:2px">Days you train</div>'
      + '<div style="font-size:11px;color:#8A8A8E;margin-bottom:14px">Workouts map to your split in weekly sequence</div>'
      + '<div class="day-toggles" style="display:grid;grid-template-columns:repeat(7, 1fr);gap:6px;width:100%">' + dayTogglesHTML + '</div>'
    + '</div>'

    // PROFILE (Rows with chevron right, opening bottom-sheet picker)
    + '<div style="margin-top:24px;margin-bottom:8px"><span style="font-size:11px;font-weight:600;color:#8A8A8E;text-transform:uppercase;letter-spacing:0.08em">Profile</span></div>'
    + '<div style="background:#1C1C1F;border-radius:16px;padding:8px 16px;margin-bottom:24px">'
      + '<div id="rowPickGoal" style="display:flex;justify-content:space-between;align-items:center;padding:14px 0;border-bottom:1px solid var(--hairline);cursor:pointer">'
        + '<span style="font-size:15px;color:var(--text);font-weight:500">Primary Goal</span>'
        + '<span style="display:flex;align-items:center;gap:6px;font-size:15px;color:var(--text-secondary)"><span id="valPickGoal">' + esc(getOptLabel(goalOptions, goalVal)) + '</span><span style="font-size:17px">›</span></span>'
      + '</div>'
      + '<div id="rowPickEquip" style="display:flex;justify-content:space-between;align-items:center;padding:14px 0;border-bottom:1px solid var(--hairline);cursor:pointer">'
        + '<span style="font-size:15px;color:var(--text);font-weight:500">Equipment Access</span>'
        + '<span style="display:flex;align-items:center;gap:6px;font-size:15px;color:var(--text-secondary)"><span id="valPickEquip">' + esc(getOptLabel(equipOptions, equipVal)) + '</span><span style="font-size:17px">›</span></span>'
      + '</div>'
      + '<div id="rowPickDiet" style="display:flex;justify-content:space-between;align-items:center;padding:14px 0;border-bottom:1px solid var(--hairline);cursor:pointer">'
        + '<span style="font-size:15px;color:var(--text);font-weight:500">Dietary Pattern</span>'
        + '<span style="display:flex;align-items:center;gap:6px;font-size:15px;color:var(--text-secondary)"><span id="valPickDiet">' + esc(getOptLabel(dietOptions, dietVal)) + '</span><span style="font-size:17px">›</span></span>'
      + '</div>'
      + '<div id="rowPickExp" style="display:flex;justify-content:space-between;align-items:center;padding:14px 0;cursor:pointer">'
        + '<span style="font-size:15px;color:var(--text);font-weight:500">Experience Tier</span>'
        + '<span style="display:flex;align-items:center;gap:6px;font-size:15px;color:var(--text-secondary)"><span id="valPickExp">' + esc(getOptLabel(expOptions, expVal)) + '</span><span style="font-size:17px">›</span></span>'
      + '</div>'
      + '<select id="setGoal" style="display:none">' + goalOptions.map(function(o){ return '<option value="' + o.value + '"' + (goalVal === o.value ? ' selected' : '') + '>' + o.label + '</option>'; }).join('') + '</select>'
      + '<select id="setEquip" style="display:none">' + equipOptions.map(function(o){ return '<option value="' + o.value + '"' + (equipVal === o.value ? ' selected' : '') + '>' + o.label + '</option>'; }).join('') + '</select>'
      + '<select id="setDiet" style="display:none">' + dietOptions.map(function(o){ return '<option value="' + o.value + '"' + (dietVal === o.value ? ' selected' : '') + '>' + o.label + '</option>'; }).join('') + '</select>'
      + '<select id="setExp" style="display:none">' + expOptions.map(function(o){ return '<option value="' + o.value + '"' + (expVal === o.value ? ' selected' : '') + '>' + o.label + '</option>'; }).join('') + '</select>'
    + '</div>'

    // PLAN
    + '<div style="margin-top:24px;margin-bottom:8px"><span style="font-size:11px;font-weight:600;color:#8A8A8E;text-transform:uppercase;letter-spacing:0.08em">Plan</span></div>'
    + '<div style="background:#1C1C1F;border-radius:16px;padding:16px;margin-bottom:24px;display:flex;justify-content:space-between;align-items:center">'
      + '<div>'
        + '<div style="font-size:15px;font-weight:600;color:#F5F5F4">Routine & Split</div>'
        + '<div style="font-size:11px;color:#8A8A8E;margin-top:2px">Custom 5-day split & exercise catalog</div>'
      + '</div>'
      + '<button type="button" class="btn" id="openPlanFromSettingsBtn" style="white-space:nowrap;height:36px;padding:0 14px;border-radius:8px;background:#141416;color:#F5F5F4;font-size:15px;font-weight:600;border:1px solid #222;cursor:pointer">Edit plan</button>'
    + '</div>'

    // ADVANCED (Unified Card with native switch toggles)
    + '<div style="margin-top:24px;margin-bottom:8px"><span style="font-size:11px;font-weight:600;color:#8A8A8E;text-transform:uppercase;letter-spacing:0.08em">Advanced</span></div>'
    + '<div style="background:#1C1C1F;border-radius:16px;padding:16px;margin-bottom:24px">'
      + '<div style="display:flex;justify-content:space-between;align-items:center;padding-bottom:14px;border-bottom:1px solid #141416">'
        + '<div><div style="font-size:15px;font-weight:600;color:#F5F5F4">Haptic feedback</div><div style="font-size:11px;color:#8A8A8E;margin-top:2px">Vibrate on taps and logged sets</div></div>'
        + renderSwitchHTML('toggleHapticsBtn', !profile.hapticsMuted, 'Haptic feedback')
      + '</div>'
      + '<div style="display:flex;justify-content:space-between;align-items:center;padding:14px 0;border-bottom:1px solid #141416">'
        + '<div><div style="font-size:15px;font-weight:600;color:#F5F5F4">Auto-start rest timer</div><div style="font-size:11px;color:#8A8A8E;margin-top:2px">Counts down after saving a set</div></div>'
        + renderSwitchHTML('toggleAutoRestBtn', profile.autoStartRestTimer !== false, 'Auto-start rest timer')
      + '</div>'
      + '<div style="display:flex;justify-content:space-between;align-items:center;padding:14px 0;border-bottom:1px solid #141416">'
        + '<div><div style="font-size:15px;font-weight:600;color:#F5F5F4">Slide animations / navigation</div><div style="font-size:11px;color:#8A8A8E;margin-top:2px">Enable swipe gestures between tabs</div></div>'
        + renderSwitchHTML('toggleSlideNavBtn', !profile.disableSlideNav, 'Slide animations / navigation')
      + '</div>'
      + '<div style="display:flex;justify-content:space-between;align-items:center;padding:14px 0;border-bottom:1px solid #141416">'
        + '<div><div style="font-size:15px;font-weight:600;color:#F5F5F4">Streak shields</div><div style="font-size:11px;color:#8A8A8E;margin-top:2px">' + shields + (shields === 1 ? ' shield' : ' shields') + ' available</div></div>'
        + '<button type="button" class="btn" id="buyShieldBtn" style="height:36px;padding:0 14px;border-radius:8px;background:#141416;color:' + (((profile.xp || 0) < 100) ? '#55555A' : '#F5F5F4') + ';font-size:15px;font-weight:600;border:1px solid #222;cursor:' + (((profile.xp || 0) < 100) ? 'not-allowed' : 'pointer') + '"' + (((profile.xp || 0) < 100) ? ' disabled' : '') + '>Buy · 100 XP</button>'
      + '</div>'
      + '<div style="display:flex;justify-content:space-between;align-items:center;padding:14px 0;border-bottom:1px solid #141416">'
        + '<div><div style="font-size:15px;font-weight:600;color:#F5F5F4">Custom foods</div><div style="font-size:11px;color:#8A8A8E;margin-top:2px">Manage custom items & staples</div></div>'
        + '<button type="button" class="btn" id="editCustomFoodsBtn" style="height:36px;padding:0 14px;border-radius:8px;background:#141416;color:#F5F5F4;font-size:15px;font-weight:600;border:1px solid #222;cursor:pointer">Manage</button>'
      + '</div>'
      + (function() {
        var lastBackupStr = 'Never', lastBackupTime = ls('rg_last_backup') || ls('tally_last_backup');
        if (lastBackupTime) {
          var diff = Math.floor((Date.now() - new Date(lastBackupTime).getTime()) / (1000 * 60 * 60 * 24));
          lastBackupStr = diff === 0 ? 'Today' : (diff + (diff === 1 ? ' day ago' : ' days ago'));
        }
        return '<div style="display:flex;justify-content:space-between;align-items:center;padding-top:14px">'
          + '<div><div style="font-size:15px;font-weight:600;color:#F5F5F4">Data backup</div><div style="font-size:11px;color:#8A8A8E;margin-top:2px">Last backup: ' + lastBackupStr + '</div></div>'
          + '<div style="display:flex;gap:8px">'
            + '<button type="button" class="btn" id="exportBtn" style="height:36px;padding:0 12px;border-radius:8px;background:#141416;color:#F5F5F4;font-size:15px;font-weight:600;border:1px solid #222;cursor:pointer">Export</button>'
            + '<button type="button" class="btn" id="importBtn" style="height:36px;padding:0 12px;border-radius:8px;background:#141416;color:#F5F5F4;font-size:15px;font-weight:600;border:1px solid #222;cursor:pointer">Import</button>'
          + '</div>'
        + '</div>';
      })()
    + '</div>'
    + buildCatchupSettingsHTML()

    // DANGER ZONE (Separated with distinct margin and clear border)
    + '<div style="margin-top:36px;padding-top:20px;border-top:1px solid var(--hairline);margin-bottom:8px">'
      + '<span style="font-size:11px;font-weight:600;color:#FF4D4F;text-transform:uppercase;letter-spacing:0.08em">Danger Zone</span>'
    + '</div>'
    + '<div style="background:#1C1C1F;border-radius:16px;padding:16px;margin-bottom:24px;display:flex;justify-content:space-between;align-items:center">'
      + '<div>'
        + '<div style="font-size:15px;font-weight:600;color:#F5F5F4">Reset all data</div>'
        + '<div style="font-size:11px;color:#8A8A8E;margin-top:2px">Irreversibly delete all workout & nutrition logs</div>'
      + '</div>'
      + '<button type="button" id="resetBtn" style="height:36px;padding:0 14px;border-radius:8px;background:#141416;border:1px solid #FF4D4F;color:#FF4D4F;font-size:15px;font-weight:600;cursor:pointer">Reset</button>'
    + '</div>'

    // BOTTOM CLOSE / DONE BUTTON
    + '<div style="margin-top:16px">'
      + '<button type="button" class="btn" id="closeSettingsBottomBtn" style="width:100%;height:48px;border-radius:12px;background:#1C1C1F;color:#F5F5F4;border:1px solid #222;font-size:15px;font-weight:600;cursor:pointer">Done</button>'
      + '<button type="button" id="saveSettingsBtn" style="display:none"></button>'
    + '</div>'
    + '</div>';

  document.body.appendChild(overlay);
  bindCatchupSettingsEvents(overlay);

  function saveTargetsOnBlur() {
    var rK = parseInt(document.getElementById('setTargetRest').value, 10);
    var gK = parseInt(document.getElementById('setTargetGym').value, 10);
    var rP = parseInt(document.getElementById('setProtRest').value, 10);
    var gP = parseInt(document.getElementById('setProtGym').value, 10);
    var tW = parseFloat(document.getElementById('setTargetWeight').value);

    if ((rK && (rK < 1000 || rK > 6000)) || (gK && (gK < 1000 || gK > 6000))) { showToast('Calories must be 1,000–6,000', 'warn'); return false; }
    if ((rP && (rP < 20 || rP > 400)) || (gP && (gP < 20 || gP > 400))) { showToast('Protein must be 20–400 g', 'warn'); return false; }
    if (tW && (tW < 30 || tW > 200)) { showToast('Weight must be 30–200 kg', 'warn'); return false; }

    if (rK) profile.calTargetRest = rK; if (gK) profile.calTargetGym = gK;
    if (rP) profile.protTargetRest = rP; if (gP) profile.protTargetGym = gP;
    if (tW) profile.targetWeight = tW;
    sv('rg_profile', profile);
    return true;
  }

  ['setTargetRest', 'setTargetGym', 'setProtRest', 'setProtGym', 'setTargetWeight'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.addEventListener('blur', function() { if (saveTargetsOnBlur()) showToast('Saved', 'ok'); });
  });

  var bindPickerRow = function(rowId, valId, selectId, title, options, profKey) {
    var row = overlay.querySelector('#' + rowId);
    if (!row) return;
    row.onclick = function() {
      openProfilePickerModal({
        title: title,
        items: options,
        currentValue: profile[profKey],
        onSelect: function(newVal) {
          profile[profKey] = newVal;
          sv('rg_profile', profile);
          var valEl = overlay.querySelector('#' + valId);
          if (valEl) valEl.textContent = getOptLabel(options, newVal);
          var selEl = document.getElementById(selectId);
          if (selEl) selEl.value = newVal;
          showToast('Saved', 'ok');
        }
      });
    };
  };

  bindPickerRow('rowPickGoal', 'valPickGoal', 'setGoal', 'Primary Goal', goalOptions, 'goal');
  bindPickerRow('rowPickEquip', 'valPickEquip', 'setEquip', 'Equipment Access', equipOptions, 'equipment');
  bindPickerRow('rowPickDiet', 'valPickDiet', 'setDiet', 'Dietary Pattern', dietOptions, 'dietaryPattern');
  bindPickerRow('rowPickExp', 'valPickExp', 'setExp', 'Experience Tier', expOptions, 'experience');

  overlay.querySelectorAll('.day-toggle').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var d = parseInt(btn.dataset.day, 10);
      if (tdays.includes(d)) {
        if (tdays.length <= 1) { showToast('You need at least 1 training day', 'warn'); return; }
        tdays = tdays.filter(function(x){ return x !== d; });
      } else {
        tdays.push(d);
        tdays.sort(function(a,b){ return (a === 0 ? 7 : a) - (b === 0 ? 7 : b); });
      }
      var isAct = tdays.includes(d);
      btn.classList.toggle('active', isAct);
      btn.style.setProperty('background', isAct ? 'rgba(200,245,60,0.14)' : 'transparent', 'important');
      btn.style.setProperty('border', isAct ? '1.5px solid var(--lime)' : '1px solid var(--hairline)', 'important');
      btn.style.setProperty('color', isAct ? 'var(--lime)' : 'var(--text-secondary)', 'important');
      btn.style.setProperty('font-weight', isAct ? '600' : '500', 'important');
      profile.trainingDays = tdays.length ? tdays : [1, 2, 4, 5, 6];
      sv('rg_profile', profile);
      showToast('Saved', 'ok');
    });
  });

  var isClosing = false;
  var closeSheetFn = function(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (e && e.stopPropagation) e.stopPropagation();
    if (isClosing) return;
    isClosing = true;
    saveTargetsOnBlur();
    overlay.style.transition = 'opacity 140ms ease-out';
    overlay.style.opacity = '0';
    var s = overlay.querySelector('.sheet');
    if (s) {
      s.style.transition = 'transform 180ms cubic-bezier(0.16, 1, 0.3, 1)';
      s.style.transform = 'translateY(100%)';
    }
    setTimeout(function() {
      overlay.remove();
      var remaining = document.getElementById('settingsOverlay');
      if (remaining && typeof remaining.remove === 'function') remaining.remove();
      if (typeof window !== 'undefined' && typeof window.renderApp === 'function') window.renderApp();
    }, 180);
  };

  var closeBtn = overlay.querySelector('#closeSettingsBtn');
  var bottomDoneBtn = overlay.querySelector('#closeSettingsBottomBtn');
  if (closeBtn) closeBtn.onclick = closeSheetFn;
  if (bottomDoneBtn) bottomDoneBtn.onclick = closeSheetFn;
  overlay.onclick = function(e){ if (e.target === overlay) closeSheetFn(e); };

  var saveBtn = overlay.querySelector('#saveSettingsBtn');
  if (saveBtn) {
    saveBtn.addEventListener('click', function() {
      if (saveTargetsOnBlur()) { showToast('Saved', 'ok'); closeSheetFn(); }
    });
  }

  var toggleHapticsBtn = overlay.querySelector('#toggleHapticsBtn');
  if (toggleHapticsBtn) {
    toggleHapticsBtn.onclick = function() {
      triggerHaptic();
      profile.hapticsMuted = !profile.hapticsMuted;
      sv('rg_profile', profile);
      updateSwitchUI(toggleHapticsBtn, !profile.hapticsMuted);
      showToast(profile.hapticsMuted ? 'Haptics muted' : 'Haptics active', 'ok');
    };
  }

  var toggleAutoRestBtn = overlay.querySelector('#toggleAutoRestBtn');
  if (toggleAutoRestBtn) {
    toggleAutoRestBtn.onclick = function() {
      triggerHaptic();
      profile.autoStartRestTimer = (profile.autoStartRestTimer === false) ? true : false;
      sv('rg_profile', profile);
      updateSwitchUI(toggleAutoRestBtn, profile.autoStartRestTimer !== false);
      showToast(profile.autoStartRestTimer ? 'Rest timer auto-start on' : 'Rest timer auto-start off', 'ok');
    };
  }

  var toggleSlideNavBtn = overlay.querySelector('#toggleSlideNavBtn');
  if (toggleSlideNavBtn) {
    toggleSlideNavBtn.onclick = function() {
      triggerHaptic();
      profile.disableSlideNav = !profile.disableSlideNav;
      sv('rg_profile', profile);
      if (typeof document !== 'undefined' && document.documentElement) {
        document.documentElement.classList.toggle('no-slide-nav', !!profile.disableSlideNav);
      }
      updateSwitchUI(toggleSlideNavBtn, !profile.disableSlideNav);
      showToast(profile.disableSlideNav ? 'Slide navigation off' : 'Slide navigation on', 'ok');
    };
  }

  overlay.querySelector('#buyShieldBtn').addEventListener('click', function() {
    if ((profile.xp || 0) >= 100) {
      profile.xp -= 100; profile.shields = (profile.shields || 0) + 1;
      sv('rg_profile', profile); overlay.remove(); openSettings();
      showToast('Streak shield purchased!', 'ok');
    }
  });

  bindResetAction(overlay, resetAllData, showToast);

  var openPlanBtn = overlay.querySelector('#openPlanFromSettingsBtn');
  if (openPlanBtn) {
    openPlanBtn.addEventListener('click', function() { overlay.remove(); openSplitManagerSheet(); });
  }

  var editFoodsBtn = overlay.querySelector('#editCustomFoodsBtn');
  if (editFoodsBtn) {
    editFoodsBtn.addEventListener('click', function() { overlay.remove(); openCustomFoodsManager(); });
  }

  var expBtn = overlay.querySelector('#exportBtn');
  if (expBtn) expBtn.addEventListener('click', exportData);
  var impBtn = overlay.querySelector('#importBtn');
  if (impBtn) impBtn.addEventListener('click', importData);
}

export * from "./onboarding.js";
