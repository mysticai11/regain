const fs = require('fs');
const path = require('path');

const allowedHex = new Set([
  '#0B0B0C', '#141416', '#1C1C1F', '#222222', '#222', '#F5F5F4', '#8A8A8E', '#55555A', '#C6F432',
  '#FF4D4F', '#FFFFFF', '#FFF', '#000000', '#000',
  '#8B5CF6', '#38BDF8', '#09090B', '#18181B', '#27272A', '#FAFAFA', '#A1A1AA', '#EC4899'
]);

const allowedFontSizes = new Set([96, 64, 48, 32, 28, 17, 15, 12, 11]);

const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}]|[\u{2700}-\u{2712}\u{2715}-\u{27BF}]/u;

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const fileHits = [];

  lines.forEach((line, lineNum) => {
    // 1. Emoji check
    if (emojiRegex.test(line)) {
      fileHits.push({ line: lineNum + 1, type: 'Emoji', text: line.trim() });
    }

    // 2. Monospace check
    if (/monospace|Space Mono|Courier|Consolas/i.test(line)) {
      fileHits.push({ line: lineNum + 1, type: 'Monospace', text: line.trim() });
    }

    // 3. Shadows / Glows check
    if (/box-shadow:\s*(?!none\b)[^;]+/i.test(line) && !line.includes('box-shadow: none') && !line.includes('var(') && !line.includes('inset 0 1px 0')) {
      fileHits.push({ line: lineNum + 1, type: 'Shadow/Glow', text: line.trim() });
    }

    // 4. Font size check outside scale
    const fsMatches = line.matchAll(/font-size:\s*(\d+)px/g);
    for (const match of fsMatches) {
      const sz = parseInt(match[1], 10);
      if (!allowedFontSizes.has(sz)) {
        fileHits.push({ line: lineNum + 1, type: `FontSize ${sz}px`, text: line.trim() });
      }
    }

    // 5. Hex colors check
    const hexMatches = line.matchAll(/#([0-9a-fA-F]{3,8})\b/g);
    for (const match of hexMatches) {
      const fullHex = match[0].toUpperCase();
      // Normalized
      let norm = fullHex;
      if (norm.length === 4) {
        norm = '#' + norm[1] + norm[1] + norm[2] + norm[2] + norm[3] + norm[3];
      }
      if (!allowedHex.has(fullHex) && !allowedHex.has(norm)) {
        fileHits.push({ line: lineNum + 1, type: `Rogue Hex ${fullHex}`, text: line.trim() });
      }
    }
  });

  return fileHits;
}

function scanDir(dir) {
  const allHits = {};
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) {
      Object.assign(allHits, scanDir(full));
    } else if (f.endsWith('.js') || f.endsWith('.css')) {
      if (full.includes('tokens.css')) continue; // tokens is definition file
      const hits = checkFile(full);
      if (hits.length) allHits[full] = hits;
    }
  }
  return allHits;
}

console.log('--- Scanning css/ and js/ ---');
const hits = scanDir('css');
Object.assign(hits, scanDir('js'));

let count = 0;
for (const [file, list] of Object.entries(hits)) {
  console.log(`\nIn ${file} (${list.length} hits):`);
  list.slice(0, 5).forEach(h => {
    console.log(`  Line ${h.line} [${h.type}]: ${h.text.slice(0, 100)}`);
  });
  if (list.length > 5) console.log(`  ... and ${list.length - 5} more`);
  count += list.length;
}

console.log(`\nTotal audit hits: ${count}`);
