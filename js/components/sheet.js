/* Sheet components: generic bottom sheet and action menus */

import { esc } from "../lib/format.js";

export function closeSheet(overlay) {
  if (!overlay || overlay._closing) return;
  overlay._closing = true;
  overlay.style.transition = 'opacity 200ms cubic-bezier(0.2, 0, 0, 1)';
  overlay.style.opacity = '0';
  var s = overlay.querySelector('.sheet');
  if (s) {
    s.style.transition = 'transform 200ms cubic-bezier(0.2, 0, 0, 1)';
    s.style.transform = 'translateY(100%)';
  }
  setTimeout(function() {
    if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
  }, 200);
}

export function enableSheetSwipeDismiss(overlay) {
  if (!overlay || overlay._swipeEnabled) return;
  overlay._swipeEnabled = true;
  var sheet = overlay.querySelector('.sheet');
  if (!sheet) return;
  var handle = sheet.querySelector('.sheet-handle') || sheet;
  var startY = 0, currentY = 0, tracking = false;

  function onTouchStart(e) {
    if (!e.touches || !e.touches[0]) return;
    var target = e.target;
    if (target.closest && (target.closest('input') || target.closest('textarea') || target.closest('select') || target.closest('button'))) return;
    if (sheet.scrollTop > 0 && target !== handle && !handle.contains(target)) return;
    startY = e.touches[0].clientY;
    currentY = startY;
    tracking = true;
    sheet.style.transition = 'none';
  }

  function onTouchMove(e) {
    if (!tracking || !e.touches || !e.touches[0]) return;
    currentY = e.touches[0].clientY;
    var dy = currentY - startY;
    if (dy > 0) {
      sheet.style.transform = 'translateY(' + dy + 'px)';
    } else {
      sheet.style.transform = '';
    }
  }

  function onTouchEnd() {
    if (!tracking) return;
    tracking = false;
    var dy = currentY - startY;
    sheet.style.transition = 'transform 200ms cubic-bezier(0.2, 0, 0, 1)';
    if (dy > 70) {
      var closeBtn = overlay.querySelector('#closeSettingsBtn, #closeFoodSearch, #closeExerciseModal, #closeSheetBtn, #closeActionMenuBtn');
      if (closeBtn) closeBtn.click();
      else closeSheet(overlay);
    } else {
      sheet.style.transform = '';
    }
  }

  handle.addEventListener('touchstart', onTouchStart, { passive: true });
  sheet.addEventListener('touchstart', onTouchStart, { passive: true });
  sheet.addEventListener('touchmove', onTouchMove, { passive: true });
  sheet.addEventListener('touchend', onTouchEnd, { passive: true });
  sheet.addEventListener('touchcancel', onTouchEnd, { passive: true });
}

export function openSheet(html) {
  var overlay=document.createElement('div'); overlay.className='overlay';
  overlay.innerHTML='<div class="sheet"><div class="sheet-handle"></div>'+html+'<div style="display:flex;justify-content:flex-end;margin-top:16px"><button type="button" class="btn-text-action" id="closeSheetBtn">Close</button></div></div>';
  document.body.appendChild(overlay);
  enableSheetSwipeDismiss(overlay);
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
  enableSheetSwipeDismiss(menuOverlay);
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

if (typeof window !== 'undefined' && typeof MutationObserver !== 'undefined' && document.body) {
  new MutationObserver(function(mutations) {
    for (var i = 0; i < mutations.length; i++) {
      var added = mutations[i].addedNodes;
      for (var j = 0; j < added.length; j++) {
        var node = added[j];
        if (node.nodeType === 1) {
          if (node.classList && node.classList.contains('overlay')) {
            enableSheetSwipeDismiss(node);
          } else if (node.querySelectorAll) {
            var overlays = node.querySelectorAll('.overlay');
            for (var k = 0; k < overlays.length; k++) {
              enableSheetSwipeDismiss(overlays[k]);
            }
          }
        }
      }
    }
  }).observe(document.body, { childList: true, subtree: false });
}
