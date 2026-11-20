import { Logger } from '@nestjs/common';
import { NestLoggerAdapter } from './nest-logger.adapter';

describe('NestLoggerAdapter', () => {
  afterEach(() => jest.restoreAllMocks());

  it('maps the application log levels to the NestJS logger', () => {
    const log = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    const error = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    const logger = new NestLoggerAdapter('Application');

    logger.info('hello');
    logger.warn('careful');
    logger.error('broken');

    expect(log).toHaveBeenCalledWith('hello');
    expect(warn).toHaveBeenCalledWith('careful');
    expect(error).toHaveBeenCalledWith('broken');
  });
});
