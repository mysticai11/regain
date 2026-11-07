import http from 'http';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const outDir = path.join(rootDir, 'docs', 'feel-pack');
const artifactDir = 'C:/Users/singh/.gemini/antigravity/brain/ce0539a3-f8eb-4f84-8c59-fddbf048d17a';
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

function createHtml(screen) {
  let originalHtml = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');
  let navAction = '';
  if (screen === 'gym') {
    navAction = `
      setTimeout(function() {
        var gBtn = document.querySelector('[data-tab="gym"]');
        if (gBtn) gBtn.click();
      }, 350);
    `;
  } else if (screen === 'progress') {
    navAction = `
      setTimeout(function() {
        var pBtn = document.querySelector('[data-tab="progress"]');
        if (pBtn) pBtn.click();
      }, 350);
    `;
  } else if (screen === 'settings') {
    navAction = `
      setTimeout(function() {
        var sBtn = document.getElementById('settingsBtn');
        if (sBtn) sBtn.click();
      }, 350);
    `;
  }
  const bootstrapScript = `
  <script>
  (function() {
    var today = new Date().toISOString().slice(0, 10);
    var profile = {
      name: 'Hardgainer',
      startDate: '2026-10-01',
      programSplit: '5day',
      trainingDays: [1, 2, 4, 5, 6],
      currentWeight: 54.0,
      targetWeight: 60.0
    };
    localStorage.setItem('rg_profile', JSON.stringify(profile));
    window.addEventListener('DOMContentLoaded', function() {
      ${navAction}
    });
  })();
  </script>
  `;
  return originalHtml.replace('</head>', bootstrapScript + '</head>');
}

export async function captureItem(prefix, screen = 'today') {
  const server = http.createServer((req, res) => {
    const urlObj = new URL(req.url, 'http://localhost:8097');
    let reqPath = urlObj.pathname;
    if (reqPath === '/' || reqPath === '/index.html') {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(createHtml(screen));
      return;
    }
    const filePath = path.join(rootDir, reqPath);
    if (!fs.existsSync(filePath)) { res.writeHead(404); res.end('Not Found'); return; }
    res.writeHead(200, { 'Access-Control-Allow-Origin': '*' });
    fs.createReadStream(filePath).pipe(res);
  });

  await new Promise(r => server.listen(8097, r));

  const captures = [
    { name: `${prefix}-360x800.png`, w: 360, h: 800, scale: 1 },
    { name: `${prefix}-393x852.png`, w: 393, h: 852, scale: 1 },
    { name: `${prefix}-412x915.png`, w: 412, h: 915, scale: 1 },
    { name: `${prefix}-fontscale-1.3.png`, w: 393, h: 852, scale: 1.3 }
  ];

  for (const c of captures) {
    const outPath = path.join(outDir, c.name);
    const artPath = path.join(artifactDir, c.name);
    const args = [
      '--headless=new',
      '--disable-gpu',
      '--no-sandbox',
      '--force-device-scale-factor=' + c.scale,
      '--window-size=' + c.w + ',' + c.h,
      '--screenshot=' + outPath,
      'http://localhost:8097/index.html'
    ];
    await new Promise(res => {
      const child = spawn(chromePath, args);
      child.on('close', () => {
        try { fs.copyFileSync(outPath, artPath); } catch(e){}
        res();
      });
    });
    console.log(`Captured ${c.name}`);
  }

  server.close();
}

if (process.argv[1] && process.argv[1].endsWith('capture-feelpack.js')) {
  const prefix = process.argv[2] || 'feelpack-f1';
  const screen = process.argv[3] || 'today';
  captureItem(prefix, screen).then(() => {
    console.log('Capture finished for ' + prefix);
    process.exit(0);
  }).catch(e => {
    console.error(e);
    process.exit(1);
  });
}
