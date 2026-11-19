import { classifyAreas } from './area-classifier';

const classify = (title: string, roles = '', organization = '') =>
  classifyAreas({ title, roles, organization });

describe('classifyAreas', () => {
  it.each([
    ['Analista de Sistemas', 'TI'],
    ['Técnico em Informática', 'TI'],
    ['Desenvolvedor de Software', 'TI'],
    ['Analista de TI', 'TI'],
    ['Técnico em Tecnologia da Informação', 'TI'],
    ['Médico Clínico Geral', 'SAUDE'],
    ['Enfermeiro', 'SAUDE'],
    ['Agente Comunitário de Saúde', 'SAUDE'],
    ['Fisioterapeuta', 'SAUDE'],
    ['Professor Substituto', 'EDUCACAO'],
    ['Pedagogo', 'EDUCACAO'],
    ['Professor de Educação Física', 'EDUCACAO'],
    ['Analista Judiciário', 'TRIBUNAIS'],
    ['Oficial de Justiça', 'TRIBUNAIS'],
    ['Guarda Civil Municipal', 'POLICIAL'],
    ['Soldado da Polícia Militar', 'POLICIAL'],
    ['Agente Penitenciário', 'POLICIAL'],
  ])('classifies the role "%s" as %s', (role, area) => {
    expect(classify(role)).toEqual([area]);
  });

  it('ignores accents and letter case', () => {
    expect(classify('ENFERMEIRO')).toEqual(['SAUDE']);
    expect(classify('tecnologia da informacao')).toEqual(['TI']);
    expect(classify('POLÍCIA CIVIL')).toEqual(['POLICIAL']);
  });

  describe('does not repeat the substring bug of the old classifier', () => {
    // The old classifier used includes('TI'), which matched almost any word.
    it.each([
      'Assistente Administrativo',
      'Atividades de Apoio',
      'Auxiliar de Serviços Gerais',
      'Motorista',
      'Contador',
      'Engenheiro Civil',
      'Advogado Trabalhista',
      'Vigilante',
    ])('classifies "%s" as OUTROS', (role) => {
      expect(classify(role)).toEqual(['OUTROS']);
    });
  });

  it('falls back to OUTROS for generic listings such as "Vários Cargos"', () => {
    expect(
      classify('Prefeitura de Exemplo abre concurso', 'Vários Cargos'),
    ).toEqual(['OUTROS']);
  });

  describe('role versus organization', () => {
    it('uses the organization only when the role says nothing', () => {
      expect(
        classify('', 'Vários Cargos', 'Secretaria Municipal de Saúde'),
      ).toEqual(['SAUDE']);
    });

    it('ignores the organization once the role says something', () => {
      expect(
        classify('Analista de Sistemas', '', 'Tribunal de Justiça de Exemplo'),
      ).toEqual(['TI']);
    });
  });

  describe('a vacancy can belong to several areas', () => {
    it('returns every area with evidence, strongest first', () => {
      expect(
        classify(
          'Abre concurso para Professor, Pedagogo, Orientador Educacional e Enfermeiro',
        ),
      ).toEqual(['EDUCACAO', 'SAUDE']);
    });

    it('keeps an IT role listed next to teaching roles (the case a single area lost)', () => {
      const areas = classify(
        'Prefeitura abre concurso',
        'Professor, Analista de Sistemas',
      );

      expect(areas).toContain('TI');
      expect(areas).toContain('EDUCACAO');
    });

    it('never returns OUTROS together with a real area', () => {
      expect(classify('Médico e Motorista')).toEqual(['SAUDE']);
    });

    it('breaks ties in a fixed order so the result is stable', () => {
      expect(classify('Enfermeiro e Professor')).toEqual(['SAUDE', 'EDUCACAO']);
    });
  });
});
