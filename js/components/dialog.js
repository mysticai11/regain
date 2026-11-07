/* In-app Material-style dialogs: confirmDialog, promptDialog, alertDialog */

import { esc } from "../lib/format.js";
import { triggerHaptic } from "../lib/dom.js";

var activeDialog = null;

export function confirmDialog(options) {
  options = options || {};
  if (typeof document === 'undefined') {
    if (typeof globalThis.confirm === 'function') {
      return Promise.resolve(globalThis.confirm(options.message || options.title || ''));
    }
    return Promise.resolve(true);
  }
  if (activeDialog) return Promise.resolve(false);

  return new Promise(function(resolve) {
    var title = options.title || 'Confirm';
    var message = options.message || '';
    var confirmLabel = options.confirmLabel || (options.destructive ? 'Delete' : 'Confirm');
    var cancelLabel = options.cancelLabel !== undefined ? options.cancelLabel : 'Cancel';
    var isDestructive = !!options.destructive;

    var overlay = document.createElement('div');
    overlay.className = 'overlay dialog-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'dialogTitle');

    var cancelBtnHTML = cancelLabel ? '<button type="button" class="dialog-action-btn dialog-action-cancel close-btn" id="dialogCancelBtn">' + esc(cancelLabel) + '</button>' : '';

    overlay.innerHTML = '<div class="dialog-surface">'
      + '<h3 class="dialog-title" id="dialogTitle">' + esc(title) + '</h3>'
      + (message ? '<p class="dialog-message">' + esc(message).replace(/\n/g, '<br>') + '</p>' : '')
      + '<div class="dialog-actions">'
        + cancelBtnHTML
        + '<button type="button" class="dialog-action-btn dialog-action-confirm ' + (isDestructive ? 'is-destructive' : '') + '" id="dialogConfirmBtn">' + esc(confirmLabel) + '</button>'
      + '</div>'
    + '</div>';

    var closed = false;
    function cleanup(result) {
      if (closed) return;
      closed = true;
      activeDialog = null;
      document.removeEventListener('keydown', onKeyDown);
      overlay.classList.add('is-closing');
      setTimeout(function() {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        resolve(result);
      }, 200);
    }

    function onKeyDown(e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        triggerHaptic('light');
        cleanup(false);
      } else if (e.key === 'Tab') {
        var focusables = overlay.querySelectorAll('button:not([disabled])');
        if (!focusables.length) return;
        var first = focusables[0];
        var last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          last.focus(); e.preventDefault();
        } else if (!e.shiftKey && document.activeElement === last) {
          first.focus(); e.preventDefault();
        }
      }
    }

    document.addEventListener('keydown', onKeyDown);

    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) {
        triggerHaptic('light');
        cleanup(false);
      }
    });

    var cancelBtn = overlay.querySelector('#dialogCancelBtn');
    if (cancelBtn) {
      cancelBtn.onclick = function() {
        triggerHaptic('light');
        cleanup(false);
      };
    }

    var confirmBtn = overlay.querySelector('#dialogConfirmBtn');
    if (confirmBtn) {
      confirmBtn.onclick = function() {
        triggerHaptic(isDestructive ? 'medium' : 'selection');
        cleanup(true);
      };
    }

    document.body.appendChild(overlay);
    activeDialog = overlay;
    setTimeout(function() {
      if (confirmBtn && typeof confirmBtn.focus === 'function') confirmBtn.focus();
    }, 40);
  });
}

export function promptDialog(options) {
  options = options || {};
  if (typeof document === 'undefined') {
    if (typeof globalThis.prompt === 'function') {
      return Promise.resolve(globalThis.prompt(options.message || options.title || '', options.defaultValue || ''));
    }
    return Promise.resolve(options.defaultValue != null ? String(options.defaultValue) : '');
  }
  if (activeDialog) return Promise.resolve(null);

  return new Promise(function(resolve) {
    var title = options.title || 'Enter Value';
    var message = options.message || '';
    var defaultValue = options.defaultValue != null ? String(options.defaultValue) : '';
    var placeholder = options.placeholder || '';
    var inputType = options.inputType || 'text';
    var confirmLabel = options.confirmLabel || 'OK';
    var cancelLabel = options.cancelLabel !== undefined ? options.cancelLabel : 'Cancel';

    var overlay = document.createElement('div');
    overlay.className = 'overlay dialog-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'dialogTitle');

    overlay.innerHTML = '<div class="dialog-surface">'
      + '<h3 class="dialog-title" id="dialogTitle">' + esc(title) + '</h3>'
      + (message ? '<p class="dialog-message">' + esc(message).replace(/\n/g, '<br>') + '</p>' : '')
      + '<input type="' + esc(inputType) + '" class="dialog-input" id="dialogPromptInput" value="' + esc(defaultValue) + '" placeholder="' + esc(placeholder) + '">'
      + '<div class="dialog-actions">'
        + '<button type="button" class="dialog-action-btn dialog-action-cancel close-btn" id="dialogCancelBtn">' + esc(cancelLabel) + '</button>'
        + '<button type="button" class="dialog-action-btn dialog-action-confirm" id="dialogConfirmBtn">' + esc(confirmLabel) + '</button>'
      + '</div>'
    + '</div>';

    var closed = false;
    var input = overlay.querySelector('#dialogPromptInput');

    function cleanup(result) {
      if (closed) return;
      closed = true;
      activeDialog = null;
      document.removeEventListener('keydown', onKeyDown);
      overlay.classList.add('is-closing');
      setTimeout(function() {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        resolve(result);
      }, 200);
    }

    function onKeyDown(e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        triggerHaptic('light');
        cleanup(null);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        triggerHaptic('selection');
        cleanup(input ? input.value : '');
      } else if (e.key === 'Tab') {
        var focusables = overlay.querySelectorAll('button:not([disabled]), input:not([disabled])');
        if (!focusables.length) return;
        var first = focusables[0];
        var last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          last.focus(); e.preventDefault();
        } else if (!e.shiftKey && document.activeElement === last) {
          first.focus(); e.preventDefault();
        }
      }
    }

    document.addEventListener('keydown', onKeyDown);

    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) {
        triggerHaptic('light');
        cleanup(null);
      }
    });

    var cancelBtn = overlay.querySelector('#dialogCancelBtn');
    if (cancelBtn) {
      cancelBtn.onclick = function() {
        triggerHaptic('light');
        cleanup(null);
      };
    }

    var confirmBtn = overlay.querySelector('#dialogConfirmBtn');
    if (confirmBtn) {
      confirmBtn.onclick = function() {
        triggerHaptic('selection');
        cleanup(input ? input.value : '');
      };
    }

    document.body.appendChild(overlay);
    activeDialog = overlay;
    setTimeout(function() {
      if (input && typeof input.focus === 'function') {
        input.focus();
        if (typeof input.select === 'function') input.select();
      }
    }, 50);
  });
}

export function alertDialog(options) {
  options = options || {};
  return confirmDialog({
    title: options.title || 'Notice',
    message: options.message || '',
    confirmLabel: options.confirmLabel || 'OK',
    cancelLabel: ''
  });
}

if (typeof window !== 'undefined') {
  window.confirmDialog = confirmDialog;
  window.promptDialog = promptDialog;
  window.alertDialog = alertDialog;
}
