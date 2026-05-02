import { Entity, Column, PrimaryColumn, OneToMany } from 'typeorm';
import { PreferenceOrmEntity } from './PreferenceOrmEntity';

@Entity('subscribers')
export class SubscriberOrmEntity {
  @PrimaryColumn() // Usamos PrimaryColumn porque o telegramId já é único e vem de fora
  telegramId: string;

  @Column({ default: true }) // No MySQL vira um campo BOOLEAN (TINYINT)
  isActive: boolean;

  // Relacionamento: Um assinante pode ter MUITAS preferências
  // O 'cascade: true' significa que se salvarmos o assinante, as preferências salvam junto
  @OneToMany(() => PreferenceOrmEntity, (pref) => pref.subscriber, { cascade: true })
  preferences: PreferenceOrmEntity[];
}