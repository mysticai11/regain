/* Test Suite: Segmented Control Component (Item 1) */

import assert from 'assert';
import fs from 'fs';

console.log('--- Testing Segmented Control Component (Item 1) ---');

// Mock DOM environment for node testing
function createMockNode(tagName) {
  const listeners = {};
  const attributes = {};
  const styleProps = {};
  const children = [];

  const node = {
    tagName: tagName.toUpperCase(),
    className: '',
    id: '',
    textContent: '',
    dataset: {},
    style: {
      setProperty(k, v) { styleProps[k] = String(v); },
      getPropertyValue(k) { return styleProps[k] || ''; }
    },
    setAttribute(k, v) { attributes[k] = String(v); },
    getAttribute(k) { return attributes[k] !== undefined ? attributes[k] : null; },
    hasAttribute(k) { return attributes[k] !== undefined; },
    removeAttribute(k) { delete attributes[k]; },
    appendChild(child) {
      child.parentNode = node;
      children.push(child);
      return child;
    },
    contains(child) {
      if (child === node) return true;
      return children.some(c => c.contains ? c.contains(child) : c === child);
    },
    closest(selector) {
      if (selector === '.seg__btn' && node.className.includes('seg__btn')) return node;
      if (selector === '.seg' && node.className.includes('seg')) return node;
      return null;
    },
    addEventListener(evt, fn) {
      if (!listeners[evt]) listeners[evt] = [];
      listeners[evt].push(fn);
    },
    removeEventListener(evt, fn) {
      if (!listeners[evt]) return;
      listeners[evt] = listeners[evt].filter(f => f !== fn);
    },
    dispatchEvent(event) {
      if (!event.target) event.target = node;
      let curr = node;
      while (curr) {
        const list = (curr._getListeners && curr._getListeners(event.type)) || [];
        list.forEach(fn => fn(event));
        if (event.cancelBubble) break;
        curr = curr.parentNode;
      }
    },
    _getListeners(type) {
      return listeners[type] || [];
    },
    focus() {
      node.focused = true;
    },
    children,
    get childNodes() { return children; }
  };
  return node;
}

global.document = {
  createElement: (tag) => createMockNode(tag)
};
global.window = {};

const { createSegmented } = await import('../js/ui/segmented.js');

// 1. Structure & Initial ARIA Attributes
let changedValue = null;
let changeCallCount = 0;

const options = [
  { value: 'weeks', label: 'Past Weeks', id: 'tabWeeks' },
  { value: 'months', label: 'Past Months', id: 'tabMonths' }
];

const seg = createSegmented({
  options,
  value: 'weeks',
  ariaLabel: 'History timeframe',
  onChange: (val) => {
    changedValue = val;
    changeCallCount++;
  }
});

const el = seg.el;
assert.strictEqual(el.className, 'seg', 'Element has class .seg');
assert.strictEqual(el.getAttribute('role'), 'tablist', 'Element has role="tablist"');
assert.strictEqual(el.getAttribute('aria-label'), 'History timeframe', 'Element has correct aria-label');
assert.ok(el.hasAttribute('data-gesture-owner'), 'Element has data-gesture-owner attribute');
assert.strictEqual(el.style.getPropertyValue('--n'), '2', 'Element sets --n to 2');
assert.strictEqual(el.style.getPropertyValue('--i'), '0', 'Initial selected index --i is 0');

const thumb = el.children[0];
assert.strictEqual(thumb.className, 'seg__thumb', 'First child is seg__thumb');
assert.strictEqual(thumb.getAttribute('aria-hidden'), 'true', 'Thumb has aria-hidden="true"');

const btn1 = el.children[1];
const btn2 = el.children[2];
assert.strictEqual(btn1.className, 'seg__btn', 'Option 1 has class seg__btn');
assert.strictEqual(btn1.getAttribute('role'), 'tab', 'Option 1 has role="tab"');
assert.strictEqual(btn1.getAttribute('aria-selected'), 'true', 'Option 1 aria-selected is true');
assert.strictEqual(btn1.getAttribute('tabindex'), '0', 'Option 1 tabindex is 0');
assert.strictEqual(btn1.id, 'tabWeeks', 'Option 1 preserves custom id');
assert.strictEqual(btn1.textContent, 'Past Weeks', 'Option 1 has correct label');

assert.strictEqual(btn2.getAttribute('aria-selected'), 'false', 'Option 2 aria-selected is false');
assert.strictEqual(btn2.getAttribute('tabindex'), '-1', 'Option 2 tabindex is -1');
assert.strictEqual(btn2.id, 'tabMonths', 'Option 2 preserves custom id');
assert.strictEqual(btn2.textContent, 'Past Months', 'Option 2 has correct label');
console.log('✓ Test 1: DOM structure, custom IDs, and initial ARIA attributes pass');

// 2. User Click Interaction
btn2.dispatchEvent({ type: 'click', target: btn2 });
assert.strictEqual(changedValue, 'months', 'Clicking Option 2 triggers onChange with "months"');
assert.strictEqual(changeCallCount, 1, 'onChange fired exactly once');
assert.strictEqual(el.style.getPropertyValue('--i'), '1', 'Selected index --i updated to 1');
assert.strictEqual(btn1.getAttribute('aria-selected'), 'false', 'Option 1 aria-selected now false');
assert.strictEqual(btn1.getAttribute('tabindex'), '-1', 'Option 1 tabindex now -1');
assert.strictEqual(btn2.getAttribute('aria-selected'), 'true', 'Option 2 aria-selected now true');
assert.strictEqual(btn2.getAttribute('tabindex'), '0', 'Option 2 tabindex now 0');

