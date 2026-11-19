import { Vacancy } from '../../../domain/entities/vacancy';
import { Salary } from '../../../domain/value-objects/salary';
import {
  TestDatabase,
  createTestDatabase,
} from '../../../shared/testing/test-database';
import { VacancyOrmEntity } from '../entities/vacancy.orm-entity';
import { MysqlVacancyRepository } from './mysql-vacancy.repository';

describe('MysqlVacancyRepository (integration)', () => {
  let db: TestDatabase;
  let repository: MysqlVacancyRepository;

  const vacancy = (id = 'id-1') =>
    new Vacancy(
      id,
      'Analista de Sistemas',
      ['TI', 'EDUCACAO'],
      'SP',
      new Salary(8971.98),
      {
        url: 'https://example.test/noticias/prefeitura-exemplo',
        organization: 'Prefeitura de Exemplo',
        deadline: new Date('2026-12-14T00:00:00.000Z'),
      },
    );

  beforeAll(async () => {
    db = await createTestDatabase();
    repository = new MysqlVacancyRepository(
      db.dataSource.getRepository(VacancyOrmEntity),
    );
  });

  afterAll(async () => {
    await db.drop();
  });

  beforeEach(async () => {
    await db.dataSource.query('DELETE FROM vacancies');
  });

  it('does not know a vacancy that was never registered', async () => {
    expect(await repository.exists('id-1')).toBe(false);
  });

  it('remembers a registered vacancy', async () => {
    await repository.register(vacancy(), 'pci-concursos');

    expect(await repository.exists('id-1')).toBe(true);
    expect(await repository.exists('id-2')).toBe(false);
  });

  it('stores what is needed to understand the vacancy later', async () => {
    await repository.register(vacancy(), 'pci-concursos');

    const row = await db.dataSource
      .getRepository(VacancyOrmEntity)
      .findOneByOrFail({ id: 'id-1' });

    expect(row).toMatchObject({
      source: 'pci-concursos',
      url: 'https://example.test/noticias/prefeitura-exemplo',
      job: 'Analista de Sistemas',
      organization: 'Prefeitura de Exemplo',
      areas: 'TI,EDUCACAO',
      region: 'SP',
    });
    expect(Number(row.salary)).toBe(8971.98);
    expect(row.deadline).toBe('2026-12-14');
    expect(row.firstSeenAt).toBeInstanceOf(Date);
  });

  it('accepts a vacancy without optional details', async () => {
    await repository.register(
      new Vacancy('bare', 'Role', 'OUTROS', 'MG', new Salary(0)),
      'pci-concursos',
    );

    const row = await db.dataSource
      .getRepository(VacancyOrmEntity)
      .findOneByOrFail({ id: 'bare' });

    expect(row.url).toBeNull();
    expect(row.organization).toBeNull();
    expect(row.deadline).toBeNull();
    expect(Number(row.salary)).toBe(0);
  });

  it('treats registering the same vacancy twice as a no-op', async () => {
    await repository.register(vacancy(), 'pci-concursos');

    await expect(
      repository.register(vacancy(), 'pci-concursos'),
    ).resolves.toBeUndefined();
    expect(
      await db.dataSource
        .getRepository(VacancyOrmEntity)
        .countBy({ id: 'id-1' }),
    ).toBe(1);
  });

  it('keeps a single row when the same vacancy is registered concurrently', async () => {
    await Promise.all(
      Array.from({ length: 10 }, () =>
        repository.register(vacancy(), 'pci-concursos'),
      ),
    );

    expect(
      await db.dataSource
        .getRepository(VacancyOrmEntity)
        .countBy({ id: 'id-1' }),
    ).toBe(1);
  });
});
