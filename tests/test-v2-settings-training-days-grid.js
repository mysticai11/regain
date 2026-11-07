import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('V2: Settings training days grid layout and circular styling', () => {
  const settingsCSS = fs.readFileSync('css/settings.css', 'utf8');
  const settingsJS = fs.readFileSync('js/screens/settings.js', 'utf8');

  // Verify .settings-day-toggles CSS Grid definition
  assert.match(settingsCSS, /\.settings-day-toggles\s*\{[^}]*display:\s*grid/i, 'settings-day-toggles must be display:grid');
  assert.match(settingsCSS, /grid-template-columns:\s*repeat\(7,\s*minmax\(0,\s*1fr\)\)/i, 'settings-day-toggles must repeat 7 minmax(0, 1fr)');
  assert.match(settingsCSS, /\.settings-day-toggles\s*\{[^}]*gap:\s*4px/i, 'settings-day-toggles gap must be 4px');
  assert.match(settingsCSS, /\.settings-day-toggles\s*\{[^}]*width:\s*100%/i, 'settings-day-toggles width must be 100%');
  assert.match(settingsCSS, /\.settings-day-toggles\s*\{[^}]*min-height:\s*48px/i, 'settings-day-toggles min-height must be 48px');

  // Verify .settings-day-toggle circular responsive sizing (no fixed 44px width)
  assert.doesNotMatch(settingsCSS, /\.settings-day-toggle\s*\{[^}]*width:\s*44px/i, 'no fixed 44px width on toggle');
  assert.match(settingsCSS, /\.settings-day-toggle[\s\S]*max-width:\s*40px/i, 'toggle circle max-width 40px');
  assert.match(settingsCSS, /\.settings-day-toggle[\s\S]*aspect-ratio:\s*1\s*\/\s*1/i, 'toggle circle aspect-ratio 1/1');
  assert.match(settingsCSS, /\.settings-day-toggle[\s\S]*border-radius:\s*50%/i, 'toggle circle border-radius 50%');

  // Verify 48px tap target
  assert.match(settingsCSS, /\.settings-day-toggle::before\s*\{[^}]*min-height:\s*48px/i, 'toggle ::before tap target min-height 48px');

  // Verify template does not force inline display:flex
  assert.doesNotMatch(settingsJS, /class="settings-day-toggles"[^>]*display:flex/i, 'settings-day-toggles must not have inline display:flex');
});

