const fs = require('fs');
const path = require('path');

const filesToCopy = [
  'index.html',
  'db.js',
  'manifest.json',
  'icon-192.svg',
  'icon-512.svg',
  'sw.js'
];

const destDir = path.join(__dirname, 'www');

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir);
}

filesToCopy.forEach(file => {
  const src = path.join(__dirname, file);
  const dest = path.join(destDir, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`Copied ${file} to www/`);
  } else {
    console.warn(`Warning: Source file ${file} does not exist.`);
  }
});
console.log('Build completed successfully!');
