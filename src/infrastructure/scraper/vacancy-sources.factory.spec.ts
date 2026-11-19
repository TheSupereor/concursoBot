import {
  AppConfig,
  KNOWN_VACANCY_SOURCES,
} from '../../shared/config/app.config';
import { PCI_SOURCE_ID } from './pci-concursos.source';
import { createVacancySources } from './vacancy-sources.factory';

const config = (enabledSources: string[]): AppConfig =>
  ({
    scraper: {
      enabledSources,
      intervalMinutes: 60,
      runOnStart: false,
      userAgent: 'TestBot/1.0',
      pci: { baseUrl: 'https://pci.example.test', pageDelayMs: 0 },
    },
  }) as unknown as AppConfig;

describe('createVacancySources', () => {
  it('builds nothing when no source is enabled', () => {
    expect(createVacancySources(config([]))).toEqual([]);
  });

  it('builds the PCI source when it is enabled', () => {
    const sources = createVacancySources(config([PCI_SOURCE_ID]));

    expect(sources.map((source) => source.id)).toEqual([PCI_SOURCE_ID]);
  });

  it('fails clearly for a source it does not know', () => {
    expect(() => createVacancySources(config(['nope']))).toThrow(
      /unknown vacancy source: nope/i,
    );
  });

  it('knows every source the configuration accepts', () => {
    // The configuration validates ids against this list; each one must be buildable.
    for (const id of KNOWN_VACANCY_SOURCES) {
      expect(() => createVacancySources(config([id]))).not.toThrow();
    }
  });
});
