import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, Unique } from "typeorm";

@Entity('notification_logs')
@Unique('UQ_telegramId_vagaId', ['telegramId', 'vagaId'])
export class NotificationLogOrmEntity {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	telegramId: string;

	@Column()
	vacancyId: string;

	@CreateDateColumn()
	sentDate: Date;
}