/* Gym exercise swap & calculators: exercise substitution, warm-up sets, and plate loading */

import { dayRecord, saveDayRecord } from "../../storage.js";
import { getExerciseData, getAllExercisesForMuscle, ALTERNATES } from "../../data/plan.js";
import { getPlateBreakdown } from "../../lib/calc.js";
import { openSheet } from "../../components/sheet.js";
import { showToast } from "../../components/toast.js";
import { esc } from "../../lib/format.js";

export function openWarmUpSheet(exName, exId) {
  var inputEl = document.querySelector('.set-weight[data-ex="' + exId + '"]');
  var workingWeight = parseFloat(inputEl ? inputEl.value : '') || 40;
  var w50 = (Math.round((workingWeight * 0.5) / 2.5) * 2.5).toFixed(1);
  var w70 = (Math.round((workingWeight * 0.7) / 2.5) * 2.5).toFixed(1);
  var w85 = (Math.round((workingWeight * 0.85) / 2.5) * 2.5).toFixed(1);
  
  var overlay = document.createElement('div'); overlay.className = 'overlay';
  overlay.innerHTML = '<div class="sheet" style="background:#141416;border:none;border-radius:20px 20px 0 0;padding:20px 20px calc(24px + var(--safe-b));max-width:480px;width:100%">'
    +'<div class="sheet-handle"></div>'
    +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">'
      +'<div style="font-size:28px;font-weight:600;color:#F5F5F4;line-height:1.15">Warm-Up</div>'
      +'<button type="button" class="btn-text-action" id="closeWarmBtn" style="font-size:15px;color:#8A8A8E;background:none;border:none;padding:0;cursor:pointer">Close</button>'
    +'</div>'
    +'<p style="font-size:15px;color:#8A8A8E;margin-bottom:12px">' + esc(exName) + ' · ramp to <strong>' + workingWeight + ' kg</strong>:</p>'
    +'<div style="background:#1C1C1F;padding:12px;border-radius:12px;font-size:15px;line-height:1.8;font-variant-numeric:tabular-nums;color:#F5F5F4">'
      +'<div style="display:flex;justify-content:space-between"><span>Set 1 (50%):</span><strong>' + w50 + ' kg × 5 reps</strong></div>'
      +'<div style="display:flex;justify-content:space-between"><span>Set 2 (70%):</span><strong>' + w70 + ' kg × 3 reps</strong></div>'
      +'<div style="display:flex;justify-content:space-between"><span>Set 3 (85%):</span><strong>' + w85 + ' kg × 1 rep</strong></div>'
    +'</div>'
    +'<p style="font-size:11px;color:#8A8A8E;margin-top:12px">Rest 60-90s between warmups, then 2-3 mins before your first working set.</p>'
    +'</div>';
  document.body.appendChild(overlay);
  overlay.querySelector('#closeWarmBtn').addEventListener('click', function(){ overlay.remove(); });
  overlay.addEventListener('click', function(e){ if (e.target === overlay) overlay.remove(); });
}

// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// GYM TAB
// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════

