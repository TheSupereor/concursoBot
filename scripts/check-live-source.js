// Reads the real vacancy sources once and checks that the adapters still understand them.
//
// The sources are not documented APIs: PCI Concursos is an HTML page and Cebraspe an internal
// JSON API, and both can change without notice. The previous scraper stayed silently broken for
// months because nothing watched it. This runs weekly in CI (.github/workflows/scraper-health.yml)
// and can be run by hand:
//
//   npm run build && npm run scraper:check              # every source
//   npm run build && npm run scraper:check -- cebraspe  # one source
//
// Requests are polite: honest User-Agent, robots.txt respected, pauses between requests.
const {
  createVacancySources,
} = require('../dist/infrastructure/scraper/vacancy-sources.factory.js');
const { isRegion } = require('../dist/domain/value-objects/region.js');
const { classifyAreas } = require('../dist/domain/services/area-classifier.js');
const {
  KNOWN_VACANCY_SOURCES,
} = require('../dist/shared/config/app.config.js');

const config = (enabledSources) => ({
  scraper: {
    enabledSources,
    userAgent:
      process.env.SCRAPER_USER_AGENT ||
      'RadarConcursosBot/1.0 (+https://github.com/TheSupereor/concursoBot)',
    pci: { baseUrl: 'https://www.pciconcursos.com.br', pageDelayMs: 2000 },
    cebraspe: {
      apiUrl: 'https://apis.cebraspe.org.br/cebraspe',
      siteUrl: 'https://www.cebraspe.org.br',
      requestDelayMs: 1000,
    },
  },
});

const ratio = (items, predicate) =>
  items.length === 0 ? 1 : items.filter(predicate).length / items.length;

// What "healthy" means differs by source. PCI lists hundreds of vacancies; Cebraspe lists only
// the competitions announced or open right now, which can legitimately be none: its format is
// validated by the adapter itself, which throws when the API changes.
const CHECKS = {
  'pci-concursos': (vacancies) => [
    ['at least 20 vacancies', vacancies.length >= 20, `${vacancies.length}`],
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
  ],
  cebraspe: (vacancies) => [
    ['the API answered in the known format', true, `${vacancies.length}`],
    [
      'every competition links to its page',
      ratio(vacancies, (v) =>
        v.url.startsWith('https://www.cebraspe.org.br/concursos/'),
      ) === 1,
      ratio(vacancies, (v) =>
        v.url.startsWith('https://www.cebraspe.org.br/concursos/'),
      ),
    ],
    [
      'every competition has a valid region',
      ratio(vacancies, (v) => isRegion(v.region)) === 1,
      ratio(vacancies, (v) => isRegion(v.region)),
    ],
    [
      'competitions have their roles',
      ratio(vacancies, (v) => v.roles.length > 0) >= 0.5,
      ratio(vacancies, (v) => v.roles.length > 0),
    ],
  ],
};

// Numbers are shares (0 to 1); counts are passed as strings.
const format = (value) =>
  typeof value === 'number' ? `${Math.round(value * 100)}%` : value;

async function check(id) {
  const [source] = createVacancySources(config([id]));
  const vacancies = await source.fetch();

  console.log(`\n${id}: ${vacancies.length} vacancies`);
  let healthy = true;
  for (const [label, ok, value] of CHECKS[id](vacancies)) {
    console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${label} (${format(value)})`);
    if (!ok) healthy = false;
  }
  return healthy;
}

(async () => {
  const requested = process.argv.slice(2);
  const ids = requested.length > 0 ? requested : [...KNOWN_VACANCY_SOURCES];

  let failed = false;
  for (const id of ids) {
    if (!CHECKS[id]) {
      console.error(`Unknown source: ${id}`);
      failed = true;
      continue;
    }
    try {
      if (!(await check(id))) failed = true;
    } catch (error) {
      console.error(`\n${id}: check failed: ${error.message}`);
      failed = true;
    }
  }

  if (failed) {
    console.error(
      '\nA live source no longer matches what its adapter expects. Check it.',
    );
    process.exit(1);
  }
  console.log('\nAll live sources healthy.');
})();
