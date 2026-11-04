/* Settings screen: targets, training days, plan picker, profile, and onboarding modal */

import { profile, setProfile, setTab } from "../state.js";
import { sv, dayRecord, saveDayRecord, exportData, importData } from "../storage.js";
import { DEFAULT_MEAL_PLAN } from "../data/foods.js";
import { renderApp } from "../main.js";
import { CAL_TARGET_REST, CAL_TARGET_GYM, PROT_TARGET_REST, PROT_TARGET_GYM, PROGRAM_2DAY, PROGRAM_3DAY, PROGRAM_4DAY, PROGRAM_5DAY, PROGRAM_6DAY, DEFAULT_5DAY_ROUTINE } from "../data/plan.js";
import { showToast } from "../components/toast.js";
import { openSplitManagerSheet } from "./gym/plan-editor.js";
import { openCustomFoodsManager } from "./today/food-modal.js";
import { todayKey, esc } from "../lib/format.js";

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
  var shields = profile.shields || 0;

  var restKcal = profile.calTargetRest || CAL_TARGET_REST;
  var gymKcal = profile.calTargetGym || CAL_TARGET_GYM;
  var restProt = profile.protTargetRest || PROT_TARGET_REST;
  var gymProt = profile.protTargetGym || PROT_TARGET_GYM;
  var targetWeight = profile.targetWeight || 60.0;

  var dayTogglesHTML = weekDaysMeta.map(function(d) {
    var active = tdays.includes(d.js);
    return '<button type="button" class="day-toggle ' + (active ? 'active' : '') + '" data-day="' + d.js + '">' + d.name + '</button>';
  }).join('');

  overlay.innerHTML = '<div class="sheet" style="background:#141416;border:none;border-radius:20px 20px 0 0;padding:20px 20px calc(24px + var(--safe-b));max-width:480px;width:100%;max-height:88vh;overflow-y:auto">'
    + '<div class="sheet-handle"></div>'
    + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">'
      + '<div style="font-size:28px;font-weight:600;color:#F5F5F4;line-height:1.15">Settings</div>'
      + '<button type="button" class="btn-text-action" id="closeSettingsBtn" style="font-size:15px;color:#8A8A8E;background:none;border:none;padding:0;cursor:pointer">Close</button>'
    + '</div>'

    // TARGETS
    + '<div style="margin-top:16px"><span class="eyebrow" style="margin-bottom:10px">Targets</span></div>'
    + '<div style="display:flex;gap:12px;margin-bottom:12px">'
      + '<div style="flex:1">'
        + '<label class="eyebrow">Rest-Day kcal</label>'
        + '<div style="position:relative;display:flex;align-items:center">'
          + '<input type="number" id="setTargetRest" value="' + restKcal + '" inputmode="numeric" style="text-align:right;padding-right:52px;width:100%">'
          + '<span style="position:absolute;right:14px;color:#8A8A8E;font-size:15px;pointer-events:none">kcal</span>'
        + '</div>'
      + '</div>'
      + '<div style="flex:1">'
        + '<label class="eyebrow">Gym-Day kcal</label>'
        + '<div style="position:relative;display:flex;align-items:center">'
          + '<input type="number" id="setTargetGym" value="' + gymKcal + '" inputmode="numeric" style="text-align:right;padding-right:52px;width:100%">'
          + '<span style="position:absolute;right:14px;color:#8A8A8E;font-size:15px;pointer-events:none">kcal</span>'
        + '</div>'
      + '</div>'
    + '</div>'
    + '<div style="display:flex;gap:12px;margin-bottom:12px">'
      + '<div style="flex:1">'
        + '<label class="eyebrow">Rest-Day Protein</label>'
        + '<div style="position:relative;display:flex;align-items:center">'
          + '<input type="number" id="setProtRest" value="' + restProt + '" inputmode="numeric" style="text-align:right;padding-right:32px;width:100%">'
          + '<span style="position:absolute;right:14px;color:#8A8A8E;font-size:15px;pointer-events:none">g</span>'
        + '</div>'
      + '</div>'
      + '<div style="flex:1">'
        + '<label class="eyebrow">Gym-Day Protein</label>'
        + '<div style="position:relative;display:flex;align-items:center">'
          + '<input type="number" id="setProtGym" value="' + gymProt + '" inputmode="numeric" style="text-align:right;padding-right:32px;width:100%">'
          + '<span style="position:absolute;right:14px;color:#8A8A8E;font-size:15px;pointer-events:none">g</span>'
        + '</div>'
      + '</div>'
    + '</div>'
    + '<div style="display:flex;gap:12px;margin-bottom:12px">'
      + '<div style="flex:1">'
        + '<label class="eyebrow">Goal Weight</label>'
        + '<div style="position:relative;display:flex;align-items:center">'
          + '<input type="number" step="0.1" id="setTargetWeight" value="' + targetWeight + '" inputmode="decimal" style="text-align:right;padding-right:36px;width:100%">'
          + '<span style="position:absolute;right:14px;color:#8A8A8E;font-size:15px;pointer-events:none">kg</span>'
        + '</div>'
      + '</div>'
      + '<div style="flex:1">'
        + '<label class="eyebrow">Primary Goal</label>'
        + '<select id="setGoal" style="width:100%">'
          + '<option value="gain"' + (goalVal === 'gain' ? ' selected' : '') + '>Build muscle</option>'
          + '<option value="loss"' + (goalVal === 'loss' ? ' selected' : '') + '>Lose fat</option>'
          + '<option value="recomp"' + (goalVal === 'recomp' ? ' selected' : '') + '>Recomp</option>'
          + '<option value="strength"' + (goalVal === 'strength' ? ' selected' : '') + '>Strength</option>'
        + '</select>'
      + '</div>'
    + '</div>'

    // TRAINING DAYS
    + '<div style="margin-top:20px"><span class="eyebrow" style="margin-bottom:10px">Training days</span></div>'
    + '<div class="day-toggles">' + dayTogglesHTML + '</div>'

    // PLAN
    + '<div style="margin-top:24px"><span class="eyebrow" style="margin-bottom:10px">Plan</span></div>'
    + '<div class="list-row" style="display:flex;justify-content:space-between;align-items:center;padding:14px 0;border-bottom:1px solid #222">'
      + '<div>'
        + '<div style="font-size:17px;font-weight:500;color:#F5F5F4">Workout Plan</div>'
        + '<div style="font-size:15px;color:#8A8A8E;margin-top:2px">Custom split & exercises</div>'
      + '</div>'
      + '<button type="button" class="btn-text-action" id="openPlanFromSettingsBtn" style="color:#F5F5F4;font-size:15px;font-weight:600;background:none;border:none;padding:0;cursor:pointer">Edit plan</button>'
    + '</div>'

    // PROFILE
    + '<div style="margin-top:24px"><span class="eyebrow" style="margin-bottom:10px">Profile</span></div>'
    + '<div style="margin-bottom:12px">'
      + '<label class="eyebrow">Equipment Access</label>'
      + '<select id="setEquip" style="width:100%">'
        + '<option value="full"' + (equipVal === 'full' ? ' selected' : '') + '>Full Gym</option>'
        + '<option value="home"' + (equipVal === 'home' ? ' selected' : '') + '>Home Gym</option>'
        + '<option value="db"' + (equipVal === 'db' ? ' selected' : '') + '>Dumbbells Only</option>'
        + '<option value="body"' + (equipVal === 'body' ? ' selected' : '') + '>Bodyweight</option>'
      + '</select>'
    + '</div>'
    + '<div style="margin-bottom:12px">'
      + '<label class="eyebrow">Dietary Pattern</label>'
      + '<select id="setDiet" style="width:100%">'
        + '<option value="nonveg"' + (dietVal === 'nonveg' ? ' selected' : '') + '>Non-Vegetarian</option>'
        + '<option value="eggitarian"' + (dietVal === 'eggitarian' ? ' selected' : '') + '>Eggitarian</option>'
        + '<option value="veg"' + (dietVal === 'veg' ? ' selected' : '') + '>Vegetarian</option>'
        + '<option value="vegan"' + (dietVal === 'vegan' ? ' selected' : '') + '>Vegan</option>'
      + '</select>'
    + '</div>'
    + '<div style="margin-bottom:12px">'
      + '<label class="eyebrow">Experience tier</label>'
      + '<select id="setExp" style="width:100%">'
        + '<option value="novice"' + (profile.experience === 'novice' ? ' selected' : '') + '>Novice / Intermediate</option>'
        + '<option value="advanced"' + (profile.experience === 'advanced' ? ' selected' : '') + '>Advanced</option>'
      + '</select>'
    + '</div>'

    // ADVANCED (SectionLabel, not a triangle!)
    + '<div style="margin-top:24px"><span class="eyebrow" style="margin-bottom:10px">Advanced</span></div>'
    + '<div class="list-row" style="display:flex;justify-content:space-between;align-items:center;padding:14px 0;border-bottom:1px solid #222">'
      + '<span style="font-size:17px;font-weight:500;color:#F5F5F4">' + shields + (shields === 1 ? ' shield' : ' shields') + '</span>'
      + '<button type="button" class="btn-text-action" id="buyShieldBtn" style="color:#F5F5F4;font-size:15px;font-weight:600;background:none;border:none;padding:0;cursor:pointer"' + (((profile.xp || 0) < 100) ? ' disabled' : '') + '>Buy · 100 XP</button>'
    + '</div>'
    + '<div class="list-row" style="display:flex;justify-content:space-between;align-items:center;padding:14px 0;border-bottom:1px solid #222">'
      + '<span style="font-size:17px;font-weight:500;color:#F5F5F4">Data backup</span>'
      + '<div>'
        + '<button type="button" class="btn-text-action" id="exportBtn" style="color:#F5F5F4;font-size:15px;font-weight:600;background:none;border:none;padding:0;cursor:pointer">Export</button>'
        + '<span style="color:#55555A;margin:0 8px">·</span>'
        + '<button type="button" class="btn-text-action" id="importBtn" style="color:#F5F5F4;font-size:15px;font-weight:600;background:none;border:none;padding:0;cursor:pointer">Import</button>'
      + '</div>'
    + '</div>'
    + '<div class="list-row" style="display:flex;justify-content:space-between;align-items:center;padding:14px 0;border-bottom:1px solid #222">'
      + '<span style="font-size:17px;font-weight:500;color:#F5F5F4">Custom foods</span>'
      + '<button type="button" class="btn-text-action" id="editCustomFoodsBtn" style="color:#F5F5F4;font-size:15px;font-weight:600;background:none;border:none;padding:0;cursor:pointer">Manage</button>'
    + '</div>'
    + '<div class="list-row" style="display:flex;justify-content:space-between;align-items:center;padding:14px 0;border-bottom:1px solid #222">'
      + '<span style="font-size:17px;font-weight:500;color:#FF4D4F">Reset all data</span>'
      + '<button type="button" class="btn-text-action" id="resetBtn" style="color:#FF4D4F;font-size:15px;font-weight:600;background:none;border:none;padding:0;cursor:pointer">Reset</button>'
    + '</div>'

    // Bottom Save button
    + '<div style="margin-top:24px">'
      + '<button type="button" class="btn btn-primary" id="saveSettingsBtn" style="width:100%;height:48px;border-radius:12px;background:#C6F432;color:#0B0B0C;border:none;font-size:15px;font-weight:600;cursor:pointer">Save</button>'
    + '</div>'
    + '</div>';

  document.body.appendChild(overlay);

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
      btn.classList.toggle('active', tdays.includes(d));
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
    overlay.remove();
    renderTab();
    showToast('Settings saved', 'ok');
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

