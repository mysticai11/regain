import assert from 'assert';
import { getRollingWeightValues, progressPlot } from '../js/screens/progress/charts.js';

console.log('--- Testing Weight Trend Line Fluctuations & Goal Benchmark ---');

// Mock entries with higher and lower fluctuations
const entries = [
  { dayKey: '2026-11-01', weight: 54.0, createdAt: '2026-11-01T08:00:00' },
  { dayKey: '2026-11-02', weight: 54.8, createdAt: '2026-11-02T08:00:00' },
  { dayKey: '2026-11-03', weight: 54.2, createdAt: '2026-11-03T08:00:00' },
  { dayKey: '2026-11-04', weight: 55.1, createdAt: '2026-11-04T08:00:00' }
];

const values = getRollingWeightValues(entries);
console.log('Values:', values);

// 1. Check exact values
assert.strictEqual(values[0].value, 54.0, 'Entry 0 value must be exact logged weight');
assert.strictEqual(values[1].value, 54.8, 'Entry 1 value must be exact logged weight');
assert.strictEqual(values[2].value, 54.2, 'Entry 2 value must be exact logged weight');
assert.strictEqual(values[3].value, 55.1, 'Entry 3 value must be exact logged weight');
assert.ok(values[0].avg != null, 'Rolling avg must be present');

// 2. Generate plot with goal = 60 kg (Bulking)
const htmlBulking = progressPlot(values, 60, 'kg', false);

// Benchmark line at 60 must exist with dotted stroke
assert.ok(htmlBulking.includes('stroke-dasharray="3 3"'), 'Benchmark line must have stroke-dasharray="3 3"');
assert.ok(htmlBulking.includes('>60</text>'), 'Benchmark line must display 60');

// Polyline points must move up (lower y) when weight increases and down (higher y) when weight decreases
const polyMatch = htmlBulking.match(/<polyline points="([^"]+)"/);
assert.ok(polyMatch, 'Polyline must exist in SVG');
const polyPoints = polyMatch[1].split(' ').map(pair => {
  const [x, y] = pair.split(',').map(Number);
  return { x, y };
});

assert.strictEqual(polyPoints.length, 4, 'Must have 4 points');
console.log('Polyline coordinates:', polyPoints);

// Point 1 (54.8 kg) is higher weight than Point 0 (54.0 kg) -> Y must be LOWER (higher up in SVG)
assert.ok(polyPoints[1].y < polyPoints[0].y, '54.8 kg point must be higher on chart (lower y) than 54.0 kg point');

// Point 2 (54.2 kg) is lower weight than Point 1 (54.8 kg) -> Y must be HIGHER (lower down in SVG)
assert.ok(polyPoints[2].y > polyPoints[1].y, '54.2 kg point must be lower on chart (higher y) than 54.8 kg point');

// Point 3 (55.1 kg) is higher weight than Point 2 (54.2 kg) -> Y must be LOWER (higher up in SVG)
assert.ok(polyPoints[3].y < polyPoints[2].y, '55.1 kg point must be higher on chart (lower y) than 54.2 kg point');

// 3. Test Cutting benchmark (e.g. goal = 50 kg)
const htmlCutting = progressPlot(values, 50, 'kg', false);
assert.ok(htmlCutting.includes('stroke-dasharray="3 3"'), 'Cutting benchmark line must exist');
assert.ok(htmlCutting.includes('>50</text>'), 'Cutting benchmark line must display 50');

console.log('✓ All Weight Trend Line & Goal Benchmark tests passed with 100% success!');
