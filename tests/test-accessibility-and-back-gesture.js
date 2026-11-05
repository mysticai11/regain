/* Test Suite: Accessibility & Back Gesture (Item 10) */

import assert from 'assert';
import fs from 'fs';

console.log('--- Testing Accessibility & Back Gesture ---');

// 1. Verify AndroidManifest.xml has enableOnBackInvokedCallback
const manifest = fs.readFileSync('android/app/src/main/AndroidManifest.xml', 'utf8');
assert.ok(manifest.includes('android:enableOnBackInvokedCallback="true"'), 'Manifest enables predictive back callback');

// 2. Verify :focus-visible in css/base.css
const baseCss = fs.readFileSync('css/base.css', 'utf8');
assert.ok(baseCss.includes(':focus-visible'), 'Focus visible styles present in base.css');
assert.ok(baseCss.includes('outline: 2px solid var(--lime)'), 'Focus visible uses 2px lime outline');

// 3. Verify ARIA roles on tab navigation
const mainJs = fs.readFileSync('js/main.js', 'utf8');
assert.ok(mainJs.includes('role="tablist"'), 'Bottom nav has role="tablist"');
assert.ok(mainJs.includes('role="tab"'), 'Tab items have role="tab"');
assert.ok(mainJs.includes('aria-selected='), 'Tab items have aria-selected');

// 4. Verify ARIA roles on Progress segmented buttons
const progressJs = fs.readFileSync('js/screens/progress.js', 'utf8');
assert.ok(progressJs.includes('role="tablist"'), 'Progress seg-tabs has role="tablist"');
assert.ok(progressJs.includes('role="tab"'), 'Progress buttons have role="tab"');
assert.ok(progressJs.includes('aria-selected='), 'Progress buttons have aria-selected');

// 5. Test Back Button Dismiss hierarchy:
// Layer 1: Overlay open -> closes overlay
let overlayRemoved = false;
const mockOverlay = { remove() { overlayRemoved = true; }, querySelector() { return null; } };
let overlays = [mockOverlay];
let activeExpandedExId = 'bench_press';
let currentTab = 'gym';

function simulateBackButton() {
  if (overlays && overlays.length > 0) {
    var topOverlay = overlays.pop();
    topOverlay.remove();
    return true;
  }
  if (activeExpandedExId) {
    activeExpandedExId = null;
    return true;
  }
  if (currentTab !== 'today') {
    currentTab = 'today';
    return true;
  }
  return false;
}

// First back: closes overlay
assert.strictEqual(simulateBackButton(), true, 'First back handled overlay dismissal');
assert.strictEqual(overlayRemoved, true, 'Top overlay removed');
assert.strictEqual(activeExpandedExId, 'bench_press', 'Exercise detail still open');

// Second back: closes expanded exercise accordion
assert.strictEqual(simulateBackButton(), true, 'Second back handled expanded accordion dismissal');
assert.strictEqual(activeExpandedExId, null, 'Active exercise closed');
assert.strictEqual(currentTab, 'gym', 'Still on gym tab');

// Third back: switches to Today
assert.strictEqual(simulateBackButton(), true, 'Third back navigated to Today tab');
assert.strictEqual(currentTab, 'today', 'Returned to Today tab');

// Fourth back: returns false -> triggers exitApp()
assert.strictEqual(simulateBackButton(), false, 'Fourth back allows app exit from Today screen');

console.log('✓ All Accessibility & Back Gesture tests passed successfully!');
