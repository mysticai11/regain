/* Progress charts: weight trend line SVG, dot consistency calendar, e1RM charts, and rolling averages */

import { profile } from "../../state.js";
import { dayRecord, allDayKeys, getWorkoutSessions } from "../../storage.js";
import { todayKey, dateKey, addDays, goalDirection, esc } from "../../lib/format.js";
import { getExerciseData } from "../../data/plan.js";

export function getWeightHistory() {
  var entries = (profile && Array.isArray(profile.weightEntries)) ? profile.weightEntries.slice() : [];
  allDayKeys().forEach(function(k) {
    var r=dayRecord(k);
    if(r.weight!=null && !entries.some(function(e){return e.dayKey===k;})) entries.push({id:'legacy_'+k,dayKey:k,weight:r.weight,createdAt:k+'T12:00:00'});
  });
  return entries.filter(function(e){return e.weight!=null;}).sort(function(a,b){return String(a.createdAt||a.dayKey).localeCompare(String(b.createdAt||b.dayKey));});
}

export function getProgressRows(range, entries) {
  var cutoff = range === 'all' ? 0 : Date.now() - ({'1w':7,'1m':30,'3m':90}[range]||30)*86400000;
  return entries.filter(function(e){return new Date(e.createdAt||e.dayKey+'T12:00:00').getTime() >= cutoff;});
}

export function getRollingWeightValues(entries, source) {
  source=source||entries;
  return entries.map(function(entry, i) {
    var day = new Date((entry.dayKey || entry.createdAt).slice(0, 10) + 'T12:00:00');
    var start = day.getTime() - 6 * 86400000, end = day.getTime();
    var window=source.filter(function(e){var t=new Date((e.dayKey||e.createdAt).slice(0,10)+'T12:00:00').getTime();return t>=start&&t<=end;});
    var avg=window.reduce(function(sum,e){return sum+Number(e.weight);},0)/window.length;
    return {value:+avg.toFixed(2),label:entry.dayKey+' · 7-day avg '+avg.toFixed(2)+' kg'};
  });
}

export function goalTrajectoryText(entries) {
  var target = Number((profile && profile.targetWeight) || 60), direction=goalDirection();
  if(!target||entries.length<7) return 'Keep logging — need 7+ weigh-ins for trend';
  var firstDate=new Date((entries[0].dayKey||entries[0].createdAt).slice(0,10)+'T12:00:00');
  var lastDate=new Date((entries[entries.length-1].dayKey||entries[entries.length-1].createdAt).slice(0,10)+'T12:00:00');
  var weeks=(lastDate-firstDate)/604800000;
  if(weeks<1) return 'Keep logging — need 7+ weigh-ins over time';
  var rate=(entries[entries.length-1].weight-entries[0].weight)/weeks;
  if(!Number.isFinite(rate)||direction*rate<=0) return 'No clear trend toward goal yet';
  var weeksLeft=Math.abs((target-entries[entries.length-1].weight)/rate);
  if(!Number.isFinite(weeksLeft)||weeksLeft>260) return 'Trend is too slow to estimate';
  var eta=new Date(lastDate.getTime()+weeksLeft*604800000);
  return 'Estimated '+eta.toLocaleDateString([], {month:'short',year:'numeric'})+' · based on logged intake and weight trend';
}

