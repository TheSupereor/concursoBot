/**
 * Architecture rules, enforced in CI (`npm run arch:check`).
 *
 * Hexagonal architecture: dependencies point inwards.
 *
 *   modules / main  ->  infrastructure  ->  application  ->  domain
 *
 * The domain knows nothing about the outside world; the application orchestrates the domain
 * through ports; infrastructure implements those ports with frameworks and drivers.
 */

/** Packages that must never leak into the inner layers. */
const FRAMEWORKS =
  '^node_modules/(@nestjs|typeorm|telegraf|nestjs-telegraf|stripe|axios|amqplib|amqp-connection-manager|cheerio|bottleneck|mysql2|express|rxjs|zod)(/|$)';

module.exports = {
  forbidden: [
    {
      name: 'domain-is-self-contained',
      comment: 'The domain may only depend on itself.',
      severity: 'error',
      from: { path: '^src/domain' },
      to: { path: '^src/(application|infrastructure|modules|shared)' },
    },
    {
      name: 'domain-has-no-framework',
      comment: 'Domain code must not import frameworks or drivers.',
      severity: 'error',
      from: { path: '^src/domain' },
      to: { dependencyTypes: ['npm', 'npm-dev', 'npm-peer'], path: FRAMEWORKS },
    },
    {
      name: 'application-depends-only-on-domain',
      comment:
        'Use cases depend on the domain and on ports, never on infrastructure or wiring.',
      severity: 'error',
      from: { path: '^src/application', pathNot: '\\.spec\\.ts$' },
      to: { path: '^src/(infrastructure|modules)' },
    },
    {
      name: 'application-has-no-framework',
      comment: 'Use cases are plain classes: no NestJS, ORM or SDK imports.',
      severity: 'error',
      from: { path: '^src/application', pathNot: '\\.spec\\.ts$' },
      to: { dependencyTypes: ['npm', 'npm-dev', 'npm-peer'], path: FRAMEWORKS },
    },
    {
      name: 'infrastructure-does-not-know-wiring',
      comment: 'Adapters must not import the modules that compose them.',
      severity: 'error',
      from: { path: '^src/infrastructure' },
      to: { path: '^src/modules' },
    },
    {
      name: 'test-helpers-only-in-specs',
      comment:
        'Test doubles live in src/shared/testing and may only be used by specs.',
      severity: 'error',
      from: { path: '^src', pathNot: '\\.spec\\.ts$' },
      to: { path: '^src/shared/testing' },
    },
    {
      name: 'no-circular',
      comment:
        'Circular dependencies make the structure impossible to reason about. ORM entities are exempt: bidirectional relations (Subscriber <-> Preference) are circular by nature in TypeORM.',
      severity: 'error',
      from: { pathNot: '^src/infrastructure/persistence/entities' },
      to: { circular: true },
    },
    {
      name: 'no-orphans',
      comment: 'Unreferenced modules are usually dead code.',
      severity: 'warn',
      from: {
        orphan: true,
        pathNot: ['\\.spec\\.ts$', '^src/main\\.ts$', '\\.d\\.ts$'],
      },
      to: {},
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsConfig: { fileName: 'tsconfig.json' },
    tsPreCompilationDeps: true,
    exclude: { path: '^src/.*\\.spec\\.ts$' },
  },
};
