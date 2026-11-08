/* Bodyweight Progress Tab: Glassmorphic weight input pill, subtle log cards, and weight actions */

import { profile } from "../../state.js";
import { dayRecord, saveDayRecord, sv } from "../../storage.js";
import { esc } from "../../lib/format.js";
import { showToast } from "../../components/toast.js";
import { triggerHaptic } from "../../lib/dom.js";
import { confirmDialog, promptDialog } from "../../components/dialog.js";

/**
 * Modern glassmorphic pill-shaped input container for logging weight.
 */
export function weightInputPillHTML() {
  return '<div class="field weight-input-pill" style="margin-top:16px;background:var(--surface2);border-radius:9999px;border:1px solid var(--hairline);padding:4px 6px 4px 20px;display:flex;align-items:center;justify-content:space-between;box-sizing:border-box">'
    + '<input id="progressWeight" type="number" step="0.1" min="20" max="300" placeholder="0.0" inputmode="decimal" style="background:transparent;border:none;outline:none;font-size:var(--fs-24, 24px);font-weight:700;color:var(--text);flex:1;min-width:0;padding:0;margin:0;-webkit-appearance:none;appearance:none" aria-label="Weight in kg">'
    + '<div style="display:flex;align-items:center;gap:12px;flex-shrink:0">'
      + '<span class="field-unit">kg</span>'
      + '<button type="button" class="btn btn-primary field-btn weight-save-pill-btn" id="saveProgressWeight" aria-label="Save weight" style="width:36px;min-width:36px;height:36px;min-height:36px;border-radius:50%;background:var(--accent-primary);border:none;color:#FFFFFF;display:flex;align-items:center;justify-content:center;cursor:pointer;padding:0;box-shadow:var(--glow-violet, 0 0 15px rgba(139,92,246,0.4));flex-shrink:0">'
        + '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>'
      + '</button>'
    + '</div>'
  + '</div>';
}

/**
 * Builds modern cards list for logged weight entries with swipe-to-delete and double-tap to edit.
 */
export function weightEntriesHTML(entries) {
  if (!entries || !entries.length) {
    return '<div style="padding:16px 0;font-size:15px;color:var(--text-secondary);text-align:center">No weight entries logged yet</div>';
  }
  var rows = entries.slice().reverse().map(function(e) {
    var d = new Date(e.createdAt || (e.dayKey + 'T12:00:00'));
    var dateLabel = !isNaN(d.getTime()) ? d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) : (e.dayKey || '');
    var timeLabel = (e.createdAt && e.createdAt.includes('T')) ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
    var dateDisplay = (dateLabel + (timeLabel ? ' · ' + timeLabel : '')).toUpperCase();
    var wNum = Number(e.weight);
    var wStr = !isNaN(wNum) ? wNum.toFixed(1) : String(e.weight);
    return '<div class="swipe-container" style="position:relative;overflow:hidden;border-radius:12px;margin-bottom:8px">'
      + '<div class="delete-action" style="position:absolute;inset:0;background:var(--danger);display:flex;align-items:center;justify-content:flex-end;border-radius:12px;z-index:1">'
        + '<button type="button" class="btn-swipe-delete" data-delete-weight="' + esc(e.id) + '" aria-label="Delete weight" style="background:none;border:none;color:#FFFFFF;cursor:pointer;padding:0 24px;display:flex;align-items:center;justify-content:center;height:100%;font-size:0;line-height:0">'
          + '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>Delete</button>'
      + '</div>'
      + '<div class="swipe-content weight-entry-card" data-weight-id="' + esc(e.id) + '" style="position:relative;z-index:2;background:var(--surface2);border-radius:12px;padding:14px 18px;border:1px solid var(--hairline);transition:transform 0.25s cubic-bezier(0.2,0,0,1);cursor:pointer;user-select:none;display:flex;justify-content:space-between;align-items:center">'
        + '<div>'
          + '<div class="tabnum" style="font-size:var(--fs-20, 20px);font-weight:700;color:var(--text);line-height:1.2">' + wStr + ' <span style="font-size:15px;color:var(--text-secondary);font-weight:400">kg</span></div>'
          + '<div style="font-size:11px;font-weight:600;color:var(--text-secondary);letter-spacing:0.08em;text-transform:uppercase;margin-top:4px">' + esc(dateDisplay) + '</div>'
        + '</div>'
        + '<div style="display:flex;align-items:center;color:var(--text-dim);opacity:0.6">'
          + '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>'
        + '</div>'
      + '</div>'
    + '</div>';
  }).join('');
  return '<div style="margin-top:24px">'
    + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">'
      + '<span class="t-label">WEIGHT LOGS</span>'
      + '<span class="t-micro tabnum" style="color:var(--text-secondary)">' + entries.length + (entries.length === 1 ? ' entry' : ' entries') + '</span>'
    + '</div>'
    + '<div style="max-height:360px;overflow-y:auto;padding-right:2px">' + rows + '</div>'
  + '</div>';
}

