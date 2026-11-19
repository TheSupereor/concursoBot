import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMatchingIndexes1795122166023 implements MigrationInterface {
  name = 'AddMatchingIndexes1795122166023';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX \`IDX_subscribers_active\` ON \`subscribers\` (\`isActive\`)`,
    );
    await queryRunner.query(
      `CREATE INDEX \`IDX_preferences_matching\` ON \`preferences\` (\`area\`, \`region\`, \`minimumSalary\`)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX \`IDX_preferences_matching\` ON \`preferences\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_subscribers_active\` ON \`subscribers\``,
    );
  }
}
