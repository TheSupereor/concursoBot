import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StripeEventOrmEntity } from '../../../domain/entities/StripeEventOrmEntity';
import {
  EventDecision,
  IProcessedEventRepository,
} from '../../../domain/ports/processed-event-repository.port';

const MYSQL_DUPLICATE_ENTRY = 'ER_DUP_ENTRY';

@Injectable()
export class MysqlProcessedEventRepository implements IProcessedEventRepository {
  constructor(
    @InjectRepository(StripeEventOrmEntity)
    private readonly ormRepository: Repository<StripeEventOrmEntity>,
  ) {}

  async beginProcessing(
    eventId: string,
    eventType: string,
  ): Promise<EventDecision> {
    try {
      await this.ormRepository.insert({
        id: eventId,
        type: eventType,
        status: 'PENDING',
      });
      return 'process';
    } catch (error) {
      if ((error as { code?: string })?.code !== MYSQL_DUPLICATE_ENTRY) {
        throw error;
      }
    }

    const existing = await this.ormRepository.findOne({
      where: { id: eventId },
    });
    return existing?.status === 'PROCESSED' ? 'already_processed' : 'process';
  }

  async markProcessed(eventId: string): Promise<void> {
    await this.ormRepository.update(
      { id: eventId },
      { status: 'PROCESSED', processedAt: () => 'CURRENT_TIMESTAMP' },
    );
  }
}