export function progressPlot(values, goal, unit) {
  if(!values.length) return '<div class="t-micro" style="padding:16px 0;color:var(--text-secondary)">Log data to see this trend.</div>';
  var unitLabel = unit || 'kg';
  var isReps = unitLabel === 'reps';
  var nums = values.map(function(v){return Number(v.value);});
  var rawMin = Math.min.apply(null,nums), rawMax = Math.max.apply(null,nums), rawSpan = rawMax-rawMin;
  var pad = rawSpan ? Math.max(rawSpan*.18,.5) : Math.max(Math.abs(rawMax)*.03,.5);
  var min = rawMin-pad, max = rawMax+pad, span = max-min||1;

  var svgWidth = 340;
  var svgHeight = 120;
  var insetX = 20;
  var insetY = 20;
  var plotW = svgWidth - insetX * 2;
  var plotH = svgHeight - insetY * 2;

  var points = values.map(function(v, i) {
    var x = values.length > 1 ? insetX + (i / (values.length - 1)) * plotW : svgWidth / 2;
    var y = insetY + ((max - v.value) / span) * plotH;
    return { x: x, y: y, v: v };
  });
  var poly = points.map(function(p){ return p.x.toFixed(1) + ',' + p.y.toFixed(1); }).join(' ');
  var first = values[0].value, last = values[values.length-1].value, delta = last-first;
  var deltaText = values.length > 1 ? (delta === 0 ? '0.0 ' + unitLabel : (delta > 0 ? '+' : '') + (isReps ? Math.round(delta) : delta.toFixed(1)) + ' ' + unitLabel) : 'First entry';

  var distinctLabels = [];
  values.forEach(function(v){
    var raw = String(v.label || '').slice(0, 10);
    var match = raw.match(/\d{4}-\d{2}-\d{2}/);
    var d = match ? new Date(match[0] + 'T00:00:00') : new Date(raw);
    var dt = !isNaN(d.getTime()) ? d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : raw.replace(/^\d{4}-/, '').replace('-', '/');
    if (dt && !distinctLabels.includes(dt)) distinctLabels.push(dt);
  });
  var displayLabels = [];
  if (distinctLabels.length <= 4) {
    displayLabels = distinctLabels;
  } else {
    var step = (distinctLabels.length - 1) / 3;
    displayLabels = [
      distinctLabels[0],
      distinctLabels[Math.round(step)],
      distinctLabels[Math.round(step * 2)],
      distinctLabels[distinctLabels.length - 1]
    ];
  }

  var goalNum = goal != null ? Number(goal) : ((profile && profile.targetWeight) ? Number(profile.targetWeight) : null);
  var goalY = goalNum != null ? (insetY + ((max - goalNum) / span) * plotH) : -999;
  var goalLineHTML = '';
  if (goalNum != null && goalY >= insetY && goalY <= svgHeight - insetY) {
    goalLineHTML = '<line x1="' + insetX + '" y1="' + goalY.toFixed(1) + '" x2="' + (svgWidth - insetX - 28) + '" y2="' + goalY.toFixed(1) + '" stroke="#C6F432" stroke-dasharray="3 3" stroke-width="1.5" stroke-opacity="0.8"/>'
      + '<text x="' + (svgWidth - insetX) + '" y="' + (goalY + 4).toFixed(1) + '" fill="#C6F432" font-size="11" font-weight="600" text-anchor="end" font-family="Space Grotesk, sans-serif">' + Math.round(goalNum) + '</text>';
  }

  var peakIndex = -1;
  if ((unitLabel === 'kg' || unitLabel === 'reps') && values.length > 0) {
    for (var pIdx = values.length - 1; pIdx >= 0; pIdx--) {
      if (values[pIdx].value === rawMax) { peakIndex = pIdx; break; }
    }
  }

  var dots = points.map(function(p, idx) {
    if (idx === peakIndex) {
      return '<circle cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="5" fill="#C6F432" stroke="#0B0B0C" stroke-width="1.5"/>'
        + '<text x="' + p.x.toFixed(1) + '" y="' + (p.y - 8).toFixed(1) + '" fill="#C6F432" font-size="11" font-weight="600" text-anchor="middle" font-family="Space Grotesk, sans-serif">PR</text>';
    }
    return '<circle cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="3" fill="#F5F5F4" stroke="#0B0B0C" stroke-width="1.5"/>';
  }).join('');

  var fillPolyHTML = '';
  var defsHTML = '';
  if (points.length > 1) {
    var gradId = 'plotGrad_' + Math.floor(Math.random() * 100000);
    defsHTML = '<defs>'
      + '<linearGradient id="' + gradId + '" x1="0" y1="0" x2="0" y2="1">'
      + '<stop offset="0%" stop-color="#C6F432" stop-opacity="0.22"/>'
      + '<stop offset="100%" stop-color="#C6F432" stop-opacity="0.0"/>'
      + '</linearGradient>'
      + '</defs>';
    var bottomY = svgHeight - insetY;
    var firstPt = points[0];
    var lastPt = points[points.length - 1];
    var areaPoly = points.map(function(p){ return p.x.toFixed(1) + ',' + p.y.toFixed(1); }).join(' ')
      + ' ' + lastPt.x.toFixed(1) + ',' + bottomY.toFixed(1)
      + ' ' + firstPt.x.toFixed(1) + ',' + bottomY.toFixed(1);
    fillPolyHTML = '<polygon points="' + areaPoly + '" fill="url(#' + gradId + ')"/>';
  }

  return '<div style="margin-top:0;margin-bottom:12px">'
    + '<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px">'
      + '<span class="t-micro tabnum" style="color:var(--text-secondary)">' + values.length + ' point' + (values.length === 1 ? '' : 's') + (goalNum != null ? (' · Target ' + Math.round(goalNum) + ' ' + unitLabel) : '') + '</span>'
      + '<span class="tabnum" style="font-size:15px;color:var(--text-secondary)">' + esc(deltaText) + '</span>'
    + '</div>'
    + '<div style="position:relative;width:100%;height:120px;background:none">'
      + '<svg viewBox="0 0 340 120" style="width:100%;height:120px;overflow:hidden">'
        + defsHTML
        + goalLineHTML
        + fillPolyHTML
        + '<polyline points="' + poly + '" fill="none" stroke="#F5F5F4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'
        + dots
      + '</svg>'
    + '</div>'
    + '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;font-size:11px;letter-spacing:0.08em;color:var(--text-secondary);text-transform:uppercase">'
      + displayLabels.map(function(l){ return '<span>' + esc(l) + '</span>'; }).join('')
    + '</div>'
    + '</div>';
}

