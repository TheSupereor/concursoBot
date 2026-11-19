import 'reflect-metadata';
import 'dotenv/config';
import { DataSource } from 'typeorm';
import { loadDatabaseConfig } from '../../shared/config/app.config';
import { entities } from './entities';
import { migrations } from './migrations';

/**
 * Data source for the TypeORM CLI (`npm run migration:*`). The application builds its own
 * connection from AppConfig; this one only needs the database variables.
 */
export default new DataSource({
  type: 'mysql',
  ...loadDatabaseConfig(process.env),
  entities,
  migrations,
});
