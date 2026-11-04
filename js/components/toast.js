/* Toast notifications: ephemeral toast and undo toast messaging */

import { esc } from "../lib/format.js";

export function showToast(msg, type) {
  var t = document.createElement('div');
  t.className = 'toast';
  t.style.cssText = 'position:fixed;bottom:calc(var(--nav-h) + var(--spacing-16));left:50%;transform:translateX(-50%);background:var(--surface2);border:1px solid var(--divider);color:var(--text);padding:var(--spacing-12) var(--spacing-16);border-radius:var(--r-control);font-size:var(--fs-15);font-weight:600;z-index:999;white-space:nowrap;box-shadow:none;';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(function() {
    t.style.opacity = '0';
    t.style.transition = 'opacity var(--motion-fast)';
    setTimeout(function() { t.remove(); }, 150);
  }, 2000);
}

export function showUndoToast(msg, undo) {
  var t = document.createElement('div');
  t.className = 'toast';
  t.style.cssText = 'position:fixed;bottom:calc(var(--nav-h) + var(--spacing-16));left:50%;transform:translateX(-50%);background:var(--surface2);border:1px solid var(--divider);color:var(--text);padding:var(--spacing-12) var(--spacing-16);border-radius:var(--r-control);font-size:var(--fs-15);font-weight:600;z-index:999;white-space:nowrap;box-shadow:none;display:flex;align-items:center;gap:var(--spacing-16);';
  t.innerHTML = '<span>' + esc(msg) + '</span><button type="button" class="btn-text-action toast-undo-btn" style="color:var(--text);font-size:var(--fs-15);font-weight:600;text-decoration:underline;background:none;border:none;padding:0;cursor:pointer">Undo</button>';
  document.body.appendChild(t);
  var closed = false;
  t.querySelector('button').onclick = function() {
    if (closed) return;
    closed = true;
    undo();
    t.remove();
  };
  setTimeout(function() {
    if (closed) return;
    closed = true;
    t.style.opacity = '0';
    t.style.transition = 'opacity var(--motion-fast)';
    setTimeout(function() { t.remove(); }, 150);
  }, 3500);
}
