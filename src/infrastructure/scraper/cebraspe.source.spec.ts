import { Logger } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';
import { CebraspeFormatError } from './cebraspe.parser';
import {
  CEBRASPE_SOURCE_ID,
  CebraspeSource,
  JsonHttpClient,
} from './cebraspe.source';
import { RobotsPolicy } from './robots-policy';

/** Real API responses recorded on 2026-11-23. */
const fixture = JSON.parse(
  readFileSync(join(__dirname, '__fixtures__', 'cebraspe-api.json'), 'utf8'),
) as {
  phases: Record<string, unknown>;
  events: Record<string, unknown>;
};

const API = 'https://api.example.test/cebraspe';
const SITE = 'https://cebraspe.example.test';
const phaseUrl = (phase: string) =>
  `${API}/eventos/tipo/concursos/fase/${phase}`;

describe('CebraspeSource', () => {
  let responses: Map<string, unknown>;
  let get: jest.Mock;
  let sleep: jest.Mock;
  let isAllowed: jest.Mock;
  let calls: string[];

  const source = () =>
    new CebraspeSource(
      {
        apiUrl: API,
        siteUrl: SITE,
        userAgent: 'RadarConcursosBot/1.0 (+https://example.test/about)',
        timeoutMs: 1234,
        delayMs: 500,
      },
      { get } as unknown as JsonHttpClient,
      sleep,
      { isAllowed } as unknown as RobotsPolicy,
    );

  beforeAll(() => {
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });
  afterAll(() => jest.restoreAllMocks());

  beforeEach(() => {
    calls = [];
    responses = new Map<string, unknown>([
      [phaseUrl('novos'), fixture.phases['novos']],
      [phaseUrl('inscricoes-abertas'), fixture.phases['inscricoes-abertas']],
      ...Object.entries(fixture.events).map(([id, body]): [string, unknown] => [
        `${API}/eventos/${id}`,
        body,
      ]),
    ]);
    sleep = jest.fn().mockResolvedValue(undefined);
    isAllowed = jest.fn().mockResolvedValue(true);
    get = jest.fn().mockImplementation((url: string) => {
      calls.push(url);
      const body = responses.get(url);
      return body instanceof Error || body === undefined
        ? Promise.reject(body ?? new Error(`404 ${url}`))
        : Promise.resolve({ data: body });
    });
  });

  it('has a stable id', () => {
    expect(source().id).toBe(CEBRASPE_SOURCE_ID);
  });

  it('reads the new and open phases, then the details of each competition', async () => {
    const vacancies = await source().fetch();

    expect(calls).toEqual([
      phaseUrl('novos'),
      phaseUrl('inscricoes-abertas'),
      `${API}/eventos/TJ_CE_25_NOTARIOS`,
      `${API}/eventos/PC_PE_26`,
      `${API}/eventos/SEAP_PE_26`,
    ]);
    expect(vacancies.map((vacancy) => vacancy.url)).toEqual([
      `${SITE}/concursos/TJ_CE_25_NOTARIOS`,
      `${SITE}/concursos/PC_PE_26`,
      `${SITE}/concursos/SEAP_PE_26`,
    ]);
    expect(vacancies[1]?.roles).toContain('Delegado de Polícia');
  });

  it('identifies itself and pauses between requests, not before the first', async () => {
    await source().fetch();

    expect(get).toHaveBeenCalledWith(phaseUrl('novos'), {
      timeout: 1234,
      headers: {
        'User-Agent': 'RadarConcursosBot/1.0 (+https://example.test/about)',
        Accept: 'application/json',
      },
    });
    expect(sleep).toHaveBeenCalledTimes(calls.length - 1);
    expect(sleep).toHaveBeenCalledWith(500);
  });

  it('announces a competition listed in two phases only once', async () => {
    responses.set(phaseUrl('novos'), fixture.phases['inscricoes-abertas']);

    const vacancies = await source().fetch();

    expect(vacancies).toHaveLength(2);
  });

  it('returns nothing, without failing, when no competition is open', async () => {
    responses.set(phaseUrl('novos'), []);
    responses.set(phaseUrl('inscricoes-abertas'), []);

    await expect(source().fetch()).resolves.toEqual([]);
  });

  it('still announces a competition whose details cannot be read', async () => {
    responses.delete(`${API}/eventos/PC_PE_26`);

    const vacancies = await source().fetch();

    expect(vacancies).toHaveLength(3);
    expect(vacancies[1]).toMatchObject({ title: 'PC PE 26', roles: '' });
  });

  it('keeps the other phase when one cannot be read', async () => {
    responses.set(phaseUrl('novos'), new Error('timeout'));

    const vacancies = await source().fetch();

    expect(vacancies.map((vacancy) => vacancy.title)).toEqual([
      'PC PE 26',
      'SEAP PE 26',
    ]);
  });

  it('fails when no phase can be read at all', async () => {
    responses.set(phaseUrl('novos'), new Error('timeout'));
    responses.set(phaseUrl('inscricoes-abertas'), new Error('timeout'));

    await expect(source().fetch()).rejects.toThrow(/no phase could be read/i);
  });

  it('fails loudly when the API changes its format, instead of returning nothing', async () => {
    responses.set(phaseUrl('novos'), { message: 'moved' });

    await expect(source().fetch()).rejects.toThrow(CebraspeFormatError);
  });

  it('does not request what robots.txt forbids', async () => {
    isAllowed.mockImplementation((url: string) =>
      Promise.resolve(!url.includes('/fase/')),
    );

    await expect(source().fetch()).rejects.toThrow(/no phase could be read/i);
    expect(get).not.toHaveBeenCalled();
  });
});
