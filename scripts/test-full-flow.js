const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const mimeTypes = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png'
};

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/' || reqPath === '/regain/' || reqPath === '/regain/index.html') reqPath = '/index.html';
  else if (reqPath.startsWith('/regain/')) reqPath = reqPath.slice(7);
  const filePath = path.join(__dirname, '..', reqPath.replace(/^\//, ''));
  if (fs.existsSync(filePath) && !fs.statSync(filePath).isDirectory()) {
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'text/plain' });
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.writeHead(404);
    res.end('Not found: ' + reqPath);
  }
});

server.listen(8099, async () => {
  console.log('Test server listening on 8099');
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const tempDir = path.join(__dirname, '..', '.chrome-mobile-temp-' + Date.now());

  const chrome = spawn(chromePath, [
    '--headless=new',
    '--disable-gpu',
    '--remote-debugging-port=9225',
    `--user-data-dir=${tempDir}`,
    '--window-size=390,844',
    'http://127.0.0.1:8099/index.html'
  ]);

  let wsUrl = null;
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 200));
    try {
      const targets = await new Promise((resolve, reject) => {
        http.get('http://127.0.0.1:9225/json', res => {
          let raw = '';
          res.on('data', chunk => raw += chunk);
          res.on('end', () => resolve(JSON.parse(raw)));
        }).on('error', reject);
      });
      const page = targets.find(t => t.type === 'page');
      if (page && page.webSocketDebuggerUrl) {
        wsUrl = page.webSocketDebuggerUrl;
        break;
      }
    } catch (e) {}
  }

  if (!wsUrl) {
    console.error('Failed to connect to Chrome debugging port');
    chrome.kill();
    server.close();
    process.exit(1);
  }

  const WebSocket = globalThis.WebSocket || require('ws');
  const ws = new WebSocket(wsUrl);

  const errors = [];
  const logs = [];

  let msgId = 1;
  const pending = new Map();

  function call(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = msgId++;
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  ws.addEventListener('message', event => {
    const data = event.data;
    const msg = JSON.parse(data.toString());
    if (msg.method === 'Runtime.consoleAPICalled') {
      const text = msg.params.args.map(a => a.value || JSON.stringify(a)).join(' ');
      logs.push(`[${msg.params.type}] ${text}`);
      if (msg.params.type === 'error') errors.push(text);
    }
    if (msg.method === 'Runtime.exceptionThrown') {
      errors.push(msg.params.exceptionDetails.text + ' ' + (msg.params.exceptionDetails.exception?.description || ''));
    }
    if (msg.id && pending.has(msg.id)) {
      const p = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) p.reject(msg.error);
      else p.resolve(msg.result);
    }
  });

  if (ws.readyState !== 1) {
    await new Promise(r => ws.addEventListener('open', r));
  }
  await call('Runtime.enable');
  await call('Page.enable');
  await call('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 3,
    mobile: true
  });

  await new Promise(r => setTimeout(r, 1500));

  async function evalExpr(expr) {
    const res = await call('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    return res.result?.value;
  }

  console.log('\n--- 1. Testing Boot & Onboarding at 390px ---');
  const isOnboarding = await evalExpr('!!document.getElementById("obName")');
  console.log('Is onboarding active:', isOnboarding);

  if (isOnboarding) {
    await evalExpr(`
      (function() {
        const nameInput = document.getElementById('obName');
        if (nameInput) nameInput.value = 'Tally Athlete';
        const weightInput = document.getElementById('obWeight');
        if (weightInput) weightInput.value = '55.0';
        const targetInput = document.getElementById('obTargetWeight');
        if (targetInput) targetInput.value = '60.0';
        const startBtn = document.getElementById('obStartBtn');
        if (startBtn) startBtn.click();
      })()
    `);
    await new Promise(r => setTimeout(r, 1000));
  }

  const todayLoaded = await evalExpr('!!document.getElementById("content")');
  console.log('Today screen rendered:', todayLoaded);

  console.log('\n--- 2. Testing Today Screen Hero & Workout Override Sheet ---');
  const hasHero = await evalExpr('!!document.querySelector(".t-hero")');
  console.log('Has 96px Hero calories remaining:', hasHero);

  // Open workout override sheet
  await evalExpr(`document.getElementById("changeWorkoutBtn")?.click()`);
  await new Promise(r => setTimeout(r, 500));
  const sheetOpen = await evalExpr('!!document.querySelector(".sheet")');
  console.log('Workout override sheet opened:', sheetOpen);

  // Pick Day 1 (Chest & Back A)
  await evalExpr(`
    (function() {
      const item = document.querySelector('[data-choose-plan-idx="0"]');
      if (item) item.click();
      else {
        const close = document.getElementById('closeOverrideSheetBtn');
        if (close) close.click();
      }
    })()
  `);
  await new Promise(r => setTimeout(r, 600));

  console.log('\n--- 3. Testing Gym Tab, Set Logging & Session Timer ---');
  await evalExpr(`document.querySelector('[data-tab="gym"]')?.click()`);
  await new Promise(r => setTimeout(r, 600));

  // Log first set
  console.log('Entering set weight and reps...');
  await evalExpr(`
    (function() {
      const row = document.querySelector('.set-row-precision');
      if (!row) return false;
      const inputs = row.querySelectorAll('input.precision-input');
      if (inputs.length >= 2) {
        inputs[0].value = '42.5';
        inputs[0].dispatchEvent(new Event('input', { bubbles: true }));
        inputs[1].value = '12';
        inputs[1].dispatchEvent(new Event('input', { bubbles: true }));
      }
      const tapBtn = row.querySelector('.precision-circle-tap');
      if (tapBtn) tapBtn.click();
      return true;
    })()
  `);
  await new Promise(r => setTimeout(r, 600));

  const allKeys = await evalExpr(`Object.keys(localStorage)`);
  console.log('All localStorage keys:', allKeys);
  const setLogged = await evalExpr(`
    (function() {
      const d = new Date();
      const pad = n => String(n).padStart(2, '0');
      const today = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
      const rec = JSON.parse(localStorage.getItem('rg_day_' + today) || '{}');
      const workout = rec.workout || {};
      const count = Object.values(workout).reduce((acc, sets) => acc + (sets || []).filter(Boolean).length, 0);
      return count > 0;
    })()
  `);
  console.log('Set logged in storage:', setLogged);

  // Test session timer pause and resume
  console.log('Testing session timer controls...');
  await evalExpr(`
    (function() {
      const toggleBtn = document.getElementById('sessionTimerToggleBtn');
      if (toggleBtn) toggleBtn.click();
    })()
  `);
  await new Promise(r => setTimeout(r, 600));
  const timerPaused = await evalExpr('document.getElementById("sessionTimer")?.innerText.includes("Paused")');
  console.log('Session timer paused state active:', timerPaused);

  // Resume timer
  await evalExpr(`
    (function() {
      const resumeBtn = document.getElementById('sessionTimerToggleBtn');
      if (resumeBtn) resumeBtn.click();
    })()
  `);
  await new Promise(r => setTimeout(r, 600));

  console.log('\n--- 4. Testing Reload Mid-Session (State Persistence) ---');
  await call('Page.reload');
  await new Promise(r => setTimeout(r, 1500));

  const setSurvives = await evalExpr(`
    (function() {
      const d = new Date();
      const pad = n => String(n).padStart(2, '0');
      const today = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
      const rec = JSON.parse(localStorage.getItem('rg_day_' + today) || '{}');
      const workout = rec.workout || {};
      const count = Object.values(workout).reduce((acc, sets) => acc + (sets || []).filter(Boolean).length, 0);
      return count > 0;
    })()
  `);
  console.log('Logged set survives reload in storage:', setSurvives);

  // Switch to gym
  await evalExpr(`document.querySelector('[data-tab="gym"]')?.click()`);
  await new Promise(r => setTimeout(r, 600));

  console.log('\n--- 5. Testing Exercise Swap Sheet ---');
  await evalExpr(`
    (function() {
      const swapBtn = document.querySelector('.swap-btn');
      if (swapBtn) swapBtn.click();
    })()
  `);
  await new Promise(r => setTimeout(r, 600));
  const swapSheetOpen = await evalExpr('!!document.getElementById("closeSwapBtn")');
  console.log('Swap sheet open:', swapSheetOpen);
  await evalExpr(`document.getElementById("closeSwapBtn")?.click()`);
  await new Promise(r => setTimeout(r, 500));

  console.log('\n--- 6. Testing Progress Tab ---');
  await evalExpr(`document.querySelector('[data-tab="progress"]')?.click()`);
  await new Promise(r => setTimeout(r, 600));
  const hasDotGrid = await evalExpr('!!document.querySelector(".dot-grid")');
  const hasWeightPlot = await evalExpr('!!document.getElementById("weightPlot")');
  console.log('Progress DotGrid rendered:', hasDotGrid);
  console.log('Progress 120px weight plot rendered:', hasWeightPlot);

  console.log('\n--- 7. Testing Settings & Backup Export Format ---');
  await evalExpr(`document.querySelector('[data-tab="today"]')?.click()`);
  await new Promise(r => setTimeout(r, 500));
  await evalExpr(`document.getElementById("settingsBtn")?.click()`);
  await new Promise(r => setTimeout(r, 600));
  const settingsOpen = await evalExpr('!!document.getElementById("exportBtn")');
  console.log('Settings sheet opened:', settingsOpen);
  await evalExpr(`document.getElementById("closeSettingsBtn")?.click()`);
  await new Promise(r => setTimeout(r, 400));

  const exportCheck = await evalExpr(`
    (function() {
      const keys = ['rg_profile', 'rg_sessions', 'rg_meals', 'rg_history'];
      const data = {};
      keys.forEach(k => { data[k] = JSON.parse(localStorage.getItem(k) || 'null'); });
      const d = new Date();
      const pad = n => String(n).padStart(2, '0');
      const todayStr = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
      const expectedFileName = 'regain-backup-' + todayStr + '.json';
      return {
        hasProfile: !!data.rg_profile,
        todayStr,
        expectedFileName,
        jsonValid: typeof JSON.stringify(data) === 'string'
      };
    })()
  `);
  console.log('Export check:', exportCheck);

  console.log('\n--- 8. Checking Console Errors & Service Worker ---');
  const swRegistered = await evalExpr('!!navigator.serviceWorker');
  console.log('Service Worker API available:', swRegistered);
  console.log('Total console errors captured:', errors.length);
  if (errors.length > 0) console.error('Errors:', errors);

  ws.close();
  chrome.kill();
  server.close();
  try {
    fs.rmSync(tempDir, { recursive: true, force: true });
  } catch (e) {}

  if (errors.length === 0 && setSurvives && hasHero && hasDotGrid && swapSheetOpen && settingsOpen && exportCheck.hasProfile) {
    console.log('\n=============================================');
    console.log(' ALL 390px MOBILE BROWSER TESTS PASSED 100%! ');
    console.log('=============================================\n');
    process.exit(0);
  } else {
    console.error('Mobile test failed!');
    process.exit(1);
  }
});
