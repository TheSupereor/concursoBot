import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { entities } from '../../infrastructure/persistence/entities';
import { migrations } from '../../infrastructure/persistence/migrations';

const admin = {
  host: process.env.TEST_DB_HOST ?? 'localhost',
  port: Number(process.env.TEST_DB_PORT ?? 3306),
  username: process.env.TEST_DB_USER ?? 'root',
  password: process.env.TEST_DB_PASSWORD ?? 'root_password',
};

export interface TestDatabase {
  dataSource: DataSource;
  /** Closes the connection and drops the throwaway database. */
  drop(): Promise<void>;
}

/**
 * Creates a fresh, uniquely named MySQL database and builds its schema by running the real
 * migrations, so integration tests exercise exactly what production runs.
 */
export async function createTestDatabase(): Promise<TestDatabase> {
  const name = `concursos_it_${process.pid}_${Date.now()}`;

  const root = new DataSource({ type: 'mysql', ...admin });
  await root.initialize();
  await root.query(`CREATE DATABASE \`${name}\``);

  const dataSource = new DataSource({
    type: 'mysql',
    ...admin,
    database: name,
    entities,
    migrations,
    migrationsRun: true,
  });
  await dataSource.initialize();

  return {
    dataSource,
    drop: async () => {
      await dataSource.destroy();
      await root.query(`DROP DATABASE \`${name}\``);
      await root.destroy();
    },
  };
}
