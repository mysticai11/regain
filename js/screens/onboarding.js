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
    '<div class="onboard" style="padding-bottom:calc(48px + var(--safe-b))">'
    + '<div style="text-align:center;margin-bottom:24px">'
      + '<div class="onboard-title" style="font-size:32px;letter-spacing:-0.02em">Welcome to Regain</div>'
      + '<div class="onboard-sub" style="font-size:12px;color:var(--text-secondary);margin-top:6px">Evidence-based progression and nutrition. All data stays private on your device.</div>'
    + '</div>'

    // SECTION 1: ABOUT YOU
    + '<div style="margin-bottom:8px"><span style="font-size:11px;font-weight:600;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.08em">1. About You</span></div>'
    + '<div class="metric-card" style="background:var(--surface);border:1px solid var(--hairline);border-radius:16px;padding:16px;margin-bottom:20px">'
      + '<div style="margin-bottom:14px">'
        + '<label for="obName">Your Name</label>'
        + '<input type="text" id="obName" placeholder="e.g. Arjun" style="margin-top:6px;background:var(--surface2);border:1px solid var(--hairline);border-radius:12px;color:var(--text);height:44px;padding:0 14px;width:100%;box-sizing:border-box">'
      + '</div>'
      + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px">'
        + '<div>'
          + '<label for="obAge">Age</label>'
          + '<input type="number" id="obAge" value="25" inputmode="numeric" placeholder="25" style="margin-top:6px;background:var(--surface2);border:1px solid var(--hairline);border-radius:12px;color:var(--text);height:44px;padding:0 14px;width:100%;box-sizing:border-box">'
        + '</div>'
        + '<div>'
          + '<label for="obHeight">Height (cm)</label>'
          + '<input type="number" id="obHeight" value="175" inputmode="numeric" placeholder="175" style="margin-top:6px;background:var(--surface2);border:1px solid var(--hairline);border-radius:12px;color:var(--text);height:44px;padding:0 14px;width:100%;box-sizing:border-box">'
        + '</div>'
      + '</div>'
      + '<div>'
        + '<label for="obGender">Biological Sex</label>'
        + '<select id="obGender" style="margin-top:6px;background:var(--surface2);border:1px solid var(--hairline);border-radius:12px;color:var(--text);height:44px;padding:0 14px;width:100%;box-sizing:border-box">'
          + '<option value="male" selected>Male (Standard TDEE)</option>'
          + '<option value="female">Female (Standard TDEE)</option>'
        + '</select>'
      + '</div>'
    + '</div>'

    // SECTION 2: YOUR GOAL
    + '<div style="margin-bottom:8px"><span style="font-size:11px;font-weight:600;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.08em">2. Your Goal</span></div>'
    + '<div class="metric-card" style="background:var(--surface);border:1px solid var(--hairline);border-radius:16px;padding:16px;margin-bottom:20px">'
      + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px">'
        + '<div>'
          + '<label for="obWeight">Current (kg)</label>'
          + '<input type="number" step="0.1" id="obWeight" value="54.0" placeholder="54.0" inputmode="decimal" style="margin-top:6px;background:var(--surface2);border:1px solid var(--hairline);border-radius:12px;color:var(--text);height:44px;padding:0 14px;width:100%;box-sizing:border-box">'
        + '</div>'
        + '<div>'
          + '<label for="obTargetWeight">Target (kg)</label>'
          + '<input type="number" step="0.1" id="obTargetWeight" value="60.0" placeholder="60.0" inputmode="decimal" style="margin-top:6px;background:var(--surface2);border:1px solid var(--hairline);border-radius:12px;color:var(--text);height:44px;padding:0 14px;width:100%;box-sizing:border-box">'
        + '</div>'
      + '</div>'
      + '<div>'
        + '<label for="obGoal">Primary Objective</label>'
        + '<select id="obGoal" style="margin-top:6px;background:var(--surface2);border:1px solid var(--hairline);border-radius:12px;color:var(--text);height:44px;padding:0 14px;width:100%;box-sizing:border-box">'
          + '<option value="gain" selected>Build Muscle / Lean Bulk</option>'
          + '<option value="loss">Lose Fat / Cut</option>'
          + '<option value="recomp">Body Recomposition</option>'
          + '<option value="strength">Pure Strength</option>'
        + '</select>'
      + '</div>'
    + '</div>'

    // SECTION 3: PREFERENCES
    + '<div style="margin-bottom:8px"><span style="font-size:11px;font-weight:600;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.08em">3. Setup & Preferences</span></div>'
    + '<div class="metric-card" style="background:var(--surface);border:1px solid var(--hairline);border-radius:16px;padding:16px;margin-bottom:24px">'
      + '<div style="margin-bottom:14px">'
        + '<label for="obEquipment">Equipment Access</label>'
        + '<select id="obEquipment" style="margin-top:6px;background:var(--surface2);border:1px solid var(--hairline);border-radius:12px;color:var(--text);height:44px;padding:0 14px;width:100%;box-sizing:border-box">'
          + '<option value="full" selected>Full Gym (Barbell, Dumbbells, Cables, Machines)</option>'
          + '<option value="home">Home Gym (Barbell, Dumbbells, Bench)</option>'
          + '<option value="db">Dumbbells Only</option>'
          + '<option value="body">Bodyweight / Calisthenics</option>'
        + '</select>'
      + '</div>'
      + '<div>'
        + '<label for="obDiet">Dietary Pattern</label>'
        + '<select id="obDiet" style="margin-top:6px;background:var(--surface2);border:1px solid var(--hairline);border-radius:12px;color:var(--text);height:44px;padding:0 14px;width:100%;box-sizing:border-box">'
          + '<option value="nonveg" selected>Non-Vegetarian</option>'
          + '<option value="eggitarian">Eggitarian</option>'
          + '<option value="veg">Vegetarian</option>'
          + '<option value="vegan">Vegan</option>'
        + '</select>'
      + '</div>'
    + '</div>'

    + '<button class="btn" style="width:100%;height:50px;border-radius:9999px;background:var(--accent-primary);color:#0B0B0C;font-size:15px;font-weight:700;border:none;cursor:pointer;box-shadow:0 4px 16px rgba(139,92,246,0.3)" id="obStartBtn">Start tracking</button>'
    + '</div>';

  var startBtn = document.getElementById('obStartBtn');
  if (startBtn) {
    var onStart = function() {
      var name = (document.getElementById('obName')?.value.trim()) || 'You';
      var w = parseFloat(document.getElementById('obWeight')?.value);
      if (!w || w < 30 || w > 250) { showToast('Enter a valid starting weight', 'warn'); return; }
      var targetW = parseFloat(document.getElementById('obTargetWeight')?.value);
      var goal = document.getElementById('obGoal')?.value || 'gain';
      if (!targetW || targetW < 30 || targetW > 250 || (goal === 'loss' && targetW >= w) || (goal !== 'loss' && targetW <= w)) {
        showToast(goal === 'loss' ? 'Loss goal must be below starting weight' : 'Goal weight must be above starting weight', 'warn');
        return;
      }
      
      var age = parseInt(document.getElementById('obAge')?.value, 10) || 25;
      var heightCm = parseFloat(document.getElementById('obHeight')?.value) || 175;
      var gender = document.getElementById('obGender')?.value || 'male';
      var equip = document.getElementById('obEquipment')?.value || 'full';
      var diet = document.getElementById('obDiet')?.value || 'nonveg';
      var newProfile = {
        name: name,
        age: age,
        heightCm: heightCm,
        gender: gender,
        theme: 'dark',
        hapticsEnabled: true,
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
