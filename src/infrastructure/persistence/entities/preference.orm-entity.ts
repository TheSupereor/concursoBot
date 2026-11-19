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
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  // MySQL returns DECIMAL columns as strings.
  minimumSalary!: number | string;

  // Relacionamento: Muitas preferências pertencem a UM assinante
  // A preference cannot exist without its subscriber; deleting a subscriber deletes them.
  @ManyToOne(
    () => SubscriberOrmEntity,
    (subscriber) => subscriber.preferences,
    {
      nullable: false,
      onDelete: 'CASCADE',
    },
  )
  subscriber!: SubscriberOrmEntity;
}
