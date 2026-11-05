/* Test Suite: Material Ripple (Item 3) */

import assert from 'assert';

console.log('--- Testing Material Ripple Effect ---');

let pointerDownHandler = null;
let reducedMotion = false;

global.window = {
  matchMedia: (query) => ({
    matches: query.includes('prefers-reduced-motion') ? reducedMotion : false
  })
};

global.document = {
  _rippleInitialized: false,
  addEventListener: (type, handler) => {
    if (type === 'pointerdown') pointerDownHandler = handler;
  }
};

const { initMaterialRipple } = await import('../js/lib/dom.js');
initMaterialRipple();

assert.ok(pointerDownHandler, 'pointerdown listener registered on document');

// 1. Test ripple created on a secondary button
function createMockElement(className, width, height) {
  const children = [];
  const el = {
    className: className,
    classList: {
      contains: (c) => className.split(' ').includes(c)
    },
    getBoundingClientRect: () => ({ left: 50, top: 100, width: width, height: height }),
    appendChild: (child) => { children.push(child); },
    closest: (sel) => {
      const parts = sel.split(',').map(s => s.trim().replace('.', ''));
      for (const p of parts) {
        if (p === 'btn:not(.btn-primary)' && className.includes('btn') && !className.includes('btn-primary')) return el;
        if (className.includes(p)) return el;
      }
      return null;
    },
    children: children
  };
  return el;
}

global.document.createElement = (tag) => {
  const listeners = {};
  return {
    tagName: tag.toUpperCase(),
    className: '',
    style: {},
    addEventListener: (evt, fn) => { listeners[evt] = fn; },
    remove: function() { this.removed = true; },
    triggerAnimationEnd: function() { if (listeners['animationend']) listeners['animationend'](); }
  };
};

const secondaryBtn = createMockElement('btn btn-secondary ripple', 80, 48);
pointerDownHandler({
  target: secondaryBtn,
  clientX: 90,
  clientY: 120
});

assert.strictEqual(secondaryBtn.children.length, 1, 'Ripple span created on secondary button');
const rip = secondaryBtn.children[0];
assert.strictEqual(rip.className, 'rip', 'Has rip class');
assert.strictEqual(rip.style.width, '160px', 'Diameter is 2 * max(width, height) = 2 * 80 = 160px');
assert.strictEqual(rip.style.height, '160px', 'Height matches diameter');

// Test cleanup on animationend
rip.triggerAnimationEnd();
assert.strictEqual(rip.removed, true, 'Ripple removed on animationend');

// 2. Test ripple NOT created on primary lime button
const primaryBtn = createMockElement('btn btn-primary', 120, 48);
pointerDownHandler({
  target: primaryBtn,
  clientX: 90,
  clientY: 120
});
assert.strictEqual(primaryBtn.children.length, 0, 'No ripple created on btn-primary (keeps scale(.97) press)');

// 3. Test prefers-reduced-motion: reduce
reducedMotion = true;
const anotherBtn = createMockElement('btn ripple', 60, 40);
pointerDownHandler({
  target: anotherBtn,
  clientX: 70,
  clientY: 110
});
assert.strictEqual(anotherBtn.children.length, 0, 'No ripple created when prefers-reduced-motion is true');

console.log('✓ All Material Ripple tests passed successfully!');

