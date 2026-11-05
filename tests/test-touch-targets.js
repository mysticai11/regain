/* Test Suite: Touch Targets >= 48dp (Item 8) */

import assert from 'assert';
import fs from 'fs';

console.log('--- Testing Touch Targets >= 48dp ---');

const css = fs.readFileSync('css/components.css', 'utf8');

// 1. Verify .btn-text-action touch target expansion
assert.ok(css.includes('.btn-text-action::after'), '.btn-text-action has pseudo-element expansion');
assert.ok(css.includes('min-height: var(--tap-min)'), '.btn-text-action enforces min-height');

// 2. Verify .icon-btn and .swap-btn meet 48dp target
assert.ok(css.includes('.icon-btn::after'), '.icon-btn has pseudo-element touch expansion');
assert.ok(css.includes('.swap-btn::after'), '.swap-btn has pseudo-element touch expansion');

// 3. Verify .range-btn meets 48dp target
assert.ok(css.includes('.range-btn::after'), '.range-btn has pseudo-element touch expansion');

// 4. Verify .week-strip-cell meets 48dp target
assert.ok(css.includes('.week-strip-cell::after'), '.week-strip-cell has pseudo-element touch expansion');

// 5. Verify .rir-cycle-text meets 48dp minimum
assert.ok(css.includes('.rir-cycle-text') && css.includes('min-width: 48px'), '.rir-cycle-text has min-width 48px');

// 6. Verify .precision-circle-tap meets 48dp minimum
assert.ok(css.includes('.precision-circle-tap') && css.includes('width: var(--tap-min)'), '.precision-circle-tap has 48px width');

console.log('✓ All Touch Targets >= 48dp verified successfully!');
