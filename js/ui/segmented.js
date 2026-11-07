/* UI Component: Sliding Segmented Control (Item 1) */

import { triggerHaptic } from "../lib/dom.js";

/**
 * Creates an accessible sliding segmented control.
 *
 * @param {Object} config
 * @param {Array<{value: string, label: string, id?: string}>} config.options
 * @param {string} [config.value]
 * @param {Function} [config.onChange] Called ONLY on user interaction, NOT on programmatic setValue
 * @param {string} [config.ariaLabel='Options']
 * @returns {{ el: HTMLElement, setValue: Function, destroy: Function, getValue: Function }}
 */
export function createSegmented({
  options = [],
  value,
  onChange,
  ariaLabel = 'Options'
} = {}) {
  if (!Array.isArray(options) || options.length === 0) {
    throw new Error('createSegmented requires at least one option');
  }

  var container = document.createElement('div');
  container.className = 'seg';
  if (typeof container.setAttribute === 'function') {
    container.setAttribute('role', 'tablist');
    if (ariaLabel) container.setAttribute('aria-label', ariaLabel);
    container.setAttribute('data-gesture-owner', '');
  }
  if (container.style && typeof container.style.setProperty === 'function') {
    container.style.setProperty('--n', String(options.length));
  }

  var thumb = document.createElement('span');
  thumb.className = 'seg__thumb';
  if (typeof thumb.setAttribute === 'function') {
    thumb.setAttribute('aria-hidden', 'true');
  }
  if (typeof container.appendChild === 'function') {
    container.appendChild(thumb);
  }

  var buttons = [];
  var currentValue = (value !== undefined && options.some(function(o) { return o.value === value; }))
    ? value
    : options[0].value;

  function getIndex(val) {
    for (var i = 0; i < options.length; i++) {
      if (options[i].value === val) return i;
    }
    return 0;
  }

  function applySelection(val, focusBtn) {
    var idx = getIndex(val);
    currentValue = options[idx].value;
    if (container.style && typeof container.style.setProperty === 'function') {
      container.style.setProperty('--i', String(idx));
    }

    buttons.forEach(function(btn, i) {
      var isSelected = (i === idx);
      if (typeof btn.setAttribute === 'function') {
        btn.setAttribute('aria-selected', isSelected ? 'true' : 'false');
        btn.setAttribute('tabindex', isSelected ? '0' : '-1');
      }
      if (btn.classList && typeof btn.classList.toggle === 'function') {
        btn.classList.toggle('active', isSelected);
      }
      if (isSelected && focusBtn && typeof btn.focus === 'function') {
        btn.focus();
      }
    });
  }

  options.forEach(function(opt, index) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'seg__btn';
    if (typeof btn.setAttribute === 'function') {
      btn.setAttribute('role', 'tab');
    }
    if (btn.dataset) {
      btn.dataset.value = String(opt.value);
      btn.dataset.index = String(index);
    }
    btn.textContent = opt.label;
    if (opt.id) {
      btn.id = opt.id;
    }
    buttons.push(btn);
    if (typeof container.appendChild === 'function') {
      container.appendChild(btn);
    }
  });

  applySelection(currentValue, false);

  function handleClick(e) {
    var target = e.target;
    var btn = target && typeof target.closest === 'function' ? target.closest('.seg__btn') : null;
    if (!btn || (typeof container.contains === 'function' && !container.contains(btn))) return;

    var selectedVal = (btn.dataset && btn.dataset.value) || btn.value;
    if (selectedVal === currentValue) return;

    applySelection(selectedVal, false);
    triggerHaptic();

    if (typeof onChange === 'function') {
      onChange(selectedVal);
    }
  }

  function handleKeyDown(e) {
    if (!e || !e.key) return;
    var key = e.key;
    var curIdx = getIndex(currentValue);
    var targetIdx = -1;

    if (key === 'ArrowLeft' || key === 'ArrowUp') {
      targetIdx = (curIdx - 1 + options.length) % options.length;
    } else if (key === 'ArrowRight' || key === 'ArrowDown') {
      targetIdx = (curIdx + 1) % options.length;
    } else if (key === 'Home') {
      targetIdx = 0;
    } else if (key === 'End') {
      targetIdx = options.length - 1;
    }

    if (targetIdx !== -1 && targetIdx !== curIdx) {
      if (typeof e.preventDefault === 'function') e.preventDefault();
      var newVal = options[targetIdx].value;
      applySelection(newVal, true);
      triggerHaptic();

      if (typeof onChange === 'function') {
        onChange(newVal);
      }
    }
  }

  if (typeof container.addEventListener === 'function') {
    container.addEventListener('click', handleClick);
    container.addEventListener('keydown', handleKeyDown);
  }

  return {
    el: container,
    getValue: function() {
      return currentValue;
    },
    setValue: function(newVal) {
      var exists = options.some(function(o) { return o.value === newVal; });
      if (!exists || newVal === currentValue) return;
      applySelection(newVal, false);
    },
    destroy: function() {
      if (typeof container.removeEventListener === 'function') {
        container.removeEventListener('click', handleClick);
        container.removeEventListener('keydown', handleKeyDown);
      }
      buttons.length = 0;
    }
  };
}
