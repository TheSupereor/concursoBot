import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1795121871463 implements MigrationInterface {
  name = 'InitialSchema1795121871463';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`notification_logs\` (\`id\` int NOT NULL AUTO_INCREMENT, \`telegramId\` varchar(255) NOT NULL, \`vacancyId\` varchar(255) NOT NULL, \`status\` enum ('PENDING', 'SENT', 'FAILED') NOT NULL DEFAULT 'PENDING', \`claimedAt\` datetime NULL, \`sentDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), UNIQUE INDEX \`UQ_telegramId_vacancyId\` (\`telegramId\`, \`vacancyId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`subscribers\` (\`telegramId\` varchar(255) NOT NULL, \`isActive\` tinyint NOT NULL DEFAULT 0, PRIMARY KEY (\`telegramId\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`preferences\` (\`id\` int NOT NULL AUTO_INCREMENT, \`area\` varchar(255) NOT NULL, \`region\` varchar(255) NOT NULL, \`minimumSalary\` decimal(10,2) NOT NULL, \`subscriberTelegramId\` varchar(255) NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`stripe_events\` (\`id\` varchar(255) NOT NULL, \`type\` varchar(255) NOT NULL, \`status\` enum ('PENDING', 'PROCESSED') NOT NULL DEFAULT 'PENDING', \`receivedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`processedAt\` datetime NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`preferences\` ADD CONSTRAINT \`FK_46aa1d4d94cb891a6c66c1b94c9\` FOREIGN KEY (\`subscriberTelegramId\`) REFERENCES \`subscribers\`(\`telegramId\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`preferences\` DROP FOREIGN KEY \`FK_46aa1d4d94cb891a6c66c1b94c9\``,
    );
    await queryRunner.query(`DROP TABLE \`stripe_events\``);
    await queryRunner.query(`DROP TABLE \`preferences\``);
    await queryRunner.query(`DROP TABLE \`subscribers\``);
    await queryRunner.query(
      `DROP INDEX \`UQ_telegramId_vacancyId\` ON \`notification_logs\``,
    );
    await queryRunner.query(`DROP TABLE \`notification_logs\``);
  }
}
