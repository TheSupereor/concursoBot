import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

export type NotificationStatus = 'PENDING' | 'SENT' | 'FAILED';

@Entity('notification_logs')
@Unique('UQ_telegramId_vacancyId', ['telegramId', 'vacancyId'])
export class NotificationLogOrmEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  telegramId: string;

  @Column()
  vacancyId: string;

  // PENDING = claimed and being delivered. The column default is SENT so rows written before
  // statuses existed (which only recorded successful deliveries) keep their meaning.
  @Column({
    type: 'enum',
    enum: ['PENDING', 'SENT', 'FAILED'],
    default: 'SENT',
  })
  status: NotificationStatus;

  // Start of the current claim; a PENDING claim older than the lease is considered abandoned.
  @Column({ type: 'datetime', nullable: true })
  claimedAt: Date | null;

  @CreateDateColumn()
  sentDate: Date;
}