export function buildDotConsistencyCalendarHTML() {
  var now = new Date();
  var year = now.getFullYear();
  var month = now.getMonth();
  var monthNames = ['JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE','JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'];
  var todayStr = todayKey();
  var todayDate = now.getDate();
  var tdays = (profile && profile.trainingDays) || [1,2,3,5,6];

  var firstDay = new Date(year, month, 1);
  var lastDay = new Date(year, month + 1, 0);
  var daysInMonth = lastDay.getDate();
  var startOffset = (firstDay.getDay() + 6) % 7; // Monday = 0

  var trainedCount = 0;
  var plannedCount = 0;
  var dots = [];

  var sessionDays = {};
  try {
    getWorkoutSessions().forEach(function(s) {
      if (s.dayKey && (s.exercises || []).some(function(ex) { return (ex.sets || []).some(Boolean); })) {
        sessionDays[s.dayKey] = true;
      }
    });
  } catch (e) {}

  for (var o = 0; o < startOffset; o++) {
    dots.push('<span class="dot-cell empty" style="width:6px;height:6px;border-radius:50%;background:#222222;display:inline-block"></span>');
  }

  for (var day = 1; day <= daysInMonth; day++) {
    var curDate = new Date(year, month, day);
    var dow = curDate.getDay();
    var isTrainingDay = tdays.includes(dow);
    if (isTrainingDay) plannedCount++;

    var mm = (month + 1 < 10 ? '0' : '') + (month + 1);
    var dd = (day < 10 ? '0' : '') + day;
    var key = year + '-' + mm + '-' + dd;
    var rec = dayRecord(key);
    var trained = !!sessionDays[key] || (rec && (rec.workoutDone || (rec.workout && Object.keys(rec.workout).some(function(k){return (rec.workout[k]||[]).some(Boolean);}))));
    var isToday = (key === todayStr);

    if (trained) trainedCount++;

    var dotStyle = 'width:6px;height:6px;border-radius:50%;display:inline-block;box-sizing:border-box;';
    if (trained && isToday) {
      dotStyle += 'background:#C6F432;'; // today session = lime
    } else if (trained) {
      dotStyle += 'background:#F5F5F4;'; // trained = white
    } else if (isToday) {
      dotStyle += 'background:transparent;border:1.5px solid #F5F5F4;'; // today untrained = ring
    } else {
      dotStyle += 'background:#222222;'; // empty = #222
    }

    dots.push('<span class="dot-cell" style="' + dotStyle + '" title="' + key + (trained ? ' (Trained)' : '') + '"></span>');
  }

  while (dots.length % 7 !== 0) {
    dots.push('<span class="dot-cell empty" style="width:6px;height:6px;border-radius:50%;background:#222222;display:inline-block"></span>');
  }

  var dayLetters = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  var lettersRow = '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:14px;justify-items:center;align-items:center;margin-bottom:8px">'
    + dayLetters.map(function(ch) {
      return '<span style="font-size:11px;font-weight:600;color:#55555A;line-height:1">' + ch + '</span>';
    }).join('')
    + '</div>';

  return '<div style="margin-bottom:32px">'
    + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">'
      + '<span class="t-label">' + monthNames[month] + ' ' + year + '</span>'
      + '<span class="t-micro tabnum" style="color:var(--text-secondary)">' + trainedCount + ' of ' + plannedCount + (plannedCount === 1 ? ' workout' : ' workouts') + '</span>'
    + '</div>'
    + lettersRow
    + '<div class="dot-grid" style="display:grid;grid-template-columns:repeat(7,1fr);gap:14px;justify-items:center;align-items:center;padding:4px 0">'
      + dots.join('')
    + '</div>'
    + '</div>';
}

