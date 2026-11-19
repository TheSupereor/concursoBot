import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ISubscriberRepository } from '../../../domain/ports/subscriber-repository.port';
import { Subscriber } from '../../../domain/entities/subscriber';
import { Vacancy } from '../../../domain/entities/vacancy';
import { SubscriberOrmEntity } from '../entities/subscriber.orm-entity';
import { SubscriberMapper } from '../mappers/subscriber.mapper';

@Injectable()
export class MysqlSubscriberRepository implements ISubscriberRepository {
  constructor(
    @InjectRepository(SubscriberOrmEntity)
    private readonly ormRepository: Repository<SubscriberOrmEntity>,
  ) {}

  /**
   * Same rule as `Subscriber.hasInterest`, evaluated by the database so a vacancy does not
   * load every subscriber: the area matches or is QUALQUER, the region matches or is BR, and
   * the vacancy pays at least the preference's minimum. The join still loads every preference
   * of each match, so callers get complete aggregates. An integration test checks that this
   * query and the domain rule agree.
   */
  async searchInterestedIn(vacancy: Vacancy): Promise<Subscriber[]> {
    const rows = await this.ormRepository
      .createQueryBuilder('subscriber')
      .leftJoinAndSelect('subscriber.preferences', 'preference')
      .where('subscriber.isActive = :active', { active: true })
      .andWhere(
        `EXISTS (
          SELECT 1 FROM preferences matching
          WHERE matching.subscriberTelegramId = subscriber.telegramId
            AND matching.area IN (:...areas)
            AND matching.region IN (:...regions)
            AND matching.minimumSalary <= :salary
        )`,
        {
          areas: [...vacancy.areas, 'QUALQUER'],
          regions: [vacancy.region, 'BR'],
          salary: vacancy.salary.value,
        },
      )
      .getMany();

    return rows.map((row) => SubscriberMapper.toDomain(row));
  }

  async searchByTelegramId(telegramId: string): Promise<Subscriber | null> {
    const row = await this.ormRepository.findOne({
      where: { telegramId },
      relations: ['preferences'],
    });

    return row ? SubscriberMapper.toDomain(row) : null;
  }

  /**
   * Saves the aggregate in one transaction. The persisted row is read first (and locked, so a
   * concurrent save of the same subscriber waits) and its preferences are reused by area and
   * region: unchanged preferences keep their ids, new ones are inserted and removed ones are
   * deleted.
   */
  async save(subscriber: Subscriber): Promise<void> {
    await this.ormRepository.manager.transaction(async (manager) => {
      const repository = manager.getRepository(SubscriberOrmEntity);
      const existing = await repository.findOne({
        where: { telegramId: subscriber.telegramId },
        relations: ['preferences'],
        lock: { mode: 'pessimistic_write' },
      });

      await repository.save(
        SubscriberMapper.toOrm(subscriber, existing ?? undefined),
      );
    });
  }
}
