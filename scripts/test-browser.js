const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const mimeTypes = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
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

server.listen(8097, async () => {
  console.log('Test server listening on 8097');
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const tempDir = path.join(__dirname, '..', '.chrome-temp-' + Date.now());

  const chrome = spawn(chromePath, [
    '--headless=new',
    '--disable-gpu',
    '--remote-debugging-port=9223',
    `--user-data-dir=${tempDir}`,
    'http://127.0.0.1:8097/index.html'
  ]);

  let wsUrl = null;
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 200));
    try {
      const targets = await new Promise((resolve, reject) => {
        http.get('http://127.0.0.1:9223/json', res => {
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

  // Wait 1.5s for initial load
  await new Promise(r => setTimeout(r, 1500));

  async function evalExpr(expr) {
    const res = await call('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    return res.result?.value;
  }

  const initialAppHtml = await evalExpr('document.getElementById("app")?.innerHTML.length');
  console.log('Initial app innerHTML length:', initialAppHtml);

  // If on onboarding, let's complete onboarding to have a profile
  const isOnboarding = await evalExpr('!!document.getElementById("obName")');
  console.log('Is on onboarding:', isOnboarding);

  if (isOnboarding) {
    console.log('Completing onboarding...');
    await evalExpr(`
      (function() {
        const nameInput = document.getElementById('obName');
        if (nameInput) nameInput.value = 'Test User';
        const weightInput = document.getElementById('obWeight');
        if (weightInput) weightInput.value = '54.0';
        const targetInput = document.getElementById('obTargetWeight');
        if (targetInput) targetInput.value = '60.0';
        const startBtn = document.getElementById('obStartBtn');
        if (startBtn) startBtn.click();
      })()
    `);
    await new Promise(r => setTimeout(r, 1000));
  }

  const contentLen = await evalExpr('document.getElementById("content")?.innerHTML.length');
  console.log('Content innerHTML length after boot/onboarding:', contentLen);

  // Test tabs switching and logging
  console.log('Testing Gym tab...');
  await evalExpr(`document.querySelector('[data-tab="gym"]')?.click()`);
  await new Promise(r => setTimeout(r, 600));
  const gymLen = await evalExpr('document.getElementById("content")?.innerHTML.length');
  console.log('Gym content length:', gymLen);

  console.log('Logging a set in Gym...');
  await evalExpr(`
    (function() {
      const row = document.querySelector('.set-row-precision');
      if (!row) return false;
      const inputs = row.querySelectorAll('input.precision-input');
      if (inputs.length >= 2) {
        inputs[0].value = '50';
        inputs[0].dispatchEvent(new Event('input', { bubbles: true }));
        inputs[1].value = '10';
        inputs[1].dispatchEvent(new Event('input', { bubbles: true }));
      }
      const tapBtn = row.querySelector('.precision-circle-tap');
      if (tapBtn) {
        tapBtn.click();
        return true;
      }
      return false;
    })()
  `);
  await new Promise(r => setTimeout(r, 600));

  const setLoggedCheck = await evalExpr(`
    (function() {
      const doneBtn = document.querySelector('.precision-circle-tap.done, .precision-circle.done');
      return { hasDone: !!doneBtn };
    })()
  `);
  console.log('Set logged check after re-render:', setLoggedCheck);

  console.log('Testing Progress tab...');
  await evalExpr(`document.querySelector('[data-tab="progress"]')?.click()`);
  await new Promise(r => setTimeout(r, 600));
  const progLen = await evalExpr('document.getElementById("content")?.innerHTML.length');
  console.log('Progress content length:', progLen);
  const dotGridInfo = await evalExpr(`
    (function() {
      const dots = document.querySelectorAll('.dot-grid .dot-cell');
      const consistencyBlock = document.querySelector('.dot-grid')?.parentElement?.innerText;
      return { dotsCount: dots.length, consistencyBlock };
    })()
  `);
  console.log('Dot grid info on Progress tab:', dotGridInfo);

  console.log('Testing Today tab...');
  await evalExpr(`document.querySelector('[data-tab="today"]')?.click()`);
  await new Promise(r => setTimeout(r, 600));
  const todayLen = await evalExpr('document.getElementById("content")?.innerHTML.length');
  console.log('Today content length:', todayLen);

  console.log('Console Errors:', errors);
  console.log('Recent Logs:', logs.slice(-10));

  ws.close();
  chrome.kill();
  server.close();
  try {
    fs.rmSync(tempDir, { recursive: true, force: true });
  } catch (e) {}

  if (errors.length === 0 && todayLen > 100 && gymLen > 100 && progLen > 100) {
    console.log('ALL BROWSER TESTS PASSED 100%!');
    process.exit(0);
  } else {
    console.error('Browser test failed!');
    process.exit(1);
  }
});
