import { Logger } from '@nestjs/common';
import { ILogger } from '../../application/ports/logger.port';

/** ILogger implemented with the NestJS logger, so output stays consistent across the app. */
export class NestLoggerAdapter implements ILogger {
  private readonly logger: Logger;

  constructor(context: string) {
    this.logger = new Logger(context);
  }

  info(message: string): void {
    this.logger.log(message);
  }

  warn(message: string): void {
    this.logger.warn(message);
  }

  error(message: string): void {
    this.logger.error(message);
  }
}
