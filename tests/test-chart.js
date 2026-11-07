/* Test Suite: Chart Geometry & Monotone Spline (Item 2) */

import assert from 'assert';
import { computeChartGeometry } from '../js/ui/chartGeometry.js';

console.log('--- Testing Chart Geometry & Fritsch-Carlson Spline (Item 2) ---');

// a) Monotonicity test: input [10, 12, 12, 10] must never exceed 12
const dayMs = 86400000;
const monoData = [
  { t: 1000 + 0 * dayMs, v: 10 },
  { t: 1000 + 1 * dayMs, v: 12 },
  { t: 1000 + 2 * dayMs, v: 12 },
  { t: 1000 + 3 * dayMs, v: 10 }
];
const monoGeom = computeChartGeometry(monoData, { width: 400, height: 200 });
assert.ok(!monoGeom.empty, 'Geometry computed for monotonicity test');
assert.ok(monoGeom.linePath.includes('C'), 'Line path uses cubic bezier segments');

// Parse cubic bezier segments and sample them at 50 sub-steps per segment
// Bezier formula: B(u) = (1-u)^3*P0 + 3(1-u)^2*u*C1 + 3(1-u)*u^2*C2 + u^3*P1
const cubicRegex = /C\s+([\d.-]+)\s+([\d.-]+),\s+([\d.-]+)\s+([\d.-]+),\s+([\d.-]+)\s+([\d.-]+)/g;
let match;
let segIdx = 0;
let minYVal = Infinity; // In SVG, lower pixel y = higher data value

while ((match = cubicRegex.exec(monoGeom.linePath)) !== null) {
  const p0 = monoGeom.points[segIdx];
  const c1x = parseFloat(match[1]);
  const c1y = parseFloat(match[2]);
  const c2x = parseFloat(match[3]);
  const c2y = parseFloat(match[4]);
  const p1x = parseFloat(match[5]);
  const p1y = parseFloat(match[6]);

  for (let step = 0; step <= 50; step++) {
    const u = step / 50;
    const inv = 1 - u;
    const yVal = inv * inv * inv * p0.y +
                 3 * inv * inv * u * c1y +
                 3 * inv * u * u * c2y +
                 u * u * u * p1y;
    if (yVal < minYVal) minYVal = yVal;
  }
  segIdx++;
}

// Peak value 12 pixel Y:
const peakY = monoGeom.points[1].y;
// In SVG, no sampled y can be higher (smaller number) than peakY (with 0.05px rounding tolerance)
assert.ok(minYVal >= peakY - 0.05, `Monotonicity preserved: peak Y ${peakY.toFixed(2)}, min sampled Y ${minYVal.toFixed(2)} (no overshoot)`);
console.log('✓ Test a: Fritsch-Carlson Monotonicity verified without overshoot');

// b) Flat line test: [50, 50, 50]
const flatData = [
  { t: 1000, v: 50 },
  { t: 2000, v: 50 },
  { t: 3000, v: 50 }
];
const flatGeom = computeChartGeometry(flatData, { width: 300, height: 150 });
assert.ok(!flatGeom.empty, 'Flat line computed');
assert.ok(!flatGeom.linePath.includes('NaN'), 'No NaN in flat line path');
assert.strictEqual(flatGeom.bounds.dMin, 50, 'dMin is 50');
assert.strictEqual(flatGeom.bounds.dMax, 50, 'dMax is 50');
assert.strictEqual(flatGeom.bounds.yMin, 49, 'yMin padded by 1 for flat data');
assert.strictEqual(flatGeom.bounds.yMax, 51, 'yMax padded by 1 for flat data');
console.log('✓ Test b: Flat line produces valid path without NaN or division by zero');

