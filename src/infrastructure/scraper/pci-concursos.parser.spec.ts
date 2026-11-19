import { readFileSync } from 'fs';
import { join } from 'path';
import {
  parseDeadline,
  parseMoney,
  parseOpenings,
  parsePciListing,
} from './pci-concursos.parser';

const fixture = readFileSync(
  join(__dirname, '__fixtures__', 'pci-listing.html'),
  'utf8',
);

const isoDate = (date: Date | null) => date?.toISOString().slice(0, 10);

describe('parseMoney', () => {
  it.each([
    ['R$ 8.971,98', 8971.98],
    ['R$ 1.500,00', 1500],
    ['R$ 25,00', 25],
    ['R$12.000,00', 12000],
  ])('reads %s as %p', (text, value) => {
    expect(parseMoney(text)).toBe(value);
  });
});

describe('parseDeadline', () => {
  it.each([
    ['14/12/2026', '2026-12-14'],
    ['Prorrogado até23/11/2026', '2026-11-23'],
    ['Reaberto até26/11/2026', '2026-11-26'],
    ['20/11 a21/12/2026', '2026-12-21'],
    ['23/12/2026 a21/01/2027', '2027-01-21'],
    ['09 a14/01/2027', '2027-01-14'],
  ])('uses the last day of "%s"', (text, expected) => {
    expect(isoDate(parseDeadline(text))).toBe(expected);
  });

  it.each(['Cancelado', '', 'em breve'])('has no deadline for "%s"', (text) => {
    expect(parseDeadline(text)).toBeNull();
  });

  it('rejects impossible dates instead of rolling them over', () => {
    expect(parseDeadline('31/02/2026')).toBeNull();
  });
});

describe('parseOpenings', () => {
  it.each([
    ['107 vagas até R$ 8.971,98', 107],
    ['1 vaga até R$ 1.500,00', 1],
    ['1.250 vagas até R$ 12.000,00', 1250],
    ['5 vagas', 5],
  ])('counts the openings in "%s"', (text, expected) => {
    expect(parseOpenings(text)).toBe(expected);
  });

  it.each(['Cadastro de reserva até R$ 3.200,00', 'Vagas até R$ 32,50'])(
    'has no count for "%s"',
    (text) => {
      expect(parseOpenings(text)).toBeNull();
    },
  );
});

describe('parsePciListing', () => {
  const vacancies = parsePciListing(fixture);
  const byUrl = (suffix: string) => {
    const found = vacancies.find((v) => v.url.endsWith(suffix));
    if (!found) throw new Error(`fixture item not parsed: ${suffix}`);
    return found;
  };

  it('parses the well-formed blocks and skips the malformed ones', () => {
    expect(vacancies).toHaveLength(8);
  });

  it('reads every field of a complete listing', () => {
    expect(byUrl('prefeitura-exemplo-sp')).toEqual({
      url: 'https://example.test/noticias/prefeitura-exemplo-sp',
      title: 'Prefeitura de Exemplo - SP abre concursos para diversos cargos',
      organization: 'Prefeitura de Exemplo',
      region: 'SP',
      roles: 'Vários Cargos',
      education: ['Médio', 'Técnico', 'Superior'],
      openings: 107,
      reserveList: false,
      salaryMax: 8971.98,
      deadline: new Date('2026-12-14T00:00:00.000Z'),
      status: 'open',
    });
  });

  it('reads a single opening for a specific role', () => {
    const v = byUrl('camara-exemplo-mg');

    expect(v.openings).toBe(1);
    expect(v.roles).toBe('Analista de Sistemas');
    expect(v.education).toEqual(['Superior']);
  });

  it('flags a reserve list and uses the extended deadline', () => {
    const v = byUrl('instituto-exemplo-rj');

    expect(v.reserveList).toBe(true);
    expect(v.openings).toBeNull();
    expect(v.salaryMax).toBe(3200);
    expect(isoDate(v.deadline)).toBe('2026-11-23');
  });

  it('does not treat an hourly rate as a monthly salary', () => {
    expect(byUrl('escola-exemplo-sp').salaryMax).toBeNull();
  });

  it('keeps the monthly figure when an hourly one is listed too', () => {
    const v = byUrl('universidade-exemplo-es');

    expect(v.salaryMax).toBe(4000);
    expect(v.reserveList).toBe(true);
  });

  it('leaves the salary empty when the listing states none', () => {
    const v = byUrl('autarquia-exemplo-sp');

    expect(v.salaryMax).toBeNull();
    expect(v.openings).toBe(5);
    expect(isoDate(v.deadline)).toBe('2027-01-21');
  });

  it('understands thousands separators in the opening count', () => {
    expect(byUrl('governo-exemplo-sp').openings).toBe(1250);
  });

  it('marks a cancelled competition', () => {
    const v = byUrl('prefeitura-cancelada-mg');

    expect(v.status).toBe('cancelled');
    expect(v.deadline).toBeNull();
  });

  it('returns nothing for a page that has no listings', () => {
    expect(
      parsePciListing('<html><body><p>maintenance</p></body></html>'),
    ).toEqual([]);
  });
});
