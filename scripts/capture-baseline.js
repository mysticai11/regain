import http from 'http';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const outDir = path.resolve(rootDir, 'docs', 'ui-baseline');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml'
};

// Create an augmented HTML template that seeds realistic demo data for the requested screen state
function createHtmlForState(stateId, hash) {
  let originalHtml = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');

  const bootstrapScript = `
  <script>
  (function() {
    var state = "${stateId}";
    var today = new Date().toISOString().slice(0, 10);
    var profile = {
      name: "Hardgainer",
      startDate: "2026-10-01",
      programSplit: "5day",
      trainingDays: [1, 2, 4, 5, 6],
      currentWeight: 54.0,
      targetWeight: 60.0,
      weightEntries: [
        { id: "w1", dayKey: "2026-10-10", weight: 53.0 },
        { id: "w2", dayKey: "2026-10-20", weight: 53.5 },
        { id: "w3", dayKey: "2026-11-01", weight: 53.8 },
        { id: "w4", dayKey: today, weight: 54.0 }
      ]
    };
    localStorage.setItem("rg_profile", JSON.stringify(profile));

    if (state.indexOf("catchup") > -1) {
      localStorage.setItem("rg_missed_test", "1");
    }

    if (state === "today-logged-food") {
      var rec = {
        extra: [
          { name: "Whole Milk (500ml)", kcal: 320, protein: 17, carbs: 24, fat: 16, servings: 1 },
          { name: "Whey Protein Isolate", kcal: 130, protein: 27, carbs: 2, fat: 1, servings: 1 },
          { name: "Peanut Butter (32g)", kcal: 190, protein: 8, carbs: 7, fat: 16, servings: 1 }
        ]
      };
      localStorage.setItem("rg_day_" + today, JSON.stringify(rec));
    }

    if (state === "gym-set-logged" || state === "gym-timer") {
      var wRec = {
        workout: {
          "incline_bench": [{ weight: 60, reps: 10, rir: 2 }]
        },
        workoutMeta: {
          startedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString()
        }
      };
      localStorage.setItem("rg_day_" + today, JSON.stringify(wRec));
    }

    window.addEventListener("DOMContentLoaded", function() {
      setTimeout(function() {
        if (state === "gym-expanded") {
          window.activeExpandedExId = "all";
          if (typeof renderGym === "function") renderGym();
        } else if (state === "progress-lifts") {
          var liftsBtn = document.querySelector('[data-subtab="lifts"]');
          if (liftsBtn) liftsBtn.click();
        } else if (state === "progress-history") {
          var histBtn = document.querySelector('[data-subtab="history"]');
          if (histBtn) histBtn.click();
        } else if (state === "settings") {
          var setBtn = document.getElementById("settingsBtn");
          if (setBtn) setBtn.click();
        }
      }, 350);
    });
  })();
  </script>
  `;

  return originalHtml.replace('</head>', bootstrapScript + '</head>');
}

const server = http.createServer((req, res) => {
  const urlObj = new URL(req.url, 'http://localhost:8089');
  let reqPath = urlObj.pathname;
  if (reqPath === '/' || reqPath === '/index.html') {
    const stateId = urlObj.searchParams.get('state') || 'today-default';
    const hash = urlObj.searchParams.get('hash') || '';
    const html = createHtmlForState(stateId, hash);
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
    return;
  }

  const filePath = path.join(rootDir, reqPath);
  if (!fs.existsSync(filePath)) {
    res.writeHead(404);
    res.end('Not Found');
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  res.writeHead(200, {
    'Content-Type': contentType,
    'Access-Control-Allow-Origin': '*'
  });
  fs.createReadStream(filePath).pipe(res);
});

const PORT = 8089;
server.listen(PORT, async () => {
  console.log(`Snapshot server listening at http://localhost:${PORT}`);

  const viewports = [
    { name: '360x800', width: 360, height: 800 },
    { name: '393x852', width: 393, height: 852 },
    { name: '412x915', width: 412, height: 915 }
  ];

  const states = [
    { id: 'today-default', hash: 'today' },
    { id: 'today-catchup', hash: 'today' },
    { id: 'today-logged-food', hash: 'today' },
    { id: 'gym-collapsed', hash: 'gym' },
    { id: 'gym-expanded', hash: 'gym' },
    { id: 'gym-set-logged', hash: 'gym' },
    { id: 'progress-body', hash: 'progress' },
    { id: 'progress-lifts', hash: 'progress' },
    { id: 'progress-history', hash: 'progress' },
    { id: 'settings', hash: 'settings' }
  ];

  const total = viewports.length * states.length;
  let count = 0;

  for (const vp of viewports) {
    for (const state of states) {
      count++;
      const fileName = `${state.id}-${vp.name}.png`;
      const targetPath = path.join(outDir, fileName);
      console.log(`[${count}/${total}] Capturing ${fileName}...`);

      const url = `http://localhost:${PORT}/index.html?state=${state.id}&hash=${state.hash}&t=${Date.now()}#${state.hash}`;
      await captureScreenshot(url, targetPath, vp.width, vp.height);
    }
  }

  console.log('\nAll reference baseline screenshots captured successfully into docs/ui-baseline/!');
  server.close();
  process.exit(0);
});

function captureScreenshot(url, targetPath, width, height) {
  return new Promise((resolve) => {
    const tmpProf = path.join(process.env.TEMP || 'C:\\Temp', 'chrome_prof_' + Math.random().toString(36).substring(7));
    const args = [
      '--headless=new',
      '--disable-gpu',
      '--no-sandbox',
      `--user-data-dir=${tmpProf}`,
      `--window-size=${width},${height}`,
      `--screenshot=${targetPath}`,
      url
    ];

    const child = spawn(chromePath, args);
    child.on('close', () => {
      resolve();
    });
    child.on('error', (err) => {
      console.error('Spawn error:', err);
      resolve();
    });
  });
}