export function renderRegression(reg, baseW) {
  var slopeKg = reg.slope;
  var ciKg = reg.ci;
  var inR = slopeKg >= GAIN_LOW && slopeKg <= GAIN_HIGH;
  var color = inR ? 'var(--sage-light)' : slopeKg < GAIN_LOW ? 'var(--amber-light)' : 'var(--rust-light)';
  return '<div class="regression-card">'
    +'<span class="eyebrow">trend estimate ('+reg.n+' weeks of data)</span>'
    +'<div class="regression-val" style="color:'+color+'">'+(slopeKg>=0?'+':'')+slopeKg.toFixed(3)+' kg/week</div>'
    +'<div class="regression-ci">95% CI: '+(slopeKg-ciKg).toFixed(3)+' to '+(slopeKg+ciKg).toFixed(3)+' kg/week</div>'
    +(inR ? '<div style="font-size:11px;color:var(--sage-light);margin-top:3px">'+ic('check','14')+' Within target band ('+GAIN_LOW+'–'+GAIN_HIGH+' kg/wk)</div>'
           : '<div style="font-size:11px;color:'+color+';margin-top:3px">'+(slopeKg<GAIN_LOW?'Below target — check calorie logging accuracy first':'Above target — consider trimming 150–200 kcal/day')+'</div>')
    +'</div>';
}

export function buildExOptions() {
  var prog = getActiveProgram();
  var all = [];
  prog.forEach(function(s){ all = all.concat(s.exercises); });
  var seen = {}; var out = [];
  all.forEach(function(e){ if(!seen[e.id]){ seen[e.id]=true; out.push(e); } });
  return out.map(function(e){ return '<option value="'+e.id+'">'+e.name+'</option>'; }).join('');
}

export function chartDefaults() {
  return {
    responsive:true, maintainAspectRatio:false,
    plugins:{legend:{display:false}},
    scales:{
      x:{ticks:{color:'#8A8A8E',font:{family:'Space Grotesk',size:11}},grid:{display:false}},
      y:{ticks:{color:'#8A8A8E',font:{family:'Space Grotesk',size:11}},grid:{color:'rgba(255,255,255,0.05)'}}
    }
  };
}
export function destroyCharts() { Object.values(charts).forEach(function(c){if(c)c.destroy();}); charts={}; }

