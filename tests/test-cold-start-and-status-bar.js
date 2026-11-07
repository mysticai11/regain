/* Test Suite: Cold Start, Status Bar, and Edge-to-Edge (Item 9) */

import assert from 'assert';
import fs from 'fs';

console.log('--- Testing Cold Start, Status Bar, and Edge-to-Edge ---');

// 1. Verify Android styles.xml
const stylesXml = fs.readFileSync('android/app/src/main/res/values/styles.xml', 'utf8');
assert.ok(stylesXml.includes('<item name="android:windowBackground">#0B0B0C</item>'), 'styles.xml sets windowBackground to #0B0B0C');
assert.ok(stylesXml.includes('<item name="android:statusBarColor">#00000000</item>'), 'styles.xml sets transparent statusBarColor for edge-to-edge');
assert.ok(stylesXml.includes('<item name="android:windowLightStatusBar">false</item>'), 'styles.xml uses light icons (false for light status bar)');

// 2. Verify capacitor.config.json
const capConfig = JSON.parse(fs.readFileSync('capacitor.config.json', 'utf8'));
assert.strictEqual(capConfig.plugins.SplashScreen.backgroundColor, '#0B0B0C', 'Splash screen background is #0B0B0C');
assert.strictEqual(capConfig.plugins.SplashScreen.launchAutoHide, false, 'Splash screen launchAutoHide is false');
assert.strictEqual(capConfig.plugins.StatusBar.overlaysWebView, true, 'Status bar overlays webview');
assert.strictEqual(capConfig.plugins.StatusBar.style, 'DARK', 'Status bar style is DARK (light icons)');

// 3. Verify initEdgeToEdgeAndSplash() integration
let statusBarConfig = null;
let splashHideConfig = null;

const store = {};
global.localStorage = {
  getItem: (k) => store[k] || null,
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; }
};

global.window = {
  localStorage: global.localStorage,
  addEventListener: () => {},
  removeEventListener: () => {},
  Capacitor: {
    isPluginAvailable: (plugin) => plugin === 'StatusBar' || plugin === 'SplashScreen' || plugin === 'Keyboard',
    Plugins: {
      StatusBar: {
        setOverlaysWebView: (opts) => { statusBarConfig = opts; },
        setStyle: () => {},
        setBackgroundColor: () => {}
      },
      SplashScreen: {
        hide: (opts) => { splashHideConfig = opts; }
      },
      Keyboard: {
        addListener: () => {}
      }
    }
  }
};

global.document = {
  readyState: 'complete',
  addEventListener: () => {},
  getElementById: () => null,
  querySelectorAll: () => []
};

const { initEdgeToEdgeAndSplash } = await import('../js/main.js');
initEdgeToEdgeAndSplash();

assert.deepStrictEqual(statusBarConfig, { overlay: true }, 'StatusBar overlay configured');

await new Promise((resolve) => setTimeout(resolve, 100));

assert.ok(splashHideConfig, 'SplashScreen.hide was called');
assert.strictEqual(splashHideConfig.fadeOutDuration, 150, 'Fadeout duration is 150ms');
console.log('✓ All Cold Start & Status Bar tests passed successfully!');
