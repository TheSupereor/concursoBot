import { Global, Module } from '@nestjs/common';
import { NestLoggerAdapter } from '../infrastructure/logging/nest-logger.adapter';
import { LOGGER } from '../shared/tokens';

/** Binds the application-layer logging port to the NestJS logger. */
@Global()
@Module({
  providers: [
    { provide: LOGGER, useFactory: () => new NestLoggerAdapter('Application') },
  ],
  exports: [LOGGER],
})
export class LoggingModule {}
