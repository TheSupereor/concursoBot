import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddVacancies1795130349218 implements MigrationInterface {
  name = 'AddVacancies1795130349218';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`vacancies\` (\`id\` varchar(64) NOT NULL, \`source\` varchar(64) NOT NULL, \`url\` varchar(2048) NULL, \`job\` varchar(512) NOT NULL, \`organization\` varchar(512) NULL, \`areas\` varchar(255) NOT NULL, \`region\` varchar(8) NOT NULL, \`salary\` decimal(10,2) NOT NULL DEFAULT '0.00', \`deadline\` date NULL, \`firstSeenAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX \`IDX_vacancies_source\` (\`source\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX \`IDX_vacancies_source\` ON \`vacancies\``,
    );
    await queryRunner.query(`DROP TABLE \`vacancies\``);
  }
}
