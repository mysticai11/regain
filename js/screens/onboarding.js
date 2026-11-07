/* Onboarding & split preview screens */

import { profile, setProfile } from "../state.js";
import { sv, dayRecord, saveDayRecord } from "../storage.js";
import { DEFAULT_MEAL_PLAN } from "../data/foods.js";
import { renderApp } from "../main.js";
import { CAL_TARGET_REST, CAL_TARGET_GYM, PROT_TARGET_REST, PROT_TARGET_GYM, PROGRAM_2DAY, PROGRAM_3DAY, PROGRAM_4DAY } from "../data/plan.js";
import { showToast } from "../components/toast.js";
import { openSheet } from "../components/sheet.js";
import { todayKey } from "../lib/format.js";

export function openSplitPreview() {
  var val = document.getElementById('setSplit') ? document.getElementById('setSplit').value : '5day';
  if (val === '5day' || val === '6day') {
    openSheet('<div class="sheet-title">Custom routine</div><div style="font-size:15px;color:var(--text-secondary);line-height:1.5">This split starts empty. Choose your training days in Settings, then add each exercise, planned set count, rep range, and rest time from the Gym tab. Every set\'s weight and reps are entered manually when you train.</div>');
    return;
  }
  var prog = val === '2day' ? PROGRAM_2DAY : val === '4day' ? PROGRAM_4DAY : PROGRAM_3DAY;
  var overlay = document.createElement('div'); overlay.className = 'overlay';
  var html = prog.map(function(s){
    var exStr = s.exercises.map(function(e){ return '<div style="font-size:15px;padding:4px 0;border-bottom:1px solid rgba(255,255,255,0.05);display:flex;justify-content:space-between"><span>' + e.name + '</span><span style="font-size:11px;color:var(--text-muted)">' + e.muscle + '</span></div>'; }).join('');
    return '<div style="margin-bottom:16px"><div style="font-weight:600;color:var(--text);margin-bottom:6px">' + s.label + '</div>' + exStr + '</div>';
  }).join('');
  overlay.innerHTML = '<div class="sheet"><div class="sheet-handle"></div><div class="sheet-title" style="margin-bottom:12px">Split Preview</div>' + html + '<button class="btn" style="margin-top:16px;width:100%" id="closePreviewBtn">Close</button></div>';
  document.body.appendChild(overlay);
  overlay.querySelector('#closePreviewBtn').addEventListener('click', function(){ overlay.remove(); });
}

export function renderOnboarding() {
  document.getElementById('app').innerHTML =
    '<div class="onboard">'
    + '<div class="onboard-title">Regain</div>'
    + '<div class="onboard-sub">One-time configuration. All data remains locally on this device.</div>'
    + '<label style="margin-top:16px">Your Name (optional)</label>'
    + '<input type="text" id="obName" placeholder="e.g. Arjun">'
    + '<label style="margin-top:16px">Starting Weight (kg)</label>'
    + '<input type="number" step="0.1" id="obWeight" value="54.0" placeholder="e.g. 54.0" inputmode="decimal">'
    + '<label style="margin-top:16px">Primary Goal</label>'
    + '<select id="obGoal"><option value="gain">Build muscle / gain weight</option><option value="loss">Lose fat / lose weight</option><option value="recomp">Recomposition</option><option value="strength">Strength</option></select>'
    + '<label style="margin-top:16px">Goal Weight (kg)</label>'
    + '<input type="number" step="0.1" id="obTargetWeight" value="60.0" placeholder="e.g. 60.0" inputmode="decimal">'
    + '<label style="margin-top:16px">Equipment Access</label>'
    + '<select id="obEquipment">'
      + '<option value="full">Full Gym (Barbell, Dumbbells, Cables, Machines)</option>'
      + '<option value="home">Home Gym (Barbell, Dumbbells, Bench)</option>'
      + '<option value="db">Dumbbells Only</option>'
      + '<option value="body">Bodyweight / Calisthenics</option>'
    + '</select>'
    + '<label style="margin-top:16px">Dietary Pattern</label>'
    + '<select id="obDiet">'
      + '<option value="nonveg">Non-Vegetarian</option>'
      + '<option value="eggitarian">Eggitarian</option>'
      + '<option value="veg">Vegetarian</option>'
      + '<option value="vegan">Vegan</option>'
    + '</select>'
    + '<div class="small dim" style="margin-top:14px">Regain uses the preloaded 5-day split: Monday, Tuesday, Wednesday, Friday and Saturday.</div>'
    + '<button class="btn btn-primary" style="margin-top:28px" id="obStartBtn">Start tracking</button>'
    + '</div>';

  var startBtn = document.getElementById('obStartBtn');
  if (startBtn) {
    var onStart = function() {
      var name = (document.getElementById('obName').value.trim()) || 'You';
      var w = parseFloat(document.getElementById('obWeight').value);
      if (!w || w < 30 || w > 250) { showToast('Enter a valid starting weight', 'warn'); return; }
      var targetW = parseFloat(document.getElementById('obTargetWeight').value);
      var goal = document.getElementById('obGoal').value;
      if (!targetW || targetW < 30 || targetW > 250 || (goal === 'loss' && targetW >= w) || (goal !== 'loss' && targetW <= w)) {
        showToast(goal === 'loss' ? 'Loss goal must be below starting weight' : 'Goal weight must be above starting weight', 'warn');
        return;
      }
      
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
      var firstDay = dayRecord(todayKey()); firstDay.weight = w; saveDayRecord(todayKey(), firstDay);
      renderApp();
    };
    if (typeof startBtn.addEventListener === 'function') startBtn.addEventListener('click', onStart);
    else startBtn.onclick = onStart;
  }
}
