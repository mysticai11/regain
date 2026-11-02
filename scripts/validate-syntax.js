const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const scriptMatches = html.match(/<script>([\s\S]*?)<\/script>/g);
console.log('Script count:', scriptMatches.length);
scriptMatches.forEach((s, idx) => {
  const code = s.replace(/^<script>/, '').replace(/<\/script>$/, '');
  try {
    new Function(code);
    console.log('Script ' + idx + ' parsed with 0 errors! SUCCESS!');
  } catch(err) {
    console.error('Script ' + idx + ' SYNTAX ERROR:', err.message);
  }
});
