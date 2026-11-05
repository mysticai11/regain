/* Test Suite: Calorie / Protein Count-Up & Bar Easing (Item 4) */

import assert from 'assert';

console.log('--- Testing Calorie/Protein Count-Up & Bar Easing ---');

let rAFQueue = [];
let simulatedTime = 0;
let reducedMotion = false;

global.window = {
  matchMedia: (query) => ({
    matches: query.includes('prefers-reduced-motion') ? reducedMotion : false
  })
};

global.requestAnimationFrame = (cb) => {
  rAFQueue.push(() => {
    simulatedTime += 200;
    cb(simulatedTime);
  });
  return rAFQueue.length;
};

const { animateNumber } = await import('../js/lib/dom.js');

function createMockElement(id, initialVal) {
  return {
    id: id,
    textContent: initialVal || '',
    dataset: {}
  };
}

// 1. Initial animation from 0 to 2,500
const el1 = createMockElement('testHeroCal', '0');
simulatedTime = 100;
animateNumber(el1, 0, 2500, { duration: 600 });
assert.ok(rAFQueue.length > 0, 'requestAnimationFrame was queued for count-up');

// Run queued frames to completion
while (rAFQueue.length > 0) {
  const step = rAFQueue.shift();
  step();
}
assert.strictEqual(el1.textContent, '2,500', 'Final value formatted with comma');

// 2. Re-render with same value (2,500) -> should NOT animate again (lastShown cache)
rAFQueue = [];
animateNumber(el1, 0, 2500, { duration: 600 });
assert.strictEqual(rAFQueue.length, 0, 'No rAF scheduled when value did not change');
assert.strictEqual(el1.textContent, '2,500', 'Text remained 2,500');

// 3. Re-render with changed value (2,800) -> should animate from previous 2,500
animateNumber(el1, 0, 2800, { duration: 600 });
assert.ok(rAFQueue.length > 0, 'rAF scheduled when value changed to 2,800');
while (rAFQueue.length > 0) {
  const step = rAFQueue.shift();
  step();
}
assert.strictEqual(el1.textContent, '2,800', 'Updated to 2,800');

// 4. prefers-reduced-motion: reduce -> immediate update without rAF
reducedMotion = true;
const elReduced = createMockElement('testReducedProt', '0');
rAFQueue = [];
animateNumber(elReduced, 0, 160, { duration: 600 });
assert.strictEqual(rAFQueue.length, 0, 'Zero rAF when prefers-reduced-motion is active');
assert.strictEqual(elReduced.textContent, '160', 'Immediately sets value without animation');

console.log('✓ All Calorie/Protein Count-Up & Bar Easing tests passed successfully!');
