import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ISubscriberRepository } from '../../../domain/ports/subscriber-repository.port';
import { Subscriber } from '../../../domain/entities/subscriber';
import { SubscriberOrmEntity } from '../entities/subscriber.orm-entity';
import { SubscriberMapper } from '../mappers/subscriber.mapper';

@Injectable()
export class MysqlSubscriberRepository implements ISubscriberRepository {
  constructor(
    @InjectRepository(SubscriberOrmEntity)
    private readonly ormRepository: Repository<SubscriberOrmEntity>,
  ) {}

  async searchActiveSubscribers(): Promise<Subscriber[]> {
    const rows = await this.ormRepository.find({
      where: { isActive: true },
      relations: ['preferences'],
    });

    return rows.map((row) => SubscriberMapper.toDomain(row));
  }

  async searchByTelegramId(telegramId: string): Promise<Subscriber | null> {
    const row = await this.ormRepository.findOne({
      where: { telegramId },
      relations: ['preferences'],
    });

    return row ? SubscriberMapper.toDomain(row) : null;
  }

  async save(subscriber: Subscriber): Promise<void> {
    await this.ormRepository.save(SubscriberMapper.toOrm(subscriber));
  }
}