export function buildProgressCharts(records, weeklyWeights) {
  if(typeof Chart === 'undefined') return;
  destroyCharts();

  // Weight chart
  var wc = document.getElementById('weightChart');
  if(wc) {
    if(weeklyWeights.length >= 2) {
      charts.weight = new Chart(wc, {type:'line',data:{
        labels:weeklyWeights.map(function(_,i){return 'Wk '+(i+1);}),
        datasets:[
          {data:weeklyWeights,borderColor:'#F5F5F4',backgroundColor:'rgba(245,245,244,0.06)',fill:true,tension:0.3,pointBackgroundColor:'#F5F5F4',pointRadius:4,borderWidth:2},
          {data:weeklyWeights.map(function(){return null;}), borderColor:'transparent', fill:false, pointRadius:0}, // spacer
        ]
      },options:chartDefaults()});
    } else {
      wc.style.display='none';
      document.getElementById('weightEmpty').textContent='Log weight for 2+ weeks to see trend';
      document.getElementById('weightEmpty').classList.remove('hidden');
    }
  }

  // Kcal chart (last 14 days)
  var kc = document.getElementById('kcalChart');
  if(kc) {
    if(records.length >= 2) {
      var last14 = records.slice(-14);
      charts.kcal = new Chart(kc, {type:'bar',data:{
        labels:last14.map(function(r){return r.key.slice(5);}),
        datasets:[
          {data:last14.map(function(r){return r.kcal;}),backgroundColor:last14.map(function(r){
            var dailyCt = getTargetsForDate(r.key).kcal;
            return r.kcal>=dailyCt*0.9&&r.kcal<=dailyCt*1.15?'#F5F5F4':r.kcal>dailyCt*1.15?'#FF4D4F':'#1C1C1F';
          }),borderRadius:3},
          {type:'line',data:last14.map(function(r){return getTargetsForDate(r.key).kcal;}),borderColor:'#55555A',borderDash:[5,4],pointRadius:0,borderWidth:1.5,fill:false}
        ]
      },options:chartDefaults()});
    } else {
      kc.style.display='none';
      if(document.getElementById('kcalEmpty')) {
        document.getElementById('kcalEmpty').textContent='Log calories for 2+ days to see trend';
        document.getElementById('kcalEmpty').classList.remove('hidden');
      }
    }
  }

  // Protein chart (7-day rolling avg)
  var pc = document.getElementById('protChart');
  if(pc) {
    if(records.length >= 2) {
      var protData = records.map(function(r){return r.protein;});
      var rolling = protData.map(function(_,i){
        var slice = protData.slice(Math.max(0,i-6),i+1).filter(function(v){return v>0;});
        return slice.length ? +(slice.reduce(function(a,b){return a+b;},0)/slice.length).toFixed(1) : null;
      });
      charts.prot = new Chart(pc, {type:'line',data:{
        labels:records.map(function(r){return r.key.slice(5);}),
        datasets:[
          {data:rolling,borderColor:'#F5F5F4',backgroundColor:'rgba(245,245,244,0.06)',fill:true,tension:0.3,pointRadius:0,borderWidth:2,spanGaps:true},
          {type:'line',data:records.map(function(r){return getTargetsForDate(r.key).protein;}),borderColor:'#55555A',borderDash:[5,4],pointRadius:0,borderWidth:1.5,fill:false}
        ]
      },options:chartDefaults()});
    } else {
      pc.style.display='none';
      if(document.getElementById('protEmpty')) {
        document.getElementById('protEmpty').textContent='Log protein for 2+ days to see trend';
        document.getElementById('protEmpty').classList.remove('hidden');
      }
    }
  }
}

export function buildE1RMChart(exId, records) {
  if(typeof Chart === 'undefined') return;
  if(charts.e1rm) { charts.e1rm.destroy(); charts.e1rm=null; }
  var points = [];
  var ids = (typeof getEquivalentExerciseIds === 'function') ? getEquivalentExerciseIds(exId) : [exId];
  var exObj = getExerciseData(exId) || {};
  var isBW = isBodyweightExercise(exId, exObj.name);

  records.forEach(function(r){
    var dayWo = dayRecord(r.key).workout || {};
    var best = 0;
    ids.forEach(function(id){
      (dayWo[id] || []).forEach(function(s){
        if (!s) return;
        if (isBW) {
          var reps = Number(s.reps) || 0;
          if (reps > best) best = reps;
        } else {
          var e = calcE1RM(s.weight, s.reps);
          if (e > best) best = e;
        }
      });
    });
    if(best > 0) points.push({key:r.key, val: isBW ? best : +best.toFixed(1)});
  });
  var ec = document.getElementById('e1rmChart');
  if(!ec) return;
  if(points.length < 2) { ec.parentElement.innerHTML='<div class="chart-empty">Log your first set today</div>'; return; }
  var opts = chartDefaults();
  opts.scales.y.title = {display:true, text: isBW ? 'Reps (BW)' : 'e1RM (kg)', color:'#8A8A8E', font:{family:'Space Grotesk',size:11}};
  charts.e1rm = new Chart(ec, {type:'line',data:{
    labels:points.map(function(p){return p.key.slice(5);}),
    datasets:[{data:points.map(function(p){return p.val;}),borderColor:'#F5F5F4',backgroundColor:'rgba(245,245,244,0.06)',fill:true,tension:0.2,pointRadius:3,pointBackgroundColor:'#F5F5F4',borderWidth:2}]
  },options:opts});
}

export function buildLedger(records) {
  var grid = document.getElementById('ledger'); if(!grid) return;
  var colorMap={none:'#1C1C1F',under:'#1C1C1F',target:'#F5F5F4',aggressive:'#FF4D4F'};
  grid.innerHTML = records.map(function(r){
    var dailyCt = getTargetsForDate(r.key).kcal;
    var s = dayStatus(r.kcal, dailyCt);
    return '<div class="ledger-cell" style="background:'+colorMap[s]+'" title="' + r.key + ': ' + r.kcal + ' kcal (target: ' + dailyCt + '), ' + r.protein + 'g protein"></div>';
  }).join('');
}

// ── Discovery layer ────────────────────────────────────────────────────────────
