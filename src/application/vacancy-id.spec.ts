import { vacancyId } from './vacancy-id';

describe('vacancyId', () => {
  const url = 'https://example.test/noticias/prefeitura-exemplo';

  it('is stable for the same source and address', () => {
    expect(vacancyId('pci', url)).toBe(vacancyId('pci', url));
  });

  it('is a fixed-size hex digest, whatever the address length', () => {
    expect(vacancyId('pci', url)).toMatch(/^[0-9a-f]{64}$/);
    expect(vacancyId('pci', `${url}/${'x'.repeat(2000)}`)).toMatch(
      /^[0-9a-f]{64}$/,
    );
  });

  it('differs between sources, so two sources can never collide', () => {
    expect(vacancyId('pci', url)).not.toBe(vacancyId('other', url));
  });

  it('differs between addresses', () => {
    expect(vacancyId('pci', url)).not.toBe(vacancyId('pci', `${url}-2`));
  });

  describe('treats cosmetic variations of the same address as one vacancy', () => {
    it.each([
      ['a trailing slash', `${url}/`],
      ['a fragment', `${url}#comentarios`],
      [
        'an upper-case host',
        'https://EXAMPLE.test/noticias/prefeitura-exemplo',
      ],
      ['tracking parameters', `${url}?utm_source=feed&utm_medium=rss`],
    ])('%s', (_label, variation) => {
      expect(vacancyId('pci', variation)).toBe(vacancyId('pci', url));
    });

    it('but keeps parameters that identify a different page', () => {
      expect(vacancyId('pci', `${url}?id=1`)).not.toBe(
        vacancyId('pci', `${url}?id=2`),
      );
    });
  });

  it('still produces an id for something that is not a valid address', () => {
    expect(vacancyId('pci', 'not a url')).toMatch(/^[0-9a-f]{64}$/);
  });
});
