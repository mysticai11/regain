const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

let htmlPath = 'index.html';
let html = fs.readFileSync(htmlPath, 'utf8');
let scriptMatches = html.match(/<script>([\s\S]*?)<\/script>/g);
if (!scriptMatches && fs.existsSync('backup/index.original.html')) {
  html = fs.readFileSync('backup/index.original.html', 'utf8');
  scriptMatches = html.match(/<script>([\s\S]*?)<\/script>/g);
}

if (scriptMatches) {
  console.log('Script tag count:', scriptMatches.length);
  scriptMatches.forEach((s, idx) => {
    const code = s.replace(/^<script>/, '').replace(/<\/script>$/, '');
    try {
      new Function(code);
      console.log('Script ' + idx + ' parsed with 0 errors! SUCCESS!');
    } catch(err) {
      console.error('Script ' + idx + ' SYNTAX ERROR:', err.message);
    }
  });
}

function getJsFiles(dir) {
  let res = [];
  if (!fs.existsSync(dir)) return res;
  fs.readdirSync(dir).forEach(f => {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) res = res.concat(getJsFiles(p));
    else if (f.endsWith('.js')) res.push(p);
  });
  return res;
}

const jsFiles = getJsFiles('js');
console.log('Checking', jsFiles.length, 'ES modules in js/ ...');
let errCount = 0;
jsFiles.forEach(f => {
  try {
    execSync(`node --check "${f}"`);
  } catch (err) {
    console.error('Syntax error in', f, err.message);
    errCount++;
  }
});
if (errCount === 0) {
  console.log('All ' + jsFiles.length + ' ES modules passed node --check syntax verification with 0 errors! SUCCESS!');
}