export function openSplitPreview() {
  var val = document.getElementById('setSplit').value;
  if(val === '5day' || val === '6day') {
    openSheet('<div class="sheet-title">Custom routine</div><div style="font-size:15px;color:var(--text-secondary);line-height:1.5">This split starts empty. Choose your training days in Settings, then add each exercise, planned set count, rep range, and rest time from the Gym tab. Every set\'s weight and reps are entered manually when you train.</div>');
    return;
  }
  var prog = val==='2day'?PROGRAM_2DAY:val==='4day'?PROGRAM_4DAY:PROGRAM_3DAY;
  var overlay=document.createElement('div'); overlay.className='overlay';
  var html = prog.map(function(s){
    var exStr = s.exercises.map(function(e){ return '<div style="font-size:15px;padding:4px 0;border-bottom:1px solid rgba(255,255,255,0.05);display:flex;justify-content:space-between"><span>'+e.name+'</span><span style="font-size:11px;color:var(--text-muted)">'+e.muscle+'</span></div>'; }).join('');
    return '<div style="margin-bottom:16px"><div style="font-weight:600;color:var(--text);margin-bottom:6px">'+s.label+'</div>'+exStr+'</div>';
  }).join('');
  overlay.innerHTML='<div class="sheet"><div class="sheet-handle"></div><div class="sheet-title" style="margin-bottom:12px">Split Preview</div>'+html+'<button class="btn" style="margin-top:16px;width:100%" id="closePreviewBtn">Close</button></div>';
  document.body.appendChild(overlay);
  overlay.querySelector('#closePreviewBtn').addEventListener('click',function(){overlay.remove();});
}

