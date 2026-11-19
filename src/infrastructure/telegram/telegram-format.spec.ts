import { Vacancy, VacancyDetails } from '../../domain/entities/vacancy';
import { Salary } from '../../domain/value-objects/salary';
import { escapeHtml, formatVacancyAlert } from './telegram-format';

describe('escapeHtml', () => {
  it('escapes the characters Telegram HTML treats as markup', () => {
    expect(escapeHtml('<b>Tom & "Jerry"</b>')).toBe(
      '&lt;b&gt;Tom &amp; "Jerry"&lt;/b&gt;',
    );
  });

  it('leaves Markdown punctuation alone, since the message is not Markdown', () => {
    expect(escapeHtml('a_b *c* [d](e)')).toBe('a_b *c* [d](e)');
  });
});

interface Options {
  job?: string;
  areas?: string[];
  salary?: number;
  details?: VacancyDetails;
}

const vacancy = ({
  job = 'Analista <script>alert(1)</script> & Dev_Ops *Sr* [x]',
  areas = ['TI'],
  salary = 8500.5,
  details = {},
}: Options = {}) =>
  new Vacancy('v1', job, areas, 'SP', new Salary(salary), details);

describe('formatVacancyAlert', () => {
  describe('escaping', () => {
    const message = formatVacancyAlert(vacancy());

    it('never lets scraped text inject markup', () => {
      expect(message).not.toContain('<script>');
      expect(message).toContain('&lt;script&gt;alert(1)&lt;/script&gt; &amp;');
    });

    it('keeps characters that used to break Markdown parsing as literal text', () => {
      expect(message).toContain('Dev_Ops *Sr* [x]');
    });

    it('only contains the tags the formatter adds itself', () => {
      const withLink = formatVacancyAlert(
        vacancy({ details: { url: 'https://example.test/edital' } }),
      );
      const tags = withLink.match(/<\/?[a-z]+/g) ?? [];

      expect(new Set(tags)).toEqual(new Set(['<b', '</b', '<a', '</a']));
    });
  });

  describe('content', () => {
    it('shows the organization, areas, region and the salary ceiling in Brazilian format', () => {
      const message = formatVacancyAlert(
        vacancy({
          areas: ['EDUCACAO', 'TI'],
          salary: 8971.98,
          details: { organization: 'Prefeitura de Exemplo' },
        }),
      );

      expect(message).toContain('Prefeitura de Exemplo');
      expect(message).toContain('EDUCACAO, TI');
      expect(message).toContain('SP');
      expect(message).toContain('até R$ 8.971,98');
    });

    it('says the salary was not informed instead of showing R$ 0,00', () => {
      const message = formatVacancyAlert(vacancy({ salary: 0 }));

      expect(message).toContain('não informado');
      expect(message).not.toContain('R$ 0');
    });

    it('shows the last registration day in Brazilian format, without time zone drift', () => {
      const message = formatVacancyAlert(
        vacancy({
          details: { deadline: new Date('2026-12-14T00:00:00.000Z') },
        }),
      );

      expect(message).toContain('14/12/2026');
    });

    it('omits the deadline and the organization when they are unknown', () => {
      const message = formatVacancyAlert(vacancy());

      expect(message).not.toContain('Inscrições');
      expect(message).not.toContain('Órgão');
    });
  });

  describe('link to the listing', () => {
    const withUrl = (url: string) =>
      formatVacancyAlert(vacancy({ details: { url } }));

    it('links to the listing', () => {
      expect(withUrl('https://example.test/edital')).toContain(
        '<a href="https://example.test/edital">',
      );
    });

    it('escapes the address, so it cannot break out of the attribute', () => {
      const message = withUrl('https://example.test/a?x=1&y="2"');

      // The address is normalized (quotes become %22) and escaped (& becomes &amp;), so the
      // attribute value can never contain a raw quote.
      expect(message).toMatch(/<a href="[^"]*">Ver edital<\/a>/);
      expect(message).toContain('x=1&amp;y=%22');
    });

    it.each(['javascript:alert(1)', 'ftp://example.test/x', 'not a url'])(
      'does not link an address that is not http(s): %s',
      (url) => {
        expect(withUrl(url)).not.toContain('<a ');
      },
    );

    it('has no link when the vacancy has no address', () => {
      expect(formatVacancyAlert(vacancy())).not.toContain('<a ');
    });
  });
});
