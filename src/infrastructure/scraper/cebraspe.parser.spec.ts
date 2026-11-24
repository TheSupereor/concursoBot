import { readFileSync } from 'fs';
import { join } from 'path';
import {
  CebraspeFormatError,
  organizationFromName,
  parseCebraspeEvent,
  parseCebraspePhase,
  regionFromName,
  toScrapedVacancy,
} from './cebraspe.parser';

/** Real API responses recorded on 2026-11-23 (edital and gabarito lists trimmed). */
const fixture = JSON.parse(
  readFileSync(join(__dirname, '__fixtures__', 'cebraspe-api.json'), 'utf8'),
) as {
  phases: Record<string, unknown>;
  events: Record<string, unknown>;
};

describe('parseCebraspePhase', () => {
  it('reads the competitions of a recorded phase', () => {
    const events = parseCebraspePhase(fixture.phases['inscricoes-abertas']);

    expect(events.map((event) => event.eventoURL)).toEqual([
      'PC_PE_26',
      'SEAP_PE_26',
    ]);
  });

  it('accepts an empty phase: no competition open is a normal state', () => {
    expect(parseCebraspePhase([])).toEqual([]);
    expect(
      parseCebraspePhase([{ faseEvento: 'Novos', ordem: 0, eventos: [] }]),
    ).toEqual([]);
  });

  it.each([
    ['an HTML error page', '<html>error</html>'],
    ['an object instead of a list', { eventos: [] }],
    [
      'a competition without its identifier',
      [{ faseEvento: 'x', eventos: [{ eventoNomeAbreviado: 'PC PE 26' }] }],
    ],
    [
      'an identifier that is not a path segment',
      [
        {
          faseEvento: 'x',
          eventos: [
            {
              eventoNomeAbreviado: 'X',
              eventoURL: '../x',
              eventoTotalVagas: '1',
              eventoSalarioMaximo: 1,
            },
          ],
        },
      ],
    ],
  ])('fails loudly on %s: the format has changed', (_label, body) => {
    expect(() => parseCebraspePhase(body)).toThrow(CebraspeFormatError);
  });
});

describe('parseCebraspeEvent', () => {
  it('reads the roles and the registration period', () => {
    const detail = parseCebraspeEvent(fixture.events['PC_PE_26']);

    expect(detail.periodoInscricao).toMatch(/16\/12\/2026/);
    expect(detail.eventoCargos).toHaveLength(3);
  });

  it('fails loudly on an unknown format', () => {
    expect(() => parseCebraspeEvent({ eventoCargos: 'none' })).toThrow(
      CebraspeFormatError,
    );
  });
});

describe('regionFromName', () => {
  it.each([
    ['PC PE 26', 'PE'],
    ['TJ CE 25 NOTÁRIOS', 'CE'],
    ['SEFAZ/RJ 25 AUDITOR', 'RJ'],
    ['SEMEC PORTO VELHO/RO 26', 'RO'],
    ['TCU 25 AUFC', 'BR'],
    ['CÂMARA DOS DEPUTADOS 26 ANALISTA', 'BR'],
  ])('%s → %s', (name, region) => {
    expect(regionFromName(name)).toBe(region);
  });

  it('does not read a state out of accented words ("SAÚDE" is not SA + DE)', () => {
    expect(regionFromName('PREF. BOA VISTA 25 SAÚDE')).toBe('BR');
    expect(regionFromName('AGÊNCIA DE TRÂNSITO 26')).toBe('BR');
  });
});

describe('organizationFromName', () => {
  it.each([
    ['PC PE 26', 'PC PE'],
    ['TJ CE 25 NOTÁRIOS', 'TJ CE'],
    ['PREFEITURA DE BOA VISTA 2023 - GUARDA', 'PREFEITURA DE BOA VISTA'],
    ['MRE', 'MRE'],
  ])('%s → %s', (name, organization) => {
    expect(organizationFromName(name)).toBe(organization);
  });
});

describe('toScrapedVacancy', () => {
  const summary = (id: string) => {
    const found = parseCebraspePhase(fixture.phases['inscricoes-abertas'])
      .concat(parseCebraspePhase(fixture.phases['novos']))
      .find((event) => event.eventoURL === id);
    if (!found) throw new Error(`${id} is not in the fixture`);
    return found;
  };

  it('turns a recorded competition into a vacancy that links to its public page', () => {
    const vacancy = toScrapedVacancy(
      summary('PC_PE_26'),
      parseCebraspeEvent(fixture.events['PC_PE_26']),
    );

    expect(vacancy).toEqual({
      url: 'https://www.cebraspe.org.br/concursos/PC_PE_26',
      title: 'PC PE 26',
      organization: 'PC PE',
      region: 'PE',
      roles: 'Agente de Polícia, Delegado de Polícia, Escrivão de Polícia',
      education: [],
      openings: 1315,
      reserveList: false,
      salaryMax: 13560,
      deadline: new Date(Date.UTC(2026, 11, 16)),
      status: 'open',
    });
  });

  it('leaves the salary and deadline empty when the organizer has not published them', () => {
    const vacancy = toScrapedVacancy(
      summary('TJ_CE_25_NOTARIOS'),
      parseCebraspeEvent(fixture.events['TJ_CE_25_NOTARIOS']),
    );

    expect(vacancy.salaryMax).toBeNull();
    expect(vacancy.deadline).toBeNull();
    expect(vacancy.openings).toBe(44);
  });

  it('still builds a vacancy without the details', () => {
    const vacancy = toScrapedVacancy(summary('SEAP_PE_26'), null);

    expect(vacancy.roles).toBe('');
    expect(vacancy.deadline).toBeNull();
    expect(vacancy.salaryMax).toBe(5667.92);
  });

  it('links to the configured site', () => {
    expect(
      toScrapedVacancy(summary('PC_PE_26'), null, 'http://localhost:9997').url,
    ).toBe('http://localhost:9997/concursos/PC_PE_26');
  });
});