// ── Custom foods manager ───────────────────────────────────────────────────────

export function renderOnboarding() {
  document.getElementById('app').innerHTML =
    '<div class="onboard">'
    +'<div class="onboard-title">Tally</div>'
    +'<div class="onboard-sub">One-time configuration. All data remains locally on this device.</div>'
    
    +'<label style="margin-top:16px">Your Name (optional)</label>'
    +'<input type="text" id="obName" placeholder="e.g. Arjun">'
    
    +'<label style="margin-top:16px">Starting Weight (kg)</label>'
    +'<input type="number" step="0.1" id="obWeight" value="54.0" placeholder="e.g. 54.0" inputmode="decimal">'
    
    +'<label style="margin-top:16px">Primary Goal</label>'
    +'<select id="obGoal"><option value="gain">Build muscle / gain weight</option><option value="loss">Lose fat / lose weight</option><option value="recomp">Recomposition</option><option value="strength">Strength</option></select>'
    +'<label style="margin-top:16px">Goal Weight (kg)</label>'
    +'<input type="number" step="0.1" id="obTargetWeight" value="60.0" placeholder="e.g. 60.0" inputmode="decimal">'
    
    +'<label style="margin-top:16px">Equipment Access</label>'
    +'<select id="obEquipment">'
      +'<option value="full">Full Gym (Barbell, Dumbbells, Cables, Machines)</option>'
      +'<option value="home">Home Gym (Barbell, Dumbbells, Bench)</option>'
      +'<option value="db">Dumbbells Only</option>'
      +'<option value="body">Bodyweight / Calisthenics</option>'
    +'</select>'
    
    +'<label style="margin-top:16px">Dietary Pattern</label>'
    +'<select id="obDiet">'
      +'<option value="nonveg">Non-Vegetarian</option>'
      +'<option value="eggitarian">Eggitarian</option>'
      +'<option value="veg">Vegetarian</option>'
      +'<option value="vegan">Vegan</option>'
    +'</select>'
    
    +'<div class="small dim" style="margin-top:14px">Tally uses the preloaded 5-day split: Monday, Tuesday, Wednesday, Friday and Saturday.</div>'
    
    +'<button class="btn btn-primary" style="margin-top:28px" id="obStartBtn">Start tracking</button>'
    +'</div>';

  document.getElementById('obStartBtn').addEventListener('click',function(){
    var name=(document.getElementById('obName').value.trim())||'You';
    var w=parseFloat(document.getElementById('obWeight').value);
    if(!w||w<30||w>250){showToast('Enter a valid starting weight','warn');return;}
    var targetW=parseFloat(document.getElementById('obTargetWeight').value);
    var goal=document.getElementById('obGoal').value;
    if(!targetW||targetW<30||targetW>250||(goal==='loss'&&targetW>=w)||(goal!=='loss'&&targetW<=w)){showToast(goal==='loss'?'Loss goal must be below starting weight':'Goal weight must be above starting weight','warn');return;}
    
    var equip = document.getElementById('obEquipment').value;
    var diet = document.getElementById('obDiet').value;
    var newProfile = {
      name: name,
      startDate: todayKey(),
      startWeight: w,
      targetWeight: targetW,
      goal: goal,
      calTargetRest: goal === 'loss' ? 2500 : CAL_TARGET_REST,
      calTargetGym: goal === 'loss' ? 2700 : CAL_TARGET_GYM,
      protTargetRest: PROT_TARGET_REST,
      protTargetGym: PROT_TARGET_GYM,
      trainingDays: [1,2,3,5,6],
      programSplit: 'iron5day',
      equipment: equip,
      dietaryPattern: diet,
      experience: 'novice',
      xp: 0,
      shields: 1,
      version: 4,
      mealPlan: JSON.parse(JSON.stringify(DEFAULT_MEAL_PLAN))
    };
    setProfile(newProfile);
    sv('rg_profile', newProfile);
    var firstDay=dayRecord(todayKey()); firstDay.weight=w; saveDayRecord(todayKey(),firstDay);
    renderApp();
  });
}

// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// HISTORY TAB
// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
