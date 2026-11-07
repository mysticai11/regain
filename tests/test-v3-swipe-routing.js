import test from 'node:test';
import assert from 'node:assert/strict';
import { decideSwipe, setGestureCooldown, isGestureInCooldown, claimGestureOwner, releaseGestureOwner, SWIPE_NAV_SCOPE } from '../js/lib/gesture.js';

test('V3: Pure decideSwipe decision function unit-test matrix', () => {
  const mockTarget = (selectorMatch) => ({
    closest: (sel) => (sel.split(',').map(s => s.trim()).includes(selectorMatch) ? { id: 'mock' } : null)
  });

  // 1. Food row swipe -> IGNORE
  const r1 = decideSwipe({
    startTarget: mockTarget('.food-log-row'),
    startX: 120, startY: 100, currentX: 20, currentY: 102,
    pointers: 1, activeTab: 'today', scope: 'all-tabs'
  });
  assert.strictEqual(r1.action, 'IGNORE');
  assert.strictEqual(r1.reason, 'gesture-owner');

  // 2. Chart scrub -> IGNORE
  const r2 = decideSwipe({
    startTarget: mockTarget('#weightPlot'),
    startX: 150, startY: 100, currentX: 280, currentY: 100,
    pointers: 1, activeTab: 'progress', scope: 'progress-tabs'
  });
  assert.strictEqual(r2.action, 'IGNORE');
  assert.strictEqual(r2.reason, 'gesture-owner');

  // 3. Set row precision swipe -> IGNORE
  const r3 = decideSwipe({
    startTarget: mockTarget('.set-row-precision'),
    startX: 150, startY: 100, currentX: 40, currentY: 100,
    pointers: 1, activeTab: 'gym', scope: 'all-tabs'
  });
  assert.strictEqual(r3.action, 'IGNORE');
  assert.strictEqual(r3.reason, 'gesture-owner');

  // 4. Modal / sheet open -> IGNORE
  const r4 = decideSwipe({
    startTarget: { closest: () => null },
    startX: 100, startY: 100, currentX: 220, currentY: 100,
    pointers: 1, activeSheet: true, activeTab: 'progress', scope: 'progress-tabs'
  });
  assert.strictEqual(r4.action, 'IGNORE');
  assert.strictEqual(r4.reason, 'sheet-open');

  // 5. Diagonal movement (|dx| < 2 * |dy|) -> IGNORE
  const r5 = decideSwipe({
    startTarget: { closest: () => null },
    startX: 100, startY: 100, currentX: 250, currentY: 190, // dx=150, dy=90 -> 150 < 180
    pointers: 1, activeTab: 'progress', scope: 'progress-tabs'
  });
  assert.strictEqual(r5.action, 'IGNORE');
  assert.strictEqual(r5.reason, 'diagonal-movement');

  // 6. Small dx (30dp) -> IGNORE
  const r6 = decideSwipe({
    startTarget: { closest: () => null },
    startX: 100, startY: 100, currentX: 130, currentY: 100, // dx=30 (< 80)
    pointers: 1, activeTab: 'progress', scope: 'progress-tabs'
  });
  assert.strictEqual(r6.action, 'IGNORE');
  assert.strictEqual(r6.reason, 'distance-insufficient');

  // 7. Edge swipe (< 24dp from left or right edge) -> IGNORE
  const r7a = decideSwipe({
    startTarget: { closest: () => null },
    startX: 15, startY: 100, currentX: 180, currentY: 100, // startX < 24
    screenWidth: 360, pointers: 1, activeTab: 'progress', scope: 'progress-tabs'
  });
  assert.strictEqual(r7a.action, 'IGNORE');
  assert.strictEqual(r7a.reason, 'edge-guard');

  const r7b = decideSwipe({
    startTarget: { closest: () => null },
    startX: 350, startY: 100, currentX: 200, currentY: 100, // startX > 360-24=336
    screenWidth: 360, pointers: 1, activeTab: 'progress', scope: 'progress-tabs'
  });
  assert.strictEqual(r7b.action, 'IGNORE');
  assert.strictEqual(r7b.reason, 'edge-guard');

  // 8. Cooldown active -> IGNORE
  const r8 = decideSwipe({
    startTarget: { closest: () => null },
    startX: 100, startY: 100, currentX: 250, currentY: 100,
    isCooldown: true, pointers: 1, activeTab: 'progress', scope: 'progress-tabs'
  });
  assert.strictEqual(r8.action, 'IGNORE');
  assert.strictEqual(r8.reason, 'cooldown-active');

  // 9. Multi-touch (2 fingers) -> IGNORE
  const r9 = decideSwipe({
    startTarget: { closest: () => null },
    startX: 100, startY: 100, currentX: 250, currentY: 100,
    pointers: 2, activeTab: 'progress', scope: 'progress-tabs'
  });
  assert.strictEqual(r9.action, 'IGNORE');
  assert.strictEqual(r9.reason, 'multi-touch');

  // 10. Vertical scroll active (scrollTop > 0) -> IGNORE
  const r10 = decideSwipe({
    startTarget: { closest: () => null },
    startX: 100, startY: 100, currentX: 250, currentY: 100,
    targetScrollTop: 45, pointers: 1, activeTab: 'progress', scope: 'progress-tabs'
  });
  assert.strictEqual(r10.action, 'IGNORE');
  assert.strictEqual(r10.reason, 'scroll-active');

  // 11. Swipe on Today when scope is progress-tabs -> IGNORE
  const r11 = decideSwipe({
    startTarget: { closest: () => null },
    startX: 100, startY: 100, currentX: 250, currentY: 100,
    pointers: 1, activeTab: 'today', scope: 'progress-tabs'
  });
  assert.strictEqual(r11.action, 'IGNORE');
  assert.strictEqual(r11.reason, 'scope-restricted');

  // 12. Clean horizontal swipe on empty Progress area -> NAVIGATE
  const r12Left = decideSwipe({
    startTarget: { closest: () => null },
    startX: 260, startY: 100, currentX: 100, currentY: 105, // dx = -160, |dx| >= 80, |dx| >= 2*|dy|
    pointers: 1, activeTab: 'progress', scope: 'progress-tabs', screenWidth: 360
  });
  assert.strictEqual(r12Left.action, 'NAVIGATE');
  assert.strictEqual(r12Left.direction, 'LEFT');

  const r12Right = decideSwipe({
    startTarget: { closest: () => null },
    startX: 100, startY: 100, currentX: 260, currentY: 98, // dx = +160
    pointers: 1, activeTab: 'lifts', scope: 'progress-tabs', screenWidth: 360
  });
  assert.strictEqual(r12Right.action, 'NAVIGATE');
  assert.strictEqual(r12Right.direction, 'RIGHT');
});

