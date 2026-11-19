import axios from 'axios';
import { IVacancySource } from '../../application/ports/vacancy-source.port';
import { AppConfig } from '../../shared/config/app.config';
import { PCI_SOURCE_ID, PciConcursosSource } from './pci-concursos.source';
import { RobotsPolicy } from './robots-policy';

const REQUEST_TIMEOUT_MS = 15_000;
const ROBOTS_TTL_MS = 24 * 60 * 60 * 1000;

function createPciSource(config: AppConfig): IVacancySource {
  const { userAgent } = config.scraper;
  const { baseUrl, pageDelayMs } = config.scraper.pci;

  const robots = new RobotsPolicy({
    baseUrl,
    userAgent,
    ttlMs: ROBOTS_TTL_MS,
    fetchRobots: async (url) => {
      // HTTP error statuses are answers the policy interprets; only network failures throw.
      const response = await axios.get<unknown>(url, {
        timeout: REQUEST_TIMEOUT_MS,
        headers: { 'User-Agent': userAgent },
        responseType: 'text',
        validateStatus: () => true,
      });
      return {
        status: response.status,
        body: typeof response.data === 'string' ? response.data : '',
      };
    },
  });

  return new PciConcursosSource(
    { baseUrl, userAgent, timeoutMs: REQUEST_TIMEOUT_MS, delayMs: pageDelayMs },
    axios,
    undefined,
    robots,
  );
}

/** Builds the vacancy sources the configuration enables, and only those. */
export function createVacancySources(config: AppConfig): IVacancySource[] {
  return config.scraper.enabledSources.map((id) => {
    switch (id) {
      case PCI_SOURCE_ID:
        return createPciSource(config);
      default:
        throw new Error(`Unknown vacancy source: ${id}`);
    }
  });
}
