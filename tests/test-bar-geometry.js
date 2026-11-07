/* Test Suite: Pure Bar Chart Geometry Engine (Task R2-3) */

import assert from 'assert';
import { computeBarChartGeometry } from '../js/ui/barGeometry.js';

console.log('--- Testing Pure Bar Chart Geometry Engine (Task R2-3) ---');

const testDays = [
  { key: '2026-10-29', letter: 'M', value: 2800, target: 2700, isToday: false },
  { key: '2026-10-30', letter: 'T', value: 2500, target: 2700, isToday: false }, // 2500 >= 2430 (90%) -> Compliant
  { key: '2026-10-31', letter: 'W', value: 2200, target: 2700, isToday: false }, // < 2430 -> Unmet
  { key: '2026-11-01', letter: 'T', value: 3100, target: 2700, isToday: false },
  { key: '2026-11-02', letter: 'F', value: 2750, target: 2700, isToday: false },
  { key: '2026-11-03', letter: 'S', value: 2600, target: 2700, isToday: false },
  { key: '2026-11-04', letter: 'S', value: 2850, target: 2700, isToday: true }
];

const geom = computeBarChartGeometry({
  days: testDays,
  metric: 'kcal',
  target: 2700,
  width: 340,
  height: 120
});

// 1. Structure
assert.strictEqual(geom.bars.length, 7, '7 bars calculated');
assert.ok(geom.yMax >= 3100, 'yMax scales cleanly above highest data point');
assert.ok(geom.targetY > 0 && geom.targetY < 120, 'Target line Y coordinate is within bounds');

// 2. Bar Compliance Colors
assert.strictEqual(geom.bars[0].isCompliant, true, '2800 kcal >= 2700 * 0.9 is compliant');
assert.strictEqual(geom.bars[0].fill, '#C6F432', 'Compliant bar has lime fill');

assert.strictEqual(geom.bars[1].isCompliant, true, '2500 kcal >= 2430 is compliant');
assert.strictEqual(geom.bars[1].fill, '#C6F432');

assert.strictEqual(geom.bars[2].isCompliant, false, '2200 kcal is unmet');
assert.strictEqual(geom.bars[2].fill, '#F5F5F4', 'Unmet bar has off-white fill');

// 3. Today Flag
assert.strictEqual(geom.bars[6].isToday, true, 'Today bar retains isToday flag');

// 4. Protein Geometry
const protGeom = computeBarChartGeometry({
  days: [
    { key: '2026-11-04', letter: 'M', value: 160, target: 150, isToday: true }
  ],
  metric: 'protein',
  target: 150
});
assert.ok(protGeom.yMax % 25 === 0, 'Protein yMax rounds to step of 25');
assert.strictEqual(protGeom.bars[0].fill, '#C6F432', 'Protein compliant bar is lime');

console.log('✓ All Bar Chart Geometry Engine tests passed (100%)');
