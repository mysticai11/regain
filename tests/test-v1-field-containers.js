import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('V1: Unified .field, .field-num, and .precision-input container styles', () => {
  const compCSS = fs.readFileSync('css/components.css', 'utf8');
  const baseCSS = fs.readFileSync('css/base.css', 'utf8');

  // Verify .field definition
  assert.match(compCSS, /\.field\s*\{[^}]*display:\s*flex;/i, '.field must be display:flex');
  assert.match(compCSS, /\.field\s*\{[^}]*min-height:\s*56px;/i, '.field must have min-height: 56px');
  assert.match(compCSS, /\.field\s*\{[^}]*border-radius:\s*16px;/i, '.field must have border-radius: 16px');
  assert.match(compCSS, /\.field\s*\{[^}]*border:\s*1\.5px\s+solid\s+transparent;/i, '.field must reserve 1.5px border');
  assert.match(compCSS, /\.field:focus-within/i, '.field must have focus-within selector');
  assert.match(compCSS, /border-color:\s*var\(--lime\)/i, 'focus-within must highlight lime border');

  // Verify input inside .field has no outline/border/box-shadow
  assert.match(compCSS, /\.field input\s*\{[^}]*background:\s*transparent/i, 'field input must have transparent bg');
  assert.match(compCSS, /\.field input\s*\{[^}]*outline:\s*none/i, 'field input must have outline:none');

  // Verify base.css disables native outline on input:focus-visible inside field
  assert.match(baseCSS, /\.field input:focus-visible[\s\S]*outline:\s*none\s*!important/i, 'focus-visible outline removed from field input');

  // Verify .field-unit and .field-btn
  assert.match(compCSS, /\.field-unit\s*\{[^}]*flex:\s*none/i, 'field-unit must have flex:none');
  assert.match(compCSS, /\.field-btn\s*\{[^}]*min-width:\s*72px/i, 'field-btn must have min-width: 72px');

  // Verify .field-num for settings number cells
  assert.match(compCSS, /\.field-num\s*\{[^}]*height:\s*48px/i, 'field-num must have height: 48px');
  assert.match(compCSS, /\.field-num:focus-within/i, 'field-num must have focus-within');

  // Verify precision-input focus styling
  assert.match(compCSS, /\.precision-input:focus-visible\s*\{[^}]*border-color:\s*var\(--lime\)/i, 'precision-input must use border-color lime on focus');
});

test('V1: Templates apply field container pattern across views', () => {
  const todayJS = fs.readFileSync('js/screens/today.js', 'utf8');
  const progressJS = fs.readFileSync('js/screens/progress.js', 'utf8');
  const settingsJS = fs.readFileSync('js/screens/settings.js', 'utf8');
  const foodModalJS = fs.readFileSync('js/screens/today/food-modal.js', 'utf8');

  // Today weight field
  assert.match(todayJS, /<div class="field">[\s\S]*id="todayWeight"[\s\S]*class="field-unit">kg<\/span>[\s\S]*id="saveTodayWeight"/i, 'Today weight uses .field container');

  // Progress weight field
  assert.match(progressJS, /<div class="field"[\s\S]*id="progressWeight"[\s\S]*class="field-unit">kg<\/span>[\s\S]*id="saveProgressWeight"/i, 'Progress weight uses .field container');

  // Settings numbers
  assert.match(settingsJS, /class="field-num"[\s\S]*id="setTargetRest"/i, 'Settings rest kcal uses field-num');
  assert.match(settingsJS, /class="field-num"[\s\S]*id="setTargetGym"/i, 'Settings gym kcal uses field-num');
  assert.match(settingsJS, /class="field-num"[\s\S]*id="setProtRest"/i, 'Settings rest prot uses field-num');
  assert.match(settingsJS, /class="field-num"[\s\S]*id="setProtGym"/i, 'Settings gym prot uses field-num');
  assert.match(settingsJS, /class="field-num"[\s\S]*id="setTargetWeight"/i, 'Settings goal weight uses field-num');

  // Food modal servings & custom food
  assert.match(foodModalJS, /<div class="field"><input[^>]*id="servingsInput"[\s\S]*class="field-unit">servings<\/span><\/div>/i, 'Servings input uses .field');
  assert.match(foodModalJS, /<div class="field"><input[^>]*id="cfGrams"[\s\S]*class="field-unit">g<\/span><\/div>/i, 'Custom food grams uses .field');
  assert.match(foodModalJS, /<div class="field"><input[^>]*id="cfKcal"[\s\S]*class="field-unit">kcal<\/span><\/div>/i, 'Custom food kcal uses .field');
});

