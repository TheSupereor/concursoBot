import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { SubscriberOrmEntity } from './subscriber.orm-entity';

@Entity('preferences') // Nome da tabela no MySQL
export class PreferenceOrmEntity {
  @PrimaryGeneratedColumn() // Cria um ID numérico que aumenta sozinho (1, 2, 3...)
  id!: number;

  @Column()
  area!: string;

  @Column()
  region!: string;

  // Usamos 'decimal' para dinheiro para evitar erros de arredondamento que o 'float' tem
  // The column keeps its historical (misspelled) name so existing databases are untouched;
  // the property was renamed. A migration can rename the column later.
  @Column({ name: 'minimunSalary', type: 'decimal', precision: 10, scale: 2 })
  // MySQL returns DECIMAL columns as strings.
  minimumSalary!: number | string;

  // Relacionamento: Muitas preferências pertencem a UM assinante
  @ManyToOne(() => SubscriberOrmEntity, (subscriber) => subscriber.preferences)
  subscriber!: SubscriberOrmEntity;
}
