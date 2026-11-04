const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const iconsDir = path.join(__dirname, '..', 'assets', 'icons');
if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true });

const htmlTemplate = (svgPath) => `<!DOCTYPE html>
<html>
<head>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 100%; height: 100%; overflow: hidden; background: #0B0B0C; }
  img { width: 100%; height: 100%; display: block; }
</style>
</head>
<body>
  <img src="${svgPath}">
</body>
</html>`;

const targets = [
  { size: 512, name: 'icon-512.png', svg: 'icon-1024.svg' },
  { size: 192, name: 'icon-192.png', svg: 'icon-1024.svg' },
  { size: 180, name: 'apple-touch-icon.png', svg: 'icon-1024.svg' },
  { size: 32, name: 'icon-32.png', svg: 'icon-1024.svg' },
  { size: 16, name: 'icon-16.png', svg: 'icon-1024.svg' },
  { size: 512, name: 'icon-maskable-512.png', svg: 'icon-maskable.svg' },
  { size: 512, name: 'icon-monochrome-512.png', svg: 'icon-monochrome.svg' }
];

for (const t of targets) {
  const tmpHtml = path.join(iconsDir, `tmp-${t.name}.html`);
  const svgAbs = path.join(iconsDir, t.svg).replace(/\\/g, '/');
  fs.writeFileSync(tmpHtml, htmlTemplate(svgAbs));

  const outPath = path.join(iconsDir, t.name);
  console.log(`Generating ${t.name} (${t.size}x${t.size})...`);

  spawnSync(chromePath, [
    '--headless=new',
    '--disable-gpu',
    `--window-size=${t.size},${t.size}`,
    '--hide-scrollbars',
    '--default-background-color=00000000',
    `--screenshot=${outPath}`,
    `file:///${tmpHtml.replace(/\\/g, '/')}`
  ]);

  if (fs.existsSync(tmpHtml)) fs.unlinkSync(tmpHtml);
  if (fs.existsSync(outPath)) {
    console.log(`✓ Created ${t.name} (${fs.statSync(outPath).size} bytes)`);
  } else {
    console.error(`✗ Failed to create ${t.name}`);
  }
}