test('V3: Gesture cooldown and owner state helpers', () => {
  setGestureCooldown(100);
  assert.strictEqual(isGestureInCooldown(), true);

  claimGestureOwner('custom-test');
  assert.strictEqual(decideSwipe({ startTarget: { closest: () => null }, startX: 100, currentX: 250, pointers: 1, activeTab: 'progress', isCooldown: false }).action, 'IGNORE');

  releaseGestureOwner();
  assert.strictEqual(decideSwipe({ startTarget: { closest: () => null }, startX: 100, currentX: 250, pointers: 1, activeTab: 'progress', isCooldown: false }).action, 'NAVIGATE');
});

test('V3: Slide navigation strictly scoped to progress subtabs (Body, Lifts, History)', async () => {
  const fs = await import('node:fs');
  const mainJs = fs.readFileSync('js/main.js', 'utf8');
  const progressJs = fs.readFileSync('js/screens/progress.js', 'utf8');

  // Verify initSwipeNavigation does not attach document swipe listeners for top-level tabs
  const initSwipeMatch = mainJs.match(/export function initSwipeNavigation\(\)\s*\{([\s\S]*?)\}/);
  assert.ok(initSwipeMatch, 'initSwipeNavigation exists');
  assert.doesNotMatch(initSwipeMatch[1], /document\.addEventListener\(['"]touch/i, 'initSwipeNavigation does not attach global touch listeners');
  assert.doesNotMatch(initSwipeMatch[1], /window\.setTab/, 'initSwipeNavigation does not navigate tabs');

  // Verify progress.js strictly switches between body, lifts, and history without rolling to today/gym
  assert.doesNotMatch(progressJs, /window\.setTab\(['"]gym['"]\)/, 'progress.js does not swipe navigate to gym');
  assert.doesNotMatch(progressJs, /window\.setTab\(['"]today['"]\)/, 'progress.js does not swipe navigate to today');
  assert.match(progressJs, /renderProgressSimple\(['"]lifts['"]\)/, 'progress switches to lifts');
  assert.match(progressJs, /renderProgressSimple\(['"]history['"]\)/, 'progress switches to history');
  assert.match(progressJs, /renderProgressSimple\(['"]body['"]\)/, 'progress switches to body');
});
