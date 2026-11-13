import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { NotificationLogOrmEntity } from '../../../domain/entities/NotificationLogOrmEntity';
import { Repository } from 'typeorm';
import { INotificationLogRepository } from '../../../domain/ports/INotificationLogRepository';

@Injectable()
export class MysqlNotificationLogRepository implements INotificationLogRepository {
  constructor(
    @InjectRepository(NotificationLogOrmEntity)
    private readonly ormRepository: Repository<NotificationLogOrmEntity>,
  ) {}

  async alreadySent(telegramId: string, vacancyId: string): Promise<boolean> {
    const log = await this.ormRepository.findOne({
      where: { telegramId, vacancyId },
    });
    return !!log; // Retorna true se encontrou, false se for null
  }

  async registerSent(telegramId: string, vacancyId: string): Promise<void> {
    const newLog = this.ormRepository.create({ telegramId, vacancyId });
    await this.ormRepository.save(newLog);
  }
}
