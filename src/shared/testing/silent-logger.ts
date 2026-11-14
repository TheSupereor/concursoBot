import { ILogger } from '../../application/ports/logger.port';

/** Logger for tests: records nothing and prints nothing. */
export const silentLogger: ILogger = {
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
};
