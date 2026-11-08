/* Test Suite: Nutrition Metric Toggle (Calories <-> Protein) */

import assert from 'assert';
import { nutritionProgressHTML } from '../js/screens/progress/history.js';

console.log('--- Testing Nutrition Metric Toggle (Calories <-> Protein) ---');

const sampleRecords = [
  { key: '2026-11-08', weight: 63, kcal: 3200, protein: 175 }
];

// 1. Calories mode default
globalThis.window = { activeNutritionMetric: 'kcal' };
const kcalHTML = nutritionProgressHTML(sampleRecords);
assert.ok(kcalHTML.includes('id="nutritionMetricKcalBtn"'), 'Kcal button exists');
assert.ok(kcalHTML.includes('id="nutritionMetricProtBtn"'), 'Protein button exists');
assert.ok(kcalHTML.includes('kcal avg'), 'Kcal mode shows kcal avg');
assert.ok(kcalHTML.includes('--i:0'), 'Segmented thumb indicator at 0 for kcal');

// 2. Protein mode toggle
globalThis.window = { activeNutritionMetric: 'protein' };
const protHTML = nutritionProgressHTML(sampleRecords);
assert.ok(protHTML.includes('g avg'), 'Protein mode shows g avg');
assert.ok(protHTML.includes('--i:1'), 'Segmented thumb indicator at 1 for protein');
assert.ok(!protHTML.includes('NaN'), 'No NaN values in protein mode');

console.log('✓ Nutrition Metric Toggle tests passed (100%)');

