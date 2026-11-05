/* Settings screen: targets, training days, plan picker, profile, and onboarding modal */

import { profile, setProfile, setTab } from "../state.js";
import { sv, dayRecord, saveDayRecord, exportData, importData } from "../storage.js";
import { DEFAULT_MEAL_PLAN } from "../data/foods.js";
import { renderApp } from "../main.js";
import { CAL_TARGET_REST, CAL_TARGET_GYM, PROT_TARGET_REST, PROT_TARGET_GYM, PROGRAM_2DAY, PROGRAM_3DAY, PROGRAM_4DAY, PROGRAM_5DAY, PROGRAM_6DAY, DEFAULT_5DAY_ROUTINE } from "../data/plan.js";
import { showToast } from "../components/toast.js";
import { openSplitManagerSheet } from "./gym/plan-editor.js";
import { openCustomFoodsManager } from "./today/food-modal.js";
import { todayKey, esc, currentWeight } from "../lib/format.js";

export function openSettings() {
  var weekDaysMeta = [
    { js: 1, name: 'Mon' },
    { js: 2, name: 'Tue' },
    { js: 3, name: 'Wed' },
    { js: 4, name: 'Thu' },
    { js: 5, name: 'Fri' },
    { js: 6, name: 'Sat' },
    { js: 0, name: 'Sun' }
  ];
  var tdays = (profile.trainingDays || [1, 2, 4, 5, 6]).slice();
  var overlay = document.createElement('div'); overlay.className = 'overlay';
  var equipVal = profile.equipment || 'full';
  var dietVal = profile.dietaryPattern || 'nonveg';
  var goalVal = profile.goal || 'gain';
  var expVal = profile.experience || 'novice';
  var shields = profile.shields || 0;

  var restKcal = profile.calTargetRest || CAL_TARGET_REST;
  var gymKcal = profile.calTargetGym || CAL_TARGET_GYM;
  var restProt = profile.protTargetRest || PROT_TARGET_REST;
  var gymProt = profile.protTargetGym || PROT_TARGET_GYM;
  var targetWeight = profile.targetWeight || 60.0;

  var chevronSVG = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8A8A8E" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="position:absolute;right:12px;pointer-events:none"><path d="M6 9l6 6 6-6"/></svg>';

  var dayTogglesHTML = weekDaysMeta.map(function(d) {
    var active = tdays.includes(d.js);
    var actStyle = active
      ? 'background:#C6F432 !important;border:1px solid #C6F432 !important;color:#0B0B0C !important;font-weight:600 !important;'
      : 'background:#1C1C1F !important;border:1px solid #222 !important;color:#8A8A8E !important;font-weight:500 !important;';
    return '<button type="button" class="day-toggle settings-day-toggle' + (active ? ' active' : '') + '" data-day="' + d.js + '" style="' + actStyle + 'height:44px;min-width:0;width:100%;border-radius:8px;font-size:15px;cursor:pointer;padding:0;display:flex;align-items:center;justify-content:center;box-sizing:border-box">' + d.name + '</button>';
  }).join('');

  overlay.innerHTML = '<div class="sheet" style="background:#141416;border:none;border-radius:20px 20px 0 0;padding:20px 20px calc(24px + var(--safe-b));max-width:480px;width:100%;max-height:88vh;overflow-y:auto">'
    + '<div class="sheet-handle"></div>'
    + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">'
      + '<div style="font-size:28px;font-weight:600;color:#F5F5F4;line-height:1.15">Settings</div>'
      + '<button type="button" class="btn-text-action" id="closeSettingsBtn" style="font-size:15px;color:#8A8A8E;background:none;border:none;padding:0;cursor:pointer">Close</button>'
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
        + '<div style="height:44px;background:#141416;border:1px solid #222;border-radius:8px;display:flex;align-items:center;justify-content:center;gap:4px;cursor:text" onclick="var i=this.querySelector(\'input\');if(i)i.focus();">'
          + '<input type="number" id="setTargetRest" value="' + restKcal + '" inputmode="numeric" style="background:transparent;border:none;font-size:17px;font-weight:600;color:#F5F5F4;font-variant-numeric:tabular-nums;text-align:center;width:68px;padding:0;outline:none">'
          + '<span style="font-size:11px;color:#8A8A8E;pointer-events:none">kcal</span>'
        + '</div>'
        + '<div style="height:44px;background:#141416;border:1px solid #222;border-radius:8px;display:flex;align-items:center;justify-content:center;gap:4px;cursor:text" onclick="var i=this.querySelector(\'input\');if(i)i.focus();">'
          + '<input type="number" id="setTargetGym" value="' + gymKcal + '" inputmode="numeric" style="background:transparent;border:none;font-size:17px;font-weight:600;color:#F5F5F4;font-variant-numeric:tabular-nums;text-align:center;width:68px;padding:0;outline:none">'
          + '<span style="font-size:11px;color:#8A8A8E;pointer-events:none">kcal</span>'
        + '</div>'
      + '</div>'
      + '<div style="font-size:11px;font-weight:600;color:#8A8A8E;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px">Protein</div>'
      + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">'
        + '<div style="height:44px;background:#141416;border:1px solid #222;border-radius:8px;display:flex;align-items:center;justify-content:center;gap:4px;cursor:text" onclick="var i=this.querySelector(\'input\');if(i)i.focus();">'
          + '<input type="number" id="setProtRest" value="' + restProt + '" inputmode="numeric" style="background:transparent;border:none;font-size:17px;font-weight:600;color:#F5F5F4;font-variant-numeric:tabular-nums;text-align:center;width:48px;padding:0;outline:none">'
          + '<span style="font-size:11px;color:#8A8A8E;pointer-events:none">g</span>'
        + '</div>'
        + '<div style="height:44px;background:#141416;border:1px solid #222;border-radius:8px;display:flex;align-items:center;justify-content:center;gap:4px;cursor:text" onclick="var i=this.querySelector(\'input\');if(i)i.focus();">'
          + '<input type="number" id="setProtGym" value="' + gymProt + '" inputmode="numeric" style="background:transparent;border:none;font-size:17px;font-weight:600;color:#F5F5F4;font-variant-numeric:tabular-nums;text-align:center;width:48px;padding:0;outline:none">'
          + '<span style="font-size:11px;color:#8A8A8E;pointer-events:none">g</span>'
        + '</div>'
      + '</div>'
      + '<div style="border-top:1px solid #222;padding-top:14px;display:grid;grid-template-columns:1fr 1fr;gap:12px;align-items:center">'
        + '<div style="font-size:15px;color:#F5F5F4;font-weight:500">Goal Weight</div>'
        + '<div style="height:44px;background:#141416;border:1px solid #222;border-radius:8px;display:flex;align-items:center;justify-content:center;gap:4px;cursor:text" onclick="var i=this.querySelector(\'input\');if(i)i.focus();">'
          + '<input type="number" step="0.1" id="setTargetWeight" value="' + targetWeight + '" inputmode="decimal" style="background:transparent;border:none;font-size:17px;font-weight:600;color:#F5F5F4;font-variant-numeric:tabular-nums;text-align:center;width:56px;padding:0;outline:none">'
          + '<span style="font-size:11px;color:#8A8A8E;pointer-events:none">kg</span>'
        + '</div>'
      + '</div>'
    + '</div>'

    // TRAINING DAYS
    + '<div style="margin-top:32px;margin-bottom:8px"><span style="font-size:11px;font-weight:600;color:#8A8A8E;text-transform:uppercase;letter-spacing:0.08em">Training days</span></div>'
    + '<div class="day-toggles" style="display:grid;grid-template-columns:repeat(7, 1fr);gap:6px;width:100%;margin-bottom:24px">' + dayTogglesHTML + '</div>'

    // PROFILE (Selects with chevron icon & same height)
    + '<div style="margin-top:32px;margin-bottom:8px"><span style="font-size:11px;font-weight:600;color:#8A8A8E;text-transform:uppercase;letter-spacing:0.08em">Profile</span></div>'
    + '<div style="margin-bottom:24px">'
      + '<label style="display:block;font-size:11px;font-weight:600;color:#8A8A8E;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px">Primary Goal</label>'
      + '<div style="position:relative;display:flex;align-items:center;width:100%">'
        + '<select id="setGoal" class="precision-select" style="width:100%;height:44px;background:#1C1C1F;color:#F5F5F4;border:1px solid #222;border-radius:8px;padding:0 36px 0 12px;font-size:15px;appearance:none;-webkit-appearance:none;cursor:pointer">'
          + '<option value="gain"' + (goalVal === 'gain' ? ' selected' : '') + '>Build muscle</option>'
          + '<option value="loss"' + (goalVal === 'loss' ? ' selected' : '') + '>Lose fat</option>'
          + '<option value="recomp"' + (goalVal === 'recomp' ? ' selected' : '') + '>Recomp</option>'
          + '<option value="strength"' + (goalVal === 'strength' ? ' selected' : '') + '>Strength</option>'
        + '</select>'
        + chevronSVG
      + '</div>'
    + '</div>'
    + '<div style="margin-bottom:24px">'
      + '<label style="display:block;font-size:11px;font-weight:600;color:#8A8A8E;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px">Equipment Access</label>'
      + '<div style="position:relative;display:flex;align-items:center;width:100%">'
        + '<select id="setEquip" class="precision-select" style="width:100%;height:44px;background:#1C1C1F;color:#F5F5F4;border:1px solid #222;border-radius:8px;padding:0 36px 0 12px;font-size:15px;appearance:none;-webkit-appearance:none;cursor:pointer">'
          + '<option value="full"' + (equipVal === 'full' ? ' selected' : '') + '>Full Gym</option>'
          + '<option value="home"' + (equipVal === 'home' ? ' selected' : '') + '>Home Gym</option>'
          + '<option value="db"' + (equipVal === 'db' ? ' selected' : '') + '>Dumbbells Only</option>'
          + '<option value="body"' + (equipVal === 'body' ? ' selected' : '') + '>Bodyweight</option>'
        + '</select>'
        + chevronSVG
      + '</div>'
    + '</div>'
    + '<div style="margin-bottom:24px">'
      + '<label style="display:block;font-size:11px;font-weight:600;color:#8A8A8E;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px">Dietary Pattern</label>'
      + '<div style="position:relative;display:flex;align-items:center;width:100%">'
        + '<select id="setDiet" class="precision-select" style="width:100%;height:44px;background:#1C1C1F;color:#F5F5F4;border:1px solid #222;border-radius:8px;padding:0 36px 0 12px;font-size:15px;appearance:none;-webkit-appearance:none;cursor:pointer">'
          + '<option value="nonveg"' + (dietVal === 'nonveg' ? ' selected' : '') + '>Non-Vegetarian</option>'
          + '<option value="eggitarian"' + (dietVal === 'eggitarian' ? ' selected' : '') + '>Eggitarian</option>'
          + '<option value="veg"' + (dietVal === 'veg' ? ' selected' : '') + '>Vegetarian</option>'
          + '<option value="vegan"' + (dietVal === 'vegan' ? ' selected' : '') + '>Vegan</option>'
        + '</select>'
        + chevronSVG
      + '</div>'
    + '</div>'
    + '<div style="margin-bottom:24px">'
      + '<label style="display:block;font-size:11px;font-weight:600;color:#8A8A8E;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px">Experience tier</label>'
      + '<div style="position:relative;display:flex;align-items:center;width:100%">'
        + '<select id="setExp" class="precision-select" style="width:100%;height:44px;background:#1C1C1F;color:#F5F5F4;border:1px solid #222;border-radius:8px;padding:0 36px 0 12px;font-size:15px;appearance:none;-webkit-appearance:none;cursor:pointer">'
          + '<option value="novice"' + (expVal === 'novice' ? ' selected' : '') + '>Novice / Intermediate</option>'
          + '<option value="advanced"' + (expVal === 'advanced' ? ' selected' : '') + '>Advanced</option>'
        + '</select>'
        + chevronSVG
      + '</div>'
    + '</div>'

    // PLAN
    + '<div style="margin-top:32px;margin-bottom:8px"><span style="font-size:11px;font-weight:600;color:#8A8A8E;text-transform:uppercase;letter-spacing:0.08em">Plan</span></div>'
    + '<div class="list-row" style="display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid #222">'
      + '<div>'
        + '<div style="font-size:15px;font-weight:500;color:#F5F5F4">Workout Plan</div>'
        + '<div style="font-size:11px;color:#8A8A8E;margin-top:2px">Custom split & exercises</div>'
      + '</div>'
      + '<button type="button" class="btn" id="openPlanFromSettingsBtn" style="height:36px;padding:0 14px;border-radius:8px;background:#1C1C1F;color:#F5F5F4;font-size:15px;font-weight:600;border:1px solid #222;cursor:pointer">Edit plan</button>'
    + '</div>'

    // ADVANCED (Unified List-Rows with 36px action buttons)
    + '<div style="margin-top:32px;margin-bottom:8px"><span style="font-size:11px;font-weight:600;color:#8A8A8E;text-transform:uppercase;letter-spacing:0.08em">Advanced</span></div>'
    + '<div class="list-row" style="display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid #222">'
      + '<div>'
        + '<div style="font-size:15px;font-weight:500;color:#F5F5F4">' + shields + (shields === 1 ? ' shield' : ' shields') + '</div>'
        + '<div style="font-size:11px;color:#8A8A8E;margin-top:2px">Protects your streak if you miss a day</div>'
      + '</div>'
      + '<button type="button" class="btn" id="buyShieldBtn" style="height:36px;padding:0 14px;border-radius:8px;background:#1C1C1F;color:' + (((profile.xp || 0) < 100) ? '#55555A' : '#F5F5F4') + ';font-size:15px;font-weight:600;border:1px solid #222;cursor:' + (((profile.xp || 0) < 100) ? 'not-allowed' : 'pointer') + '"' + (((profile.xp || 0) < 100) ? ' disabled' : '') + '>Buy · 100 XP</button>'
    + '</div>'
    + '<div class="list-row" style="display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid #222">'
      + '<div>'
        + '<div style="font-size:15px;font-weight:500;color:#F5F5F4">Custom foods</div>'
        + '<div style="font-size:11px;color:#8A8A8E;margin-top:2px">Manage custom items & staples</div>'
      + '</div>'
      + '<button type="button" class="btn" id="editCustomFoodsBtn" style="height:36px;padding:0 14px;border-radius:8px;background:#1C1C1F;color:#F5F5F4;font-size:15px;font-weight:600;border:1px solid #222;cursor:pointer">Manage</button>'
    + '</div>'
    + '<div class="list-row" style="display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid #222">'
      + '<div>'
        + '<div style="font-size:15px;font-weight:500;color:#F5F5F4">Data backup</div>'
        + '<div style="font-size:11px;color:#8A8A8E;margin-top:2px">Export or restore JSON data</div>'
      + '</div>'
      + '<div style="display:flex;gap:8px">'
        + '<button type="button" class="btn" id="exportBtn" style="height:36px;padding:0 12px;border-radius:8px;background:#1C1C1F;color:#F5F5F4;font-size:15px;font-weight:600;border:1px solid #222;cursor:pointer">Export</button>'
        + '<button type="button" class="btn" id="importBtn" style="height:36px;padding:0 12px;border-radius:8px;background:#1C1C1F;color:#F5F5F4;font-size:15px;font-weight:600;border:1px solid #222;cursor:pointer">Import</button>'
      + '</div>'
    + '</div>'

    // DANGER ZONE
    + '<div style="margin-top:32px">'
      + '<div style="font-size:11px;font-weight:600;color:#FF4D4F;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px">Danger Zone</div>'
      + '<div style="background:#141416;border:1px solid rgba(255,77,79,0.25);border-radius:12px;padding:14px;display:flex;justify-content:space-between;align-items:center">'
        + '<div>'
          + '<div style="font-size:15px;font-weight:500;color:#F5F5F4">Reset all data</div>'
          + '<div style="font-size:11px;color:#8A8A8E;margin-top:2px">Irreversibly delete all workout & nutrition logs</div>'
        + '</div>'
        + '<button type="button" id="resetBtn" style="height:36px;padding:0 14px;border-radius:8px;background:transparent;border:1px solid #FF4D4F;color:#FF4D4F;font-size:15px;font-weight:600;cursor:pointer">Reset</button>'
      + '</div>'
    + '</div>'

    // STICKY BOTTOM SAVE BUTTON
    + '<div style="position:sticky;bottom:0;background:linear-gradient(to top, #141416 80%, transparent);padding-top:16px;margin-top:24px;z-index:10">'
      + '<button type="button" class="btn btn-primary" id="saveSettingsBtn" disabled style="width:100%;height:48px;border-radius:12px;background:#C6F432;color:#0B0B0C;border:none;font-size:15px;font-weight:600;cursor:pointer;opacity:0.4;transition:all 0.2s ease">Save</button>'
    + '</div>'
    + '</div>';

  document.body.appendChild(overlay);

  function markChanged() {
    var saveBtn = overlay.querySelector('#saveSettingsBtn');
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.style.opacity = '1';
    }
  }

  overlay.querySelectorAll('input, select').forEach(function(el) {
    el.addEventListener('input', markChanged);
    el.addEventListener('change', markChanged);
  });

  overlay.querySelectorAll('.day-toggle').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var d = parseInt(btn.dataset.day, 10);
      if (tdays.includes(d)) {
        if (tdays.length <= 1) {
          showToast('You need at least 1 training day', 'warn');
          return;
        }
        tdays = tdays.filter(function(x){ return x !== d; });
      } else {
        tdays.push(d);
        tdays.sort(function(a,b){ return (a === 0 ? 7 : a) - (b === 0 ? 7 : b); });
      }
      var isAct = tdays.includes(d);
      btn.classList.toggle('active', isAct);
      btn.style.setProperty('background', isAct ? '#C6F432' : '#1C1C1F', 'important');
      btn.style.setProperty('border', isAct ? '1px solid #C6F432' : '1px solid #222', 'important');
      btn.style.setProperty('color', isAct ? '#0B0B0C' : '#8A8A8E', 'important');
      btn.style.setProperty('font-weight', isAct ? '600' : '500', 'important');
      markChanged();
    });
  });

  overlay.querySelector('#closeSettingsBtn').addEventListener('click', function(){ overlay.remove(); });
  overlay.addEventListener('click', function(e){ if (e.target === overlay) overlay.remove(); });

  overlay.querySelector('#saveSettingsBtn').addEventListener('click', function() {
    var nextGoal = document.getElementById('setGoal').value;
    var nextTarget = parseFloat(document.getElementById('setTargetWeight').value);
    var current = parseFloat(profile.startWeight) || parseFloat(currentWeight());
    if (!nextTarget || ((nextGoal === 'loss') && current && nextTarget >= current) || ((nextGoal !== 'loss') && current && nextTarget <= current)) {
      showToast(nextGoal === 'loss' ? 'Loss goal must be below current weight' : 'Gain/strength goal must be above current weight', 'warn');
      return;
    }
    profile.calTargetRest = parseInt(document.getElementById('setTargetRest').value, 10) || CAL_TARGET_REST;
    profile.calTargetGym = parseInt(document.getElementById('setTargetGym').value, 10) || CAL_TARGET_GYM;
    profile.protTargetRest = parseInt(document.getElementById('setProtRest').value, 10) || PROT_TARGET_REST;
    profile.protTargetGym = parseInt(document.getElementById('setProtGym').value, 10) || PROT_TARGET_GYM;
    profile.trainingDays = tdays.length ? tdays : [1, 2, 4, 5, 6];
    profile.equipment = document.getElementById('setEquip').value;
    profile.dietaryPattern = document.getElementById('setDiet').value;
    profile.experience = document.getElementById('setExp').value;
    profile.goal = nextGoal;
    profile.targetWeight = nextTarget || 60.0;
    sv('rg_profile', profile);

    var saveBtn = overlay.querySelector('#saveSettingsBtn');
    if (saveBtn) {
      saveBtn.textContent = 'Saved';
      saveBtn.disabled = true;
    }
    showToast('Settings saved', 'ok');
    setTimeout(function() {
      overlay.remove();
      renderTab();
    }, 350);
  });

  overlay.querySelector('#buyShieldBtn').addEventListener('click', function() {
    if ((profile.xp || 0) >= 100) {
      profile.xp -= 100;
      profile.shields = (profile.shields || 0) + 1;
      sv('rg_profile', profile);
      overlay.remove();
      openSettings();
      showToast('Streak shield purchased!', 'ok');
    }
  });

  overlay.querySelector('#resetBtn').addEventListener('click', function() {
    if (confirm('This will delete all Regain data on this device. Are you sure?')) {
      SQLiteStorage.clear().then(function() {
        return new Promise(function(resolve) {
          var request = indexedDB.deleteDatabase('rg_food_db');
          request.onsuccess = request.onerror = request.onblocked = resolve;
        });
      }).then(function() {
        location.reload();
      }).catch(function() {
        showToast('Reset failed. Export a backup and try again.', 'warn');
      });
    }
  });

  var openPlanBtn = overlay.querySelector('#openPlanFromSettingsBtn');
  if (openPlanBtn) {
    openPlanBtn.addEventListener('click', function() {
      overlay.remove();
      openSplitManagerSheet();
    });
  }

  overlay.querySelector('#editCustomFoodsBtn').addEventListener('click', function() {
    overlay.remove();
    openCustomFoodsManager();
  });

  var expBtn = overlay.querySelector('#exportBtn');
  if (expBtn) expBtn.addEventListener('click', exportData);
  var impBtn = overlay.querySelector('#importBtn');
  if (impBtn) impBtn.addEventListener('click', importData);
}

export * from "./onboarding.js";

// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// HISTORY TAB
// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
