import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IVacancyRepository } from '../../../application/ports/vacancy-repository.port';
import { Vacancy } from '../../../domain/entities/vacancy';
import { VacancyOrmEntity } from '../entities/vacancy.orm-entity';

const MYSQL_DUPLICATE_ENTRY = 'ER_DUP_ENTRY';

@Injectable()
export class MysqlVacancyRepository implements IVacancyRepository {
  constructor(
    @InjectRepository(VacancyOrmEntity)
    private readonly ormRepository: Repository<VacancyOrmEntity>,
  ) {}

  async exists(id: string): Promise<boolean> {
    return (await this.ormRepository.countBy({ id })) > 0;
  }

  async register(vacancy: Vacancy, source: string): Promise<void> {
    try {
      await this.ormRepository.insert({
        id: vacancy.id,
        source,
        url: vacancy.details.url ?? null,
        job: vacancy.job,
        organization: vacancy.details.organization ?? null,
        areas: vacancy.areas.join(','),
        region: vacancy.region,
        salary: vacancy.salary.value,
        deadline: vacancy.details.deadline
          ? vacancy.details.deadline.toISOString().slice(0, 10)
          : null,
      });
    } catch (error) {
      // Two runs (or two instances) registering the same vacancy is expected, not an error.
      if ((error as { code?: string }).code !== MYSQL_DUPLICATE_ENTRY) {
        throw error;
      }
    }
  }
}
