/* Settings screen: targets, training days, plan picker, profile, and onboarding modal */

import { profile, setProfile, setTab, setTheme } from "../state.js";
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
import { getCatchupSettings } from "../storage-catchup.js";

export function openSettings() {
  if (document.getElementById('settingsOverlay')) return;
  var weekDaysMeta = [
    { js: 1, letter: 'M', name: 'Mon', fullName: 'Monday' },
    { js: 2, letter: 'T', name: 'Tue', fullName: 'Tuesday' },
    { js: 3, letter: 'W', name: 'Wed', fullName: 'Wednesday' },
    { js: 4, letter: 'T', name: 'Thu', fullName: 'Thursday' },
    { js: 5, letter: 'F', name: 'Fri', fullName: 'Friday' },
    { js: 6, letter: 'S', name: 'Sat', fullName: 'Saturday' },
    { js: 0, letter: 'S', name: 'Sun', fullName: 'Sunday' }
  ];
  var tdays = (profile.trainingDays || [1, 2, 4, 5, 6]).slice();
  var chevronSVG = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>';
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

  var formatTrainingSubtitle = function(days) {
    var count = days.length;
    var dayOrder = [1, 2, 3, 4, 5, 6, 0];
    var sorted = dayOrder.filter(function(d){ return days.includes(d); });
    var names = sorted.map(function(d){
      var m = weekDaysMeta.find(function(x){ return x.js === d; });
      return m ? m.name : '';
    }).filter(Boolean).join(', ');
    return count + (count === 1 ? ' day a week · ' : ' days a week · ') + names;
  };

  var dayTogglesHTML = weekDaysMeta.map(function(d) {
    var active = tdays.includes(d.js);
    return '<button type="button" class="day-toggle settings-day-toggle' + (active ? ' active' : '') + '" data-day="' + d.js + '" aria-label="' + esc(d.fullName) + '" aria-pressed="' + (active ? 'true' : 'false') + '">' + d.letter + '</button>';
  }).join('');

  overlay.innerHTML = '<div class="sheet" style="background:var(--surface);border:none;border-radius:20px 20px 0 0;padding:20px 20px calc(24px + var(--safe-b));max-width:480px;width:100%;max-height:88vh;overflow-y:auto">'
    + '<div class="sheet-handle"></div>'
    + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">'
      + '<div style="font-size:28px;font-weight:600;color:var(--text);line-height:1.15">Settings</div>'
      + '<button type="button" class="btn-text-action" id="closeSettingsBtn" style="font-size:15px;color:var(--text-secondary);background:none;border:none;padding:8px 0;cursor:pointer;min-height:48px;min-width:48px;display:inline-flex;align-items:center;justify-content:flex-end">Close</button>'
    + '</div>'

    // TARGETS (iOS Grouped List Card)
    + '<div style="margin-top:20px;margin-bottom:8px"><span style="font-size:11px;font-weight:600;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.08em">Targets</span></div>'
    + '<div class="metric-card" style="background:var(--surface2);border-radius:16px;border:1px solid var(--hairline);overflow:hidden;padding:0 16px;margin-bottom:24px">'
      + '<div style="display:flex;align-items:center;justify-content:space-between;min-height:50px;border-bottom:1px solid var(--hairline)">'
        + '<span style="font-size:15px;color:var(--text);font-weight:500">Rest Day Calories</span>'
        + '<div class="field-num" style="background:transparent;border:none;box-shadow:none;height:48px;padding:0;display:inline-flex;align-items:center;justify-content:flex-end" onclick="var i=this.querySelector(\'input\');if(i)i.focus();">'
          + '<input type="number" id="setTargetRest" value="' + restKcal + '" inputmode="numeric" style="background:transparent;border:none;outline:none;text-align:right;font-size:17px;font-weight:600;color:var(--text);width:70px">'
          + '<span class="field-unit" style="font-size:12px;color:var(--text-secondary);margin-left:4px">kcal</span>'
        + '</div>'
      + '</div>'
      + '<div style="display:flex;align-items:center;justify-content:space-between;min-height:50px;border-bottom:1px solid var(--hairline)">'
        + '<span style="font-size:15px;color:var(--text);font-weight:500">Gym Day Calories</span>'
        + '<div class="field-num" style="background:transparent;border:none;box-shadow:none;height:48px;padding:0;display:inline-flex;align-items:center;justify-content:flex-end" onclick="var i=this.querySelector(\'input\');if(i)i.focus();">'
          + '<input type="number" id="setTargetGym" value="' + gymKcal + '" inputmode="numeric" style="background:transparent;border:none;outline:none;text-align:right;font-size:17px;font-weight:600;color:var(--text);width:70px">'
          + '<span class="field-unit" style="font-size:12px;color:var(--text-secondary);margin-left:4px">kcal</span>'
        + '</div>'
      + '</div>'
      + '<div style="display:flex;align-items:center;justify-content:space-between;min-height:50px;border-bottom:1px solid var(--hairline)">'
        + '<span style="font-size:15px;color:var(--text);font-weight:500">Rest Day Protein</span>'
        + '<div class="field-num" style="background:transparent;border:none;box-shadow:none;height:48px;padding:0;display:inline-flex;align-items:center;justify-content:flex-end" onclick="var i=this.querySelector(\'input\');if(i)i.focus();">'
          + '<input type="number" id="setProtRest" value="' + restProt + '" inputmode="numeric" style="background:transparent;border:none;outline:none;text-align:right;font-size:17px;font-weight:600;color:var(--text);width:54px">'
          + '<span class="field-unit" style="font-size:12px;color:var(--text-secondary);margin-left:4px">g</span>'
        + '</div>'
      + '</div>'
      + '<div style="display:flex;align-items:center;justify-content:space-between;min-height:50px;border-bottom:1px solid var(--hairline)">'
        + '<span style="font-size:15px;color:var(--text);font-weight:500">Gym Day Protein</span>'
        + '<div class="field-num" style="background:transparent;border:none;box-shadow:none;height:48px;padding:0;display:inline-flex;align-items:center;justify-content:flex-end" onclick="var i=this.querySelector(\'input\');if(i)i.focus();">'
          + '<input type="number" id="setProtGym" value="' + gymProt + '" inputmode="numeric" style="background:transparent;border:none;outline:none;text-align:right;font-size:17px;font-weight:600;color:var(--text);width:54px">'
          + '<span class="field-unit" style="font-size:12px;color:var(--text-secondary);margin-left:4px">g</span>'
        + '</div>'
      + '</div>'
      + '<div style="display:flex;align-items:center;justify-content:space-between;min-height:50px">'
        + '<span style="font-size:15px;color:var(--text);font-weight:500">Goal Weight</span>'
        + '<div class="field-num" style="background:transparent;border:none;box-shadow:none;height:48px;padding:0;display:inline-flex;align-items:center;justify-content:flex-end" onclick="var i=this.querySelector(\'input\');if(i)i.focus();">'
          + '<input type="number" step="0.1" id="setTargetWeight" value="' + targetWeight + '" inputmode="decimal" style="background:transparent;border:none;outline:none;text-align:right;font-size:17px;font-weight:600;color:var(--text);width:60px">'
          + '<span class="field-unit" style="font-size:12px;color:var(--text-secondary);margin-left:4px">kg</span>'
        + '</div>'
      + '</div>'
    + '</div>'

    // TRAINING DAYS
    + '<div style="margin-top:24px;margin-bottom:8px"><span style="font-size:11px;font-weight:600;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.08em">Training days</span></div>'
    + '<div style="background:var(--surface2);border-radius:16px;padding:16px;margin-bottom:24px;border:1px solid var(--hairline)">'
      + '<div style="font-size:15px;font-weight:600;color:var(--text);margin-bottom:2px">Days you train</div>'
      + '<div id="trainingDaysSubtitle" style="font-size:11px;color:var(--text-secondary);margin-bottom:14px">' + esc(formatTrainingSubtitle(tdays)) + '</div>'
      + '<div class="settings-day-toggles">' + dayTogglesHTML + '</div>'
    + '</div>'

    // PROFILE (Rows with chevron right, opening bottom-sheet picker)
    + '<div style="margin-top:24px;margin-bottom:8px"><span style="font-size:11px;font-weight:600;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.08em">Profile</span></div>'
    + '<div style="background:var(--surface2);border-radius:16px;padding:4px 16px;margin-bottom:24px;border:1px solid var(--hairline)">'
      + (function() {
        var r = function(rowId, valId, title, valText) {
          return '<div id="' + rowId + '" class="settings-profile-row">'
            + '<div class="settings-profile-info"><div class="settings-profile-title">' + title + '</div><div class="settings-profile-value" id="' + valId + '">' + esc(valText) + '</div></div>'
            + '<div class="settings-profile-chevron">' + chevronSVG + '</div>'
          + '</div>';
        };
        return r('rowPickGoal', 'valPickGoal', 'Primary Goal', getOptLabel(goalOptions, goalVal))
          + r('rowPickEquip', 'valPickEquip', 'Equipment Access', getOptLabel(equipOptions, equipVal))
          + r('rowPickDiet', 'valPickDiet', 'Dietary Pattern', getOptLabel(dietOptions, dietVal))
          + r('rowPickExp', 'valPickExp', 'Experience Tier', getOptLabel(expOptions, expVal));
      })()
      + '<select id="setGoal" style="display:none">' + goalOptions.map(function(o){ return '<option value="' + o.value + '"' + (goalVal === o.value ? ' selected' : '') + '>' + o.label + '</option>'; }).join('') + '</select>'
      + '<select id="setEquip" style="display:none">' + equipOptions.map(function(o){ return '<option value="' + o.value + '"' + (equipVal === o.value ? ' selected' : '') + '>' + o.label + '</option>'; }).join('') + '</select>'
      + '<select id="setDiet" style="display:none">' + dietOptions.map(function(o){ return '<option value="' + o.value + '"' + (dietVal === o.value ? ' selected' : '') + '>' + o.label + '</option>'; }).join('') + '</select>'
      + '<select id="setExp" style="display:none">' + expOptions.map(function(o){ return '<option value="' + o.value + '"' + (expVal === o.value ? ' selected' : '') + '>' + o.label + '</option>'; }).join('') + '</select>'
    + '</div>'

    // PLAN
    + '<div style="margin-top:24px;margin-bottom:8px"><span style="font-size:11px;font-weight:600;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.08em">Plan</span></div>'
    + '<div style="background:var(--surface2);border-radius:16px;padding:16px;margin-bottom:24px;border:1px solid var(--hairline);display:flex;justify-content:space-between;align-items:center">'
      + '<div>'
        + '<div style="font-size:15px;font-weight:600;color:var(--text)">Routine & Split</div>'
        + '<div style="font-size:11px;color:var(--text-secondary);margin-top:2px">Custom 5-day split & exercise catalog</div>'
      + '</div>'
      + '<button type="button" class="btn" id="openPlanFromSettingsBtn" style="white-space:nowrap;height:36px;padding:0 14px;border-radius:8px;background:var(--surface);color:var(--text);font-size:15px;font-weight:600;border:1px solid var(--hairline);cursor:pointer">Edit plan</button>'
    + '</div>'

    // APPEARANCE (Theme Mode)
    + '<div style="margin-top:24px;margin-bottom:8px"><span style="font-size:11px;font-weight:600;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.08em">Appearance</span></div>'
    + '<div style="background:var(--surface2);border-radius:16px;padding:14px 16px;margin-bottom:24px;border:1px solid var(--hairline);display:flex;justify-content:space-between;align-items:center">'
      + '<div><div style="font-size:15px;font-weight:600;color:var(--text)">Theme</div><div style="font-size:11px;color:var(--text-secondary);margin-top:2px">Dark & light mode</div></div>'
      + '<div style="display:inline-flex;background:var(--surface);border:1px solid var(--hairline);border-radius:10px;padding:3px;gap:4px">'
        + '<button type="button" id="themeDarkBtn" style="border:none;border-radius:7px;padding:6px 12px;font-size:12px;font-weight:600;cursor:pointer;' + (profile.theme !== 'light' ? 'background:var(--accent-primary);color:var(--bg);' : 'background:transparent;color:var(--text-secondary);') + '">Dark</button>'
        + '<button type="button" id="themeLightBtn" style="border:none;border-radius:7px;padding:6px 12px;font-size:12px;font-weight:600;cursor:pointer;' + (profile.theme === 'light' ? 'background:var(--accent-primary);color:var(--bg);' : 'background:transparent;color:var(--text-secondary);') + '">Light</button>'
      + '</div>'
    + '</div>'

    // ADVANCED (Unified Card with native switch toggles)
    + '<div style="margin-top:24px;margin-bottom:8px"><span style="font-size:11px;font-weight:600;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.08em">Advanced</span></div>'
    + '<div style="background:var(--surface2);border-radius:16px;padding:16px;margin-bottom:24px;border:1px solid var(--hairline)">'
      + '<div style="display:flex;justify-content:space-between;align-items:center;padding-bottom:14px;border-bottom:1px solid var(--hairline)">'
        + '<div><div style="font-size:15px;font-weight:600;color:var(--text)">Haptic feedback</div><div style="font-size:11px;color:var(--text-secondary);margin-top:2px">Vibrate on taps and logged sets</div></div>'
        + renderSwitchHTML('toggleHapticsBtn', profile.hapticsEnabled !== false && !profile.hapticsMuted, 'Haptic feedback')
      + '</div>'
      + '<div style="display:flex;justify-content:space-between;align-items:center;padding:14px 0;border-bottom:1px solid var(--hairline)">'
        + '<div><div style="font-size:15px;font-weight:600;color:var(--text)">Auto-start rest timer</div><div style="font-size:11px;color:var(--text-secondary);margin-top:2px">Counts down after saving a set</div></div>'
        + renderSwitchHTML('toggleAutoRestBtn', profile.autoStartRestTimer !== false, 'Auto-start rest timer')
      + '</div>'
      + '<div style="display:flex;justify-content:space-between;align-items:center;padding:14px 0;border-bottom:1px solid var(--hairline)">'
        + '<div><div style="font-size:15px;font-weight:600;color:var(--text)">Swipe navigation system</div><div style="font-size:11px;color:var(--text-secondary);margin-top:2px">Swipe between Body, Lifts and History</div></div>'
        + renderSwitchHTML('toggleSwipeNavBtn', !(profile.disableSwipeNav || profile.disableSlideNav), 'Swipe navigation system')
      + '</div>'
      + '<div style="display:flex;justify-content:space-between;align-items:center;padding:14px 0;border-bottom:1px solid var(--hairline)">'
        + '<div><div style="font-size:15px;font-weight:600;color:var(--text)">Streak shields</div><div style="font-size:11px;color:var(--text-secondary);margin-top:2px">' + shields + (shields === 1 ? ' shield' : ' shields') + ' available</div></div>'
        + '<button type="button" class="btn" id="buyShieldBtn" style="height:36px;padding:0 14px;border-radius:8px;background:var(--surface);color:' + (((profile.xp || 0) < 100) ? 'var(--text-secondary)' : 'var(--text)') + ';font-size:15px;font-weight:600;border:1px solid var(--hairline);cursor:' + (((profile.xp || 0) < 100) ? 'not-allowed' : 'pointer') + '"' + (((profile.xp || 0) < 100) ? ' disabled' : '') + '>Buy · 100 XP</button>'
      + '</div>'
      + '<div style="display:flex;justify-content:space-between;align-items:center;padding:14px 0;border-bottom:1px solid var(--hairline)">'
        + '<div><div style="font-size:15px;font-weight:600;color:var(--text)">Custom foods</div><div style="font-size:11px;color:var(--text-secondary);margin-top:2px">Manage custom items & staples</div></div>'
        + '<button type="button" class="btn" id="editCustomFoodsBtn" style="height:36px;padding:0 14px;border-radius:8px;background:var(--surface);color:var(--text);font-size:15px;font-weight:600;border:1px solid var(--hairline);cursor:pointer">Manage</button>'
      + '</div>'
      + (function() {
        var lastBackupStr = 'Never', lastBackupTime = ls('rg_last_backup') || ls('tally_last_backup');
        if (lastBackupTime) {
          var diff = Math.floor((Date.now() - new Date(lastBackupTime).getTime()) / (1000 * 60 * 60 * 24));
          lastBackupStr = diff === 0 ? 'Today' : (diff + (diff === 1 ? ' day ago' : ' days ago'));
        }
        return '<div style="display:flex;justify-content:space-between;align-items:center;padding-top:14px">'
          + '<div><div style="font-size:15px;font-weight:600;color:var(--text)">Data backup</div><div style="font-size:11px;color:var(--text-secondary);margin-top:2px">Last backup: ' + lastBackupStr + '</div></div>'
          + '<div style="display:flex;gap:8px">'
            + '<button type="button" class="btn" id="exportBtn" style="height:36px;padding:0 12px;border-radius:8px;background:var(--surface);color:var(--text);font-size:15px;font-weight:600;border:1px solid var(--hairline);cursor:pointer">Export</button>'
            + '<button type="button" class="btn" id="importBtn" style="height:36px;padding:0 12px;border-radius:8px;background:var(--surface);color:var(--text);font-size:15px;font-weight:600;border:1px solid var(--hairline);cursor:pointer">Import</button>'
          + '</div>'
        + '</div>';
      })()
    + '</div>'
    + buildCatchupSettingsHTML()

    // DANGER ZONE (Separated with distinct margin and clear border)
    + '<div style="margin-top:36px;padding-top:20px;border-top:1px solid var(--hairline);margin-bottom:8px">'
      + '<span style="font-size:11px;font-weight:600;color:#FF4D4F;text-transform:uppercase;letter-spacing:0.08em">Danger Zone</span>'
    + '</div>'
    + '<div style="background:var(--surface2);border-radius:16px;padding:16px;margin-bottom:24px;border:1px solid var(--hairline);display:flex;justify-content:space-between;align-items:center;gap:16px">'
      + '<div style="flex:1;min-width:0;margin-right:16px">'
        + '<div style="font-size:15px;font-weight:600;color:var(--text)">Reset all data</div>'
        + '<div style="font-size:11px;color:var(--text-secondary);margin-top:2px;line-height:1.4">Irreversibly delete all workout & nutrition logs</div>'
      + '</div>'
      + '<button type="button" id="resetBtn" style="white-space:nowrap;flex-shrink:0;height:36px;padding:0 14px;border-radius:8px;background:var(--surface);border:1px solid #FF4D4F;color:#FF4D4F;font-size:15px;font-weight:600;cursor:pointer">Reset</button>'
    + '</div>'

    // BOTTOM CLOSE / DONE BUTTON
    + '<div style="margin-top:16px">'
      + '<button type="button" class="btn" id="closeSettingsBottomBtn" style="width:100%;height:48px;border-radius:12px;background:var(--surface2);color:var(--text);border:1px solid var(--hairline);font-size:15px;font-weight:600;cursor:pointer">Done</button>'
      + '<button type="button" id="saveSettingsBtn" style="display:none"></button>'
    + '</div>'
    + '<div style="text-align:center;padding:24px 0 8px;font-size:11px;font-weight:600;color:var(--text-secondary);letter-spacing:0.06em">'
      + 'Regain · v2.0.0'
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
      triggerHaptic('selection');
      var d = parseInt(btn.dataset.day, 10);
      var catchupSettings = getCatchupSettings();
      if (tdays.includes(d)) {
        if (tdays.length <= 1) {
          showToast('You need at least 1 training day', 'warn');
          return;
        }
        tdays = tdays.filter(function(x){ return x !== d; });
      } else {
        if (catchupSettings.protectLastRestDay && tdays.length >= 6) {
          showToast('Keep at least 1 rest day for recovery', 'warn');
          return;
        }
        tdays.push(d);
        tdays.sort(function(a,b){ return (a === 0 ? 7 : a) - (b === 0 ? 7 : b); });
      }
      var isAct = tdays.includes(d);
      btn.classList.toggle('active', isAct);
      btn.setAttribute('aria-pressed', isAct ? 'true' : 'false');
      var sub = overlay.querySelector('#trainingDaysSubtitle');
      if (sub) sub.textContent = formatTrainingSubtitle(tdays);
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
    overlay.style.transition = 'opacity 200ms cubic-bezier(0.2, 0, 0, 1)';
    overlay.style.opacity = '0';
    var s = overlay.querySelector('.sheet');
    if (s) {
      s.style.transition = 'transform 200ms cubic-bezier(0.2, 0, 0, 1)';
      s.style.transform = 'translateY(100%)';
    }
    setTimeout(function() {
      overlay.remove();
      var remaining = document.getElementById('settingsOverlay');
      if (remaining && typeof remaining.remove === 'function') remaining.remove();
      if (typeof window !== 'undefined' && typeof window.renderApp === 'function') window.renderApp();
    }, 200);
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

  var themeDarkBtn = overlay.querySelector('#themeDarkBtn'), themeLightBtn = overlay.querySelector('#themeLightBtn');
  if (themeDarkBtn && themeLightBtn) {
    themeDarkBtn.onclick = function() { setTheme('dark'); overlay.remove(); openSettings(); };
    themeLightBtn.onclick = function() { setTheme('light'); overlay.remove(); openSettings(); };
  }

  var toggleHapticsBtn = overlay.querySelector('#toggleHapticsBtn');
  if (toggleHapticsBtn) {
    toggleHapticsBtn.onclick = function() {
      triggerHaptic('selection');
      var nextVal = !(profile.hapticsEnabled !== false && !profile.hapticsMuted);
      profile.hapticsEnabled = nextVal; profile.hapticsMuted = !nextVal; sv('rg_profile', profile);
      updateSwitchUI(toggleHapticsBtn, nextVal); showToast(nextVal ? 'Haptics active' : 'Haptics muted', 'ok');
    };
  }

  var toggleAutoRestBtn = overlay.querySelector('#toggleAutoRestBtn');
  if (toggleAutoRestBtn) {
    toggleAutoRestBtn.onclick = function() {
      triggerHaptic('selection'); profile.autoStartRestTimer = (profile.autoStartRestTimer === false); sv('rg_profile', profile);
      updateSwitchUI(toggleAutoRestBtn, profile.autoStartRestTimer !== false); showToast(profile.autoStartRestTimer ? 'Rest timer auto-start on' : 'Rest timer auto-start off', 'ok');
    };
  }

  var toggleSwipeNavBtn = overlay.querySelector('#toggleSwipeNavBtn') || overlay.querySelector('#toggleSlideNavBtn');
  if (toggleSwipeNavBtn) {
    toggleSwipeNavBtn.onclick = function() {
      triggerHaptic('selection'); var isOff = !(profile.disableSwipeNav || profile.disableSlideNav);
      profile.disableSwipeNav = isOff; profile.disableSlideNav = isOff; sv('rg_profile', profile);
      if (typeof document !== 'undefined' && document.documentElement) document.documentElement.classList.toggle('no-slide-nav', isOff);
      updateSwitchUI(toggleSwipeNavBtn, !isOff); showToast(isOff ? 'Swipe navigation turned off' : 'Swipe navigation turned on', 'ok');
    };
  }

  overlay.querySelector('#buyShieldBtn').addEventListener('click', function() {
    if ((profile.xp || 0) >= 100) {
      profile.xp -= 100; profile.shields = (profile.shields || 0) + 1; sv('rg_profile', profile); overlay.remove(); openSettings(); showToast('Streak shield purchased!', 'ok');
    }
  });

  bindResetAction(overlay, resetAllData, showToast);
  var openPlanBtn = overlay.querySelector('#openPlanFromSettingsBtn'); if (openPlanBtn) openPlanBtn.onclick = function() { overlay.remove(); openSplitManagerSheet(); };
  var editFoodsBtn = overlay.querySelector('#editCustomFoodsBtn'); if (editFoodsBtn) editFoodsBtn.onclick = function() { overlay.remove(); openCustomFoodsManager(); };
  var expBtn = overlay.querySelector('#exportBtn'); if (expBtn) expBtn.onclick = exportData;
  var impBtn = overlay.querySelector('#importBtn'); if (impBtn) impBtn.onclick = importData;
}

export * from "./onboarding.js";
