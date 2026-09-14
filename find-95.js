const fs = require('fs');
const path = require('path');
const results = [];
function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    const st = fs.statSync(full);
    if (st.isDirectory()) walk(full);
    else if (/\.(tsx?|ts)$/.test(f)) {
      const c = fs.readFileSync(full, 'utf8');
      const lines = c.split('\n');
      lines.forEach((line, i) => {
        if (/9\s*\.\s*5|9\.5|\u00d7\s*9|x 9\.5/i.test(line)) {
          results.push(full.replace(/.*src/, 'src') + ':' + (i + 1) + ': ' + line.trim().substring(0, 110));
        }
      });
    }
  }
}
walk('src');
console.log(results.length ? results.join('\n') : 'NO 9.5 matches anywhere in src');
