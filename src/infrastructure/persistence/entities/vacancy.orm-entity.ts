import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
} from 'typeorm';

/** A vacancy that was published, kept so it is never announced twice. */
@Entity('vacancies')
export class VacancyOrmEntity {
  // SHA-256 of the source and the canonical address (see vacancyId).
  @PrimaryColumn({ type: 'varchar', length: 64 })
  id!: string;

  @Index('IDX_vacancies_source')
  @Column({ type: 'varchar', length: 64 })
  source!: string;

  @Column({ type: 'varchar', length: 2048, nullable: true })
  url!: string | null;

  @Column({ type: 'varchar', length: 512 })
  job!: string;

  @Column({ type: 'varchar', length: 512, nullable: true })
  organization!: string | null;

  // Comma separated list of areas, strongest first.
  @Column({ type: 'varchar', length: 255 })
  areas!: string;

  @Column({ type: 'varchar', length: 8 })
  region!: string;

  // 0 means the listing did not state a salary.
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  salary!: number | string;

  @Column({ type: 'date', nullable: true })
  deadline!: string | null;

  @CreateDateColumn()
  firstSeenAt!: Date;
}
