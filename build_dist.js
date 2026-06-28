const fs = require('fs');
const path = require('path');

const ASSETS = ['index.html', 'db.js', 'manifest.json', 'sw.js', 'icon-192.svg', 'icon-512.svg'];
const destDir = path.join(__dirname, 'www');

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir);
}

ASSETS.forEach(file => {
  const src = path.join(__dirname, file);
  const dest = path.join(destDir, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`Copied ${file} to www/`);
  } else {
    console.error(`Warning: ${file} not found!`);
  }
});
console.log('Build complete! Assets ready in www/');
