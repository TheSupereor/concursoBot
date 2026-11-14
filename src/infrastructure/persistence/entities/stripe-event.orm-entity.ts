import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity('stripe_events')
export class StripeEventOrmEntity {
  // Stripe's event id (evt_...), unique by definition.
  @PrimaryColumn()
  id: string;

  @Column()
  type: string;

  @Column({ type: 'enum', enum: ['PENDING', 'PROCESSED'], default: 'PENDING' })
  status: 'PENDING' | 'PROCESSED';

  @CreateDateColumn()
  receivedAt: Date;

  @Column({ type: 'datetime', nullable: true })
  processedAt: Date | null;
}
