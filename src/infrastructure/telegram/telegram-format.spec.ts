import { Vacancy } from '../../domain/entities/Vacancy';
import { Salary } from '../../domain/value-objects/Salary';
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

describe('formatVacancyAlert', () => {
  const vacancy = new Vacancy(
    'v1',
    'Analista <script>alert(1)</script> & Dev_Ops *Sr* [x]',
    'TI',
    'SP',
    new Salary(8500.5),
  );
  const message = formatVacancyAlert(vacancy);

  it('never lets scraped text inject markup', () => {
    expect(message).not.toContain('<script>');
    expect(message).toContain('&lt;script&gt;alert(1)&lt;/script&gt; &amp;');
  });

  it('keeps characters that used to break Markdown parsing as literal text', () => {
    expect(message).toContain('Dev_Ops *Sr* [x]');
  });

  it('only contains the bold tags the formatter adds itself', () => {
    const tags = message.match(/<\/?[a-z]+>/g) ?? [];
    expect(new Set(tags)).toEqual(new Set(['<b>', '</b>']));
  });

  it('shows area, region and salary', () => {
    expect(message).toContain('TI');
    expect(message).toContain('SP');
    expect(message).toContain('8500.50');
  });
});
