const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const rootDir = path.join(__dirname, '..');
const assetsDir = path.join(rootDir, 'assets', 'icons');
const androidRes = path.join(rootDir, 'android', 'app', 'src', 'main', 'res');
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });

// 1. Master SVG Definitions: 5-Bar Tally Mark Icon
// Deep dark #0B0B0C background, 4 crisp off-white #F5F5F4 vertical tally bars, 1 electric lime #C6F432 diagonal slash
const masterSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
  <rect width="1024" height="1024" fill="#0B0B0C"/>
  <g stroke-linecap="round">
    <line x1="310" y1="280" x2="310" y2="744" stroke="#F5F5F4" stroke-width="64"/>
    <line x1="424" y1="280" x2="424" y2="744" stroke="#F5F5F4" stroke-width="64"/>
    <line x1="538" y1="280" x2="538" y2="744" stroke="#F5F5F4" stroke-width="64"/>
    <line x1="652" y1="280" x2="652" y2="744" stroke="#F5F5F4" stroke-width="64"/>
    <line x1="220" y1="670" x2="740" y2="354" stroke="#C6F432" stroke-width="64"/>
  </g>
</svg>`;

// Maskable Icon (Centered with 15% safe-zone margin)
const maskableSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
  <rect width="1024" height="1024" fill="#0B0B0C"/>
  <g transform="translate(102.4, 102.4) scale(0.8)" stroke-linecap="round">
    <line x1="310" y1="280" x2="310" y2="744" stroke="#F5F5F4" stroke-width="64"/>
    <line x1="424" y1="280" x2="424" y2="744" stroke="#F5F5F4" stroke-width="64"/>
    <line x1="538" y1="280" x2="538" y2="744" stroke="#F5F5F4" stroke-width="64"/>
    <line x1="652" y1="280" x2="652" y2="744" stroke="#F5F5F4" stroke-width="64"/>
    <line x1="220" y1="670" x2="740" y2="354" stroke="#C6F432" stroke-width="64"/>
  </g>
</svg>`;

// Foreground Only (for Android adaptive icons, transparent background)
const foregroundSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
  <g transform="translate(153.6, 153.6) scale(0.7)" stroke-linecap="round">
    <line x1="310" y1="280" x2="310" y2="744" stroke="#F5F5F4" stroke-width="64"/>
    <line x1="424" y1="280" x2="424" y2="744" stroke="#F5F5F4" stroke-width="64"/>
    <line x1="538" y1="280" x2="538" y2="744" stroke="#F5F5F4" stroke-width="64"/>
    <line x1="652" y1="280" x2="652" y2="744" stroke="#F5F5F4" stroke-width="64"/>
    <line x1="220" y1="670" x2="740" y2="354" stroke="#C6F432" stroke-width="64"/>
  </g>
</svg>`;

// Monochrome Icon (Android 13+ themed icons)
const monochromeSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
  <rect width="1024" height="1024" fill="#0B0B0C"/>
  <g transform="translate(102.4, 102.4) scale(0.8)" stroke-linecap="round">
    <line x1="310" y1="280" x2="310" y2="744" stroke="#F5F5F4" stroke-width="64"/>
    <line x1="424" y1="280" x2="424" y2="744" stroke="#F5F5F4" stroke-width="64"/>
    <line x1="538" y1="280" x2="538" y2="744" stroke="#F5F5F4" stroke-width="64"/>
    <line x1="652" y1="280" x2="652" y2="744" stroke="#F5F5F4" stroke-width="64"/>
    <line x1="220" y1="670" x2="740" y2="354" stroke="#F5F5F4" stroke-width="64"/>
  </g>
</svg>`;

// Write SVGs to disk
fs.writeFileSync(path.join(rootDir, 'icon-192.svg'), masterSvg);
fs.writeFileSync(path.join(rootDir, 'icon-512.svg'), masterSvg);
fs.writeFileSync(path.join(assetsDir, 'icon-1024.svg'), masterSvg);
fs.writeFileSync(path.join(assetsDir, 'icon-maskable.svg'), maskableSvg);
fs.writeFileSync(path.join(assetsDir, 'icon-monochrome.svg'), monochromeSvg);
fs.writeFileSync(path.join(assetsDir, 'icon-foreground.svg'), foregroundSvg);

