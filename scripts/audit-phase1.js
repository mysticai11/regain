const fs = require('fs');
const path = require('path');

function extractKeys(text) {
  const keys = new Set();
  const patterns = [
    /localStorage\.(?:getItem|setItem|removeItem)\(['"`]([^'"`]+)['"`]/g,
    /\bls\(['"`]([^'"`]+)['"`]/g,
    /\bsv\(['"`]([^'"`]+)['"`]/g,
    /'(rg_[a-zA-Z0-9_]+)'/g,
    /'(tally_[a-zA-Z0-9_]+)'/g,
    /'(regain_[a-zA-Z0-9_]+)'/g,
    /"(rg_[a-zA-Z0-9_]+)"/g,
    /"(tally_[a-zA-Z0-9_]+)"/g,
    /"(regain_[a-zA-Z0-9_]+)"/g
  ];

  for (const regex of patterns) {
    let m;
    while ((m = regex.exec(text)) !== null) {
      keys.add(m[1]);
    }
  }
  return Array.from(keys).sort();
}

const orig = fs.readFileSync('backup/index.original.html', 'utf8');
const origKeys = extractKeys(orig);

function getAllJsFiles(dir) {
  let files = [];
  for (const item of fs.readdirSync(dir)) {
    const full = path.join(dir, item);
    if (fs.statSync(full).isDirectory()) {
      files = files.concat(getAllJsFiles(full));
    } else if (item.endsWith('.js')) {
      files.push(full);
    }
  }
  return files;
}

let currentJsText = '';
for (const file of getAllJsFiles('js')) {
  currentJsText += '\n' + fs.readFileSync(file, 'utf8');
}
const currentKeys = extractKeys(currentJsText);

console.log('=== ORIGINAL KEYS IN BACKUP ===');
console.log(origKeys);

console.log('\n=== CURRENT KEYS IN JS/ ===');
console.log(currentKeys);

const missingFromCurrent = origKeys.filter(k => !currentKeys.includes(k));
console.log('\n=== KEYS IN ORIGINAL BUT NOT DIRECTLY FOUND IN CURRENT ===');
console.log(missingFromCurrent);