// 3. Idempotency: clicking already-selected button
btn2.dispatchEvent({ type: 'click', target: btn2 });
assert.strictEqual(changeCallCount, 1, 'Clicking already-selected option does NOT fire onChange again');
console.log('✓ Test 2: User click updates state and demonstrates idempotency');

// 4. Keyboard Navigation (Roving Tabindex)
btn1.focused = false;
btn2.focused = false;

// ArrowLeft from index 1 -> index 0
let prevented = false;
el.dispatchEvent({
  type: 'keydown',
  key: 'ArrowLeft',
  preventDefault: () => { prevented = true; }
});
assert.ok(prevented, 'ArrowLeft calls preventDefault()');
assert.strictEqual(changedValue, 'weeks', 'ArrowLeft moves selection to "weeks"');
assert.strictEqual(changeCallCount, 2, 'onChange fired on keyboard navigation');
assert.strictEqual(el.style.getPropertyValue('--i'), '0', '--i updated to 0');
assert.strictEqual(btn1.getAttribute('aria-selected'), 'true', 'Option 1 is selected');
assert.strictEqual(btn1.getAttribute('tabindex'), '0', 'Option 1 roving tabindex is 0');
assert.strictEqual(btn2.getAttribute('tabindex'), '-1', 'Option 2 roving tabindex is -1');
assert.ok(btn1.focused, 'Option 1 received focus');

// ArrowLeft from index 0 -> wraps around to index 1
el.dispatchEvent({
  type: 'keydown',
  key: 'ArrowLeft',
  preventDefault: () => {}
});
assert.strictEqual(changedValue, 'months', 'ArrowLeft wraps to "months"');
assert.strictEqual(el.style.getPropertyValue('--i'), '1', '--i wraps to 1');

// ArrowRight from index 1 -> wraps around to index 0
el.dispatchEvent({
  type: 'keydown',
  key: 'ArrowRight',
  preventDefault: () => {}
});
assert.strictEqual(changedValue, 'weeks', 'ArrowRight wraps back to "weeks"');
assert.strictEqual(el.style.getPropertyValue('--i'), '0', '--i wraps to 0');

// Home and End keys
el.dispatchEvent({
  type: 'keydown',
  key: 'End',
  preventDefault: () => {}
});
assert.strictEqual(changedValue, 'months', 'End moves to last option');

el.dispatchEvent({
  type: 'keydown',
  key: 'Home',
  preventDefault: () => {}
});
assert.strictEqual(changedValue, 'weeks', 'Home moves to first option');
console.log('✓ Test 3: Keyboard roving tabindex and wrapping pass');

// 5. Programmatic setValue()
const prevCallCount = changeCallCount;
seg.setValue('months');
assert.strictEqual(el.style.getPropertyValue('--i'), '1', 'setValue updates --i to 1');
assert.strictEqual(btn2.getAttribute('aria-selected'), 'true', 'setValue updates aria-selected');
assert.strictEqual(btn2.getAttribute('tabindex'), '0', 'setValue updates tabindex');
assert.strictEqual(changeCallCount, prevCallCount, 'Programmatic setValue NEVER fires onChange');

// Invalid value is safely ignored
seg.setValue('unknown_tab');
assert.strictEqual(el.style.getPropertyValue('--i'), '1', 'Invalid setValue ignored');
assert.strictEqual(changeCallCount, prevCallCount, 'onChange not fired on invalid setValue');
console.log('✓ Test 4: Programmatic setValue is silent and rejects unknown values');

// 6. destroy() Cleanup
seg.destroy();
const callCountBeforeDestroyClicks = changeCallCount;
btn1.dispatchEvent({ type: 'click', target: btn1 });
el.dispatchEvent({ type: 'keydown', key: 'ArrowRight', preventDefault: () => {} });
assert.strictEqual(changeCallCount, callCountBeforeDestroyClicks, 'After destroy(), events do not fire onChange');
console.log('✓ Test 5: destroy() cleanly unbinds event listeners');

// 7. CSS Rules Verification
const componentsCss = fs.readFileSync('css/components.css', 'utf8');
assert.ok(componentsCss.includes('.seg {'), 'css/components.css defines .seg');
assert.ok(componentsCss.includes('touch-action: pan-y;'), '.seg defines touch-action: pan-y');
assert.ok(componentsCss.includes('.seg__thumb {'), 'css/components.css defines .seg__thumb');
assert.ok(componentsCss.includes('width: calc((100% - 8px) / var(--n'), '.seg__thumb calculates width via --n');
assert.ok(componentsCss.includes('transform: translateX(calc(var(--i'), '.seg__thumb translates via --i');
assert.ok(componentsCss.includes('prefers-reduced-motion'), 'Reduced motion media query present');
assert.ok(componentsCss.includes('.seg__btn {'), 'css/components.css defines .seg__btn');
assert.ok(componentsCss.includes('.seg__btn:focus-visible {'), 'Focus visible ring defined');
console.log('✓ Test 6: CSS tokens, gesture safety, and motion rules verified');

console.log('\n=============================================');
console.log(' ALL SEGMENTED CONTROL TESTS PASSED (100%) ');
console.log('=============================================\n');