// c) Two points: [50, 60]
const twoData = [
  { t: 1000, v: 50 },
  { t: 2000, v: 60 }
];
const twoGeom = computeChartGeometry(twoData, { width: 300, height: 150 });
assert.strictEqual(twoGeom.points.length, 2, '2 mapped points');
assert.ok(twoGeom.linePath.startsWith('M'), 'Starts with M');
assert.ok(twoGeom.linePath.includes('C'), 'Includes cubic transition');
assert.ok(!twoGeom.linePath.includes('NaN'), 'Two points produces clean numbers');
console.log('✓ Test c: Two points smooth transition passes');

// d) Single point: valid bounds, no crash
const singleData = [{ t: 1000, v: 75.5 }];
const singleGeom = computeChartGeometry(singleData, { width: 300, height: 150 });
assert.ok(singleGeom.isSingle, 'Single point flag set');
assert.strictEqual(singleGeom.points.length, 1, 'Contains single point');
assert.ok(singleGeom.linePath.includes('M'), 'Valid single point line');
assert.ok(singleGeom.areaPath.includes('Z'), 'Valid single point area');
console.log('✓ Test d: Single point handled cleanly without error');

// e) Empty data: returns { empty: true }
const emptyGeom = computeChartGeometry([], { width: 300, height: 150 });
assert.deepStrictEqual(emptyGeom, { empty: true }, 'Empty array returns empty: true');
const nullGeom = computeChartGeometry(null);
assert.deepStrictEqual(nullGeom, { empty: true }, 'Null data returns empty: true');
console.log('✓ Test e: Empty / invalid data returns empty: true');

// f) Deduplication: two points with same timestamp -> only one kept (the later one)
const dupData = [
  { t: 1000, v: 70 },
  { t: 2000, v: 71 },
  { t: 2000, v: 72 }, // Overwrites 71
  { t: 3000, v: 73 }
];
const dupGeom = computeChartGeometry(dupData, { width: 300, height: 150 });
assert.strictEqual(dupGeom.points.length, 3, 'Deduplicated to 3 points');
assert.strictEqual(dupGeom.points[1].v, 72, 'Kept later value 72 for timestamp 2000');
console.log('✓ Test f: Deduplication keeps latest value at timestamp');

// g) Downsampling: 300 points in -> <= 120 points out; first and last preserved
const heavyData = [];
for (let i = 0; i < 300; i++) {
  heavyData.push({ t: 10000 + i * 1000, v: 60 + Math.sin(i / 10) * 5 });
}
const heavyGeom = computeChartGeometry(heavyData, { width: 400, height: 200 });
assert.ok(heavyGeom.points.length <= 120, `Downsampled from 300 to ${heavyGeom.points.length} (<= 120)`);
assert.strictEqual(heavyGeom.points[0].t, heavyData[0].t, 'First point preserved');
assert.strictEqual(heavyGeom.points[heavyGeom.points.length - 1].t, heavyData[heavyData.length - 1].t, 'Last point preserved');
console.log('✓ Test g: Downsampling to <= 120 points preserves endpoints');

// h) Domain padding: yMin < dMin and yMax > dMax by approx 8%
const padData = [
  { t: 1000, v: 60 },
  { t: 2000, v: 80 }
];
const padGeom = computeChartGeometry(padData, { width: 300, height: 150 });
const span = 80 - 60; // 20
const expectedPad = span * 0.08; // 1.6
assert.strictEqual(padGeom.bounds.dMin, 60, 'dMin is 60');
assert.strictEqual(padGeom.bounds.dMax, 80, 'dMax is 80');
assert.ok(Math.abs(padGeom.bounds.yMin - (60 - expectedPad)) < 0.001, 'yMin padded by 8%');
assert.ok(Math.abs(padGeom.bounds.yMax - (80 + expectedPad)) < 0.001, 'yMax padded by 8%');
console.log('✓ Test h: 8% Y-domain padding correctly prevents curve clipping');

console.log('\n=============================================');
console.log(' ALL CHART GEOMETRY TESTS PASSED (100%) ');
console.log('=============================================\n');
