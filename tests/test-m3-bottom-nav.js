/* Test Suite: Material 3 Bottom Nav (Item 6) */

import assert from 'assert';

console.log('--- Testing Material 3 Bottom Nav ---');

const { ICONS, ic } = await import('../js/lib/dom.js');

// 1. Verify filled icons are defined in ICONS
assert.ok(ICONS.home_filled, 'home_filled icon exists');
assert.ok(ICONS.chart_filled, 'chart_filled icon exists');
assert.ok(ICONS.barbell_filled, 'barbell_filled icon exists');

// 2. Verify icon markup
const homeOutline = ic('home');
const homeFilled = ic('home_filled');
assert.ok(homeOutline.includes('stroke="currentColor"'), 'home outline uses stroke');
assert.ok(homeFilled.includes('fill="currentColor"'), 'home filled uses fill');

// 3. Verify CSS rules in css/components.css
import fs from 'fs';
const css = fs.readFileSync('css/components.css', 'utf8');

assert.ok(css.includes('.nav-pill-wrap'), 'CSS defines .nav-pill-wrap');
assert.ok(css.includes('width: 56px'), 'Pill width is 56px');
assert.ok(css.includes('height: 32px'), 'Pill height is 32px');
assert.ok(css.includes('border-radius: 16px'), 'Pill border-radius is 16px');
assert.ok(css.includes('transform: scaleX(0.4)'), 'Inactive pill has scaleX(0.4)');
assert.ok(css.includes('transform: scaleX(1)'), 'Active pill has scaleX(1)');
assert.ok(!css.includes(".tab-item.active::before, .navitem.active::before {\n  content: '';"), 'Old dot indicator removed');

console.log('✓ All Material 3 Bottom Nav tests passed successfully!');

