// Reads the real PCI Concursos listings once and checks that the parser still understands them.
//
// The site is not an API: its markup changes without notice, and the previous scraper stayed
// silently broken for months because nothing watched it. This runs weekly in CI
// (.github/workflows/scraper-health.yml) and can be run by hand:
//
//   npm run build && npm run scraper:check
//
// It makes five polite requests (honest User-Agent, robots.txt respected, pauses between pages).
const {
  createVacancySources,
} = require('../dist/infrastructure/scraper/vacancy-sources.factory.js');
const { isRegion } = require('../dist/domain/value-objects/region.js');
const { classifyAreas } = require('../dist/domain/services/area-classifier.js');

const config = {
  scraper: {
    enabledSources: ['pci-concursos'],
    userAgent:
      process.env.SCRAPER_USER_AGENT ||
      'RadarConcursosBot/1.0 (+https://github.com/TheSupereor/concursoBot)',
    pci: { baseUrl: 'https://www.pciconcursos.com.br', pageDelayMs: 2000 },
  },
};

const ratio = (items, predicate) =>
  items.length === 0 ? 0 : items.filter(predicate).length / items.length;

(async () => {
  const [source] = createVacancySources(config);
  const vacancies = await source.fetch();

  const checks = [
    ['at least 20 vacancies', vacancies.length >= 20, vacancies.length],
    [
      'every vacancy has a link',
      ratio(vacancies, (v) => v.url.startsWith('http')) === 1,
      ratio(vacancies, (v) => v.url.startsWith('http')),
    ],
    [
      '95% have a valid region',
      ratio(vacancies, (v) => isRegion(v.region)) >= 0.95,
      ratio(vacancies, (v) => isRegion(v.region)),
    ],
    [
      'half state a salary',
      ratio(vacancies, (v) => v.salaryMax !== null) >= 0.5,
      ratio(vacancies, (v) => v.salaryMax !== null),
    ],
    [
      '80% have a deadline',
      ratio(vacancies, (v) => v.deadline !== null) >= 0.8,
      ratio(vacancies, (v) => v.deadline !== null),
    ],
    [
      'some are classified in an area',
      ratio(vacancies, (v) => classifyAreas(v)[0] !== 'OUTROS') >= 0.2,
      ratio(vacancies, (v) => classifyAreas(v)[0] !== 'OUTROS'),
    ],
  ];

  let failed = false;
  for (const [label, ok, value] of checks) {
    console.log(
      `${ok ? 'ok  ' : 'FAIL'} ${label} (${typeof value === 'number' && value <= 1 ? Math.round(value * 100) + '%' : value})`,
    );
    if (!ok) failed = true;
  }
  if (failed) {
    console.error(
      '\nThe live site no longer matches what the parser expects. Check the markup.',
    );
    process.exit(1);
  }
  console.log(`\nLive source healthy: ${vacancies.length} vacancies parsed.`);
})().catch((error) => {
  console.error('Live source check failed:', error.message);
  process.exit(1);
});
