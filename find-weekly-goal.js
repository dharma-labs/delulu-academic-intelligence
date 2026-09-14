const fs = require('fs');
const d = fs.readFileSync('src/views/dashboard.tsx', 'utf8');
const wg = d.indexOf("'weekly-goal'");
console.log('weekly-goal idx:', wg);
// Find render section — search for the second occurrence
const wg2 = d.indexOf("'weekly-goal'", wg + 1);
const wg3 = d.indexOf("'weekly-goal'", (wg2 > 0 ? wg2 : wg) + 1);
const renderIdx = wg3 > 0 ? wg3 : (wg2 > 0 ? wg2 : wg);
console.log(d.substring(renderIdx - 300, renderIdx + 2500));
