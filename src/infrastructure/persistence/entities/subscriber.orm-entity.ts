import { Entity, Column, PrimaryColumn, OneToMany, Index } from 'typeorm';
import { PreferenceOrmEntity } from './preference.orm-entity';

// Matching only considers active subscribers.
@Index('IDX_subscribers_active', ['isActive'])
@Entity('subscribers')
export class SubscriberOrmEntity {
  @PrimaryColumn() // Usamos PrimaryColumn porque o telegramId já é único e vem de fora
  telegramId!: string;

  @Column({ default: false }) // No MySQL vira um campo BOOLEAN (TINYINT)
  isActive!: boolean;

  // Relacionamento: Um assinante pode ter MUITAS preferências
  // O 'cascade: true' significa que se salvarmos o assinante, as preferências salvam junto
  @OneToMany(() => PreferenceOrmEntity, (pref) => pref.subscriber, {
    cascade: true,
    orphanedRowAction: 'delete',
  })
  preferences?: PreferenceOrmEntity[];
}