console.log('✓ Master SVGs written.');

// Render helper using headless Chrome
function renderPng(svgPath, outPath, width, height, bgColor = '#00000000') {
  const tmpHtml = path.join(path.dirname(outPath), `tmp-${path.basename(outPath)}.html`);
  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  html, body { width:100%; height:100%; overflow:hidden; background:${bgColor === '#00000000' ? 'transparent' : bgColor}; }
  img { width:100%; height:100%; display:block; object-fit:contain; }
</style>
</head>
<body>
  <img src="${svgPath.replace(/\\/g, '/')}">
</body>
</html>`;
  fs.writeFileSync(tmpHtml, html);

  const res = spawnSync(chromePath, [
    '--headless=new',
    '--disable-gpu',
    `--window-size=${width},${height}`,
    '--hide-scrollbars',
    `--default-background-color=${bgColor === '#00000000' ? '00000000' : 'ff0b0b0c'}`,
    `--screenshot=${outPath}`,
    `file:///${tmpHtml.replace(/\\/g, '/')}`
  ]);

  if (fs.existsSync(tmpHtml)) fs.unlinkSync(tmpHtml);
  if (fs.existsSync(outPath) && fs.statSync(outPath).size > 0) {
    console.log(`✓ Created ${path.basename(outPath)} (${width}x${height})`);
  } else {
    console.error(`✗ Failed to create ${path.basename(outPath)}`);
  }
}

// 2. Generate PWA Icons
const masterSvgPath = path.join(assetsDir, 'icon-1024.svg');
const maskableSvgPath = path.join(assetsDir, 'icon-maskable.svg');
const monochromeSvgPath = path.join(assetsDir, 'icon-monochrome.svg');
const foregroundSvgPath = path.join(assetsDir, 'icon-foreground.svg');

const pwaTargets = [
  { file: 'icon-512.png', size: 512, svg: masterSvgPath, bg: '#0B0B0C' },
  { file: 'icon-192.png', size: 192, svg: masterSvgPath, bg: '#0B0B0C' },
  { file: 'apple-touch-icon.png', size: 180, svg: masterSvgPath, bg: '#0B0B0C' },
  { file: 'icon-32.png', size: 32, svg: masterSvgPath, bg: '#0B0B0C' },
  { file: 'icon-16.png', size: 16, svg: masterSvgPath, bg: '#0B0B0C' },
  { file: 'icon-maskable-512.png', size: 512, svg: maskableSvgPath, bg: '#0B0B0C' },
  { file: 'icon-monochrome-512.png', size: 512, svg: monochromeSvgPath, bg: '#0B0B0C' }
];

console.log('\n--- Generating PWA Icons ---');
pwaTargets.forEach(t => {
  renderPng(t.svg, path.join(assetsDir, t.file), t.size, t.size, t.bg);
});

// 3. Generate Android Launcher & Adaptive Icons
console.log('\n--- Generating Android Launcher Icons ---');
const densities = [
  { name: 'mdpi', iconSize: 48, fgSize: 108 },
  { name: 'hdpi', iconSize: 72, fgSize: 162 },
  { name: 'xhdpi', iconSize: 96, fgSize: 216 },
  { name: 'xxhdpi', iconSize: 144, fgSize: 324 },
  { name: 'xxxhdpi', iconSize: 192, fgSize: 432 }
];

densities.forEach(d => {
  const dir = path.join(androidRes, `mipmap-${d.name}`);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  // Standard icon
  renderPng(masterSvgPath, path.join(dir, 'ic_launcher.png'), d.iconSize, d.iconSize, '#0B0B0C');
  // Round icon
  renderPng(masterSvgPath, path.join(dir, 'ic_launcher_round.png'), d.iconSize, d.iconSize, '#0B0B0C');
  // Adaptive foreground (transparent)
  renderPng(foregroundSvgPath, path.join(dir, 'ic_launcher_foreground.png'), d.fgSize, d.fgSize, '#00000000');
});

