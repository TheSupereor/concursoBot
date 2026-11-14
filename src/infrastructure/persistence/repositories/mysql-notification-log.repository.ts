import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  NotificationLogOrmEntity,
  NotificationStatus,
} from '../entities/notification-log.orm-entity';
import {
  ClaimResult,
  INotificationLogRepository,
} from '../../../domain/ports/notification-log-repository.port';

/** A PENDING claim older than this is treated as abandoned (the worker crashed). */
export const CLAIM_LEASE_SECONDS = 300;

const MYSQL_DUPLICATE_ENTRY = 'ER_DUP_ENTRY';

@Injectable()
export class MysqlNotificationLogRepository implements INotificationLogRepository {
  constructor(
    @InjectRepository(NotificationLogOrmEntity)
    private readonly ormRepository: Repository<NotificationLogOrmEntity>,
  ) {}

  async claim(telegramId: string, vacancyId: string): Promise<ClaimResult> {
    try {
      // The unique index on (telegramId, vacancyId) makes this insert the atomic reservation.
      await this.ormRepository
        .createQueryBuilder()
        .insert()
        .values({
          telegramId,
          vacancyId,
          status: 'PENDING',
          claimedAt: () => 'CURRENT_TIMESTAMP',
        })
        .execute();
      return 'claimed';
    } catch (error) {
      if ((error as { code?: string })?.code !== MYSQL_DUPLICATE_ENTRY) {
        throw error;
      }
    }

    // The pair exists. Take it over only if it is a PENDING claim whose lease expired; the
    // conditional UPDATE is atomic, so only one worker can win the takeover.
    const takeover = await this.ormRepository
      .createQueryBuilder()
      .update()
      .set({ claimedAt: () => 'CURRENT_TIMESTAMP' })
      .where('telegramId = :telegramId', { telegramId })
      .andWhere('vacancyId = :vacancyId', { vacancyId })
      .andWhere('status = :status', { status: 'PENDING' })
      .andWhere('claimedAt < DATE_SUB(NOW(), INTERVAL :lease SECOND)', {
        lease: CLAIM_LEASE_SECONDS,
      })
      .execute();
    if (takeover.affected === 1) return 'claimed';

    const existing = await this.ormRepository.findOne({
      where: { telegramId, vacancyId },
    });
    return existing?.status === 'PENDING' ? 'in_progress' : 'already_handled';
  }

  async markSent(telegramId: string, vacancyId: string): Promise<void> {
    await this.settle(telegramId, vacancyId, 'SENT');
  }

  async markFailed(telegramId: string, vacancyId: string): Promise<void> {
    await this.settle(telegramId, vacancyId, 'FAILED');
  }

  async release(telegramId: string, vacancyId: string): Promise<void> {
    // Only a PENDING claim can be released; never delete a delivered record.
    await this.ormRepository.delete({
      telegramId,
      vacancyId,
      status: 'PENDING',
    });
  }

  private async settle(
    telegramId: string,
    vacancyId: string,
    status: NotificationStatus,
  ): Promise<void> {
    await this.ormRepository.update(
      { telegramId, vacancyId },
      { status, claimedAt: null },
    );
  }
}
