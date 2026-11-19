import { readFileSync } from 'fs';
import { join } from 'path';
import {
  HttpClient,
  PCI_REGIONAL_PATHS,
  PCI_SOURCE_ID,
  PciConcursosSource,
} from './pci-concursos.source';

const listing = readFileSync(
  join(__dirname, '__fixtures__', 'pci-listing.html'),
  'utf8',
);
const BASE = 'https://pci.example.test';

describe('PciConcursosSource', () => {
  let get: jest.Mock;
  let sleep: jest.Mock;
  let calls: string[];

  const source = () =>
    new PciConcursosSource(
      {
        baseUrl: BASE,
        userAgent: 'RadarConcursosBot/1.0 (+https://example.test/about)',
        timeoutMs: 1234,
        delayMs: 500,
      },
      { get } as unknown as HttpClient,
      sleep,
    );

  beforeEach(() => {
    calls = [];
    sleep = jest.fn().mockResolvedValue(undefined);
    get = jest.fn().mockImplementation((url: string) => {
      calls.push(url);
      return Promise.resolve({ data: listing });
    });
  });

  it('identifies itself as a vacancy source', () => {
    expect(source().id).toBe(PCI_SOURCE_ID);
  });

  it('reads the five regional listings, one after the other', async () => {
    await source().fetch();

    expect(calls).toEqual(
      PCI_REGIONAL_PATHS.map((region) => `${BASE}/concursos/${region}/`),
    );
  });

  it('identifies itself honestly and never waits forever', async () => {
    await source().fetch();

    expect(get).toHaveBeenCalledWith(
      `${BASE}/concursos/sudeste/`,
      expect.objectContaining({
        timeout: 1234,
        headers: expect.objectContaining({
          'User-Agent': 'RadarConcursosBot/1.0 (+https://example.test/about)',
        }),
      }),
    );
  });

  it('pauses between pages but not before the first one', async () => {
    await source().fetch();

    expect(sleep).toHaveBeenCalledTimes(PCI_REGIONAL_PATHS.length - 1);
    expect(sleep).toHaveBeenCalledWith(500);
    expect(sleep.mock.invocationCallOrder[0]).toBeGreaterThan(
      get.mock.invocationCallOrder[0] ?? Infinity,
    );
  });

  it('returns the vacancies of every page', async () => {
    const vacancies = await source().fetch();

    // The fixture has 8 readable listings and every page returns it.
    expect(vacancies).toHaveLength(8 * PCI_REGIONAL_PATHS.length);
  });

  it('keeps the other regions when one page fails', async () => {
    get.mockImplementation((url: string) =>
      url.includes('/sul/')
        ? Promise.reject(new Error('timeout'))
        : Promise.resolve({ data: listing }),
    );

    const vacancies = await source().fetch();

    expect(vacancies).toHaveLength(8 * (PCI_REGIONAL_PATHS.length - 1));
  });

  it('fails when no page could be read', async () => {
    get.mockRejectedValue(new Error('connection refused'));

    await expect(source().fetch()).rejects.toThrow(/no page could be read/i);
  });

  it('fails loudly when pages load but nothing can be parsed (the layout changed)', async () => {
    get.mockResolvedValue({
      data: '<html><body><p>new design</p></body></html>',
    });

    await expect(source().fetch()).rejects.toThrow(/layout may have changed/i);
  });
});