export function openPlateCalculator(weight) {
  var target = parseFloat(weight) || 60;
  var breakdown = getPlateBreakdown(target, 20);
  var overlay = document.createElement('div');
  overlay.className = 'overlay';

  function renderPlateUI() {
    breakdown = getPlateBreakdown(target, 20);
    var platesHTML = breakdown.perSide.length ? breakdown.perSide.map(function(p) {
      var bg = p >= 20 ? '#F5F5F4' : '#1C1C1F';
      var fg = p >= 20 ? '#0B0B0C' : '#F5F5F4';
      var border = p >= 20 ? 'none' : '1px solid #222';
      return '<div style="display:inline-flex;flex-direction:column;align-items:center;justify-content:center;background:' + bg + ';color:' + fg + ';border:' + border + ';font-weight:700;font-size:11px;border-radius:12px;padding:8px 8px;min-width:36px;font-variant-numeric:tabular-nums">'
        + p + '<span style="font-size:11px">kg</span></div>';
    }).join('') : '<div style="color:#8A8A8E;font-size:15px">No plates needed (empty bar).</div>';

    overlay.innerHTML = '<div class="sheet" style="background:#141416;border:none;border-radius:20px 20px 0 0;padding:20px 20px calc(24px + var(--safe-b));max-width:480px;width:100%">'
      + '<div class="sheet-handle"></div>'
      + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">'
        + '<div style="font-size:28px;font-weight:600;color:#F5F5F4;line-height:1.15">Plate Calculator</div>'
        + '<button type="button" class="btn-text-action" id="closePlateCalcBtn" style="font-size:15px;color:#8A8A8E;background:none;border:none;padding:0;cursor:pointer">Close</button>'
      + '</div>'
      + '<div style="font-size:15px;color:#8A8A8E;margin-bottom:16px">Standard 20 kg Olympic Barbell breakdown per side.</div>'
      + '<div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">'
        + '<label style="font-size:15px;font-weight:600;color:#F5F5F4">Total Weight:</label>'
        + '<input type="number" step="0.5" id="plateTargetInput" value="' + target + '" style="width:100px;font-size:17px;font-weight:600;padding:8px;border-radius:12px;border:none;background:#1C1C1F;color:#F5F5F4;font-variant-numeric:tabular-nums">'
        + '<span style="font-size:15px;font-weight:600;color:#8A8A8E">kg</span>'
      + '</div>'
      + '<div style="background:#1C1C1F;border-radius:12px;padding:16px;margin-bottom:20px">'
        + '<div style="font-size:11px;color:#8A8A8E;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:10px">Plates on EACH SIDE (' + breakdown.sideWeight + ' kg):</div>'
        + '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;min-height:48px">' + platesHTML + '</div>'
        + '<div style="font-size:11px;color:#8A8A8E;margin-top:12px">Bar: 20 kg + (' + breakdown.sideWeight + ' kg × 2 sides) = ' + target + ' kg</div>'
      + '</div>'
      + '</div>';

    overlay.querySelector('#closePlateCalcBtn').onclick = function() { overlay.remove(); };
    var input = overlay.querySelector('#plateTargetInput');
    input.oninput = function() {
      var val = parseFloat(input.value);
      if (val && val >= 20) {
        target = val;
        renderPlateUI();
        var refreshedInput = overlay.querySelector('#plateTargetInput');
        refreshedInput.focus();
        refreshedInput.setSelectionRange(refreshedInput.value.length, refreshedInput.value.length);
      }
    };
  }

  document.body.appendChild(overlay);
  renderPlateUI();
}

