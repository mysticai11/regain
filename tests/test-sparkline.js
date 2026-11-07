/* Test Suite: Pure Sparkline Generator (Task R2-2) */

import assert from 'assert';
import { renderSparklineSVG } from '../js/ui/sparkline.js';

console.log('--- Testing Pure Sparkline SVG Generator (Task R2-2) ---');

// 1. Empty and invalid data fallback
const emptySVG = renderSparklineSVG([]);
assert.ok(emptySVG.includes('<svg') && emptySVG.includes('opacity:0.2'), 'Empty data renders dashed placeholder line');

const nullSVG = renderSparklineSVG(null);
assert.ok(nullSVG.includes('<svg') && nullSVG.includes('opacity:0.2'), 'Null data renders dashed placeholder');

// 2. Single point rendering
const singleSVG = renderSparklineSVG([54.5], { width: 60, height: 20 });
assert.ok(singleSVG.includes('<circle'), 'Single point renders center circle');

// 3. Multi-point series polyline
const series = [54.0, 54.2, 54.1, 54.6, 54.8, 55.0];
const sparklineSVG = renderSparklineSVG(series, { width: 80, height: 24, stroke: '#C6F432' });
assert.ok(sparklineSVG.includes('<polyline'), 'Multi-point series renders polyline');
assert.ok(sparklineSVG.includes('stroke="#C6F432"'), 'Stroke color is applied');
assert.ok(sparklineSVG.includes('viewBox="0 0 80 24"'), 'Custom width and height applied');

// 4. Flat line series (zero variation)
const flatSeries = [50, 50, 50, 50];
const flatSVG = renderSparklineSVG(flatSeries);
assert.ok(flatSVG.includes('<polyline'), 'Flat line series does not divide by zero');

console.log('✓ All Sparkline Generator tests passed (100%)');
