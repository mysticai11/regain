const fs = require('fs');
const path = require('path');

const filesToCopy = [
  'index.html',
  'tokens.css',
  'db.js',
  'manifest.json',
  'icon-192.svg',
  'icon-512.svg',
  'sw.js'
];

const dirsToCopy = [
  'css',
  'js',
  'assets'
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

dirsToCopy.forEach(dir => {
  const src = path.join(__dirname, dir);
  const dest = path.join(destDir, dir);
  if (fs.existsSync(src)) {
    fs.cpSync(src, dest, { recursive: true });
    console.log(`Copied directory ${dir}/ to www/${dir}/`);
  }
});

console.log('Build completed successfully!');