export function openSwapSheet(origId, currId, muscleStr, dayKey) {
  var exList = getAllExercisesForMuscle(muscleStr);
  var overlay = document.createElement('div');
  overlay.className = 'overlay';

  function formatMuscles(mStr) {
    if (!mStr) return '';
    var parts = mStr.split(/[\s,]+/).filter(Boolean);
    return parts.map(function(m, idx) {
      m = m.toLowerCase();
      if (idx === 0) m = m.charAt(0).toUpperCase() + m.slice(1);
      return m;
    }).join(', ');
  }

  var rows = exList.map(function(e) {
    var isSel = e.id === currId;
    var muscleText = formatMuscles(e.muscle || muscleStr);
    return '<div class="list-row swap-pick-row" data-selectswap="' + e.id + '" style="display:flex;align-items:center;justify-content:space-between;padding:14px 0;border-bottom:1px solid #222;cursor:pointer">'
      + '<div style="flex:1;min-width:0;padding-right:12px">'
        + '<div style="font-size:17px;font-weight:500;color:#F5F5F4;line-height:1.25">' + esc(e.name) + '</div>'
        + '<div style="font-size:15px;color:#8A8A8E;margin-top:2px">' + esc(muscleText) + '</div>'
      + '</div>'
      + (isSel ? '<span style="color:#F5F5F4;font-size:17px;font-weight:700">✓</span>' : '')
      + '</div>';
  }).join('');

  overlay.innerHTML = '<div class="sheet" style="background:#141416;border:none;border-radius:20px 20px 0 0;padding:20px 20px calc(24px + var(--safe-b));max-width:480px;width:100%">'
    + '<div class="sheet-handle"></div>'
    + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">'
      + '<div style="font-size:28px;font-weight:600;color:#F5F5F4;line-height:1.15">Swap Exercise</div>'
      + '<button type="button" class="btn-text-action" id="closeSwapBtn" style="font-size:15px;color:#8A8A8E;background:none;border:none;padding:0;cursor:pointer">Close</button>'
    + '</div>'
    + '<div style="font-size:15px;color:#8A8A8E;margin-bottom:16px">Swaps apply to this session only.</div>'
    + '<div style="max-height:60vh;overflow-y:auto">' + rows + '</div>'
    + '</div>';

  document.body.appendChild(overlay);

  overlay.querySelector('#closeSwapBtn').addEventListener('click', function(){ overlay.remove(); });
  overlay.addEventListener('click', function(e){ if (e.target === overlay) overlay.remove(); });

  overlay.querySelectorAll('[data-selectswap]').forEach(function(row) {
    row.addEventListener('click', function() {
      var sid = row.dataset.selectswap;
      var rec = dayRecord(dayKey);
      rec.swaps = rec.swaps || {};
      if (sid === origId) delete rec.swaps[origId];
      else rec.swaps[origId] = sid;
      saveDayRecord(dayKey, rec);
      overlay.remove();
      renderGym();
    });
  });
}

export function openEffortSheet(exId, setIndex) {
  var select=document.querySelector('.set-rir[data-ex="'+exId+'"][data-set-index="'+setIndex+'"]');
  if(!select) return;
  var current=select.value===''?null:parseInt(select.value,10);
  var options=[
    {value:'',title:'Not set',copy:'Skip effort tracking'},
    {value:'3',title:'3+ RIR',copy:'Could do 3 or more'},
    {value:'2',title:'2 RIR',copy:'Could do 2 more'},
    {value:'1',title:'1 RIR',copy:'Could do 1 more'},
    {value:'0',title:'Failure',copy:'No more clean reps',failure:true}
  ];
  var overlay=document.createElement('div'); overlay.className='overlay';
  overlay.innerHTML='<div class="sheet"><div class="sheet-handle"></div><div class="sheet-title">Set effort</div><div class="effort-sheet-copy">RIR means reps in reserve. Choose the option that best describes how hard this set felt.</div><div class="effort-choice-grid">'+options.map(function(option){
    var active=(option.value===''?current===null:current===parseInt(option.value,10));
    return '<button type="button" class="btn effort-choice '+(option.failure?'failure':'')+'" data-effort-value="'+option.value+'" '+(active?'aria-pressed="true"':'')+'><strong>'+option.title+(active?' ✓':'')+'</strong><small>'+option.copy+'</small></button>';
  }).join('')+'</div><button type="button" class="btn" id="cancelEffortBtn" style="width:100%;margin-top:10px">Cancel</button></div>';
  document.body.appendChild(overlay);
  overlay.querySelector('#cancelEffortBtn').onclick=function(){overlay.remove();};
  overlay.addEventListener('click',function(event){if(event.target===overlay) overlay.remove();});
  overlay.querySelectorAll('[data-effort-value]').forEach(function(option){
    option.onclick=function(){
      select.value=option.dataset.effortValue;
      select.dispatchEvent(new Event('input',{bubbles:true}));
      var trigger=document.querySelector('.effort-btn[data-effort-ex="'+exId+'"][data-set-index="'+setIndex+'"]');
      if(trigger) {
        var value=option.dataset.effortValue;
        trigger.textContent=value===''?'Effort':(value==='0'?'Failure':value+' RIR');
        trigger.classList.toggle('has-value',value!=='');
      }
      overlay.remove();
    };
  });
}

// ── Toast notification ─────────────────────────────────────────────────────────
