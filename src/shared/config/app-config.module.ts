import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_CONFIG } from '../tokens';
import { loadConfig } from './app.config';

/**
 * Loads .env (development convenience), validates the environment once and exposes the typed
 * config under APP_CONFIG. Nothing else in the app reads process.env.
 */
@Global()
@Module({
  imports: [ConfigModule.forRoot({ ignoreEnvVars: false })],
  providers: [
    { provide: APP_CONFIG, useFactory: () => loadConfig(process.env) },
  ],
  exports: [APP_CONFIG],
})
export class AppConfigModule {}
