const fs = require('fs');
// app-shell: ai-tutor nav
const a = fs.readFileSync('src/components/app-shell.tsx', 'utf8');
const navRefs = (a.match(/ai-tutor/g) || []).length;
console.log('app-shell ai-tutor refs:', navRefs);
const idx = a.indexOf('ai-tutor');
if (idx > 0) console.log(a.substring(idx - 150, idx + 150).split('\n').join(' | '));

// dashboard: ai tutor widgets
const d = fs.readFileSync('src/views/dashboard.tsx', 'utf8');
console.log('dashboard ai refs:', (d.match(/ai-tutor|AI Tutor|AiTutor|Sparkles/g) || []).length);

// mobile quick actions include AI?
const qa = d.indexOf("'ai-tutor'");
console.log('dashboard ai-tutor view ref idx:', qa);
if (qa > 0) console.log(d.substring(qa - 300, qa + 200));
