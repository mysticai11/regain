/* Sheet components: generic bottom sheet and action menus */

import { esc } from "../lib/format.js";

export function closeSheet(overlay) {
  if (!overlay || overlay._closing) return;
  overlay._closing = true;
  overlay.style.transition = 'opacity 140ms ease-out';
  overlay.style.opacity = '0';
  var s = overlay.querySelector('.sheet');
  if (s) {
    s.style.transition = 'transform 180ms cubic-bezier(0.16, 1, 0.3, 1)';
    s.style.transform = 'translateY(100%)';
  }
  setTimeout(function() { overlay.remove(); }, 180);
}

export function openSheet(html) {
  var overlay=document.createElement('div'); overlay.className='overlay';
  overlay.innerHTML='<div class="sheet"><div class="sheet-handle"></div>'+html+'<div style="display:flex;justify-content:flex-end;margin-top:16px"><button type="button" class="btn-text-action" id="closeSheetBtn">Close</button></div></div>';
  document.body.appendChild(overlay);
  document.getElementById('closeSheetBtn').addEventListener('click',function(){closeSheet(overlay);});
  overlay.addEventListener('click',function(e){if(e.target===overlay)closeSheet(overlay);});
}

export function openActionMenuSheet(title, items) {
  var menuOverlay = document.createElement('div');
  menuOverlay.className = 'overlay';
  menuOverlay.style.zIndex = '300';
  var rows = items.map(function(item, idx) {
    var isDestructive = item.destructive;
    var color = isDestructive ? '#FF4D4F' : '#F5F5F4';
    return '<div class="list-row" data-action-idx="' + idx + '" style="padding:14px 0;border-bottom:1px solid #222;cursor:pointer;display:flex;justify-content:space-between;align-items:center">'
      + '<span style="font-size:17px;font-weight:500;color:' + color + '">' + esc(item.label) + '</span>'
      + '</div>';
  }).join('');

  menuOverlay.innerHTML = '<div class="sheet" style="background:#141416;border:none;border-radius:20px 20px 0 0;padding:20px 20px calc(24px + var(--safe-b));max-width:480px;width:100%">'
    + '<div class="sheet-handle"></div>'
    + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">'
      + '<div style="font-size:28px;font-weight:600;color:#F5F5F4;line-height:1.15">' + esc(title) + '</div>'
      + '<button type="button" class="btn-text-action" id="closeActionMenuBtn" style="font-size:15px;color:#8A8A8E;background:none;border:none;padding:0;cursor:pointer">Close</button>'
    + '</div>'
    + '<div>' + rows + '</div>'
    + '</div>';

  document.body.appendChild(menuOverlay);
  menuOverlay.querySelector('#closeActionMenuBtn').onclick = function() { closeSheet(menuOverlay); };
  menuOverlay.onclick = function(e) { if (e.target === menuOverlay) closeSheet(menuOverlay); };

  menuOverlay.querySelectorAll('[data-action-idx]').forEach(function(row) {
    row.onclick = function() {
      var i = parseInt(row.dataset.actionIdx, 10);
      closeSheet(menuOverlay);
      if (items[i] && items[i].action) items[i].action();
    };
  });
}
