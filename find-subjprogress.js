const fs = require('fs');
const d = fs.readFileSync('src/views/dashboard.tsx', 'utf8');
// Find subject-progress mobile widget render
const idx1 = d.indexOf("'subject-progress'");
let idx = idx1;
for (let i = 0; i < 5; i++) {
  idx = d.indexOf("'subject-progress'", idx + 1);
  if (idx < 0) break;
}
const base = d.indexOf("'subject-progress'");
// find the render usage (last occurrence before mobile section end)
console.log('occurrences of subject-progress:', (d.match(/'subject-progress'/g) || []).length);
// Show the render block: find "Subject Progress" label
const label = d.indexOf('Subject Progress');
console.log('Label idx:', label);
console.log(d.substring(label - 600, label + 1800));
