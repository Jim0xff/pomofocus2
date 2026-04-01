import fs from 'node:fs';

const sourcePath = new URL('../src/index.ts', import.meta.url);
const src = fs.readFileSync(sourcePath, 'utf8');

const routeRegex = /app\.(get|post|put|patch|delete)\(\s*['"]([^'"]+)['"]/g;
const routes = [];
let m;
while ((m = routeRegex.exec(src)) !== null) {
  routes.push({ method: m[1].toUpperCase(), path: m[2] });
}

const forbiddenKeywords = ['export', 'notify', 'notification', 'review', 'approve', 'audit'];
const forbiddenMatches = routes.filter((r) =>
  forbiddenKeywords.some((k) => r.path.toLowerCase().includes(k)),
);

const outOfScopePrefixes = ['/api/export', '/api/notify', '/api/notification', '/api/review', '/api/audit'];
const forbiddenPrefixMatches = routes.filter((r) =>
  outOfScopePrefixes.some((p) => r.path.startsWith(p)),
);

const required = [
  'POST /api/signup',
  'POST /api/admin/login',
  'GET /api/admin/signups',
];
const routeSet = new Set(routes.map((r) => `${r.method} ${r.path}`));
const missingRequired = required.filter((x) => !routeSet.has(x));

const result = {
  scanned_file: '../src/index.ts',
  route_count: routes.length,
  routes,
  missing_required: missingRequired,
  forbidden_keyword_matches: forbiddenMatches,
  forbidden_prefix_matches: forbiddenPrefixMatches,
  pass: missingRequired.length === 0 && forbiddenMatches.length === 0 && forbiddenPrefixMatches.length === 0,
};

console.log(JSON.stringify(result, null, 2));

if (!result.pass) {
  process.exit(1);
}
