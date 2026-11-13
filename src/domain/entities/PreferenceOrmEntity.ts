import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { SubscriberOrmEntity } from './SubscriberOrmEntity';

@Entity('preferences') // Nome da tabela no MySQL
export class PreferenceOrmEntity {
  @PrimaryGeneratedColumn() // Cria um ID numérico que aumenta sozinho (1, 2, 3...)
  id: number;

  @Column()
  area: string;

  @Column()
  region: string;

  // Usamos 'decimal' para dinheiro para evitar erros de arredondamento que o 'float' tem
  @Column({ type: 'decimal', precision: 10, scale: 2 }) 
  minimunSalary: number;

  // Relacionamento: Muitas preferências pertencem a UM assinante
  @ManyToOne(() => SubscriberOrmEntity, (subscriber) => subscriber.preferences)
  subscriber: SubscriberOrmEntity;
}