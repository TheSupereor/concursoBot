/**
 * Integration tests: they talk to a real MySQL (`docker compose up -d mysql`) and create a
 * throwaway database per spec file, built by running the real migrations.
 */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.integration\\.spec\\.ts$',
  transform: { '^.+\\.(t|j)s$': 'ts-jest' },
  testEnvironment: 'node',
  testTimeout: 30000,
};
