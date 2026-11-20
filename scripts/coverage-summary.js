// Prints the unit test coverage by architectural layer as a Markdown table.
//
// CI appends it to the job summary (GITHUB_STEP_SUMMARY). The thresholds that fail the build
// live in the Jest configuration (package.json); this only makes the numbers easy to read.
//
//   npm run test:ci && node scripts/coverage-summary.js
const fs = require('fs');
const path = require('path');

const dir = process.argv[2] || 'coverage';
const file = path.join(process.cwd(), dir, 'coverage-summary.json');
if (!fs.existsSync(file)) {
  console.error(`No coverage summary at ${file}. Run "npm run test:ci" first.`);
  process.exit(1);
}
const summary = JSON.parse(fs.readFileSync(file, 'utf8'));

const layerOf = (relative) => {
  if (relative.startsWith('infrastructure/')) {
    return relative.split('/').slice(0, 2).join('/');
  }
  return relative.split('/')[0];
};

const layers = {};
for (const [absolute, metrics] of Object.entries(summary)) {
  if (absolute === 'total') continue;
  const relative = absolute.split(path.sep).join('/').split('/src/')[1];
  if (!relative) continue;
  const layer = (layers[layerOf(relative)] ||= {
    lines: [0, 0],
    branches: [0, 0],
    functions: [0, 0],
  });
  for (const key of Object.keys(layer)) {
    layer[key][0] += metrics[key].covered;
    layer[key][1] += metrics[key].total;
  }
}

const pct = ([covered, total]) =>
  total === 0 ? '–' : `${((100 * covered) / total).toFixed(1)}%`;

console.log('### Unit test coverage by layer\n');
console.log('| Layer | Lines | Branches | Functions |');
console.log('| --- | ---: | ---: | ---: |');
for (const [name, layer] of Object.entries(layers).sort()) {
  console.log(
    `| \`${name}\` | ${pct(layer.lines)} | ${pct(layer.branches)} | ${pct(layer.functions)} |`,
  );
}
console.log(
  '\n`infrastructure/persistence` is covered by the integration tests (real MySQL), not by these unit tests.',
);