// 4. Generate Android Splash Screens (#0B0B0C with centered logo)
console.log('\n--- Generating Android Splash Screens ---');
// Splash SVG: full viewport with centered Tally mark logo
function createSplashSvg(w, h) {
  const logoSize = Math.min(w, h) * 0.36;
  const x = (w - logoSize) / 2;
  const y = (h - logoSize) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" fill="#0B0B0C"/>
  <g transform="translate(${x}, ${y}) scale(${logoSize / 1024})" stroke-linecap="round">
    <line x1="310" y1="280" x2="310" y2="744" stroke="#F5F5F4" stroke-width="64"/>
    <line x1="424" y1="280" x2="424" y2="744" stroke="#F5F5F4" stroke-width="64"/>
    <line x1="538" y1="280" x2="538" y2="744" stroke="#F5F5F4" stroke-width="64"/>
    <line x1="652" y1="280" x2="652" y2="744" stroke="#F5F5F4" stroke-width="64"/>
    <line x1="220" y1="670" x2="740" y2="354" stroke="#C6F432" stroke-width="64"/>
  </g>
</svg>`;
}

const splashTargets = [
  { dir: 'drawable', file: 'splash.png', w: 480, h: 800 },
  { dir: 'drawable-port-mdpi', file: 'splash.png', w: 320, h: 480 },
  { dir: 'drawable-port-hdpi', file: 'splash.png', w: 480, h: 800 },
  { dir: 'drawable-port-xhdpi', file: 'splash.png', w: 720, h: 1280 },
  { dir: 'drawable-port-xxhdpi', file: 'splash.png', w: 960, h: 1600 },
  { dir: 'drawable-port-xxxhdpi', file: 'splash.png', w: 1280, h: 1920 },
  { dir: 'drawable-land-mdpi', file: 'splash.png', w: 480, h: 320 },
  { dir: 'drawable-land-hdpi', file: 'splash.png', w: 800, h: 480 },
  { dir: 'drawable-land-xhdpi', file: 'splash.png', w: 1280, h: 720 },
  { dir: 'drawable-land-xxhdpi', file: 'splash.png', w: 1600, h: 960 },
  { dir: 'drawable-land-xxxhdpi', file: 'splash.png', w: 1920, h: 1280 }
];

splashTargets.forEach(s => {
  const dirPath = path.join(androidRes, s.dir);
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
  const outPath = path.join(dirPath, s.file);
  const splashSvgContent = createSplashSvg(s.w, s.h);
  const tmpSvg = path.join(dirPath, `tmp-splash-${s.w}x${s.h}.svg`);
  fs.writeFileSync(tmpSvg, splashSvgContent);
  renderPng(tmpSvg, outPath, s.w, s.h, '#0B0B0C');
  if (fs.existsSync(tmpSvg)) fs.unlinkSync(tmpSvg);
});

// 5. Update Android XML resources
console.log('\n--- Updating Android XML Resources ---');
// Background color to #0B0B0C
fs.writeFileSync(path.join(androidRes, 'values', 'ic_launcher_background.xml'), `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">#0B0B0C</color>
</resources>
`);

// Background drawable to #0B0B0C
fs.writeFileSync(path.join(androidRes, 'drawable', 'ic_launcher_background.xml'), `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp"
    android:height="108dp"
    android:viewportWidth="108"
    android:viewportHeight="108">
    <path
        android:fillColor="#0B0B0C"
        android:pathData="M0,0h108v108h-108z" />
</vector>
`);

// Remove stale robot vector in drawable-v24 if present
const robotVector = path.join(androidRes, 'drawable-v24', 'ic_launcher_foreground.xml');
if (fs.existsSync(robotVector)) {
  fs.unlinkSync(robotVector);
  console.log('✓ Removed old robot vector drawable-v24/ic_launcher_foreground.xml');
}

console.log('\nAll assets built successfully!');