export function bindWeightListGestures(container) {
  if (!container) return;
  var cards = container.querySelectorAll('.weight-entry-card');
  cards.forEach(function(card) {
    var id = card.dataset.weightId;
    if (!id) return;

    card.addEventListener('dblclick', function(e) {
      if (e && e.preventDefault) e.preventDefault();
      editWeightEntry(id);
    });

    var startX = 0, currentX = 0, isSwiping = false, lastTapTime = 0;

    card.addEventListener('touchstart', function(e) {
      if (e.touches.length !== 1) return;
      var now = Date.now();
      if (now - lastTapTime < 350) {
        if (e.preventDefault) e.preventDefault();
        lastTapTime = 0;
        editWeightEntry(id);
        return;
      }
      lastTapTime = now;
      startX = e.touches[0].clientX;
      currentX = startX;
      isSwiping = false;
      card.style.transition = 'none';
    }, { passive: true });

    card.addEventListener('touchmove', function(e) {
      if (e.touches.length !== 1) return;
      currentX = e.touches[0].clientX;
      var deltaX = currentX - startX;
      if (deltaX < -10) {
        isSwiping = true;
        var clamped = Math.max(-120, deltaX);
        card.style.transform = 'translateX(' + clamped + 'px)';
      } else if (deltaX > 0 && isSwiping) {
        card.style.transform = 'translateX(0px)';
      }
    }, { passive: true });

    card.addEventListener('touchend', function() {
      card.style.transition = 'transform 0.25s cubic-bezier(0.2,0,0,1)';
      var deltaX = currentX - startX;
      if (deltaX < -110) {
        card.style.transform = 'translateX(-100%)';
        setTimeout(function() {
          deleteWeightEntry(id, true);
        }, 180);
      } else if (deltaX < -45) {
        card.style.transform = 'translateX(-80px)';
      } else {
        card.style.transform = 'translateX(0px)';
      }
    });
  });

  container.querySelectorAll('[data-delete-weight]').forEach(function(btn) {
    btn.onclick = function(e) {
      if (e && e.stopPropagation) e.stopPropagation();
      deleteWeightEntry(btn.dataset.deleteWeight);
    };
  });
}

export async function editWeightEntry(id) {
  var entries = (profile && Array.isArray(profile.weightEntries)) ? profile.weightEntries : [];
  var entry = entries.find(function(e){ return String(e.id) === String(id); });
  var curW = entry ? entry.weight : null;
  var dKey = (entry && entry.dayKey) || (typeof id === 'string' && id.startsWith('legacy_') ? id.replace('legacy_', '') : null);
  if (!curW && dKey) curW = (dayRecord(dKey) || {}).weight;
  if (curW == null) return;
  var val = await promptDialog({ title: 'Edit Bodyweight', message: 'Enter bodyweight in kg:', defaultValue: curW, inputType: 'number', confirmLabel: 'Save' });
  if (val === null) return;
  var w = parseFloat(val); if (!w || isNaN(w) || w < 20 || w > 300) { showToast('Enter a valid weight', 'warn'); return; }
  if (entry) { entry.weight = w; }
  else if (dKey) { profile.weightEntries = profile.weightEntries || []; profile.weightEntries.push({ id: id, dayKey: dKey, weight: w, createdAt: dKey + 'T12:00:00' }); }
  if (dKey) { var rec = dayRecord(dKey); rec.weight = w; saveDayRecord(dKey, rec); }
  sv('rg_profile', profile); triggerHaptic(); showToast('Weight updated', 'ok');
  if (typeof window.renderProgressSimple === 'function') window.renderProgressSimple();
}

export function deleteWeightEntry(id, skipConfirm) {
  var doDelete = function() {
    var entries = (profile && profile.weightEntries) || [];
    var target = entries.find(function(e){ return String(e.id) === String(id); });
    profile.weightEntries = entries.filter(function(e){ return String(e.id) !== String(id); });
    var dKey = (target && target.dayKey) || (typeof id === 'string' && id.startsWith('legacy_') ? id.replace('legacy_', '') : null);
    if (dKey) {
      var sameDay = profile.weightEntries.filter(function(e){ return e.dayKey === dKey; }).sort(function(a,b){ return String(a.createdAt).localeCompare(String(b.createdAt)); });
      var rec = dayRecord(dKey); rec.weight = sameDay.length ? sameDay[sameDay.length - 1].weight : null; saveDayRecord(dKey, rec);
    }
    sv('rg_profile', profile); triggerHaptic(); showToast('Weight log deleted', 'ok');
    if (typeof window.renderProgressSimple === 'function') window.renderProgressSimple();
  };
  if (skipConfirm || (typeof process !== 'undefined' && typeof confirm === 'function' && confirm())) {
    doDelete(); return Promise.resolve(true);
  }
  return confirmDialog({ title: 'Delete Weight Log?', message: 'Are you sure you want to delete this weight entry?', confirmLabel: 'Delete', destructive: true }).then(function(ok) { if (ok) doDelete(); return ok; });
}
