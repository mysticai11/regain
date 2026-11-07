/* Progress screen chart scrub and exercise picker interactions */

import { esc } from "../../lib/format.js";
import { deleteWeightEntry } from "./history.js";

export function setupChartInteractions(container) {
  if (!container || typeof container.querySelector !== 'function') return;
  var chart = container.querySelector('.chart-container');
  if (!chart) return;
  var svg = chart.querySelector('svg');
  var readout = chart.querySelector('.chart-readout');
  var cursor = chart.querySelector('.chart-scrub-line');
  var defaultText = readout ? readout.innerHTML : '';
  var pointGroups = Array.from(chart.querySelectorAll('.chart-point-group'));
  if (!pointGroups.length || !svg || !readout) return;

  function updatePoint(pt) {
    if (!pt) return;
    var d = pt.dataset;
    var date = d.date || '';
    var val = d.val || '';
    var unit = d.unit || 'kg';
    var avg = d.avg || '';
    var entryId = d.id || '';
    var setDesc = d.setDesc || '';
    var isPr = d.isPr === 'true';
    var prBadge = isPr ? ' <span style="color:var(--lime);font-weight:600;font-size:11px">PR</span>' : '';

    if (setDesc) {
      var metricText = (unit === 'reps') ? '' : (' <span style="font-size:11px;color:var(--text-secondary)">(Est. 1RM ' + esc(val) + ' ' + esc(unit) + ')</span>');
      readout.innerHTML = esc(date) + ' · <span style="color:var(--text);font-weight:600">' + esc(setDesc) + '</span>' + metricText + prBadge;
    } else {
      var delBtnHTML = entryId ? ' <button type="button" class="btn-text-action chart-del-btn" data-delete-chart-weight="' + esc(entryId) + '" style="color:var(--danger);font-size:11px;font-weight:600;margin-left:8px;background:none;border:none;padding:0;cursor:pointer">Delete</button>' : '';
      readout.innerHTML = esc(date) + ' · ' + esc(val) + ' ' + esc(unit) + (avg ? ' <span style="font-size:11px;color:var(--text-secondary)">(avg ' + esc(avg) + ')</span>' : '') + delBtnHTML;
      var delBtn = readout.querySelector('[data-delete-chart-weight]');
      if (delBtn) {
        delBtn.onclick = function(e) {
          e.stopPropagation();
          deleteWeightEntry(delBtn.dataset.deleteChartWeight);
        };
      }
    }
    var circle = pt.querySelector('circle');
    if (circle && cursor) {
      cursor.setAttribute('x1', circle.getAttribute('cx'));
      cursor.setAttribute('x2', circle.getAttribute('cx'));
      cursor.style.display = 'block';
    }
  }

  function resetPoint() {
    readout.innerHTML = defaultText;
    if (cursor) cursor.style.display = 'none';
  }

  pointGroups.forEach(function(g) {
    g.addEventListener('pointerenter', function() { updatePoint(g); });
    g.addEventListener('click', function(e) { e.stopPropagation(); updatePoint(g); });
  });

  svg.addEventListener('pointerleave', resetPoint);
  if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
    document.addEventListener('click', function(e) {
      if (!chart.contains(e.target)) resetPoint();
    });
  }
}

export function openExercisePickerModal(options) {
  var exOptions = options.exOptions || [];
  var exerciseSessionCounts = options.exerciseSessionCounts || {};
  var currentSelectedId = options.currentSelectedId || '';
  var onSelect = options.onSelect;

  var overlay = document.createElement('div');
  overlay.className = 'overlay active';
  overlay.innerHTML = '<div class="sheet" style="background:var(--surface);border-radius:28px 28px 0 0;padding:20px 20px calc(24px + var(--safe-b));width:100%;max-width:480px;max-height:80vh;display:flex;flex-direction:column">'
    + '<div class="sheet-handle"></div>'
    + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px"><span style="font-size:17px;font-weight:600;color:var(--text)">Select Exercise</span><button type="button" id="closePickerBtn" style="background:none;border:none;color:var(--text-secondary);font-size:15px;cursor:pointer">Done</button></div>'
    + '<input type="text" id="exSearchInput" placeholder="Search exercises..." style="background:var(--surface-raised);border:1px solid var(--hairline);border-radius:10px;height:40px;padding:0 12px;color:var(--text);font-size:15px;margin-bottom:12px;outline:none">'
    + '<div id="exSheetList" style="flex:1;overflow-y:auto">'
      + exOptions.map(function(e) {
        var c = exerciseSessionCounts[e.id] || 0;
        var isCurrent = e.id === currentSelectedId;
        return '<div class="ex-picker-row" data-ex-id="' + e.id + '" style="display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid var(--hairline);cursor:pointer"><span style="font-size:15px;font-weight:600;color:' + (isCurrent ? 'var(--lime)' : 'var(--text)') + '">' + esc(e.name) + '</span><span style="font-size:11px;color:var(--text-secondary)">' + c + (c === 1 ? ' session' : ' sessions') + '</span></div>';
      }).join('')
    + '</div></div>';
  document.body.appendChild(overlay);
  overlay.querySelector('#closePickerBtn').onclick = function() { overlay.remove(); };
  overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };
  var sIn = overlay.querySelector('#exSearchInput');
  sIn.oninput = function() {
    var q = sIn.value.toLowerCase();
    overlay.querySelectorAll('.ex-picker-row').forEach(function(r) {
      r.style.display = r.textContent.toLowerCase().includes(q) ? 'flex' : 'none';
    });
  };
  overlay.querySelectorAll('.ex-picker-row').forEach(function(r) {
    r.onclick = function() {
      overlay.remove();
      if (typeof onSelect === 'function') onSelect(r.dataset.exId);
    };
  });
}
