import axios from 'axios';
import { IVacancySource } from '../../application/ports/vacancy-source.port';
import { AppConfig } from '../../shared/config/app.config';
import { CEBRASPE_SOURCE_ID, CebraspeSource } from './cebraspe.source';
import { PCI_SOURCE_ID, PciConcursosSource } from './pci-concursos.source';
import { RobotsPolicy } from './robots-policy';

const REQUEST_TIMEOUT_MS = 15_000;
const ROBOTS_TTL_MS = 24 * 60 * 60 * 1000;

/** robots.txt of the host at baseUrl, read with the bot's own User-Agent. */
function createRobotsPolicy(baseUrl: string, userAgent: string): RobotsPolicy {
  return new RobotsPolicy({
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
}

function createPciSource(config: AppConfig): IVacancySource {
  const { userAgent } = config.scraper;
  const { baseUrl, pageDelayMs } = config.scraper.pci;

  return new PciConcursosSource(
    { baseUrl, userAgent, timeoutMs: REQUEST_TIMEOUT_MS, delayMs: pageDelayMs },
    axios,
    undefined,
    createRobotsPolicy(baseUrl, userAgent),
  );
}

function createCebraspeSource(config: AppConfig): IVacancySource {
  const { userAgent } = config.scraper;
  const { apiUrl, siteUrl, requestDelayMs } = config.scraper.cebraspe;

  return new CebraspeSource(
    {
      apiUrl,
      siteUrl,
      userAgent,
      timeoutMs: REQUEST_TIMEOUT_MS,
      delayMs: requestDelayMs,
    },
    axios,
    undefined,
    // robots.txt lives at the root of the API host, not under its path.
    createRobotsPolicy(new URL(apiUrl).origin, userAgent),
  );
}

/** Builds the vacancy sources the configuration enables, and only those. */
export function createVacancySources(config: AppConfig): IVacancySource[] {
  return config.scraper.enabledSources.map((id) => {
    switch (id) {
      case PCI_SOURCE_ID:
        return createPciSource(config);
      case CEBRASPE_SOURCE_ID:
        return createCebraspeSource(config);
      default:
        throw new Error(`Unknown vacancy source: ${id}`);
    }
  });
}
