const fs = require('fs');
const d = fs.readFileSync('src/views/dashboard.tsx', 'utf8');
// Render of microMetrics
const idx = d.indexOf('microMetrics.map');
console.log('microMetrics.map idx:', idx);
console.log(d.substring(idx - 400, idx + 1400));
