const fs = require('fs');

// 1. package.json → 4.1.0
const pp = 'package.json';
let pkg = JSON.parse(fs.readFileSync(pp, 'utf8'));
pkg.version = '4.1.0';
fs.writeFileSync(pp, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
console.log('package.json version → 4.1.0');

// 2. app-info.ts → 4.1.0
const ap = 'src/lib/app-info.ts';
let a = fs.readFileSync(ap, 'utf8');
a = a.replace("export const APP_VERSION = '4.0.0';", "export const APP_VERSION = '4.1.0';");
fs.writeFileSync(ap, a, 'utf8');
console.log('app-info.ts APP_VERSION → 4.1.0');

// 3. report.tsx — version-agnostic strings
const rp = 'src/views/report.tsx';
let r = fs.readFileSync(rp, 'utf8');
r = r.split('Delulu 4.0 \\u2014 Academic Report').join('Delulu \\u2014 Academic Report');
r = r.split('Delulu 4.0 \\u2014 Academic Operating System').join('Delulu \\u2014 Academic Operating System');
r = r.split('Delulu 4.0 \u2014 Academic Report').join('Delulu \u2014 Academic Report');
r = r.split('Delulu 4.0 \u2014 Academic Operating System').join('Delulu \u2014 Academic Operating System');
r = r.split('Delulu 4.0 - Academic Report').join('Delulu - Academic Report');
fs.writeFileSync(rp, r, 'utf8');
console.log('report.tsx version strings cleaned, remaining 4.0 refs:', (r.match(/4\.0/g) || []).length);

// 4. settings.tsx — wire About to app-info constants
const sp = 'src/views/settings.tsx';
let s = fs.readFileSync(sp, 'utf8');
// Add import after the last lib import or after first import line
if (!s.includes('@/lib/app-info')) {
  // find a stable anchor: the lucide import end
  const lucideIdx = s.indexOf("} from 'lucide-react';");
  const insertAt = lucideIdx + "} from 'lucide-react';".length;
  s = s.substring(0, insertAt) + "\nimport { APP_NAME, APP_VERSION, APP_TAGLINE, DEVELOPER_CREDIT, DEVELOPER_INSTAGRAM, DEVELOPER_INSTAGRAM_URL, DEVELOPER_EMAIL } from '@/lib/app-info';" + s.substring(insertAt);
}
// Replace hardcoded version rows
s = s.replace('<span className="text-xs font-medium">Delulu 4.0</span>', '<span className="text-xs font-medium">{APP_NAME} {APP_VERSION}</span>');
s = s.replace('<span className="text-xs font-medium">4.0.0</span>', '<span className="text-xs font-medium">{APP_VERSION}</span>');
// Replace tagline paragraph with constant
s = s.replace(
  'An Academic Operating System for serious students. Fun brand. Serious product.',
  "{APP_TAGLINE}"
);
// Replace credit name with constant
s = s.replace('<p className="text-xs font-semibold">Delulu by Dharmendra</p>', '<p className="text-xs font-semibold">{DEVELOPER_CREDIT}</p>');
s = s.replace('href="https://instagram.com/d4.5dx"', 'href={DEVELOPER_INSTAGRAM_URL}');
s = s.replace('>@d4.5dx</a>', '>{DEVELOPER_INSTAGRAM}</a>');
s = s.replace('href="mailto:kumarsbm005@gmail.com"', 'href={`mailto:${DEVELOPER_EMAIL}`}');
s = s.replace(/\n\s*kumarsbm005@gmail.com\n(\s*)<\/a>/, '\n                {DEVELOPER_EMAIL}\n              </a>');
fs.writeFileSync(sp, s, 'utf8');
console.log('settings.tsx wired to app-info constants, remaining hardcoded 4.0.0:', (s.match(/4\.0\.0/g) || []).length);
