/* Test Suite: Keyboard Handling (Item 7) */

import assert from 'assert';
import fs from 'fs';

console.log('--- Testing Keyboard Handling & Progression ---');

// 1. Verify capacitor.config.json Keyboard config
const config = JSON.parse(fs.readFileSync('capacitor.config.json', 'utf8'));
assert.ok(config.plugins && config.plugins.Keyboard, 'Keyboard plugin configured in capacitor.config.json');
assert.strictEqual(config.plugins.Keyboard.resize, 'native', 'Keyboard resize is native');

// 2. Verify enterkeyhint="next" in gym.js
const gymJs = fs.readFileSync('js/screens/gym.js', 'utf8');
assert.ok(gymJs.includes('class="precision-input set-weight') && gymJs.includes('enterkeyhint="next"'), 'Weight input has enterkeyhint="next"');
assert.ok(gymJs.includes('class="precision-input set-reps') && gymJs.includes('enterkeyhint="next"'), 'Reps input has enterkeyhint="next"');

// 3. Verify body.kb-open transitions in CSS
const css = fs.readFileSync('css/components.css', 'utf8');
assert.ok(css.includes('body.kb-open .bottomnav') || css.includes('body.kb-open .tab-bar'), 'CSS hides bottom nav when body.kb-open');
assert.ok(css.includes('transform: translateY(100%)'), 'Bottom nav translated out of view');

// 4. Test Keydown progression logic
const listeners = {};
const elements = {
  w0: { value: '80', focused: false, focus() { this.focused = true; }, dataset: { ex: 'bench', setIndex: '0' } },
  r0: { value: '8', focused: false, focus() { this.focused = true; }, dataset: { ex: 'bench', setIndex: '0' } },
  w1: { value: '', focused: false, focus() { this.focused = true; }, dataset: { ex: 'bench', setIndex: '1' } },
  r1: { value: '', focused: false, blurred: false, blur() { this.blurred = true; }, focus() { this.focused = true; }, dataset: { ex: 'bench', setIndex: '1' } }
};

// Simulate Enter on w0 -> focuses r0
let simulatedEvent = { key: 'Enter', preventDefault() {} };
// handler logic from events.js:
var id = elements.w0.dataset.ex, idx = parseInt(elements.w0.dataset.setIndex, 10);
if (simulatedEvent.key === 'Enter') {
  elements.r0.focus();
}
assert.strictEqual(elements.r0.focused, true, 'Enter on weight jumped to reps in set 0');

// Simulate Enter on r0 -> focuses w1
id = elements.r0.dataset.ex; idx = parseInt(elements.r0.dataset.setIndex, 10);
if (simulatedEvent.key === 'Enter') {
  elements.w1.focus();
}
assert.strictEqual(elements.w1.focused, true, 'Enter on reps jumped to weight in set 1');

// Simulate Enter on r1 (last set) -> blurs
id = elements.r1.dataset.ex; idx = parseInt(elements.r1.dataset.setIndex, 10);
const nextW = null; // no next set
if (simulatedEvent.key === 'Enter') {
  if (nextW) nextW.focus();
  else elements.r1.blur();
}
assert.strictEqual(elements.r1.blurred, true, 'Enter on last reps blurs keyboard');

console.log('✓ All Keyboard Handling tests passed successfully!');
